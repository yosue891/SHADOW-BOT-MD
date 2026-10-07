import { execFile } from 'child_process';
import { Boom } from '@hapi/boom';
import * as Crypto from 'crypto';
import { once } from 'events';
import { createReadStream, createWriteStream, promises as fs, WriteStream } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable, Transform } from 'stream';
import { URL } from 'url';
import { proto } from '../../WAProto/index.js';
import { DEFAULT_ORIGIN, MEDIA_HKDF_KEY_MAPPING, MEDIA_PATH_MAP } from '../Defaults/index.js';
import { getBinaryNodeChild, getBinaryNodeChildBuffer, jidNormalizedUser } from '../WABinary/index.js';
import { aesDecryptGCM, aesEncryptGCM, hkdf } from './crypto.js';
import { generateMessageIDV2 } from './generics.js';
const FIXED_16_16 = 65536;
const BOX_HEADER_SIZE = 8;
const MAX_REMOTE_MOOV_BYTES = 16 * 1024 * 1024;
const forEachBox = (buf, start, end, onBox) => {
    let offset = start;
    while (offset + BOX_HEADER_SIZE <= end) {
        let size = buf.readUInt32BE(offset);
        const type = buf.toString('latin1', offset + 4, offset + 8);
        let headerSize = BOX_HEADER_SIZE;
        if (size === 1) {
            if (offset + 16 > end)
                return;
            const largeSize = buf.readBigUInt64BE(offset + 8);
            if (largeSize > BigInt(Number.MAX_SAFE_INTEGER))
                return;
            size = Number(largeSize);
            headerSize = 16;
        }
        else if (size === 0) {
            size = end - offset;
        }
        if (size < headerSize || offset + size > end)
            return;
        onBox(type, offset + headerSize, offset + size);
        offset += size;
    }
};
const parseMvhd = (buf, start, end) => {
    if (start + 4 > end)
        return;
    const version = buf.readUInt8(start);
    const fields = start + 4;
    let timescale;
    let duration;
    if (version === 1) {
        if (fields + 28 > end)
            return;
        timescale = buf.readUInt32BE(fields + 16);
        const rawDuration = buf.readBigUInt64BE(fields + 20);
        if (rawDuration > BigInt(Number.MAX_SAFE_INTEGER))
            return;
        duration = Number(rawDuration);
    }
    else {
        if (fields + 16 > end)
            return;
        timescale = buf.readUInt32BE(fields + 8);
        duration = buf.readUInt32BE(fields + 12);
    }
    if (!timescale || !duration)
        return;
    if (version === 0 && duration === 0xffffffff)
        return;
    return duration / timescale;
};
const parseTkhd = (buf, start, end) => {
    if (start + 4 > end)
        return;
    const version = buf.readUInt8(start);
    const fields = start + 4;
    const afterDuration = fields + (version === 1 ? 32 : 20);
    const matrixStart = afterDuration + 16;
    const dimensionsStart = matrixStart + 36;
    if (dimensionsStart + 8 > end)
        return;
    let width = buf.readUInt32BE(dimensionsStart) / FIXED_16_16;
    let height = buf.readUInt32BE(dimensionsStart + 4) / FIXED_16_16;
    if (!width || !height)
        return;
    const a = buf.readInt32BE(matrixStart);
    const b = buf.readInt32BE(matrixStart + 4);
    const c = buf.readInt32BE(matrixStart + 12);
    const d = buf.readInt32BE(matrixStart + 16);
    if (a === 0 && d === 0 && b !== 0 && c !== 0) {
        [width, height] = [height, width];
    }
    return { width: Math.round(width), height: Math.round(height) };
};
export const parseMoovBox = (moov) => {
    const result = {};
    forEachBox(moov, 0, moov.length, (type, start, end) => {
        if (type === 'mvhd') {
            const durationSec = parseMvhd(moov, start, end);
            if (durationSec !== undefined)
                result.seconds = Math.round(durationSec);
            return;
        }
        if (type !== 'trak' || result.width)
            return;
        forEachBox(moov, start, end, (trakChild, trakStart, trakEnd) => {
            if (trakChild !== 'tkhd' || result.width)
                return;
            const dimensions = parseTkhd(moov, trakStart, trakEnd);
            if (dimensions) {
                result.width = dimensions.width;
                result.height = dimensions.height;
            }
        });
    });
    return result;
};
export const readMp4Metadata = async (path) => {
    let handle;
    try {
        handle = await fs.open(path, 'r');
        const { size: fileSize } = await handle.stat();
        let offset = 0;
        const header = Buffer.alloc(16);
        while (offset + BOX_HEADER_SIZE <= fileSize) {
            const { bytesRead } = await handle.read(header, 0, 16, offset);
            if (bytesRead < BOX_HEADER_SIZE)
                return;
            let size = header.readUInt32BE(0);
            const type = header.toString('latin1', 4, 8);
            let headerSize = BOX_HEADER_SIZE;
            if (size === 1) {
                if (bytesRead < 16)
                    return;
                const largeSize = header.readBigUInt64BE(8);
                if (largeSize > BigInt(Number.MAX_SAFE_INTEGER))
                    return;
                size = Number(largeSize);
                headerSize = 16;
            }
            else if (size === 0) {
                size = fileSize - offset;
            }
            if (size < headerSize || offset + size > fileSize)
                return;
            if (type === 'moov') {
                const moov = Buffer.alloc(size - headerSize);
                await handle.read(moov, 0, moov.length, offset + headerSize);
                return parseMoovBox(moov);
            }
            offset += size;
        }
    }
    catch {
        return;
    }
    finally {
        await handle?.close().catch(() => { });
    }
};
const parseContentRangeTotal = (value) => {
    const match = /\/([0-9]+)$/.exec(value || '');
    const total = Number(match?.[1]);
    return Number.isFinite(total) && total > 0 ? total : undefined;
};
const remoteRange = async (url, start, end, options = {}) => {
    const { maxContentLength: _maxContentLength, isStream: _isStream, ...fetchOptions } = options || {};
    const headers = new Headers(fetchOptions.headers || {});
    headers.set('Range', `bytes=${start}-${end}`);
    const response = await fetch(url.toString(), {
        ...fetchOptions,
        method: 'GET',
        headers
    });
    if (response.status !== 206) {
        await response.body?.cancel().catch(() => { });
        return;
    }
    const total = parseContentRangeTotal(response.headers.get('content-range'));
    const buffer = Buffer.from(await response.arrayBuffer());
    return { buffer, total };
};
const probeRemoteMp4Metadata = async (url, options = {}, logger) => {
    try {
        let offset = 0;
        let fileSize;
        for (let boxes = 0; boxes < 64; boxes++) {
            const head = await remoteRange(url, offset, offset + 15, options);
            if (!head || head.buffer.length < BOX_HEADER_SIZE)
                return {};
            fileSize ||= head.total;
            let size = head.buffer.readUInt32BE(0);
            const type = head.buffer.toString('latin1', 4, 8);
            let headerSize = BOX_HEADER_SIZE;
            if (size === 1) {
                if (head.buffer.length < 16)
                    return {};
                const largeSize = head.buffer.readBigUInt64BE(8);
                if (largeSize > BigInt(Number.MAX_SAFE_INTEGER))
                    return {};
                size = Number(largeSize);
                headerSize = 16;
            }
            else if (size === 0) {
                if (!fileSize)
                    return {};
                size = fileSize - offset;
            }
            if (size < headerSize || (fileSize && offset + size > fileSize))
                return {};
            if (type === 'moov') {
                const payloadLength = size - headerSize;
                if (payloadLength <= 0 || payloadLength > MAX_REMOTE_MOOV_BYTES) {
                    logger?.debug({ payloadLength }, 'remote mp4 moov box outside safe probe size');
                    return {};
                }
                const moov = await remoteRange(url, offset + headerSize, offset + size - 1, options);
                if (!moov || moov.buffer.length !== payloadLength)
                    return {};
                return parseMoovBox(moov.buffer);
            }
            offset += size;
            if (fileSize && offset >= fileSize)
                return {};
        }
    }
    catch (error) {
        logger?.debug({ err: error }, 'remote video metadata probe failed');
    }
    return {};
};

