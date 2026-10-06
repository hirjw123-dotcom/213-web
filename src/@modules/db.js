// --- backup URL param 처리 ---
const _backupParam = new URLSearchParams(location.search).get('backup');

// 백업 DB 여부 & 날짜 export
export const isBackupDB = !!_backupParam;
export const backupDBDate = _backupParam || null;

// 날짜를 zero-padded YYYY-MM-DD 로 변환 (문자열 비교가 올바르게 동작하도록)
export const formatYMD = (d) => {
    const D = new Date(d);
    return `${D.getFullYear()}-${String(D.getMonth() + 1).padStart(2, '0')}-${String(D.getDate()).padStart(2, '0')}`;
};

const MAIN_KEY = '213web-4';
const BACKUP_META_KEY = '__backup_meta_1_';

let dbInitWait = null;
const DB = {
    db: null,
    key: _backupParam ? `213-${_backupParam}` : MAIN_KEY,

    // enc/dec 는 항상 MAIN_KEY 로 XOR (백업 DB 에서도 동일한 키로 복호화해야 함)
    enc: (v) => {
        const str = encodeURIComponent(JSON.stringify(v));
        const xor = str.split('').map((c, i) =>
            String.fromCharCode(c.charCodeAt(0) ^ MAIN_KEY.charCodeAt(i % MAIN_KEY.length))
        ).join('');
        return btoa(xor);
    },

    dec: (v) => {
        try {
            const xor = atob(v).split('').map((c, i) =>
                String.fromCharCode(c.charCodeAt(0) ^ MAIN_KEY.charCodeAt(i % MAIN_KEY.length))
            ).join('');
            return JSON.parse(decodeURIComponent(xor));
        } catch (e) { return null; }
    },

    init: () => {
        if (dbInitWait) return dbInitWait;
        dbInitWait = new Promise(r => {
            const req = indexedDB.open(DB.key, 1);
            req.onupgradeneeded = (e) => e.target.result.createObjectStore('kv');
            req.onsuccess = async (e) => {
                DB.db = e.target.result;


                r();
            };
        });
        return dbInitWait;
    },

    save: (k, v) => new Promise(r => {
        if (isBackupDB) {
            console.log('DB.save blocked in backup DB', k, v);
            if (k != 'soldierCategories-2') {
                alert('백업 DB에서는 기능을 사용할 수 없습니다.');
            }
            return;
        }
        const tx = DB.db.transaction('kv', 'readwrite');
        tx.oncomplete = () => r();
        tx.objectStore('kv').put(DB.enc(v), k);
    }),

    get: (k) => new Promise(r => {
        const req = DB.db.transaction('kv', 'readonly').objectStore('kv').get(k);
        req.onsuccess = () => r(DB.dec(req.result));
    }),

    del: (k) => new Promise(r => {
        if (isBackupDB) return alert('백업 DB에서는 기능을 사용할 수 없습니다.');

        const tx = DB.db.transaction('kv', 'readwrite');
        tx.oncomplete = () => r();
        tx.objectStore('kv').delete(k);
    }),

    getAllKeys: () => new Promise(r => {
        const req = DB.db.transaction('kv', 'readonly').objectStore('kv').getAllKeys();
        req.onsuccess = () => r(req.result || []);
    }),

    getAllEntriesRaw: () => new Promise(r => {
        const tx = DB.db.transaction('kv', 'readonly');
        const store = tx.objectStore('kv');
        const keysReq = store.getAllKeys();
        const valsReq = store.getAll();
        let keys = null;
        let vals = null;
        const finish = () => {
            if (!keys || !vals) return;
            r(keys.map((key, index) => ({ key, value: vals[index] })));
        };
        keysReq.onsuccess = () => {
            keys = keysReq.result || [];
            finish();
        };
        valsReq.onsuccess = () => {
            vals = valsReq.result || [];
            finish();
        };
    }),

    replaceAllEntriesRaw: (entries) => new Promise((resolve, reject) => {
        if (isBackupDB) {
            alert('백업 DB에서는 기능을 사용할 수 없습니다.');
            return;
        }

        const tx = DB.db.transaction('kv', 'readwrite');
        const store = tx.objectStore('kv');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('DB restore failed'));
        store.clear();
        (entries || []).forEach((entry) => {
            if (!entry || typeof entry.key !== 'string' || typeof entry.value !== 'string') return;
            store.put(entry.value, entry.key);
        });
    }),

    // ─── 백업 유틸 ────────────────────────────────

    /** 현재 DB 의 모든 KV 를 targetDbName 이라는 IndexedDB 로 복사 */
    copyAllTo: (targetDbName) => new Promise(resolve => {
        if (isBackupDB) return;

        const readTx = DB.db.transaction('kv', 'readonly');
        const store = readTx.objectStore('kv');
        const keysReq = store.getAllKeys();
        const valsReq = store.getAll();
        let keys, vals, done = 0;
        const check = () => {
            if (++done < 2) return;
            const openReq = indexedDB.open(targetDbName, 1);
            openReq.onupgradeneeded = (e) => e.target.result.createObjectStore('kv');
            openReq.onsuccess = (e) => {
                const tdb = e.target.result;
                const tx = tdb.transaction('kv', 'readwrite');
                const ts = tx.objectStore('kv');
                ts.clear();
                for (let i = 0; i < keys.length; i++) ts.put(vals[i], keys[i]);
                tx.oncomplete = () => { tdb.close(); resolve(); };
            };
        };
        keysReq.onsuccess = () => { keys = keysReq.result; check(); };
        valsReq.onsuccess = () => { vals = valsReq.result; check(); };
    }),

    /** IndexedDB 통째로 삭제 */
    deleteDatabase: (dbName) => new Promise(resolve => {
        if (isBackupDB) return;

        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
    }),

};

export default DB;