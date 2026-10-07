import { Boom } from '@hapi/boom';
import { spawn } from 'child_process';
import { randomBytes } from 'crypto';
import { createReadStream, promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { proto } from '../../WAProto/index.js';
import { CALL_AUDIO_PREFIX, CALL_VIDEO_PREFIX, MEDIA_KEYS, URL_REGEX, WA_DEFAULT_EPHEMERAL } from '../Defaults/index.js';
import { WAMessageStatus, WAProto } from '../Types/index.js';
import { isJidGroup, isJidNewsletter, isJidStatusBroadcast, jidNormalizedUser } from '../WABinary/index.js';
import { sha256 } from './crypto.js';
import { generateMessageIDV2, getKeyAuthor, unixTimestampSeconds } from './generics.js';
import { downloadContentFromMessage, encryptedStream, generateThumbnail, getAudioDuration, getAudioWaveform, getRawMediaUploadData, getRemoteVideoMetadata, getVideoMetadata } from './messages-media.js';
import { shouldIncludeReportingToken } from './reporting-utils.js';
const unlinkQuietly = async (file) => {
    if (!file) return;
    try {
        await fs.unlink(file);
    }
    catch {
        // ignore cleanup failures
    }
};

const toReadable = (buffer) => Readable.from(buffer);

const getInputStream = async (media, opts = {}) => {
    if (Buffer.isBuffer(media)) return toReadable(media);
    if (media?.stream) return media.stream;
    const value = media?.url ?? media;
    if (value instanceof URL) return getInputStream({ url: value.toString() }, opts);
    if (typeof value !== 'string') throw new TypeError('Unsupported PTT media input');
    if (value.startsWith('data:')) {
        const comma = value.indexOf(',');
        if (comma < 0) throw new TypeError('Invalid data URL');
        const header = value.slice(0, comma);
        const body = value.slice(comma + 1);
        return toReadable(Buffer.from(body, header.includes(';base64') ? 'base64' : 'utf8'));
    }
    if (/^https?:\/\//i.test(value)) {
        const response = await fetch(value, { dispatcher: opts?.dispatcher, method: 'GET', headers: opts?.headers });
        if (!response.ok || !response.body) throw new Error(`Failed to fetch PTT audio: HTTP ${response.status}`);
        return Readable.fromWeb(response.body);
    }
    return createReadStream(value);
};


const getPttWavInfo = async (wavPath) => {
    const handle = await fs.open(wavPath, 'r');
    let header;
    try {
        header = Buffer.alloc(4096);
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        header = header.subarray(0, bytesRead);
    }
    finally {
        await handle.close();
    }
    if (header.length < 44 || header.toString('ascii', 0, 4) !== 'RIFF' || header.toString('ascii', 8, 12) !== 'WAVE') {
        throw new Error('Invalid normalized WAV');
    }
    let offset = 12;
    let sampleRate = 0;
    let channels = 0;
    let bitsPerSample = 0;
    let dataOffset = 0;
    let dataSize = 0;
    while (offset + 8 <= header.length) {
        const id = header.toString('ascii', offset, offset + 4);
        const size = header.readUInt32LE(offset + 4);
        const body = offset + 8;
        if (id === 'fmt ' && body + Math.min(size, 16) <= header.length) {
            channels = header.readUInt16LE(body + 2);
            sampleRate = header.readUInt32LE(body + 4);
            bitsPerSample = header.readUInt16LE(body + 14);
        }
        if (id === 'data') {
            dataOffset = body;
            dataSize = size;
            break;
        }
        offset = body + size + (size & 1);
    }
    if (!dataOffset || !dataSize || sampleRate !== 48000 || channels !== 1 || bitsPerSample !== 16) {
        throw new Error('Unexpected normalized WAV format');
    }
    const bytesPerSample = bitsPerSample / 8;
    const totalSamples = Math.floor(dataSize / bytesPerSample);
    const seconds = dataSize / (sampleRate * channels * bytesPerSample);
    const sums = new Float64Array(64);
    const counts = new Uint32Array(64);
    let sampleIndex = 0;
    let carry = Buffer.alloc(0);
    const stream = createReadStream(wavPath, {
        start: dataOffset,
        end: dataOffset + dataSize - 1,
        highWaterMark: 64 * 1024
    });
    for await (const chunk of stream) {
        const data = carry.length ? Buffer.concat([carry, chunk]) : chunk;
        const usable = data.length - (data.length % 2);
        for (let i = 0; i < usable; i += 2) {
            const block = Math.min(63, Math.floor((sampleIndex * 64) / Math.max(1, totalSamples)));
            sums[block] += Math.abs(data.readInt16LE(i)) / 32768;
            counts[block]++;
            sampleIndex++;
        }
        carry = usable < data.length ? data.subarray(usable) : Buffer.alloc(0);
    }
    const averages = new Float64Array(64);
    let max = 0;
    for (let i = 0; i < 64; i++) {
        const value = counts[i] ? sums[i] / counts[i] : 0;
        averages[i] = value;
        if (value > max) max = value;
    }
    const waveform = new Uint8Array(64);
    if (max > 0 && Number.isFinite(max)) {
        for (let i = 0; i < 64; i++) {
            waveform[i] = Math.max(0, Math.min(100, Math.round((averages[i] / max) * 100)));
        }
    }
    return { seconds, waveform };
};

const convertToPttAudio = async (media, options = {}) => {
    const logger = options.logger;
    const id = randomBytes(12).toString('hex');
    const base = join(options.tmpDir || tmpdir(), `baileys-ptt-${id}`);
    const wavPath = `${base}.wav`;
    const oggPath = `${base}.ogg`;
    const stream = await getInputStream(media, options.opts);
    const args = [
        '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
        '-i', 'pipe:0',
        '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', wavPath,
        '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '48000', '-c:a', 'libopus', '-b:a', '48k',
        '-vbr', 'on', '-application', 'voip', '-frame_duration', '20', '-avoid_negative_ts', 'make_zero',
        '-f', 'ogg', oggPath
    ];
    const child = spawn(options.ffmpegPath || 'ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', chunk => {
        stderr += chunk.toString();
        if (stderr.length > 8192) stderr = stderr.slice(-8192);
    });
    const closePromise = new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', code => code === 0 ? resolve() : reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`)));
    });
    try {
        await Promise.all([pipeline(stream, child.stdin), closePromise]);
        logger?.debug('converted PTT audio through normalized WAV to OGG/Opus');
        return {
            wavPath,
            oggPath,
            mimetype: 'audio/ogg; codecs=opus',
            cleanup: async () => Promise.all([unlinkQuietly(wavPath), unlinkQuietly(oggPath)])
        };
    }
    catch (error) {
        child.kill('SIGKILL');
        stream.destroy?.();
        await Promise.all([unlinkQuietly(wavPath), unlinkQuietly(oggPath)]);
        throw error;
    }
};

