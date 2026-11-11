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

const isBaileysId = (id) => {
  if (!id || typeof id !== 'string') return false
  const baileysPrefixes = [
    '3EB0', 'BAE5', 'B24E', 'NJX-', 'Lyru-', 'META-', 'EvoGlobalBot-',
    'FizzxyTheGreat-', '8SCO', 'SUKI', 'MYSTIC-', 'SHADOW', 'BAE'
  ]
  if (baileysPrefixes.some((prefix) => id.startsWith(prefix))) return true
  if (/^3EB0[A-F0-9]{8,}$/i.test(id)) return true
  if (/^[A-F0-9]{12}$/i.test(id) || /^[A-F0-9]{16}$/i.test(id)) return true
  return false
}

const getActiveBots = (currentConn) => {
  const botMap = new Map()

  const registerBot = (sock, forceMain = false) => {
    if (!sock || !isSocketActive(sock)) return

    const rawId = sock.user?.id || sock.user?.jid || sock.authState?.creds?.me?.id || ''
    const jid = normalizeJid(rawId, sock)
    const number = extractNumber(jid || rawId)
    if (!number) return

    const canonicalJid = `${number}@s.whatsapp.net`

    // Extraer todos los LIDs posibles asociados a esta conexión
    const lids = new Set()
    const lidCandidates = [
      sock.user?.lid,
      sock.authState?.creds?.me?.lid,
      sock.authState?.creds?.account?.lid,
      sock.creds?.me?.lid
    ]
    for (const rawL of lidCandidates) {
      if (rawL && typeof rawL === 'string') {
        const cleanLid = normalizeJid(rawL, sock)
        if (cleanLid) lids.add(cleanLid)
        const lidNum = extractNumber(cleanLid)
        if (lidNum) lids.add(lidNum)
      }
    }

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
        lids: Array.from(lids),
        number,
        name: sock.user?.name || sock.user?.verifiedName || (isMain ? 'Bot Principal' : 'Sub-Bot')
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

const findTargetBot = async (activeBots, { text, args, m, quoted, currentConn, participants }) => {
  const cleanText = String(text || '').trim().toLowerCase()
  const firstArg = String(args?.[0] || '').trim().toLowerCase()

  // 1. Palabras clave explícitas para seleccionar el Bot Principal
  const mainKeywords = ['main', 'principal', 'bot', 'prime', 'master', 'primario', '1', 'supremo', 'nucleo']
  if (mainKeywords.includes(firstArg) || mainKeywords.includes(cleanText)) {
    return activeBots.find((b) => b.isMain) || activeBots[0] || null
  }

  // 2. Si el usuario ingresó un número telefónico directamente
  const textDigits = cleanText.replace(/\D/g, '')
  if (textDigits.length >= 7) {
    const matchedByDigits = activeBots.find((b) => b.number === textDigits || b.number.endsWith(textDigits) || textDigits.endsWith(b.number))
    if (matchedByDigits) return matchedByDigits
  }

  // 3. Buscar menciones con @ en el texto (ej: .setprimary @573127510345)
  const fullText = String(m?.text || text || '')
  const textMentions = [...fullText.matchAll(/@(\d{7,16})/g)].map((match) => match[1])
  for (const num of textMentions) {
    const matched = activeBots.find((b) => b.number === num || b.number.endsWith(num) || num.endsWith(b.number))
    if (matched) return matched
  }

  // 4. Si el mensaje es una respuesta / cita a un mensaje (quoted)
  const rawContext = m?.msg?.contextInfo || m?.message?.extendedTextMessage?.contextInfo || m?.message?.[m?.mtype]?.contextInfo
  const stanzaId = String(rawContext?.stanzaId || quoted?.id || '')
  const hasQuoted = Boolean(quoted || rawContext?.quotedMessage || stanzaId)

  if (hasQuoted) {
    // Si solo hay 1 bot activo en el sistema (el principal), y el usuario citó un mensaje:
    if (activeBots.length === 1) {
      return activeBots[0]
    }

    // Await quoted.sender si retorna Promise
    let qSender = quoted?.sender
    if (qSender && typeof qSender.then === 'function') {
      try {
        qSender = await qSender
      } catch {}
    }

    const quotedCandidates = new Set()

    if (quoted?.fromMe === true || quoted?.key?.fromMe === true) {
      quotedCandidates.add('__FROM_ME__')
    }

    const checkList = [
      qSender,
      rawContext?.participant,
      rawContext?.participantAlt,
      quoted?.participant,
      quoted?.key?.participant,
      quoted?.key?.participantAlt,
      quoted?.key?.remoteJidAlt,
      quoted?.key?.remoteJid,
      quoted?.senderNumber ? `${quoted.senderNumber}@s.whatsapp.net` : null,
      quoted?.senderNumber,
      m?.quotedSender
    ]

    for (const item of checkList) {
      if (item && typeof item === 'string') {
        quotedCandidates.add(item.trim().toLowerCase())
        quotedCandidates.add(normalizeJid(item, currentConn))
      }
    }

    // A. Comparar candidatos del citado contra los bots activos
    for (const cand of quotedCandidates) {
      if (cand === '__FROM_ME__') {
        const curNum = extractNumber(currentConn?.user?.jid || currentConn?.user?.id)
        return (
          activeBots.find((b) => b.sock === currentConn || (curNum && b.number === curNum)) ||
          activeBots.find((b) => b.isMain) ||
          activeBots[0]
        )
      }

      const candNum = extractNumber(cand)

      for (const bot of activeBots) {
        if (bot.canonicalJid === cand || bot.jid === cand) return bot
        if (candNum && bot.number && (bot.number === candNum || bot.number.endsWith(candNum) || candNum.endsWith(bot.number))) return bot
        if (bot.lids.includes(cand) || (candNum && bot.lids.includes(candNum))) return bot
      }

      // B. Si el candidato es un LID, buscar en los participantes del grupo
      if (Array.isArray(participants) && participants.length > 0) {
        const matchedP = participants.find((p) => {
          const pIds = [p.id, p.jid, p.lid, p.phoneNumber, p.pn, p.phone].filter(Boolean).map((id) => normalizeJid(id, currentConn))
          return pIds.includes(cand) || (candNum && pIds.some((id) => extractNumber(id) === candNum))
        })

        if (matchedP) {
          const pIds = [matchedP.id, matchedP.jid, matchedP.lid, matchedP.phoneNumber, matchedP.pn, matchedP.phone].filter(Boolean).map((id) => normalizeJid(id, currentConn))
          const pNums = pIds.map(extractNumber).filter((n) => n.length >= 7)

          for (const bot of activeBots) {
            if (pIds.includes(bot.canonicalJid) || bot.lids.some((l) => pIds.includes(l))) return bot
            if (pNums.some((num) => bot.number === num || bot.number.endsWith(num) || num.endsWith(bot.number))) return bot
          }
        }
      }
    }

    // C. Si el stanzaId tiene formato de mensaje generado por Baileys
    if (stanzaId && isBaileysId(stanzaId)) {
      const curNum = extractNumber(currentConn?.user?.jid || currentConn?.user?.id)
      return (
        activeBots.find((b) => b.sock === currentConn || (curNum && b.number === curNum)) ||
        activeBots.find((b) => b.isMain) ||
        activeBots[0]
      )
    }
  }

  // 5. Menciones estándar en m.mentionedJid
  const rawMentions = [
    ...(Array.isArray(m?.mentionedJid) ? m.mentionedJid : []),
    ...(Array.isArray(rawContext?.mentionedJid) ? rawContext.mentionedJid : [])
  ]

  for (const mJid of rawMentions) {
    if (mJid && typeof mJid === 'string') {
      const clean = normalizeJid(mJid, currentConn)
      const candNum = extractNumber(clean)

      for (const bot of activeBots) {
        if (bot.canonicalJid === clean || bot.jid === clean) return bot
        if (candNum && bot.number && (bot.number === candNum || bot.number.endsWith(candNum) || candNum.endsWith(bot.number))) return bot
        if (bot.lids.includes(clean) || (candNum && bot.lids.includes(candNum))) return bot
      }
    }
  }

  // 6. Si no hubo mención, citado ni texto, por defecto seleccionar el bot que atiende el comando
  if (!cleanText && !hasQuoted && rawMentions.length === 0) {
    const curNum = extractNumber(currentConn?.user?.jid || currentConn?.user?.id)
    return (
      activeBots.find((b) => b.sock === currentConn || (curNum && b.number === curNum)) ||
      activeBots.find((b) => b.isMain) ||
      activeBots[0]
    )
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
      `➜ *Formas fáciles de asignarlo:* \n` +
      `> » *${usedPrefix + command} main* (asigna directamente el Bot Principal)\n` +
      `> » Responde a cualquier mensaje del bot con *${usedPrefix + command}*\n` +
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
      return (
        pIds.includes(targetBot.canonicalJid) ||
        targetBot.lids.some((lid) => pIds.includes(lid)) ||
        pNumbers.includes(targetBot.number)
      )
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
      `• *Ver estado actual:* \`${usedPrefix}verprimary\`\n` +
      `• *Quitar configuración:* \`${usedPrefix}delprimary\` (para que todos los bots respondan).`,
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
      `📌 *INFORMACIÓN Y GESTIÓN:*\n` +
      `• *Para ver el Bot Principal actual:* \`${usedPrefix}verprimary\`\n` +
      `• *Para quitarlo (y que todos respondan):* \`${usedPrefix}delprimary\`\n` +
      `> *(Con ${usedPrefix}delprimary se quita el filtro y todos los bots activos vuelven a responder normalmente).*`

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

export { getActiveBots, findTargetBot, normalizeJid, extractNumber, isBaileysId }
export default handler
