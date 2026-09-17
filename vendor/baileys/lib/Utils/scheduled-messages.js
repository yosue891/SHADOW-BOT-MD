import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const SCHEDULED_PATH = join(process.cwd(), 'database', 'scheduled-messages.json');
const scheduled = new Map();
let _sock = null;
let _initialized = false;

/**
 * Parse a cron expression (simple format: "MIN HOUR DOM MON DOW")
 * Returns true if the current time matches the cron
 */
function matchCron(cron, date) {
    if (!cron || typeof cron !== 'string') return false;
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return false;

    const [min, hour, dom, mon, dow] = parts;
    const d = date || new Date();

    const matchField = (field, value) => {
        if (field === '*') return true;
        if (field.includes(',')) return field.split(',').some(v => matchField(v.trim(), value));
        if (field.includes('-')) {
            const [start, end] = field.split('-').map(Number);
            return value >= start && value <= end;
        }
        if (field.includes('/')) {
            const [, step] = field.split('/');
            return value % parseInt(step) === 0;
        }
        return parseInt(field) === value;
    };

    return (
        matchField(min, d.getMinutes()) &&
        matchField(hour, d.getHours()) &&
        matchField(dom, d.getDate()) &&
        matchField(mon, d.getMonth() + 1) &&
        matchField(dow, d.getDay())
    );
}

function loadScheduled() {
    try {
        if (existsSync(SCHEDULED_PATH)) {
            const data = JSON.parse(readFileSync(SCHEDULED_PATH, 'utf8'));
            if (Array.isArray(data)) {
                for (const msg of data) {
                    scheduled.set(msg.id, msg);
                }
            }
        }
    } catch { }
}

function saveScheduled() {
    try {
        const dirPath = join(process.cwd(), 'database');
        if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
        const arr = Array.from(scheduled.values());
        writeFileSync(SCHEDULED_PATH, JSON.stringify(arr, null, 2));
    } catch { }
}

