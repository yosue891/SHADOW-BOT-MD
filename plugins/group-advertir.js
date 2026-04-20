import axios from 'axios';

const maxWarn = 3;

export async function before(m, { conn, isAdmin, isBotAdmin, isMods, isOwner }) {
  if (!m.isGroup) return;
  if (!m.text) return;

  const chat = global.db.data.chats[m.chat];
  if (!chat.warnsystem) chat.warnsystem = true;

  if (!chat.warnsystem) return;

  let who = m.mentionedJid && m.mentionedJid[0] 
    ? m.mentionedJid[0] 
    : m.quoted 
      ? m.quoted.sender 
      : false;

  if (!who) return;

  const user = global.db.data.users[who] || {};
  const userName = user.name || conn.getName(who) || 'Usuario';

  if (isOwner || isMods) return;
  if (who === conn.user.jid) return;
  if (who === m.sender) return;

  user.warn = (user.warn || 0) + 1;
  global.db.data.users[who] = user;

  const img = 'https://files.catbox.moe/88n20k.jpg';
  const res = await axios.get(img, { responseType: 'arraybuffer' });
  const imgBuffer = Buffer.from(res.data);

  const warnMsg = {
    orderId: 'WARN-' + Date.now(),
    thumbnail: imgBuffer,
    itemCount: 1,
    status: 1,
    surface: 1,
    message: `🌌 *ADVERTENCIA*\n\n🕯️ *Usuario:* ${userName}\n🕯️ *Advertencias:* ${user.warn}/${maxWarn}`,
    orderTitle: 'Ritual de Advertencia',
    totalAmount1000: '0',
    totalCurrencyCode: 'GTQ',
    contextInfo: {
      mentionedJid: [who],
      externalAdReply: {
        title: 'Shadow Bot',
        thumbnailUrl: img,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  };

  const msg = await conn.sendMessage(m.chat, { forward: warnMsg }, { quoted: m });

  if (user.warn >= maxWarn) {
    user.warn = 0;

    await conn.reply(
      m.chat,
      `⚠️ *${userName}* ha sido sellado fuera del Reino por alcanzar el límite de advertencias.`,
      null
    );

    await new Promise(r => setTimeout(r, 1500));

    try {
      await conn.groupParticipantsUpdate(m.chat, [who], 'remove');
    } catch {
      await conn.reply(m.chat, `⚠️ No pude expulsar al usuario.`, m);
    }
  }
}