const MIMETYPE_MAP = {
    image: 'image/jpeg',
    video: 'video/mp4',
    document: 'application/pdf',
    audio: 'audio/ogg; codecs=opus',
    sticker: 'image/webp',
    'product-catalog-image': 'image/jpeg'
};
const MessageTypeProto = {
    image: WAProto.Message.ImageMessage,
    video: WAProto.Message.VideoMessage,
    audio: WAProto.Message.AudioMessage,
    sticker: WAProto.Message.StickerMessage,
    document: WAProto.Message.DocumentMessage
};
/**
 * Uses a regex to test whether the string contains a URL, and returns the URL if it does.
 * @param text eg. hello https://google.com
 * @returns the URL, eg. https://google.com
 */
export const extractUrlFromText = (text) => text.match(URL_REGEX)?.[0];
export const generateLinkPreviewIfRequired = async (text, getUrlInfo, logger) => {
    const url = extractUrlFromText(text);
    if (!!getUrlInfo && url) {
        try {
            const urlInfo = await getUrlInfo(url);
            return urlInfo;
        }
        catch (error) {
            // ignore if fails
            logger?.warn({ trace: error.stack }, 'url generation failed');
        }
    }
};
const assertColor = async (color) => {
    let assertedColor;
    if (typeof color === 'number') {
        assertedColor = color > 0 ? color : 0xffffffff + Number(color) + 1;
    }
    else {
        let hex = color.trim().replace('#', '');
        if (hex.length <= 6) {
            hex = 'FF' + hex.padStart(6, '0');
        }
        assertedColor = parseInt(hex, 16);
        return assertedColor;
    }
};
export const prepareWAMessageMedia = async (message, options) => {
    const logger = options.logger;
    let mediaType;
    for (const key of MEDIA_KEYS) {
        if (key in message) {
            mediaType = key;
        }
    }
    if (!mediaType) {
        throw new Boom('Invalid media type', { statusCode: 400 });
    }
    const uploadData = {
        ...message,
        media: message[mediaType]
    };
    delete uploadData[mediaType];
    // check if cacheable + generate cache key
    const cacheableKey = typeof uploadData.media === 'object' &&
        'url' in uploadData.media &&
        !!uploadData.media.url &&
        !!options.mediaCache &&
        mediaType + ':' + (mediaType === 'audio' && uploadData.ptt === true ? 'ptt:' : '') + uploadData.media.url.toString();
    if (mediaType === 'document' && !uploadData.fileName) {
        uploadData.fileName = 'file';
    }
    if (!uploadData.mimetype) {
        uploadData.mimetype = MIMETYPE_MAP[mediaType];
    }
    if (cacheableKey) {
        const mediaBuff = await options.mediaCache.get(cacheableKey);
        if (mediaBuff) {
            logger?.debug({ cacheableKey }, 'got media cache hit');
            const obj = proto.Message.decode(mediaBuff);
            const key = `${mediaType}Message`;
            Object.assign(obj[key], { ...uploadData, media: undefined });
            return obj;
        }
    }
    const isNewsletter = !!options.jid && isJidNewsletter(options.jid);
    if (isNewsletter) {
        logger?.info({ key: cacheableKey }, 'Preparing raw media for newsletter');
        const { filePath, fileSha256, fileLength } = await getRawMediaUploadData(uploadData.media, options.mediaTypeOverride || mediaType, logger);
        const fileSha256B64 = fileSha256.toString('base64');
        const { mediaUrl, directPath } = await options.upload(filePath, {
            fileEncSha256B64: fileSha256B64,
            mediaType: mediaType,
            timeoutMs: options.mediaUploadTimeoutMs
        });
        await fs.unlink(filePath);
        const obj = WAProto.Message.fromObject({
            // todo: add more support here
            [`${mediaType}Message`]: MessageTypeProto[mediaType].fromObject({
                url: mediaUrl,
                directPath,
                fileSha256,
                fileLength,
                ...uploadData,
                media: undefined
            })
        });
        if (uploadData.ptv) {
            obj.ptvMessage = obj.videoMessage;
            delete obj.videoMessage;
        }
        if (obj.stickerMessage) {
            obj.stickerMessage.stickerSentTs = Date.now();
        }
        if (cacheableKey) {
            logger?.debug({ cacheableKey }, 'set cache');
            await options.mediaCache.set(cacheableKey, WAProto.Message.encode(obj).finish());
        }
        return obj;
    }
    let pttConversion;
    let pttExtrasPromise;
    if (mediaType === 'audio' && uploadData.ptt === true) {
        try {
            pttConversion = await convertToPttAudio(uploadData.media, {
                logger,
                opts: options.options
            });
            uploadData.media = { url: pttConversion.oggPath };
            uploadData.mimetype = pttConversion.mimetype;
            pttExtrasPromise = (typeof uploadData.seconds === 'undefined' || typeof uploadData.waveform === 'undefined')
                ? getPttWavInfo(pttConversion.wavPath)
                : Promise.resolve({ seconds: uploadData.seconds, waveform: uploadData.waveform });
        }
        catch (error) {
            logger?.warn({ trace: error.stack }, 'failed to convert PTT audio');
            throw new Boom('Failed to convert PTT audio. ffmpeg with libopus support is required.', { statusCode: 400, data: error });
        }
    }
    const requiresDurationComputation = (mediaType === 'audio' || mediaType === 'video') && typeof uploadData.seconds === 'undefined';
    const requiresThumbnailComputation = (mediaType === 'image' || mediaType === 'video') && typeof uploadData['jpegThumbnail'] === 'undefined';
    const requiresVideoDimensions = mediaType === 'video' && (typeof uploadData.width === 'undefined' || typeof uploadData.height === 'undefined');
    const requiresWaveformProcessing = mediaType === 'audio' && uploadData.ptt === true && typeof uploadData.waveform === 'undefined';
    const requiresAudioBackground = options.backgroundColor && mediaType === 'audio' && uploadData.ptt === true;
    const videoNeedsProcessing = mediaType === 'video' && (requiresDurationComputation || requiresThumbnailComputation || requiresVideoDimensions);
    let directVideoSource;
    if (videoNeedsProcessing && uploadData.media && typeof uploadData.media === 'object' && !Buffer.isBuffer(uploadData.media) && 'url' in uploadData.media) {
        const source = uploadData.media.url?.toString();
        if (source && !source.startsWith('data:')) {
            const isRemote = /^https?:\/\//i.test(source);
            if (!(isRemote && options.options?.dispatcher)) {
                directVideoSource = { source, isRemote };
            }
        }
    }
    const directVideoExtrasPromise = directVideoSource ? (async () => {
        const metadata = directVideoSource.isRemote
            ? await getRemoteVideoMetadata(directVideoSource.source, options.options, logger)
            : await getVideoMetadata(directVideoSource.source, logger);
        let thumbnail;
        if (requiresThumbnailComputation) {
            const generated = await generateThumbnail(directVideoSource.source, 'video', {
                ...options,
                videoDuration: metadata.seconds,
                httpHeaders: options.options?.headers
            });
            thumbnail = generated.thumbnail;
        }
        return { metadata, thumbnail };
    })() : undefined;
    const requiresOriginalForSomeProcessing =
        (mediaType === 'image' && requiresThumbnailComputation) ||
            (mediaType === 'audio' && !pttConversion && (requiresDurationComputation || requiresWaveformProcessing)) ||
            (mediaType === 'video' && videoNeedsProcessing && !directVideoExtrasPromise);
    let encryptedResult;
    try {
        encryptedResult = await encryptedStream(uploadData.media, options.mediaTypeOverride || mediaType, {
            logger,
            saveOriginalFileIfRequired: requiresOriginalForSomeProcessing,
            opts: options.options
        });
    }
    catch (error) {
        await pttConversion?.cleanup();
        throw error;
    }
    const { mediaKey, encFilePath, originalFilePath, fileEncSha256, fileSha256, fileLength } = encryptedResult;
    const fileEncSha256B64 = fileEncSha256.toString('base64');
    const [{ mediaUrl, directPath }] = await Promise.all([
        (async () => {
            const result = await options.upload(encFilePath, {
                fileEncSha256B64,
                mediaType,
                timeoutMs: options.mediaUploadTimeoutMs
            });
            logger?.debug({ mediaType, cacheableKey }, 'uploaded media');
            return result;
        })(),
        (async () => {
            try {
                if (mediaType === 'video') {
                    let videoMetadata = {};
                    if (directVideoExtrasPromise) {
                        const directExtras = await directVideoExtrasPromise;
                        videoMetadata = directExtras.metadata || {};
                        if (requiresThumbnailComputation) {
                            uploadData.jpegThumbnail = directExtras.thumbnail;
                            logger?.debug('generated remote/direct video thumbnail');
                        }
                    }
                    else if (videoNeedsProcessing) {
                        videoMetadata = await getVideoMetadata(originalFilePath, logger);
                        if (requiresThumbnailComputation) {
                            const { thumbnail } = await generateThumbnail(originalFilePath, 'video', {
                                ...options,
                                videoDuration: videoMetadata.seconds
                            });
                            uploadData.jpegThumbnail = thumbnail;
                            logger?.debug('generated video thumbnail');
                        }
                    }
                    if (requiresDurationComputation && videoMetadata.seconds) {
                        uploadData.seconds = videoMetadata.seconds;
                    }
                    if (requiresVideoDimensions && videoMetadata.width && videoMetadata.height) {
                        uploadData.width = videoMetadata.width;
                        uploadData.height = videoMetadata.height;
                    }
                    if (requiresDurationComputation || requiresVideoDimensions) {
                        logger?.debug({ seconds: videoMetadata.seconds, width: videoMetadata.width, height: videoMetadata.height }, 'read video metadata');
                    }
                }
                else {
                    if (requiresThumbnailComputation) {
                        const { thumbnail, originalImageDimensions } = await generateThumbnail(originalFilePath, mediaType, options);
                        uploadData.jpegThumbnail = thumbnail;
                        if (!uploadData.width && originalImageDimensions) {
                            uploadData.width = originalImageDimensions.width;
                            uploadData.height = originalImageDimensions.height;
                            logger?.debug('set dimensions');
                        }
                        logger?.debug('generated thumbnail');
                    }
                    if (pttExtrasPromise) {
                        const pttExtras = await pttExtrasPromise;
                        if (requiresDurationComputation && pttExtras.seconds) {
                            uploadData.seconds = pttExtras.seconds;
                            logger?.debug('computed PTT duration from normalized WAV');
                        }
                        if (requiresWaveformProcessing && pttExtras.waveform) {
                            uploadData.waveform = pttExtras.waveform;
                            logger?.debug('processed PTT waveform from normalized WAV');
                        }
                    }
                    else {
                        if (requiresDurationComputation) {
                            uploadData.seconds = await getAudioDuration(originalFilePath);
                            logger?.debug('computed audio duration');
                        }
                        if (requiresWaveformProcessing) {
                            uploadData.waveform = await getAudioWaveform(originalFilePath, logger);
                            logger?.debug('processed waveform');
                        }
                    }
                }
                if (requiresAudioBackground) {
                    uploadData.backgroundArgb = await assertColor(options.backgroundColor);
                    logger?.debug('computed backgroundColor audio status');
                }
            }
            catch (error) {
                logger?.warn({ trace: error.stack }, 'failed to obtain extra info');
            }
        })()
    ]).finally(async () => {
        const cleanupTasks = [fs.unlink(encFilePath)];
        if (originalFilePath) cleanupTasks.push(fs.unlink(originalFilePath));
        if (pttConversion) cleanupTasks.push(pttConversion.cleanup());
        const results = await Promise.allSettled(cleanupTasks);
        if (results.some(result => result.status === 'rejected')) {
            logger?.warn('failed to remove one or more tmp files');
        }
        else {
            logger?.debug('removed tmp files');
        }
    });
    const obj = WAProto.Message.fromObject({
        [`${mediaType}Message`]: MessageTypeProto[mediaType].fromObject({
            url: mediaUrl,
            directPath,
            mediaKey,
            fileEncSha256,
            fileSha256,
            fileLength,
            mediaKeyTimestamp: unixTimestampSeconds(),
            ...uploadData,
            media: undefined
        })
    });
    if (uploadData.ptv) {
        obj.ptvMessage = obj.videoMessage;
        delete obj.videoMessage;
    }
    if (cacheableKey) {
        logger?.debug({ cacheableKey }, 'set cache');
        await options.mediaCache.set(cacheableKey, WAProto.Message.encode(obj).finish());
    }
    return obj;
};
export const prepareDisappearingMessageSettingContent = (ephemeralExpiration) => {
    ephemeralExpiration = ephemeralExpiration || 0;
    const content = {
        ephemeralMessage: {
            message: {
                protocolMessage: {
                    type: WAProto.Message.ProtocolMessage.Type.EPHEMERAL_SETTING,
                    ephemeralExpiration
                }
            }
        }
    };
    return WAProto.Message.fromObject(content);
};
/**
 * Generate forwarded message content like WA does
 * @param message the message to forward
 * @param options.forceForward will show the message as forwarded even if it is from you
 */
