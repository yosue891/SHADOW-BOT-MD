const handler = async (m, { conn, text, command, usedPrefix, isAdmin, isOwner }) => {
  const chat = global.db?.data?.chats?.[m.chat] || (global.db.data.chats[m.chat] = {})

  switch (command) {
    case 'setwelcome':
    case 'setbienvenida': {
      if (!text) {
        const actual = chat.sWelcome || 'Por defecto (¡Bienvenido/a a las sombras! Que tu estancia sea legendaria.)'
        return m.reply(
          `⚔ *Configuración de Bienvenida* ⚔\n\n` +
          `• *Mensaje actual:*\n> ${actual}\n\n` +
          `Ingresa el nuevo mensaje de bienvenida.\n\n` +
          `*Variables disponibles:*\n` +
          `• *{usuario}* ➜ Menciona al nuevo usuario\n` +
          `• *{grupo}* ➜ Nombre del grupo\n` +
          `• *{desc}* ➜ Descripción del grupo\n` +
          `• *{miembros}* ➜ Cantidad de miembros\n` +
          `• *{fecha}* ➜ Fecha actual\n\n` +
          `*Ejemplo:*\n` +
          `> ${usedPrefix + command} ¡Bienvenido {usuario} a {grupo}! Disfruta tu estadía.`
        )
      }
      chat.sWelcome = text.trim()
      chat.sBienvenida = text.trim()
      if (global.db?.write) await global.db.write().catch(() => {})
      m.reply(`✨ Mensaje de bienvenida establecido con éxito:\n\n> ${chat.sWelcome}\n\n_Puedes probarlo con el comando *${usedPrefix}welcome*_`)
      break
    }

    case 'setgoodbye':
    case 'setbye':
    case 'setdespedida': {
      if (!text) {
        const actual = chat.sBye || chat.sGoodbye || 'Por defecto (Ha abandonado la orden. Que las sombras guíen su nuevo camino.)'
        return m.reply(
          `⚔ *Configuración de Despedida* ⚔\n\n` +
          `• *Mensaje actual:*\n> ${actual}\n\n` +
          `Ingresa el nuevo mensaje de despedida.\n\n` +
          `*Variables disponibles:*\n` +
          `• *{usuario}* ➜ Nombre/mención del usuario\n` +
          `• *{grupo}* ➜ Nombre del grupo\n` +
          `• *{desc}* ➜ Descripción del grupo\n` +
          `• *{miembros}* ➜ Cantidad de miembros restantes\n` +
          `• *{fecha}* ➜ Fecha actual\n\n` +
          `*Ejemplo:*\n` +
          `> ${usedPrefix + command} Adiós {usuario}, que la sombra te acompañe.`
        )
      }
      chat.sBye = text.trim()
      chat.sGoodbye = text.trim()
      chat.sDespedida = text.trim()
      if (global.db?.write) await global.db.write().catch(() => {})
      m.reply(`✨ Mensaje de despedida establecido con éxito:\n\n> ${chat.sBye}\n\n_Puedes probarlo con el comando *${usedPrefix}goodbye*_`)
      break
    }

    case 'delwelcome':
    case 'resetwelcome': {
      chat.sWelcome = ''
      chat.sBienvenida = ''
      if (global.db?.write) await global.db.write().catch(() => {})
      m.reply(`✨ Mensaje de bienvenida restablecido a los valores por defecto.`)
      break
    }

    case 'delgoodbye':
    case 'delbye':
    case 'resetgoodbye':
    case 'resetbye': {
      chat.sBye = ''
      chat.sGoodbye = ''
      chat.sDespedida = ''
      if (global.db?.write) await global.db.write().catch(() => {})
      m.reply(`✨ Mensaje de despedida restablecido a los valores por defecto.`)
      break
    }
  }
}

handler.help = ['setwelcome <texto>', 'setgoodbye <texto>', 'setbye <texto>', 'delwelcome', 'delgoodbye']
handler.tags = ['grupos']
handler.command = [
  'setwelcome', 'setbienvenida',
  'setgoodbye', 'setbye', 'setdespedida',
  'delwelcome', 'delgoodbye', 'delbye',
  'resetwelcome', 'resetgoodbye', 'resetbye'
]
handler.group = true
handler.admin = true

export default handler
