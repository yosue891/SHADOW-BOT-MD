const userSpamData = {}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let handler = m => m

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner, isROwner, isPrems }) {
  const chat = global.db.data.chats[m.chat]
  const bot = global.db.data.settings[conn.user.jid] || {}

  if (!bot.antiSpam) return
  if (m.isGroup && chat.modoadmin) return  

  if (isOwner || isROwner || isAdmin || isPrems) return

  const sender = m.sender
  const currentTime = Date.now()
  const timeWindow = 15000   
  const messageLimit = 15

  if (!(sender in userSpamData)) {
    userSpamData[sender] = {
      lastMessageTime: currentTime,
      messageCount: 1,
      antiBan: 0
    }
  } else {
    const userData = userSpamData[sender]
    const timeDifference = currentTime - userData.lastMessageTime

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
              await delay(5000 + Math.floor(Math.random() * 3000))
              await conn.reply(m.chat, `❄️ Expulsado por spam: @${sender.split('@')[0]}`, m, { mentions: [sender] })
              await delay(2000 + Math.floor(Math.random() * 2000))
              await conn.groupParticipantsUpdate(m.chat, [sender], 'remove')
            } catch (err) {
              console.error('Error al expulsar:', err)
            }
          }
        }

        userData.messageCount = 1
      }
    } else {
      userData.messageCount = 1
    }

    userData.lastMessageTime = currentTime
  }
}

export default handler
