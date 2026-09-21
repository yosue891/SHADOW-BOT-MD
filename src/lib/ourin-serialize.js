import {
  downloadContentFromMessage,
  getContentType,
  jidDecode,
  proto,
  generateWAMessageFromContent,
  generateWAMessage,
  areJidsSameUser,
  normalizeMessageContent,
} from "ourin";
import { writeFileSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { join } from "path";
import config, {
  isBanned,
  isOwner,
  isPartner,
  isPremium,
} from "../../config.js";
import {
  isLid,
  isLidConverted,
  lidToJid,
  convertLidArray,
  decodeAndNormalize,
  resolveLidFromParticipants,
  resolveAnyLidToJid,
  getCachedJid,
  cacheParticipantLids,
  cacheLidJid,
  resolveFromSock,
} from "./ourin-lid.js";
import fsc from "fs";
import axios from "axios";
import { getDatabase } from "./ourin-database.js";
import { saluranCtx } from "./ourin-context.js";
import { getAssetBuffer } from "./ourin-asset-manager.js";
import sharp from "sharp";
let _prefixCache = null;
let _prefixCacheTime = 0;
const PREFIX_CACHE_TTL = 30000;

function getCachedPrefixes() {
  const now = Date.now();
  if (_prefixCache && now - _prefixCacheTime < PREFIX_CACHE_TTL)
    return _prefixCache;
  const configPrefix = config.command?.prefix || ".";
  let prefixList = [configPrefix];
  let isNoPrefix = false;
  try {
    const prefixDbPath = join(process.cwd(), "database", "prefix.json");
    if (existsSync(prefixDbPath)) {
      const prefixData = JSON.parse(fsc.readFileSync(prefixDbPath, "utf8"));
      prefixList = [configPrefix, ...(prefixData.prefixes || [])];
      isNoPrefix = prefixData.noprefix === true;
    }
  } catch { }
  _prefixCache = { list: [...new Set(prefixList)], noprefix: isNoPrefix };
  _prefixCacheTime = now;
  return _prefixCache;
}

function invalidatePrefixCache() {
  _prefixCache = null;
  _prefixCacheTime = 0;
}

const _thumbCache = {};
async function getCachedThumb(filePath) {
  if (_thumbCache[filePath] !== undefined) return _thumbCache[filePath];

  // Try AssetManager first if it's a known file name
  const basename = filePath ? filePath.split('/').pop().split('.')[0] : null;
  if (basename) {
    const assetBuf = getAssetBuffer(basename);
    if (assetBuf) return assetBuf;
  }

  try {
    if (filePath && filePath.startsWith("http")) {
      const res = await axios.get(filePath, { responseType: "arraybuffer", timeout: 5000 });
      _thumbCache[filePath] = Buffer.from(res.data);
    } else if (fsc.existsSync(filePath)) {
      _thumbCache[filePath] = fsc.readFileSync(filePath);
    } else {
      _thumbCache[filePath] = null;
    }
  } catch {
    _thumbCache[filePath] = null;
  }
  return _thumbCache[filePath];
}

let _sharpThumbCache = {};
let _sharpInstance = null;
async function _getSharp() {
  if (!_sharpInstance) _sharpInstance = (await import("sharp")).default;
  return _sharpInstance;
}
async function getCachedSharpThumb(filePath, w, h) {
  const key = `${filePath}_${w}x${h}`;
  if (_sharpThumbCache[key] !== undefined) return _sharpThumbCache[key];
  try {
    const raw = await getCachedThumb(filePath);
    if (raw) {
      const sharp = await _getSharp();
      _sharpThumbCache[key] = await sharp(raw).resize(w, h).toBuffer();
    } else {
      _sharpThumbCache[key] = null;
    }
  } catch {
    _sharpThumbCache[key] = null;
  }
  return _sharpThumbCache[key];
}

const _ppCache = new Map();
const PP_CACHE_TTL = 5 * 60 * 1000;

/**
 * @typedef {Object} ContextInfo
 * @property {string} stanzaId - ID pesan yang di-quote
 * @property {string} participant - JID participant yang di-quote
 * @property {Object} quotedMessage - Pesan yang di-quote
 * @property {string[]} mentionedJid - Array JID yang di-mention
 * @property {boolean} isForwarded - Apakah pesan forwarded
 * @property {number} forwardingScore - Skor forwarding
 * @property {Object} externalAdReply - External ad reply (thumbnail)
 */

/**
 * @typedef {Object} SerializedMessage
 * @property {string} id - ID unik pesan
 * @property {string} chat - JID chat/group
 * @property {string} sender - JID pengirim
 * @property {string} senderNumber - Nomor pengirim tanpa @s.whatsapp.net
 * @property {string} pushName - Nama display pengirim
 * @property {boolean} fromMe - Apakah pesan dari bot sendiri
 * @property {boolean} isGroup - Apakah pesan dari group
 * @property {boolean} isOwner - Apakah pengirim adalah owner
 * @property {boolean} isPremium - Apakah pengirim adalah premium user
 * @property {boolean} isBanned - Apakah pengirim dibanned
 * @property {boolean} isBot - Apakah pengirim adalah bot
 * @property {string} type - Tipe pesan
 * @property {string} body - Isi pesan text
 * @property {string} command - Command tanpa prefix
 * @property {string} prefix - Prefix yang digunakan
 * @property {string[]} args - Array argumen
 * @property {string} text - Text setelah command
 * @property {boolean} isCommand - Apakah pesan adalah command
 * @property {boolean} isMedia - Apakah ada media
 * @property {boolean} isImage - Apakah gambar
 * @property {boolean} isVideo - Apakah video
 * @property {boolean} isAudio - Apakah audio
 * @property {boolean} isSticker - Apakah sticker
 * @property {boolean} isDocument - Apakah dokumen
 * @property {boolean} isContact - Apakah kontak
 * @property {boolean} isLocation - Apakah lokasi
 * @property {boolean} isQuoted - Apakah ada pesan yang di-quote
 * @property {Object} quoted - Objek pesan yang di-quote
 * @property {string[]} mentionedJid - Array JID yang di-mention
 * @property {Object} groupMetadata - Metadata group (jika di group)
 * @property {boolean} isAdmin - Apakah pengirim admin group
 * @property {boolean} isBotAdmin - Apakah bot adalah admin
 * @property {Function} reply - Fungsi reply text
 * @property {Function} replyWithMentions - Fungsi reply dengan mentions
 * @property {Function} replyImage - Fungsi reply gambar
 * @property {Function} replyVideo - Fungsi reply video
 * @property {Function} replyAudio - Fungsi reply audio
 * @property {Function} replySticker - Fungsi reply sticker
 * @property {Function} replyDocument - Fungsi reply dokumen
 * @property {Function} replyContact - Fungsi reply kontak
 * @property {Function} replyLocation - Fungsi reply lokasi
 * @property {Function} replyWithQuote - Fungsi reply dengan fake quote
 * @property {Function} react - Fungsi react emoji
 * @property {Function} download - Fungsi download media
 * @property {Function} delete - Fungsi delete pesan
 * @property {Function} forward - Fungsi forward pesan
 */

/**
 * Decode JID menjadi format yang lebih bersih
 * @param {string} jid - JID yang akan di-decode
 * @returns {string|null} JID yang sudah di-decode atau null
 */
function decodeJid(jid) {
  if (!jid) return null;
  if (/:\d+@/gi.test(jid)) {
    const decoded = jidDecode(jid) || {};
    return (
      (decoded.user && decoded.server && decoded.user + "@" + decoded.server) ||
      jid
    );
  }
  return jid;
}

/* Número "local" de un JID: quita servidor (@s.whatsapp.net/@lid) y sufijo
 * de dispositivo (":34"). OJO: hacer solo .replace(/[^0-9]/g,"") sobre el
 * JID completo deja el sufijo del dispositivo (584242773183:34 ->
 * 58424277318334) y hace que el bot nunca se reconozca como admin
 * (bug de los comandos close/open). */
function localNumber(jid) {
  return String(jid || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

/* Número del bot: prueba varias fuentes porque según el fork/estado de la
 * sesión el JID puede estar en sock.user.{id,jid,me.id}, en authState.creds
 * o en sock.creds / user.phone. */
function botNumberFromSock(sock) {
  const u = sock?.user || {};
  const raw =
    u?.id || u?.jid || u?.me?.id || u?.phone ||
    sock?.authState?.creds?.me?.id ||
    sock?.creds?.me?.id ||
    "";
  return localNumber(raw);
}

function getMessageType(message) {
  if (!message) return null;
  const contentType = getContentType(message);
  if (
    contentType === "messageContextInfo" &&
    message.interactiveResponseMessage
  ) {
    return "interactiveResponseMessage";
  }
  return contentType;
}

/**
 * Mendapatkan text/body dari berbagai tipe pesan
 * @param {Object} message - Objek pesan WhatsApp
 * @param {string} type - Tipe pesan
 * @returns {string} Text/body pesan
 */
function getMessageBody(message, type) {
  if (!message || !type) return "";

  const messageContent = message[type];
  if (!messageContent) return "";

  switch (type) {
    case "conversation":
      return message.conversation || "";
    case "extendedTextMessage":
      return messageContent.text || "";
    case "imageMessage":
    case "videoMessage":
    case "documentMessage":
      return messageContent.caption || "";
    case "buttonsResponseMessage":
      return messageContent.selectedButtonId || "";
    case "listResponseMessage":
      return messageContent.singleSelectReply?.selectedRowId || "";
    case "templateButtonReplyMessage":
      return messageContent.selectedId || "";
    case "interactiveResponseMessage":
      try {
        const paramsJson =
          messageContent.nativeFlowResponseMessage?.paramsJson || "{}";
        const parsed = JSON.parse(paramsJson);
        if (parsed.id) return parsed.id;
        if (parsed.response_json) {
          const nested = JSON.parse(parsed.response_json);
          if (nested.id) return nested.id;
          if (nested.selectedRowId) return nested.selectedRowId;
        }
        if (parsed.selectedRowId) return parsed.selectedRowId;
        if (parsed.selected_row_id) return parsed.selected_row_id;
        return "";
      } catch {
        return "";
      }
    case "pollCreationMessage":
      return messageContent.name || "";
    default:
      return "";
  }
}

/**
 * Parse command dan argumen dari body pesan
 * @param {string} body - Body pesan
 * @param {string} prefix - Prefix command
 * @returns {Object} Command info
 */
function parseCommand(body, prefix) {
  const result = {
    isCommand: false,
    command: "",
    prefix: "",
    args: [],
    text: "",
    fullArgs: "",
  };

  if (!body) return result;

  const cached = getCachedPrefixes();
  const prefixList = cached.list;

  for (const p of prefixList) {
    if (body.startsWith(p)) {
      result.isCommand = true;
      result.prefix = p;

      const withoutPrefix = body.slice(p.length).trim();
      const parts = withoutPrefix.split(/\s+/);

      result.command = config.command?.caseSensitive
        ? parts[0]
        : parts[0].toLowerCase();
      result.args = parts.slice(1);
      result.text = withoutPrefix.slice(result.command.length).trim();
      result.fullArgs = result.text;

      return result;
    }
  }

  if (cached.noprefix) {
    const parts = body.trim().split(/\s+/);
    const potentialCommand = config.command?.caseSensitive
      ? parts[0]
      : parts[0].toLowerCase();

    if (
      potentialCommand &&
      /^[a-z0-9_-]+$/i.test(potentialCommand) &&
      potentialCommand.length <= 20
    ) {
      result.isCommand = true;
      result.prefix = "";
      result.command = potentialCommand;
      result.args = parts.slice(1);
      result.text = result.args.join(" ");
      result.fullArgs = body.slice(potentialCommand.length).trim();
    }
  }

  return result;
}

/**
 * Serialize quoted message dengan full context
 * @param {Object} message - Objek pesan utama
 * @param {string} type - Tipe pesan
 * @param {Object} sock - Socket connection
 * @param {Object[]} participants - Group participants for LID resolution
 * @param {Object} originalMsgKey - Original message key containing participantAlt
 * @returns {Promise<Object|null>} Quoted message object
 */
async function serializeQuotedMessage(
  message,
  type,
  sock,
  participants = [],
  originalMsgKey = {},
) {
  if (!message || !type) return null;

  const messageContent = message[type];
  if (!messageContent) return null;

  const contextInfo = messageContent.contextInfo;
  if (!contextInfo || !contextInfo.quotedMessage) return null;

  const rawQuotedMessage = contextInfo.quotedMessage;
  const quotedMessage =
    normalizeMessageContent(rawQuotedMessage) || rawQuotedMessage;
  const quotedType = getMessageType(quotedMessage);
  const isViewOnce = !!(
    rawQuotedMessage?.viewOnceMessage ||
    rawQuotedMessage?.viewOnceMessageV2 ||
    rawQuotedMessage?.viewOnceMessageV2Extension
  );

  let quotedParticipant = contextInfo.participant || "";

  if (isLid(quotedParticipant) || isLidConverted(quotedParticipant)) {
    const cached = getCachedJid(quotedParticipant);
    if (cached && !isLidConverted(cached)) {
      quotedParticipant = cached;
    } else if (participants && participants.length > 0) {
      quotedParticipant = resolveAnyLidToJid(quotedParticipant, participants);
    } else {
      quotedParticipant = lidToJid(quotedParticipant);
    }
  }

  quotedParticipant = decodeJid(quotedParticipant);

  const db = getDatabase();
  const contacts = db.setting("contacts") || {};
  let qPushName = "~ Usuario";
  if (contacts[quotedParticipant]) {
    qPushName = contacts[quotedParticipant].name;
  }

  const quoted = {
    pushName: qPushName,
    key: {
      remoteJid: message.key?.remoteJid || "",
      fromMe: quotedParticipant === decodeJid(sock?.user?.id),
      id: contextInfo.stanzaId || "",
      participant: quotedParticipant,
    },
    id: contextInfo.stanzaId || "",
    sender: quotedParticipant,
    senderNumber: (quotedParticipant || "").replace(/@.+/g, ""),
    type: quotedType,
    body: getMessageBody(quotedMessage, quotedType),
    message: quotedMessage,
    mentionedJid: convertLidArray(contextInfo.mentionedJid || [], participants),
    isMedia: [
      "imageMessage",
      "videoMessage",
      "audioMessage",
      "stickerMessage",
      "documentMessage",
    ].includes(quotedType),
    isImage: quotedType === "imageMessage",
    isVideo: quotedType === "videoMessage",
    isAudio: quotedType === "audioMessage",
    isSticker: quotedType === "stickerMessage",
    isDocument: quotedType === "documentMessage",
    isViewOnce: isViewOnce,
  };

  quoted.download = async (filename = null) => {
    if (!quoted.isMedia) return null;

    const stream = await downloadContentFromMessage(
      quotedMessage[quotedType],
      quotedType.replace("Message", ""),
    );

    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    if (filename) {
      const tempDir = join(process.cwd(), "storage", "temp");
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
      const filepath = join(tempDir, filename);
      writeFileSync(filepath, buffer);
      return filepath;
    }

    return buffer;
  };

  return quoted;
}

/**
 * Membuat context info untuk fake reply
 * @param {string} jid - JID pengirim palsu
 * @param {string} text - Text pesan palsu
 * @param {string} [title] - Title/judul
 * @param {string} [body] - Body tambahan
 * @param {Buffer} [thumbnail] - Thumbnail gambar
 * @returns {Object} Context info object
 */
function createContextInfo(jid, text, title = "", body = "", thumbnail = null) {
  const contextInfo = {
    mentionedJid: [],
    forwardingScore: 999,
    isForwarded: true,
  };

  if (jid && text) {
    contextInfo.quotedMessage = {
      conversation: text,
    };
    contextInfo.participant = jid;
    contextInfo.stanzaId = "OURINAI" + Date.now();
  }

  return contextInfo;
}

/**
 * Serialize pesan WhatsApp menjadi objek lengkap dengan full fitur
 * @param {Object} sock - Socket connection Baileys
 * @param {Object} msg - Raw message dari Baileys event
 * @param {Object} [store] - Store untuk simpan data
 * @returns {Promise<SerializedMessage>} Objek pesan yang sudah di-serialize
 */
async function serialize(sock, msg, store = {}) {
  if (!msg) return null;
  if (!msg.message) return null;
  if (!msg.key) return null;

  const m = {};

  m.rawKey = { ...(msg.key || {}) };
  m.rawParticipant = msg.key?.participant || "";
  m.rawParticipantAlt = msg.key?.participantAlt || "";
  m.rawParticipantPn = msg.participantPn || "";
  m.key = msg.key;
  m.id = msg.key?.id || "";
  m.chat = decodeJid(msg.key?.remoteJid || "");
  m.fromMe = (msg.key && msg.key.fromMe) || false;
  m.isNewsletter = m.chat?.endsWith("@newsletter") || false;
  m.isChannel = m.isNewsletter;
  m.isGroup = m.chat?.endsWith("@g.us") || false;

  const remoteJidAlt = msg.key?.remoteJidAlt
    ? decodeAndNormalize(msg.key.remoteJidAlt)
    : null;
  const participantAlt = msg.key?.participantAlt
    ? decodeAndNormalize(msg.key.participantAlt)
    : null;

  if (
    !m.isGroup &&
    !m.isNewsletter &&
    (isLid(m.chat) || isLidConverted(m.chat))
  ) {
    if (remoteJidAlt && !isLid(remoteJidAlt) && !isLidConverted(remoteJidAlt)) {
      const lidKey = m.chat.endsWith("@lid")
        ? m.chat
        : m.chat.replace("@s.whatsapp.net", "@lid");
      cacheLidJid(lidKey, remoteJidAlt);
      cacheLidJid(m.chat, remoteJidAlt);
      m.chat = remoteJidAlt;
    } else {
      const resolved = resolveAnyLidToJid(m.chat, []);
      if (resolved && !isLidConverted(resolved)) {
        m.chat = resolved;
      } else if (m.fromMe) {
        m.chat = decodeAndNormalize(sock.user.id);
      }
    }
    m.key.remoteJid = m.chat;
  }

  let senderJid;
  if (m.isNewsletter) {
    senderJid = sock.user.id;
  } else if (m.isGroup) {
    // En respuestas de botones/listas algunos clientes mandan el PN real en
    // participantAlt/participantPn y dejan key.participant con un LID o un
    // valor no confiable. Priorizar el PN real evita atribuir el botón a otro
    // número (por ejemplo, al dueño/bot) cuando quien tocó el botón fue otro.
    const pnParticipant = participantAlt && !isLid(participantAlt) && !isLidConverted(participantAlt)
      ? participantAlt
      : msg.participantPn;
    senderJid = pnParticipant || msg.key.participant;
  } else {
    senderJid = m.fromMe ? sock.user.id : m.chat;
  }
  senderJid = m.isGroup ? decodeJid(senderJid) : decodeAndNormalize(senderJid);

  if (!senderJid || isLid(senderJid) || isLidConverted(senderJid)) {
    const altJid = m.isGroup ? participantAlt : remoteJidAlt;
    if (altJid && !isLid(altJid) && !isLidConverted(altJid)) {
      if (senderJid) {
        const lidKey = senderJid.endsWith("@lid")
          ? senderJid
          : senderJid.replace("@s.whatsapp.net", "@lid");
        cacheLidJid(lidKey, altJid);
        cacheLidJid(senderJid, altJid);
      }
      senderJid = altJid;
    } else if (msg.participantPn) {
      senderJid = msg.participantPn;
    } else if (m.isGroup) {
      const sockResolved = await resolveFromSock(senderJid, sock);
      if (
        sockResolved &&
        !isLid(sockResolved) &&
        !isLidConverted(sockResolved)
      ) {
        senderJid = sockResolved;
      } else {
        try {
          const metadata = await sock.groupMetadata(m.chat);
          if (metadata?.participants) {
            cacheParticipantLids(metadata.participants);
          }
          const fallback = msg.key.participant;
          senderJid = resolveAnyLidToJid(
            senderJid || fallback,
            metadata?.participants || [],
          );
        } catch {
          const fallback = msg.key.participant;
          senderJid = resolveAnyLidToJid(senderJid || fallback, []);
        }
      }
    } else {
      const fromCache = resolveAnyLidToJid(senderJid || m.chat, []);
      if (fromCache && !isLidConverted(fromCache)) {
        senderJid = fromCache;
      } else {
        senderJid = await resolveFromSock(senderJid || m.chat, sock);
      }
    }
  }
  m.sender = senderJid;
  m.senderNumber = m.sender ? m.sender.replace(/@.+/g, "") : "";

  if (m.isGroup && m.sender) {
    m.key.participant = m.sender;
  }
  const dbContacts = getDatabase().setting("contacts") || {};
  let finalPushName = msg.pushName || (m.isNewsletter ? "Canal" : "Desconocido");
  if ((finalPushName === "Desconocido" || finalPushName === "~ User") && dbContacts[m.sender]) {
    finalPushName = dbContacts[m.sender].name;
  }
  m.pushName = finalPushName;
  m.isBot = m.fromMe;
  m.isOwner = m.isNewsletter || m.fromMe ? true : isOwner(m.sender);
  m.isPartner = m.isNewsletter || m.fromMe ? true : isPartner(m.sender);
  m.isPremium = m.isNewsletter || m.fromMe ? true : isPremium(m.sender);
  m.isBanned = m.isNewsletter || m.fromMe ? false : isBanned(m.sender);
  let messageData = normalizeMessageContent(msg.message);
  m.isViewOnce = !!(
    msg.message?.viewOnceMessage ||
    msg.message?.viewOnceMessageV2 ||
    msg.message?.viewOnceMessageV2Extension
  );
  m.type = getMessageType(messageData);
  m.message = messageData;
  m.body = getMessageBody(messageData, m.type);
  const parsed = parseCommand(m.body, config.command?.prefix || ".");
  m.isCommand = parsed.isCommand;
  m.command = parsed.command;
  m.prefix = parsed.prefix;
  m.args = parsed.args;
  m.text = parsed.text;
  m.fullArgs = parsed.fullArgs;

  m.isQuoted = false;
  m.quoted = null;
  m._pendingQuotedMessage = { messageData, type: m.type, sock };

  const messageContent = messageData[m.type];
  m.mentionedJid = convertLidArray(
    messageContent?.contextInfo?.mentionedJid || [],
  );

  m.isMedia = [
    "imageMessage",
    "videoMessage",
    "audioMessage",
    "stickerMessage",
    "documentMessage",
  ].includes(m.type);
  m.isImage = m.type === "imageMessage";
  m.isVideo = m.type === "videoMessage";
  m.isAudio = m.type === "audioMessage";
  m.isSticker = m.type === "stickerMessage";
  m.isDocument = m.type === "documentMessage";
  m.isContact =
    m.type === "contactMessage" || m.type === "contactsArrayMessage";
  m.isLocation =
    m.type === "locationMessage" || m.type === "liveLocationMessage";
  m.isPoll = m.type === "pollCreationMessage";

  m.groupMetadata = null;
  m.isAdmin = false;
  m.isBotAdmin = false;
  m.groupName = "";
  m.groupDesc = "";
  m.groupMembers = [];
  m.groupAdmins = [];

  if (m.isGroup) {
    /* Metadata: store (caché) → fetch directo → reintento 1 vez. Si falla,
     * los flags quedan false y el middleware avisará con el detalle. */
    try {
      m.groupMetadata =
        store.groupMetadata?.[m.chat] || (await sock.groupMetadata(m.chat));
      if (!m.groupMetadata?.participants?.length) {
        const retry = await sock.groupMetadata(m.chat).catch(() => null);
        if (retry?.participants?.length) m.groupMetadata = retry;
      }
    } catch (metadataErr) {
      m.groupMetadataError = metadataErr?.message || String(metadataErr);
      m.groupMetadata = null;
    }

    m.groupName = m.groupMetadata?.subject || "";
    m.groupDesc = m.groupMetadata?.desc || "";
    m.groupMembers = m.groupMetadata?.participants || [];
    m.groupAdmins = m.groupMembers
      ?.filter((p) => p.admin)
      .map((p) => p.jid || p.id || p.lid || "");

    const senderNum = localNumber(m.sender);
    const botNum = botNumberFromSock(sock);

    /* isAdmin: el remitente es admin (compara PN, LID y phone_number) */
    m.isAdmin = m.groupMembers.some((p) => {
      if (!p.admin) return false;
      const pJid = p.jid || p.id || "";
      const pLid = p.lid || p.pn || p.phoneNumber || "";
      let pNum = localNumber(pJid);
      const pLidNum = localNumber(pLid);
      if (isLid(pJid) || isLidConverted(pJid)) {
        const resolved = getCachedJid(pJid) || getCachedJid(pLid);
        if (resolved) pNum = localNumber(resolved);
      }
      return (
        pNum === senderNum ||
        pLidNum === senderNum ||
        (pNum.length >= 8 &&
          senderNum.length >= 8 &&
          (pNum.endsWith(senderNum) || senderNum.endsWith(pNum)))
      );
    });

    /* isBotAdmin: el BOT es admin — mismos campos y comparaciones que
     * isAdmin (era el bug: solo comparaba p.jid sin lid/phone_number y el
     * número del bot salía de una única fuente). */
    m.isBotAdmin = m.groupMembers.some((p) => {
      if (!p.admin) return false;
      const pJid = p.jid || p.id || "";
      const pLid = p.lid || p.pn || p.phoneNumber || "";
      let pNum = localNumber(pJid);
      const pLidNum = localNumber(pLid);
      if (isLid(pJid) || isLidConverted(pJid)) {
        const resolved = getCachedJid(pJid) || getCachedJid(pLid);
        if (resolved) pNum = localNumber(resolved);
      }
      return (
        pNum === botNum ||
        pLidNum === botNum ||
        (pNum.length >= 8 &&
          botNum.length >= 8 &&
          (pNum.endsWith(botNum) || botNum.endsWith(pNum)))
      );
    });

    /* resto del procesamiento de grupo (quoted/lid/mentions) en su try */ 
    try {
      cacheParticipantLids(m.groupMembers);

      if (m._pendingQuotedMessage) {
        const { messageData, type, sock } = m._pendingQuotedMessage;
        m.quoted = await serializeQuotedMessage(
          messageData,
          type,
          sock,
          m.groupMembers,
        );
        if (m.quoted) {
          m.isQuoted = true;
        }
        delete m._pendingQuotedMessage;
      }

      if (isLid(m.sender) || isLidConverted(m.sender)) {
        m.sender = resolveAnyLidToJid(m.sender, m.groupMembers);
        m.senderNumber = m.sender ? m.sender.replace(/@.+/g, "") : "";
      }

      if (m.mentionedJid && m.mentionedJid.length > 0) {
        m.mentionedJid = convertLidArray(m.mentionedJid, m.groupMembers);
      }

      if (
        m.quoted &&
        (isLid(m.quoted.sender) || isLidConverted(m.quoted.sender))
      ) {
        m.quoted.sender = resolveAnyLidToJid(m.quoted.sender, m.groupMembers);
        m.quoted.senderNumber = m.quoted.sender
          ? m.quoted.sender.replace(/@.+/g, "")
          : "";
        m.quoted.key.participant = m.quoted.sender;
      }
    } catch (error) { }
  }

  if (m._pendingQuotedMessage) {
    const { messageData, type, sock } = m._pendingQuotedMessage;
    m.quoted = await serializeQuotedMessage(messageData, type, sock, []);
    if (m.quoted) {
      m.isQuoted = true;
    }
    delete m._pendingQuotedMessage;
  }

  m.remoteJid = m.chat;
  m.jid = m.chat;
  m.from = m.chat;
  m.to = m.chat;
  m.botNumber = decodeJid(sock.user?.id)?.replace(/@.+/g, "") || "";
  m.botJid = decodeJid(sock.user?.id) || "";
  m.botName = sock.user?.name || config.bot?.name || "Ourin-AI";
  m.messageId = m.id;
  m.chatId = m.chat;
  m.senderId = m.sender;
  m.isPrivate = !m.isGroup && !m.isNewsletter;
  m.isPrivateChat = m.isPrivate;
  m.isGroupChat = m.isGroup;
  m.mediaType = m.type;
  m.hasMedia = m.isMedia;
  m.mimetype = messageData[m.type]?.mimetype || "";
  m.fileLength = messageData[m.type]?.fileLength || 0;
  m.fileName = messageData[m.type]?.fileName || "";
  m.seconds = messageData[m.type]?.seconds || 0;
  m.ptt = messageData[m.type]?.ptt || false;
  m.isAnimated = messageData[m.type]?.isAnimated || false;
  m.quotedMsg = m.quoted;
  m.quotedBody = m.quoted?.body || "";
  m.quotedSender = m.quoted?.sender || "";
  m.quotedType = m.quoted?.type || "";
  m.hasQuotedMedia = m.quoted?.isMedia || false;
  m.hasQuotedImage = m.quoted?.isImage || false;
  m.hasQuotedVideo = m.quoted?.isVideo || false;
  m.hasQuotedSticker = m.quoted?.isSticker || false;
  m.hasQuotedAudio = m.quoted?.isAudio || false;
  m.hasQuotedDocument = m.quoted?.isDocument || false;
  m.isReply = m.isQuoted;
  m.hasMentions = m.mentionedJid.length > 0;
  m.isForwarded = messageData[m.type]?.contextInfo?.isForwarded || false;
  m.forwardingScore = messageData[m.type]?.contextInfo?.forwardingScore || 0;
  m.expiration = messageData[m.type]?.contextInfo?.expiration || 0;
  m.ephemeralSettingTimestamp = msg.messageTimestamp || 0;
  /**
   * Reply text dengan opsi
   * @param {string} text - Text untuk reply
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.reply = async (text, options = {}) => {
    if (!text && text !== 0) return null;

    const formatUptime = (uptime) => {
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      return `${hours} HORAS ${minutes} MINUTOS`;
    };

    const db = getDatabase();

    let replyVariant = 1;
    try {
      replyVariant =
        db?.setting?.("replyVariant") ||
        db?.db?.data?.settings?.replyVariant ||
        config.ui?.replyVariant ||
        1;
    } catch (e) {
      replyVariant = 1;
    }

    let contextInfo = {
      mentionedJid: options?.mentions || [m?.sender] || [],
      ...options.contextInfo,
    };

    const defaultOptions = { contextInfo };

    let quotedMsg = options.quoted !== false ? msg : undefined;

    if (replyVariant === 2) {
      let troliThumbnail = null;
      quotedMsg = {
        key: {
          participant: `0@s.whatsapp.net`,
          remoteJid: `status@broadcast`,
        },
        message: {
          contactMessage: {
            displayName: `🪸 ${config.bot?.name}`,
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
            sendEphemeral: true,
          },
        },
      };

      return sock.sendMessage(
        m.chat,
        {
          document:
            await getCachedThumb(join(process.cwd(), "package.json")) ||
            fsc.readFileSync(join(process.cwd(), "package.json")),
          mimetype: "image/png",
          fileName: config.bot.name,
          fileLength: 99999999999999,
          jpegThumbnail: await sharp(getAssetBuffer("ourin2"))
            .resize(300, 300)
            .toBuffer(),
          caption: text,
          ...defaultOptions,
          ...options,
        },
        {
          quoted: quotedMsg,
        },
      );
    } else if (replyVariant === 3) {
      const uptime = process.uptime();
      const sss = getAssetBuffer("ourin3");
      return sock.sendMessage(
        m.chat,
        {
          video: getAssetBuffer("ourin-mp4"),
          caption: text,
          gifPlayback: true,
          contextInfo: {
            ...contextInfo,
          },
        },
        {
          quoted: m,
        },
      );
    } else if (replyVariant === 4) {
      const thumbnail = getAssetBuffer("ourin");
      const wideThumb = await getCachedSharpThumb(thumbnail, 1024, 512);
      return sock.sendPreview(
        m.chat,
        {
          caption: `${config.info?.website}\n\n${text}`,
          url: config.info?.website || "https://github.com",
          title: config.bot?.name || "Ourin-AI",
          description:
            `Pengembang: ${config.bot.developer} | Versi: ${config.bot.version}` ||
            "WhatsApp Bot",
          image: thumbnail,
          previewType: 0,
        },
        {
          quoted: m,
          contextInfo: {
            mentionedJid: options?.mentions || [m?.sender] || [],
            isForwarded: true,
            forwardingScore: 9,
            forwardedNewsletterMessageInfo: {
              newsletterJid: config.saluran?.id,
              newsletterName: config.saluran?.name || config.bot?.name || "Ourin-AI",
              serverMessageId: Math.floor(Math.random() * 1000000),
            },
          },
        },
      );
    } else if (replyVariant === 5) {
      const thumbnailBuf = getAssetBuffer("ourin");
      const orderMsg = generateWAMessageFromContent(m.chat, { orderMessage: { orderId: "FAKE-" + Date.now(), thumbnail: thumbnailBuf, itemCount: 1, status: 1, surface: 1, message: text, orderTitle: "Pedido enviado por catálogo", sellerJid: null, token: null, totalAmount1000: "0", totalCurrencyCode: "GTQ", contextInfo: { mentionedJid: options?.mentions || [m?.sender] || [] } } }, { quoted: m, userJid: sock.user.id });
      return sock.relayMessage(m.chat, orderMsg.message, { messageId: orderMsg.key.id });
    } else if (replyVariant === 6) {
      let thumb = getAssetBuffer("ourin2") || getAssetBuffer("ourin");
      try { if (thumb) { const sh = await _getSharp(); thumb = await sh(thumb).resize(300, 300).toBuffer(); } } catch { }
      return sock.sendMessage(m.chat, { document: await getCachedThumb(join(process.cwd(), "package.json")) || fsc.readFileSync(join(process.cwd(), "package.json")), mimetype: "image/png", fileName: config.bot.name, fileLength: 99999999999999, jpegThumbnail: thumb, caption: text, ...defaultOptions, ...options }, { quoted: m });
    } else if (replyVariant === 7) {
      const thumbnailBuf = getAssetBuffer("ourin");
      let thumb = thumbnailBuf;
      try { if (thumb) { const sh = await _getSharp(); thumb = await sh(thumb).resize(300, 300).toBuffer(); } } catch { }
      const msg = generateWAMessageFromContent(m.chat, { viewOnceMessage: { message: { messageContextInfo: {}, interactiveMessage: { header: { hasMediaAttachment: true, locationMessage: { degreesLatitude: 0, degreesLongitude: 0, name: config.bot?.name || "Shadow-BOT-MD", address: "Bot Wa Multi Device", jpegThumbnail: thumb } }, body: { text }, contextInfo: { mentionedJid: options?.mentions || [m?.sender] || [], isForwarded: true, forwardingScore: 9, ...options.contextInfo }, nativeFlowMessage: { buttons: [] } } } } }, { quoted: m, userJid: sock.user.id });
      return sock.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
    } else if (replyVariant === 8) {
      const thumbnailBuf = getAssetBuffer("ourin");
      let thumb = thumbnailBuf;
      try { if (thumb) { const sh = await _getSharp(); thumb = await sh(thumb).resize(300, 300).toBuffer(); } } catch { }
      return await sock.relayMessage(m.chat, { interactiveMessage: { header: { title: config?.bot?.name }, body: { text }, nativeFlowMessage: { buttons: [{ name: "inapp_signup", buttonParamsJson: "{}" }] }, contextInfo: { mentionedJid: options?.mentions || [m?.sender] || [], groupMentions: [], participant: m?.sender, quotedMessage: { orderMessage: { orderId: "8999999999999", thumbnail: thumb, itemCount: 999, status: 1, surface: 1, message: m?.body, orderTitle: "blablabla", sellerJid: "0@s.whatsapp.net", totalAmount1000: 0, totalCurrencyCode: "IDR" } }, remoteJid: m.chat, forwardingScore: 999, isForwarded: true } } }, {});
    } else if (replyVariant === 9) {
      const thumbnailBuf = getAssetBuffer("ourin");
      return await sock.relayMessage(m.chat, { orderMessage: { orderId: "WXX", thumbnail: thumbnailBuf, itemCount: 1, status: "INQUIRY", surface: "CATALOG", message: text, orderTitle: "CONTOL", token: "whyuxD", totalAmount1000: "0", totalCurrencyCode: "IDR", messageVersion: 1, contextInfo: { mentionedJid: options?.mentions || [m?.sender] || [], participant: m?.sender, quotedMessage: m?.message || { conversation: m?.text || "" } } } }, {});
    } else if (replyVariant === 10) {
      return await sock.relayMessage(m.chat, { requestPaymentMessage: { currencyCodeIso4217: "IDR", amount1000: "75000000", requestFrom: m?.sender || "0@s.whatsapp.net", noteMessage: { extendedTextMessage: { text, contextInfo: { mentionedJid: options?.mentions || [m?.sender] || [], participant: m?.sender, quotedMessage: m?.message || { conversation: m?.text || "" } } } } } }, {});
    } else if (replyVariant === 11) {
      const delay = (ms) => new Promise(r => setTimeout(r, ms));
      const chars = [...(config.bot?.name || "Shadow")];
      const sentMsg = await sock.sendMessage(m.chat, { text: "..." }, { quoted: quotedMsg });
      const key = sentMsg.key;
      ;(async () => { try { let iteration = 0; while (iteration < 20) { let cur = ""; for (const char of chars) { cur += char; const th = getAssetBuffer("ourin"); await sock.sendMessage(m.chat, { text: `${config.info?.website}\n\n${text}`, edit: key, linkPreview: { "matched-text": config.info?.website, title: cur, description: "Bot WhatsApp Multidispositivo", jpegThumbnail: th } }); await delay(2000); iteration++; if (iteration >= 20) break; } await delay(1000); } } catch (e) { console.error("V11 Animation error:", e); } })();
      return sentMsg;
    }

    return sock.sendMessage(
      m.chat,
      {
        text,
        ...defaultOptions,
        ...options,
      },
      {
        quoted: quotedMsg,
      },
    );
  };

  /**
   * Reply text dengan mentions otomatis
   * @param {string} text - Text yang berisi @nomor
   * @returns {Promise<Object>} Sent message
   */
  m.replyWithMentions = async (text) => {
    const mentions = [...text.matchAll(/@(\d+)/g)].map(
      (match) => `${match[1]}@s.whatsapp.net`,
    );
    return m.reply(text, { mentions });
  };

  /**
   * Reply gambar
   * @param {Buffer|string} image - Buffer atau URL gambar
   * @param {string} [caption=''] - Caption
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyImage = async (image, caption = "", options = {}) => {
    let buffer = image;
    if (typeof image === "string" && image.startsWith("http")) {
      const response = await axios.get(image, { responseType: "arraybuffer" });
      buffer = Buffer.from(response.data);
    }

    return sock.sendMessage(
      m.chat,
      {
        image: buffer,
        caption,
        contextInfo: options.contextInfo,
        mentions: options.mentions || [],
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * Reply video
   * @param {Buffer|string} video - Buffer atau URL video
   * @param {string} [caption=''] - Caption
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyVideo = async (video, caption = "", options = {}) => {
    let buffer = video;
    if (typeof video === "string" && video.startsWith("http")) {
      const response = await axios.get(video, { responseType: "arraybuffer" });
      buffer = Buffer.from(response.data);
    }

    return sock.sendMessage(
      m.chat,
      {
        video: buffer,
        caption,
        gifPlayback: options.gif || false,
        contextInfo: options.contextInfo,
        mentions: options.mentions || [],
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * Reply audio/voice note
   * @param {Buffer|string} audio - Buffer atau URL audio
   * @param {boolean} [ptt=false] - Voice note atau bukan
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyAudio = async (audio, ptt = false, options = {}) => {
    let buffer = audio;
    if (typeof audio === "string" && audio.startsWith("http")) {
      const response = await axios.get(audio, { responseType: "arraybuffer" });
      buffer = Buffer.from(response.data);
    }

    return sock.sendMessage(
      m.chat,
      {
        audio: buffer,
        ptt,
        mimetype: "audio/mpeg",
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * Reply sticker
   * @param {Buffer|string} sticker - Buffer sticker
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replySticker = async (sticker, options = {}) => {
    let buffer = sticker;
    if (typeof sticker === "string" && sticker.startsWith("http")) {
      const response = await axios.get(sticker, {
        responseType: "arraybuffer",
      });
      buffer = Buffer.from(response.data);
    }

    return sock.sendMessage(
      m.chat,
      {
        sticker: buffer,
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * Reply dokumen
   * @param {Buffer|string} document - Buffer dokumen
   * @param {string} fileName - Nama file
   * @param {string} [mimetype] - MIME type
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyDocument = async (
    document,
    fileName,
    mimetype = "application/octet-stream",
    options = {},
  ) => {
    let buffer = document;
    if (typeof document === "string" && document.startsWith("http")) {
      const response = await axios.get(document, {
        responseType: "arraybuffer",
      });
      buffer = Buffer.from(response.data);
    }

    return sock.sendMessage(
      m.chat,
      {
        document: buffer,
        fileName,
        mimetype,
        caption: options.caption || "",
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * Reply kontak
   * @param {string} number - Nomor kontak
   * @param {string} name - Nama kontak
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyContact = async (number, name, options = {}) => {
    const cleanNumber = number.replace(/[^0-9]/g, "");

    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}
END:VCARD`;

    return sock.sendMessage(
      m.chat,
      {
        contacts: {
          displayName: name,
          contacts: [{ vcard }],
        },
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * Reply lokasi
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyLocation = async (latitude, longitude, options = {}) => {
    return sock.sendMessage(
      m.chat,
      {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
          name: options.name || "",
          address: options.address || "",
        },
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * Reply dengan fake quote
   * @param {string} text - Text untuk reply
   * @param {string} fakeJid - JID palsu
   * @param {string} fakeText - Text palsu di quote
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyWithQuote = async (text, fakeJid, fakeText, options = {}) => {
    const fakeMsg = {
      key: {
        fromMe: false,
        participant: fakeJid,
        remoteJid: m.chat,
      },
      message: {
        conversation: fakeText,
      },
      pushName: options.pushName || "Bot",
    };

    return sock.sendMessage(
      m.chat,
      {
        text,
        contextInfo: {
          ...createContextInfo(
            fakeJid,
            fakeText,
            options.title,
            options.body,
            options.thumbnail,
          ),
          mentionedJid: options.mentions || [],
        },
      },
      {
        quoted: fakeMsg,
      },
    );
  };

  /**
   * Reply dengan thumbnail (external ad reply)
   * @param {string} text - Text untuk reply
   * @param {Object} preview - Preview options
   * @param {string} preview.title - Judul
   * @param {string} [preview.body] - Body
   * @param {Buffer} [preview.thumbnail] - Thumbnail
   * @param {string} [preview.sourceUrl] - URL sumber
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Sent message
   */
  m.replyWithPreview = async (text, preview, options = {}) => {
    const ctx = saluranCtx();
    ctx.mentionedJid = options.mentions || [];
    return sock.sendMessage(
      m.chat,
      {
        text,
        contextInfo: ctx,
      },
      {
        quoted: options.quoted !== false ? msg : undefined,
      },
    );
  };

  /**
   * React ke pesan
   * @param {string} emoji - Emoji untuk react
   * @returns {Promise<Object>} Result
   */
  m.react = async (emoji) => {
    try {
      return await sock.sendMessage(m.chat, {
        react: {
          text: emoji,
          key: msg.key,
        },
      });
    } catch (e) {
      return null;
    }
  };

  /**
   * Download media dari pesan ini
   * @param {string} [filename] - Nama file untuk disimpan
   * @returns {Promise<Buffer|string>} Buffer atau path file
   */
  m.download = async (filename = null) => {
    if (!m.isMedia) return null;

    const stream = await downloadContentFromMessage(
      messageData[m.type],
      m.type.replace("Message", ""),
    );

    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }

    if (filename) {
      const tempDir = join(process.cwd(), "storage", "temp");
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
      const filepath = join(tempDir, filename);
      writeFileSync(filepath, buffer);
      return filepath;
    }

    return buffer;
  };

  /**
   * Delete pesan ini
   * @returns {Promise<Object>} Result
   */
  m.delete = async () => {
    return sock.sendMessage(m.chat, {
      delete: msg.key,
    });
  };

  /**
   * Forward pesan ke JID lain
   * @param {string} jid - JID tujuan
   * @param {boolean} [forceForward=false] - Force forward label
   * @returns {Promise<Object>} Result
   */
  m.forward = async (jid, forceForward = false) => {
    return sock.sendMessage(jid, {
      forward: msg,
      force: forceForward,
    });
  };

  /**
   * Copy pesan ke JID lain
   * @param {string} jid - JID tujuan
   * @param {Object} [options={}] - Opsi tambahan
   * @returns {Promise<Object>} Result
   */
  m.copy = async (jid, options = {}) => {
    const content = {};

    if (m.isImage) {
      content.image = await m.download();
      content.caption = m.body;
    } else if (m.isVideo) {
      content.video = await m.download();
      content.caption = m.body;
    } else if (m.isAudio) {
      content.audio = await m.download();
    } else if (m.isSticker) {
      content.sticker = await m.download();
    } else if (m.isDocument) {
      content.document = await m.download();
      content.fileName = messageData[m.type]?.fileName || "file";
      content.mimetype = messageData[m.type]?.mimetype;
    } else {
      content.text = m.body;
    }

    return sock.sendMessage(jid, content, options);
  };

  m.timestamp = msg.messageTimestamp;
  m.raw = msg;
  return m;
}

/**
 * Get number from JID
 * @param {string} jid - JID
 * @returns {string} Number
 */
function getNumber(jid) {
  if (!jid) return "";
  return jid.replace(/@.+/g, "");
}

/**
 * Create JID from number
 * @param {string} number - Nomor telepon
 * @returns {string} JID
 */
function createJid(number) {
  if (!number) return "";
  const cleaned = number.replace(/[^0-9]/g, "");
  return cleaned + "@s.whatsapp.net";
}

export {
  serialize,
  decodeJid,
  getMessageType,
  getMessageBody,
  parseCommand,
  serializeQuotedMessage,
  createContextInfo,
  getNumber,
  createJid,
  getCachedThumb,
  getCachedSharpThumb,
  invalidatePrefixCache,
};
