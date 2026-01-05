let proposals = {};
let marriages = {};

const handler = async (m, { conn, usedPrefix, command }) => {
  const userId = m.sender;
  const mentioned = m.mentionedJid?.[0];

  // 💔 DIVORCIO
  if (command === 'divorce' || command === 'divorciarse') {
    if (!marriages[userId]) return conn.reply(m.chat, `💔 No estás casado...`, m);
    const ex = marriages[userId];
    delete marriages[userId];
    delete marriages[ex];
    return conn.reply(m.chat, `💔 Divorcio realizado.\n@${userId.split('@')[0]} y @${ex.split('@')[0]} ya no están casados.`, m, { mentions: [userId, ex] });
  }

  // 💍 PROPUESTA
  if (command === 'marry' || command === 'casarse') {
    if (!mentioned) return conn.reply(m.chat, `💍 Menciona a alguien tocando su nombre para proponer matrimonio.`, m);
    const partnerId = mentioned;
    if (partnerId === userId) return conn.reply(m.chat, '💔 No puedes casarte contigo mismo.', m);
    if (marriages[userId] || marriages[partnerId]) return conn.reply(m.chat, '⚠️ Uno de los dos ya está casado.', m);

    proposals[userId] = partnerId;

    await conn.sendMessage(m.chat, {
      text: `💌 *Propuesta enviada a @${partnerId.split('@')[0]}*\n⏳ Tienes 49 segundos para responder.`,
      mentions: [partnerId],
      buttons: [
        { buttonId: `${usedPrefix}aceptar ${userId}`, buttonText: { displayText: '✅ Aceptar' }, type: 1 },
        { buttonId: `${usedPrefix}rechazar ${userId}`, buttonText: { displayText: '❌ Rechazar' }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m });

    setTimeout(() => {
      if (proposals[userId] === partnerId) {
        delete proposals[userId];
        conn.reply(m.chat, `⌛ El matrimonio fue cancelado...\n『☽』 Las sombras se burlan de tu soledad, @${userId.split('@')[0]}.`, null, { mentions: [userId] });
      }
    }, 49 * 1000);
  }

  // ✅ ACEPTAR
  if (command === 'aceptar') {
    const proposer = m.mentionedJid?.[0] || (args[0] ? args[0] + '@s.whatsapp.net' : null);
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes ninguna propuesta pendiente de esa persona.', m);

    marriages[userId] = proposer;
    marriages[proposer] = userId;
    delete proposals[proposer];
    delete proposals[userId];

    return conn.reply(m.chat, `💒 『☽』 Las sombras han unido sus destinos.\n@${userId.split('@')[0]} y @${proposer.split('@')[0]} ahora están oficialmente casados.`, m, { mentions: [userId, proposer] });
  }

  // ❌ RECHAZAR
  if (command === 'rechazar') {
    const proposer = m.mentionedJid?.[0] || (args[0] ? args[0] + '@s.whatsapp.net' : null);
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes ninguna propuesta pendiente de esa persona.', m);

    delete proposals[proposer];
    return conn.reply(m.chat, `💔 『☽』 @${userId.split('@')[0]} ha rechazado la propuesta de @${proposer.split('@')[0]}.`, m, { mentions: [userId, proposer] });
  }
};

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse', 'aceptar', 'rechazar'];
handler.group = true;
export default handler;
