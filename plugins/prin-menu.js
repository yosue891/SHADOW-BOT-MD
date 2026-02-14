import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
const { prepareWAMessageMedia, generateWAMessageFromContent } = (await import("@whiskeysockets/baileys")).default;

let handler = async (m, { conn, usedPrefix }) => {
  try {

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

    let botNameToShow = global.botname || "SHADOW";
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
    const timeStr = now.format("HH:mm:ss");

    const tagUser = '@' + m.sender.split('@')[0];
    const line = "━━━━━━━━━━━━━━━━━━━━━━";

    let txt =
`
╔══════════════════════╗
        𝐒𝐇𝐀𝐃𝐎𝐖 𝐆𝐀𝐑𝐃𝐄𝐍
╚══════════════════════╝

Bienvenido, ${tagUser}
Has accedido al núcleo oculto.

${line}

▸ INFORMACIÓN DEL SISTEMA
• Identidad: ${botNameToShow}
• Tiempo activo: ${uptimeStr}
• Hora actual: ${timeStr}

${line}

▸ MÓDULOS DISPONIBLES
`;

    for (let tag in menu) {
        txt += `\n◆ ${tag.toUpperCase()}\n`;
        
        let commands = menu[tag].map(plugin => {
            const cmdList = Array.isArray(plugin.help) ? plugin.help : [plugin.help];
            return cmdList.map(cmd => `   ◦ ${usedPrefix}${cmd}`).join('\n');
        }).join('\n');
        
        txt += `${commands}\n`;
    }

    txt += `
${line}
“El poder verdadero opera en las sombras.”
`;

    await conn.sendMessage(m.chat, { react: { text: '🌑', key: m.key } });

    let mediaMessage = await prepareWAMessageMedia(
        { video: { url: videoUrl }, gifPlayback: true },
        { upload: conn.waUploadToServer }
    );

    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              hasMediaAttachment: true,
              videoMessage: mediaMessage.videoMessage
            },
            body: { text: txt },
            footer: { text: "SHADOW-BOT-MD" },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: JSON.stringify({
                    title: "Shadow Interface",
                    sections: [
                      {
                        title: "Shadow Garden",
                        rows: [
                          { title: "Menú Completo", description: "Acceder a todos los comandos", id: `${usedPrefix}allmenu` },
                          { title: "Estado del Sistema", description: "Ver rendimiento del bot", id: `${usedPrefix}ping` },
                          { title: "Fundador", description: "Información del creador", id: `${usedPrefix}owner` }
                        ]
                      }
                    ]
                  })
                },
                {
                  name: "cta_copy",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Copiar Identidad",
                    id: "shadow_core",
                    copy_code: "I AM ATOMIC"
                  })
                },
                {
                  name: "cta_url",
                  buttonParamsJson: JSON.stringify({
                    display_text: "Canal Oficial",
                    url: "https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O"
                  })
                }
              ]
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
    conn.reply(m.chat, "El núcleo ha fallado temporalmente...", m);
  }
};

handler.command = ['menu', 'help'];
export default handler;