const headersToFfmpeg = headers => {
    if (!headers)
        return undefined;
    const normalized = new Headers(headers);
    const lines = [];
    for (const [key, value] of normalized.entries())
        lines.push(`${key}: ${value}\r\n`);
    return lines.length ? lines.join('') : undefined;
};
export const extractVideoThumbnail = async (source, destPath, atSeconds = 0.1, width = 32, headers) => new Promise((resolve, reject) => {
    const args = ['-v', 'error'];
    const headerBlob = headersToFfmpeg(headers);
    if (headerBlob)
        args.push('-headers', headerBlob);
    args.push('-ss', String(Math.max(0, Number(atSeconds) || 0)), '-i', String(source), '-y', '-vf', `scale=${width}:-2`, '-frames:v', '1', '-q:v', '3', '-f', 'image2', String(destPath));
    execFile('ffmpeg', args, { windowsHide: true, maxBuffer: 1024 * 1024 }, err => err ? reject(err) : resolve());
});

const readMetadataWithFfprobe = async (path, headers) => new Promise(resolve => {
    const args = ['-v', 'error'];
    const headerBlob = headersToFfmpeg(headers);
    if (headerBlob)
        args.push('-headers', headerBlob);
    args.push(
        '-select_streams', 'v:0',
        '-show_entries', 'format=duration:stream=width,height',
        '-of', 'json',
        String(path)
    );
    execFile('ffprobe', args, { windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout) => {
        if (err)
            return resolve(undefined);
        try {
            const parsed = JSON.parse(stdout);
            const stream = parsed?.streams?.[0];
            const duration = Number(parsed?.format?.duration);
            const result = {};
            if (Number.isFinite(duration) && duration > 0)
                result.seconds = Math.round(duration);
            if (stream?.width && stream?.height) {
                result.width = stream.width;
                result.height = stream.height;
            }
            resolve(result);
        }
        catch {
            resolve(undefined);
        }
    });
});
export const getRemoteVideoMetadata = async (url, options = {}, logger) => {
    const fromContainer = await probeRemoteMp4Metadata(url, options, logger);
    if (fromContainer?.seconds && fromContainer.width)
        return fromContainer;
    const fromFfprobe = await readMetadataWithFfprobe(url, options?.headers);
    if (!fromFfprobe && !fromContainer?.seconds && !fromContainer?.width) {
        logger?.debug({ url: String(url) }, 'could not read remote video metadata');
    }
    return { ...fromContainer, ...fromFfprobe };
};

