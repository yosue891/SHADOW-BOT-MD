import axios from 'axios';

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
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "🌐 Canal de Shadow",
              url: redes,
              merchant_url: redes
            })
          }
        ],
        messageParamsJson: ""
      }
    };

    await m.react('❤️');
    await conn.reply(m.chat, '🌌 *Buscando una waifu para ti...*', m, { contextInfo });

    let url = null;

    try {
      const res = await axios.get('https://api.waifu.pics/sfw/waifu', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      if (res.data?.url) url = res.data.url;
    } catch {
      try {
        const resBackup = await axios.get('https://nekos.life/api/v2/img/waifu', {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 5000
        });
        if (resBackup.data?.url) url = resBackup.data.url;
      } catch (err) {
        throw new Error('Fallo total de red o DNS (ENOTFOUND).');
      }
    }

    if (!url) throw new Error('No se pudo obtener el enlace de la imagen.');

    const caption = `🌌 *Aquí tienes tu waifu, ${await conn.getName(m.sender)}* 👑\n\n💫 ¿Quieres otra? Solo toca el botón.`;

    const buttons = [
      { buttonId: usedPrefix + command, buttonText: { displayText: '🔁 Siguiente waifu' }, type: 1 }
    ];

    await conn.sendMessage(
      m.chat,
      {
        image: { url },
        caption,
        footer: '👑 SHADOW BOT MD',
        buttons,
        headerType: 4
      },
      { quoted: m, contextInfo }
    );

  } catch (e) {
    await conn.reply(m.chat, `⚠️ *Error de conexión en el servidor*\n\n> El Bot no tiene acceso estable a Internet o las DNS de tu Hosting fallaron.\n\n🜸 Detalles: ${e.message}`, m);
  }
};

handler.help = ['waifu'];
handler.tags = ['anime'];
handler.command = ['waifu'];
handler.group = true;
handler.register = true;

export default handler;
