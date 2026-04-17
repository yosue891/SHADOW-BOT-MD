import util from 'util'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!global.owner.includes(m.sender)) {
    return m.reply('❌ *Solo el amo de las sombras puede usar este poder.*')
  }

  let code = text.trim()
  if (!code) {
    return m.reply(
`⚙️ *E V A L  –  S H A D O W  G A R D E N*

Ingresa código JavaScript para ejecutar en las sombras.

Ejemplos:
${usedPrefix + command} 1 + 1
${usedPrefix + command} m.chat
${usedPrefix + command} Object.keys(global.db.data)
`)
  }

  let result
  let isError = false

  try {
    result = await eval(`(async () => { ${code} })()`)
  } catch (e) {
    isError = true
    result = e
  }

  let output
  if (typeof result === 'undefined') output = 'undefined'
  else if (result === null) output = 'null'
  else if (typeof result === 'object') {
    try {
      output = util.inspect(result, { depth: 2, maxArrayLength: 50 })
    } catch {
      output = String(result)
    }
  } else output = String(result)

  if (output.length > 3000) {
    output = output.slice(0, 3000) + '\n\n... (truncado por las sombras)'
  }

  let status = isError ? '❌ Error en las sombras' : '✅ Ejecución exitosa'
  let type = isError ? result?.name || 'Error' : typeof result

  await m.reply(
`⚙️ *R E S U L T A D O  –  E V A L*

╭─「 📋 *I N F O* 」
│ Estado: ${status}
│ Tipo: ${type}
╰───────────────

\`\`\`${output}\`\`\`
`)
}

handler.help = ['eval']
handler.tags = ['owner']
handler.command = ['$', 'ev', 'eval', '=>']
handler.rowner = true

export default handler
