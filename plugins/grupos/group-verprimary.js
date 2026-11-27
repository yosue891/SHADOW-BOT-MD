let handler = async (m, { conn }) => {
  let chat = global.db.data.chats[m.chat]
  if (!chat || !chat.primaryBot) {
    if (global.conn && conn !== global.conn) {
      const socket = global.conn.ws?.socket || global.conn.ws
      const state = socket?.readyState
      if (state !== 2 && state !== 3) return
    }
    return m.reply('ℹ️ *No hay ningún bot principal establecido en este grupo.*\n> Todos los bots activos responderán a los comandos.')
  }

  const botJid = chat.primaryBot
  const num = botJid.split('@')[0].replace(/\D/g, '')
  const mainNum = (global.conn?.user?.jid || global.conn?.user?.id || '').split('@')[0].replace(/\D/g, '')
  const isMain = Boolean(mainNum && mainNum === num)
  const rol = isMain ? 'Bot Principal (Núcleo Supremo)' : 'Sub-Bot (Clon de Sombra)'

  conn.reply(
    m.chat,
    `🤖 *Bot Principal actual en este grupo:*\n➜ @${num} (${rol})`,
    m,
    { mentions: [botJid] }
  )
}

handler.help = ['verprimary']
handler.tags = ['grupos', 'socket']
handler.command = ['verprimary']
handler.group = true
handler.admin = true

export default handler
