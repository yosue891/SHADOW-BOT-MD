// marriage.js — Shadow Garden edition (robusto con menciones y botones)

let proposals = {}        // { proposerJid: partnerJid }
let proposalTimers = {}   // { proposerJid: timeoutHandle }
let marriages = {}        // { jid: partnerJid }

/**
 * Obtiene un JID válido del contexto (mención, reply, args, botón)
 */
function getTargetId(m, args) {
  // 1) Mención directa
  if (m.mentionedJid && m.mentionedJid[0]) return m.mentionedJid[0]

  // 2) Mención dentro de contextInfo (algunos wrappers)
  const ci = m?.message?.extendedTextMessage?.contextInfo
  if (ci?.mentionedJid?.[0]) return ci.mentionedJid[0]

  // 3) Responder al mensaje de la persona (reply)
  if (m.quoted?.sender) return m.quoted.sender

  // 4) Botón con payload (selectedButtonId)
  const selected = m?.message?.buttonsResponseMessage?.selectedButtonId || m.selectedButtonId
  if (selected && selected.includes('|')) {
    const [, jid] = selected.split('|')
    if (jid && jid.endsWith('@s.whatsapp.net')) return jid
  }

  // 5) Arg tipo número (fallback muy controlado)
  const a0 = args?.[0]
  if (a0 && /^\d{5,16}$/.test(a0)) return `${a0}@s.whatsapp.net`

  return null
}

/**
 * Muestra @username sin dominio
 */
function tag(jid) {
  return `@${String(jid).split('@')[0]}`
}

/**
 * Cancela y limpia timers
 */
function clearProposalTimer(proposer) {
  try {
    if (proposalTimers[proposer]) {
      clearTimeout(proposalTimers[proposer])
      delete proposalTimers[proposer]
    }
  } catch {}
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const userId = m.sender

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
    const partnerId = getTargetId(m, args)
    if (!partnerId) {
      return conn.reply(
        m.chat,
        `💍 Menciona con @ o responde al mensaje de la persona para proponer matrimonio.`,
        m
      )
    }
    if (partnerId === userId) return conn.reply(m.chat, '💔 No puedes casarte contigo mismo.', m)
    if (marriages[userId] || marriages[partnerId]) return conn.reply(m.chat, '⚠️ Uno de los dos ya está casado.', m)

    // Si la otra persona ya te propuso, se casa directo
    if (proposals[partnerId] === userId) {
      marriages[userId] = partnerId
      marriages[partnerId] = userId
      delete proposals[partnerId]
      clearProposalTimer(partnerId)
      return conn.reply(
        m.chat,
        `💒 『☽』 Las sombras han unido sus destinos.\n${tag(userId)} y ${tag(partnerId)} ahora están oficialmente casados.`,
        m,
        { mentions: [userId, partnerId] }
      )
    }

    // Nueva propuesta
    proposals[userId] = partnerId
    clearProposalTimer(userId)

    // Botones con payload seguro: incluir proposerJid
    await conn.sendMessage(m.chat, {
      text: `💌 Propuesta enviada a ${tag(partnerId)}\n⏳ Tienes 49 segundos para responder.`,
      mentions: [partnerId],
      buttons: [
        { buttonId: `${usedPrefix}aceptar|${userId}`, buttonText: { displayText: '✅ Aceptar' }, type: 1 },
        { buttonId: `${usedPrefix}rechazar|${userId}`, buttonText: { displayText: '❌ Rechazar' }, type: 1 }
      ],
      headerType: 1
    }, { quoted: m })

    // Expiración a los 49s
    proposalTimers[userId] = setTimeout(() => {
      if (proposals[userId] === partnerId) {
        delete proposals[userId]
        clearProposalTimer(userId)
        conn.reply(
          m.chat,
          `⌛『☽』 El matrimonio fue cancelado.\nLas sombras se burlan de tu soledad, ${tag(userId)}. Te dejaron plantado XD.`,
          null,
          { mentions: [userId] }
        )
      }
    }, 49 * 1000)

    return
  }

  // ✅ ACEPTAR
  if (command === 'aceptar') {
    // Recuperar proposer desde botón o mención/reply
    const proposer = getTargetId(m, args)
    if (!proposer) return conn.reply(m.chat, '⚠️ Usa el botón Aceptar de la propuesta.', m)
    if (proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)

    marriages[userId] = proposer
    marriages[proposer] = userId
    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.reply(
      m.chat,
      `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(proposer)} ahora están oficialmente casados.`,
      m,
      { mentions: [userId, proposer] }
    )
  }

  // ❌ RECHAZAR
  if (command === 'rechazar') {
    const proposer = getTargetId(m, args)
    if (!proposer) return conn.reply(m.chat, '⚠️ Usa el botón Rechazar de la propuesta.', m)
    if (proposals[proposer] !== userId) return conn.reply(m.chat, '⚠️ No tienes una propuesta pendiente de esa persona.', m)

    delete proposals[proposer]
    clearProposalTimer(proposer)

    return conn.reply(
      m.chat,
      `💔 『☽』 ${tag(userId)} ha rechazado la propuesta de ${tag(proposer)}.`,
      m,
      { mentions: [userId, proposer] }
    )
  }
}

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse', 'aceptar', 'rechazar']
handler.group = true
export default handler
