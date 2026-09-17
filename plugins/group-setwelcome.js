const handler = async (m, { conn, text, command, usedPrefix, isAdmin, isOwner }) => {
  const chat = global.db.data.chats[m.chat] || (global.db.data.chats[m.chat] = {})

  switch (command) {
    case 'setwelcome': {
      if (!text) {
        return m.reply(
          `⚔ *Configuración de Bienvenida* ⚔\n\n` +
          `Ingresa el nuevo mensaje de bienvenida.\n\n` +
          `*Variables disponibles:*\n` +
          `• *{usuario}* ➜ Menciona al nuevo usuario\n` +
          `• *{grupo}* ➜ Nombre del grupo\n` +
          `• *{desc}* ➜ Descripción del grupo\n\n` +
          `*Ejemplo:*\n` +
          `> ${usedPrefix + command} ¡Bienvenido {usuario} a {grupo}! Disfruta tu estadía.`
        )
      }
      chat.sWelcome = text.trim()
      m.reply(`✨ Mensaje de bienvenida establecido con éxito:\n\n> ${chat.sWelcome}`)
      break
    }

    case 'setbye': {
      if (!text) {
        return m.reply(
          `⚔ *Configuración de Despedida* ⚔\n\n` +
          `Ingresa el nuevo mensaje de despedida.\n\n` +
          `*Variables disponibles:*\n` +
          `• *{usuario}* ➜ Nombre/mención del usuario\n` +
          `• *{grupo}* ➜ Nombre del grupo\n` +
          `• *{desc}* ➜ Descripción del grupo\n\n` +
          `*Ejemplo:*\n` +
          `> ${usedPrefix + command} Adiós {usuario}, que la sombra te acompañe.`
        )
      }
      chat.sBye = text.trim()
      m.reply(`✨ Mensaje de despedida establecido con éxito:\n\n> ${chat.sBye}`)
      break
    }

    case 'delwelcome':
    case 'resetwelcome': {
      chat.sWelcome = ''
      m.reply(`✨ Mensaje de bienvenida restablecido a los valores por defecto.`)
      break
    }

    case 'delbye':
    case 'resetbye': {
      chat.sBye = ''
      m.reply(`✨ Mensaje de despedida restablecido a los valores por defecto.`)
      break
    }
  }
}

handler.help = ['setwelcome <texto>', 'setbye <texto>', 'delwelcome', 'delbye']
handler.tags = ['grupos']
handler.command = ['setwelcome', 'setbye', 'delwelcome', 'delbye', 'resetwelcome', 'resetbye']
handler.group = true
handler.admin = true

export default handler
