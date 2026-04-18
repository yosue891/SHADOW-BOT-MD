import { getDatabase } from '../../src/lib/database.js'
import config from '../../config.js'
import util from 'util'

const handler = async (m, { conn, text }) => {
  if (!config.isOwner(m.sender)) {
    return m.reply('❌ *Solo el amo de las sombras puede usar este poder.*')
  }

  const code = text?.trim() || m.text?.replace(/^=>|^.\$|^\.ev|^\.evaluate/i, '').trim()

  if (!code) {
    return m.reply(
      `⚙️ *ᴇᴠᴀʟ – sʜᴀᴅᴏᴡ ɢᴀʀᴅᴇɴ*\n\n` +
      `> Ejecuta código JavaScript en las sombras.\n\n` +
      `*¿Acaso tengo que enseñarte todo? (Дурак). Ejemplo:*\n` +
      `> => 1 + 1\n` +
      `> => m.chat\n` +
      `> => db.getUser(m.sender)`
    )
  }

  const db = getDatabase()
  let result
  let isError = false

  try {
    result = await eval(`(async () => { ${code} })()`)
  } catch (e) {
    isError = true
    result = e
  }

  let output
  if (typeof result === 'undefined') {
    output = 'undefined'
  } else if (result === null) {
    output = 'null'
  } else if (typeof result === 'object') {
    try {
      output = util.inspect(result, { depth: 2, maxArrayLength: 50 })
    } catch {
      output = String(result)
    }
  } else {
    output = String(result)
  }

  if (output.length > 3000) {
    output = output.slice(0, 3000) + '\n\n... (truncado por las sombras)'
  }

  const status = isError ? '❌ Error' : '✅ Success'
  const type = isError ? result?.name || 'Error' : typeof result

  const resultText = `⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n` +
    `╭┈┈⬡「 📋 *ɪɴғᴏ* 」\n` +
    `┃ ${status}\n` +
    `┃ Type: ${type}\n` +
    `╰┈┈┈┈┈┈┈┈⬡\n\n` +
    `\`\`\`${output}\`\`\``

  await m.reply(resultText)
}

handler.command = ['eval', 'ev', 'evaluate', '=>']
handler.tags = ['owner']
handler.owner = true

export default handler
