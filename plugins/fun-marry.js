let marriages = {}

function tag(jid) {
  return '@' + jid.split('@')[0]
}

const handler = async (m, { conn, usedPrefix, command }) => {
  const userId = m.sender

  if (['divorce', 'divorciarse'].includes(command)) {
    if (!marriages[userId]) return conn.sendMessage(m.chat, { text: '💔 No estás casado...', ...rcanal }, { quoted: m })
    const ex = marriages[userId]
    delete marriages[userId]
    delete marriages[ex]
    return conn.sendMessage(m.chat, { text: `💔 Divorcio realizado.\n${tag(userId)} y ${tag(ex)} ya no están casados.`, mentions: [userId, ex], ...rcanal }, { quoted: m })
    
  if (['marry', 'casarse'].includes(command)) {
    let partnerId = null
    if (m.mentionedJid && m.mentionedJid.length > 0) {
      partnerId = m.mentionedJid[0]
    } else if (m.quoted) {
      partnerId = m.quoted.sender
    }

    if (!partnerId) return conn.sendMessage(m.chat, { text: '💍 Menciona o responde al mensaje de la persona para casarte.', ...rcanal }, { quoted: m })
    if (partnerId === userId) return conn.sendMessage(m.chat, { text: '💔 No puedes casarte contigo mismo.', ...rcanal }, { quoted: m })

    if (marriages[userId]) {
      const esposo = marriages[userId]
      return conn.sendMessage(m.chat, { text: `:0 estás intentando serle fiel a tu esposo/a ${tag(esposo)}.`, mentions: [userId, esposo], ...rcanal }, { quoted: m })
    }
    if (marriages[partnerId]) {
      const esposo = marriages[partnerId]
      return conn.sendMessage(m.chat, { text: `⚠️ ${tag(partnerId)} ya está casado con ${tag(esposo)}.`, mentions: [partnerId, esposo], ...rcanal }, { quoted: m })
    }

    marriages[userId] = partnerId
    marriages[partnerId] = userId

    return conn.sendMessage(m.chat, { text: `💒 『☽』 Las sombras han sellado el pacto.\n${tag(userId)} y ${tag(partnerId)} ahora están oficialmente casados.`, mentions: [userId, partnerId], ...rcanal }, { quoted: m })
  }
}

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse']
handler.group = true
export default handler
