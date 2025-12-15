import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
const exec = promisify(_exec).bind(cp)

const handler = async (m, { conn, text, isROwner }) => {
  // Solo dueño real
  if (!isROwner) return
  // Evita ejecución desde conexiones hijas
  if (global.conn?.user?.jid !== conn.user.jid) return

  // Si no hay texto tras el $, mostrar ayuda
  if (!text || !text.trim()) {
    return m.reply(
      '⚠️ Faltó el comando a ejecutar.\n\nEjemplos:\n' +
      '• $ ls\n' +
      '• $ node -v\n' +
      '• $ echo "Shadow-BOT-MD"\n\n' +
      'Usa $ seguido del comando que quieres correr.'
    )
  }

  m.reply('⚙️ Ejecutando...')
  let o
  try {
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

// Captura cualquier mensaje que empiece con $ (incluye el caso vacío)
handler.customPrefix = /^\$/
handler.command = /[\s\S]*/i  // acepta cualquier contenido (incluye vacío)

// Solo dueño real
handler.rowner = true

export default handler
