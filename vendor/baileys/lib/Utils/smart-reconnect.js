import { DisconnectReason } from '../Types/index.js';

const RECONNECT_CONFIG = {
    MAX_RETRIES: 15,
    INITIAL_DELAY: 1000,
    MAX_DELAY: 300000,
    BACKOFF_FACTOR: 1.5,
    JITTER_FACTOR: 0.3,
    STABLE_CONNECTION_TIME: 60000,
    RECOVERABLE_REASONS: [
        DisconnectReason.connectionClosed,
        DisconnectReason.connectionLost,
        DisconnectReason.connectionReplaced,
        DisconnectReason.timedOut,
        DisconnectReason.restartRequired
    ],
    FATAL_REASONS: [
        DisconnectReason.loggedOut,
        DisconnectReason.badSession,
        DisconnectReason.multideviceMismatch
    ]
};

class SmartReconnect {
    constructor(logger, config = {}) {
        this.logger = logger;
        this.config = { ...RECONNECT_CONFIG, ...config };
        this.retryCount = 0;
        this.lastConnectTime = null;
        this.lastDisconnectReason = null;
        this.connectionStable = false;
        this.reconnectTimer = null;
        this.healthCheckInterval = null;
        this.stats = {
            totalReconnects: 0,
            successfulReconnects: 0,
            failedReconnects: 0,
            lastSuccessfulConnect: null,
            averageDowntime: 0
        };
    }

    calculateDelay() {
        const baseDelay = this.config.INITIAL_DELAY * Math.pow(this.config.BACKOFF_FACTOR, this.retryCount);
        const cappedDelay = Math.min(baseDelay, this.config.MAX_DELAY);
        const jitter = cappedDelay * this.config.JITTER_FACTOR * (Math.random() - 0.5);
        return Math.floor(cappedDelay + jitter);
    }

    shouldReconnect(reason, statusCode) {
        if (this.config.FATAL_REASONS.includes(statusCode)) {
            this.logger?.warn({ reason, statusCode }, 'Fatal disconnect reason - not reconnecting');
            return { shouldReconnect: false, reason: 'Fatal error - session invalidated' };
        }
        if (this.retryCount >= this.config.MAX_RETRIES) {
            this.logger?.error({ retryCount: this.retryCount }, 'Max retries exceeded');
            return { shouldReconnect: false, reason: 'Max retries exceeded' };
        }
        if (this.config.RECOVERABLE_REASONS.includes(statusCode)) {
            return { shouldReconnect: true, delay: this.calculateDelay() };
        }
        return { shouldReconnect: true, delay: this.calculateDelay() * 2 };
    }

    async handleDisconnect(reason, statusCode, reconnectCallback) {
        this.lastDisconnectReason = { reason, statusCode, time: Date.now() };
        this.connectionStable = false;
        const decision = this.shouldReconnect(reason, statusCode);
        if (!decision.shouldReconnect) {
            this.logger?.info({ reason: decision.reason }, 'Not attempting reconnection');
            return { reconnecting: false, reason: decision.reason };
        }
        this.retryCount++;
        this.stats.totalReconnects++;
        const delay = decision.delay;
        this.logger?.info({ attempt: this.retryCount, maxRetries: this.config.MAX_RETRIES, delay, reason }, 'Scheduling reconnection');
        return new Promise((resolve) => {
            this.reconnectTimer = setTimeout(async () => {
                try {
                    await reconnectCallback();
                    this.onSuccessfulReconnect();
                    resolve({ reconnecting: true, success: true });
                } catch (error) {
                    this.stats.failedReconnects++;
                    this.logger?.error({ error }, 'Reconnection failed');
                    resolve({ reconnecting: true, success: false, error });
                }
            }, delay);
        });
    }

    onSuccessfulReconnect() {
        const previousRetries = this.retryCount;
        this.retryCount = 0;
        this.lastConnectTime = Date.now();
        this.stats.successfulReconnects++;
        this.stats.lastSuccessfulConnect = new Date().toISOString();
        this.logger?.info({ previousRetries }, 'Successfully reconnected');
        setTimeout(() => {
            if (this.lastConnectTime && Date.now() - this.lastConnectTime >= this.config.STABLE_CONNECTION_TIME) {
                this.connectionStable = true;
                this.logger?.debug('Connection marked as stable');
            }
        }, this.config.STABLE_CONNECTION_TIME);
    }

    cancelPendingReconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    reset() {
        this.retryCount = 0;
        this.lastDisconnectReason = null;
        this.cancelPendingReconnect();
    }

    getStats() {
        return {
            ...this.stats,
            currentRetryCount: this.retryCount,
            isStable: this.connectionStable,
            lastDisconnect: this.lastDisconnectReason
        };
    }

    startHealthCheck(pingCallback, interval = 30000) {
        this.stopHealthCheck();
        this.healthCheckInterval = setInterval(async () => {
            try {
                await pingCallback();
                this.logger?.debug('Health check passed');
            } catch (error) {
                this.logger?.warn({ error }, 'Health check failed');
            }
        }, interval);
    }

    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    cleanup() {
        this.cancelPendingReconnect();
        this.stopHealthCheck();
    }
}

function createConnectionHandler(sock, logger, options = {}) {
    const reconnect = new SmartReconnect(logger, options);
    return {
        reconnect,
        async handleConnectionUpdate(update, startSock) {
            const { connection, lastDisconnect, qr } = update;
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const reason = lastDisconnect?.error?.message || 'Unknown';
                const result = await reconnect.handleDisconnect(reason, statusCode, startSock);
                return result;
            }
            if (connection === 'open') {
                reconnect.onSuccessfulReconnect();
                return { connected: true };
            }
            if (qr) {
                reconnect.reset();
                return { qr };
            }
            return update;
        },
        getStatus() {
            return {
                stats: reconnect.getStats(),
                isHealthy: reconnect.connectionStable && reconnect.retryCount === 0
            };
        }
    };
}

async function withRetry(fn, options = {}) {
    const { maxRetries = 3, delay = 1000, backoff = 2, onRetry = null } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === maxRetries) throw error;
            const waitTime = delay * Math.pow(backoff, attempt);
            if (onRetry) onRetry(error, attempt + 1, waitTime);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
    throw lastError;
}

export {
    RECONNECT_CONFIG,
    SmartReconnect,
    createConnectionHandler,
    withRetry
};
