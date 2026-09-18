import axios from "axios";
import sharp from "sharp";
import te from "../src/lib/ourin-error.js";
import { getAssetBuffer } from "../src/lib/ourin-asset-manager.js";

const pluginConfig = {
  name: "prueba4",
  alias: ["albumad", "adalbum", "albumprueba"],
  category: "tools",
  description: "Enviar un saludo automático con anuncio de Facebook",
  usage: ".prueba4",
  example: ".prueba4",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

const ALBUM_IMAGE_URL = "https://u.pone.rs/qxyejmcy.jpg";
const SOURCE_URL = "https://api.gianpool.dev";
let adThumbnailCache = null;


function cleanNumber(value = "") {
  return String(value || "")
    .split("@")[0]
    .split(":")[0]
    .replace(/\D/g, "");
}

function sameNumber(a = "", b = "") {
  const one = cleanNumber(a);
  const two = cleanNumber(b);
  if (!one || !two) return false;
  return one === two || (one.length >= 8 && two.endsWith(one)) || (two.length >= 8 && one.endsWith(two));
}

function isButtonResponse(m = {}) {
  return [
    "buttonsResponseMessage",
    "interactiveResponseMessage",
    "listResponseMessage",
    "templateButtonReplyMessage",
  ].includes(m.type);
}

function isFreshSaludarButton(m = {}) {
  const payload = `${m.body || ""} ${m.text || ""} ${(m.args || []).join(" ")}`;
  return /(?:^|\s)--from-button(?:\s|$)/i.test(payload);
}

function validateSaludarButton(m = {}) {
  const senderNumber = cleanNumber(m.sender || m.senderNumber || "");

  // Si viene de un botón viejo que solo mandaba `.prueba4`, no se procesa.
  // Así evitamos que WhatsApp/Baileys lo atribuya a un LID/número incorrecto.
  if (isButtonResponse(m) && !isFreshSaludarButton(m)) {
    return {
      ok: false,
      reason: "old-button",
      senderNumber,
    };
  }

  return {
    ok: true,
    reason: "ok",
    senderNumber,
  };
}

function getSenderInfo(m = {}) {
  const jid = m.sender || "0@s.whatsapp.net";
  const number = cleanNumber(jid) || "0";
  const name = m.pushName || number || "Usuario";
  return { jid, number, name, waUrl: `https://wa.me/${number}` };
}

async function getAdThumbnail() {
  if (adThumbnailCache) return adThumbnailCache;

  try {
    const { data } = await axios.get(ALBUM_IMAGE_URL, {
      responseType: "arraybuffer",
      timeout: 20000,
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    adThumbnailCache = await sharp(Buffer.from(data))
      .resize(300, 300, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();
    return adThumbnailCache;
  } catch (error) {
    console.error("[prueba4] ad thumbnail download failed:", error?.message || error);
    adThumbnailCache = getAssetBuffer("ourin") || getAssetBuffer("ourin2") || undefined;
    return adThumbnailCache;
  }
}

function fakeUserQuoted(m = {}) {
  const sender = getSenderInfo(m);
  return {
    key: {
      remoteJid: m.chat || "status@broadcast",
      fromMe: false,
      id: `SALUDAR_${sender.number}_${Date.now()}`,
      participant: sender.jid,
    },
    message: {
      contactMessage: {
        displayName: sender.name,
        vcard:
          `BEGIN:VCARD\n` +
          `VERSION:3.0\n` +
          `FN:${sender.name}\n` +
          `ORG:Usuario que presionó saludar;\n` +
          `TEL;type=CELL;type=VOICE;waid=${sender.number}:+${sender.number}\n` +
          `END:VCARD`,
      },
    },
  };
}

async function buildExternalAdReply(m = {}) {
  const thumbnail = await getAdThumbnail();
  const sender = getSenderInfo(m);

  return {
    title: "Ad",
    body: "texto2",
    // En WhatsApp/Baileys mediaType debe ser número: 1 = image.
    mediaType: 1,
    thumbnailUrl: ALBUM_IMAGE_URL,
    ...(thumbnail ? { thumbnail } : {}),
    mediaUrl: ALBUM_IMAGE_URL,
    sourceType: "ad",
    // Estos campos conservan el formato CTWA/Facebook que hace aparecer
    // "Anuncio de Facebook / Ver detalles". Si se cambian por números random
    // algunos clientes dejan de renderizar el saludo automático.
    sourceId: Date.now().toString(),
    sourceUrl: sender.waUrl || SOURCE_URL,
    containsAutoReply: true,
    renderLargerThumbnail: true,
    showAdAttribution: true,
    ctwaClid: "7zcbGkilcScr358rECmWaqIEBIRpsJK9SMsSCPZL1NY=",
    ref: "0cc46e75431a56cf",
    clickToWhatsappCall: true,
    adContextPreviewDismissed: false,
    sourceApp: "facebook",
    automatedGreetingMessageShown: true,
    greetingMessageBody: "texto1",
    originalImageUrl: ALBUM_IMAGE_URL,
    // Guardamos el usuario que presionó el botón como payload/contexto.
    // No cambia el remitente real de WhatsApp, pero el saludo queda asociado
    // a su contacto/wa.me en el preview y en la cita falsa.
    ctaPayload: JSON.stringify({
      pressedBy: sender.number,
      pressedName: sender.name,
      waUrl: sender.waUrl,
    }),
  };
}

async function sendAutoGreetingAd(sock, m) {
  const sender = getSenderInfo(m);
  return sock.sendMessage(
    m.chat,
    {
      text: "texto1",
      mentions: [sender.jid],
      contextInfo: {
        mentionedJid: [sender.jid],
        externalAdReply: await buildExternalAdReply(m),
      },
    },
    { quoted: fakeUserQuoted(m) },
  );
}

async function handler(m, { sock }) {
  const gate = validateSaludarButton(m);
  if (!gate.ok) {
    console.log(
      `[prueba4] saludar ignored: ${gate.reason} sender=${gate.senderNumber || "unknown"}`,
    );
    await m.react("🚫").catch(() => {});
    return;
  }

  const sender = getSenderInfo(m);
  console.log(
    `[prueba4] saludar sender=${sender.number} raw=${m.rawParticipant || "-"} alt=${m.rawParticipantAlt || "-"} pn=${m.rawParticipantPn || "-"}`,
  );

  await m.react("🕕");

  try {
    // Solo se envía este mensaje: sin álbum, sin imágenes aparte y sin caption
    // "Texto/Footer". El thumbnail queda únicamente dentro del preview del anuncio.
    await sendAutoGreetingAd(sock, m);
    await m.react("✅");
  } catch (error) {
    console.error("[prueba4] auto greeting ad failed:", error?.message || error);
    await m.react("☢");
    return m.reply(te(m.prefix, m.command, m.pushName));
  }
}

export { pluginConfig as config, handler };
