import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  try {
    const isRegistered = global.db.data.users[m.sender]?.registered;
    if (!isRegistered) {
      return conn.sendMessage(
        m.chat,
        {
          text:
            `┏━━━━━━━━━━━━━━━━━━┓\n🎄 *ACCESO DENEGADO* 🎄\n┗━━━━━━━━━━━━━━━━━━┛\n\n` +
            `🎅 Lo siento, viajero de las sombras...\n` +
            `✨ Para acceder al menú navideño debes estar registrado.\n\n` +
            `🔐 Usa *${usedPrefix}reg shadow.18* para unirte al Reino.\n` +
            `🎁 ¡Las sombras te esperan!`,
          buttons: [
            {
              buttonId: `${usedPrefix}reg shadow.18`,
              buttonText: { displayText: '✅ Reg Shadow.18' },
              type: 1,
            },
          ],
          headerType: 6,
        },
        {
          quoted: {
            key: { fromMe: false, participant: "0@s.whatsapp.net" },
            message: { conversation: "Mensaje reenviado" },
          },
        }
      );
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

    let botNameToShow = global.botname || "Shadow 🎄";
    let bannerUrl = global.michipg || "https://n.uguu.se/ZZHiiljb.jpg";
    let videoUrl = "https://raw.githubusercontent.com/UploadsAdonix/archivos/main/1763142155838-e70c63.mp4";
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
    const hour = now.hour();
    const timeStr = now.format("HH:mm:ss");
    const dateStr = now.format("DD/MM/YYYY");

    let saludo = "🎅 ¡Feliz Navidad!";
    if (hour >= 12 && hour < 18) saludo = "🎁 ¡Feliz tarde navideña!";
    else if (hour >= 18 || hour < 5) saludo = "🌙 ¡Feliz noche navideña!";

    let intro = 
`┏━━━━━━━━━━━━━━━━━━━┓
🎄 *${saludo}* 🎄
✨ Bienvenido al Reino de las Sombras festivas ✨
❄️ Que las luces iluminen tu camino y las sombras te protejan ❄️
┗━━━━━━━━━━━━━━━━━━━┛\n`;

    let txt = intro +
      `🌐 *Canal Navideño de Shadow:*\nhttps://whatsapp.com/channel/0029Vb7GXFc9cDDW4i1gJY1m\n\n` +
      `🎅 Soy *${botNameToShow}*, el ser en las sombras ${(conn.user.jid == global.conn.user.jid ? '(Principal 🅥)' : '(Sub-Bot 🅑)')}\n` +
      `🕒 *Hora:* ${timeStr}\n` +
      `📅 *Fecha:* ${dateStr}\n` +
      `⚙️ *Actividad:* ${uptimeStr}\n\n` +
      `❄️ *Comandos mágicos:*`;

    const emojis = ['🎄', '🎁', '✨', '⛄', '🔔', '🎶'];
    let emojiIndex = 0;

    for (let tag in menu) {
      txt += `\n━━━━━━━━━━━━━━━━━━━━━━\n🎅 ${tag.toUpperCase()} 🎅\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      for (let plugin of menu[tag]) {
        for (let cmd of plugin.help) {
          let emoji = emojis[emojiIndex % emojis.length];
          txt += `${emoji} ${usedPrefix + cmd}\n`;
          emojiIndex++;
        }
      }
    }

    txt += `\n\n🎄✨ *Creado por Yosue uwu* ✨🎄`;

    await conn.sendMessage(m.chat, { react: { text: '🎅', key: m.key } });

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
            footer: { text: "🎄 Menú Navideño 🎄" },
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
                    url: "https://whatsapp.com/channel/0029Vb7GXFc9cDDW4i1gJY1m"
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
    conn.reply(m.chat, "👻 Error en las sombras navideñas...", m);
  }
};

handler.command = ['help', 'menu'];
export default handler;
          
