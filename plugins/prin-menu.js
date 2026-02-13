import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const chat = global.db.data.users[m.sender] || {};
    if (!chat.registered) {
      const thumbBuffer = await (await fetch('https://iili.io/fXp3swb.jpg')).buffer();

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
      };

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
          `𔓕 Para usar el menú necesitas registrarte`,
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
      };

      return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak });
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

    let botNameToShow = global.botname || "Shadow";
    let bannerUrl = global.michipg || "https://n.uguu.se/ZZHiiljb.jpg";
    let videoUrl = "https://files.catbox.moe/9jnatu.mp4";

    const senderBotNumber = conn.user.jid.split('@')[0];
    const configPath = path.join('./Sessions/SubBot', senderBotNumber, 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        const subBotConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (subBotConfig.name) botNameToShow = subBotConfig.name;
        if (subBotConfig.banner) bannerUrl = subBotConfig.banner;
        if (subBotConfig.video) videoUrl = subBotConfig.video;
      } catch (e) {}
    }

    const tz = "America/Tegucigalpa";
    const now = moment.tz(tz);
    const timeStr = now.format("HH:mm:ss");
    const dateStr = now.format("DD/MM/YYYY");

    let saludo = "Bienvenido al Reino de las Sombras";

    let intro = 
`┏━━━━━━━━━━━━━━━━━━━┓
🌑 *${saludo}* 🌑
✨ El poder de las sombras responde a tu llamado ✨
┗━━━━━━━━━━━━━━━━━━━┛\n`;

    let txt = intro +
      `🌐 *Canal Oficial de Shadow:*\nhttps://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O\n\n` +
      `👤 Soy *${botNameToShow}* ${(conn.user.jid == global.conn.user.jid ? '(Principal 🅥)' : '(Sub-Bot 🅑)')}\n` +
      `🕒 *Hora:* ${timeStr}\n` +
      `📅 *Fecha:* ${dateStr}\n` +
      `⚙️ *Actividad:* ${uptimeStr}\n\n` +
      `⚔️ *Comandos disponibles:*`;

    const emojis = ['⚡', '🔥', '🌑', '🜁', '🜂', '🜄', '🜁'];
    let emojiIndex = 0;

    for (let tag in menu) {
      txt += `\n🔹 ${tag.toUpperCase()} 🔹\n`;
      for (let plugin of menu[tag]) {
        for (let cmd of plugin.help) {
          let emoji = emojis[emojiIndex % emojis.length];
          txt += `${emoji} ${usedPrefix + cmd}\n`;
          emojiIndex++;
        }
      }
    }

    txt += `\n\n🌑✨ *Creado por Yosue* ✨🌑`;

    await conn.sendMessage(m.chat, { react: { text: '👻', key: m.key } });

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
            footer: { text: "Shadow Menu" },
            header: {
              hasMediaAttachment: !!mediaMessage,
              videoMessage: mediaMessage ? mediaMessage.videoMessage : null
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🌐 Canal de Shadow",
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
    conn.reply(m.chat, "⚠️ Error en el menú...", m);
  }
};

handler.command = ['help', 'menu'];
export default handler;
                   
