let marriages = {}

function tag(jid) {
  return '@' + jid.split('@')[0]
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const userId = m.sender

  if (['divorce', 'divorciarse'].includes(command)) {
    if (!marriages[userId]) return conn.reply(m.chat, '💔 No estás casado...', m)
    const ex = marriages[userId]
    delete marriages[userId]
    delete marriages[ex]
    return conn.reply(m.chat, `💔 Divorcio realizado.\n${tag(userId)} y ${tag(ex)} ya no están casados.`, m, { mentions: [userId, ex] })
  }

  if (['marry', 'casarse'].includes(command)) {
    const partnerId = m.mentionedJid?.[0] || m.quoted?.sender
    if (!partnerId) return conn.reply(m.chat, '💍 Menciona o responde al mensaje de la persona para casarte.', m)
    if (partnerId === userId) return conn.reply(m.chat, '💔 No puedes casarte contigo mismo.', m)

    if (marriages[userId]) {
      const esposo = marriages[userId]
      return conn.reply(m.chat, `:0 estás intentando serle fiel a tu esposo/a ${tag(esposo)}.`, m, { mentions: [userId, esposo] })
    }
    if (marriages[partnerId]) {
      const esposo = marriages[partnerId]
      return conn.reply(m.chat, `⚠️ ${tag(partnerId)} ya está casado con ${tag(esposo)}.`, m, { mentions: [partnerId, esposo] })
    }

    marriages[userId] = partnerId
    marriages[partnerId] = userId

    return conn.reply(m.chat, `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(partnerId)} ahora están oficialmente casados.`, m, { mentions: [userId, partnerId] })
  }
}

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse']
handler.group = true
export default handler
