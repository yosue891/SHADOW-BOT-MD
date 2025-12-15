import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
const exec = promisify(_exec).bind(cp)

const handler = async (m, { conn, isOwner, command, text, usedPrefix, args, isROwner }) => {
  if (!isROwner) return
  if (global.conn.user.jid != conn.user.jid) return

  // Validación: si no hay texto, avisar al usuario
  if (!text) {
    return m.reply(
      `⚠️ Faltó el comando a ejecutar.\n\nEjemplo de uso:\n${usedPrefix}$ ls\n\nEsto listará los archivos en el directorio actual.`
    )
  }

  m.reply('⚙️ *Ejecutando...*')
  let o
  try {
    o = await exec(command.trimStart() + ' ' + text.trimEnd())
  } catch (e) {
    o = e
  } finally {
    const { stdout, stderr } = o
    if (stdout.trim()) m.reply(stdout)
    if (stderr.trim()) m.reply(stderr)
  }
}

handler.help = ['$ <comando>']
handler.tags = ['owner']
handler.customPrefix = ['$']
handler.command = new RegExp
handler.rowner = true

export default handler
