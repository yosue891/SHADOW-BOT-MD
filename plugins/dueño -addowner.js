import config from '../../config'
import { getDatabase } from '../../src/lib/database'
import { addJadibotOwner, removeJadibotOwner, getJadibotOwners } from '../../src/lib/jadibotDatabase'
import fs from 'fs'
import path from 'path'
import { isLid, lidToJid } from '../../src/lib/lidHelper'
import { getGroupMode } from '../group/botmode'

function cleanJid(jid) {
    if (!jid) return null
    if (isLid(jid)) jid = lidToJid(jid)
    return jid.includes('@') ? jid : jid + '@s.whatsapp.net'
}

function extractNumber(m) {
    const { resolveAnyLidToJid, isLid, isLidConverted } = require('../../src/lib/lidHelper')
    let targetNumber = ''
    
    if (m.quoted) {
        let sender = m.quoted.sender || ''
        if (isLid(sender) || isLidConverted(sender)) {
            sender = resolveAnyLidToJid(sender, m.groupMembers || [])
        }
        targetNumber = sender?.replace(/[^0-9]/g, '') || ''
    } else if (m.mentionedJid?.length) {
        let jid = cleanJid(m.mentionedJid[0])
        if (isLid(jid) || isLidConverted(jid)) {
            jid = resolveAnyLidToJid(jid, m.groupMembers || [])
        }
        targetNumber = jid?.replace(/[^0-9]/g, '') || ''
    } else if (m.args[0]) {
        targetNumber = m.args[0].replace(/[^0-9]/g, '')
        if (targetNumber.startsWith('08')) {
            targetNumber = '62' + targetNumber.slice(1)
        }
    }
    
    if (targetNumber.startsWith('0')) {
        targetNumber = '62' + targetNumber.slice(1)
    }
    
    if (targetNumber.length > 15) {
        return ''
    }
    
    return targetNumber
}

function savePanelConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.js')
        let content = fs.readFileSync(configPath, 'utf8')
        
        const ownerPanelsStr = JSON.stringify(config.pterodactyl.ownerPanels || [])
        content = content.replace(/ownerPanels:\s*\[.*?\]/s, `ownerPanels: ${ownerPanelsStr}`)
        
        const sellersStr = JSON.stringify(config.pterodactyl.sellers || [])
        content = content.replace(/sellers:\s*\[.*?\]/s, `sellers: ${sellersStr}`)
        
        fs.writeFileSync(configPath, content, 'utf8')
        return true
    } catch (e) {
        console.error('[AddOwner] Failed to save panel config:', e.message)
        return false
    }
}

function removeFromSellers(targetNumber) {
    if (!config.pterodactyl.sellers) return false
    const idx = config.pterodactyl.sellers.findIndex(s => String(s).trim() === String(targetNumber).trim())
    if (idx !== -1) {
        config.pterodactyl.sellers.splice(idx, 1)
        return true
    }
    return false
}

function removeFromOwnerPanels(targetNumber) {
    if (!config.pterodactyl.ownerPanels) return false
    const idx = config.pterodactyl.ownerPanels.findIndex(s => String(s).trim() === String(targetNumber).trim())
    if (idx !== -1) {
        config.pterodactyl.ownerPanels.splice(idx, 1)
        return true
    }
    return false
}

