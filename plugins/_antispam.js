const userSpamData = {}

let handler = m => m

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner, isROwner, isPrems }) {
  const chat = global.db.data.chats[m.chat]
  const bot = global.db.data.settings[conn.user.jid] || {}

  if (!bot.antiSpam) return
  if (m.isGroup && chat.modoadmin) return  

  // No aplicar antispam a dueños, admins o premium
  if (isOwner || isROwner || isAdmin || isPrems) return

  const sender = m.sender
  const currentTime = Date.now()
  const timeWindow = 5000   // 5 segundos
  const messageLimit = 10   // máximo 10 mensajes en ese tiempo

  if (!(sender in userSpamData)) {
    userSpamData[sender] = {
      lastMessageTime: currentTime,
      messageCount: 1,
      antiBan: 0
    }
  } else {
    const userData = userSpamData[sender]
    const timeDifference = currentTime - userData.lastMessageTime

    // Si sigue dentro de la ventana de tiempo, acumula mensajes
    if (timeDifference <= timeWindow) {
      userData.messageCount++

      if (userData.messageCount >= messageLimit) {
        userData.antiBan++

        if (userData.antiBan === 1) {
          await conn.reply(m.chat, `🎄 Primera advertencia @${sender.split('@')[0]}: no hagas spam.`, m, { mentions: [sender] })
        } else if (userData.antiBan === 2) {
          await conn.reply(m.chat, `✨ Segunda advertencia @${sender.split('@')[0]}: insiste y serás expulsado.`, m, { mentions: [sender] })
        } else if (userData.antiBan >= 3) {
          if (isBotAdmin) {
            try {
              await conn.reply(m.chat, `❄️ Expulsado por spam: @${sender.split('@')[0]}`, m, { mentions: [sender] })
              await conn.groupParticipantsUpdate(m.chat, [sender], 'remove')
            } catch (err) {
              console.error('Error al expulsar:', err)
              await conn.reply(m.chat, `⚠️ No pude expulsar a @${sender.split('@')[0]} aunque soy admin.`, m, { mentions: [sender] })
            }
          } else {
            await conn.reply(m.chat, `⚠️ No puedo expulsar porque no soy admin, pero @${sender.split('@')[0]} está spameando.`, m, { mentions: [sender] })
          }
        }

        // Reinicia contador
        userData.messageCount = 1
      }
    } else {
      // Si pasó más tiempo, reinicia el conteo
      userData.messageCount = 1
    }

    userData.lastMessageTime = currentTime
  }
}

export default handler
