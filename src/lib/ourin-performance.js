import { LRUCache } from 'lru-cache'
const userCache = new LRUCache({ max: 500, ttl: 1000 * 60 * 5 })
const groupCache = new LRUCache({ max: 200, ttl: 1000 * 60 * 5 })
const settingsCache = new LRUCache({ max: 100, ttl: 1000 * 60 * 10 })

const messageDebounce = new Map()
const DEBOUNCE_MS = 100
let _lastDebounceClean = 0

function debounceMessage(key) {
    const now = Date.now()
    const last = messageDebounce.get(key)

    if (last && (now - last) < DEBOUNCE_MS) {
        return true
    }

    messageDebounce.set(key, now)

    if (messageDebounce.size > 1000 && (now - _lastDebounceClean) > 5000) {
        _lastDebounceClean = now
        const cutoff = now - DEBOUNCE_MS * 2
        for (const [k, v] of messageDebounce) {
            if (v < cutoff) messageDebounce.delete(k)
        }
    }

    return false
}

function getCachedUser(jid, db) {
    let user = userCache.get(jid)
    if (!user) {
        user = db.getUser(jid)
        if (user) userCache.set(jid, user)
    }
    return user
}

function setCachedUser(jid, data, db) {
    userCache.set(jid, data)
    db.setUser(jid, data)
}

function invalidateUserCache(jid) {
    userCache.delete(jid)
}

function getCachedGroup(jid, db) {
    let group = groupCache.get(jid)
    if (!group) {
        group = db.getGroup(jid)
        if (group) groupCache.set(jid, group)
    }
    return group
}

function setCachedGroup(jid, data, db) {
    groupCache.set(jid, data)
    db.setGroup(jid, data)
}

function invalidateGroupCache(jid) {
    groupCache.delete(jid)
}

function getCachedSetting(key, db) {
    let setting = settingsCache.get(key)
    if (setting === undefined) {
        setting = db.setting(key)
        if (setting !== undefined) settingsCache.set(key, setting)
    }
    return setting
}

function setCachedSetting(key, value, db) {
    settingsCache.set(key, value)
    db.setting(key, value)
}

function invalidateSettingCache(key) {
    settingsCache.delete(key)
}

let allGroupsCache = null
let allGroupsCacheTime = 0
const ALL_GROUPS_TTL = 5 * 60 * 1000

async function getCachedAllGroups(sock) {
    const now = Date.now()
    if (allGroupsCache && (now - allGroupsCacheTime) < ALL_GROUPS_TTL) {
        return allGroupsCache
    }
    allGroupsCache = await sock.groupFetchAllParticipating()
    allGroupsCacheTime = now
    return allGroupsCache
}

function invalidateAllGroupsCache() {
    allGroupsCache = null
    allGroupsCacheTime = 0
}

function clearAllCaches() {
    userCache.clear()
    groupCache.clear()
    settingsCache.clear()
    messageDebounce.clear()
    invalidateAllGroupsCache()
}

function getCacheStats() {
    return {
        users: userCache.size,
        groups: groupCache.size,
        settings: settingsCache.size,
        debounce: messageDebounce.size
    }
}

export { debounceMessage, getCachedUser, setCachedUser, invalidateUserCache, getCachedGroup, setCachedGroup, invalidateGroupCache, getCachedSetting, setCachedSetting, invalidateSettingCache, clearAllCaches, getCacheStats, getCachedAllGroups, invalidateAllGroupsCache }