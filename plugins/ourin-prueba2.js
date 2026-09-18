import crypto from "node:crypto";
import { prepareWAMessageMedia, generateWAMessageFromContent } from "ourin";
import te from "../../src/lib/ourin-error.js";

const IMAGE_URL = "https://cdn.ornzora.eu.cc/a6a1e8f4-b83d-4694-9bba-0f22a58bfd4f-FIORA.jpg";
const VIDEO_URL = "https://cdn.ornzora.eu.cc/ed7ebb66-9bf4-44b6-858a-b6b7405e53c5-FIORA.mp4";

const pluginConfig = {
  name: "prueba2",
  alias: ["fotolive"],
  category: "tools",
  description: "Enviar foto live emparejando una imagen con un video",
  usage: ".prueba2",
  example: ".prueba2",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

function buildChildMessageId(parentId = "") {
  return `${parentId || Date.now().toString(36)}_LIVE_${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

async function sendFotoLive(sock, chatId, imageUrl, videoUrl, quoted = null) {
  if (!sock?.waUploadToServer) {
    throw new Error("waUploadToServer no está disponible en este socket");
  }

  const image = await prepareWAMessageMedia(
    { image: { url: imageUrl } },
    { upload: sock.waUploadToServer },
  );

  const video = await prepareWAMessageMedia(
    { video: { url: videoUrl } },
    { upload: sock.waUploadToServer },
  );

  if (!image?.imageMessage) throw new Error("No se pudo preparar la imagen");
  if (!video?.videoMessage) throw new Error("No se pudo preparar el video");

  const parentMsg = generateWAMessageFromContent(
    chatId,
    {
      messageContextInfo: {
        messageSecret: crypto.randomBytes(32),
      },
      imageMessage: {
        ...image.imageMessage,
        contextInfo: {
          ...(image.imageMessage.contextInfo || {}),
          pairedMediaType: 5,
          statusSourceType: 0,
        },
      },
    },
    { quoted },
  );

  await sock.relayMessage(chatId, parentMsg.message, {
    messageId: parentMsg.key.id,
  });

  // Motion Photo / Foto Live: el video asociado debe viajar dentro de
  // associatedChildMessage, mientras que la asociación va en el messageContextInfo
  // del mensaje contenedor. Si messageAssociation queda dentro del hijo, algunos
  // clientes solo muestran la imagen y nunca habilitan la reproducción live.
  const childMsg = generateWAMessageFromContent(
    chatId,
    {
      associatedChildMessage: {
        message: {
          videoMessage: {
            ...video.videoMessage,
            contextInfo: {
              ...(video.videoMessage.contextInfo || {}),
              pairedMediaType: 6,
              statusSourceType: 1,
            },
          },
        },
      },
      messageContextInfo: {
        messageSecret: crypto.randomBytes(32),
        messageAssociation: {
          associationType: 12,
          parentMessageKey: parentMsg.key,
        },
      },
    },
    { userJid: sock.user?.jid || sock.user?.id },
  );

  await sock.relayMessage(chatId, childMsg.message, {
    messageId: childMsg.key.id,
  });

  return parentMsg.key;
}

async function sendFallback(sock, m) {
  await sock.sendMessage(
    m.chat,
    {
      image: { url: IMAGE_URL },
      caption: "📸 *Foto Live*\n\n> Tu WhatsApp no renderizó el formato live, envío la imagen y el video por separado.",
    },
    { quoted: m },
  );

  return sock.sendMessage(
    m.chat,
    {
      video: { url: VIDEO_URL },
      caption: "🎬 *Video Live*",
      mimetype: "video/mp4",
    },
    { quoted: m },
  );
}

async function handler(m, { sock }) {
  await m.react("🕕");

  try {
    await sendFotoLive(sock, m.chat, IMAGE_URL, VIDEO_URL, m);
    await m.react("✅");
  } catch (error) {
    console.error("[prueba2/fotolive] error:", error?.message || error);

    try {
      await sendFallback(sock, m);
      await m.react("✅");
    } catch (fallbackError) {
      console.error("[prueba2/fotolive] fallback error:", fallbackError?.message || fallbackError);
      await m.react("☢");
      return m.reply(te(m.prefix, m.command, m.pushName));
    }
  }
}

export { pluginConfig as config, handler };
