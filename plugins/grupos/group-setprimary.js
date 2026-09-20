const handler = async (m, { conn }) => {
  const normalizeJid = (jid) => {
    if (!jid) return ''
    try {
      jid = conn?.decodeJid?.(jid) || jid
    } catch {}
    return String(jid).trim().replace(/:\d+@/, '@').toLowerCase()
  }

  const sameBot = (left, right) => {
    const normalizedLeft = normalizeJid(left)
    const normalizedRight = normalizeJid(right)
    if (!normalizedLeft || !normalizedRight) return false
    if (normalizedLeft === normalizedRight) return true

    const leftNumber = normalizedLeft.split('@')[0].replace(/\D/g, '')
    const rightNumber = normalizedRight.split('@')[0].replace(/\D/g, '')
    return Boolean(leftNumber && rightNumber && leftNumber === rightNumber)
  }

  const activeConnections = Array.isArray(global.conns)
    ? global.conns.filter((socket) => {
        const jid = socket?.user?.jid || socket?.user?.id
        return jid && socket.ws?.readyState !== 3
      })
    : []
  const subBots = [...new Set(activeConnections.map((socket) => normalizeJid(socket.user.jid || socket.user.id)))]

  const mainBotJid = global.conn?.user?.jid || global.conn?.user?.id
  if (mainBotJid && !subBots.some((jid) => sameBot(jid, mainBotJid))) {
    subBots.push(normalizeJid(mainBotJid))
  }

  const chat = global.db.data.chats[m.chat]
  const mentionedJid = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
  const currentBotJid = normalizeJid(conn?.user?.jid || conn?.user?.id)
  const requestedJid = mentionedJid[0] || (m.quoted ? await m.quoted.sender : false) || currentBotJid
  const who = subBots.find((jid) => sameBot(jid, requestedJid)) || normalizeJid(requestedJid)

  if (!who) return conn.reply(m.chat, `❀ *Por favor, menciona al Saiyan (o Sub-Saiyan) o responde a un mensaje suyo para seleccionarlo como dios supremo.*`, m)

  if (!subBots.includes(who)) return conn.reply(m.chat, `ꕥ *El usuario indicado no es un Bot activo del sistema.*`, m)

  if (chat.primaryBot === who) {
    return conn.reply(m.chat, `➜ @${who.split`@`[0]} *ya está configurado como el Bot Principal aquí.*`, m, { mentions: [who] });
  }

  try {
    chat.primaryBot = who
    conn.reply(m.chat, `✰ *¡CONFIGURACIÓN ACTUALIZADA!* ✰\n\n➜ *Nuevo Shadow supremo:* @${who.split`@`[0]}\n> A partir de ahora, los comandos en este grupo serán ejecutados preferentemente por este * Shadow bot*.`, m, { mentions: [who] })
  } catch (e) {
    conn.reply(m.chat, `⚠︎ *Ocurrió un error inesperado:*\n> ${e.message}`, m)
  }
}

handler.help = ['setprimary']
handler.tags = ['grupos']
handler.command = ['setprimary']
handler.group = true
handler.admin = true

export default handler