export const getVideoMetadata = async (path, logger) => {
    const fromContainer = await readMp4Metadata(path);
    if (fromContainer?.seconds && fromContainer.width)
        return fromContainer;
    const fromFfprobe = await readMetadataWithFfprobe(path);
    if (!fromFfprobe && !fromContainer)
        logger?.debug({ path }, 'could not read video metadata; not an MP4 and ffprobe unavailable');
    return { ...fromContainer, ...fromFfprobe };
};

const getTmpFilesDirectory = () => tmpdir();
let imageProcessingLibraryPromise;
let musicMetadataPromise;
let audioDecoderPromise;
const getImageProcessingLibrary = async () => {
    imageProcessingLibraryPromise ||= Promise.all([
        import('jimp').catch(() => undefined),
        import('sharp').catch(() => undefined)
    ]);
    const [jimp, sharp] = await imageProcessingLibraryPromise;
    if (sharp) {
        return { sharp };
    }
    if (jimp) {
        return { jimp };
    }
    imageProcessingLibraryPromise = undefined;
    throw new Boom('No image processing library available');
};
export const hkdfInfoKey = (type) => {
    const hkdfInfo = MEDIA_HKDF_KEY_MAPPING[type];
    return `WhatsApp ${hkdfInfo} Keys`;
};
export const getRawMediaUploadData = async (media, mediaType, logger) => {
    const { stream } = await getStream(media);
    logger?.debug('got stream for raw upload');
    const hasher = Crypto.createHash('sha256');
    const filePath = join(tmpdir(), mediaType + generateMessageIDV2());
    const fileWriteStream = createWriteStream(filePath);
    let fileLength = 0;
    try {
        for await (const data of stream) {
            fileLength += data.length;
            hasher.update(data);
            if (!fileWriteStream.write(data)) {
                await once(fileWriteStream, 'drain');
            }
        }
        fileWriteStream.end();
        await once(fileWriteStream, 'finish');
        stream.destroy();
        const fileSha256 = hasher.digest();
        logger?.debug('hashed data for raw upload');
        return {
            filePath: filePath,
            fileSha256,
            fileLength
        };
    }
    catch (error) {
        fileWriteStream.destroy();
        stream.destroy();
        try {
            await fs.unlink(filePath);
        }
        catch {
            //
        }
        throw error;
    }
};
/** generates all the keys required to encrypt/decrypt & sign a media message */
export async function getMediaKeys(buffer, mediaType) {
    if (!buffer) {
        throw new Boom('Cannot derive from empty media key');
    }
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer.replace('data:;base64,', ''), 'base64');
    }
    // expand using HKDF to 112 bytes, also pass in the relevant app info
    const expandedMediaKey = hkdf(buffer, 112, { info: hkdfInfoKey(mediaType) });
    return {
        iv: expandedMediaKey.slice(0, 16),
        cipherKey: expandedMediaKey.slice(16, 48),
        macKey: expandedMediaKey.slice(48, 80)
    };
}
export const extractImageThumb = async (bufferOrFilePath, width = 32) => {
    // TODO: Move entirely to sharp, removing jimp as it supports readable streams
    // This will have positive speed and performance impacts as well as minimizing RAM usage.
    if (bufferOrFilePath instanceof Readable) {
        bufferOrFilePath = await toBuffer(bufferOrFilePath);
    }
    const lib = await getImageProcessingLibrary();
    if ('sharp' in lib && typeof lib.sharp?.default === 'function') {
        const img = lib.sharp.default(bufferOrFilePath);
        const dimensions = await img.metadata();
        const buffer = await img.resize(width).jpeg({ quality: 50 }).toBuffer();
        return {
            buffer,
            original: {
                width: dimensions.width,
                height: dimensions.height
            }
        };
    }
    else if ('jimp' in lib && typeof lib.jimp?.Jimp === 'object') {
        const jimp = await lib.jimp.Jimp.read(bufferOrFilePath);
        const dimensions = {
            width: jimp.width,
            height: jimp.height
        };
        const buffer = await jimp
            .resize({ w: width, mode: lib.jimp.ResizeStrategy.BILINEAR })
            .getBuffer('image/jpeg', { quality: 50 });
        return {
            buffer,
            original: dimensions
        };
    }
    else {
        throw new Boom('No image processing library available');
    }
};
export const encodeBase64EncodedStringForUpload = (b64) => encodeURIComponent(b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=+$/, ''));
export const generateProfilePicture = async (mediaUpload, dimensions) => {
    let buffer;
    const { width: w = 640, height: h = 640 } = dimensions || {};
    if (Buffer.isBuffer(mediaUpload)) {
        buffer = mediaUpload;
    }
    else {
        // Use getStream to handle all WAMediaUpload types (Buffer, Stream, URL)
        const { stream } = await getStream(mediaUpload);
        // Convert the resulting stream to a buffer
        buffer = await toBuffer(stream);
    }
    const lib = await getImageProcessingLibrary();
    let img;
    if ('sharp' in lib && typeof lib.sharp?.default === 'function') {
        img = lib.sharp
            .default(buffer)
            .resize(w, h)
            .jpeg({
            quality: 50
        })
            .toBuffer();
    }
    else if ('jimp' in lib && typeof lib.jimp?.Jimp === 'function') {
        const jimp = await lib.jimp.Jimp.read(buffer);
        const min = Math.min(jimp.width, jimp.height);
        const cropped = jimp.crop({ x: 0, y: 0, w: min, h: min });
        img = cropped.resize({ w, h, mode: lib.jimp.ResizeStrategy.BILINEAR }).getBuffer('image/jpeg', { quality: 50 });
    }
    else {
        throw new Boom('No image processing library available');
    }
    return {
        img: await img
    };
};
/** gets the SHA256 of the given media message */
export const mediaMessageSHA256B64 = (message) => {
    const media = Object.values(message)[0];
    return media?.fileSha256 && Buffer.from(media.fileSha256).toString('base64');
};
export async function getAudioDuration(buffer) {
    musicMetadataPromise ||= import('music-metadata').catch(error => {
        musicMetadataPromise = undefined;
        throw error;
    });
    const musicMetadata = await musicMetadataPromise;
    let metadata;
    const options = {
        duration: true
    };
    if (Buffer.isBuffer(buffer)) {
        metadata = await musicMetadata.parseBuffer(buffer, undefined, options);
    }
    else if (typeof buffer === 'string') {
        metadata = await musicMetadata.parseFile(buffer, options);
    }
    else {
        metadata = await musicMetadata.parseStream(buffer, undefined, options);
    }
    return metadata.format.duration;
}
/**
  referenced from and modifying https://github.com/wppconnect-team/wa-js/blob/main/src/chat/functions/prepareAudioWaveform.ts
 */