export const generateForwardMessageContent = (message, forceForward) => {
    let content = message.message;
    if (!content) {
        throw new Boom('no content in message', { statusCode: 400 });
    }
    // hacky copy
    content = normalizeMessageContent(content);
    content = proto.Message.decode(proto.Message.encode(content).finish());
    let key = Object.keys(content)[0];
    let score = content?.[key]?.contextInfo?.forwardingScore || 0;
    score += message.key.fromMe && !forceForward ? 0 : 1;
    if (key === 'conversation') {
        content.extendedTextMessage = { text: content[key] };
        delete content.conversation;
        key = 'extendedTextMessage';
    }
    const key_ = content?.[key];
    if (score > 0) {
        key_.contextInfo = { forwardingScore: score, isForwarded: true };
    }
    else {
        key_.contextInfo = {};
    }
    return content;
};
export const hasNonNullishProperty = (message, key) => {
    return (typeof message === 'object' &&
        message !== null &&
        key in message &&
        message[key] !== null &&
        message[key] !== undefined);
};
function hasOptionalProperty(obj, key) {
    return typeof obj === 'object' && obj !== null && key in obj && obj[key] !== null;
}
export const generateWAMessageContent = async (message, options) => {
    var _a, _b;
    let m = {};
    if (hasNonNullishProperty(message, 'text')) {
        const extContent = { text: message.text };
        let urlInfo = message.linkPreview;
        if (typeof urlInfo === 'undefined') {
            urlInfo = await generateLinkPreviewIfRequired(message.text, options.getUrlInfo, options.logger);
        }
        if (urlInfo) {
            extContent.matchedText = urlInfo['matched-text'];
            extContent.jpegThumbnail = urlInfo.jpegThumbnail;
            extContent.description = urlInfo.description;
            extContent.title = urlInfo.title;
            extContent.previewType = 0;
            const img = urlInfo.highQualityThumbnail;
            if (img) {
                extContent.thumbnailDirectPath = img.directPath;
                extContent.mediaKey = img.mediaKey;
                extContent.mediaKeyTimestamp = img.mediaKeyTimestamp;
                extContent.thumbnailWidth = img.width;
                extContent.thumbnailHeight = img.height;
                extContent.thumbnailSha256 = img.fileSha256;
                extContent.thumbnailEncSha256 = img.fileEncSha256;
            }
        }
        if (options.backgroundColor) {
            extContent.backgroundArgb = await assertColor(options.backgroundColor);
        }
        if (options.font) {
            extContent.font = options.font;
        }
        m.extendedTextMessage = extContent;
    }
    else if (hasNonNullishProperty(message, 'contacts')) {
        const contactLen = message.contacts.contacts.length;
        if (!contactLen) {
            throw new Boom('require atleast 1 contact', { statusCode: 400 });
        }
        if (contactLen === 1) {
            m.contactMessage = WAProto.Message.ContactMessage.create(message.contacts.contacts[0]);
        }
        else {
            m.contactsArrayMessage = WAProto.Message.ContactsArrayMessage.create(message.contacts);
        }
    }
    else if (hasNonNullishProperty(message, 'location')) {
        m.locationMessage = WAProto.Message.LocationMessage.create(message.location);
    }
    else if (hasNonNullishProperty(message, 'react')) {
        if (!message.react.senderTimestampMs) {
            message.react.senderTimestampMs = Date.now();
        }
        m.reactionMessage = WAProto.Message.ReactionMessage.create(message.react);
    }
    else if (hasNonNullishProperty(message, 'delete')) {
        m.protocolMessage = {
            key: message.delete,
            type: WAProto.Message.ProtocolMessage.Type.REVOKE
        };
    }
    else if (hasNonNullishProperty(message, 'forward')) {
        m = generateForwardMessageContent(message.forward, message.force);
    }
    else if (hasNonNullishProperty(message, 'disappearingMessagesInChat')) {
        const exp = typeof message.disappearingMessagesInChat === 'boolean'
            ? message.disappearingMessagesInChat
                ? WA_DEFAULT_EPHEMERAL
                : 0
            : message.disappearingMessagesInChat;
        m = prepareDisappearingMessageSettingContent(exp);
    }
    else if (hasNonNullishProperty(message, 'groupInvite')) {
        m.groupInviteMessage = {};
        m.groupInviteMessage.inviteCode = message.groupInvite.inviteCode;
        m.groupInviteMessage.inviteExpiration = message.groupInvite.inviteExpiration;
        m.groupInviteMessage.caption = message.groupInvite.text;
        m.groupInviteMessage.groupJid = message.groupInvite.jid;
        m.groupInviteMessage.groupName = message.groupInvite.subject;
        //TODO: use built-in interface and get disappearing mode info etc.
        //TODO: cache / use store!?
        if (options.getProfilePicUrl) {
            const pfpUrl = await options.getProfilePicUrl(message.groupInvite.jid, 'preview');
            if (pfpUrl) {
                const resp = await fetch(pfpUrl, { method: 'GET', dispatcher: options?.options?.dispatcher });
                if (resp.ok) {
                    const buf = Buffer.from(await resp.arrayBuffer());
                    m.groupInviteMessage.jpegThumbnail = buf;
                }
            }
        }
    }
    else if (hasNonNullishProperty(message, 'pin')) {
        m.pinInChatMessage = {};
        m.messageContextInfo = {};
        m.pinInChatMessage.key = message.pin;
        m.pinInChatMessage.type = message.type;
        m.pinInChatMessage.senderTimestampMs = Date.now();
        m.messageContextInfo.messageAddOnDurationInSecs = message.type === 1 ? message.time || 86400 : 0;
    }
    else if (hasNonNullishProperty(message, 'buttonReply')) {
        switch (message.type) {
            case 'template':
                m.templateButtonReplyMessage = {
                    selectedDisplayText: message.buttonReply.displayText,
                    selectedId: message.buttonReply.id,
                    selectedIndex: message.buttonReply.index
                };
                break;
            case 'plain':
                m.buttonsResponseMessage = {
                    selectedButtonId: message.buttonReply.id,
                    selectedDisplayText: message.buttonReply.displayText,
                    type: proto.Message.ButtonsResponseMessage.Type.DISPLAY_TEXT
                };
                break;
        }
    }
    else if (hasOptionalProperty(message, 'ptv') && message.ptv) {
        const { videoMessage } = await prepareWAMessageMedia({ video: message.video }, options);
        m.ptvMessage = videoMessage;
    }
    else if (hasNonNullishProperty(message, 'product')) {
        const { imageMessage } = await prepareWAMessageMedia({ image: message.product.productImage }, options);
        m.productMessage = WAProto.Message.ProductMessage.create({
            ...message,
            product: {
                ...message.product,
                productImage: imageMessage
            }
        });
    }
    else if (hasNonNullishProperty(message, 'listReply')) {
        m.listResponseMessage = { ...message.listReply };
    }
    else if (hasNonNullishProperty(message, 'event')) {
        m.eventMessage = {};
        const startTime = Math.floor(message.event.startDate.getTime() / 1000);
        if (message.event.call && options.getCallLink) {
            const token = await options.getCallLink(message.event.call, { startTime });
            m.eventMessage.joinLink = (message.event.call === 'audio' ? CALL_AUDIO_PREFIX : CALL_VIDEO_PREFIX) + token;
        }
        m.messageContextInfo = {
            // encKey
            messageSecret: message.event.messageSecret || randomBytes(32)
        };
        m.eventMessage.name = message.event.name;
        m.eventMessage.description = message.event.description;
        m.eventMessage.startTime = startTime;
        m.eventMessage.endTime = message.event.endDate ? message.event.endDate.getTime() / 1000 : undefined;
        m.eventMessage.isCanceled = message.event.isCancelled ?? false;
        m.eventMessage.extraGuestsAllowed = message.event.extraGuestsAllowed;
        m.eventMessage.isScheduleCall = message.event.isScheduleCall ?? false;
        m.eventMessage.location = message.event.location;
    }
    else if (hasNonNullishProperty(message, 'poll')) {
        (_a = message.poll).selectableCount || (_a.selectableCount = 0);
        (_b = message.poll).toAnnouncementGroup || (_b.toAnnouncementGroup = false);
        if (!Array.isArray(message.poll.values)) {
            throw new Boom('Invalid poll values', { statusCode: 400 });
        }
        if (message.poll.selectableCount < 0 || message.poll.selectableCount > message.poll.values.length) {
            throw new Boom(`poll.selectableCount in poll should be >= 0 and <= ${message.poll.values.length}`, {
                statusCode: 400
            });
        }
        m.messageContextInfo = {
            // encKey
            messageSecret: message.poll.messageSecret || randomBytes(32)
        };
        const pollCreationMessage = {
            name: message.poll.name,
            selectableOptionsCount: message.poll.selectableCount,
            options: message.poll.values.map(optionName => ({ optionName }))
        };
        if (message.poll.toAnnouncementGroup) {
            // poll v2 is for community announcement groups (single select and multiple)
            m.pollCreationMessageV2 = pollCreationMessage;
        }
        else {
            if (message.poll.selectableCount === 1) {
                //poll v3 is for single select polls
                m.pollCreationMessageV3 = pollCreationMessage;
            }
            else {
                // poll for multiple choice polls
                m.pollCreationMessage = pollCreationMessage;
            }
        }
    }
    else if (hasNonNullishProperty(message, 'album')) {
        m.albumMessage = {
            expectedImageCount: message.album.expectedImageCount,
            expectedVideoCount: message.album.expectedVideoCount
        };
    }
    else if (hasNonNullishProperty(message, 'sharePhoneNumber')) {
        m.protocolMessage = {
            type: proto.Message.ProtocolMessage.Type.SHARE_PHONE_NUMBER
        };
    }
    else if (hasNonNullishProperty(message, 'requestPhoneNumber')) {
        m.requestPhoneNumberMessage = {};
    }
    else if (hasNonNullishProperty(message, 'limitSharing')) {
        m.protocolMessage = {
            type: proto.Message.ProtocolMessage.Type.LIMIT_SHARING,
            limitSharing: {
                sharingLimited: message.limitSharing === true,
                trigger: 1,
                limitSharingSettingTimestamp: Date.now(),
                initiatedByMe: true
            }
        };
    }
    else {
        m = await prepareWAMessageMedia(message, options);
    }
    if (hasOptionalProperty(message, 'viewOnce') && !!message.viewOnce) {
        m = { viewOnceMessage: { message: m } };
    }
    if ((hasOptionalProperty(message, 'mentions') && message.mentions?.length) ||
        (hasOptionalProperty(message, 'mentionAll') && message.mentionAll)) {
        const messageType = Object.keys(m)[0];
        const key = m[messageType];
        if (key && 'contextInfo' in key) {
            key.contextInfo = key.contextInfo || {};
            if (message.mentions?.length) {
                key.contextInfo.mentionedJid = message.mentions;
            }
            if (message.mentionAll) {
                key.contextInfo.nonJidMentions = 1;
            }
        }
        else if (key) {
            key.contextInfo = {
                mentionedJid: message.mentions,
                nonJidMentions: message.mentionAll ? 1 : 0
            };
        }
    }
    if (hasOptionalProperty(message, 'edit')) {
        m = {
            protocolMessage: {
                key: message.edit,
                editedMessage: m,
                timestampMs: Date.now(),
                type: WAProto.Message.ProtocolMessage.Type.MESSAGE_EDIT
            }
        };
    }
    if (hasOptionalProperty(message, 'contextInfo') && !!message.contextInfo) {
        const messageType = Object.keys(m)[0];
        const key = m[messageType];
        if ('contextInfo' in key && !!key.contextInfo) {
            key.contextInfo = { ...key.contextInfo, ...message.contextInfo };
        }
        else if (key) {
            key.contextInfo = message.contextInfo;
        }
    }
    if (hasOptionalProperty(message, 'albumParentKey') && !!message.albumParentKey) {
        m.messageContextInfo = {
            ...m.messageContextInfo,
            messageAssociation: {
                associationType: WAProto.MessageAssociation.AssociationType.MEDIA_ALBUM,
                parentMessageKey: message.albumParentKey
            }
        };
    }
    if (shouldIncludeReportingToken(m)) {
        m.messageContextInfo = m.messageContextInfo || {};
        if (!m.messageContextInfo.messageSecret) {
            m.messageContextInfo.messageSecret = randomBytes(32);
        }
    }
    return WAProto.Message.create(m);
};
export const generateWAMessageFromContent = (jid, message, options) => {
    // set timestamp to now
    // if not specified
    if (!options.timestamp) {
        options.timestamp = new Date();
    }
    const innerMessage = normalizeMessageContent(message);
    const key = getContentType(innerMessage);
    const timestamp = unixTimestampSeconds(options.timestamp);
    const { quoted, userJid } = options;
    if (quoted && !isJidNewsletter(jid)) {
        const participant = quoted.key.fromMe
            ? userJid // TODO: Add support for LIDs
            : quoted.participant || quoted.key.participant || quoted.key.remoteJid;
        let quotedMsg = normalizeMessageContent(quoted.message);
        const msgType = getContentType(quotedMsg);
        // strip any redundant properties
        quotedMsg = proto.Message.create({ [msgType]: quotedMsg[msgType] });
        const quotedContent = quotedMsg[msgType];
        if (typeof quotedContent === 'object' && quotedContent && 'contextInfo' in quotedContent) {
            delete quotedContent.contextInfo;
        }
        const contextInfo = ('contextInfo' in innerMessage[key] && innerMessage[key]?.contextInfo) || {};
        contextInfo.participant = jidNormalizedUser(participant);
        contextInfo.stanzaId = quoted.key.id;
        contextInfo.quotedMessage = quotedMsg;
        // if a participant is quoted, then it must be a group
        // hence, remoteJid of group must also be entered
        if (jid !== quoted.key.remoteJid) {
            contextInfo.remoteJid = quoted.key.remoteJid;
        }
        if (contextInfo && innerMessage[key]) {
            /* @ts-ignore */
            innerMessage[key].contextInfo = contextInfo;
        }
    }
    if (
    // if we want to send a disappearing message
    !!options?.ephemeralExpiration &&
        // and it's not a protocol message -- delete, toggle disappear message
        key !== 'protocolMessage' &&
        // already not converted to disappearing message
        key !== 'ephemeralMessage' &&
        // newsletters don't support ephemeral messages
        !isJidNewsletter(jid)) {
        /* @ts-ignore */
        innerMessage[key].contextInfo = {
            ...(innerMessage[key].contextInfo || {}),
            expiration: options.ephemeralExpiration || WA_DEFAULT_EPHEMERAL
            //ephemeralSettingTimestamp: options.ephemeralOptions.eph_setting_ts?.toString()
        };
    }
    message = WAProto.Message.create(message);
    const messageJSON = {
        key: {
            remoteJid: jid,
            fromMe: true,
            id: options?.messageId || generateMessageIDV2()
        },
        message: message,
        messageTimestamp: timestamp,
        messageStubParameters: [],
        participant: isJidGroup(jid) || isJidStatusBroadcast(jid) ? userJid : undefined, // TODO: Add support for LIDs
        status: WAMessageStatus.PENDING
    };
    return WAProto.WebMessageInfo.fromObject(messageJSON);
};
export const generateWAMessage = async (jid, content, options) => {
    // ensure msg ID is with every log
    options.logger = options?.logger?.child({ msgId: options.messageId });
    // Pass jid in the options to generateWAMessageContent
    return generateWAMessageFromContent(jid, await generateWAMessageContent(content, { ...options, jid }), options);
};
/** Get the key to access the true type of content */
export const getContentType = (content) => {
    if (content) {
        const keys = Object.keys(content);
        const key = keys.find(k => (k === 'conversation' || k.includes('Message')) && k !== 'senderKeyDistributionMessage');
        return key;
    }
};
/**
 * Normalizes ephemeral, view once messages to regular message content
 * Eg. image messages in ephemeral messages, in view once messages etc.
 * @param content
 * @returns
 */
