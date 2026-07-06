import fs from 'fs'
import path from 'path'

const handler = async (m, { conn, isAdmin, isROwner }) => {
  const senderNumber = m.sender.replace(/[^0-9]/g, '')
  const botPath = path.join('./Sessions/SubBot', senderNumber)

  if (!(isAdmin || isROwner || fs.existsSync(botPath))) {
    return m.reply(
      `𖣣ֶㅤ֯⌗ No tienes permisos esto solo lo pueden usar *admins* *sockets* o el *owner.*`, 
      m
    )
  }

  global.db.data.chats[m.chat].isBanned = true

  m.reply(
    `> ⌗ Bot baneado correctamente en este grupo.`
  )
}

handler.help = ['banearbot']
handler.tags = ['grupos']
handler.command = ['banearbot', 'banchat']
handler.group = true

export default handler
