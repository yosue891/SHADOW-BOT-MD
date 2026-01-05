let proposals = {}
let proposalTimers = {}
let marriages = {}

function tag(jid) {
  return '@' + jid.split('@')[0]
}

function clearProposalTimer(jid) {
  if (proposalTimers[jid]) {
    clearTimeout(proposalTimers[jid])
    delete proposalTimers[jid]
  }
}

const marryHandler = async (m, { conn, usedPrefix, command }) => {
  const userId = m.sender

  // 💍 PROPUESTA
  if (['marry', 'casarse'].includes(command)) {
    const partnerId = m.mentionedJid?.[0] || m.quoted?.sender
    if (!partnerId) return conn.reply(m.chat, `💍 Menciona o responde al mensaje de la persona para proponer matrimonio.`, m)
    if (partnerId === userId) return conn.reply(m.chat, '💔 No puedes casarte contigo mismo.', m)
    if (marriages[userId] || marriages[partnerId]) return conn.reply(m.chat, '⚠️ Uno de los dos ya está casado.', m)

    proposals[userId] = partnerId
    clearProposalTimer(userId)

    await conn.sendMessage(m.chat, {
      text: `💌 Propuesta enviada a ${tag(partnerId)}\n⏳ Tienes 49 segundos para responder.`,
      mentions: [partnerId],
      buttons: [
        { buttonId: `aceptar|${userId}`, buttonText: { displayText: '✅ Aceptar' }, type: 1 },
        { buttonId: `rechazar|${userId}`, buttonText: { displayText: '❌ Rechazar' }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })

    proposalTimers[userId] = setTimeout(() => {
      if (proposals[userId] === partnerId) {
        delete proposals[userId]
        clearProposalTimer(userId)
        conn.reply(m.chat, `⌛『☽』 El matrimonio fue cancelado.\nLas sombras se burlan de tu soledad, ${tag(userId)}. Te dejaron plantado XD.`, null, { mentions: [userId] })
      }
    }, 49 * 1000)

    return
  }

  // 💔 DIVORCIO
  if (['divorce', 'divorciarse'].includes(command)) {
    if (!marriages[userId]) return conn.reply(m.chat, `💔 No estás casado...`, m)
    const ex = marriages[userId]
    delete marriages[userId]
    delete marriages[ex]
    return conn.reply(m.chat, `💔 Divorcio realizado.\n${tag(userId)} y ${tag(ex)} ya no están casados.`, m, { mentions: [userId, ex] })
  }
}

marryHandler.command = ['marry', 'casarse', 'divorce', 'divorciarse']
marryHandler.group = true
export default marryHandler

// Exportamos también las estructuras para que otro handler las use
export { proposals, proposalTimers, marriages, clearProposalTimer, tag }
