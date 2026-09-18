import fs from 'fs'
import path from 'path'
const DO_DIR = path.join(process.cwd(), 'database', 'digitalocean')
const VALID_SERVERS = ['do1', 'do2', 'do3', 'do4', 'do5']
const VALID_ROLES = ['owner', 'ceo', 'reseller']

function ensureDir() {
    if (!fs.existsSync(DO_DIR)) {
        fs.mkdirSync(DO_DIR, { recursive: true })
    }
}

function getFilePath(role, server) {
    return path.join(DO_DIR, `${role}_${server}.json`)
}

function loadRoleFile(role, server) {
    ensureDir()
    const filePath = getFilePath(role, server)
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf8')
        return []
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch {
        return []
    }
}

function saveRoleFile(role, server, data) {
    ensureDir()
    const filePath = getFilePath(role, server)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
}

function cleanNumber(jid) {
    if (!jid) return null
    return jid.replace(/@.*$/, '').replace(/[^0-9]/g, '')
}

function getRoles(server) {
    if (!VALID_SERVERS.includes(server)) return null
    return {
        owners: loadRoleFile('owner', server),
        ceos: loadRoleFile('ceo', server),
        resellers: loadRoleFile('reseller', server)
    }
}

function hasRole(jid, server, allowedRoles = ['owner', 'ceo', 'reseller']) {
    if (!VALID_SERVERS.includes(server)) return false
    const number = cleanNumber(jid)
    if (!number) return false
    
    for (const role of allowedRoles) {
        if (!VALID_ROLES.includes(role)) continue
        const list = loadRoleFile(role, server)
        if (list.includes(number)) return true
    }
    return false
}

function getUserRole(jid, server) {
    if (!VALID_SERVERS.includes(server)) return null
    const number = cleanNumber(jid)
    if (!number) return null
    
    for (const role of VALID_ROLES) {
        const list = loadRoleFile(role, server)
        if (list.includes(number)) return role
    }
    return null
}

function addRole(jid, server, role) {
    if (!VALID_SERVERS.includes(server)) return { success: false, error: 'Servidor no válido' }
    if (!VALID_ROLES.includes(role)) return { success: false, error: 'Rol no válido' }
    
    const number = cleanNumber(jid)
    if (!number) return { success: false, error: 'Número no válido' }
    
    const existingRole = getUserRole(jid, server)
    if (existingRole) {
        return { success: false, error: `Ya tiene el rol ${existingRole} en ${server.toUpperCase()}` }
    }
    
    const list = loadRoleFile(role, server)
    if (list.includes(number)) {
        return { success: false, error: 'Ya está registrado' }
    }
    
    list.push(number)
    saveRoleFile(role, server, list)
    return { success: true, number, role, server }
}

function removeRole(jid, server, role) {
    if (!VALID_SERVERS.includes(server)) return { success: false, error: 'Servidor no válido' }
    if (!VALID_ROLES.includes(role)) return { success: false, error: 'Rol no válido' }
    
    const number = cleanNumber(jid)
    if (!number) return { success: false, error: 'Número no válido' }
    
    const list = loadRoleFile(role, server)
    const idx = list.indexOf(number)
    if (idx === -1) {
        return { success: false, error: 'No registrado' }
    }
    
    list.splice(idx, 1)
    saveRoleFile(role, server, list)
    return { success: true, number, role, server }
}

function listByRole(server, role) {
    if (!VALID_SERVERS.includes(server)) return []
    if (!VALID_ROLES.includes(role)) return []
    return loadRoleFile(role, server)
}

function getAccessibleServers(jid) {
    const number = cleanNumber(jid)
    if (!number) return []
    
    const accessible = []
    for (const server of VALID_SERVERS) {
        for (const role of VALID_ROLES) {
            const list = loadRoleFile(role, server)
            if (list.includes(number)) {
                accessible.push({ server, role })
                break
            }
        }
    }
    return accessible
}

function hasAccessToServer(jid, server, isOwner = false) {
    if (isOwner) return true
    return hasRole(jid, server, ['owner', 'ceo', 'reseller'])
}

function hasFullAccess(jid, server, isOwner = false) {
    if (isOwner) return true
    return hasRole(jid, server, ['owner', 'ceo'])
}

function canManageRole(jid, server, targetRole, isOwner = false) {
    if (isOwner) return true
    
    const userRole = getUserRole(jid, server)
    if (!userRole) return false
    
    if (userRole === 'owner') return true
    if (userRole === 'ceo') return true
    
    return false
}

function getAllRolesForUser(jid) {
    const number = cleanNumber(jid)
    if (!number) return []
    
    const roles = []
    for (const server of VALID_SERVERS) {
        const role = getUserRole(number, server)
        if (role) {
            roles.push({ server, role })
        }
    }
    return roles
}

function initializeFiles() {
    ensureDir()
    for (const server of VALID_SERVERS) {
        for (const role of VALID_ROLES) {
            const filePath = getFilePath(role, server)
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '[]', 'utf8')
            }
        }
    }
}

initializeFiles()

export { VALID_SERVERS, VALID_ROLES, getRoles, hasRole, getUserRole, addRole, removeRole, listByRole, getAccessibleServers, hasAccessToServer, hasFullAccess, canManageRole, getAllRolesForUser, cleanNumber }