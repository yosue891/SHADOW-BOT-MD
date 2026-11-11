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
  // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
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

  // 2. Socket actual que atiende el comando
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

const getCandidateTargets = async (m, quoted, text, currentConn) => {
  const candidates = new Set()

  // 1. Extraer menciones con @ directamente del texto (ej: @573127510345)
  const fullText = String(m?.text || text || '')
  const textMentions = [...fullText.matchAll(/@(\d{7,16})/g)].map((match) => match[1])
  for (const num of textMentions) {
    candidates.add(`${num}@s.whatsapp.net`)
    candidates.add(num)
  }

  // 2. m.mentionedJid y campos en contextInfo
  const rawMentions = [
    ...(Array.isArray(m?.mentionedJid) ? m.mentionedJid : []),
    ...(Array.isArray(m?.message?.extendedTextMessage?.contextInfo?.mentionedJid) ? m.message.extendedTextMessage.contextInfo.mentionedJid : []),
    ...(Array.isArray(m?.msg?.contextInfo?.mentionedJid) ? m.msg.contextInfo.mentionedJid : [])
  ]
  for (const jid of rawMentions) {
    if (jid && typeof jid === 'string') {
      const clean = normalizeJid(jid, currentConn)
      if (clean) candidates.add(clean)
    }
  }

  // 3. Mensaje citado (quoted)
  if (quoted) {
    // Si el mensaje citado fue enviado por el propio bot (fromMe === true)
    if (quoted.fromMe === true || quoted.key?.fromMe === true) {
      candidates.add('__FROM_ME__')
    }

    // Await de quoted.sender si retorna Promise
    let qSender = quoted.sender
    if (qSender && typeof qSender.then === 'function') {
      try {
        qSender = await qSender
      } catch {}
    }
    if (typeof qSender === 'string' && qSender) {
      candidates.add(normalizeJid(qSender, currentConn))
    }

    const otherIds = [
      quoted.participant,
      quoted.key?.participant,
      quoted.key?.participantAlt,
      quoted.key?.remoteJidAlt,
      quoted.key?.remoteJid,
      quoted.senderNumber ? `${quoted.senderNumber}@s.whatsapp.net` : null,
      quoted.senderNumber,
      m?.quotedSender,
      m?.message?.extendedTextMessage?.contextInfo?.participant,
      m?.msg?.contextInfo?.participant,
      m?.message?.extendedTextMessage?.contextInfo?.participantAlt,
      m?.msg?.contextInfo?.participantAlt
    ]

    for (const raw of otherIds) {
      if (raw && typeof raw === 'string') {
        const clean = normalizeJid(raw, currentConn)
        if (clean) candidates.add(clean)
      }
    }
  }

  return Array.from(candidates)
}

const findTargetBot = async (activeBots, { text, args, m, quoted, currentConn, participants }) => {
  const cleanText = String(text || '').trim().toLowerCase()
  const firstArg = String(args?.[0] || '').trim().toLowerCase()

  // 1. Palabras clave explícitas para seleccionar el Bot Principal
  const mainKeywords = ['main', 'principal', 'bot', 'prime', 'master', 'primario', '1', 'supremo']
  if (mainKeywords.includes(firstArg) || mainKeywords.includes(cleanText)) {
    return activeBots.find((b) => b.isMain) || activeBots[0] || null
  }

  // 2. Si el usuario ingresó un número telefónico directamente
  const textDigits = cleanText.replace(/\D/g, '')
  if (textDigits.length >= 7) {
    const matchedByDigits = activeBots.find((b) => b.number === textDigits || b.number.endsWith(textDigits) || textDigits.endsWith(b.number))
    if (matchedByDigits) return matchedByDigits
  }

  // 3. Recopilar candidatos de menciones y mensaje citado
  const candidateJids = await getCandidateTargets(m, quoted, text, currentConn)

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

    // Si el mensaje citado fue enviado por el bot que atiende
    if (candidate === '__FROM_ME__') {
      const curRaw = currentConn?.user?.jid || currentConn?.user?.id
      const curNum = extractNumber(curRaw)
      const fromMeBot = activeBots.find((b) => b.sock === currentConn || (curNum && b.number === curNum))
      if (fromMeBot) return fromMeBot
      return activeBots.find((b) => b.isMain) || activeBots[0] || null
    }

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

  // Asegurar que participants esté poblado si es un grupo
  if ((!Array.isArray(participants) || participants.length === 0) && m.isGroup) {
    try {
      const meta = await conn.groupMetadata(m.chat).catch(() => null)
      if (meta?.participants) participants = meta.participants
    } catch {}
  }

  const targetBot = await findTargetBot(activeBots, {
    text,
    args,
    m,
    quoted: m.quoted,
    currentConn: conn,
    participants
  })

  if (!targetBot) {
    const mainNum = activeBots.find((b) => b.isMain)?.number || activeBots[0]?.number || ''
    return conn.reply(
      m.chat,
      `ꕥ *El usuario indicado no es un Bot activo del sistema.*\n\n` +
      `➜ *Formas válidas de asignar el Bot:* \n` +
      `> » *${usedPrefix + command} main* (asigna directamente el Bot Principal)\n` +
      `> » Responde a un mensaje del bot con *${usedPrefix + command}*\n` +
      (mainNum ? `> » O menciónalo: *${usedPrefix + command} @${mainNum}*\n\n` : '\n') +
      `📌 *Comandos de gestión:*\n` +
      `> » Ver bot actual: *${usedPrefix}verprimary*\n` +
      `> » Quitar bot primario: *${usedPrefix}delprimary*`,
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
      `➜ @${targetBot.number} *ya está configurado como el Bot Principal aquí.*\n\n` +
      `📌 *COMANDOS DISPONIBLES:*\n` +
      `• *Ver estado:* \`${usedPrefix}verprimary\`\n` +
      `• *Quitarlo:* \`${usedPrefix}delprimary\` (para que todos los bots vuelvan a responder).`,
      m,
      { mentions: [targetBot.canonicalJid] }
    )
  }

  try {
    chat.primaryBot = targetBot.canonicalJid
    const rolTexto = targetBot.isMain ? 'Bot Principal (Núcleo Supremo)' : 'Sub-Bot (Clon de Sombra)'

    const respuesta =
      `✰ *¡BOT PRINCIPAL ASIGNADO CON ÉXITO!* ✰\n\n` +
      `➜ *Bot Supremo:* @${targetBot.number}\n` +
      `➜ *Rango:* ${rolTexto}\n` +
      `➜ *Estado:* Activo en este grupo\n\n` +
      `> A partir de ahora, los comandos en este grupo serán atendidos preferentemente por este bot.\n\n` +
      `📌 *INFORMACIÓN Y COMANDOS ÚTILES:*\n` +
      `• *Ver el Bot Principal:* \`${usedPrefix}verprimary\`\n` +
      `• *Quitar el Bot Principal:* \`${usedPrefix}delprimary\`\n` +
      `> *(Al quitarlo con ${usedPrefix}delprimary, todos los bots activos volverán a responder normalmente).*`

    conn.reply(m.chat, respuesta, m, { mentions: [targetBot.canonicalJid] })
  } catch (e) {
    conn.reply(m.chat, `⚠︎ *Ocurrió un error inesperado:*\n> ${e.message}`, m)
  }
}

handler.help = ['setprimary [main/@bot]']
handler.tags = ['grupos']
handler.command = ['setprimary']
handler.group = true
handler.admin = true

export { getActiveBots, findTargetBot, getCandidateTargets, normalizeJid, extractNumber }
export default handler
