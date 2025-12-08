import fetch from 'node-fetch';

const newsletterJid  = '120363403739366547@newsletter';
const newsletterName = '👑 SHADOW-BOT-MD uwu👑 ';

// 🔑 Variables definidas
const packname = '👑 SHADOW-BOT-MD 👑';
const dev = 'Creado por Yosue';
const redes = 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O'; // tu canal
const icons = 'https://files.catbox.moe/1ric0g.jpg'; // tu imagen

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
        thumbnailUrl: icons, // imagen miniatura
        sourceUrl: redes,    // canal
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
    await conn.reply(m.chat, '🌌 *Buscando una waifu para ti... espera un momento por favor*', m, { contextInfo });

    let res = await fetch('https://api.waifu.pics/sfw/waifu');
    if (!res.ok) throw new Error('No se pudo obtener la waifu.');
    let json = await res.json();
    if (!json.url) throw new Error('Respuesta inválida.');

    const caption = `🌌 *Aquí tienes tu waifu, ${conn.getName(m.sender)}* 👑\n\n💫 ¿Quieres otra waifu? Solo toca el botón de abajo~`;

    const buttons = [
      { buttonId: usedPrefix + command, buttonText: { displayText: '🔁 Siguiente waifu' }, type: 1 }
    ];

    await conn.sendMessage(
      m.chat,
      {
        image: { url: json.url },
        caption,
        footer: '👑 SHADOW BOT MD',
        buttons,
        headerType: 4
      },
      { quoted: m, contextInfo }
    );

  } catch (e) {
    console.error(e);
    await conn.reply(m.chat, '❌ Lo siento, ocurrió un error al buscar la waifu.', m);
  }
};

handler.help = ['waifu'];
handler.tags = ['anime'];
handler.command = ['waifu'];
handler.group = true;
handler.register = true;

export default handler;
