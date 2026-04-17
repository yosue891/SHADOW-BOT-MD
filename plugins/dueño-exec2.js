const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')
const util = require('util')

const pluginConfig = {
    name: 'eval',
    alias: ['$', 'ev', 'evaluate', '=>'],
    category: 'owner',
    description: 'Ejecuta código JavaScript (Owner Only)',
    usage: '=> <code>',
    example: '=> m.chat',
    isOwner: true,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 0,
    energi: 0,
    isEnabled: true,
    noPrefix: ['=>'],
    customTrigger: (body) => body?.startsWith('=>')
}

async function handler(m, { sock, store }) {

    if (!config.isOwner(m.sender)) {
        return m.reply('❌ *Solo el amo de las sombras puede usar este poder.*')
    }

    const code = m.fullArgs?.trim() || m.text?.trim().slice(2).trim()

    if (!code) {
        return m.reply(
`⚙️ *E V A L – S H A D O W  G A R D E N*

Ejecuta código JavaScript en las sombras.

Ejemplos:
=> 1 + 1
=> m.chat
=> groupMetadata.participants
=> Object.keys(global.db.data)
`)
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
        output = 'Las sombras no devolvieron nada...'
    } else if (result === null) {
        output = 'Vacío como el abismo...'
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

    await m.reply(
`⚙️ *R E S U L T A D O – E V A L*

╭─「 📋 *I N F O* 」
│ Estado: ${status}
│ Tipo: ${type}
╰───────────────

\`\`\`${output}\`\`\`
`)
}

module.exports = {
    config: pluginConfig,
    handler
          }
