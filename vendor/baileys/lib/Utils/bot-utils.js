import { isJidGroup, jidDecode, jidNormalizedUser } from '../WABinary/index.js';
import { randomBytes } from 'crypto';

function parseCommand(text, prefix = '.') {
    if (!text || typeof text !== 'string') return { isCommand: false };
    const trimmed = text.trim();
    if (!trimmed.startsWith(prefix)) return { isCommand: false };
    const withoutPrefix = trimmed.slice(prefix.length);
    const parts = withoutPrefix.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    const fullArgs = withoutPrefix.slice(command.length).trim();
    const flags = {};
    const cleanArgs = [];
    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            flags[key] = value || true;
        } else if (arg.startsWith('-') && arg.length === 2) {
            flags[arg.slice(1)] = true;
        } else {
            cleanArgs.push(arg);
        }
    }
    return { isCommand: true, command, args: cleanArgs, fullArgs, flags, raw: text, prefix };
}

function extractMentions(message) {
    const mentions = [];
    const extendedText = message.extendedTextMessage;
    if (extendedText?.contextInfo?.mentionedJid) mentions.push(...extendedText.contextInfo.mentionedJid);
    if (message.mentionedJid) mentions.push(...message.mentionedJid);
    const text = extractText(message);
    if (text) {
        const phoneMatches = text.match(/@(\d+)/g);
        if (phoneMatches) {
            phoneMatches.forEach(match => {
                const phone = match.slice(1);
                const jid = `${phone}@s.whatsapp.net`;
                if (!mentions.includes(jid)) mentions.push(jid);
            });
        }
    }
    return [...new Set(mentions)];
}

function extractText(message) {
    if (!message) return '';
    if (typeof message === 'string') return message;
    const textSources = [
        message.conversation,
        message.extendedTextMessage?.text,
        message.imageMessage?.caption,
        message.videoMessage?.caption,
        message.documentMessage?.caption,
        message.buttonsResponseMessage?.selectedButtonId,
        message.listResponseMessage?.singleSelectReply?.selectedRowId,
        message.templateButtonReplyMessage?.selectedId
    ];
    return textSources.find(t => t) || '';
}

function extractQuotedMessage(message) {
    const contextInfo =
        message.extendedTextMessage?.contextInfo ||
        message.imageMessage?.contextInfo ||
        message.videoMessage?.contextInfo ||
        message.documentMessage?.contextInfo ||
        message.stickerMessage?.contextInfo;
    if (!contextInfo?.quotedMessage) return null;
    return {
        message: contextInfo.quotedMessage,
        stanzaId: contextInfo.stanzaId,
        participant: contextInfo.participant,
        remoteJid: contextInfo.remoteJid,
        text: extractText(contextInfo.quotedMessage)
    };
}

