import { randomBytes } from 'crypto';

const ANTI_BAN_CONFIG = {
    MIN_MESSAGE_DELAY: 300,
    MAX_MESSAGE_DELAY: 800,
    MIN_TYPING_DELAY: 500,
    MAX_TYPING_DELAY: 1500,
    GROUP_MESSAGE_DELAY: 500,
    GROUP_MAX_MESSAGES_PER_MINUTE: 40,
    BROADCAST_DELAY: 1500,
    BROADCAST_MAX_PER_HOUR: 300,
    PRESENCE_UPDATE_INTERVAL: 30000,
    JITTER_PERCENT: 0.3
};

function randomDelay(min, max) {
    const base = Math.floor(Math.random() * (max - min + 1)) + min;
    const jitter = base * ANTI_BAN_CONFIG.JITTER_PERCENT * (Math.random() - 0.5);
    return Math.max(min, Math.floor(base + jitter));
}

async function messageDelay(isGroup = false) {
    const delay = isGroup
        ? randomDelay(ANTI_BAN_CONFIG.GROUP_MESSAGE_DELAY, ANTI_BAN_CONFIG.GROUP_MESSAGE_DELAY * 2)
        : randomDelay(ANTI_BAN_CONFIG.MIN_MESSAGE_DELAY, ANTI_BAN_CONFIG.MAX_MESSAGE_DELAY);
    return new Promise(resolve => setTimeout(resolve, delay));
}

async function typingDelay(messageLength = 50) {
    const wordsPerMinute = 50 + (Math.random() * 20 - 10);
    const avgWordLength = 5;
    const estimatedWords = messageLength / avgWordLength;
    const typingTime = (estimatedWords / wordsPerMinute) * 60 * 1000;
    const minDelay = ANTI_BAN_CONFIG.MIN_TYPING_DELAY;
    const calculatedDelay = Math.max(minDelay, Math.min(typingTime, ANTI_BAN_CONFIG.MAX_TYPING_DELAY));
    return new Promise(resolve => setTimeout(resolve, calculatedDelay));
}

class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    canSend(jid) {
        const now = Date.now();
        const key = jid || 'global';
        if (!this.requests.has(key)) this.requests.set(key, []);
        const timestamps = this.requests.get(key);
        const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);
        this.requests.set(key, validTimestamps);
        return validTimestamps.length < this.maxRequests;
    }

    recordSend(jid) {
        const key = jid || 'global';
        if (!this.requests.has(key)) this.requests.set(key, []);
        this.requests.get(key).push(Date.now());
    }

    getWaitTime(jid) {
        const key = jid || 'global';
        if (!this.requests.has(key)) return 0;
        const timestamps = this.requests.get(key);
        if (timestamps.length < this.maxRequests) return 0;
        const oldestValid = timestamps[timestamps.length - this.maxRequests];
        const waitTime = this.windowMs - (Date.now() - oldestValid);
        return Math.max(0, waitTime);
    }

    async waitForSlot(jid) {
        const waitTime = this.getWaitTime(jid);
        if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime + randomDelay(100, 500)));
        }
        this.recordSend(jid);
    }

    cleanup() {
        const now = Date.now();
        for (const [key, timestamps] of this.requests.entries()) {
            const valid = timestamps.filter(ts => now - ts < this.windowMs);
            if (valid.length === 0) this.requests.delete(key);
            else this.requests.set(key, valid);
        }
    }
}

class PresenceManager {
    constructor(sock, logger) {
        this.sock = sock;
        this.logger = logger;
        this.activeChats = new Set();
        this.presenceInterval = null;
    }

    async simulatePresence(jid, action = 'composing') {
        try {
            await this.sock.sendPresenceUpdate(action, jid);
            this.activeChats.add(jid);
            setTimeout(() => {
                this.activeChats.delete(jid);
                this.sock.sendPresenceUpdate('paused', jid).catch(() => {});
            }, randomDelay(3000, 8000));
        } catch (error) {
            this.logger?.debug({ error }, 'Error updating presence');
        }
    }

    async sendWithPresence(jid, sendFunc, messageContent) {
        await this.simulatePresence(jid, 'composing');
        const length = typeof messageContent === 'string'
            ? messageContent.length
            : JSON.stringify(messageContent).length;
        await typingDelay(length);
        const result = await sendFunc();
        setTimeout(() => {
            this.sock.sendPresenceUpdate('paused', jid).catch(() => {});
        }, randomDelay(500, 1500));
        return result;
    }

    startPeriodicPresence() {
        if (this.presenceInterval) return;
        this.presenceInterval = setInterval(() => {
            this.sock.sendPresenceUpdate('available').catch(() => {});
        }, ANTI_BAN_CONFIG.PRESENCE_UPDATE_INTERVAL);
    }

    stopPeriodicPresence() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
    }
}

function generateSessionFingerprint() {
    const timestamp = Date.now();
    const random = randomBytes(8).toString('hex');
    return `${timestamp}-${random}`;
}

function isValidJid(jid) {
    if (!jid || typeof jid !== 'string') return false;
    const patterns = [
        /^\d+@s\.whatsapp\.net$/,
        /^\d+-\d+@g\.us$/,
        /^\d+@broadcast$/,
        /^status@broadcast$/,
        /^\d+@lid$/
    ];
    return patterns.some(pattern => pattern.test(jid));
}

function sanitizeMessage(text) {
    if (!text || typeof text !== 'string') return text;
    let sanitized = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');
    sanitized = sanitized.replace(/ {3,}/g, '  ');
    return sanitized.trim();
}

const globalRateLimiter = new RateLimiter(100, 60000);
const groupRateLimiter = new RateLimiter(20, 60000);
const broadcastRateLimiter = new RateLimiter(200, 3600000);

export {
    ANTI_BAN_CONFIG,
    randomDelay,
    messageDelay,
    typingDelay,
    RateLimiter,
    PresenceManager,
    generateSessionFingerprint,
    isValidJid,
    sanitizeMessage,
    globalRateLimiter,
    groupRateLimiter,
    broadcastRateLimiter
};
