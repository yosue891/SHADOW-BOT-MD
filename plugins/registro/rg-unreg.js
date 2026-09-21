let handlerUnreg = async (m, { conn }) => {
  const user = global.db.data.users[m.sender]
  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg')

  if (!user.registered) {
    return m.reply('『⚠️』 No tienes ningún pacto activo...')
  }

  user.registered = false
  user.name = ''
  user.age = 0

  // Mensaje dramático
  await conn.sendMessage(m.chat, {
    text: `『💀』 El sello ha sido roto...\n\n🌑 La sombra se disuelve en la oscuridad.`
  }, { quoted: m })

  // Documento visual estilo pacto roto
  await conn.sendMessage(m.chat, {
    document: { url: 'https://files.catbox.moe/4vjomv.jpg' }, // 👈 tu imagen como documento
    mimetype: 'application/pdf', // 👈 forzado para que se muestre como documento
    fileName: '☽ Pacto Roto de Shadow ☽',
    caption: '『📜』 Documento sellado ha sido destruido...'
  }, { quoted: m })
}

handlerUnreg.help = ['unreg']
handlerUnreg.tags = ['rg']
handlerUnreg.command = ['unreg', 'borrarregistro', 'delreg']

export default handlerUnreg
