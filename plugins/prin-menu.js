import moment from "moment-timezone";
import fs from "fs";
import fetch from "node-fetch";
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const chat = global.db.data.users[m.sender] || {};
    if (!chat.registered) return; // NO TOCAMOS EL REGISTRO

    // GENERAR MENÚ
    let menu = {};
    for (let plugin of Object.values(global.plugins)) {
      if (!plugin.help) continue;
      for (let tag of plugin.tags || []) {
        if (!menu[tag]) menu[tag] = [];
        menu[tag].push(plugin);
      }
    }

    let uptime = process.uptime();
    let h = Math.floor(uptime / 3600);
    let mnt = Math.floor((uptime % 3600) / 60);
    let s = Math.floor(uptime % 60);

    let tz = "America/Tegucigalpa";
    let now = moment.tz(tz);
    let hora = now.format("HH:mm:ss");
    let fecha = now.format("DD/MM/YYYY");

    let saludo = "Bienvenido al Reino de las Sombras";

    let texto = 
`┏━━━━━━━━━━━━━━━━━━━┓
🌑 *${saludo}* 🌑
✨ El poder de las sombras responde a tu llamado ✨
┗━━━━━━━━━━━━━━━━━━━┛

🕒 *Hora:* ${hora}
📅 *Fecha:* ${fecha}
⚙️ *Actividad:* ${h}h ${mnt}m ${s}s

⚔️ *Comandos disponibles:*`;

    const emojis = ['⚡','🔥','🌑','🜁','🜂','🜄'];
    let i = 0;

    for (let tag in menu) {
      texto += `\n\n🔹 *${tag.toUpperCase()}* 🔹\n`;
      for (let plugin of menu[tag]) {
        for (let cmd of plugin.help) {
          texto += `${emojis[i++ % emojis.length]} ${usedPrefix + cmd}\n`;
        }
      }
    }

    texto += `\n🌑✨ *Creado por Yosue* ✨🌑`;

    await conn.sendMessage(m.chat, { react: { text: '👻', key: m.key } });

    const media = await prepareWAMessageMedia(
      { video: { url: "https://files.catbox.moe/9jnatu.mp4" }, gifPlayback: true },
      { upload: conn.waUploadToServer }
    );

    const msg = generateWAMessageFromContent(m.chat, {
      interactiveMessage: {
        header: {
          hasMediaAttachment: true,
          videoMessage: media.videoMessage
        },
        body: { text: texto },
        footer: { text: "Shadow Menu" },

        nativeFlowMessage: { buttons: [] },

        contextInfo: {
          isForwarded: true,
          forwardingScore: 9999999,

          externalAdReply: {
            showAdAttribution: true,
            title: "Shadow • Canal Oficial",
            body: "Únete al canal",
            mediaType: 1,
            renderLargerThumbnail: true,
            thumbnailUrl: "https://files.catbox.moe/n3bg2n.jpg",
            sourceUrl: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
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
