/**
 * @file src/lib/stickerCommand.js
 * @description Global sticker-to-command mapping system
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const STICKER_CMD_FILE = path.join(__dirname, '../../database/stickerCommands.json')

// In-memory cache
let stickerCommands = {}

// Load from file
function loadStickerCommands() {
    try {
        if (fs.existsSync(STICKER_CMD_FILE)) {
            const data = fs.readFileSync(STICKER_CMD_FILE, 'utf-8')
            stickerCommands = JSON.parse(data)
        }
    } catch (e) {
        stickerCommands = {}
    }
    return stickerCommands
}

// Save to file
function saveStickerCommands() {
    try {
        const dir = path.dirname(STICKER_CMD_FILE)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }
        fs.writeFileSync(STICKER_CMD_FILE, JSON.stringify(stickerCommands, null, 2))
    } catch (e) {
        console.error('Error saving sticker commands:', e)
    }
}

/**
 * Generate unique hash for sticker
 * Uses fileSha256 or mediaKey as identifier
 */
function getStickerHash(m) {
    if (!m) return null
    
    // Check if message is sticker
    const stickerMsg = m.message?.stickerMessage || 
                       m.quoted?.message?.stickerMessage ||
                       m.message?.documentWithCaptionMessage?.message?.stickerMessage
    
    if (!stickerMsg) return null
    
    // Use fileSha256 as primary identifier
    if (stickerMsg.fileSha256) {
        // Convert buffer to base64 string for storage
        const sha = Buffer.isBuffer(stickerMsg.fileSha256) 
            ? stickerMsg.fileSha256.toString('base64')
            : stickerMsg.fileSha256
        return sha
    }
    
    // Fallback to mediaKey
    if (stickerMsg.mediaKey) {
        const key = Buffer.isBuffer(stickerMsg.mediaKey)
            ? stickerMsg.mediaKey.toString('base64')
            : stickerMsg.mediaKey
        return key
    }
    
    return null
}

/**
 * Get sticker hash from quoted message
 */
function getQuotedStickerHash(m) {
    if (!m.quoted) return null
    
    const stickerMsg = m.quoted.message?.stickerMessage
    if (!stickerMsg) return null
    
    if (stickerMsg.fileSha256) {
        const sha = Buffer.isBuffer(stickerMsg.fileSha256)
            ? stickerMsg.fileSha256.toString('base64')
            : stickerMsg.fileSha256
        return sha
    }
    
    if (stickerMsg.mediaKey) {
        const key = Buffer.isBuffer(stickerMsg.mediaKey)
            ? stickerMsg.mediaKey.toString('base64')
            : stickerMsg.mediaKey
        return key
    }
    
    return null
}

/**
 * Add sticker command mapping (global)
 */
function addStickerCommand(stickerHash, command, addedBy) {
    if (!stickerHash || !command) return false
    
    loadStickerCommands()
    
    stickerCommands[stickerHash] = {
        command: command.toLowerCase().replace(/^\./, ''), // Remove leading dot
        addedBy: addedBy,
        addedAt: Date.now()
    }
    
    saveStickerCommands()
    return true
}

/**
 * Delete sticker command
 */
function deleteStickerCommand(stickerHash) {
    if (!stickerHash) return false
    
    loadStickerCommands()
    
    if (stickerCommands[stickerHash]) {
        delete stickerCommands[stickerHash]
        saveStickerCommands()
        return true
    }
    
    return false
}

/**
 * Get command for sticker
 */
function getStickerCommand(stickerHash) {
    if (!stickerHash) return null
    return stickerCommands[stickerHash] || null
}

/**
 * List all sticker commands
 */
function listStickerCommands() {
    return Object.entries(stickerCommands).map(([hash, data]) => ({
        hash: hash.substring(0, 10) + '...',
        fullHash: hash,
        command: data.command,
        addedBy: data.addedBy,
        addedAt: data.addedAt
    }))
}

/**
 * Find sticker command by command name
 */
function findByCommand(commandName) {
    const cmd = commandName.toLowerCase().replace(/^\./, '')
    
    for (const [hash, data] of Object.entries(stickerCommands)) {
        if (data.command === cmd) {
            return { hash, ...data }
        }
    }
    
    return null
}

/**
 * Check if message is a registered sticker command
 */
function checkStickerCommand(m) {
    const hash = getStickerHash(m)
    if (!hash) return null
    
    const cmdData = getStickerCommand(hash)
    if (!cmdData) return null
    
    return cmdData.command
}

// Initialize
loadStickerCommands()

export { getStickerHash, getQuotedStickerHash, addStickerCommand, deleteStickerCommand, getStickerCommand, listStickerCommands, findByCommand, checkStickerCommand, loadStickerCommands }