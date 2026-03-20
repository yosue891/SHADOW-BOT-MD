import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import baileys from "@whiskeysockets/baileys";

const { prepareWAMessageMedia, generateWAMessageFromContent } = baileys;

let handler = async (m, { conn, usedPrefix, participants }) => {
  try {
    let name = await conn.getName(m.sender);
    let uptimeSec = process.uptime();
    let uptimeStr = clockString(uptimeSec * 1000);
    let totalreg = Object.keys(global.db.data.users).length;
    let groupsCount = Object.values(conn.chats).filter(v => v.id.endsWith('@g.us')).length;
    let totalCommands = Object.keys(global.plugins).length;

    const tz = "America/Lima";
    const dateStr = moment.tz(tz).format("DD/MM/YYYY");
    const timeStr = moment.tz(tz).format("HH:mm:ss");
    const dia = moment.tz(tz).format("dddd");

    let tags = {
      'info': '𝐈𝐍𝐅𝐎 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'main': '𝐄𝐒𝐓𝐀𝐃𝐎 𝐃𝐄𝐋 𝐂𝐎𝐑𝐓𝐈𝐆𝐎',
      'anime': '𝐀𝐍𝐈𝐌𝐄 𝐀𝐑𝐂𝐀𝐍𝐎',
      'descargas': '𝐃𝐄𝐒𝐂𝐀𝐑𝐆𝐀𝐒 𝐃𝐄 𝐋𝐀 𝐒𝐎𝐌𝐁𝐑𝐀',
      'rg': '𝐏𝐄𝐑𝐅𝐈𝐋 𝐃𝐄𝐋 𝐂𝐎𝐍𝐓𝐑𝐀𝐓𝐈𝐒𝐓𝐀',
      'owner': '𝐌𝐀𝐄𝐒𝐓𝐑𝐎 𝐃𝐄 𝐋𝐀 𝐎𝐑𝐆𝐀𝐍𝐈𝐙𝐀𝐂𝐈𝐎𝐍'
    };

    let menuTexto = "";
    for (let tag in tags) {
      let comandos = Object.values(global.plugins)
        .filter(plugin => plugin.help && plugin.tags && plugin.tags.includes(tag))
        .map(plugin => plugin.help.map(e => `*│ׄꤥㅤׅ* ${usedPrefix}${e}`).join('\n'))
        .join('\n');
      if (comandos) {
        menuTexto += `\n*╭──･ ̸̷∵* \`${tags[tag]}\`  *݁ ⚜︎*\n${comandos}\n*╰─────────────֙╯*\n`;
      }
    }

    let bodyTxt = `
> . ݁  🌑՞ *ʙɪᴇɴᴠᴇɴɪᴅᴏ ᴀ ʟᴀ ꜱᴏᴍʙʀᴀ,* ${name}.
>    ʏᴀ ᴇꜱᴛᴀʙᴀ ᴇꜱᴄᴜᴄhᴀɴᴅᴏ ᴛᴜꜱ ᴘᴀꜱᴏꜱ...

> ﹙⚜︎﹚੭੭ ─ \`ɪ ɴ ғ ᴏ - ꜱʜᴀᴅᴏᴡ ʙᴏᴛ\`
> ര ׄ 𓏸𓈒 ׅ *ɴᴏᴍʙʀᴇ ᴄʟᴀᴠ ›* ${conn.user?.name || 'Shadow Unit'}
> ര ׄ 𓏸𓈒 ׅ *ᴄʟᴀꜱɪꜰɪᴄᴀᴄɪᴏɴ ›* ${(conn.user.jid == global.conn.user.jid ? 'Principal' : 'Sub-Bot')}
> ര ׄ 𓏸𓈒 ׅ *ᴄᴏᴍᴀɴᴅᴏꜱ ›* ${totalCommands}
> ര ׄ 𓏸𓈒 ׅ *ᴛɪᴇᴍᴘᴏ ᴇɴ ʟᴀ ꜱᴏᴍʙʀᴀ ›* ${uptimeStr}
> ര ׄ 𓏸𓈒 ׅ *ᴀʟᴍᴀꜱ ›* ${totalreg}
> ര ׄ 𓏸𓈒 ׅ *ᴛɪᴇᴍᴘᴏ ›* ${dia}, ${dateStr}

${menuTexto}

🌑✨ *Creado por Yosue* ✨🌑`.trim();

    const videoUrl = "http://gohan-file.onrender.com/f/f04e69d3aff4c3d7.mp4";
    await m.react('🔥');

    let mediaMessage = await prepareWAMessageMedia(
      { video: { url: videoUrl }, gifPlayback: true },
      { upload: conn.waUploadToServer }
    );

    const msg = generateWAMessageFromContent(m.chat, {
      interactiveMessage: {
        body: { text: bodyTxt },
        footer: { text: "Shadow Garden Organization" },
        header: {
          hasMediaAttachment: true,
          videoMessage: mediaMessage.videoMessage
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
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363297379502415@newsletter",
            newsletterName: "Shadow Bot Updates",
            serverMessageId: -1
          }
        }
      }
    }, { quoted: m });

    await conn.relayMessage(m.chat, msg.message, {});

  } catch (e) {
    console.error(e);
    conn.reply(m.chat, `✘ Error en el sistema de sombras: ${e.message}`, m);
  }
};

handler.help = ['menu'];
handler.tags = ['main'];
handler.command = ['menu', 'help'];
handler.register = true;

export default handler;

function clockString(ms) {
  let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000);
  let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60;
  let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
      }
