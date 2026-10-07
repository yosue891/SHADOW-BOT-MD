import { proto } from '../../WAProto/index.js';
import { initAuthCreds } from './auth-utils.js';

const BufferJSON = {
    replacer: (k, value) => {
        if (Buffer.isBuffer(value) || value instanceof Uint8Array || value?.type === 'Buffer') {
            return { type: 'Buffer', data: Buffer.from(value?.data || value).toString('base64') };
        }
        return value;
    },
    reviver: (_, value) => {
        if (typeof value === 'object' && !!value && (value.buffer === true || value.type === 'Buffer')) {
            const val = value.data || value.value;
            return typeof val === 'string' ? Buffer.from(val, 'base64') : Buffer.from(val || []);
        }
        return value;
    }
};

const CREDS_ROW_KEY = '__creds__';

const CREATE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS creds (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS signal_keys (
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (type, id)
);
CREATE INDEX IF NOT EXISTS signal_keys_type_idx ON signal_keys(type);
`;

async function useSqliteAuthState(opts) {
    let Database;
    try {
        Database = (await import('better-sqlite3')).default;
    } catch (err) {
        throw new Error('`better-sqlite3` is required for `useSqliteAuthState`. Install with: npm install better-sqlite3');
    }

    const db = opts.database || new Database(opts.dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.exec(CREATE_SCHEMA_SQL);

    const stmts = {
        credsSelect: db.prepare('SELECT value FROM creds WHERE key = ?'),
        credsUpsert: db.prepare('INSERT INTO creds (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'),
        keySelect: db.prepare('SELECT value FROM signal_keys WHERE type = ? AND id = ?'),
        keyUpsert: db.prepare('INSERT INTO signal_keys (type, id, value) VALUES (?, ?, ?) ON CONFLICT(type, id) DO UPDATE SET value = excluded.value'),
        keyDelete: db.prepare('DELETE FROM signal_keys WHERE type = ? AND id = ?'),
        keyListIds: db.prepare('SELECT id FROM signal_keys WHERE type = ?'),
        keyList: db.prepare('SELECT id, value FROM signal_keys WHERE type = ?'),
        clearKeys: db.prepare('DELETE FROM signal_keys')
    };

    const loadCreds = () => {
        const row = stmts.credsSelect.get(CREDS_ROW_KEY);
        if (!row) return initAuthCreds();
        return JSON.parse(row.value, BufferJSON.reviver);
    };

    const persistCreds = creds => {
        stmts.credsUpsert.run(CREDS_ROW_KEY, JSON.stringify(creds, BufferJSON.replacer));
    };

    const creds = loadCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const row = stmts.keySelect.get(type, id);
                        if (row) {
                            let value = JSON.parse(row.value, BufferJSON.reviver);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: async data => {
                    const writeTx = db.transaction(() => {
                        for (const category in data) {
                            for (const id in data[category]) {
                                const value = data[category][id];
                                if (value) stmts.keyUpsert.run(category, id, JSON.stringify(value, BufferJSON.replacer));
                                else stmts.keyDelete.run(category, id);
                            }
                        }
                    });
                    writeTx();
                }
            }
        },
        saveCreds: async () => { persistCreds(creds); },
        clearKeys: async () => { stmts.clearKeys.run(); },
        close: () => { db.close(); }
    };
}

export { useSqliteAuthState, BufferJSON };
