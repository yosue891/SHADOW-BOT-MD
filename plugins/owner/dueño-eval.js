import util from 'util'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  let code = (m.quoted?.text || m.quoted?.caption || '').trim() || (text || '').trim()

  if (!code) {
    return m.reply(
      `⚙️ *ᴇᴠᴀʟ*\n\n` +
      `> Responde a un mensaje con código o escribe código tras el comando.\n\n` +
      `*Uso:*\n` +
      `> ${usedPrefix + command} 1 + 1\n` +
      `> ${usedPrefix + command} m.chat\n\n` +
      `*(Solo owner real.)*`
    )
  }

  if (code.startsWith('```') && code.endsWith('```')) {
    code = code.slice(3, -3)
    if (code.startsWith('javascript') || code.startsWith('js')) {
      code = code.replace(/^(javascript|js)\n?/, '')
    }
    code = code.trim()
  }

  await m.react('⏳')

  let result
  let isError = false
  try {
    try {
      result = await eval(`(async () => (${code}))()`)
    } catch {
      result = await eval(`(async () => { ${code} })()`)
    }
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
    output = output.slice(0, 3000) + '\n\n... (truncado)'
  }

  const status = isError ? '❌ Error' : '✅ Success'
  const type = isError ? result?.name || 'Error' : typeof result
  const preview = code.length > 100 ? code.slice(0, 100) + '...' : code

  await m.react(isError ? '❌' : '✅')
  await m.reply(
    `⚙️ *ᴇᴠᴀʟ ʀᴇsᴜʟᴛ*\n\n` +
    `╭┈┈⬡「 📋 *ᴄᴏᴅᴇ* 」\n` +
    `┃ \`${preview}\`\n` +
    `├┈┈⬡「 📊 *ʀᴇsᴜʟᴛ* 」\n` +
    `┃ ${status}\n` +
    `┃ Type: ${type}\n` +
    `╰┈┈┈┈┈┈┈┈⬡\n\n` +
    `\`\`\`${output}\`\`\``
  )
}

handler.help = ['eval']
handler.tags = ['owner']
handler.command = ['eval', 'ev', 'evaluate', '>', 'run', 'execute']
handler.rowner = true

export default handler