export async function getAudioWaveform(buffer, logger) {
    try {
        // @ts-ignore
        audioDecoderPromise ||= import('audio-decode').catch(error => {
            audioDecoderPromise = undefined;
            throw error;
        });
        const { default: decoder } = await audioDecoderPromise;
        let audioData;
        if (Buffer.isBuffer(buffer)) {
            audioData = buffer;
        }
        else if (typeof buffer === 'string') {
            const rStream = createReadStream(buffer);
            audioData = await toBuffer(rStream);
        }
        else {
            audioData = await toBuffer(buffer);
        }
        const audioBuffer = await decoder(audioData);
        const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
        const samples = 64; // Number of samples we want to have in our final data set
        const blockSize = Math.floor(rawData.length / samples); // the number of samples in each subdivision
        const filteredData = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i; // the location of the first sample in the block
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
                sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
            }
            filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
        }
        // This guarantees that the largest data point will be set to 1, and the rest of the data will scale proportionally.
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        const normalizedData = filteredData.map(n => n * multiplier);
        // Generate waveform like WhatsApp
        const waveform = new Uint8Array(normalizedData.map(n => Math.floor(100 * n)));
        return waveform;
    }
    catch (e) {
        logger?.debug('Failed to generate waveform: ' + e);
    }
}
export const toReadable = (buffer) => {
    const readable = new Readable({ read: () => { } });
    readable.push(buffer);
    readable.push(null);
    return readable;
};
export const toBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    stream.destroy();
    return Buffer.concat(chunks);
};
export const getStream = async (item, opts) => {
    if (Buffer.isBuffer(item)) {
        return { stream: toReadable(item), type: 'buffer' };
    }
    if ('stream' in item) {
        return { stream: item.stream, type: 'readable' };
    }
    const urlStr = item.url.toString();
    if (urlStr.startsWith('data:')) {
        const buffer = Buffer.from(urlStr.split(',')[1], 'base64');
        return { stream: toReadable(buffer), type: 'buffer' };
    }
    if (urlStr.startsWith('http://') || urlStr.startsWith('https://')) {
        return { stream: await getHttpStream(item.url, opts), type: 'remote' };
    }
    return { stream: createReadStream(item.url), type: 'file' };
};
/** generates a thumbnail for a given media, if required */
export async function generateThumbnail(file, mediaType, options) {
    let thumbnail;
    let originalImageDimensions;
    if (mediaType === 'image') {
        const { buffer, original } = await extractImageThumb(file);
        thumbnail = buffer.toString('base64');
        if (original.width && original.height) {
            originalImageDimensions = {
                width: original.width,
                height: original.height
            };
        }
    }
    else if (mediaType === 'video') {
        const imgFilename = join(getTmpFilesDirectory(), generateMessageIDV2() + '.jpg');
        const duration = Number(options?.videoDuration);
        const atSeconds = Number.isFinite(duration) && duration > 0 ? Math.min(10, duration * 0.2) : 0.1;
        try {
            try {
                await extractVideoThumbnail(file, imgFilename, atSeconds, 32, options?.httpHeaders);
            }
            catch (firstError) {
                if (atSeconds === 0)
                    throw firstError;
                await extractVideoThumbnail(file, imgFilename, 0, 32, options?.httpHeaders);
            }
            const buff = await fs.readFile(imgFilename);
            thumbnail = buff.toString('base64');
        }
        catch (err) {
            const isMissingBinary = /not recognized|not found|ENOENT/i.test(String(err));
            if (isMissingBinary) {
                options?.logger?.warn({ err }, 'ffmpeg not found on PATH; sending video without a thumbnail');
            }
            else {
                options?.logger?.warn({ err }, 'could not generate video thumbnail');
            }
        }
        finally {
            await fs.unlink(imgFilename).catch(() => { });
        }
    }
    return {
        thumbnail,
        originalImageDimensions
    };
}
export const getHttpStream = async (url, options = {}) => {
    const response = await fetch(url.toString(), {
        dispatcher: options.dispatcher,
        method: 'GET',
        headers: options.headers
    });
    if (!response.ok) {
        throw new Boom(`Failed to fetch stream from ${url}`, { statusCode: response.status, data: { url } });
    }
    // @ts-ignore Node18+ Readable.fromWeb exists
    return response.body instanceof Readable ? response.body : Readable.fromWeb(response.body);
};
export const encryptedStream = async (media, mediaType, { logger, saveOriginalFileIfRequired, opts } = {}) => {
    const { stream, type } = await getStream(media, opts);
    logger?.debug('fetched media stream');
    const mediaKey = Crypto.randomBytes(32);
    const { cipherKey, iv, macKey } = await getMediaKeys(mediaKey, mediaType);
    const encFilePath = join(getTmpFilesDirectory(), mediaType + generateMessageIDV2() + '-enc');
    const encFileWriteStream = createWriteStream(encFilePath);
    let originalFileStream;
    let originalFilePath;
    if (saveOriginalFileIfRequired) {
        originalFilePath = join(getTmpFilesDirectory(), mediaType + generateMessageIDV2() + '-original');
        originalFileStream = createWriteStream(originalFilePath);
    }
    let fileLength = 0;
    const aes = Crypto.createCipheriv('aes-256-cbc', cipherKey, iv);
    const hmac = Crypto.createHmac('sha256', macKey).update(iv);
    const sha256Plain = Crypto.createHash('sha256');
    const sha256Enc = Crypto.createHash('sha256');
    const onChunk = async (buff) => {
        sha256Enc.update(buff);
        hmac.update(buff);
        // Handle backpressure: if write returns false, wait for drain
        if (!encFileWriteStream.write(buff)) {
            await once(encFileWriteStream, 'drain');
        }
    };
    try {
        for await (const data of stream) {
            if (type === 'remote' &&
                opts?.maxContentLength &&
                fileLength + data.length > opts.maxContentLength) {
                throw new Boom(`content length exceeded when encrypting "${type}"`, {
                    data: { media, type }
                });
            }
            fileLength += data.length;
            if (originalFileStream) {
                if (!originalFileStream.write(data)) {
                    await once(originalFileStream, 'drain');
                }
            }
            sha256Plain.update(data);
            await onChunk(aes.update(data));
        }
        await onChunk(aes.final());
        const mac = hmac.digest().slice(0, 10);
        sha256Enc.update(mac);
        const fileSha256 = sha256Plain.digest();
        const fileEncSha256 = sha256Enc.digest();
        encFileWriteStream.write(mac);
        const encFinishPromise = once(encFileWriteStream, 'finish');
        const originalFinishPromise = originalFileStream ? once(originalFileStream, 'finish') : Promise.resolve();
        encFileWriteStream.end();
        originalFileStream?.end?.();
        stream.destroy();
        // Wait for write streams to fully flush to disk
        // This helps reduce memory pressure by allowing OS to release buffers
        await encFinishPromise;
        await originalFinishPromise;
        logger?.debug('encrypted data successfully');
        return {
            mediaKey,
            originalFilePath,
            encFilePath,
            mac,
            fileEncSha256,
            fileSha256,
            fileLength
        };
    }
    catch (error) {
        // destroy all streams with error
        encFileWriteStream.destroy();
        originalFileStream?.destroy?.();
        aes.destroy();
        hmac.destroy();
        sha256Plain.destroy();
        sha256Enc.destroy();
        stream.destroy();
        try {
            await fs.unlink(encFilePath);
            if (originalFilePath) {
                await fs.unlink(originalFilePath);
            }
        }
        catch (err) {
            logger?.error({ err }, 'failed deleting tmp files');
        }
        throw error;
    }
};
export const DEF_MEDIA_HOST = 'mmg.whatsapp.net';
const AES_CHUNK_SIZE = 16;
const toSmallestChunkSize = (num) => {
    return Math.floor(num / AES_CHUNK_SIZE) * AES_CHUNK_SIZE;
};
export const getUrlFromDirectPath = (directPath, host = DEF_MEDIA_HOST) => `https://${host}${directPath}`;
const extractHost = (url) => {
    if (!url)
        return undefined;
    try {
        return new URL(url).host;
    }
    catch {
        return undefined;
    }
};
export const downloadContentFromMessage = async ({ mediaKey, directPath, url }, type, opts = {}) => {
    // Fallback host: explicit opt > host parsed from `url` > DEF_MEDIA_HOST.
    // Lets us honor a non-default host carried by the proto without forcing callers to thread it through.
    const fallbackHost = opts.host ?? extractHost(url);
    const downloadUrl = directPath ? getUrlFromDirectPath(directPath, fallbackHost) : url;
    if (!downloadUrl) {
        throw new Boom('No valid media URL or directPath present in message', { statusCode: 400 });
    }
    const keys = await getMediaKeys(mediaKey, type);
    return downloadEncryptedContent(downloadUrl, keys, opts);
};
/**
 * Decrypts and downloads an AES256-CBC encrypted file given the keys.
 * Assumes the SHA256 of the plaintext is appended to the end of the ciphertext
 * */
