import { promises as fs, existsSync } from 'fs'
import path from 'path'

var handler = async (m, { conn }) => {
  if (global.conn.user.jid !== conn.user.jid) {
    return conn.reply(m.chat, `Usa este comando solo en el número principal del bot.`, m)
  }
  
  await conn.reply(m.chat, `> 🤍 Iniciando eliminación de archivos de sesión excepto creds.json...`, m)
  m.react('🕓') 

  const sessionPath = './Sessions/Principal/'

  try {
    if (!existsSync(sessionPath)) {
      return conn.reply(m.chat, `La carpeta de sesiones no existe o está vacía.`, m)
    }

    const files = await fs.readdir(sessionPath)
    let deletedCount = 0

    for (const file of files) {
      if (file !== 'creds.json') {
        await fs.unlink(path.join(sessionPath, file))
        deletedCount++
      }
    }

    if (deletedCount === 0) {
      await conn.reply(m.chat, `No había archivos para eliminar, solo creds.json está presente.`, m)
    } else {
      m.react('✅')
      await conn.reply(m.chat, `Se eliminaron ${deletedCount} archivos de sesión, creds.json quedó intacto.`, m)
      conn.reply(m.chat, `*Bot limpio correctamente.*`, m)
    }
  } catch (error) {
    console.error('Error limpiando sesiones:', error)
    await conn.reply(m.chat, `Ocurrió un error durante la limpieza.`, m)
  }
}

handler.help = ['dsowner']
handler.tags = ['owner']
handler.command = ['delai', 'dsowner', 'clearallsession']
handler.rowner = true

export default handler
