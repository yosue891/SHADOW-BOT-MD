import { generateWAMessageFromContent, proto } from "ourin";
import fs from "fs";
import path from "path";
import { saluranCtx } from "./ourin-context.js";
import { fetchBuffer, getMimeType } from "./ourin-utils.js";
/**
 * @typedef {Object} MessageOptions
 * @property {Object} [quoted] - Pesan untuk di-quote
 * @property {boolean} [ephemeral] - Pesan ephemeral
 * @property {string[]} [mentions] - Array JID untuk mention
 */

/**
 * @typedef {Object} ButtonData
 * @property {string} text - Text button
 * @property {string} id - ID button
 */

/**
 * @typedef {Object} ListSection
 * @property {string} title - Judul section
 * @property {Array<{title: string, rowId: string, description?: string}>} rows - Array rows
 */

/**
 * Kirim pesan text
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {string} text - Text untuk dikirim
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 * @example
 * await sendText(sock, jid, 'Hello World!', { quoted: m });
 */
async function sendText(sock, jid, text, options = {}) {
  return sock.sendMessage(
    jid,
    {
      text,
      mentions: options.mentions || [],
    },
    {
      quoted: options.quoted,
      ephemeralExpiration: options.ephemeral ? 86400 : undefined,
    },
  );
}

/**
 * Kirim pesan dengan reply
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {string} text - Text untuk dikirim
 * @param {Object} quoted - Pesan yang di-reply
 * @returns {Promise<Object>} Sent message
 */
async function sendReply(sock, jid, text, quoted) {
  return sendText(sock, jid, text, { quoted });
}

/**
 * Kirim gambar
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {Buffer|string} image - Buffer gambar atau URL
 * @param {string} [caption=''] - Caption gambar
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 * @example
 * await sendImage(sock, jid, imageBuffer, 'Caption here', { quoted: m });
 * await sendImage(sock, jid, 'https://example.com/image.png');
 */
async function sendImage(sock, jid, image, caption = "", options = {}) {
  let buffer;

  if (typeof image === "string") {
    if (image.startsWith("http")) {
      buffer = await fetchBuffer(image);
    } else if (fs.existsSync(image)) {
      buffer = fs.readFileSync(image);
    } else {
      throw new Error("Fuente de imagen no válida");
    }
  } else {
    buffer = image;
  }

  return sock.sendMessage(
    jid,
    {
      image: buffer,
      caption,
      mentions: options.mentions || [],
    },
    {
      quoted: options.quoted,
      ephemeralExpiration: options.ephemeral ? 86400 : undefined,
    },
  );
}

/**
 * Kirim video
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {Buffer|string} video - Buffer video atau URL
 * @param {string} [caption=''] - Caption video
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendVideo(sock, jid, video, caption = "", options = {}) {
  let buffer;

  if (typeof video === "string") {
    if (video.startsWith("http")) {
      buffer = await fetchBuffer(video);
    } else if (fs.existsSync(video)) {
      buffer = fs.readFileSync(video);
    } else {
      throw new Error("Fuente de video no válida");
    }
  } else {
    buffer = video;
  }

  return sock.sendMessage(
    jid,
    {
      video: buffer,
      caption,
      mentions: options.mentions || [],
    },
    {
      quoted: options.quoted,
      ephemeralExpiration: options.ephemeral ? 86400 : undefined,
    },
  );
}

/**
 * Kirim audio
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {Buffer|string} audio - Buffer audio atau URL
 * @param {boolean} [ptt=false] - Apakah sebagai voice note
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendAudio(sock, jid, audio, ptt = false, options = {}) {
  let buffer;

  if (typeof audio === "string") {
    if (audio.startsWith("http")) {
      buffer = await fetchBuffer(audio);
    } else if (fs.existsSync(audio)) {
      buffer = fs.readFileSync(audio);
    } else {
      throw new Error("Fuente de audio no válida");
    }
  } else {
    buffer = audio;
  }

  return sock.sendMessage(
    jid,
    {
      audio: buffer,
      ptt,
      mimetype: "audio/mpeg",
    },
    {
      quoted: options.quoted,
    },
  );
}

/**
 * Kirim sticker
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {Buffer|string} sticker - Buffer sticker atau URL
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendSticker(sock, jid, sticker, options = {}) {
  let buffer;

  if (typeof sticker === "string") {
    if (sticker.startsWith("http")) {
      buffer = await fetchBuffer(sticker);
    } else if (fs.existsSync(sticker)) {
      buffer = fs.readFileSync(sticker);
    } else {
      throw new Error("Fuente de sticker no válida");
    }
  } else {
    buffer = sticker;
  }

  return sock.sendMessage(
    jid,
    {
      sticker: buffer,
    },
    {
      quoted: options.quoted,
    },
  );
}

/**
 * Kirim dokumen/file
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {Buffer|string} file - Buffer file atau path
 * @param {string} fileName - Nama file
 * @param {string} [mimetype] - MIME type file
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendDocument(sock, jid, file, fileName, mimetype, options = {}) {
  let buffer;

  if (typeof file === "string") {
    if (file.startsWith("http")) {
      buffer = await fetchBuffer(file);
    } else if (fs.existsSync(file)) {
      buffer = fs.readFileSync(file);
    } else {
      throw new Error("Fuente de archivo no válida");
    }
  } else {
    buffer = file;
  }

  const mime = mimetype || getMimeType(buffer);

  return sock.sendMessage(
    jid,
    {
      document: buffer,
      fileName,
      mimetype: mime,
      caption: options.caption || "",
    },
    {
      quoted: options.quoted,
    },
  );
}

/**
 * Kirim kontak
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {string} number - Nomor kontak
 * @param {string} name - Nama kontak
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendContact(sock, jid, number, name, options = {}) {
  const cleanNumber = number.replace(/[^0-9]/g, "");

  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL;type=CELL;type=VOICE;waid=${cleanNumber}:+${cleanNumber}
END:VCARD`;

  return sock.sendMessage(
    jid,
    {
      contacts: {
        displayName: name,
        contacts: [{ vcard }],
      },
    },
    {
      quoted: options.quoted,
    },
  );
}

/**
 * Kirim lokasi
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {string} [name=''] - Nama lokasi
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendLocation(
  sock,
  jid,
  latitude,
  longitude,
  name = "",
  options = {},
) {
  return sock.sendMessage(
    jid,
    {
      location: {
        degreesLatitude: latitude,
        degreesLongitude: longitude,
        name,
      },
    },
    {
      quoted: options.quoted,
    },
  );
}

/**
 * Kirim react emoji
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID chat
 * @param {string} emoji - Emoji untuk react
 * @param {Object} key - Message key untuk react
 * @returns {Promise<Object>} Result
 */