export const downloadEncryptedContent = async (downloadUrl, { cipherKey, iv }, { startByte, endByte, options } = {}) => {
    let bytesFetched = 0;
    let startChunk = 0;
    let firstBlockIsIV = false;
    // if a start byte is specified -- then we need to fetch the previous chunk as that will form the IV
    if (startByte) {
        const chunk = toSmallestChunkSize(startByte || 0);
        if (chunk) {
            startChunk = chunk - AES_CHUNK_SIZE;
            bytesFetched = chunk;
            firstBlockIsIV = true;
        }
    }
    const endChunk = endByte ? toSmallestChunkSize(endByte || 0) + AES_CHUNK_SIZE : undefined;
    const headersInit = options?.headers ? options.headers : undefined;
    const headers = {
        ...(headersInit
            ? Array.isArray(headersInit)
                ? Object.fromEntries(headersInit)
                : headersInit
            : {}),
        Origin: DEFAULT_ORIGIN
    };
    if (startChunk || endChunk) {
        headers.Range = `bytes=${startChunk}-`;
        if (endChunk) {
            headers.Range += endChunk;
        }
    }
    // download the message
    const fetched = await getHttpStream(downloadUrl, {
        ...(options || {}),
        headers
    });
    let remainingBytes = Buffer.from([]);
    let aes;
    const pushBytes = (bytes, push) => {
        if (startByte || endByte) {
            const start = bytesFetched >= startByte ? undefined : Math.max(startByte - bytesFetched, 0);
            const end = bytesFetched + bytes.length < endByte ? undefined : Math.max(endByte - bytesFetched, 0);
            push(bytes.slice(start, end));
            bytesFetched += bytes.length;
        }
        else {
            push(bytes);
        }
    };
    const output = new Transform({
        transform(chunk, _, callback) {
            let data = remainingBytes.length ? Buffer.concat([remainingBytes, chunk]) : chunk;
            const decryptLength = toSmallestChunkSize(data.length);
            remainingBytes = data.slice(decryptLength);
            data = data.slice(0, decryptLength);
            if (!aes) {
                let ivValue = iv;
                if (firstBlockIsIV) {
                    ivValue = data.slice(0, AES_CHUNK_SIZE);
                    data = data.slice(AES_CHUNK_SIZE);
                }
                aes = Crypto.createDecipheriv('aes-256-cbc', cipherKey, ivValue);
                // if an end byte that is not EOF is specified
                // stop auto padding (PKCS7) -- otherwise throws an error for decryption
                if (endByte) {
                    aes.setAutoPadding(false);
                }
            }
            try {
                pushBytes(aes.update(data), b => this.push(b));
                callback();
            }
            catch (error) {
                callback(error);
            }
        },
        final(callback) {
            try {
                pushBytes(aes.final(), b => this.push(b));
                callback();
            }
            catch (error) {
                callback(error);
            }
        }
    });
    return fetched.pipe(output, { end: true });
};
export function extensionForMediaMessage(message) {
    const getExtension = (mimetype) => mimetype.split(';')[0]?.split('/')[1];
    const type = Object.keys(message)[0];
    let extension;
    if (type === 'locationMessage' || type === 'liveLocationMessage' || type === 'productMessage') {
        extension = '.jpeg';
    }
    else {
        const messageContent = message[type];
        extension = getExtension(messageContent.mimetype);
    }
    return extension;
}
const isNodeRuntime = () => {
    return (typeof process !== 'undefined' &&
        process.versions?.node !== null &&
        typeof process.versions.bun === 'undefined' &&
        typeof globalThis.Deno === 'undefined');
};
export const uploadWithNodeHttp = async ({ url, filePath, headers, timeoutMs, agent }, redirectCount = 0) => {
    if (redirectCount > 5) {
        throw new Error('Too many redirects');
    }
    const parsedUrl = new URL(url);
    const httpModule = parsedUrl.protocol === 'https:' ? await import('https') : await import('http');
    // Get file size for Content-Length header (required for Node.js streaming)
    const fileStats = await fs.stat(filePath);
    const fileSize = fileStats.size;
    return new Promise((resolve, reject) => {
        const req = httpModule.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: {
                ...headers,
                'Content-Length': fileSize
            },
            agent,
            timeout: timeoutMs
        }, res => {
            // Handle redirects (3xx)
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                res.resume(); // Consume response to free resources
                const newUrl = new URL(res.headers.location, url).toString();
                resolve(uploadWithNodeHttp({
                    url: newUrl,
                    filePath,
                    headers,
                    timeoutMs,
                    agent
                }, redirectCount + 1));
                return;
            }
            let body = '';
            res.on('data', chunk => (body += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch {
                    resolve(undefined);
                }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Upload timeout'));
        });
        const stream = createReadStream(filePath);
        stream.pipe(req);
        stream.on('error', err => {
            req.destroy();
            reject(err);
        });
    });
};
const uploadWithFetch = async ({ url, filePath, headers, timeoutMs, agent }) => {
    // Convert Node.js Readable to Web ReadableStream
    const nodeStream = createReadStream(filePath);
    const webStream = Readable.toWeb(nodeStream);
    // Native fetch only accepts Undici-style dispatchers, not generic https Agents.
    const dispatcher = typeof agent?.dispatch === 'function' ? agent : undefined;
    const response = await fetch(url, {
        ...(dispatcher ? { dispatcher } : {}),
        method: 'POST',
        body: webStream,
        headers,
        duplex: 'half',
        signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined
    });
    try {
        return (await response.json());
    }
    catch {
        return undefined;
    }
};
/**
 * Uploads media to WhatsApp servers.
 *
 * ## Why we have two upload implementations:
 *
 * Node.js's native `fetch` (powered by undici) has a known bug where it buffers
 * the entire request body in memory before sending, even when using streams.
 * This causes memory issues with large files (e.g., 1GB file = 1GB+ memory usage).
 * See: https://github.com/nodejs/undici/issues/4058
 *
 * Other runtimes (Bun, Deno, browsers) correctly stream the request body without
 * buffering, so we can use the web-standard Fetch API there.
 *
 * ## Future considerations:
 * Once the undici bug is fixed, we can simplify this to use only the Fetch API
 * across all runtimes. Monitor the GitHub issue for updates.
 */