export const normalizeMessageContent = (content) => {
    if (!content) {
        return undefined;
    }
    // set max iterations to prevent an infinite loop
    for (let i = 0; i < 5; i++) {
        const inner = getFutureProofMessage(content);
        if (!inner) {
            break;
        }
        content = inner.message;
    }
    return content;
    function getFutureProofMessage(message) {
        return (message?.ephemeralMessage ||
            message?.viewOnceMessage ||
            message?.documentWithCaptionMessage ||
            message?.viewOnceMessageV2 ||
            message?.viewOnceMessageV2Extension ||
            message?.editedMessage ||
            message?.associatedChildMessage ||
            message?.groupStatusMessage ||
            message?.groupStatusMessageV2);
    }
};
/**
 * Extract the true message content from a message
 * Eg. extracts the inner message from a disappearing message/view once message
 */
export const extractMessageContent = (content) => {
    const extractFromTemplateMessage = (msg) => {
        if (msg.imageMessage) {
            return { imageMessage: msg.imageMessage };
        }
        else if (msg.documentMessage) {
            return { documentMessage: msg.documentMessage };
        }
        else if (msg.videoMessage) {
            return { videoMessage: msg.videoMessage };
        }
        else if (msg.locationMessage) {
            return { locationMessage: msg.locationMessage };
        }
        else {
            return {
                conversation: 'contentText' in msg ? msg.contentText : 'hydratedContentText' in msg ? msg.hydratedContentText : ''
            };
        }
    };
    content = normalizeMessageContent(content);
    if (content?.buttonsMessage) {
        return extractFromTemplateMessage(content.buttonsMessage);
    }
    if (content?.templateMessage?.hydratedFourRowTemplate) {
        return extractFromTemplateMessage(content?.templateMessage?.hydratedFourRowTemplate);
    }
    if (content?.templateMessage?.hydratedTemplate) {
        return extractFromTemplateMessage(content?.templateMessage?.hydratedTemplate);
    }
    if (content?.templateMessage?.fourRowTemplate) {
        return extractFromTemplateMessage(content?.templateMessage?.fourRowTemplate);
    }
    return content;
};
/**
 * Returns the device predicted by message ID
 */
