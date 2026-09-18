import fs from 'fs'
import path from 'path'
const DB_PATH = path.join(process.cwd(), 'src', 'database')
const OWNER_FILE = path.join(DB_PATH, 'owner.json')
const PREMIUM_FILE = path.join(DB_PATH, 'premium.json')
const PARTNER_FILE = path.join(DB_PATH, 'partner.json')

const CACHE_TTL = 30000
const cache = { owners: null, ownerTs: 0, premium: null, premiumTs: 0, partners: null, partnerTs: 0 }

function ensureDbPath() {
    if (!fs.existsSync(DB_PATH)) {
        fs.mkdirSync(DB_PATH, { recursive: true })
    }
}

function loadOwners() {
    const now = Date.now()
    if (cache.owners && (now - cache.ownerTs) < CACHE_TTL) return cache.owners
    ensureDbPath()
    if (!fs.existsSync(OWNER_FILE)) {
        fs.writeFileSync(OWNER_FILE, JSON.stringify({ owners: [] }, null, 2))
    }
    try {
        const data = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf-8'))
        cache.owners = data.owners || []
        cache.ownerTs = now
        return cache.owners
    } catch {
        return []
    }
}

function saveOwners(owners) {
    ensureDbPath()
    fs.writeFileSync(OWNER_FILE, JSON.stringify({ owners, updatedAt: new Date().toISOString() }, null, 2))
    cache.owners = owners
    cache.ownerTs = Date.now()
}

function loadPremium() {
    const now = Date.now()
    if (cache.premium && (now - cache.premiumTs) < CACHE_TTL) return cache.premium
    ensureDbPath()
    if (!fs.existsSync(PREMIUM_FILE)) {
        fs.writeFileSync(PREMIUM_FILE, JSON.stringify({ premium: [] }, null, 2))
    }
    try {
        const data = JSON.parse(fs.readFileSync(PREMIUM_FILE, 'utf-8'))
        cache.premium = data.premium || []
        cache.premiumTs = now
        return cache.premium
    } catch {
        return []
    }
}

function savePremium(premium) {
    ensureDbPath()
    fs.writeFileSync(PREMIUM_FILE, JSON.stringify({ premium, updatedAt: new Date().toISOString() }, null, 2))
    cache.premium = premium
    cache.premiumTs = Date.now()
}

function loadPartners() {
    const now = Date.now()
    if (cache.partners && (now - cache.partnerTs) < CACHE_TTL) return cache.partners
    ensureDbPath()
    if (!fs.existsSync(PARTNER_FILE)) {
        fs.writeFileSync(PARTNER_FILE, JSON.stringify({ partners: [] }, null, 2))
    }
    try {
        const data = JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf-8'))
        cache.partners = data.partners || []
        cache.partnerTs = now
        return cache.partners
    } catch {
        return []
    }
}

function savePartners(partners) {
    ensureDbPath()
    fs.writeFileSync(PARTNER_FILE, JSON.stringify({ partners, updatedAt: new Date().toISOString() }, null, 2))
    cache.partners = partners
    cache.partnerTs = Date.now()
}

function matchJid(cleanA, cleanB) {
    return cleanA === cleanB || cleanA.endsWith(cleanB) || cleanB.endsWith(cleanA)
}

function isOwner(jid) {
    if (!jid) return false
    const cleanJid = jid.replace(/@.+/g, '')
    if (!cleanJid) return false

    const owners = loadOwners()
    return owners.some(o => {
        if (typeof o === 'string') return matchJid(cleanJid, o.replace(/[^0-9]/g, ''))
        const ownerNum = (o.number || o.jid || '').replace(/[^0-9]/g, '')
        return matchJid(cleanJid, ownerNum)
    })
}

function isPremium(jid) {
    if (!jid) return false
    const cleanJid = jid.replace(/@.+/g, '')
    if (!cleanJid) return false

    const premiumList = loadPremium()
    const user = premiumList.find(p => {
        if (typeof p === 'string') return matchJid(cleanJid, p.replace(/[^0-9]/g, ''))
        const premiumNum = (p.number || p.jid || '').replace(/[^0-9]/g, '')
        return matchJid(cleanJid, premiumNum)
    })

    if (!user) return false
    if (typeof user === 'string') return true
    if (user.expiredAt && new Date(user.expiredAt) < new Date()) {
        removePremium(cleanJid)
        return false
    }
    return true
}

function isPartner(jid) {
    if (!jid) return false
    const cleanJid = jid.replace(/@.+/g, '')
    if (!cleanJid) return false

    const partnerList = loadPartners()
    const user = partnerList.find(p => {
        if (typeof p === 'string') return matchJid(cleanJid, p.replace(/[^0-9]/g, ''))
        const partnerNum = (p.number || p.jid || '').replace(/[^0-9]/g, '')
        return matchJid(cleanJid, partnerNum)
    })

    if (!user) return false
    if (typeof user === 'string') return true
    if (user.expiredAt && new Date(user.expiredAt) < new Date()) {
        removePartner(cleanJid)
        return false
    }
    return true
}