const uploadMedia = async (params, logger) => {
    if (isNodeRuntime()) {
        logger?.debug('Using Node.js https module for upload (avoids undici buffering bug)');
        return uploadWithNodeHttp(params);
    }
    else {
        logger?.debug('Using web-standard Fetch API for upload');
        return uploadWithFetch(params);
    }
};
export const getWAUploadToServer = ({ customUploadHosts, fetchAgent, logger, options }, refreshMediaConn) => {
    return async (filePath, { mediaType, fileEncSha256B64, timeoutMs }) => {
        // send a query JSON to obtain the url & auth token to upload our media
        let uploadInfo = await refreshMediaConn(false);
        let urls;
        const hosts = [...customUploadHosts, ...uploadInfo.hosts];
        fileEncSha256B64 = encodeBase64EncodedStringForUpload(fileEncSha256B64);
        // Prepare common headers
        const customHeaders = (() => {
            const hdrs = options?.headers;
            if (!hdrs)
                return {};
            return Array.isArray(hdrs) ? Object.fromEntries(hdrs) : hdrs;
        })();
        const headers = {
            ...customHeaders,
            'Content-Type': 'application/octet-stream',
            Origin: DEFAULT_ORIGIN
        };
        for (const { hostname } of hosts) {
            logger.debug(`uploading to "${hostname}"`);
            const auth = encodeURIComponent(uploadInfo.auth);
            const url = `https://${hostname}${MEDIA_PATH_MAP[mediaType]}/${fileEncSha256B64}?auth=${auth}&token=${fileEncSha256B64}`;
            let result;
            try {
                result = await uploadMedia({
                    url,
                    filePath,
                    headers,
                    timeoutMs,
                    agent: fetchAgent
                }, logger);
                if (result?.url || result?.direct_path) {
                    urls = {
                        mediaUrl: result.url,
                        directPath: result.direct_path,
                        meta_hmac: result.meta_hmac,
                        fbid: result.fbid,
                        ts: result.ts
                    };
                    break;
                }
                else {
                    uploadInfo = await refreshMediaConn(true);
                    throw new Error(`upload failed, reason: ${JSON.stringify(result)}`);
                }
            }
            catch (error) {
                const isLast = hostname === hosts[uploadInfo.hosts.length - 1]?.hostname;
                logger.warn({ trace: error?.stack, uploadResult: result }, `Error in uploading to ${hostname} ${isLast ? '' : ', retrying...'}`);
            }
        }
        if (!urls) {
            throw new Boom('Media upload failed on all hosts', { statusCode: 500 });
        }
        return urls;
    };
};
const getMediaRetryKey = (mediaKey) => {
    return hkdf(mediaKey, 32, { info: 'WhatsApp Media Retry Notification' });
};
/**
 * Generate a binary node that will request the phone to re-upload the media & return the newly uploaded URL
 */
