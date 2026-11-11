const normalizeJid = (jid, conn) => {
  if (!jid) return ''
  try {
    jid = conn?.decodeJid?.(jid) || jid
  } catch {}
  return String(jid).trim().replace(/:\d+@/, '@').toLowerCase()
}

const extractNumber = (jid) => {
  if (!jid) return ''
  const base = String(jid).split('@')[0].split(':')[0]
  return base.replace(/\D/g, '')
}

const isSocketActive = (sock) => {
  if (!sock) return false
  const socket = sock.ws?.socket || sock.ws
  const readyState = socket?.readyState
  // 2 = CLOSING, 3 = CLOSED
  return readyState !== 2 && readyState !== 3
}

const getActiveBots = (currentConn) => {
  const botMap = new Map()

  const registerBot = (sock, forceMain = false) => {
    if (!sock || !sock.user || !isSocketActive(sock)) return

    const rawId = sock.user.id || sock.user.jid || ''
    const jid = normalizeJid(rawId, sock)
    const number = extractNumber(jid || rawId)
    if (!number) return

    const canonicalJid = `${number}@s.whatsapp.net`
    const rawLid = sock.user.lid ? normalizeJid(sock.user.lid, sock) : ''
    const lidNumber = extractNumber(rawLid)

    const isMain = forceMain || Boolean(
      (global.conn && sock === global.conn) ||
      (!Array.isArray(global.conns) || !global.conns.includes(sock))
    )

    if (!botMap.has(canonicalJid) || isMain) {
      botMap.set(canonicalJid, {
        sock,
        isMain,
        canonicalJid,
        rawId,
        jid,
        lid: rawLid,
        lidNumber,
        number,
        name: sock.user.name || sock.user.verifiedName || (isMain ? 'Bot Principal' : 'Sub-Bot')
      })
    }
  }

  // 1. Bot principal global
  if (global.conn) registerBot(global.conn, true)

  // 2. Socket actual que atiende la petición (si no es sub-bot o si global.conn no está fijado)
  if (currentConn) {
    const isCurrentMain = global.conn ? currentConn === global.conn : true
    registerBot(currentConn, isCurrentMain)
  }

  // 3. Sub-bots en global.conns
  if (Array.isArray(global.conns)) {
    for (const sub of global.conns) {
      registerBot(sub, false)
    }
  }

  return Array.from(botMap.values())
}

const findTargetBot = (activeBots, { text, args, mentionedJid, quoted, currentConn, participants }) => {
  const cleanText = String(text || '').trim().toLowerCase()
  const firstArg = String(args?.[0] || '').trim().toLowerCase()

  // 1. Palabras clave explícitas para seleccionar el Bot Principal
  const mainKeywords = ['main', 'principal', 'bot', 'prime', 'master', 'primario', '1']
  if (mainKeywords.includes(firstArg) || mainKeywords.includes(cleanText)) {
    return activeBots.find((b) => b.isMain) || activeBots[0] || null
  }

  // 2. Si el usuario ingresó un número telefónico directamente en el texto o argumento
  const textDigits = cleanText.replace(/\D/g, '')
  if (textDigits.length >= 7) {
    const matchedByDigits = activeBots.find((b) => b.number === textDigits || b.number.endsWith(textDigits) || textDigits.endsWith(b.number))
    if (matchedByDigits) return matchedByDigits
  }

  // 3. Recopilar candidatos provenientes de menciones o mensajes citados
  const candidateJids = []
  if (Array.isArray(mentionedJid) && mentionedJid.length > 0) {
    for (const mJid of mentionedJid) {
      if (mJid) candidateJids.push(normalizeJid(mJid, currentConn))
    }
  }

  if (quoted) {
    const quotedSender = quoted.sender || quoted.participant || quoted.key?.participant || quoted.key?.remoteJid
    if (quotedSender) candidateJids.push(normalizeJid(quotedSender, currentConn))
  }

  // 4. Si no hubo mención, citado ni texto, por defecto seleccionar el bot que atiende el comando
  if (candidateJids.length === 0 && !cleanText) {
    const curRaw = currentConn?.user?.jid || currentConn?.user?.id
    const curNum = extractNumber(curRaw)
    const cur = activeBots.find((b) => b.sock === currentConn || (curNum && b.number === curNum))
    if (cur) return cur
    return activeBots.find((b) => b.isMain) || activeBots[0] || null
  }

  // 5. Comparar candidatos contra los bots activos
  for (const candidate of candidateJids) {
    if (!candidate) continue
    const candNum = extractNumber(candidate)

    for (const bot of activeBots) {
      if (bot.canonicalJid === candidate || bot.jid === candidate) return bot
      if (bot.lid && (bot.lid === candidate || (candNum && bot.lidNumber === candNum))) return bot
      if (candNum && bot.number && (bot.number === candNum || bot.number.endsWith(candNum) || candNum.endsWith(bot.number))) return bot
    }

    // 6. Si el candidato es un LID o identificador interno de grupo, buscar en los participantes
    if (Array.isArray(participants) && participants.length > 0) {
      const matchedParticipant = participants.find((p) => {
        const pIds = [p.id, p.jid, p.lid, p.phoneNumber, p.pn, p.phone]
          .filter(Boolean)
          .map((id) => normalizeJid(id, currentConn))
        return pIds.includes(candidate) || (candNum && pIds.some((id) => extractNumber(id) === candNum))
      })

      if (matchedParticipant) {
        const pIds = [matchedParticipant.id, matchedParticipant.jid, matchedParticipant.lid, matchedParticipant.phoneNumber, matchedParticipant.pn, matchedParticipant.phone]
          .filter(Boolean)
          .map((id) => normalizeJid(id, currentConn))
        const pNumbers = pIds.map(extractNumber).filter((n) => n.length >= 7)

        for (const bot of activeBots) {
          if (pIds.includes(bot.canonicalJid) || (bot.lid && pIds.includes(bot.lid))) return bot
          if (pNumbers.some((num) => bot.number === num || bot.number.endsWith(num) || num.endsWith(bot.number))) return bot
        }
      }
    }
  }

  return null
}

