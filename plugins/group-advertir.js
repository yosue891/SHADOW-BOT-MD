import axios from 'axios';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const handler = async (m, { conn, text, command, usedPrefix }) => {
  const emoji = '⚠️';
  const maxWarn = 3;

  const isUserRegistered = global.db.data.users[m.sender]?.registered;
  if (!isUserRegistered) {
    const img = 'https://files.catbox.moe/88n20k.jpg';
    const res = await axios.get(img, { responseType: 'arraybuffer' });
    const imgBuffer = Buffer.from(res.data);

    const orderMessage = {
      orderId: 'REGISTRO-' + Date.now(),
      thumbnail: imgBuffer,
      itemCount: 1,
      status: 1,
      surface: 1,
      message:
        `🕸️ *ACCESO DENEGADO POR LAS SOMBRAS*\n\n` +
        `Hola @${m.sender.split('@')[0]}, para usar este comando debes estar registrado.\n\n` +
        `🔐 Usa *${usedPrefix}reg shadow.18* para unirte al Reino.`,
      orderTitle: 'Registro Denegado - Shadow Garden',
      totalAmount1000: '0',
      totalCurrencyCode: 'GTQ',
      contextInfo: {
        mentionedJid: [m.sender],
        externalAdReply: {
          title: 'Shadow Bot uwu',
          thumbnailUrl: img,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    };

    const msg = generateWAMessageFromContent(m.chat, { orderMessage }, { quoted: m });
    return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  }

  let who;
  if (m.isGroup) {
    who = m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false;
  } else {
    who = m.chat;
  }

  if (!who) return conn.reply(m.chat, `${emoji} Etiqueta o responde a alguien para advertir.`, m);

  const botJid = conn.user.jid;
  if (who === botJid) return conn.reply(m.chat, `${emoji} No puedo advertirme a mí mismo, sombras.`, m);
  if (who === m.sender) return conn.reply(m.chat, `${emoji} No puedes advertirte a ti mismo.`, m);

  try {
    const owners = (global.owner || []).map(v => Array.isArray(v) ? v[0] : v).filter(Boolean);
    const whoNumber = who.split('@')[0];
    if (owners.includes(whoNumber)) return conn.reply(m.chat, `🌌❄️ No se puede advertir a un propietario.`, m);
  } catch {}

  const dReason = 'Sin motivo';
  const msgtext = text || dReason;
  const sdms = msgtext.replace(/@\d{5,}[^\s]*/g, '').trim();

  global.db.data.users[who] = global.db.data.users[who] || {};
  const user = global.db.data.users[who];
  user.warn = (user.warn || 0) + 1;

  await conn.sendMessage(m.chat, { react: { text: '🌑', key: m.key } });

  const imgWarn = 'https://files.catbox.moe/88n20k.jpg';
  const resWarn = await axios.get(imgWarn, { responseType: 'arraybuffer' });
  const imgBufferWarn = Buffer.from(resWarn.data);

  const orderMessageWarn = {
    orderId: 'WARN-' + Date.now(),
    thumbnail: imgBufferWarn,
    itemCount: 1,
    status: 1,
    surface: 1,
    message:
      `🌌 *Advertencia invocada por el Shadow Garden*\n` +
      `🕯️ *Usuario:* @${who.split('@')[0]}\n` +
      `🕯️ *Motivo:* ${sdms}\n` +
      `🕯️ *Advertencias:* ${user.warn}/${maxWarn}`,
    orderTitle: '🌑 Ritual de Advertencia',
    totalAmount1000: '0',
    totalCurrencyCode: 'GTQ',
    contextInfo: {
      mentionedJid: [who],
      externalAdReply: {
        title: 'Shadow Bot uwu',
        thumbnailUrl: imgWarn,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  };

  const msgWarn = generateWAMessageFromContent(m.chat, { orderMessage: orderMessageWarn }, { quoted: m });
  await conn.relayMessage(m.chat, msgWarn.message, { messageId: msgWarn.key.id });

  if (user.warn >= maxWarn) {
    user.warn = 0;
    await conn.reply(m.chat, `${emoji} @${who.split('@')[0]} sellado fuera del grupo.\n🌑 Límite: ${maxWarn}`, m, { mentions: [who] });
    await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
  }

  return true;
};

handler.command = ['advertir', 'advertencia', 'warn', 'warning'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
