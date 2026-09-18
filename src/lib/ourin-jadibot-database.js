import fs from 'fs'
import path from 'path'
const JADIBOT_AUTH_FOLDER = path.join(process.cwd(), 'session', 'jadibot')

const jadibotDatabases = new Map()

function getJadibotDbPath(jadibotId) {
    const id = jadibotId.replace(/@.+/g, '')
    return path.join(JADIBOT_AUTH_FOLDER, id, 'data.json')
}

function loadJadibotDb(jadibotId) {
    const id = jadibotId.replace(/@.+/g, '')
    
    if (jadibotDatabases.has(id)) {
        return jadibotDatabases.get(id)
    }
    
    const dbPath = getJadibotDbPath(id)
    const dir = path.dirname(dbPath)
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    
    let data = {
        owners: [],
        premiums: [],
        settings: {},
        users: {},
        groups: {}
    }
    
    if (fs.existsSync(dbPath)) {
        try {
            const content = fs.readFileSync(dbPath, 'utf8')
            data = JSON.parse(content)
        } catch {}
    }
    
    jadibotDatabases.set(id, data)
    return data
}

function saveJadibotDb(jadibotId) {
    const id = jadibotId.replace(/@.+/g, '')
    const data = jadibotDatabases.get(id)
    if (!data) return
    
    const dbPath = getJadibotDbPath(id)
    const dir = path.dirname(dbPath)
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2))
}

function isJadibotOwner(jadibotId, jid) {
    const db = loadJadibotDb(jadibotId)
    const senderNum = jid?.replace(/[^0-9]/g, '') || ''
    return db.owners.some(o => o.replace(/[^0-9]/g, '') === senderNum)
}

function addJadibotOwner(jadibotId, jid) {
    const db = loadJadibotDb(jadibotId)
    const num = jid.replace(/[^0-9]/g, '')
    if (!db.owners.includes(num)) {
        db.owners.push(num)
        saveJadibotDb(jadibotId)
        return true
    }
    return false
}

function removeJadibotOwner(jadibotId, jid) {
    const db = loadJadibotDb(jadibotId)
    const num = jid.replace(/[^0-9]/g, '')
    const idx = db.owners.indexOf(num)
    if (idx !== -1) {
        db.owners.splice(idx, 1)
        saveJadibotDb(jadibotId)
        return true
    }
    return false
}

function getJadibotOwners(jadibotId) {
    const db = loadJadibotDb(jadibotId)
    return db.owners
}

function isJadibotPremium(jadibotId, jid) {
    const db = loadJadibotDb(jadibotId)
    const senderNum = jid?.replace(/[^0-9]/g, '') || ''
    return db.premiums.some(p => {
        const premNum = typeof p === 'string' ? p.replace(/[^0-9]/g, '') : p.jid?.replace(/[^0-9]/g, '') || ''
        return premNum === senderNum
    })
}

function addJadibotPremium(jadibotId, jid, expiry = null) {
    const db = loadJadibotDb(jadibotId)
    const num = jid.replace(/[^0-9]/g, '')
    const existing = db.premiums.find(p => {
        const premNum = typeof p === 'string' ? p : p.jid?.replace(/[^0-9]/g, '') || ''
        return premNum === num
    })
    
    if (!existing) {
        db.premiums.push({ jid: num, expiry: expiry || null })
        saveJadibotDb(jadibotId)
        return true
    }
    return false
}

function removeJadibotPremium(jadibotId, jid) {
    const db = loadJadibotDb(jadibotId)
    const num = jid.replace(/[^0-9]/g, '')
    const idx = db.premiums.findIndex(p => {
        const premNum = typeof p === 'string' ? p : p.jid?.replace(/[^0-9]/g, '') || ''
        return premNum === num
    })
    
    if (idx !== -1) {
        db.premiums.splice(idx, 1)
        saveJadibotDb(jadibotId)
        return true
    }
    return false
}

function getJadibotPremiums(jadibotId) {
    const db = loadJadibotDb(jadibotId)
    return db.premiums
}

function getJadibotSetting(jadibotId, key) {
    const db = loadJadibotDb(jadibotId)
    return db.settings[key]
}

function setJadibotSetting(jadibotId, key, value) {
    const db = loadJadibotDb(jadibotId)
    db.settings[key] = value
    saveJadibotDb(jadibotId)
}

function getJadibotUser(jadibotId, jid) {
    const db = loadJadibotDb(jadibotId)
    return db.users[jid] || null
}

function setJadibotUser(jadibotId, jid, data) {
    const db = loadJadibotDb(jadibotId)
    db.users[jid] = { ...db.users[jid], ...data }
    saveJadibotDb(jadibotId)
}

function getJadibotGroup(jadibotId, jid) {
    const db = loadJadibotDb(jadibotId)
    return db.groups[jid] || null
}

function setJadibotGroup(jadibotId, jid, data) {
    const db = loadJadibotDb(jadibotId)
    db.groups[jid] = { ...db.groups[jid], ...data }
    saveJadibotDb(jadibotId)
}

function getAllJadibotData(jadibotId) {
    return loadJadibotDb(jadibotId)
}

export { loadJadibotDb, saveJadibotDb, isJadibotOwner, addJadibotOwner, removeJadibotOwner, getJadibotOwners, isJadibotPremium, addJadibotPremium, removeJadibotPremium, getJadibotPremiums, getJadibotSetting, setJadibotSetting, getJadibotUser, setJadibotUser, getJadibotGroup, setJadibotGroup, getAllJadibotData }