export const getDevice = (id) => /^3A.{18}$/.test(id)
    ? 'ios'
    : /^3E.{20}$/.test(id)
        ? 'web'
        : /^(.{21}|.{32})$/.test(id)
            ? 'android'
            : /^(3F|.{18}$)/.test(id)
                ? 'desktop'
                : 'unknown';
/** Upserts a receipt in the message */
export const updateMessageWithReceipt = (msg, receipt) => {
    msg.userReceipt = msg.userReceipt || [];
    const recp = msg.userReceipt.find(m => m.userJid === receipt.userJid);
    if (recp) {
        Object.assign(recp, receipt);
    }
    else {
        msg.userReceipt.push(receipt);
    }
};
/** Update the message with a new reaction */
export const updateMessageWithReaction = (msg, reaction) => {
    const authorID = getKeyAuthor(reaction.key);
    const reactions = (msg.reactions || []).filter(r => getKeyAuthor(r.key) !== authorID);
    reaction.text = reaction.text || '';
    reactions.push(reaction);
    msg.reactions = reactions;
};
/** Update the message with a new poll update */
export const updateMessageWithPollUpdate = (msg, update) => {
    const authorID = getKeyAuthor(update.pollUpdateMessageKey);
    const reactions = (msg.pollUpdates || []).filter(r => getKeyAuthor(r.pollUpdateMessageKey) !== authorID);
    if (update.vote?.selectedOptions?.length) {
        reactions.push(update);
    }
    msg.pollUpdates = reactions;
};
/** Update the message with a new event response */
export const updateMessageWithEventResponse = (msg, update) => {
    const authorID = getKeyAuthor(update.eventResponseMessageKey);
    const responses = (msg.eventResponses || []).filter(r => getKeyAuthor(r.eventResponseMessageKey) !== authorID);
    responses.push(update);
    msg.eventResponses = responses;
};
/**
 * Aggregates all poll updates in a poll.
 * @param msg the poll creation message
 * @param meId your jid
 * @returns A list of options & their voters
 */
