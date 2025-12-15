import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
const exec = promisify(_exec).bind(cp)

const handler = async (m, { conn, command, text, usedPrefix, args, isROwner }) => {
  if (!isROwner) return
  if (global.conn.user.jid !== conn.user.jid) return

  // Validación: si no hay texto, mostrar ayuda
  if (!text || !text.trim()) {
    return m.reply(
      `⚠️ Faltó el comando a ejecutar.\n\nEjemplos:\n` +
      `• $ ls\n• $ node -v\n• $ echo "Shadow-BOT-MD"\n\n` +
      `Usa $ seguido del comando que quieres correr.`
    )
  }

  m.reply('⚙️ Ejecutando...')
  let o
  try {
    // Ejecuta exactamente lo que se pasó tras el prefijo $
    o = await exec(text.trim())
  } catch (e) {
    o = e
  } finally {
    const { stdout = '', stderr = '' } = o
    if (stdout.trim()) m.reply(stdout)
    if (stderr.trim()) m.reply(stderr)
  }
}

handler.help = ['$ <comando>']
handler.tags = ['owner']
handler.customPrefix = ['$']               // activa con prefijo literal $
handler.command = /^([\s\S]+)$/i           // captura cualquier texto después de $
handler.rowner = true

export default handler
