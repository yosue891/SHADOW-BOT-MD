import axios from 'axios';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const handler = async (m, { conn, text, args, command, usedPrefix, participants, groupMetadata }) => {
  const emoji = '⚠️';
  const maxWarn = 3;

  const normalizeJid = (jid) => {
    if (!jid) return '';
    if (typeof jid === 'object') jid = jid.lid || jid.jid || jid.id || '';
    try { jid = conn?.decodeJid?.(jid) || jid; } catch {}
    return String(jid || '').trim().replace(/:\d+@/, '@').toLowerCase();
  };
  const onlyDigits = (v) => String(v || '').replace(/\D/g, '');
  const participantNums = (p) => [
    p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.pn, p?.phone
  ].filter(Boolean).map((x) => onlyDigits(String(x).split('@')[0]));

  const resolveToRealJid = (jid) => {
    jid = normalizeJid(jid);
    if (!jid) return '';
    const list = participants || groupMetadata?.participants || [];
    if (jid.endsWith('@lid') && Array.isArray(list) && list.length) {
      const target = onlyDigits(jid.split('@')[0]);
      for (const p of list) {
        const nums = participantNums(p);
        if (nums.includes(target)) {
          const real = p.jid || p.id || p.phoneNumber;
          if (real && !String(real).endsWith('@lid')) return normalizeJid(real);
        }
      }
      const cached = onlyDigits(jid.split('@')[0]);
      if (cached) return `${cached}@s.whatsapp.net`;
      return jid;
    }
    return jid;
  };

  const collectFromObject = (obj, out = [], depth = 0) => {
    if (!obj || depth > 6) return out;
    if (Array.isArray(obj)) {
      for (const v of obj) collectFromObject(v, out, depth + 1);
      return out;
    }
    if (typeof obj !== 'object') return out;
    if (Array.isArray(obj.mentionedJid)) {
      for (const j of obj.mentionedJid) if (j) out.push(j);
    }
    if (obj.contextInfo && typeof obj.contextInfo === 'object') {
      collectFromObject(obj.contextInfo, out, depth + 1);
    }
    for (const k of ['message', 'msg', 'quotedMessage', 'ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'extendedTextMessage']) {
      if (obj[k]) collectFromObject(obj[k], out, depth + 1);
    }
    return out;
  };

  const getRawMentions = async () => {
    let raw = [];
    try {
      let mj = m.mentionedJid;
      if (mj && typeof mj.then === 'function') mj = await mj;
      if (Array.isArray(mj) && mj.length) raw.push(...mj);
    } catch {}
    if (!raw.length) {
      try {
        const direct = m.msg?.contextInfo?.mentionedJid;
        if (Array.isArray(direct) && direct.length) raw.push(...direct);
      } catch {}
    }
    if (!raw.length) {
      const found = collectFromObject(m.message || {});
      if (found.length) raw.push(...found);
    }
    if (!raw.length) {
      const found2 = collectFromObject(m.msg || {});
      if (found2.length) raw.push(...found2);
    }
    return [...new Set(raw.filter(Boolean))];
  };

  const userSender = global.db.data.users[m.sender];
  if (!userSender || !userSender.registered) {
    const img = 'https://u.pone.rs/pnksaqyp.jpg';
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
        mentionedJid: [m.sender]
      }
    };

    const msg = generateWAMessageFromContent(m.chat, { orderMessage }, { quoted: m });
    return await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  }

  let who = null;

  const rawMentions = await getRawMentions();
  if (rawMentions.length) {
    who = resolveToRealJid(rawMentions[0]);
  }

  if (!who && m.quoted) {
    const q = m.quoted.sender || m.quoted.participant || m.quoted.key?.participant || m.quoted.key?.remoteJid;
    if (q && !String(q).endsWith('@g.us')) who = resolveToRealJid(q);
  }

  if (!who) {
    const list = participants || groupMetadata?.participants || [];
    const candidates = [];
    if (Array.isArray(args) && args.length) candidates.push(...args);
    if (text) candidates.push(...String(text).split(/\s+/));
    for (const c of candidates) {
      const digits = onlyDigits(c);
      if (digits.length >= 7 && digits.length <= 15) {
        if (Array.isArray(list) && list.length) {
          const found = list.find((p) => participantNums(p).some((n) => n === digits || n.endsWith(digits) || digits.endsWith(n)));
          if (found) {
            const real = found.jid || found.id || found.phoneNumber;
            if (real) { who = normalizeJid(real); break; }
          }
        }
        who = `${digits}@s.whatsapp.net`;
        break;
      }
    }
  }

  if (!who || who.includes('@g.us')) {
    return conn.reply(m.chat, `${emoji} Responde al mensaje de alguien o menciónalo para poder advertirlo.`, m);
  }

  who = resolveToRealJid(who);
  if (!who.endsWith('@s.whatsapp.net') && !who.endsWith('@lid')) {
    who = `${onlyDigits(who.split('@')[0])}@s.whatsapp.net`;
  }

  let userName = 'Usuario';
  try {
    userName = global.db.data.users[who]?.name || await conn.getName(who) || `+${onlyDigits(who.split('@')[0])}`;
  } catch { userName = `+${onlyDigits(who.split('@')[0])}`; }

  const imgPath = 'https://u.pone.rs/pnksaqyp.jpg';
  const resImg = await axios.get(imgPath, { responseType: 'arraybuffer' });
  const imgBuffer = Buffer.from(resImg.data);

  if (['unwarn', 'delwarn', 'quitarwarn'].includes(command)) {
    global.db.data.users[who] = global.db.data.users[who] || {};
    global.db.data.users[who].warn = 0;
    await m.react('✨');

    const orderMessageUnwarn = {
      orderId: 'UNWARN-' + Date.now(),
      thumbnail: imgBuffer,
      itemCount: 1,
      status: 1,
      surface: 1,
      message: `✨ *PURIFICACIÓN SOMBRÍA*\n\n🕯️ *Usuario:* ${userName}\n🕯️ *Estado:* Libre de pecados`,
      orderTitle: '✨ Absolución',
      totalAmount1000: '0',
      totalCurrencyCode: 'GTQ',
      contextInfo: {
        mentionedJid: [who]
      }
    };

    const msgUnwarn = generateWAMessageFromContent(m.chat, { orderMessage: orderMessageUnwarn }, { quoted: m });
    return await conn.relayMessage(m.chat, msgUnwarn.message, { messageId: msgUnwarn.key.id });
  }

  const botJidNorm = normalizeJid(String(conn.user?.jid || conn.user?.id || ''));
  const senderNorm = normalizeJid(m.sender);
  const whoNorm = normalizeJid(who);
  if (whoNorm === botJidNorm) return conn.reply(m.chat, `${emoji} No puedo advertirme a mí mismo.`, m);
  if (whoNorm === senderNorm) return conn.reply(m.chat, `${emoji} No puedes advertirte a ti mismo.`, m);

  const owners = (global.owner || []).map((v) => onlyDigits(Array.isArray(v) ? v[0] : v));
  if (owners.includes(onlyDigits(who.split('@')[0]))) return conn.reply(m.chat, `🌌 No se puede advertir a un Owner.`, m);

  global.db.data.users[who] = global.db.data.users[who] || {};
  const user = global.db.data.users[who];
  user.warn = (user.warn || 0) + 1;

  await m.react('🌑');

  let dReason = String(text || '').trim();
  if (Array.isArray(args) && args.length && dReason) {
    const firstDigits = onlyDigits(args[0]);
    if (firstDigits.length >= 7 && dReason.startsWith(args[0])) dReason = dReason.slice(args[0].length).trim();
  }
  dReason = dReason.replace(/@\d+/g, '').trim() || 'Sin motivo';

  const orderMessageWarn = {
    orderId: 'WARN-' + Date.now(),
    thumbnail: imgBuffer,
    itemCount: 1,
    status: 1,
    surface: 1,
    message: `🌌 *ADVERTENCIA*\n\n🕯️ *Usuario:* ${userName}\n🕯️ *Motivo:* ${dReason}\n🕯️ *Advertencias:* ${user.warn}/${maxWarn}`,
    orderTitle: 'Ritual de Advertencia',
    totalAmount1000: '0',
    totalCurrencyCode: 'GTQ',
    contextInfo: {
      mentionedJid: [who]
    }
  };

  const msgWarn = generateWAMessageFromContent(m.chat, { orderMessage: orderMessageWarn }, { quoted: m });
  await conn.relayMessage(m.chat, msgWarn.message, { messageId: msgWarn.key.id });

  if (user.warn >= maxWarn) {
    user.warn = 0;

    await conn.reply(
      m.chat,
      `${emoji} *${userName}* ha sido sellado fuera del Reino por alcanzar el límite de advertencias.`,
      null
    );

    await new Promise(r => setTimeout(r, 1500));

    try {
      await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
    } catch {
      await conn.reply(m.chat, `⚠️ No pude expulsar al usuario.`, m);
    }
  }

  return true;
};

handler.command = ['advertir', 'advertencia', 'warn', 'unwarn', 'quitarwarn', 'delwarn'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
