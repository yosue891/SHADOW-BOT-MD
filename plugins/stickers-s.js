import { sticker } from '../lib/sticker.js';
//import uploadFile from '../lib/uploadFile.js';
//import uploadImage from '../lib/uploadImage.js';
//import { webp2png } from '../lib/webp2mp4.js';
import fetch from 'node-fetch'

let handler = async (m, { conn, args, usedPrefix, command }) => {

  const chat = global.db.data.users[m.sender] || {}
  if (!chat.registered) {
    const thumbUrl = 'https://files.catbox.moe/k45sr6.jpg'
    const thumbBuffer = await fetch(thumbUrl).then(res => res.buffer())

    const fkontak = {
      key: { participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
      message: { locationMessage: { name: '🎄 REGISTRO | SHADOW BOT 💫', jpegThumbnail: thumbBuffer } },
      participant: '0@s.whatsapp.net'
    }

    const productMessage = {
      product: {
        productImage: { url: thumbUrl },
        productId: '999999999999999',
        title: `꒰ঌ*˚🎄 ˗ˏˋ REGISTRO ˎˊ˗ 🎁 ꒱`,
        description: `👋 Hola ${m.pushName || 'usuario'}\n\n🌌 Para usar el comando necesitas registrarte.\n\nUsa: *${usedPrefix}register nombre.edad*`,
        currencyCode: 'USD',
        priceAmount1000: '000000',
        retailerId: 1677,
        url: `https://wa.me/${m.sender.split('@')[0]}`,
        productImageCount: 1
      },
      businessOwnerJid: m.sender,
      caption: `🎄 Registro requerido`,
      footer: `🌌 Shadow Bot`,
      interactiveButtons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '📝 Registrarse',
            id: `${usedPrefix}register`
          })
        }
      ],
      mentions: [m.sender]
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
              thumbnailUrl: 'https://files.catbox.moe/1ric0g.jpg' 
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
