import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const chat = global.db.data.users[m.sender] || {};
    
    // SISTEMA DE REGISTRO
    if (!chat.registered) {
      const thumb = await (await fetch('https://iili.io/fXp3swb.jpg')).buffer();

      const fkontak = {
        key: { fromMe: false, id: 'Shadow', participant: '0@s.whatsapp.net' },
        message: {
          contactMessage: {
            displayName: "Shadow",
            vcard: `BEGIN:VCARD\nVERSION:3.0\nN:Shadow;;;\nFN:Shadow\nORG:Shadow Garden\nTEL;waid=584242773183:+58 424 2773183\nEND:VCARD`,
            jpegThumbnail: thumb
          }
        }
      };

      const msg = {
        interactiveMessage: {
          header: {
            title: "REGISTRO REQUERIDO",
            subtitle: "Shadow Garden",
            hasMediaAttachment: true,
            imageMessage: {
              url: "https://files.catbox.moe/n3bg2n.jpg"
            }
          },
          body: {
            text: `➤ *\`REGISTRO\`*\n\nHola ${m.pushName || 'usuario'}\nPara usar el menú necesitas registrarte.\n\nComando:\n\`${usedPrefix}reg nombre.edad\`\nEjemplo:\n\`${usedPrefix}reg shadow.18\``
          },
          footer: { text: "🌌 Shadow Bot" },
          nativeFlowMessage: {
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "📝 Registrarse",
                  id: `${usedPrefix}reg`
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "👑 Creador",
                  url: "https://wa.me/584242773183"
                })
              }
            ]
          },
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9999999
          }
        }
      };

      return conn.sendMessage(m.chat, msg, { quoted: fkontak });
    }

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

👤 *Bot:* Shadow
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
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 Canal de Shadow",
                url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
              })
            }
          ]
        },
        contextInfo: {
          isForwarded: true,
          forwardingScore: 9999999
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