function addOwner(jid, name = 'Unknown') {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    if (isOwner(cleanJid)) return { success: false, message: 'Ya es owner' }

    const owners = loadOwners()
    owners.push({
        jid: cleanJid,
        number: cleanJid,
        name,
        addedAt: new Date().toISOString()
    })
    saveOwners(owners)
    return { success: true, message: 'Agregado como owner correctamente' }
}

function removeOwner(jid) {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    const owners = loadOwners()
    const index = owners.findIndex(o => o.number === cleanJid || o.jid === cleanJid)
    if (index === -1) return { success: false, message: 'No encontrado en la lista de owners' }

    owners.splice(index, 1)
    saveOwners(owners)
    return { success: true, message: 'Eliminado de owner correctamente' }
}

function addPremium(jid, days = 30, name = 'Unknown') {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    const premiumList = loadPremium()

    const existing = premiumList.findIndex(p => p.number === cleanJid || p.jid === cleanJid)
    const expiredAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString()

    if (existing !== -1) {
        const currentExpiry = new Date(premiumList[existing].expiredAt || 0)
        const baseTime = currentExpiry > new Date() ? currentExpiry : new Date()
        premiumList[existing].expiredAt = new Date(baseTime.getTime() + (days * 24 * 60 * 60 * 1000)).toISOString()
        premiumList[existing].name = name || premiumList[existing].name
        savePremium(premiumList)
        return { success: true, message: `Premium extendido ${days} días`, expiredAt: premiumList[existing].expiredAt }
    }

    premiumList.push({
        jid: cleanJid,
        number: cleanJid,
        name,
        addedAt: new Date().toISOString(),
        expiredAt
    })
    savePremium(premiumList)
    return { success: true, message: `Agregado como premium ${days} días`, expiredAt }
}

function removePremium(jid) {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    const premiumList = loadPremium()
    const index = premiumList.findIndex(p => p.number === cleanJid || p.jid === cleanJid)
    if (index === -1) return { success: false, message: 'No encontrado en la lista de premium' }

    premiumList.splice(index, 1)
    savePremium(premiumList)
    return { success: true, message: 'Eliminado de premium correctamente' }
}

function addPartner(jid, days = 30, name = 'Unknown') {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    const partnerList = loadPartners()

    const existing = partnerList.findIndex(p => p.number === cleanJid || p.jid === cleanJid)
    const expiredAt = new Date(Date.now() + (days * 24 * 60 * 60 * 1000)).toISOString()

    if (existing !== -1) {
        const currentExpiry = new Date(partnerList[existing].expiredAt || 0)
        const baseTime = currentExpiry > new Date() ? currentExpiry : new Date()
        partnerList[existing].expiredAt = new Date(baseTime.getTime() + (days * 24 * 60 * 60 * 1000)).toISOString()
        partnerList[existing].name = name || partnerList[existing].name
        savePartners(partnerList)
        return { success: true, message: `Partner extendido ${days} días`, expiredAt: partnerList[existing].expiredAt }
    }

    partnerList.push({
        jid: cleanJid,
        number: cleanJid,
        name,
        addedAt: new Date().toISOString(),
        expiredAt
    })
    savePartners(partnerList)
    return { success: true, message: `Agregado como partner ${days} días`, expiredAt }
}

function removePartner(jid) {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    const partnerList = loadPartners()
    const index = partnerList.findIndex(p => p.number === cleanJid || p.jid === cleanJid)
    if (index === -1) return { success: false, message: 'No encontrado en la lista de partners' }

    partnerList.splice(index, 1)
    savePartners(partnerList)
    return { success: true, message: 'Eliminado de partner correctamente' }
}

function getOwnerList() {
    return loadOwners()
}

function getPremiumList() {
    const premiumList = loadPremium()
    const now = new Date()
    return premiumList.filter(p => {
        if (p.expiredAt && new Date(p.expiredAt) < now) {
            removePremium(p.number || p.jid)
            return false
        }
        return true
    })
}

function getPremiumInfo(jid) {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    const premiumList = loadPremium()
    return premiumList.find(p => p.number === cleanJid || p.jid === cleanJid) || null
}

function getPartnerList() {
    const partnerList = loadPartners()
    const now = new Date()
    return partnerList.filter(p => {
        if (p.expiredAt && new Date(p.expiredAt) < now) {
            removePartner(p.number || p.jid)
            return false
        }
        return true
    })
}

function getPartnerInfo(jid) {
    const cleanJid = jid?.replace(/@.+/g, '') || ''
    const partnerList = loadPartners()
    return partnerList.find(p => p.number === cleanJid || p.jid === cleanJid) || null
}

export { loadOwners, saveOwners, loadPremium, savePremium, loadPartners, savePartners, isOwner, isPremium, isPartner, addOwner, removeOwner, addPremium, removePremium, addPartner, removePartner, getOwnerList, getPremiumList, getPremiumInfo, getPartnerList, getPartnerInfo }