export const encryptMediaRetryRequest = (key, mediaKey, meId) => {
    const recp = { stanzaId: key.id };
    const recpBuffer = proto.ServerErrorReceipt.encode(recp).finish();
    const iv = Crypto.randomBytes(12);
    const retryKey = getMediaRetryKey(mediaKey);
    const ciphertext = aesEncryptGCM(recpBuffer, retryKey, iv, Buffer.from(key.id));
    const req = {
        tag: 'receipt',
        attrs: {
            id: key.id,
            to: jidNormalizedUser(meId),
            type: 'server-error'
        },
        content: [
            // this encrypt node is actually pretty useless
            // the media is returned even without this node
            // keeping it here to maintain parity with WA Web
            {
                tag: 'encrypt',
                attrs: {},
                content: [
                    { tag: 'enc_p', attrs: {}, content: ciphertext },
                    { tag: 'enc_iv', attrs: {}, content: iv }
                ]
            },
            {
                tag: 'rmr',
                attrs: {
                    jid: key.remoteJid,
                    from_me: (!!key.fromMe).toString(),
                    // @ts-ignore
                    participant: key.participant || undefined
                }
            }
        ]
    };
    return req;
};
export const decodeMediaRetryNode = (node) => {
    const rmrNode = getBinaryNodeChild(node, 'rmr');
    const event = {
        key: {
            id: node.attrs.id,
            remoteJid: rmrNode.attrs.jid,
            fromMe: rmrNode.attrs.from_me === 'true',
            participant: rmrNode.attrs.participant
        }
    };
    const errorNode = getBinaryNodeChild(node, 'error');
    if (errorNode) {
        const errorCode = +errorNode.attrs.code;
        event.error = new Boom(`Failed to re-upload media (${errorCode})`, {
            data: errorNode.attrs,
            statusCode: getStatusCodeForMediaRetry(errorCode)
        });
    }
    else {
        const encryptedInfoNode = getBinaryNodeChild(node, 'encrypt');
        const ciphertext = getBinaryNodeChildBuffer(encryptedInfoNode, 'enc_p');
        const iv = getBinaryNodeChildBuffer(encryptedInfoNode, 'enc_iv');
        if (ciphertext && iv) {
            event.media = { ciphertext, iv };
        }
        else {
            event.error = new Boom('Failed to re-upload media (missing ciphertext)', { statusCode: 404 });
        }
    }
    return event;
};
export const decryptMediaRetryData = ({ ciphertext, iv }, mediaKey, msgId) => {
    const retryKey = getMediaRetryKey(mediaKey);
    const plaintext = aesDecryptGCM(ciphertext, retryKey, iv, Buffer.from(msgId));
    return proto.MediaRetryNotification.decode(plaintext);
};
export const getStatusCodeForMediaRetry = (code) => MEDIA_RETRY_STATUS_MAP[code];
const MEDIA_RETRY_STATUS_MAP = {
    [proto.MediaRetryNotification.ResultType.SUCCESS]: 200,
    [proto.MediaRetryNotification.ResultType.DECRYPTION_ERROR]: 412,
    [proto.MediaRetryNotification.ResultType.NOT_FOUND]: 404,
    [proto.MediaRetryNotification.ResultType.GENERAL_ERROR]: 418
};
//# sourceMappingURL=messages-media.js.map