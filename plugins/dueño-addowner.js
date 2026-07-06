let customOwnersLoaded = false

function loadCustomOwners() {
    if (!global.db?.data?.settings) return
    for (const jid in global.db.data.settings) {
        const settings = global.db.data.settings[jid]
        if (settings.customOwners && Array.isArray(settings.customOwners)) {
            settings.customOwners.forEach(num => {
                const exists = global.owner.some(entry => {
                    const n = Array.isArray(entry) ? entry[0] : entry
                    return String(n).replace(/[^0-9]/g, '') === String(num).replace(/[^0-9]/g, '')
                })
                if (!exists) {
                    global.owner.push([String(num).replace(/[^0-9]/g, ''), 'Owner', true])
                }
            })
        }
    }
    customOwnersLoaded = true
}

let handler = async (m, { conn, command, usedPrefix }) => {
    if (!customOwnersLoaded) loadCustomOwners()
    const cmd = command.toLowerCase()
    const isAdd = ['addowner', 'addown', 'setowner'].includes(cmd)
    const isDel = ['delowner', 'dedown'].includes(cmd)
    const isList = ['ownerlist', 'listowner'].includes(cmd)

    let targetNumber = ''

    if (isList) {
        const ownerList = global.owner || []
        if (ownerList.length === 0) {
            return m.reply('📋 *Lista de Owners*\n\n> No hay owners registrados.')
        }
        let txt = '📋 *Lista de Owners*\n\n'
        ownerList.forEach(([num, name], i) => {
            txt += `${i + 1}. 👑 ${num}${name ? ` (${name})` : ''}\n`
        })
        txt += `\n> Total: *${ownerList.length}* owner`
        return m.reply(txt)
    }

    if (m.quoted) {
        const quotedSender = m.quoted.sender || ''
        targetNumber = quotedSender.replace(/[^0-9]/g, '')
    } else if (m.mentionedJid && m.mentionedJid.length > 0) {
        targetNumber = m.mentionedJid[0].replace(/[^0-9]/g, '')
    } else if (m.args && m.args[0]) {
        targetNumber = m.args[0].replace(/[^0-9]/g, '')
        if (targetNumber.startsWith('0')) {
            targetNumber = '62' + targetNumber.slice(1)
        }
    }

    if (!targetNumber) {
        return m.reply(
            `👑 *${isAdd ? 'ADD' : 'DEL'} OWNER*\n\n` +
            `╭┈┈⬡「 📋 *Uso* 」\n` +
            `┃ ◦ Responde mensaje del usuario\n` +
            `┃ ◦ Tag @usuario\n` +
            `┃ ◦ Escribe el número directo\n` +
            `╰┈┈⬡\n\n` +
            `Ejemplo: ${usedPrefix}${command} 6281234567890`
        )
    }

    if (targetNumber.length < 10 || targetNumber.length > 15) {
        return m.reply('❌ *Error*\n\n> Formato de número no válido')
    }

    if (isAdd) {
        const alreadyOwner = global.owner.some(entry => {
            const num = Array.isArray(entry) ? entry[0] : entry
            return String(num).replace(/[^0-9]/g, '') === targetNumber
        })

        if (alreadyOwner) {
            return m.reply(`❌ \`${targetNumber}\` ya es owner.`)
        }

        const ownerEntry = [targetNumber, m.pushName || 'Owner', true]
        global.owner.push(ownerEntry)

        if (!global.db.data.settings[conn.user.jid]) {
            global.db.data.settings[conn.user.jid] = {}
        }
        const botSettings = global.db.data.settings[conn.user.jid]
        if (!botSettings.customOwners) botSettings.customOwners = []
        botSettings.customOwners.push(targetNumber)

        if (typeof global.db.save === 'function') global.db.save()

        m.react('👑')
        return m.reply(
            `👑 *Owner añadido*\n\n` +
            `╭┈┈⬡「 📋 *Detalle* 」\n` +
            `┃ 📱 Número: \`${targetNumber}\`\n` +
            `┃ 👑 Status: \`Owner\`\n` +
            `┃ 📊 Total: \`${global.owner.length}\` owner\n` +
            `╰┈┈⬡`
        )
    }

    if (isDel) {
        let index = -1
        global.owner.forEach((entry, i) => {
            const num = Array.isArray(entry) ? entry[0] : entry
            if (String(num).replace(/[^0-9]/g, '') === targetNumber) {
                index = i
            }
        })

        if (index === -1) {
            return m.reply(`❌ \`${targetNumber}\` no es owner.`)
        }

        global.owner.splice(index, 1)

        if (global.db.data.settings[conn.user.jid] && global.db.data.settings[conn.user.jid].customOwners) {
            const dbIndex = global.db.data.settings[conn.user.jid].customOwners.indexOf(targetNumber)
            if (dbIndex !== -1) global.db.data.settings[conn.user.jid].customOwners.splice(dbIndex, 1)
        }

        if (typeof global.db.save === 'function') global.db.save()

        m.react('✅')
        return m.reply(
            `✅ *Owner eliminado*\n\n` +
            `> Número: \`${targetNumber}\`\n` +
            `> Total: *${global.owner.length}* owner`
        )
    }
}

handler.command = ['addowner', 'addown', 'setowner', 'delowner', 'dedown', 'ownerlist', 'listowner']
handler.owner = true
handler.tags = ['owner']
handler.help = ['addowner <numero/@tag/responde>']

export default handler
