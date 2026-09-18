import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import * as timeHelper from './ourin-time.js'
const DATABASE_DIR = path.join(process.cwd(), 'database')
const TEMP_DIR = path.join(process.cwd(), 'temp')

const SCHEMA_VERSION = '1.0.0'

function getBackupMetadata() {
    return {
        schemaVersion: SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
botVersion: '1.0.0',
        nodeVersion: process.version,
        platform: process.platform,
        files: 0
    }
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

async function createDatabaseBackup() {
    return new Promise((resolve, reject) => {
        ensureDir(TEMP_DIR)
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        const backupPath = path.join(TEMP_DIR, `store_backup_${timestamp}.zip`)
        
        const output = fs.createWriteStream(backupPath)
        const archive = archiver('zip', { zlib: { level: 9 } })
        
        const metadata = getBackupMetadata()
        let fileCount = 0
        
        output.on('close', () => {
            metadata.files = fileCount
            metadata.size = archive.pointer()
            resolve({
                path: backupPath,
                size: archive.pointer(),
                fileCount,
                timestamp,
                metadata
            })
        })
        
        archive.on('error', reject)
        archive.on('entry', () => fileCount++)
        archive.pipe(output)
        
        archive.append(JSON.stringify(metadata, null, 2), { name: 'backup_metadata.json' })
        
        if (fs.existsSync(DATABASE_DIR)) {
            const entries = fs.readdirSync(DATABASE_DIR, { withFileTypes: true })
            
            for (const entry of entries) {
                const fullPath = path.join(DATABASE_DIR, entry.name)
                
                if (entry.name.endsWith('.zip')) continue
                
                if (entry.isDirectory()) {
                    archive.directory(fullPath, `database/${entry.name}`)
                } else if (entry.isFile()) {
                    archive.file(fullPath, { name: `database/${entry.name}` })
                }
            }
        }
        
        const storageDir = path.join(process.cwd(), 'storage')
        if (fs.existsSync(storageDir)) {
            const dbFile = path.join(storageDir, 'database.json')
            if (fs.existsSync(dbFile)) {
                archive.file(dbFile, { name: 'storage/database.json' })
            }
        }
        
        const rootDbFile = path.join(process.cwd(), 'db.json')
        if (fs.existsSync(rootDbFile)) {
            archive.file(rootDbFile, { name: 'db.json' })
        }
        
        const mainDbFile = path.join(process.cwd(), 'database', 'main', 'db.json')
        if (fs.existsSync(mainDbFile)) {
            archive.file(mainDbFile, { name: 'database/main/db.json' })
        }
        
        archive.finalize()
    })
}

async function sendStoreBackup(sock) {
    if (!sock) {
        console.error('[StoreBackup] Socket no proporcionado')
        return { success: false, error: 'Socket no inicializado' }
    }
    
    
    const ownerNumbers = config.owner?.number || []
    
    if (ownerNumbers.length === 0) {
        return { success: false, error: 'No hay número de propietario configurado' }
    }
    
    const ownerNumber = String(ownerNumbers[0]).replace(/[^0-9]/g, '')
    if (!ownerNumber) {
        return { success: false, error: 'Número de owner no válido' }
    }
    
    const ownerJid = `${ownerNumber}@s.whatsapp.net`
    
    try {
        console.log('[StoreBackup] Creating database backup...')
        const backupInfo = await createDatabaseBackup()
        
        const sizeInKB = (backupInfo.size / 1024).toFixed(2)
        const sizeDisplay = backupInfo.size > 1024 * 1024 
            ? `${(backupInfo.size / (1024 * 1024)).toFixed(2)} MB`
            : `${sizeInKB} KB`
        
        const caption = 
            `🗃️ *ꜱᴛᴏʀᴇ ʙᴀᴄᴋᴜᴘ*\n\n` +
            `╭┈┈⬡「 📋 *ɪɴꜰᴏ* 」\n` +
            `┃ 📅 Fecha: ${timeHelper.formatDateTime('DD MMMM YYYY HH:mm:ss')} WIB\n` +
            `┃ 📦 Tamaño: ${sizeDisplay}\n` +
            `┃ 📁 Archivos: ${backupInfo.fileCount}\n` +
            `┃ 🔖 Esquema: v${SCHEMA_VERSION}\n` +
            `╰┈┈┈┈┈┈┈┈⬡\n\n` +
            `> Copia de seguridad type-safe. Compatible con versiones futuras.\n` +
            `> ${config.bot?.name || 'Ourin-AI'} Store Backup System`
        
        await sock.sendMessage(ownerJid, {
            document: fs.readFileSync(backupInfo.path),
            mimetype: 'application/zip',
            fileName: path.basename(backupInfo.path),
            caption
        })
        
        try {
            fs.unlinkSync(backupInfo.path)
        } catch {}
        
        console.log(`[StoreBackup] Backup sent to owner (${sizeDisplay})`)
        return { success: true, size: sizeDisplay, files: backupInfo.fileCount }
        
    } catch (error) {
        console.error('[StoreBackup] Error:', error.message)
        return { success: false, error: error.message }
    }
}

export { createDatabaseBackup, sendStoreBackup, getBackupMetadata, SCHEMA_VERSION }