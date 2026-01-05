let proposals = {};
let marriages = {};

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const userId = m.sender;
  const mentioned = m.mentionedJid[0];
  const input = args[0];
  const partnerId = mentioned || (input?.includes('@') ? input.replace('@', '') + '@s.whatsapp.net' : null);

  // 💔 DIVORCIO
  if (command === 'divorce' || command === 'divorciarse') {
    if (!marriages[userId]) {
      return conn.reply(m.chat, `💔 *No estás casado...*\nUsa:\n> *${usedPrefix}marry @usuario*`, m);
    }
    const ex = marriages[userId];
    delete marriages[userId];
    delete marriages[ex];
    return conn.reply(m.chat, `💔 *Divorcio realizado.*\n@${userId.split('@')[0]} y @${ex.split('@')[0]} ya no están casados.`, m, { mentions: [userId, ex] });
  }

  // 💍 PROPUESTA DE MATRIMONIO
  if (command === 'marry' || command === 'casarse') {
    if (!partnerId) return conn.reply(m.chat, `💍 *¿Con quién deseas casarte?*\nUsa:\n> *${usedPrefix}marry @usuario*`, m);
    if (partnerId === userId) return conn.reply(m.chat, '💔 *No puedes casarte contigo mismo.*', m);
    if (marriages[userId] || marriages[partnerId]) return conn.reply(m.chat, '⚠️ *Uno de los dos ya está casado.*', m);

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

    // Cancelación automática a los 49 segundos
    setTimeout(() => {
      if (proposals[userId] === partnerId) {
        delete proposals[userId];
        conn.reply(m.chat, `⌛ *El matrimonio fue cancelado...*\n@${partnerId.split('@')[0]} te dejó plantado XD`, null, { mentions: [userId, partnerId] });
      }
    }, 49 * 1000);
  }

  // ✅ ACEPTAR PROPUESTA
  if (command === 'aceptar') {
    const proposer = args[0] ? args[0] + '@s.whatsapp.net' : null;
    if (!proposer) return conn.reply(m.chat, `⚠️ *Debes usar el botón para aceptar.*`, m);
    if (proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ *No tienes ninguna propuesta pendiente de esa persona.*', m);

    marriages[userId] = proposer;
    marriages[proposer] = userId;
    delete proposals[proposer];
    delete proposals[userId];

    return conn.reply(m.chat, `💒 *¡Felicitaciones!*\n@${userId.split('@')[0]} y @${proposer.split('@')[0]} ahora están oficialmente casados.`, m, { mentions: [userId, proposer] });
  }

  // ❌ RECHAZAR PROPUESTA
  if (command === 'rechazar') {
    const proposer = args[0] ? args[0] + '@s.whatsapp.net' : null;
    if (!proposer) return conn.reply(m.chat, `⚠️ *Debes usar el botón para rechazar.*`, m);
    if (proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ *No tienes ninguna propuesta pendiente de esa persona.*', m);

    delete proposals[proposer];
    return conn.reply(m.chat, `💔 @${userId.split('@')[0]} ha rechazado la propuesta de @${proposer.split('@')[0]}.`, m, { mentions: [userId, proposer] });
  }
};

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse', 'aceptar', 'rechazar'];
handler.group = true;
export default handler;
