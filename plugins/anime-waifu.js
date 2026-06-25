import axios from 'axios';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const newsletterJid  = '120363403739366547@newsletter';
const newsletterName = '👑 SHADOW-BOT-MD uwu👑 ';

const packname = '👑 SHADOW-BOT-MD 👑';
const dev = 'Creado por Yosue';
const redes = 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O';
const icons = 'https://files.catbox.moe/6bgv7s.jpg';

let handler = async (m, { conn, usedPrefix, command }) => {
  try {
    const contextInfo = {
      mentionedJid: [m.sender],
      isForwarded: true,
      forwardingScore: 999,
      forwardedNewsletterMessageInfo: {
        newsletterJid,
        newsletterName,
        serverMessageId: -1
      },
      externalAdReply: {
        title: packname,
        body: dev,
        thumbnailUrl: icons,
        sourceUrl: redes,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    };

    await m.react('❤️');
    await conn.reply(m.chat, '🌌 *Buscando una waifu en alta definición...*', m, { contextInfo });

    const res = await axios.get('https://api.waifu.im/search?is_nsfw=false');
    
    if (!res.data?.images?.[0]?.url) throw new Error('No se pudo obtener la waifu.');

    let url = res.data.images[0].url;
    const caption = `🌌 *Aquí tienes tu waifu, ${await conn.getName(m.sender)}* 👑\n\n💫 ¿Quieres otra? Solo toca el botón de abajo.`;

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: {
              body: { text: caption },
              footer: { text: '👑 SHADOW BOT MD' },
              header: {
                hasMediaAttachment: true,
                imageMessage: await (async () => {
                  const { imageMessage } = await conn.sendMessage(m.chat, { image: { url } }, { contextInfo });
                  return imageMessage;
                })()
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🔁 Siguiente waifu',
                      id: `${usedPrefix}${command}`
                    })
                  },
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🌐 Canal de Shadow',
                      url: redes
                    })
                  }
                ]
              }
            }
          }
        }
      },
      { quoted: m, contextInfo }
    );

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });

  } catch (e) {
    await conn.reply(m.chat, `❌ Error al buscar la waifu.\n> Detalles: ${e.message}`, m);
  }
};

handler.help = ['waifu'];
handler.tags = ['anime'];
handler.command = ['waifu'];
handler.group = true;
handler.register = true;

export default handler;
