const handler = async (m, { conn, usedPrefix }) => {
  const chat = global.db.data.chats[m.chat]

  if (!chat || !chat.primaryBot) {
    if (global.conn && conn !== global.conn) {
      const socket = global.conn.ws?.socket || global.conn.ws
      const state = socket?.readyState
      if (state !== 2 && state !== 3) return
    }
    return conn.reply(
      m.chat,
      `⚠︎ *No hay ningún Bot primario configurado en este grupo.*\n> Todos los bots activos ya están respondiendo normalmente.\n\n` +
      `➜ Para asignar uno usa: *${usedPrefix || '.'}setprimary main*`,
      m
    )
  }

  if (global.conn && conn !== global.conn) {
    const socket = global.conn.ws?.socket || global.conn.ws
    const state = socket?.readyState
    if (state !== 2 && state !== 3) return
  }

  try {
    const oldPrimary = chat.primaryBot
    const oldNumber = oldPrimary.split('@')[0].replace(/\D/g, '')
    chat.primaryBot = null

    conn.reply(
      m.chat,
      `✧ *¡CONFIGURACIÓN RESTABLECIDA!* ✧\n\n` +
      `➜ *Bot Primario eliminado:* @${oldNumber}\n` +
      `> A partir de ahora, todos los bots activos del sistema volverán a responder comandos en este grupo.\n\n` +
      `📌 *INFORMACIÓN:*\n` +
      `• Puedes volver a asignar un Bot Principal cuando desees con: \`${usedPrefix || '.'}setprimary main\`\n` +
      `• O consultar el estado con: \`${usedPrefix || '.'}verprimary\``,
      m,
      { mentions: [oldPrimary] }
    )
  } catch (e) {
    conn.reply(
      m.chat,
      `⚠︎ Ocurrió un problema al intentar eliminar el Bot primario.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`,
      m
    )
  }
}

handler.help = ['delprimary']
handler.tags = ['grupos']
handler.command = ['delprimary']
handler.group = true
handler.admin = true

export default handler
