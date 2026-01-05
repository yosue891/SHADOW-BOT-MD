import { sticker } from '../lib/sticker.js';
import fetch from 'node-fetch';

let handler = async (m, { conn, args, usedPrefix, command }) => {

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

    // Mensaje catálogo con imagen grande y botones
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
        `𔓕 Para usar el comando necesitas registrarte`,
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
    }

    return await conn.sendMessage(m.chat, productMessage, { quoted: fkontak })
  }

  let stiker = false;
  try {
    let q = m.quoted ? m.quoted : m;
    let mime = (q.msg || q).mimetype || q.mediaType || '';
    if (/webp|image|video/g.test(mime)) {
      if (/video/g.test(mime)) 
        if ((q.msg || q).seconds > 8) 
          return m.reply(`🥀 *¡El video no puede durar más de 8 segundos!*`);

      let img = await q.download?.();
      if (!img) 
        return conn.reply(m.chat, ` 🌌 *_¿Y el video? Intenta enviar primero imagen/video/gif y luego responde con el comando._*`, m);

      let out;
      try {
        stiker = await sticker(img, false, global.packname, global.author);
      } catch (e) {
        console.error(e);
      } finally {
        if (!stiker) {
          if (/webp/g.test(mime)) out = await webp2png(img);
          else if (/image/g.test(mime)) out = await uploadImage(img);
          else if (/video/g.test(mime)) out = await uploadFile(img);
          if (typeof out !== 'string') out = await uploadImage(img);
          stiker = await sticker(false, out, global.packname, global.author);
        }
      }
    } else if (args[0]) {
      if (isUrl(args[0])) 
        stiker = await sticker(false, args[0], global.packname, global.author);
      else 
        return m.reply(`💫 El URL es incorrecto`);
    }
  } catch (e) {
    console.error(e);
    if (!stiker) stiker = e;
  } finally {
    if (stiker) {
      conn.sendFile(
        m.chat, 
        stiker, 
        'sticker.webp', 
        '', 
        m, 
        true, 
        { 
          contextInfo: { 
            'forwardingScore': 200, 
            'isForwarded': false, 
            externalAdReply: { 
              showAdAttribution: false, 
              title: global.packname, 
              body: `🌌aqui tienes tu sticker uwu🌌`, 
              mediaType: 2, 
              sourceUrl: 'https://whatsapp.com/channel/0029VbArz9fAO7RGy2915k3O', 
              thumbnailUrl: 'https://files.catbox.moe/sc3pei.jpg' 
            }
          }
        }, 
        { quoted: m }
      );
    } else {
      return conn.reply(m.chat, '👻 *_¿Y el video? Intenta enviar primero imagen/video/gif y luego responde con el comando._*', m);
    }
  }
};

handler.help = ['stiker <img>', 'sticker <url>'];
handler.tags = ['sticker'];
handler.command = ['s', 'sticker', 'stiker'];

export default handler;

const isUrl = (text) => {
  return text.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)(jpe?g|gif|png)/, 'gi'));
};
