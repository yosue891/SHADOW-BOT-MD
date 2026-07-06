// créditos reservados para wilkerson
let handler = async (m, { conn }) => {
  let chat = global.db.data.chats[m.chat]
  if (!chat || !chat.primaryBot) {
    return m.reply('ℹ️ No hay ningún bot principal establecido en este grupo.')
  }

  let botJid = chat.primaryBot
  m.reply(`🤖 El bot principal en este grupo es:\n*${botJid}*`)
}

handler.help = ['verprimary']
handler.tags = ['socket']
handler.command = ['verprimary']
handler.group = true
handler.admin = true

export default handler
