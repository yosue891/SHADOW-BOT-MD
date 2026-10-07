const LOG_LEVELS = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
    silent: Infinity
};

const COLORS = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    fatal: '\x1b[35m\x1b[1m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    info: '\x1b[36m',
    debug: '\x1b[34m',
    trace: '\x1b[90m',
    socket: '\x1b[32m',
    message: '\x1b[33m',
    media: '\x1b[35m',
    group: '\x1b[36m',
    auth: '\x1b[31m',
    cache: '\x1b[34m'
};

const CATEGORY_ICONS = {
    socket: '[SOCKET]',
    message: '[MSG]',
    media: '[MEDIA]',
    group: '[GROUP]',
    auth: '[AUTH]',
    cache: '[CACHE]',
    queue: '[QUEUE]',
    error: '[ERROR]',
    warn: '[WARN]',
    info: '[INFO]',
    debug: '[DEBUG]',
    success: '[OK]'
};

function formatTime(date = new Date()) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function formatConsoleMessage(level, category, message, data) {
    const time = formatTime();
    const levelColor = COLORS[level] || COLORS.info;
    const categoryColor = COLORS[category] || COLORS.reset;
    const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS[level] || '';
    let formatted = `${COLORS.dim}[${time}]${COLORS.reset} `;
    formatted += `${levelColor}${level.toUpperCase().padEnd(5)}${COLORS.reset} `;
    if (category) formatted += `${categoryColor}${icon} ${category}${COLORS.reset} `;
    formatted += message;
    if (data && Object.keys(data).length > 0) {
        const dataStr = JSON.stringify(data, null, 0);
        if (dataStr.length < 100) formatted += ` ${COLORS.dim}${dataStr}${COLORS.reset}`;
    }
    return formatted;
}

class RyzeLogger {
    constructor(options = {}) {
        this.options = {
            level: options.level || 'info',
            prettyPrint: options.prettyPrint !== false,
            category: options.category || 'baileys',
            colors: options.colors !== false,
            timestamps: options.timestamps !== false,
            ...options
        };
        this.category = this.options.category;
        this.filters = new Set(options.filters || []);
        this.history = [];
        this.maxHistory = options.maxHistory || 1000;
    }

    _log(level, messageOrData, data = {}) {
        let message = '';
        let logData = data;
        if (typeof messageOrData === 'string') {
            message = messageOrData;
        } else if (typeof messageOrData === 'object') {
            logData = messageOrData;
            message = messageOrData.msg || '';
        }
        if (this.filters.size > 0) {
            const shouldFilter = [...this.filters].some(f => message.includes(f) || JSON.stringify(logData).includes(f));
            if (shouldFilter) return;
        }
        this._addToHistory(level, message, logData);
        if (this.options.prettyPrint) console.log(formatConsoleMessage(level, this.category, message, logData));
    }

    _addToHistory(level, message, data) {
        this.history.push({ timestamp: new Date().toISOString(), level, category: this.category, message, data });
        if (this.history.length > this.maxHistory) this.history.shift();
    }

    fatal(messageOrData, data) { this._log('fatal', messageOrData, data); }
    error(messageOrData, data) { this._log('error', messageOrData, data); }
    warn(messageOrData, data) { this._log('warn', messageOrData, data); }
    info(messageOrData, data) { this._log('info', messageOrData, data); }
    debug(messageOrData, data) { this._log('debug', messageOrData, data); }
    trace(messageOrData, data) { this._log('trace', messageOrData, data); }

    success(message, data = {}) {
        const formatted = `${COLORS.reset}${CATEGORY_ICONS.success} ${message}${COLORS.reset}`;
        this._log('info', formatted, data);
    }

    child(bindings) {
        return new RyzeLogger({ ...this.options, category: bindings.class || bindings.category || this.category });
    }

    setLevel(level) {
        this.options.level = level;
    }

    addFilter(pattern) { this.filters.add(pattern); }
    removeFilter(pattern) { this.filters.delete(pattern); }

    getHistory(options = {}) {
        let history = [...this.history];
        if (options.level) history = history.filter(h => h.level === options.level);
        if (options.category) history = history.filter(h => h.category === options.category);
        if (options.since) {
            const sinceDate = new Date(options.since);
            history = history.filter(h => new Date(h.timestamp) >= sinceDate);
        }
        if (options.limit) history = history.slice(-options.limit);
        return history;
    }

    clearHistory() { this.history = []; }

    exportLogs(format = 'json') {
        if (format === 'json') return JSON.stringify(this.history, null, 2);
        return this.history.map(h => `[${h.timestamp}] ${h.level.toUpperCase()} [${h.category}] ${h.message}`).join('\n');
    }

    time(label) {
        const start = Date.now();
        return { end: (message) => {
            const duration = Date.now() - start;
            this.debug(`${message || label}: ${duration}ms`, { duration, label });
            return duration;
        }};
    }

    if(condition, level, message, data) {
        if (condition) this[level](message, data);
    }

    throttle(key, message, data, intervalMs = 5000) {
        if (!this._throttleCache) this._throttleCache = new Map();
        const now = Date.now();
        const lastLog = this._throttleCache.get(key) || 0;
        if (now - lastLog >= intervalMs) {
            this._throttleCache.set(key, now);
            this.info(message, data);
        }
    }
}

function createLogger(options = {}) {
    return new RyzeLogger({
        level: process.env.LOG_LEVEL || 'info',
        prettyPrint: process.env.NODE_ENV !== 'production',
        ...options
    });
}

const defaultLogger = createLogger({ category: 'yo-soy-yo' });

export {
    LOG_LEVELS,
    COLORS,
    CATEGORY_ICONS,
    RyzeLogger,
    createLogger,
    defaultLogger as default
};