const handler = async (m, { conn, text, args, usedPrefix, command, participants }) => {
  const chat = global.db.data.chats[m.chat]
  if (!chat) return

  const activeBots = getActiveBots(conn)

  if (!activeBots.length) {
    return conn.reply(m.chat, `⚠︎ *No se detectaron bots activos conectados en este momento.*`, m)
  }

  const targetBot = findTargetBot(activeBots, {
    text,
    args,
    mentionedJid: m.mentionedJid,
    quoted: m.quoted,
    currentConn: conn,
    participants
  })

  if (!targetBot) {
    return conn.reply(
      m.chat,
      `ꕥ *El usuario indicado no es un Bot activo del sistema.*\n\n` +
      `➜ Para asignar el *Bot Principal* usa:\n` +
      `> » *${usedPrefix + command} main*\n` +
      `> » O responde a un mensaje del bot con *${usedPrefix + command}*\n` +
      `> » O menciónalo directamente: *${usedPrefix + command} @${activeBots[0]?.number}*`,
      m
    )
  }

  // Validar si el bot pertenece al grupo actual (si la lista de participantes está disponible)
  if (Array.isArray(participants) && participants.length > 0) {
    const isInGroup = participants.some((p) => {
      const pIds = [p.id, p.jid, p.lid, p.phoneNumber, p.pn, p.phone]
        .filter(Boolean)
        .map((id) => normalizeJid(id, conn))
      const pNumbers = pIds.map(extractNumber).filter(Boolean)
      return pIds.includes(targetBot.canonicalJid) || (targetBot.lid && pIds.includes(targetBot.lid)) || pNumbers.includes(targetBot.number)
    })

    if (!isInGroup) {
      return conn.reply(
        m.chat,
        `⚠︎ El bot *@${targetBot.number}* está activo en el sistema pero no se encuentra unido a este grupo.`,
        m,
        { mentions: [targetBot.canonicalJid] }
      )
    }
  }

  const currentPrimaryNumber = extractNumber(chat.primaryBot)
  if (chat.primaryBot && (chat.primaryBot === targetBot.canonicalJid || currentPrimaryNumber === targetBot.number)) {
    return conn.reply(
      m.chat,
      `➜ @${targetBot.number} *ya está configurado como el Bot Principal aquí.*`,
      m,
      { mentions: [targetBot.canonicalJid] }
    )
  }

  try {
    chat.primaryBot = targetBot.canonicalJid
    const rolTexto = targetBot.isMain ? 'Bot Principal (Núcleo Supremo)' : 'Sub-Bot (Clon de Sombra)'

    conn.reply(
      m.chat,
      `✰ *¡CONFIGURACIÓN ACTUALIZADA!* ✰\n\n` +
      `➜ *Nuevo Bot Supremo:* @${targetBot.number} (${rolTexto})\n` +
      `> A partir de ahora, los comandos en este grupo serán atendidos preferentemente por este bot.`,
      m,
      { mentions: [targetBot.canonicalJid] }
    )
  } catch (e) {
    conn.reply(m.chat, `⚠︎ *Ocurrió un error inesperado:*\n> ${e.message}`, m)
  }
}

handler.help = ['setprimary [main/@bot]']
handler.tags = ['grupos']
handler.command = ['setprimary']
handler.group = true
handler.admin = true

export { getActiveBots, findTargetBot, normalizeJid, extractNumber }
export default handler
