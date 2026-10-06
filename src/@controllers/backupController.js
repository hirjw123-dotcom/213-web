import DB, { isBackupDB } from '../@modules/db.js';
import backupControlDB from '../@modules/backupControlDB.js';
import { authController } from './authController.js';

const BACKUP_FILE_MAGIC = '2131-db-backup-v1';
const CRYPTO_ITERATIONS = 120000;
const RESTORE_LOG_KEY = 'restore_logs';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const bufferToBase64 = (buffer) => {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
    }
    return btoa(binary);
};

const base64ToBytes = (value) => {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
};

const deriveAesKey = async (password, salt) => {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey'],
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: CRYPTO_ITERATIONS,
            hash: 'SHA-256',
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
    );
};

const encryptPayload = async (payload, password) => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(password, salt);
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        textEncoder.encode(payload),
    );

    return {
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv),
        cipherText: bufferToBase64(cipherBuffer),
    };
};

const decryptPayload = async (encrypted, password) => {
    const salt = base64ToBytes(encrypted.salt);
    const iv = base64ToBytes(encrypted.iv);
    const cipherText = base64ToBytes(encrypted.cipherText);
    const key = await deriveAesKey(password, salt);
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherText);
    return textDecoder.decode(plainBuffer);
};

const readFileAsText = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('파일을 읽지 못했습니다.'));
    reader.readAsText(file);
});

const padNumber = (value) => String(value).padStart(2, '0');

const formatBackupFileName = (date = new Date()) => {
    const yyyy = date.getFullYear();
    const mm = padNumber(date.getMonth() + 1);
    const dd = padNumber(date.getDate());
    const hh = padNumber(date.getHours());
    const mi = padNumber(date.getMinutes());
    const ss = padNumber(date.getSeconds());
    return `${yyyy}-${mm}-${dd}_${hh}-${mi}-${ss}_2131.db`;
};

const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
};

const normalizeRestoreLogs = (logs) => Array.isArray(logs)
    ? [...logs].sort((a, b) => (b.restoredAt || 0) - (a.restoredAt || 0))
    : [];

const parseBackupDocument = async (file, password) => {
    if (!file) {
        throw new Error('복원할 백업 파일을 선택해주세요.');
    }

    const rawText = await readFileAsText(file);
    let doc;
    try {
        doc = JSON.parse(rawText);
    } catch {
        throw new Error('백업 파일 형식이 올바르지 않습니다.');
    }

    if (doc?.type !== BACKUP_FILE_MAGIC || !doc?.encrypted?.salt || !doc?.encrypted?.iv || !doc?.encrypted?.cipherText) {
        throw new Error('2131 백업 파일이 아닙니다.');
    }

    let payload;
    try {
        payload = JSON.parse(await decryptPayload(doc.encrypted, password));
    } catch {
        throw new Error('복원 비밀번호가 올바르지 않거나 파일이 손상되었습니다.');
    }

    if (!Array.isArray(payload?.entries)) {
        throw new Error('백업 데이터 형식이 올바르지 않습니다.');
    }

    return {
        doc,
        payload,
    };
};

export const backupController = {
    canUseBackupFeatures: async () => {
        if (isBackupDB) {
            return { success: false, message: '백업 DB에서는 백업/복원을 실행할 수 없습니다.' };
        }

        const isMaster = await authController.isMaster();
        if (!isMaster) {
            return { success: false, message: '마스터 계정만 백업/복원을 사용할 수 있습니다.' };
        }

        return { success: true };
    },

    exportBackupFile: async ({ password }) => {
        const access = await backupController.canUseBackupFeatures();
        if (!access.success) return access;

        if (!password) {
            return { success: false, message: '백업 파일 암호를 입력해주세요.' };
        }

        const currentUser = await authController.getCurrentUser();
        const entries = await DB.getAllEntriesRaw();
        const payload = {
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser ? {
                militaryId: currentUser.militaryId,
                name: currentUser.name,
            } : null,
            entryCount: entries.length,
            entries,
        };

        const encrypted = await encryptPayload(JSON.stringify(payload), password);
        const fileDoc = {
            type: BACKUP_FILE_MAGIC,
            version: 1,
            algorithm: 'AES-GCM',
            kdf: 'PBKDF2-SHA256',
            iterations: CRYPTO_ITERATIONS,
            exportedAt: payload.exportedAt,
            encrypted,
        };

        downloadBlob(
            new Blob([JSON.stringify(fileDoc)], { type: 'application/octet-stream' }),
            formatBackupFileName(new Date()),
        );

        return {
            success: true,
            message: `${entries.length}개 항목을 백업 파일로 내보냈습니다.`,
            entryCount: entries.length,
        };
    },

    restoreBackupFile: async ({ file, backupPassword, adminPassword }) => {
        const access = await backupController.canUseBackupFeatures();
        if (!access.success) return access;

        if (!backupPassword) {
            return { success: false, message: '복원 비밀번호를 입력해주세요.' };
        }

        const adminCheck = await authController.verifyCurrentUserPassword(adminPassword);
        if (!adminCheck.success) return adminCheck;

        const currentUser = adminCheck.user;
        if (!(currentUser.permissions || []).includes('master')) {
            return { success: false, message: '마스터 계정만 복원할 수 있습니다.' };
        }

        const { payload } = await parseBackupDocument(file, backupPassword);
        await DB.replaceAllEntriesRaw(payload.entries);

        await backupControlDB.init();
        const logs = normalizeRestoreLogs(await backupControlDB.get(RESTORE_LOG_KEY));
        logs.unshift({
            restoredAt: Date.now(),
            restorerMilitaryId: currentUser.militaryId,
            restorerName: currentUser.name,
            fileName: file?.name || '',
            backupExportedAt: payload.exportedAt || null,
            entryCount: payload.entries.length,
        });
        await backupControlDB.save(RESTORE_LOG_KEY, logs);

        return {
            success: true,
            message: `${payload.entries.length}개 항목을 복원했습니다. 새로고침 후 반영됩니다.`,
            entryCount: payload.entries.length,
        };
    },

    getRestoreLogs: async () => {
        await backupControlDB.init();
        return normalizeRestoreLogs(await backupControlDB.get(RESTORE_LOG_KEY));
    },

    inspectBackupFile: async ({ file, password }) => {
        const { payload } = await parseBackupDocument(file, password);
        return {
            success: true,
            payload,
        };
    },
};
