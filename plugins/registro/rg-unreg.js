let handlerUnreg = async (m, { conn }) => {
  const user = global.db.data.users[m.sender]
  const pp = await conn.profilePictureUrl(m.sender, 'image').catch(() => 'https://raw.githubusercontent.com/Andresv27728/dtbs/main/shadow.jpg')

  if (!user.registered) {
    return m.reply('『🎃⚠️』 No tienes ningún pacto sombrío activo en el aquelarre...')
  }

  await m.react('🕯️')

  user.registered = false
  user.name = ''
  user.age = 0

  await conn.sendMessage(m.chat, {
    text: `『🎃💀』 El sello arcano ha sido roto...\n\n🦇 La sombra se disuelve en la noche eterna de Halloween.`
  }, { quoted: m })

  await conn.sendMessage(m.chat, {
    document: { url: 'https://files.catbox.moe/4vjomv.jpg' },
    mimetype: 'application/pdf',
    fileName: '🎃 Pacto Roto de Ultratumba 🦇',
    caption: '『📜🕯️』 El pergamino del pacto ha sido consumido por el fuego fatuo...'
  }, { quoted: m })
}

handlerUnreg.help = ['unreg']
handlerUnreg.tags = ['rg']
handlerUnreg.command = ['unreg', 'borrarregistro', 'delreg']

export default handlerUnreg
