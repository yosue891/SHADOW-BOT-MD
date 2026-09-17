import { LRUCache } from 'lru-cache';

const PRIORITY = {
    CRITICAL: 0,
    HIGH: 1,
    NORMAL: 2,
    LOW: 3,
    BACKGROUND: 4
};

const QUEUE_CONFIG = {
    MAX_QUEUE_SIZE: 1000,
    PROCESS_INTERVAL: 50,
    RATE_LIMITS: {
        message: { count: 100, window: 60000 },
        group: { count: 40, window: 60000 },
        media: { count: 50, window: 60000 },
        broadcast: { count: 200, window: 3600000 }
    },
    DELAYS: {
        message: 300,
        group: 500,
        media: 800,
        broadcast: 1500
    }
};

class QueueItem {
    constructor(task, priority = PRIORITY.NORMAL, metadata = {}) {
        this.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.task = task;
        this.priority = priority;
        this.metadata = metadata;
        this.createdAt = Date.now();
        this.attempts = 0;
        this.maxAttempts = metadata.maxAttempts || 3;
        this.status = 'pending';
    }
}

class MessageQueue {
    constructor(logger, config = {}) {
        this.logger = logger;
        this.config = { ...QUEUE_CONFIG, ...config };
        this.queue = [];
        this.processing = false;
        this.paused = false;
        this.rateLimiters = new Map();
        this.processTimer = null;
        this.stats = {
            totalQueued: 0,
            totalProcessed: 0,
            totalFailed: 0,
            averageWaitTime: 0
        };
        this.recentMessages = new LRUCache({ max: 500, ttl: 300000 });
    }

    enqueue(task, priority = PRIORITY.NORMAL, metadata = {}) {
        if (this.queue.length >= this.config.MAX_QUEUE_SIZE) {
            this.logger?.warn('Queue is full, dropping oldest low priority items');
            this._dropLowPriority();
        }
        const item = new QueueItem(task, priority, metadata);
        const hash = this._hashTask(task, metadata);
        if (this.recentMessages.has(hash) && !metadata.allowDuplicate) {
            this.logger?.debug({ hash }, 'Duplicate message detected, skipping');
            return null;
        }
        let inserted = false;
        for (let i = 0; i < this.queue.length; i++) {
            if (this.queue[i].priority > priority) {
                this.queue.splice(i, 0, item);
                inserted = true;
                break;
            }
        }
        if (!inserted) this.queue.push(item);
        this.stats.totalQueued++;
        this.recentMessages.set(hash, true);
        this.logger?.debug({ id: item.id, priority, queueSize: this.queue.length }, 'Task enqueued');
        if (!this.processing && !this.paused) this._startProcessing();
        return item.id;
    }

    _hashTask(task, metadata) {
        const data = JSON.stringify({ jid: metadata.jid, content: typeof task === 'function' ? metadata.contentHash : task });
        return Buffer.from(data).toString('base64').substr(0, 32);
    }

    _dropLowPriority() {
        this.queue.sort((a, b) => b.priority - a.priority);
        const toDrop = Math.ceil(this.queue.length * 0.1);
        const dropped = this.queue.splice(0, toDrop);
        this.logger?.warn({ dropped: dropped.length }, 'Dropped low priority items');
    }

    _startProcessing() {
        if (this.processTimer) return;
        this.processing = true;
        this.processTimer = setInterval(() => this._processNext(), this.config.PROCESS_INTERVAL);
    }

    _stopProcessing() {
        if (this.processTimer) {
            clearInterval(this.processTimer);
            this.processTimer = null;
        }
        this.processing = false;
    }

    async _processNext() {
        if (this.paused || this.queue.length === 0) {
            if (this.queue.length === 0) this._stopProcessing();
            return;
        }
        const item = this.queue.shift();
        if (!item) return;
        item.status = 'processing';
        item.attempts++;
        const waitTime = Date.now() - item.createdAt;
        this._updateAverageWaitTime(waitTime);
        try {
            const type = item.metadata.type || 'message';
            await this._checkRateLimit(type, item.metadata.jid);
            const result = typeof item.task === 'function' ? await item.task() : item.task;
            item.status = 'completed';
            this.stats.totalProcessed++;
            this.logger?.debug({ id: item.id, waitTime }, 'Task completed');
            const delay = this.config.DELAYS[type] || this.config.DELAYS.message;
            await this._delay(delay);
            return result;
        } catch (error) {
            this.logger?.error({ id: item.id, error: error.message }, 'Task failed');
            if (item.attempts < item.maxAttempts) {
                item.priority = Math.min(item.priority + 1, PRIORITY.BACKGROUND);
                item.status = 'pending';
                this.queue.push(item);
                this.logger?.debug({ id: item.id, attempts: item.attempts }, 'Task re-queued');
            } else {
                item.status = 'failed';
                this.stats.totalFailed++;
                this.logger?.warn({ id: item.id }, 'Task permanently failed');
            }
        }
    }

    async _checkRateLimit(type, jid) {
        const limit = this.config.RATE_LIMITS[type] || this.config.RATE_LIMITS.message;
        const key = jid ? `${type}:${jid}` : type;
        if (!this.rateLimiters.has(key)) this.rateLimiters.set(key, []);
        const timestamps = this.rateLimiters.get(key);
        const now = Date.now();
        const valid = timestamps.filter(ts => now - ts < limit.window);
        this.rateLimiters.set(key, valid);
        if (valid.length >= limit.count) {
            const oldestValid = valid[valid.length - limit.count];
            const waitTime = limit.window - (now - oldestValid);
            if (waitTime > 0) {
                this.logger?.debug({ key, waitTime }, 'Rate limited, waiting');
                await this._delay(waitTime);
            }
        }
        valid.push(now);
    }

    _updateAverageWaitTime(newTime) {
        const total = this.stats.totalProcessed;
        this.stats.averageWaitTime = (this.stats.averageWaitTime * total + newTime) / (total + 1);
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    pause() {
        this.paused = true;
        this.logger?.info('Queue paused');
    }

    resume() {
        this.paused = false;
        if (this.queue.length > 0 && !this.processing) this._startProcessing();
        this.logger?.info('Queue resumed');
    }

    clear(priority = null) {
        if (priority !== null) this.queue = this.queue.filter(item => item.priority !== priority);
        else this.queue = [];
        this.logger?.info({ cleared: true, remaining: this.queue.length }, 'Queue cleared');
    }

    getStats() {
        return {
            ...this.stats,
            currentQueueSize: this.queue.length,
            isProcessing: this.processing,
            isPaused: this.paused,
            pendingByPriority: {
                critical: this.queue.filter(i => i.priority === PRIORITY.CRITICAL).length,
                high: this.queue.filter(i => i.priority === PRIORITY.HIGH).length,
                normal: this.queue.filter(i => i.priority === PRIORITY.NORMAL).length,
                low: this.queue.filter(i => i.priority === PRIORITY.LOW).length,
                background: this.queue.filter(i => i.priority === PRIORITY.BACKGROUND).length
            }
        };
    }

    cleanup() {
        this._stopProcessing();
        this.queue = [];
        this.rateLimiters.clear();
    }
}

function createMessageQueue(logger, customConfig = {}) {
    return new MessageQueue(logger, customConfig);
}

export {
    PRIORITY,
    QUEUE_CONFIG,
    QueueItem,
    MessageQueue,
    createMessageQueue
};