async function isGroupAdmin(sock, jid, participantJid) {
    try {
        if (!isJidGroup(jid)) return false;
        const metadata = await sock.groupMetadata(jid);
        const participant = metadata.participants.find(
            p => jidNormalizedUser(p.id) === jidNormalizedUser(participantJid)
        );
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch { return false; }
}

async function isBotAdmin(sock, jid) {
    const botJid = sock.user?.id;
    if (!botJid) return false;
    return isGroupAdmin(sock, jid, botJid);
}

function getSenderJid(msg) {
    const isGroup = isJidGroup(msg.key.remoteJid);
    return isGroup ? msg.key.participant : msg.key.remoteJid;
}

function formatJid(jid) {
    if (!jid) return 'Unknown';
    const decoded = jidDecode(jid);
    return decoded?.user || jid.split('@')[0] || jid;
}

function generateMessageId() {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(8).toString('hex');
    return `${timestamp}-${random}`.toUpperCase();
}

function truncateText(text, maxLength = 100, suffix = '...') {
    if (!text || text.length <= maxLength) return text;
    return text.slice(0, maxLength - suffix.length) + suffix;
}

function escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/([*_`\[\]()])/g, '\\$1');
}

function formatPhoneNumber(jid) {
    const number = jid.replace(/[^0-9]/g, '');
    if (number.length >= 10) {
        const countryCode = number.slice(0, -10);
        const areaCode = number.slice(-10, -7);
        const first = number.slice(-7, -4);
        const last = number.slice(-4);
        return `+${countryCode} ${areaCode} ${first} ${last}`;
    }
    return number;
}

class CooldownManager {
    constructor() { this.cooldowns = new Map(); }
    isOnCooldown(key, cooldownMs) {
        const expiry = this.cooldowns.get(key);
        if (!expiry) return false;
        if (Date.now() < expiry) return true;
        this.cooldowns.delete(key);
        return false;
    }
    setCooldown(key, cooldownMs) { this.cooldowns.set(key, Date.now() + cooldownMs); }
    getRemainingTime(key) {
        const expiry = this.cooldowns.get(key);
        if (!expiry) return 0;
        return Math.max(0, expiry - Date.now());
    }
    cleanup() {
        const now = Date.now();
        for (const [key, expiry] of this.cooldowns) {
            if (now >= expiry) this.cooldowns.delete(key);
        }
    }
}

class PermissionManager {
    constructor(config = {}) {
        this.owners = new Set(config.owners || []);
        this.admins = new Set(config.admins || []);
        this.banned = new Set(config.banned || []);
        this.premiums = new Set(config.premiums || []);
    }
    isOwner(jid) { return this.owners.has(jidNormalizedUser(jid)); }
    isAdmin(jid) {
        const normalized = jidNormalizedUser(jid);
        return this.admins.has(normalized) || this.owners.has(normalized);
    }
    isBanned(jid) { return this.banned.has(jidNormalizedUser(jid)); }
    isPremium(jid) { return this.premiums.has(jidNormalizedUser(jid)); }
    addOwner(jid) { this.owners.add(jidNormalizedUser(jid)); }
    removeOwner(jid) { this.owners.delete(jidNormalizedUser(jid)); }
    addAdmin(jid) { this.admins.add(jidNormalizedUser(jid)); }
    removeAdmin(jid) { this.admins.delete(jidNormalizedUser(jid)); }
    ban(jid) { this.banned.add(jidNormalizedUser(jid)); }
    unban(jid) { this.banned.delete(jidNormalizedUser(jid)); }
    addPremium(jid) { this.premiums.add(jidNormalizedUser(jid)); }
    removePremium(jid) { this.premiums.delete(jidNormalizedUser(jid)); }
    toJSON() {
        return { owners: [...this.owners], admins: [...this.admins], banned: [...this.banned], premiums: [...this.premiums] };
    }
}

function createReply(options) {
    const { text, mentions = [], quoted = null } = options;
    const message = { text };
    if (mentions.length > 0) message.mentions = mentions;
    if (quoted) message.quoted = quoted;
    return message;
}

function parseTime(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const units = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000, w: 7 * 24 * 60 * 60 * 1000 };
    const match = timeStr.match(/^(\d+)([smhdw])$/i);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    return value * (units[unit] || 0);
}

function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

async function sendFast(sock, jid, content, opts = {}) {
    const { quoted = null, markRead = false } = opts;
    const message = typeof content === 'string' ? { text: content } : content;
    if (markRead && quoted?.key) sock.readMessages([quoted.key]).catch(() => {});
    return sock.sendMessage(jid, message, quoted ? { quoted } : {});
}

export {
    parseCommand,
    extractMentions,
    extractText,
    extractQuotedMessage,
    isGroupAdmin,
    isBotAdmin,
    getSenderJid,
    formatJid,
    generateMessageId,
    truncateText,
    escapeMarkdown,
    formatPhoneNumber,
    CooldownManager,
    PermissionManager,
    createReply,
    parseTime,
    formatDuration,
    sendFast
};
