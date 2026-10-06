const BACKUP_CONTROL_DB_NAME = '213web-backup-control-1';
const STORE_NAME = 'kv';

let dbPromise = null;

const backupControlDB = {
    db: null,

    init: () => {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(BACKUP_CONTROL_DB_NAME, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
            req.onsuccess = (e) => {
                backupControlDB.db = e.target.result;
                resolve();
            };
            req.onerror = () => reject(req.error || new Error('backup control DB init failed'));
        });

        return dbPromise;
    },

    get: async (key) => new Promise((resolve, reject) => {
        const req = backupControlDB.db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error || new Error('backup control DB read failed'));
    }),

    save: async (key, value) => new Promise((resolve, reject) => {
        const tx = backupControlDB.db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('backup control DB write failed'));
        tx.objectStore(STORE_NAME).put(value, key);
    }),
};

export default backupControlDB;