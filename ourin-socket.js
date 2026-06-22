import axios from "axios";
let _sharp = null;
async function getSharp() {
  if (!_sharp) _sharp = (await import("sharp")).default;
  return _sharp;
}
import crypto from "crypto";
import archiver from "archiver";
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  generateWAMessage,
  generateMessageID,
  proto,
  areJidsSameUser,
  generateForwardMessageContent,
} from "ourin";
import {
  isLid,
  isLidConverted,
  resolveAnyLidToJid,
  getCachedJid,
} from "./ourin-lid.js";

import fs from "fs";
import path from "path";
import { downloadMediaMessage, getContentType } from "ourin";
import { addExifToWebp, DEFAULT_METADATA } from "./ourin-exif.js";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
import { config } from "./../../config.js";
import mime from "mime-types";
import sharp from "sharp";
import {
  getProfilePicture,
  getProfileBuffer,
} from "./ourin-profile-picture.js";

function getTempDir() {
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

async function downloadBuffer(url) {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  return Buffer.from(response.data);
}

async function resolveInput(input) {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === "string") {
    if (/^https?:\/\//.test(input)) return await downloadBuffer(input);
    if (fs.existsSync(input)) return fs.readFileSync(input);
  }
  throw new Error("Invalid input: expected Buffer, URL string, or file path");
}

async function imageToWebp(buffer) {
  try {
    return await (
      await getSharp()
    )(buffer)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (error) {
    throw new Error("Failed to convert image to webp: " + error.message);
  }
}

function videoToWebp(buffer) {
  return new Promise((resolve, reject) => {
    const tmpDir = getTempDir();
    const inputPath = path.join(tmpDir, `input_${Date.now()}.mp4`);
    const outputPath = path.join(tmpDir, `output_${Date.now()}.webp`);
    if (!buffer || buffer.length < 1000)
      return reject(new Error("Invalid video buffer"));
    fs.writeFileSync(inputPath, buffer);
    const cleanup = () => {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      } catch {}
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {}
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Video conversion timeout"));
    }, 60000);
    ffmpeg(inputPath)
      .inputOptions(["-y", "-t", "6"])
      .outputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "fps=12,scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1",
        "-loop",
        "0",
        "-preset",
        "default",
        "-an",
        "-vsync",
        "0",
        "-q:v",
        "50",
      ])
      .toFormat("webp")
      .on("end", () => {
        clearTimeout(timeout);
        try {
          if (
            !fs.existsSync(outputPath) ||
            fs.statSync(outputPath).size < 100
          ) {
            cleanup();
            return reject(new Error("Output file is empty or invalid"));
          }
          const webpBuffer = fs.readFileSync(outputPath);
          cleanup();
          resolve(webpBuffer);
        } catch (err) {
          cleanup();
          reject(err);
        }
      })
      .on("error", (err) => {
        clearTimeout(timeout);
        cleanup();
        reject(new Error("FFmpeg error: " + err.message));
      })
      .save(outputPath);
  });
}

async function simpleImageToWebp(buffer) {
  const tmpDir = getTempDir();
  const inputPath = path.join(tmpDir, `img_${Date.now()}.png`);
  const outputPath = path.join(tmpDir, `sticker_${Date.now()}.webp`);
  fs.writeFileSync(inputPath, buffer);
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(512,iw)':'min(512,ih)':force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
        "-loop",
        "0",
        "-preset",
        "default",
        "-an",
        "-vsync",
        "0",
      ])
      .toFormat("webp")
      .on("end", () => {
        try {
          const webpBuffer = fs.readFileSync(outputPath);
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          resolve(webpBuffer);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", (err) => {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        reject(err);
      })
      .save(outputPath);
  });
}

