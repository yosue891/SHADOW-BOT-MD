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
    const groupInfo = await conn.groupMetadata(m.chat).catch(() => null) || conn.chats?.[m.chat]?.metadata || { participants: [] }
    const groupParticipants = groupInfo.participants || participants || []

    const userNum = clean(user)
    const targetParticipant = groupParticipants.find(p => {
      if (!p) return false
      if (p.id === user || p.jid === user || p.lid === user) return true
      if (p.phoneNumber && p.phoneNumber === user) return true
      const pNum = clean(p.id) || clean(p.jid) || clean(p.phoneNumber)
      return pNum && userNum && pNum === userNum
    })

    const targetJid = targetParticipant?.id || user
    const displayNum = userNum || clean(targetJid) || clean(targetParticipant?.phoneNumber)

    const botNum = clean(conn.user?.jid || conn.user?.id || conn.authState?.creds?.me?.id)
    if (botNum && displayNum === botNum) {
      return conn.reply(m.chat, `☽ No puedo eliminar al bot del grupo.`, m)
    }

    const ownerGroupNum = clean(groupInfo.owner || m.chat.split('-')[0])
    if (ownerGroupNum && displayNum === ownerGroupNum) {
      return conn.reply(m.chat, `☽ No puedo eliminar al propietario del grupo.`, m)
    }

    const isBotOwner = (global.owner || []).some(o => {
      const num = clean(Array.isArray(o) ? o[0] : o)
      return num && displayNum === num
    })
    if (isBotOwner) {
      return conn.reply(m.chat, `☽ No puedo eliminar al creador del bot.`, m)
    }

    if (targetParticipant?.admin && targetParticipant.admin !== 'false') {
      return conn.reply(
        m.chat,
        `☽ No puedo eliminar a @${displayNum} porque tiene rango de Administrador en el grupo.`,
        m,
        { mentions: [targetJid] }
      )
    }

    const res = await conn.groupParticipantsUpdate(m.chat, [targetJid], 'remove')
    if (Array.isArray(res) && res[0]?.status && res[0].status !== '200') {
      const status = String(res[0].status)
      if (status === '404') {
        return conn.reply(m.chat, `☽ El usuario @${displayNum} ya no se encuentra en este grupo.`, m, { mentions: [targetJid] })
      } else if (status === '406' || status === '403') {
        return conn.reply(m.chat, `☽ No tengo permisos suficientes para expulsar a @${displayNum}. Asegúrate de que el bot sea administrador.`, m, { mentions: [targetJid] })
      }
    }

    await conn.reply(
      m.chat,
      `☽ 『 Shadow Garden 』 ☽\n\nLas sombras han expulsado a @${displayNum}.\n\n✦ Así termina quien desafía las reglas del Reino.\n✦ ¿Quién más desea acompañarlo en la oscuridad eterna?`,
      m,
      { mentions: [targetJid] }
    )
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
