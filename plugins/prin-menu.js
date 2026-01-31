import moment from "moment-timezone";
import fs from "fs";
import fetch from "node-fetch";

let handler = async (m, { conn, usedPrefix }) => {
  try {

    // SISTEMA DE REGISTRO SHADOW GARDEN
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
        image: { url: 'https://files.catbox.moe/n3bg2n.jpg' },
        caption: [
          `➤ *\`REGISTRO\`*`,
          `𔓕 Hola ${m.pushName || 'usuario'}`,
          `𔓕 Para usar el comando necesitas registrarte`,
          `𔓕 Comando: \`${usedPrefix}reg nombre.edad\``,
          `𔓕 Ejemplo: \`${usedPrefix}reg shadow.18\``
        ].join('\n'),
        footer: '🌌 Shadow Bot',
        buttons: [
          { buttonId: `${usedPrefix}reg`, buttonText: { displayText: '📝 Registrarse' }, type: 1 },
          { buttonId: `${usedPrefix}owner`, buttonText: { displayText: '👑 Creador' }, type: 1 }
        ],
        headerType: 4,
        mentions: [m.sender]
      }

      return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
    }

    // GENERAR MENÚ
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

    const tz = "America/Tegucigalpa";
    const now = moment.tz(tz);
    const timeStr = now.format("HH:mm:ss");
    const dateStr = now.format("DD/MM/YYYY");

    let botNameToShow = global.botname || "Shadow ✦";

    let intro =
`┏━━━━━━━━━━━━━━━━━━━┓
🌑 *Las sombras te reconocen, ${m.pushName}* 🌑
🕷️ Bienvenido al Reino Oscuro de Shadow Garden 🕷️
┗━━━━━━━━━━━━━━━━━━━┛`;

    let txt = intro + `

✦ *Canal Oficial del Reino Oscuro:*
https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O

🜸 Yo soy *${botNameToShow}*
🗡️ *Hora:* ${timeStr}
🌑 *Fecha:* ${dateStr}
✦ *Energía Activa:* ${uptimeStr}

🕷️ *Invocaciones disponibles:*`;

    const emojis = ['✦', '🜸', '🗡️', '🌑', '🕷️'];
    let emojiIndex = 0;

    for (let tag in menu) {
      txt += `

━━━━━━━━━━━━━━━━━━━━━━
🜸 ${tag.toUpperCase()} 🜸
━━━━━━━━━━━━━━━━━━━━━━`;

      for (let plugin of menu[tag]) {
        for (let cmd of plugin.help) {
          let emoji = emojis[emojiIndex % emojis.length];
          txt += `\n${emoji} ${usedPrefix + cmd}`;
          emojiIndex++;
        }
      }
    }

    txt += `

✦ *Forjado por Yosue — Guardián del Reino Oscuro* ✦`;

    await conn.sendMessage(m.chat, {
      video: { url: "https://files.catbox.moe/9jnatu.mp4" },
      gifPlayback: true,
      caption: txt,
      footer: "✦ Shadow Garden ✦",
      buttons: [
        { buttonId: `${usedPrefix}owner`, buttonText: { displayText: "👑 Creador" }, type: 1 },
        { buttonId: `${usedPrefix}ping`, buttonText: { displayText: "⚡ Estado" }, type: 1 }
      ],
      headerType: 4
    }, { quoted: m })

  } catch (e) {
    conn.reply(m.chat, "🌑 Un eco oscuro ha perturbado el flujo…", m);
  }
};

handler.command = ['help', 'menu'];
export default handler;
