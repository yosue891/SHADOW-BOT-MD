var handler = async (m, { conn, participants, usedPrefix, command, text }) => {
  const clean = str => String(str || '').split('@')[0].split(':')[0].replace(/\D/g, '')

  let mentionedJid = Array.isArray(m.mentionedJid) ? m.mentionedJid.filter(Boolean) : []
  let user = mentionedJid.length
    ? mentionedJid[0]
    : m.quoted && m.quoted.sender
      ? m.quoted.sender
      : null

  if (!user && text) {
    const cleanNum = text.replace(/[^0-9]/g, '')
    if (cleanNum.length >= 7) {
      user = `${cleanNum}@s.whatsapp.net`
    }
  }

  if (!user) {
    return conn.reply(
      m.chat,
      `☽ Debes mencionar a un usuario (@usuario), responder a su mensaje o ingresar su número para expulsarlo.\n\n> *Ejemplo:* ${usedPrefix + command} @usuario`,
      m
    )
  }

  try {
    let groupInfo = conn.chats?.[m.chat]?.metadata || { participants: [] }
    try {
      const freshMeta = await conn.groupMetadata(m.chat)
      if (freshMeta?.participants?.length) {
        groupInfo = freshMeta
        if (!conn.chats) conn.chats = {}
        if (!conn.chats[m.chat]) conn.chats[m.chat] = { id: m.chat }
        conn.chats[m.chat].metadata = freshMeta
      }
    } catch {}

    const groupParticipants = groupInfo.participants?.length ? groupInfo.participants : (participants || [])

    const userNum = clean(user)
    const last10User = userNum.length >= 10 ? userNum.slice(-10) : userNum

    const targetParticipant = groupParticipants.find(p => {
      if (!p) return false
      if (p.id === user || p.jid === user || p.lid === user) return true
      if (p.phoneNumber && p.phoneNumber === user) return true
      const pNum = clean(p.id) || clean(p.jid) || clean(p.phoneNumber)
      if (pNum && userNum) {
        if (pNum === userNum) return true
        if (pNum.length >= 10 && userNum.length >= 10 && pNum.slice(-10) === last10User) return true
      }
      return false
    })

    if (!targetParticipant) {
      return conn.reply(
        m.chat,
        `☽ El usuario no se encuentra en este grupo.`,
        m
      )
    }

    const displayNum = (targetParticipant.phoneNumber ? clean(targetParticipant.phoneNumber) : '') ||
      (!user.endsWith('@lid') ? userNum : '') ||
      clean(targetParticipant.id) ||
      userNum ||
      'usuario'

    const mentionJid = targetParticipant.phoneNumber ||
      (!user.endsWith('@lid') ? user : (targetParticipant.id && !targetParticipant.id.endsWith('@lid') ? targetParticipant.id : `${displayNum}@s.whatsapp.net`))

    const botNum = clean(conn.user?.jid || conn.user?.id || conn.authState?.creds?.me?.id)
    if (botNum && (displayNum === botNum || (displayNum.length >= 10 && botNum.length >= 10 && displayNum.slice(-10) === botNum.slice(-10)))) {
      return conn.reply(m.chat, `☽ No puedo eliminar al bot del grupo.`, m)
    }

    const ownerGroupNum = clean(groupInfo.owner || m.chat.split('-')[0])
    if (ownerGroupNum && (displayNum === ownerGroupNum || (displayNum.length >= 10 && ownerGroupNum.length >= 10 && displayNum.slice(-10) === ownerGroupNum.slice(-10)))) {
      return conn.reply(m.chat, `☽ No puedo eliminar al propietario del grupo.`, m)
    }

    const isBotOwner = (global.owner || []).some(o => {
      const num = clean(Array.isArray(o) ? o[0] : o)
      return num && (displayNum === num || (displayNum.length >= 10 && num.length >= 10 && displayNum.slice(-10) === num.slice(-10)))
    })
    if (isBotOwner) {
      return conn.reply(m.chat, `☽ No puedo eliminar al creador del bot.`, m)
    }

    if (targetParticipant?.admin && targetParticipant.admin !== 'false') {
      return conn.reply(
        m.chat,
        `☽ No puedo eliminar a @${displayNum} porque tiene rango de Administrador en el grupo.`,
        m,
        { mentions: [mentionJid] }
      )
    }

    // Candidatos de JID para expulsar (probando tanto id, lid como phoneNumber para máxima compatibilidad con Baileys/LID)
    const rawCandidates = [
      targetParticipant.id,
      targetParticipant.phoneNumber,
      targetParticipant.lid,
      user,
      userNum ? `${userNum}@s.whatsapp.net` : null
    ].filter(Boolean)

    const candidatesToKick = [...new Set(rawCandidates.map(j => String(j).split(':')[0].replace(/:\d+@/, '@')))]

    // 1. ENVIAR EL MENSAJE DE EXPULSIÓN ANTES DE QUE EL BOT ELIMINE AL USUARIO
    await conn.reply(
      m.chat,
      `☽ 『 Shadow Garden 』 ☽\n\nLas sombras han expulsado a @${displayNum}.\n\n✦ Así termina quien desafía las reglas del Reino.\n✦ ¿Quién más desea acompañarlo en la oscuridad eterna?`,
      m,
      { mentions: [mentionJid] }
    )

    // Breve pausa para asegurar que el mensaje llegue al chat antes de que el socket de WhatsApp expulse al usuario
    await new Promise(resolve => setTimeout(resolve, 800))

    // 2. EJECUTAR LA EXPULSIÓN
    let kicked = false
    let lastError = null

    for (const jidToTry of candidatesToKick) {
      try {
        console.log(`[KICK] Intentando expulsar a ${jidToTry} en ${m.chat}...`)
        const res = await conn.groupParticipantsUpdate(m.chat, [jidToTry], 'remove')
        if (Array.isArray(res) && res.length) {
          const status = String(res[0]?.status || '200')
          if (status === '200') {
            kicked = true
            console.log(`[KICK] Usuario ${jidToTry} expulsado exitosamente (status 200)`)
            break
          } else if (status === '404') {
            console.warn(`[KICK] Status 404 con ${jidToTry}, probando siguiente candidato...`)
            lastError = `Status 404`
          } else {
            console.warn(`[KICK] Status ${status} con ${jidToTry}`)
            lastError = `Status ${status}`
          }
        } else {
          kicked = true
          break
        }
      } catch (err) {
        console.warn(`[KICK] Falló intento con ${jidToTry}:`, err?.message || err)
        lastError = err?.message || err
      }
    }

    if (!kicked) {
      console.error('[KICK] No se pudo expulsar al usuario con ningún JID:', lastError)
      return conn.reply(
        m.chat,
        `☽ No se pudo completar la expulsión de @${displayNum}. Asegúrate de que el bot sea Administrador del grupo.`,
        m,
        { mentions: [mentionJid] }
      )
    }
  } catch (e) {
    console.error('[KICK ERROR]:', e)
    conn.reply(
      m.chat,
      `⚠︎ Se ha producido un problema al expulsar al usuario.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e?.message || e}`,
      m
    )
  }
}

handler.help = ['kick']
handler.tags = ['grupos']
handler.command = ['kick', 'echar', 'hechar', 'sacar', 'ban']
handler.admin = true
handler.group = true
handler.botAdmin = true

export default handler