export function getAggregateVotesInPollMessage({ message, pollUpdates }, meId) {
    const opts = message?.pollCreationMessage?.options ||
        message?.pollCreationMessageV2?.options ||
        message?.pollCreationMessageV3?.options ||
        [];
    const voteHashMap = opts.reduce((acc, opt) => {
        const hash = sha256(Buffer.from(opt.optionName || '')).toString();
        acc[hash] = {
            name: opt.optionName || '',
            voters: []
        };
        return acc;
    }, {});
    for (const update of pollUpdates || []) {
        const { vote } = update;
        if (!vote) {
            continue;
        }
        for (const option of vote.selectedOptions || []) {
            const hash = option.toString();
            let data = voteHashMap[hash];
            if (!data) {
                voteHashMap[hash] = {
                    name: 'Unknown',
                    voters: []
                };
                data = voteHashMap[hash];
            }
            voteHashMap[hash].voters.push(getKeyAuthor(update.pollUpdateMessageKey, meId));
        }
    }
    return Object.values(voteHashMap);
}
/**
 * Aggregates all event responses in an event message.
 * @param msg the event creation message
 * @param meId your jid
 * @returns A list of response types & their responders
 */
export function getAggregateResponsesInEventMessage({ eventResponses }, meId) {
    const responseTypes = ['GOING', 'NOT_GOING', 'MAYBE'];
    const responseMap = {};
    for (const type of responseTypes) {
        responseMap[type] = {
            response: type,
            responders: []
        };
    }
    for (const update of eventResponses || []) {
        const responseType = update.eventResponse || 'UNKNOWN';
        if (responseType !== 'UNKNOWN' && responseMap[responseType]) {
            responseMap[responseType].responders.push(getKeyAuthor(update.eventResponseMessageKey, meId));
        }
    }
    return Object.values(responseMap);
}
/** Given a list of message keys, aggregates them by chat & sender. Useful for sending read receipts in bulk */
export const aggregateMessageKeysNotFromMe = (keys) => {
    const keyMap = {};
    for (const { remoteJid, id, participant, fromMe } of keys) {
        if (!fromMe) {
            const uqKey = `${remoteJid}:${participant || ''}`;
            if (!keyMap[uqKey]) {
                keyMap[uqKey] = {
                    jid: remoteJid,
                    participant: participant,
                    messageIds: []
                };
            }
            keyMap[uqKey].messageIds.push(id);
        }
    }
    return Object.values(keyMap);
};
const REUPLOAD_REQUIRED_STATUS = [410, 404];
/**
 * Downloads the given message. Throws an error if it's not a media message
 */
