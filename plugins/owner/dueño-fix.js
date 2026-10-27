import { execSync } from 'child_process'

var handler = async (m, { conn, text, usedPrefix, command, isMods }) => {
  if (!isMods) return
  await m.react('🕒')

  const isForce = text && (text.includes('-f') || text.includes('force') || text.includes('reset'))

  try {
    if (isForce) {
      try {
        execSync('git reset --hard HEAD')
      } catch (e) {
        console.warn('[FIX FORCE reset warning]:', e.message)
      }
    }

    const stdout = execSync('git pull' + (m.fromMe && text && !isForce ? ' ' + text : ''))
    let messager = stdout.toString()
    if (messager.includes('Already up to date.') || messager.includes('❀ Ya está cargada la actualización.'))
      messager = '❀ Los datos ya están actualizados a la última versión.'
    else if (messager.includes('Updating') || messager.includes('ꕥ Actualizando.'))
      messager = '❀ Procesando, actualización completada exitosamente.\n\n' + stdout.toString()
    
    await m.react('✔️')
    await conn.sendMessage(
      m.chat,
      {
        text: messager
      },
      { quoted: m }
    )
  } catch {
    try {
      const status = execSync('git status --porcelain')
      if (status.length > 0) {
        const conflictedFiles = status
          .toString()
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            if (
              line.includes('.npm/') ||
              line.includes('.cache/') ||
              line.includes('tmp/') ||
              line.includes('database.json') ||
              line.includes('sessions/Principal/') ||
              line.includes('npm-debug.log')
            ) {
              return null
            }
            return '*→ ' + line.slice(3) + '*'
          })
          .filter(Boolean)

        if (conflictedFiles.length > 0) {
          const errorMessage = `\`⚠︎ No se pudo realizar la actualización:\`\n\n` +
            `> *Se han encontrado cambios locales en los archivos del bot que entran en conflicto con las nuevas actualizaciones del repositorio.*\n\n` +
            `${conflictedFiles.join('\n')}\n\n` +
            `💡 *Para forzar y sobrescribir con la versión de GitHub usa:*\n` +
            `> *${usedPrefix + command} force*`
          
          await conn.sendMessage(
            m.chat,
            {
              text: errorMessage
            },
            { quoted: m }
          )
          await m.react('✖️')
        }
      }
    } catch (error) {
      console.error(error)
      let errorMessage2 = '⚠︎ Ocurrió un error inesperado.'
      if (error.message) {
        errorMessage2 += '\n⚠︎ Mensaje de error: ' + error.message
      }
      
      await conn.sendMessage(
        m.chat,
        {
          text: errorMessage2
        },
        { quoted: m }
      )
    }
  }
}

handler.help = ['update']
handler.tags = ['owner']
handler.command = ['update', 'fix', 'actualizar']

export default handler
