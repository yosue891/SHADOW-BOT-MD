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

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const userId = m.sender

  // ⚡ Detectar botones
  const selected = m?.message?.buttonsResponseMessage?.selectedButtonId || m.selectedButtonId
  if (selected) {
    const [cmd, proposerId] = selected.split('|')
    if (cmd === `${usedPrefix}aceptar`) {
      command = 'aceptar'
      args = [proposerId]
    } else if (cmd === `${usedPrefix}rechazar`) {
      command = 'rechazar'
      args = [proposerId]
    }
  }

  // 💔 DIVORCIO
  if (['divorce', 'divorciarse'].includes(command)) {
    if (!marriages[userId]) return conn.reply(m.chat, `💔 No estás casado...`, m)
    const ex = marriages[userId]
    delete marriages[userId]
    delete marriages[ex]
    return conn.reply(m.chat, `💔 Divorcio realizado.\n${tag(userId)} y ${tag(ex)} ya no están casados.`, m, { mentions: [userId, ex] })
  }

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
        { buttonId: `${usedPrefix}aceptar|${userId}`, buttonText: { displayText: '✅ Aceptar' }, type: 1 },
        { buttonId: `${usedPrefix}rechazar|${userId}`, buttonText: { displayText: '❌ Rechazar' }, type: 1 }
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

  // ✅ ACEPTAR
  if (command === 'aceptar') {
    const proposer = args[0] ? args[0] : null
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)

    marriages[userId] = proposer
    marriages[proposer] = userId
    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.reply(m.chat, `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(proposer)} ahora están oficialmente casados.`, m, { mentions: [userId, proposer] })
  }

  // ❌ RECHAZAR
  if (command === 'rechazar') {
    const proposer = args[0] ? args[0] : null
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)

    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.reply(m.chat, `💔 『☽』 ${tag(userId)} ha rechazado la propuesta de ${tag(proposer)}.`, m, { mentions: [userId, proposer] })
  }
}

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse', 'aceptar', 'rechazar']
handler.group = true
export default handler