export const downloadMediaMessage = async (message, type, options, ctx) => {
    const result = await downloadMsg().catch(async (error) => {
        if (ctx &&
            typeof error?.status === 'number' && // treat errors with status as HTTP failures requiring reupload
            REUPLOAD_REQUIRED_STATUS.includes(error.status)) {
            ctx.logger.info({ key: message.key }, 'sending reupload media request...');
            // request reupload
            message = await ctx.reuploadRequest(message);
            const result = await downloadMsg();
            return result;
        }
        throw error;
    });
    return result;
    async function downloadMsg() {
        const mContent = extractMessageContent(message.message);
        if (!mContent) {
            throw new Boom('No message present', { statusCode: 400, data: message });
        }
        const contentType = getContentType(mContent);
        let mediaType = contentType?.replace('Message', '');
        const media = mContent[contentType];
        if (!media || typeof media !== 'object' || (!('url' in media) && !('thumbnailDirectPath' in media))) {
            throw new Boom(`"${contentType}" message is not a media message`);
        }
        let download;
        if ('thumbnailDirectPath' in media && !('url' in media)) {
            download = {
                directPath: media.thumbnailDirectPath,
                mediaKey: media.mediaKey
            };
            mediaType = 'thumbnail-link';
        }
        else {
            download = media;
        }
        const stream = await downloadContentFromMessage(download, mediaType, options);
        if (type === 'buffer') {
            const bufferArray = [];
            for await (const chunk of stream) {
                bufferArray.push(chunk);
            }
            return Buffer.concat(bufferArray);
        }
        return stream;
    }
};
/** Checks whether the given message is a media message; if it is returns the inner content */
export const assertMediaContent = (content) => {
    content = extractMessageContent(content);
    const mediaContent = content?.documentMessage ||
        content?.imageMessage ||
        content?.videoMessage ||
        content?.audioMessage ||
        content?.stickerMessage;
    if (!mediaContent) {
        throw new Boom('given message is not a media message', { statusCode: 400, data: content });
    }
    return mediaContent;
};
//# sourceMappingURL=messages.js.map