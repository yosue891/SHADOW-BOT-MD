import axios from 'axios';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const handler = async (m, { conn, text, command, usedPrefix }) => {
  const emoji = '⚠️';
  const maxWarn = 3;

  const userSender = global.db.data.users[m.sender];
  if (!userSender || !userSender.registered) {
    const img = 'https://files.catbox.moe/88n20k.jpg';
    const res = await axios.get(img, { responseType: 'arraybuffer' });
    const imgBuffer = Buffer.from(res.data);

    const orderMessage = {
      orderId: 'REGISTRO-' + Date.now(),
      thumbnail: imgBuffer,
      itemCount: 1,
      status: 1,
      surface: 1,
      message: `🕸️ *ACCESO DENEGADO*\n\nHola @${m.sender.split('@')[0]}, debes estar registrado.\n\n🔐 Usa: *${usedPrefix}reg shadow.18*`,
      orderTitle: 'Registro Requerido',
      totalAmount1000: '0',
      totalCurrencyCode: 'GTQ',
      contextInfo: {
        mentionedJid: [m.sender],
        externalAdReply: {
          title: 'Shadow Bot',
          thumbnailUrl: img,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    };
    const msg = generateWAMessageFromContent(m.chat, { orderMessage }, { quoted: m });
    return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  }

  let who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false;
  if (!who && text) who = text.replace(/[@ .+-]/g, '') + '@s.whatsapp.net';
  
  if (!who) return conn.reply(m.chat, `${emoji} Etiqueta a alguien o responde a un mensaje.`, m);

  const userName = await conn.getName(who);
  const userTag = `@${who.split('@')[0]}`;

  const imgPath = 'https://files.catbox.moe/88n20k.jpg';
  const resImg = await axios.get(imgPath, { responseType: 'arraybuffer' });
  const imgBuffer = Buffer.from(resImg.data);

  // --- COMANDO QUITAR ADVERTENCIAS (UNWARN) ---
  if (command === 'unwarn' || command === 'delwarn' || command === 'quitarwarn') {
    global.db.data.users[who] = global.db.data.users[who] || {};
    global.db.data.users[who].warn = 0;

    await m.react('✨');

    const orderMessageUnwarn = {
      orderId: 'UNWARN-' + Date.now(),
      thumbnail: imgBuffer,
      itemCount: 1,
      status: 1,
      surface: 1,
      message: `✨ *PURIFICACIÓN SOMBRÍA*\n\n🕯️ *Usuario:* ${userName}\n🕯️ *Estado:* Libre de pecados\n\n@${who.split('@')[0]} has sido liberado de las advertencias por las sombras. 🌑`,
      orderTitle: '✨ Absolución de Advertencias',
      totalAmount1000: '0',
      totalCurrencyCode: 'GTQ',
      contextInfo: {
        mentionedJid: [who],
        externalAdReply: {
          title: 'Shadow Bot',
          thumbnailUrl: imgPath,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    };

    const msgUnwarn = generateWAMessageFromContent(m.chat, { orderMessage: orderMessageUnwarn }, { quoted: m });
    return await conn.relayMessage(m.chat, msgUnwarn.message, { messageId: msgUnwarn.key.id });
  }

  // --- LÓGICA DE ADVERTIR (WARN) ---
  const botJid = conn.user.jid;
  if (who === botJid) return conn.reply(m.chat, `${emoji} No puedo advertirme a mí mismo.`, m);
  if (who === m.sender) return conn.reply(m.chat, `${emoji} No puedes advertirte a ti mismo.`, m);

  const owners = (global.owner || []).map(v => Array.isArray(v) ? v[0] : v).filter(Boolean);
  if (owners.includes(who.split('@')[0])) return conn.reply(m.chat, `🌌 No se puede advertir a un Owner.`, m);

  const dReason = 'Sin motivo';
  const msgtext = text || dReason;
  const sdms = msgtext.replace(/@\d{5,}[^\s]*/g, '').trim() || dReason;

  global.db.data.users[who] = global.db.data.users[who] || {};
  const user = global.db.data.users[who];
  user.warn = (user.warn || 0) + 1;

  await m.react('🌑');

  const orderMessageWarn = {
    orderId: 'WARN-' + Date.now(),
    thumbnail: imgBuffer,
    itemCount: 1,
    status: 1,
    surface: 1,
    message: `🌌 *ADVERTENCIA*\n\n🕯️ *Usuario:* ${userName}\n🕯️ *Motivo:* ${sdms}\n🕯️ *Advertencias:* ${user.warn}/${maxWarn}`,
    orderTitle: 'Ritual de Advertencia',
    totalAmount1000: '0',
    totalCurrencyCode: 'GTQ',
    contextInfo: {
      mentionedJid: [who],
      externalAdReply: {
        title: 'Shadow Bot',
        thumbnailUrl: imgPath,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  };

  const msgWarn = generateWAMessageFromContent(m.chat, { orderMessage: orderMessageWarn }, { quoted: m });
  await conn.relayMessage(m.chat, msgWarn.message, { messageId: msgWarn.key.id });

  // Expulsión automática
  if (user.warn >= maxWarn) {
    user.warn = 0;
    await conn.reply(m.chat, `${emoji} ${userTag} ha sido sellado fuera del Reino por acumular ${maxWarn} advertencias.`, m, { mentions: [who] });
    await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
  }

  return true;
};

handler.command = ['advertir', 'advertencia', 'warn', 'unwarn', 'quitarwarn', 'delwarn'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
