let proposals = {}
let marriages = {}
let proposalTimers = {}

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
  const mentioned = m.mentionedJid?.[0] || m.quoted?.sender
  const selected = m?.message?.buttonsResponseMessage?.selectedButtonId || m.selectedButtonId
  const [cmdFromButton, proposerId] = selected?.includes('|') ? selected.split('|') : []

  // DIVORCIO
  if (['divorce', 'divorciarse'].includes(command)) {
    if (!marriages[userId]) return conn.reply(m.chat, '💔 No estás casado...', m)
    const ex = marriages[userId]
    delete marriages[userId]
    delete marriages[ex]
    return conn.reply(m.chat, `💔 Divorcio realizado.\n${tag(userId)} y ${tag(ex)} ya no están casados.`, m, { mentions: [userId, ex] })
  }

  // PROPUESTA
  if (['marry', 'casarse'].includes(command)) {
    const partnerId = mentioned
    if (!partnerId) return conn.reply(m.chat, '💍 Menciona o responde al mensaje de la persona para proponer matrimonio.', m)
    if (partnerId === userId) return conn.reply(m.chat, '💔 No puedes casarte contigo mismo.', m)
    if (marriages[userId] || marriages[partnerId]) return conn.reply(m.chat, '⚠️ Uno de los dos ya está casado.', m)

    if (proposals[partnerId] === userId) {
      marriages[userId] = partnerId
      marriages[partnerId] = userId
      delete proposals[partnerId]
      clearProposalTimer(partnerId)
      return conn.sendMessage(m.chat, {
        image: { url: 'https://files.catbox.moe/zbyywc.jpg' },
        caption: `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(partnerId)} ahora están oficialmente casados.`,
        mentions: [userId, partnerId]
      }, { quoted: m })
    }

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
        conn.reply(m.chat, `⌛『☽』 El matrimonio fue cancelado.\nLas sombras se burlan de tu soledad, ${tag(userId)}. Te dejaron plantado XD.`, null, { mentions: [userId] })
      }
    }, 49 * 1000)

    return
  }

  // ACEPTAR
  if (command === 'aceptar' || cmdFromButton === 'aceptar') {
    const proposer = proposerId || args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes ninguna propuesta pendiente de esa persona.', m)

    marriages[userId] = proposer
    marriages[proposer] = userId
    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.sendMessage(m.chat, {
      image: { url: 'https://files.catbox.moe/zbyywc.jpg' },
      caption: `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(proposer)} ahora están oficialmente casados.`,
      mentions: [userId, proposer]
    }, { quoted: m })
  }

  // RECHAZAR
  if (command === 'rechazar' || cmdFromButton === 'rechazar') {
    const proposer = proposerId || args[0]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    if (!proposer || proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes ninguna propuesta pendiente de esa persona.', m)

    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.reply(m.chat, `💔 『☽』 ${tag(userId)} ha rechazado la propuesta de ${tag(proposer)}.`, m, { mentions: [userId, proposer] })
  }
}

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse', 'aceptar', 'rechazar']
handler.group = true
export default handler
