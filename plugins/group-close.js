let handler = async (m, { conn, command }) => {
  if (!m.isGroup) return m.reply('🌌⚠️ *Este comando solo puede usarse en grupos.*')

  let chatId = m.chat
  let action = command.toLowerCase()

  if (action === 'close') {
    await conn.groupSettingUpdate(chatId, 'announcement')
    await conn.reply(chatId, '🎄🌌 *El Shadow Garden ha sellado el grupo...*\n❄️ Solo los administradores pueden hablar ahora.', m)
  }

  if (action === 'open') {
    await conn.groupSettingUpdate(chatId, 'not_announcement')
    await conn.reply(chatId, '🎅✨ *El Shadow Garden ha liberado el grupo...*\n🌌 Todos los miembros pueden hablar bajo la nieve.', m)
  }
}

handler.help = ['close', 'open']
handler.tags = ['group']
handler.command = ['close', 'open']
handler.group = true
handler.botAdmin = true // el bot debe ser admin para ejecutar esto

export default handler
