const handler = async (m, { conn, command, usedPrefix, text }) => {
  const users = global.db.data.users
  const userId = m.sender
  const rcanal = typeof global.rcanal !== 'undefined' ? global.rcanal : {}

  if (command === 'divorce' || command === 'divorciarse') {
    const partnerId = users[userId]?.marry
    if (!partnerId) return conn.sendMessage(m.chat, { text: '💔 No estás casado con nadie en el Reino de las Sombras.', ...rcanal }, { quoted: m })

    return conn.sendButton(m.chat, `¿Estás seguro de que quieres romper tu pacto con @${partnerId.split('@')[0]}?`, 'Shadow Garden', null, [
      ['SÍ, DIVORCIARME', `${usedPrefix}confirmdivorce`],
      ['NO', `${usedPrefix}canceldivorce`]
    ], m, { mentions: [partnerId] })
  }

  if (command === 'confirmdivorce') {
    const partnerId = users[userId]?.marry
    if (!partnerId) return
    users[userId].marry = ''
    users[partnerId].marry = ''
    return conn.sendMessage(m.chat, { text: `💔 El pacto se ha roto. @${userId.split('@')[0]} y @${partnerId.split('@')[0]} ya no están unidos.`, mentions: [userId, partnerId], ...rcanal }, { quoted: m })
  }

  if (command === 'marry' || command === 'casarse') {
    let partnerId = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.quoted ? m.quoted.sender : false

    if (!partnerId && text) {
      partnerId = text.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    }

    if (!partnerId || partnerId.length < 15) {
      return conn.sendMessage(m.chat, { text: '💍 Menciona o responde a la persona con la que quieres sellar el pacto.', ...rcanal }, { quoted: m })
    }

    if (partnerId === userId) return m.reply('🌌 No puedes casarte con tu propia sombra.')
    if (users[userId]?.marry) return m.reply(`⚠️ Ya estás casado con @${users[userId].marry.split('@')[0]}.`, null, { mentions: [users[userId].marry] })
    if (users[partnerId]?.marry) return m.reply(`⚠️ @${partnerId.split('@')[0]} ya tiene un pacto con alguien más.`, null, { mentions: [partnerId] })

    await conn.sendButton(m.chat, `💒 @${userId.split('@')[0]} te propone matrimonio eterno.\n\n¿Aceptas, @${partnerId.split('@')[0]}?`, 'Tienes 50 segundos.', null, [
      ['ACEPTAR 💍', `${usedPrefix}acceptmarry ${userId}`],
      ['RECHAZAR ❌', `${usedPrefix}declinemarry ${userId}`]
    ], m, { mentions: [userId, partnerId] })

    setTimeout(() => {
      if (users[userId] && !users[userId].marry) {
        conn.sendMessage(m.chat, { text: `🥀 @${userId.split('@')[0]}, te han dejado plantado... El tiempo expiró.`, mentions: [userId], ...rcanal }, { quoted: m })
      }
    }, 50000)
  }

  if (command === 'acceptmarry') {
    const suitorId = text.split(' ')[0]
    if (!suitorId) return
    users[userId].marry = suitorId
    users[suitorId].marry = userId
    return conn.sendMessage(m.chat, { text: `💒 『☽』 Las sombras han sellado el pacto.\n@${suitorId.split('@')[0]} y @${userId.split('@')[0]} ahora están casados.`, mentions: [suitorId, userId], ...rcanal }, { quoted: m })
  }

  if (command === 'declinemarry') {
    const suitorId = text.split(' ')[0]
    if (!suitorId) return
    return conn.sendMessage(m.chat, { text: `💔 @${suitorId.split('@')[0]}, has sido rechazado en el altar.`, mentions: [suitorId], ...rcanal }, { quoted: m })
  }
}

handler.command = ['marry', 'casarse', 'divorce', 'divorciarse', 'confirmdivorce', 'acceptmarry', 'declinemarry']
handler.group = true

export default handler