async function sendReact(sock, jid, emoji, key) {
  return sock.sendMessage(jid, {
    react: {
      text: emoji,
      key,
    },
  });
}

/**
 * Kirim pesan dengan typing indicator
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {string} text - Text untuk dikirim
 * @param {number} [delay=1000] - Delay typing dalam ms
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendWithTyping(sock, jid, text, delay = 1000, options = {}) {
  await sock.sendPresenceUpdate("composing", jid);
  await new Promise((r) => setTimeout(r, delay));
  await sock.sendPresenceUpdate("paused", jid);
  return sendText(sock, jid, text, options);
}

/**
 * Kirim pesan ke multiple JID
 * @param {Object} sock - Socket connection
 * @param {string[]} jids - Array JID tujuan
 * @param {Object} content - Content pesan
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object[]>} Array sent messages
 */
async function sendToMultiple(sock, jids, content, options = {}) {
  const results = [];

  for (const jid of jids) {
    try {
      const result = await sock.sendMessage(jid, content, options);
      results.push({ jid, success: true, result });
    } catch (error) {
      results.push({ jid, success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Forward pesan ke JID lain
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {Object} message - Pesan untuk di-forward
 * @param {boolean} [forceForward=false] - Force forward dengan label
 * @returns {Promise<Object>} Forwarded message
 */
async function forwardMessage(sock, jid, message, forceForward = false) {
  return sock.sendMessage(jid, {
    forward: message,
    force: forceForward,
  });
}

/**
 * Delete pesan
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID chat
 * @param {Object} key - Message key
 * @returns {Promise<Object>} Result
 */
async function deleteMessage(sock, jid, key) {
  return sock.sendMessage(jid, {
    delete: key,
  });
}

/**
 * Membuat quoted message dummy untuk fake reply
 * @param {string} jid - JID pengirim
 * @param {string} text - Text pesan
 * @param {string} [pushName='Bot'] - Nama pengirim
 * @returns {Object} Dummy quoted message
 */
function createQuotedDummy(jid, text, pushName = "Bot") {
  return {
    key: {
      fromMe: false,
      participant: jid,
      remoteJid: jid,
    },
    message: {
      conversation: text,
    },
    pushName,
  };
}

/**
 * Kirim pesan dengan thumbnail link preview
 * @param {Object} sock - Socket connection
 * @param {string} jid - JID tujuan
 * @param {string} text - Text pesan
 * @param {Object} preview - Preview data
 * @param {string} preview.title - Judul preview
 * @param {string} preview.body - Body preview
 * @param {string} text - Text menu
 * @param {Buffer|string} [image] - Gambar header (opsional)
 * @param {MessageOptions} [options={}] - Opsi pesan
 * @returns {Promise<Object>} Sent message
 */
async function sendWithPreview(sock, jid, text, preview, options = {}) {
  const ctx = saluranCtx();
  ctx.mentionedJid = options.mentions || [];
  return sock.sendMessage(
    jid,
    {
      text,
      contextInfo: ctx,
    },
    {
      quoted: options.quoted,
    },
  );
}

async function sendMenu(sock, jid, text, image = null, options = {}) {
  if (image) {
    return sendImage(sock, jid, image, text, options);
  }
  return sendText(sock, jid, text, options);
}

export {
  sendText,
  sendReply,
  sendImage,
  sendVideo,
  sendAudio,
  sendSticker,
  sendDocument,
  sendContact,
  sendLocation,
  sendReact,
  sendWithTyping,
  sendToMultiple,
  forwardMessage,
  deleteMessage,
  createQuotedDummy,
  sendWithPreview,
  sendMenu,
};
