import util from 'util'

let handler = async (m, { conn }) => {
  if (!global.owner.includes(m.sender)) {
    return m.reply('❌ *Solo el amo de las sombras puede usar este poder.*')
  }

  let raw = m.text || ''
  if (!raw.startsWith('=>')) return !0

  let code = raw.slice(2).trim()
  if (!code) {
    return m.reply(
`⚙️ *E V A L  –  S H A D O W  G A R D E N*

Ingresa código JavaScript para ejecutar en las sombras.

Ejemplos:
=> 1 + 1
=> m.chat
=> groupMetadata.participants
=> Object.keys(global.db.data)
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

handler.customPrefix = /^=>/  // solo mensajes que empiezan con =>
handler.command = /^(.*)$/    // cualquier cosa después de =>
handler.rowner = true

export default handler