function generateId() {
    return 'sch_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

async function processScheduled() {
    if (!_sock) return;
    const now = Date.now();
    let changed = false;

    for (const [id, msg] of scheduled) {
        if (msg.cancelled) continue;

        const shouldSend =
            (msg.type === 'once' && now >= msg.timestamp && !msg.sent) ||
            (msg.type === 'recurring' && matchCron(msg.cron, new Date()));

        if (shouldSend) {
            try {
                await _sock.sendMessage(msg.jid, msg.content);
                changed = true;

                if (msg.type === 'once') {
                    msg.sent = true;
                    msg.sentAt = now;
                }

                if (msg.type === 'recurring') {
                    msg.lastSent = now;
                    msg.executionCount = (msg.executionCount || 0) + 1;
                }

                _sock.logger?.info?.({ id, jid: msg.jid }, 'scheduled message sent');
            } catch (err) {
                _sock.logger?.warn?.({ err, id }, 'failed to send scheduled message');
                msg.lastError = err.message;
                msg.errorCount = (msg.errorCount || 0) + 1;
            }
        }

        if (msg.type === 'once' && msg.sent) {
            scheduled.delete(id);
            changed = true;
        }
    }

    if (changed) saveScheduled();
}

let _interval = null;

function startScheduler(sock, intervalMs = 30000) {
    _sock = sock;
    if (!_initialized) {
        loadScheduled();
        _initialized = true;
    }
    if (_interval) clearInterval(_interval);
    _interval = setInterval(processScheduled, intervalMs);
    processScheduled();
}

function stopScheduler() {
    if (_interval) {
        clearInterval(_interval);
        _interval = null;
    }
    _sock = null;
}

/**
 * Programar un mensaje para enviar en una fecha/hora específica
 * @param {string} jid - Destinatario
 * @param {Object} content - Contenido del mensaje (igual que sendMessage)
 * @param {number|Date} timestamp - Fecha/hora de envío (timestamp ms o Date)
 * @param {Object} options - Opciones adicionales
 * @returns {string} ID del mensaje programado
 */
function scheduleMessage(jid, content, timestamp, options = {}) {
    const id = options.id || generateId();
    const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp;

    const msg = {
        id,
        jid,
        content,
        timestamp: ts,
        type: 'once',
        sent: false,
        createdAt: Date.now(),
        ...options
    };

    scheduled.set(id, msg);
    saveScheduled();
    return id;
}

/**
 * Programar un mensaje recurrente usando cron
 * @param {string} jid - Destinatario
 * @param {Object} content - Contenido del mensaje
 * @param {string} cron - Expresión cron (MIN HOUR DOM MON DOW)
 * @param {Object} options - Opciones adicionales
 * @returns {string} ID del mensaje programado
 */
function recurringMessage(jid, content, cron, options = {}) {
    const id = options.id || generateId();

    const msg = {
        id,
        jid,
        content,
        cron,
        type: 'recurring',
        executionCount: 0,
        createdAt: Date.now(),
        ...options
    };

    scheduled.set(id, msg);
    saveScheduled();
    return id;
}

/**
 * Cancelar un mensaje programado
 * @param {string} id - ID del mensaje
 * @returns {boolean} true si se canceló
 */
function cancelScheduledMessage(id) {
    const msg = scheduled.get(id);
    if (!msg) return false;
    msg.cancelled = true;
    msg.cancelledAt = Date.now();
    saveScheduled();
    return true;
}

/**
 * Eliminar un mensaje programado permanentemente
 * @param {string} id - ID del mensaje
 * @returns {boolean} true si se eliminó
 */
function deleteScheduledMessage(id) {
    const deleted = scheduled.delete(id);
    if (deleted) saveScheduled();
    return deleted;
}

/**
 * Obtener todos los mensajes programados
 * @param {Object} filter - Filtros opcionales
 * @returns {Object[]} Lista de mensajes
 */
function listScheduledMessages(filter = {}) {
    let msgs = Array.from(scheduled.values());

    if (filter.jid) {
        msgs = msgs.filter(m => m.jid === filter.jid);
    }
    if (filter.type) {
        msgs = msgs.filter(m => m.type === filter.type);
    }
    if (filter.cancelled === false) {
        msgs = msgs.filter(m => !m.cancelled);
    }
    if (filter.pending) {
        msgs = msgs.filter(m => m.type === 'once' && !m.sent && !m.cancelled);
    }

    return msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

/**
 * Obtener un mensaje programado por ID
 * @param {string} id - ID del mensaje
 * @returns {Object|null}
 */
function getScheduledMessage(id) {
    return scheduled.get(id) || null;
}

/**
 * Actualizar el contenido de un mensaje programado
 * @param {string} id - ID del mensaje
 * @param {Object} updates - Campos a actualizar
 * @returns {boolean}
 */
function updateScheduledMessage(id, updates) {
    const msg = scheduled.get(id);
    if (!msg) return false;
    Object.assign(msg, updates);
    saveScheduled();
    return true;
}

/**
 * Obtener estadísticas del scheduler
 * @returns {Object}
 */
function getSchedulerStats() {
    const msgs = Array.from(scheduled.values());
    return {
        total: msgs.length,
        pending: msgs.filter(m => m.type === 'once' && !m.sent && !m.cancelled).length,
        sent: msgs.filter(m => m.type === 'once' && m.sent).length,
        recurring: msgs.filter(m => m.type === 'recurring' && !m.cancelled).length,
        cancelled: msgs.filter(m => m.cancelled).length,
        errors: msgs.filter(m => m.lastError).length
    };
}

export {
    startScheduler,
    stopScheduler,
    scheduleMessage,
    recurringMessage,
    cancelScheduledMessage,
    deleteScheduledMessage,
    listScheduledMessages,
    getScheduledMessage,
    updateScheduledMessage,
    getSchedulerStats
};
