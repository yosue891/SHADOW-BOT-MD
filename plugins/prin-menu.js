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
    let videoUrl = "https://files.catbox.moe/johk6u.mp4"; 
    
    const senderBotNumber = conn.user.jid.split('@')[0];
    const configPath = path.join('./Sessions/SubBot', senderBotNumber, 'config.json');

    if (fs.existsSync(configPath)) {
      try {
        const subBotConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (subBotConfig.name) botNameToShow = subBotConfig.name;
        if (subBotConfig.video) videoUrl = subBotConfig.video;
      } catch (e) {}
    }

    const tz = "America/Tegucigalpa";
    const now = moment.tz(tz);
    const hour = now.hour();
    const timeStr = now.format("HH:mm:ss");
    const dateStr = now.format("DD/MM/YYYY");

    let saludoNavideño = "🌟 *¡Feliz Día de Sombra!* 🌟";
    if (hour >= 12 && hour < 18) saludoNavideño = "🎁 *¡Tarde de Regalos!* 🎁";
    else if (hour >= 18 || hour < 5) saludoNavideño = "🕯️ *¡Noche de Luces!* 🕯️";

    const tagUser = '@' + m.sender.split('@')[0];
    const separador = '—————————————';

    let txt =
`
╔═══════ 🎄 ═══════╗
   *M E N Ú D E L A S S O M B R A S*
╚═══════ ❄️ ═══════╝

${saludoNavideño} ${tagUser}

${separador}

*★ D A T O S - B O T*
• *Nombre:* ${botNameToShow}
• *Estado:* ${(conn.user.jid == global.conn.user.jid ? 'Principal 🅥' : 'Sub-Bot 🅑')}
• *Uptime:* ${uptimeStr}
• *Hora (TGU):* ${timeStr}

${separador}

*★ M E N U - C O M A N D O S*

`;

    const iconos = {
        'main': '🏠', 'menu': '📜', 'rg': '📝', 'rpg': '⚔️', 'econ': '💰', 'group': '👥',
        'tools': '🔧', 'admin': '👑', 'owner': '🌟', 'fun': '🎈', 'sticker': '🖼️',
        'downloader': '📥', 'internet': '📡', 'audio': '🎧', 'nsfw': '🔞', 'xp': '✨'
    };
    
    for (let tag in menu) {
        const tagTitle = iconos[tag] ? `${iconos[tag]} ${tag.toUpperCase()} ${iconos[tag]}` : tag.toUpperCase();
        txt += `\n*• ${tagTitle}*`;
        
        let commands = menu[tag].map(plugin => {
            const cmdList = Array.isArray(plugin.help) ? plugin.help : [plugin.help];
            return cmdList.map(cmd => {
                return `   - ${usedPrefix}${cmd}`;
            }).join('\n');
        }).join('\n');
        
        txt += `\n${commands}\n`;
    }

    txt += `\n${separador}\n*Creado por Yosue uwu ❤️*`;

    await conn.sendMessage(m.chat, { react: { text: '☃️', key: m.key } });

    let mediaMessage = null;
    try {
      mediaMessage = await prepareWAMessageMedia(
        { video: { url: videoUrl }, gifPlayback: true },
        { upload: conn.waUploadToServer }
      );
    } catch (e) {}

    const newMessageParamsJson = JSON.stringify({
      limited_time_offer: {
        text: "🌑 Shadow - Menu",
        url: "https://github.com/the-xyzz",
        expiration_time: 1754613436864329,
      },
    });

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: txt },
            footer: { text: "✧ Visita  nuestro  canal oficial ✧" }, 
            header: {
              hasMediaAttachment: !!mediaMessage,
              videoMessage: mediaMessage ? mediaMessage.videoMessage : null
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "🌐 Canal Oficial",
                    url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
                  })
                }
              ],
              messageParamsJson: newMessageParamsJson
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
    console.error(e);
    conn.reply(m.chat, "👻 Error al generar el menú mejorado...", m);
  }
};

handler.command = ['menu', 'help'];
export default handler;
