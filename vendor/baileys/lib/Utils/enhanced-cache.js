import { LRUCache } from 'lru-cache';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const CACHE_CONFIG = {
    MEMORY: {
        MAX_SIZE: 10000,
        TTL: 30 * 60 * 1000,
        STALE_TTL: 5 * 60 * 1000
    },
    SIGNAL: {
        MAX_SIZE: 5000,
        TTL: 60 * 60 * 1000
    },
    GROUPS: {
        MAX_SIZE: 500,
        TTL: 15 * 60 * 1000
    },
    PROFILES: {
        MAX_SIZE: 1000,
        TTL: 60 * 60 * 1000
    },
    PERSIST_INTERVAL: 5 * 60 * 1000,
    PERSIST_ON_SIZE: 100
};

class EnhancedCache {
    constructor(name, options = {}) {
        this.name = name;
        this.options = { ...CACHE_CONFIG.MEMORY, ...options };
        this.persistPath = options.persistPath;
        this.dirty = new Set();
        this.persistTimer = null;
        this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
        this.cache = new LRUCache({
            max: this.options.MAX_SIZE,
            ttl: this.options.TTL,
            allowStale: true,
            updateAgeOnGet: true,
            updateAgeOnHas: true
        });
        this.hotCache = new Map();
        this.hotCacheMaxSize = Math.floor(this.options.MAX_SIZE * 0.1);
        this.accessCount = new Map();
        if (this.persistPath) this._startPersistence();
    }

    get(key) {
        if (this.hotCache.has(key)) {
            this.stats.hits++;
            this._trackAccess(key);
            return this.hotCache.get(key);
        }
        const value = this.cache.get(key);
        if (value !== undefined) {
            this.stats.hits++;
            this._trackAccess(key);
            if (this._isHotKey(key)) this._addToHotCache(key, value);
            return value;
        }
        this.stats.misses++;
        return undefined;
    }

    set(key, value, ttl = undefined) {
        this.cache.set(key, value, { ttl: ttl || this.options.TTL });
        this.stats.sets++;
        if (this.hotCache.has(key)) this.hotCache.set(key, value);
        if (this.persistPath) {
            this.dirty.add(key);
            if (this.dirty.size >= CACHE_CONFIG.PERSIST_ON_SIZE) this._persist();
        }
    }

    delete(key) {
        this.cache.delete(key);
        this.hotCache.delete(key);
        this.accessCount.delete(key);
        this.dirty.delete(key);
        this.stats.deletes++;
    }

    has(key) {
        return this.hotCache.has(key) || this.cache.has(key);
    }

    getMany(keys) {
        const result = {};
        const missing = [];
        for (const key of keys) {
            const value = this.get(key);
            if (value !== undefined) result[key] = value;
            else missing.push(key);
        }
        return { found: result, missing };
    }

    setMany(entries) {
        for (const [key, value] of Object.entries(entries)) this.set(key, value);
    }

    _trackAccess(key) {
        const count = (this.accessCount.get(key) || 0) + 1;
        this.accessCount.set(key, count);
        if (this.accessCount.size > this.options.MAX_SIZE) this._cleanupAccessCount();
    }

    _isHotKey(key) {
        return (this.accessCount.get(key) || 0) >= 3;
    }

    _addToHotCache(key, value) {
        if (this.hotCache.size >= this.hotCacheMaxSize) {
            let minKey = null;
            let minCount = Infinity;
            for (const [k] of this.hotCache) {
                const count = this.accessCount.get(k) || 0;
                if (count < minCount) { minCount = count; minKey = k; }
            }
            if (minKey) this.hotCache.delete(minKey);
        }
        this.hotCache.set(key, value);
    }

    _cleanupAccessCount() {
        const entries = [...this.accessCount.entries()];
        entries.sort((a, b) => b[1] - a[1]);
        this.accessCount.clear();
        entries.slice(0, this.options.MAX_SIZE / 2).forEach(([k, v]) => {
            this.accessCount.set(k, Math.floor(v / 2));
        });
    }

    _startPersistence() {
        this.persistTimer = setInterval(() => {
            if (this.dirty.size > 0) this._persist();
        }, CACHE_CONFIG.PERSIST_INTERVAL);
    }

    async _persist() {
        if (!this.persistPath || this.dirty.size === 0) return;
        try {
            const data = {};
            for (const key of this.dirty) {
                const value = this.cache.get(key);
                if (value !== undefined) data[key] = value;
            }
            const filePath = join(this.persistPath, `${this.name}-cache.json`);
            let existing = {};
            try {
                const content = await readFile(filePath, 'utf8');
                existing = JSON.parse(content);
            } catch {}
            const merged = { ...existing, ...data };
            await writeFile(filePath, JSON.stringify(merged), 'utf8');
            this.dirty.clear();
        } catch (error) {
            console.error('Cache persist error:', error);
        }
    }

    async load() {
        if (!this.persistPath) return;
        try {
            const filePath = join(this.persistPath, `${this.name}-cache.json`);
            const content = await readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            for (const [key, value] of Object.entries(data)) this.cache.set(key, value);
        } catch {}
    }

    getStats() {
        const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
        return {
            ...this.stats,
            hitRate: (hitRate * 100).toFixed(2) + '%',
            size: this.cache.size,
            hotCacheSize: this.hotCache.size,
            dirtyKeys: this.dirty.size
        };
    }

    clear() {
        this.cache.clear();
        this.hotCache.clear();
        this.accessCount.clear();
        this.dirty.clear();
    }

    cleanup() {
        if (this.persistTimer) clearInterval(this.persistTimer);
        this._persist();
        this.clear();
    }
}

class CacheManager {
    constructor(baseDir, logger) {
        this.baseDir = baseDir;
        this.logger = logger;
        this.caches = {
            signal: new EnhancedCache('signal', { ...CACHE_CONFIG.SIGNAL, persistPath: baseDir }),
            groups: new EnhancedCache('groups', { ...CACHE_CONFIG.GROUPS, persistPath: baseDir }),
            profiles: new EnhancedCache('profiles', { ...CACHE_CONFIG.PROFILES, persistPath: baseDir }),
            messages: new EnhancedCache('messages', CACHE_CONFIG.MEMORY),
            misc: new EnhancedCache('misc', CACHE_CONFIG.MEMORY)
        };
    }

    async loadAll() {
        await Promise.all([
            this.caches.signal.load(),
            this.caches.groups.load(),
            this.caches.profiles.load()
        ]);
        this.logger?.info('All caches loaded');
    }

    getCache(name) {
        return this.caches[name];
    }

    getAllStats() {
        const stats = {};
        for (const [name, cache] of Object.entries(this.caches)) stats[name] = cache.getStats();
        return stats;
    }

    clearAll() {
        for (const cache of Object.values(this.caches)) cache.clear();
    }

    async cleanup() {
        for (const cache of Object.values(this.caches)) cache.cleanup();
    }
}

export {
    CACHE_CONFIG,
    EnhancedCache,
    CacheManager
};