async function extendSocket(sock) {
  sock.sendImageAsSticker = async (jid, input, m, options = {}) => {
    const buffer = await resolveInput(input);
    let webpBuffer;
    try {
      webpBuffer = await (
        await getSharp()
      )(buffer)
        .resize(512, 512, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 80 })
        .toBuffer();
    } catch (err) {
      throw new Error("Failed to convert image: " + err.message);
    }
    try {
      webpBuffer = await addExifToWebp(webpBuffer, {
        packname: options.packname ?? DEFAULT_METADATA.packname,
        author: options.author ?? DEFAULT_METADATA.author,
        emojis: options.emojis || DEFAULT_METADATA.emojis,
      });
    } catch (e) {
      console.log("[Sticker] EXIF error:", e.message);
    }
    return sock.sendMessage(
      jid,
      {
        sticker: webpBuffer,
        isAiSticker: true,
        isAvatar: true,
        contextInfo: { isForwarded: true, forwardingScore: 1, premium: 1 },
      },
      { quoted: m },
    );
  };

  sock.sendVideoAsSticker = async (jid, input, m, options = {}) => {
    const buffer = await resolveInput(input);
    let webpBuffer = await videoToWebp(buffer);
    try {
      webpBuffer = await addExifToWebp(webpBuffer, {
        packname: options.packname ?? DEFAULT_METADATA.packname,
        author: options.author ?? DEFAULT_METADATA.author,
        emojis: options.emojis || DEFAULT_METADATA.emojis,
      });
    } catch (e) {
      console.log("[Sticker] EXIF error:", e.message);
    }
    return sock.sendMessage(
      jid,
      {
        sticker: webpBuffer,
        contextInfo: { isForwarded: true, forwardingScore: 999 },
      },
      { quoted: m },
    );
  };

  sock.sendStickerPack = async (jid, stickers, m, options = {}) => {
    if (!stickers || !stickers.length) throw new Error("No stickers provided");

    const packname = options.name ?? options.packname ?? "Sticker Pack";
    const publisher = options.publisher ?? options.author ?? "Ourin-AI";
    const packDescription = options.description || "";
    const stickerPackId = options.id || crypto.randomUUID();
    const emojis = options.emojis || ["\uD83C\uDFA8"];

    const stickerList = [];
    let coverBuffer = null;

    for (let i = 0; i < stickers.length; i++) {
      try {
        let stickerBuffer = stickers[i];
        if (typeof stickerBuffer === "string") {
          if (stickerBuffer.startsWith("http"))
            stickerBuffer = await downloadBuffer(stickerBuffer);
          else if (fs.existsSync(stickerBuffer))
            stickerBuffer = fs.readFileSync(stickerBuffer);
        }
        if (!Buffer.isBuffer(stickerBuffer) || stickerBuffer.length < 100)
          continue;

        const isGif = stickerBuffer.slice(0, 4).toString("hex") === "47494638";
        const isWebp = stickerBuffer.slice(0, 4).toString("hex") === "52494646";
        const isPng =
          stickerBuffer.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
        const isJpeg = stickerBuffer.slice(0, 2).toString("hex") === "ffd8";

        let webpBuffer;
        if (isGif) webpBuffer = await videoToWebp(stickerBuffer);
        else if (isWebp) webpBuffer = stickerBuffer;
        else if (isPng || isJpeg) webpBuffer = await imageToWebp(stickerBuffer);
        else {
          try {
            webpBuffer = await imageToWebp(stickerBuffer);
          } catch {
            webpBuffer = await videoToWebp(stickerBuffer);
          }
        }

        if (!coverBuffer) coverBuffer = webpBuffer;

        stickerList.push({
          sticker: webpBuffer,
          emojis,
          accessibilityLabel: "",
        });
      } catch (e) {
        console.log(`[StickerPack] Failed sticker ${i + 1}:`, e.message);
      }
    }

    if (stickerList.length === 0)
      throw new Error("No stickers could be prepared");

    return sock.sendMessage(
      jid,
      {
        stickerPack: {
          packId: stickerPackId,
          name: packname,
          publisher,
          description: packDescription,
          cover: coverBuffer,
          stickers: stickerList,
        },
      },
      m ? { quoted: m } : {},
    );
  };

  if (!global.stickerPackCache) global.stickerPackCache = new Map();

  sock.saveStickerPack = (packId, messageContent, packName = "Unknown") => {
    global.stickerPackCache.set(packId, {
      message: messageContent,
      name: packName,
      savedAt: Date.now(),
    });
  };
  sock.getSavedPacks = () => {
    const packs = [];
    for (const [id, data] of global.stickerPackCache.entries())
      packs.push({ id, name: data.name, savedAt: data.savedAt });
    return packs;
  };

  sock.forwardStickerPack = async (jid, packIdOrMessage, m) => {
    let messageContent;
    if (typeof packIdOrMessage === "string") {
      const cached = global.stickerPackCache.get(packIdOrMessage);
      if (!cached)
        throw new Error(`Sticker pack "${packIdOrMessage}" not found`);
      messageContent = cached.message;
    } else if (packIdOrMessage?.stickerPackMessage)
      messageContent = packIdOrMessage;
    else throw new Error("Invalid sticker pack message format");
    const message = generateWAMessageFromContent(jid, messageContent, {
      quoted: m,
      userJid: sock.user?.id,
      messageId: crypto.randomBytes(8).toString("hex").toUpperCase(),
    });
    await sock.relayMessage(jid, message.message, {
      messageId: message.key.id,
    });
    return message;
  };

  sock.sendFile = async (jid, input, options = {}) => {
    let buffer;
    let filename = options.filename || "file";
    let mimetype = options.mimetype;
    if (Buffer.isBuffer(input)) {
      buffer = input;
    } else if (typeof input === "string") {
      if (/^https?:\/\//.test(input)) {
        buffer = await downloadBuffer(input);
        filename =
          options.filename || path.basename(new URL(input).pathname) || "file";
      } else if (fs.existsSync(input)) {
        buffer = fs.readFileSync(input);
        filename = options.filename || path.basename(input);
      } else throw new Error("Invalid input");
    } else throw new Error("Invalid input type");
    if (!mimetype) {
      const ext = path.extname(filename).toLowerCase();
      const mt = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".mp4": "video/mp4",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".pdf": "application/pdf",
        ".zip": "application/zip",
      };
      mimetype = mt[ext] || "application/octet-stream";
    }
    let mc = {};
    if (mimetype.startsWith("image/")) {
      mc.image = buffer;
      if (options.caption) mc.caption = options.caption;
    } else if (mimetype.startsWith("video/")) {
      mc.video = buffer;
      mc.mimetype = mimetype;
      if (options.caption) mc.caption = options.caption;
    } else if (mimetype.startsWith("audio/")) {
      mc.audio = buffer;
      mc.mimetype = mimetype;
      mc.ptt = options.ptt || false;
    } else {
      mc.document = buffer;
      mc.mimetype = mimetype;
      mc.fileName = filename;
      if (options.caption) mc.caption = options.caption;
    }
    return sock.sendMessage(jid, mc, { quoted: options.quoted });
  };

  sock.sendMedia = async function (
    jid,
    source,
    caption = "",
    quoted,
    options = {},
  ) {
    function isUrlObject(v) {
      return (
        v &&
        typeof v === "object" &&
        !Buffer.isBuffer(v) &&
        typeof v.url === "string"
      );
    }
    if (
      source &&
      typeof source === "object" &&
      (source.image || source.video || source.audio || source.document)
    )
      return this.sendMessage(jid, source, options);
    let data = source;
    let mimeType = options.mimetype || "application/octet-stream";
    let fileName = options.fileName || "file";
    if (Buffer.isBuffer(source)) {
    } else if (typeof source === "string" && /^https?:\/\//.test(source))
      data = { url: source };
    else if (typeof source === "string" && fs.existsSync(source)) {
      mimeType = mime.lookup(source) || "application/octet-stream";
      fileName = path.basename(source);
      data = fs.readFileSync(source);
    } else if (isUrlObject(source)) data = { url: source.url };
    else
      throw new Error(
        "Source harus berupa Buffer, URL string, path file, object { url }, atau payload media",
      );
    const mediaType = options.type || options.mediaType;
    const captionField = caption != null ? { caption } : {};
    let payload = {};
    if (mediaType === "image")
      payload = { image: data, ...captionField, ...options };
    else if (mediaType === "video")
      payload = { video: data, ...captionField, ...options };
    else if (mediaType === "audio") {
      const audioMime =
        mimeType && mimeType !== "application/octet-stream"
          ? mimeType
          : "audio/mpeg";
      payload = {
        audio: data,
        mimetype: audioMime,
        ptt: options.ptt || false,
        ...options,
      };
    } else
      payload = {
        document: data,
        mimetype: mimeType || "application/octet-stream",
        fileName,
        ...captionField,
        ...options,
      };
    delete payload.type;
    delete payload.mediaType;
    return sock.sendMessage(jid, payload, { quoted });
  };

  sock.sendButton = async function (
    jid,
    source,
    text = null,
    quoted,
    options = {},
  ) {
    const msg = {};
    if (options.header) msg.header = options.header;
    if (options.contextInfo) msg.contextInfo = options.contextInfo;
    if (text !== null) msg.caption = text;
    if (options.footer) msg.footer = options.footer;
    if (options.buttons) msg.interactiveButtons = options.buttons;
    if (!options.footer) msg.footer = config.bot?.name || "Ourin-AI";
    if (source) {
      let data = source;
      const mediaType = options.type || options.mediaType || "image";
      if (Buffer.isBuffer(source)) {
      } else if (typeof source === "string" && /^https?:\/\//.test(source))
        data = { url: source };
      else if (typeof source === "string" && fs.existsSync(source))
        data = fs.readFileSync(source);
      else if (source === null) data = null;
      if (mediaType === "image" && data) msg.image = data;
      else if (mediaType === "video" && data) {
        msg.video = data;
        msg.mimetype = options.mimetype || "video/mp4";
      } else if (mediaType === "audio" && data) {
        msg.audio = data;
        msg.mimetype = options.mimetype || "audio/mpeg";
      } else if (mediaType === "document" && data) {
        msg.document = data;
        msg.mimetype = options.mimetype || "application/octet-stream";
        if (options.fileName) msg.fileName = options.fileName;
      }
    }
    return sock.sendMessage(jid, msg, { quoted });
  };

  const _originalProfilePictureUrl = sock.profilePictureUrl.bind(sock);
  sock.profilePictureUrl = async function (jid) {
    return await getProfilePicture(
      { profilePictureUrl: _originalProfilePictureUrl },
      jid,
    );
  };
  sock.profileBuffer = async function (jid) {
    return await getProfileBuffer(
      { profilePictureUrl: _originalProfilePictureUrl },
      jid,
    );
  };
  sock.sendText = async function (jid, text, quoted, options = {}) {
    return await sock.sendMessage(jid, { text, ...options }, { quoted });
  };

  sock.sendContact = async (jid, contacts, options = {}) => {
    const contactArray = Array.isArray(contacts) ? contacts : [contacts];
    const vcards = contactArray.map((c) => {
      const name = c.name || "Unknown";
      const number = c.number?.replace(/[^0-9]/g, "") || "";
      const org = c.org || "";
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\n`;
      if (org) vcard += `ORG:${org}\n`;
      vcard += `TEL;type=CELL;type=VOICE;waid=${number}:+${number}\nEND:VCARD`;
      return { vcard };
    });
    const displayName =
      contactArray.length === 1
        ? contactArray[0].name || "Contact"
        : `${contactArray.length} Contacts`;
    return sock.sendMessage(
      jid,
      { contacts: { displayName, contacts: vcards } },
      { quoted: options.quoted },
    );
  };

  sock.downloadAndSaveMediaMessage = async (msg, savePath = null) => {
    const message = msg.message || msg;
    const type = getContentType(message);
    if (!type) throw new Error("No media found in message");
    const buffer = await downloadMediaMessage(
      { message },
      "buffer",
      {},
      { logger: console, reuploadRequest: sock.updateMediaMessage },
    );
    let savedPath = null;
    if (savePath) {
      const dir = path.dirname(savePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(savePath, buffer);
      savedPath = savePath;
    }
    return { buffer, path: savedPath, type };
  };

  sock.getName = async (jid, groupJid = null) => {
    if (!jid) return "Unknown";
    let id = jid;
    if (isLid(jid) || isLidConverted(jid)) {
      const cached = getCachedJid(jid);
      if (cached) id = cached;
      else if (groupJid) {
        try {
          const gm = await sock.groupMetadata(groupJid);
          id = resolveAnyLidToJid(jid, gm.participants || []);
        } catch {
          id = jid.replace("@lid", "@s.whatsapp.net");
        }
      } else id = jid.replace("@lid", "@s.whatsapp.net");
    }
    if (id.endsWith("@g.us")) {
      try {
        let v = sock.store?.contacts?.[id] || {};
        if (!(v.name || v.subject))
          v = await sock.groupMetadata(id).catch(() => ({}));
        return v.name || v.subject || id.split("@")[0];
      } catch {
        return id.split("@")[0];
      }
    }
    if (id === "0@s.whatsapp.net") return "WhatsApp";
    const botId = sock.user?.id?.split(":")[0] + "@s.whatsapp.net";
    if (id === botId)
      return sock.user?.name || sock.user?.verifiedName || "Bot";
    let v = sock.store?.contacts?.[id] || {};
    if (v.name) return v.name;
    if (v.notify) return v.notify;
    if (v.pushName) return v.pushName;
    if (v.verifiedName) return v.verifiedName;
    if (v.subject) return v.subject;
    if (groupJid) {
      try {
        const gm = await sock.groupMetadata(groupJid);
        const tn = id.replace(/[^0-9]/g, "");
        const p = gm.participants?.find(
          (pt) => (pt.jid || pt.id || "").replace(/[^0-9]/g, "") === tn,
        );
        if (p) {
          const pj = p.jid || p.id || "";
          if (sock.store?.contacts?.[pj]) {
            const ct = sock.store.contacts[pj];
            if (ct.name) return ct.name;
            if (ct.notify) return ct.notify;
            if (ct.pushName) return ct.pushName;
          }
        }
      } catch {}
    }
    try {
      if (sock.getBusinessProfile) {
        const profile = await sock.getBusinessProfile(id).catch(() => null);
        if (profile?.wid?.user) {
          const pn = profile.name || profile.pushname || profile.verifiedName;
          if (pn) {
            if (sock.store?.contacts)
              sock.store.contacts[id] = {
                ...sock.store.contacts[id],
                name: pn,
              };
            return pn;
          }
        }
      }
    } catch {}
    try {
      if (sock.onWhatsApp) {
        const [result] = await sock.onWhatsApp(id).catch(() => []);
        if (
          result?.exists &&
          result?.jid &&
          sock.store?.contacts?.[result.jid]
        ) {
          const ct = sock.store.contacts[result.jid];
          if (ct.name) return ct.name;
          if (ct.notify) return ct.notify;
        }
      }
    } catch {}
    const number = id.replace(/@.+/g, "");
    if (number && number.length > 0) {
      if (number.startsWith("62")) return "+62" + number.slice(2);
      return "+" + number;
    }
    return "Unknown";
  };

  sock.getNameFromParticipants = (jid, participants = []) => {
    if (!jid) return "Unknown";
    let resolvedJid = jid;
    if (isLid(jid) || isLidConverted(jid))
      resolvedJid = resolveAnyLidToJid(jid, participants);
    const targetNum = resolvedJid.replace(/[^0-9]/g, "");
    const participant = participants.find(
      (p) => (p.jid || p.id || "").replace(/[^0-9]/g, "") === targetNum,
    );
    if (participant) {
      const pJid = participant.jid || participant.id || "";
      if (sock.store?.contacts?.[pJid]) {
        const c = sock.store.contacts[pJid];
        if (c.name) return c.name;
        if (c.notify) return c.notify;
      }
    }
    const number = resolvedJid.replace(/@.+/g, "");
    if (number.startsWith("62")) return "0" + number.slice(2);
    return number || "Unknown";
  };

  sock.parseMention = (text = "") =>
    [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(
      (v) => v[1] + "@s.whatsapp.net",
    );

  sock.reply = (jid, text = "", quoted, options = {}) => {
    return Buffer.isBuffer(text)
      ? sock.sendMessage(jid, { document: text, ...options }, { quoted })
      : sock.sendMessage(
          jid,
          { ...options, text, mentions: sock.parseMention(text) },
          { quoted },
        );
  };

  sock.cMod = async (
    jid,
    message,
    text = "",
    sender = sock.user?.id,
    options = {},
  ) => {
    if (options.mentions && !Array.isArray(options.mentions))
      options.mentions = [options.mentions];
    let copy = message.toJSON
      ? message.toJSON()
      : JSON.parse(JSON.stringify(message));
    delete copy.message?.messageContextInfo;
    delete copy.message?.senderKeyDistributionMessage;
    let mtype = Object.keys(copy.message || {})[0];
    let msg = copy.message;
    let content = msg?.[mtype];
    if (typeof content === "string") msg[mtype] = text || content;
    else if (content?.caption) content.caption = text || content.caption;
    else if (content?.text) content.text = text || content.text;
    if (typeof content !== "string" && content) {
      msg[mtype] = { ...content, ...options };
      msg[mtype].contextInfo = {
        ...(content.contextInfo || {}),
        mentionedJid:
          options.mentions || content.contextInfo?.mentionedJid || [],
      };
    }
    if (copy.participant)
      sender = copy.participant = sender || copy.participant;
    else if (copy.key?.participant)
      sender = copy.key.participant = sender || copy.key.participant;
    if (copy.key?.remoteJid?.includes("@s.whatsapp.net"))
      sender = sender || copy.key.remoteJid;
    else if (copy.key?.remoteJid?.includes("@broadcast"))
      sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = areJidsSameUser(sender, sock.user?.id) || false;
    return proto.WebMessageInfo.create(copy);
  };

  sock.cMods = (
    jid,
    message,
    text = "",
    sender = sock.user?.id,
    options = {},
  ) => {
    let copy = message.toJSON
      ? message.toJSON()
      : JSON.parse(JSON.stringify(message));
    let mtype = Object.keys(copy.message || {})[0];
    let msg = copy.message;
    let content = msg?.[mtype];
    if (typeof content === "string") msg[mtype] = text || content;
    else if (content?.caption) content.caption = text || content.caption;
    else if (content?.text) content.text = text || content.text;
    if (typeof content !== "string" && content)
      msg[mtype] = { ...content, ...options };
    if (copy.participant)
      sender = copy.participant = sender || copy.participant;
    else if (copy.key?.participant)
      sender = copy.key.participant = sender || copy.key.participant;
    if (copy.key?.remoteJid?.includes("@s.whatsapp.net"))
      sender = sender || copy.key.remoteJid;
    else if (copy.key?.remoteJid?.includes("@broadcast"))
      sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = areJidsSameUser(sender, sock.user?.id) || false;
    return proto.WebMessageInfo.create(copy);
  };

  sock.copyNForward = async (
    jid,
    message,
    forwardingScore = true,
    options = {},
  ) => {
    let m = generateForwardMessageContent(message, !!forwardingScore);
    let mtype = Object.keys(m)[0];
    if (
      forwardingScore &&
      typeof forwardingScore === "number" &&
      forwardingScore > 1
    ) {
      m[mtype].contextInfo = m[mtype].contextInfo || {};
      m[mtype].contextInfo.forwardingScore =
        (m[mtype].contextInfo.forwardingScore || 0) + forwardingScore;
    }
    if (options.quoted) {
      m[mtype].contextInfo = m[mtype].contextInfo || {};
      m[mtype].contextInfo.quotedMessage = options.quoted.message;
      m[mtype].contextInfo.stanzaId = options.quoted.key?.id;
      m[mtype].contextInfo.participant =
        options.quoted.key?.participant || options.quoted.key?.remoteJid;
      m[mtype].contextInfo.remoteJid = options.quoted.key?.remoteJid;
    }
    m = generateWAMessageFromContent(jid, m, {
      ...options,
      userJid: sock.user?.id,
    });
    await sock.relayMessage(jid, m.message, {
      messageId: m.key.id,
      additionalAttributes: { ...options },
    });
    return m;
  };

  sock.fakeReply = async (
    jid,
    text = "",
    fakeJid = sock.user?.id,
    fakeText = "",
    fakeGroupJid,
    options = {},
  ) => {
    return sock.reply(jid, text, {
      key: {
        fromMe: areJidsSameUser(fakeJid, sock.user?.id),
        participant: fakeJid,
        ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {}),
      },
      message: { conversation: fakeText },
      ...options,
    });
  };

  return sock;
}

export {
  extendSocket,
  downloadBuffer,
  imageToWebp,
  videoToWebp,
  simpleImageToWebp,
  getTempDir,
};
