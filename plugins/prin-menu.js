import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  try {

    const chat = global.db.data.users[m.sender] || {}
    if (!chat.registered) {
      const thumbBuffer = await (await fetch('https://iili.io/fXp3swb.jpg')).buffer()

      const fkontak = {
        key: { participants: '0@s.whatsapp.net', fromMe: false, id: 'Shadow' },
        message: {
          locationMessage: {
            name: 'Registro requerido',
            jpegThumbnail: thumbBuffer,
            vcard:
              'BEGIN:VCARD\nVERSION:3.0\nN:;Shadow;;;\nFN:Shadow\nORG:Shadow Garden\nitem1.TEL;waid=584242773183:+58 424 2773183\nitem1.X-ABLabel:Shadow\nEND:VCARD'
          }
        },
        participant: '0@s.whatsapp.net'
      }

      const productMessage = {
        product: {
          productImage: { url: 'https://files.catbox.moe/n3bg2n.jpg' },
          productId: '999999999999999',
          title: 'REGISTRO',
          description: 'Registro requerido',
          currencyCode: 'USD',
          priceAmount1000: '0',
          retailerId: 1677,
          url: `https://wa.me/584242773183`,
          productImageCount: 1
        },
        businessOwnerJid: '584242773183@s.whatsapp.net',
        caption: [
          `➤ *\`REGISTRO\`*`,
          `𔓕 Hola ${m.pushName || 'usuario'}`,
          `𔓕 Para usar el comando necesitas registrarte`,
          `𔓕 Comando: \`${usedPrefix}reg nombre.edad\``,
          `𔓕 Ejemplo: \`${usedPrefix}reg shadow.18\``
        ].join('\n'),
        footer: '🌌 Shadow Bot',
        interactiveButtons: [
          { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '📝 Registrarse', id: `${usedPrefix}reg` }) },
          { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '👑 Creador', url: 'https://wa.me/584242773183' }) }
        ],
        mentions: [m.sender],
        contextInfo: {
          externalAdReply: {
            showAdAttribution: true,
            title: 'Shadow • Sistema de Registro',
            body: 'Registro uwu',
            mediaType: 1,
            thumbnailUrl: 'https://files.catbox.moe/n3bg2n.jpg',
            sourceUrl: 'https://wa.me/584242773183'
          }
        }
      }

      return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
    }

    let menu = {};
    for (let plugin of Object.values(global.plugins)) {
      if (!plugin || !plugin.help) continue;
      let taglist = plugin.tags || [];
      for (let tag of taglist) {
        if (!menu[tag]) menu[tag] = [];
        menu[tag].push(plugin);
      }
    }

    let uptimeSec = process.uptime();
    let hours = Math.floor(uptimeSec / 3600);
    let minutes = Math.floor((uptimeSec % 3600) / 60);
    let seconds = Math.floor(uptimeSec % 60);
    let uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    let botNameToShow = global.botname || "Shadow ✦";
    let videoUrl = "https://files.catbox.moe/9jnatu.mp4";

    const tz = "America/Tegucigalpa";
    const now = moment.tz(tz);
    const timeStr = now.format("HH:mm:ss");
    const dateStr = now.format("DD/MM/YYYY");

    let intro = 
`┏━━━━━━━━━━━━━━━━━━━┓
🌑 *Las sombras te reconocen, ${m.pushName}* 🌑
🕷️ Bienvenido al Reino Oscuro de Shadow Garden 🕷️
┗━━━━━━━━━━━━━━━━━━━┛\n`;

    let txt = intro +
      `✦ *Canal Oficial del Reino Oscuro:*\nhttps://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n\n` +
      `🜸 Yo soy *${botNameToShow}*\n` +
      `🗡️ *Hora:* ${timeStr}\n` +
      `🌑 *Fecha:* ${dateStr}\n` +
      `✦ *Energía Activa:* ${uptimeStr}\n\n` +
      `🕷️ *Invocaciones disponibles:*`;

    const emojis = ['✦', '🜸', '🗡️', '🌑', '🕷️'];
    let emojiIndex = 0;

    for (let tag in menu) {
      txt += `\n━━━━━━━━━━━━━━━━━━━━━━\n🜸 ${tag.toUpperCase()} 🜸\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      for (let plugin of menu[tag]) {
        for (let cmd of plugin.help) {
          let emoji = emojis[emojiIndex % emojis.length];
          txt += `${emoji} ${usedPrefix + cmd}\n`;
          emojiIndex++;
        }
      }
    }

    txt += `\n\n✦ *Forjado por Yosue — Guardián del Reino Oscuro* ✦`;

    await conn.sendMessage(m.chat, { react: { text: '🌑', key: m.key } });

    let mediaMessage = null;
    try {
      mediaMessage = await prepareWAMessageMedia(
        { video: { url: videoUrl }, gifPlayback: true },
        { upload: conn.waUploadToServer }
      );
    } catch (e) {}

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: txt },
            footer: { text: "✦ Menú del Reino Oscuro ✦" },
            header: {
              hasMediaAttachment: !!mediaMessage,
              videoMessage: mediaMessage ? mediaMessage.videoMessage : null
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🌑 Canal del Reino",
                    url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
                  })
                }
              ],
              messageParamsJson: ""
            },
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              forwardingScore: 9999999
            }
          }
        }
      }
    }, { quoted: m });

    await conn.relayMessage(m.chat, msg.message, {});

  } catch (e) {
    conn.reply(m.chat, "🌑 Un eco oscuro ha perturbado el flujo…", m);
  }
};

handler.command = ['help', 'menu'];
export default handler;
