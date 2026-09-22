let handler = async (m, { conn, isAdmin, isOwner }) => {
  if (!m.isGroup) return m.reply('⚠️ Este comando solo funciona en grupos.')

  if (!isOwner) return m.reply('🚫 Este comando es exclusivo para los creadores del bot.')

  if (isAdmin) return m.reply('✅ Ya eres admin del grupo.')

  await conn.groupParticipantsUpdate(m.chat, [m.sender], 'promote')

  await m.reply('🛡️ Has sido promovido a admin por el bot.')
}

handler.command = ['admin', 'atad', 'autoadmin']

handler.owner = true

handler.botAdmin = true

export default handler
