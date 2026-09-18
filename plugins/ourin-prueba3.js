import { delay } from "../src/lib/ourin-utils.js";
import te from "../src/lib/ourin-error.js";

const pluginConfig = {
  name: "prueba3",
  alias: ["dmsg"],
  category: "tools",
  description: "Eliminar un mensaje citado usando el método dmsg",
  usage: ".prueba3 <responde a un mensaje>",
  example: ".prueba3",
  isOwner: true,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 3,
  energi: 0,
  isEnabled: true,
};

function getQuotedKey(m = {}) {
  const quoted = m.quoted || m.quotedMsg || null;
  const id = quoted?.id || quoted?.key?.id || "";
  const participant = quoted?.sender || quoted?.key?.participant || "";

  if (!id) return null;

  return {
    remoteJid: m.chat,
    jid: m.chat,
    id,
    fromMe: false,
    participant,
  };
}

async function safeDelete(sock, chatId, key) {
  try {
    await sock.sendMessage(chatId, { delete: key });
    return true;
  } catch {
    return false;
  }
}

async function handler(m, { sock }) {
  const targetKey = getQuotedKey(m);

  if (!targetKey) {
    return m.reply(
      `⚠️ *ᴜsᴏ ᴄᴏʀʀᴇᴄᴛᴏ*\n\n` +
        `> Responde al mensaje que quieres procesar y usa:\n` +
        `> \`${m.prefix || "."}prueba3\``,
    );
  }

  await m.react("🕕").catch(() => {});

  try {
    const chatId = m.chat;
    const stanzaId = targetKey.id;

    const tempId = await sock.relayMessage(
      chatId,
      {
        groupStatusMessageV2: {
          message: {
            extendedTextMessage: {
              text: "",
              contextInfo: {
                isGroupStatus: true,
              },
            },
          },
        },
      },
      {},
    );

    const tempId2 = await sock.relayMessage(
      chatId,
      {
        protocolMessage: {
          key: {
            jid: chatId,
            remoteJid: chatId,
            fromMe: true,
            id: tempId,
          },
          type: 14,
          editedMessage: {
            extendedTextMessage: {
              text: "\0",
              contextInfo: {
                isGroupStatus: false,
              },
            },
          },
        },
      },
      {
        messageId: stanzaId,
      },
    );

    await delay(100);

    await Promise.allSettled([
      safeDelete(sock, chatId, {
        remoteJid: chatId,
        id: tempId,
        fromMe: true,
      }),
      safeDelete(sock, chatId, {
        remoteJid: chatId,
        id: tempId2,
        fromMe: true,
      }),
      safeDelete(sock, chatId, targetKey),
    ]);

    await m.react("✅").catch(() => {});
  } catch (error) {
    console.error("[prueba3/dmsg]", error);
    await m.react("☢").catch(() => {});
    return m.reply(
      `❌ *ᴇʀʀᴏʀ ᴅᴍsɢ*\n\n` +
        `> ${error?.message || te(m.prefix, m.command, m.pushName)}`,
    );
  }
}

export { pluginConfig as config, handler };
