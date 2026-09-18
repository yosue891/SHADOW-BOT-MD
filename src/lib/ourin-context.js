import fs from "fs";
import path from "path";
import config from "../../config.js";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import axios from "axios";
import { getAssetBuffer } from "./ourin-asset-manager.js";

let gameThumbBuffer = null;
let rpgThumbBuffer = null;
let winnerThumbBuffer = null;

  const keys = [
    ["ourin-games", (buf) => { gameThumbBuffer = buf; }],
    ["ourin-rpg", (buf) => { rpgThumbBuffer = buf; }],
    ["ourin-winner", (buf) => { winnerThumbBuffer = buf; }],
  ];
  for (const [key, setter] of keys) {
    const buf = getAssetBuffer(key);
    if (buf) setter(buf);
  }

const FAST_ANSWER_PRAISES = [
  "⚡ ¡Súper rápido! ¡Eres un genio!",
  "🚀 ¡Súper veloz! ¡Mente brillante!",
  "🔥 ¡Vaya monstruo! ¡Respuesta relámpago!",
  "💫 ¡Increíble! ¡Eres The Flash!",
  "🎯 ¡Alta precisión! ¡Directo al blanco!",
  "⭐ ¡Estrella! ¡Reflejos de dios!",
  "🏆 ¡Leyenda! ¡Velocidad máxima!",
  "💎 ¡Jugador premium! ¡No tiene rival!",
  "🦅 ¡Afilado como un águila!",
  "🧠 ¡Cerebrote! ¡IQ alto detectado!",
];

const FAST_ANSWER_THRESHOLD = 4000;
const FAST_ANSWER_BONUS = {
  exp: 50,
  balance: 500,
  limit: 1,
};

function getRandomPraise() {
  return FAST_ANSWER_PRAISES[
    Math.floor(Math.random() * FAST_ANSWER_PRAISES.length)
  ];
}

function _saluranCtx() {
  const saluranId = config.saluran?.id || "120363403739366547@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Ourin-AI";
  return {
    forwardingScore: 9,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };
}

function getGameContextInfo() {
  return _saluranCtx();
}

function getWinnerContextInfo() {
  return _saluranCtx();
}

function getRpgContextInfo(title, body) {
  const base = _saluranCtx();
  if (title || body) {
    base.externalAdReply = {
      title: title || config.bot?.name || "Ourin RPG",
      body: body || "",
      sourceUrl: config.saluran?.link || "",
      mediaType: 1,
      renderLargerThumbnail: false,
      thumbnail: rpgThumbBuffer,
    };
  }
  return base;
}

async function sendGamePreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "🎮 OURIN GAMES",
      description: body || "¡Diviértete jugando!",
      jpegThumbnail: gameThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

async function sendWinnerPreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "🏆 WINNER!",
      description: body || "¡Felicitaciones, ganaste!",
      jpegThumbnail: winnerThumbBuffer || gameThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

async function sendRpgPreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "⚔️ OURIN RPG",
      description: body || "¡La aventura te espera!",
      jpegThumbnail: rpgThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

async function sendToolsPreview(sock, jid, text, title, body, options) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "🛠️ OURIN TOOLS",
      description: body || "Utilidades y herramientas",
      jpegThumbnail: gameThumbBuffer,
      previewType: 0,
    },
    { contextInfo: _saluranCtx(), ...options },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

function saluranCtx() {
  return _saluranCtx();
}

function checkFastAnswer(session) {
  if (!session?.startTime) return { isFast: false };

  const elapsed = Date.now() - session.startTime;

  if (elapsed <= FAST_ANSWER_THRESHOLD) {
    return {
      isFast: true,
      elapsed: elapsed,
      praise: getRandomPraise(),
      bonus: FAST_ANSWER_BONUS,
    };
  }

  return { isFast: false, elapsed: elapsed };
}

function createFakeQuoted(botName = "Ourin-AI", verified = true) {
  return {
    key: {
      fromMe: false,
      participant: "0@s.whatsapp.net",
      remoteJid: "status@broadcast",
    },
    message: {
      contactMessage: {
        displayName: verified ? `✅ ${botName}` : botName,
        vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:${verified ? "Bot Verificado" : "Bot"}\nEND:VCARD`,
      },
    },
  };
}

export {
  getGameContextInfo,
  getWinnerContextInfo,
  getRpgContextInfo,
  sendGamePreview,
  sendWinnerPreview,
  sendRpgPreview,
  sendToolsPreview,
  saluranCtx,
  createFakeQuoted,
  checkFastAnswer,
  getRandomPraise,
  gameThumbBuffer,
  rpgThumbBuffer,
  winnerThumbBuffer,
  FAST_ANSWER_THRESHOLD,
  FAST_ANSWER_BONUS,
  FAST_ANSWER_PRAISES,
};