let handler = async (m, { conn, isJadibot, jadibotId }) => {
    const db = getDatabase()
    const cmd = m.command.toLowerCase()
    const groupMode = m.isGroup ? getGroupMode(m.chat, db) : 'private'
    const isCpanelMode = m.isGroup && groupMode === 'cpanel'
    
    const isAdd = ['addowner', 'addown', 'setowner'].includes(cmd)
    const isDel = ['delowner', 'dedown'].includes(cmd)
    const isList = ['ownerlist', 'listowner'].includes(cmd)
    
    if (!config.pterodactyl) config.pterodactyl = {}
    if (!config.pterodactyl.ownerPanels) config.pterodactyl.ownerPanels = []
    if (!config.pterodactyl.sellers) config.pterodactyl.sellers = []
    if (!db.data.owner) db.data.owner = []
    
    if (isList) {
        if (isJadibot && jadibotId) {
            const jbOwners = getJadibotOwners(jadibotId)
            if (jbOwners.length === 0) {
                return m.reply(`📋 *Lista Owner Jadibot*\n\n> No hay owners registrados.`)
            }
            let txt = `📋 *Lista Owner Jadibot*\n\n`
            txt += `> Bot: *${jadibotId}*\n`
            txt += `> Total: *${jbOwners.length}*\n\n`
            jbOwners.forEach((s, i) => txt += `${i + 1}. 👑 \`${s}\`\n`)
            return m.reply(txt)
        } else if (isCpanelMode) {
            const panelOwners = config.pterodactyl.ownerPanels || []
            const fullOwners = db.data.owner || []
            const allOwners = [...new Set([...panelOwners, ...fullOwners])]
            
            if (allOwners.length === 0) {
                return m.reply(`📋 *Lista Owner Panel*\n\n> No hay owners registrados.`)
            }
            let txt = `📋 *Lista Owner Panel*\n\n`
            txt += `> Total: *${allOwners.length}*\n\n`
            allOwners.forEach((s, i) => {
                const isPanelOwner = panelOwners.includes(s)
                const isFullOwner = fullOwners.includes(s)
                let label = isPanelOwner && isFullOwner ? '👑🖥️' : (isFullOwner ? '👑' : '🖥️')
                txt += `${i + 1}. ${label} \`${s}\`\n`
            })
            return m.reply(txt)
        } else {
            const fullOwners = db.data.owner || []
            if (fullOwners.length === 0) {
                return m.reply(`📋 *Lista Full Owner*\n\n> No hay owners registrados.`)
            }
            let txt = `📋 *Lista Full Owner*\n\n`
            txt += `> Total: *${fullOwners.length}*\n\n`
            fullOwners.forEach((s, i) => txt += `${i + 1}. 👑 \`${s}\`\n`)
            return m.reply(txt)
        }
    }
    
    const targetNumber = extractNumber(m)
    
    if (!targetNumber) {
        return m.reply(
            `👑 *${isAdd ? 'ADD' : 'DEL'} OWNER*\n\n` +
            `Responde un mensaje, menciona o escribe el número.\n\n` +
            `Ejemplo:\n${m.prefix}${cmd} 6281234567890`
        )
    }
    
    if (targetNumber.length < 10 || targetNumber.length > 15) {
        return m.reply(`❌ Número inválido.`)
    }
    
    if (isJadibot && jadibotId) {
        if (isAdd) {
            if (addJadibotOwner(jadibotId, targetNumber)) {
                m.react('👑')
                return m.reply(`👑 Owner añadido: \`${targetNumber}\``)
            } else {
                return m.reply(`❌ Ya es owner.`)
            }
        } else if (isDel) {
            if (removeJadibotOwner(jadibotId, targetNumber)) {
                m.react('✅')
                return m.reply(`✅ Owner eliminado: \`${targetNumber}\``)
            } else {
                return m.reply(`❌ No es owner.`)
            }
        }
        return
    }
    
    if (isCpanelMode) {
        if (isAdd) {
            if (config.pterodactyl.ownerPanels.includes(targetNumber)) {
                return m.reply(`❌ Ya es owner panel.`)
            }
            
            config.pterodactyl.ownerPanels.push(targetNumber)
            if (savePanelConfig()) {
                m.react('👑')
                return m.reply(`👑 Owner Panel añadido: \`${targetNumber}\``)
            } else {
                return m.reply(`❌ Error guardando config.js`)
            }
        } else if (isDel) {
            const ownerList = config.pterodactyl.ownerPanels || []
            const found = ownerList.includes(targetNumber)
            if (!found) {
                return m.reply(`❌ No es owner panel.`)
            }
            config.pterodactyl.ownerPanels = ownerList.filter(s => s !== targetNumber)
            if (savePanelConfig()) {
                m.react('✅')
                return m.reply(`✅ Owner Panel eliminado: \`${targetNumber}\``)
            } else {
                return m.reply(`❌ Error guardando config.js`)
            }
        }
    } else {
        if (isAdd) {
            if (db.data.owner.includes(targetNumber)) {
                return m.reply(`❌ Ya es full owner.`)
            }
            
            db.data.owner.push(targetNumber)
            db.save()
            
            m.react('👑')
            return m.reply(`👑 Full Owner añadido: \`${targetNumber}\``)
        } else if (isDel) {
            const index = db.data.owner.indexOf(targetNumber)
            if (index === -1) {
                return m.reply(`❌ No es full owner.`)
            }
            
            db.data.owner.splice(index, 1)
            db.save()
            
            m.react('✅')
            return m.reply(`✅ Full Owner eliminado: \`${targetNumber}\``)
        }
    }
}

handler.help = ['addowner', 'delowner', 'ownerlist']
handler.tags = ['owner']
handler.command = ['addowner', 'addown', 'setowner', 'delowner', 'dedown', 'ownerlist', 'listowner']
handler.owner = true

export default handler
