const { getDatabase } = require('../../src/lib/database')
const config = require('../../config')
const util = require('util')

const pluginConfig = {
    name: 'eval',
    alias: ['$', 'ev', 'evaluate', '=>'],
    category: 'owner',
    description: 'Ejecuta código JavaScript (Owner Only)',
    usage: '=> <code> o .$ <code>',
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
    
    const raw = m.text || ''
    const code = m.fullArgs?.trim() || raw.replace(/^=>\s*/, '').trim()
    
    if (!code) {
        return m.reply(
            `⚙️ *E V A L – S H A D O W  G A R D E N*\n\n` +
            `Ejecuta código JavaScript en las sombras.\n\n` +
            `Ejemplos:\n` +
            `=> 1 + 1\n` +
            `=> m.chat\n` +
            `=> db.getUser(m.sender)\n`
        )
    }
    
    const db = getDatabase()

    let groupMetadata
    if (m.isGroup) {
        try {
            groupMetadata = await sock.groupMetadata(m.chat)
        } catch {
            groupMetadata = null
        }
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
    let type

    if (typeof result === 'undefined') {
        output = 'Las sombras no devolvieron nada...'
        type = 'sin valor'
    } else if (result === null) {
        output = 'Vacío como el abismo...'
        type = 'null'
    } else if (typeof result === 'object') {
        try {
            output = util.inspect(result, { depth: 2, maxArrayLength: 50 })
        } catch {
            output = String(result)
        }
        type = result?.constructor?.name || 'object'
    } else {
        output = String(result)
        type = typeof result
    }
    
    if (output.length > 3000) {
        output = output.slice(0, 3000) + '\n\n... (truncado por las sombras)'
    }
    
    const status = isError ? '❌ Error en las sombras' : '✅ Ejecución exitosa'
    
    await m.reply(
        `⚙️ *R E S U L T A D O  –  E V A L*\n\n` +
        `╭─「 📋 *I N F O* 」\n` +
        `│ Estado: ${status}\n` +
        `│ Tipo: ${type}\n` +
        `╰───────────────\n\n` +
        `\`\`\`${output}\`\`\``
    )
}

module.exports = {
    config: pluginConfig,
    handler
                       }
