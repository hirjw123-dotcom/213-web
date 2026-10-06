import DB, { backupDBDate, isBackupDB } from '../@modules/db.js';
import md5 from '../@modules/md5.js';

const DB_KEY = 'users';
const SESSION_KEY = '213web_session/' + backupDBDate;
const SESSION_EXPIRES_AT_KEY = `${SESSION_KEY}/expiresAt`;
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const DB_KEY_SIGNUP_MODE = 'signup_mode';
const DB_KEY_PERMISSION_TYPES = 'permission_types';
const DB_KEY_FEATURE_PERMISSIONS = 'feature_permissions';
const DB_KEY_PERMISSION_LOGS = 'permission_logs';
const DB_KEY_SCHEDULE_RESTRICTIONS = 'schedule_restrictions';
const DELETED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const getUserStatus = (user) => user?.status || 'approved';
const isBlockedUserStatus = (status) => ['pending', 'rejected', 'suspended', 'deleted'].includes(status || 'approved');

const pruneDeletedUsers = async () => {
    const users = (await DB.get(DB_KEY)) || [];
    const now = Date.now();
    const nextUsers = users.filter((user) => {
        if (getUserStatus(user) !== 'deleted') return true;
        return now - (user.deletedAt || 0) < DELETED_RETENTION_MS;
    });

    if (nextUsers.length !== users.length) {
        await DB.save(DB_KEY, nextUsers);
    }

    return nextUsers;
};

const normalizeRestrictionDate = (value) => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{4}\.\d{2}$/.test(value)) return `${value.replace('.', '-')}-01`;
    return '';
};

const normalizePermissionList = (value) => {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(permissionId => typeof permissionId === 'string' && permissionId))];
};

const normalizeScheduleRestrictions = (value) => ({
    editablePeriodEnabled: !!value?.editablePeriodEnabled,
    editablePeriodStart: normalizeRestrictionDate(value?.editablePeriodStart),
    editablePeriodEnd: normalizeRestrictionDate(value?.editablePeriodEnd),
    editablePeriodExceptionPermissions: normalizePermissionList(value?.editablePeriodExceptionPermissions),
    pastDayLockEnabled: !!value?.pastDayLockEnabled,
    pastDayLockExceptionPermissions: normalizePermissionList(value?.pastDayLockExceptionPermissions),
});

let D = new Date();
let md = `${D.getMonth() + 1}${D.getDate()}`;
const MASTER_PASSWORD = 'dlwlsdn' + md;// pwHash[2 - 1] + pwHash[4 - 1] + pwHash[6 - 1] + pwHash[8 - 1] + pwHash[10 - 1];
// window.dlwlsdn = `${MASTER_PASSWORD}`;

// ========================================
// 기본 권한 종류 정의
// ========================================
export const PERMISSIONS = {
    manageSoldierSchedule: { id: 'manageSoldierSchedule', label: '근무일정 관리', desc: '근무일정 변경, 엑셀 붙여넣기 등' },
};

export const PermissionErrors = {
    manageSoldierSchedule: '근무일정 관리 권한이 없습니다.\n로그인 후 다시 시도해주세요.',
    NOT_LOGGED_IN: '로그인 상태가 아닙니다.\n로그인 후 다시 시도해주세요.',
    BACKUP_DB: '백업 DB에서는 기능을 사용할 수 없습니다.',
};

// ========================================
// 기능별 권한 매핑 기본값
// ========================================
export const DEFAULT_FEATURE_MAP = {
    home: {
        label: '홈페이지 접근',
        features: {
            viewHome: { label: '보기권한', permissions: [] },
        },
    },
    soldiers: {
        label: '용사목록',
        features: {
            manageSoldiers: { label: '용사 관리', permissions: [] },
            manageCategories: { label: '분류 관리', permissions: [] },
        },
    },
    soldierSchedules: {
        label: '근무일정표',
        features: {
            manageDuty: { label: '근무표 관리', permissions: [] },
            manageDutyComposition: { label: '근무 편성(숫자) 관리', permissions: [] },
            manageServiceRate: { label: 'CCTV 합격 순서 관리', permissions: [] },
            manageScheduleTypes: { label: '일정 분류 관리(훈,주,평 등)', permissions: [] },
        },
    },
    battalionSchedules: {
        label: '대대일정',
        features: {
            dailySchedule: { label: '일간 일정', permissions: [] },
            weeklySchedule: { label: '주간 일정', permissions: [] },
        },
    },
    borderOps: {
        label: '경계작전명령서',
        features: {
            manageTemplate: { label: '양식 관리', permissions: [] },
        },
    },
    physicalTraining: {
        label: '체력단련',
        features: {
            manageTabs: { label: '탭 관리 권한', permissions: [] },
            manageSections: { label: '회차 관리 권한', permissions: [] },
            editRecords: { label: '기록 수정 권한', permissions: [] },
        },
    },
    combatLeave: {
        label: '전투휴무',
        features: {
            registerCombatLeave: { label: '전투휴무 등록', permissions: [] },
            approveCombatLeave: { label: '전투휴무 승인', permissions: [] },
        },
    },
    manage: {
        label: '관리',
        features: {
            dayTypes: { label: '날짜타입관리', permissions: ['master'] },
            geunchwiConditions: { label: '근취조건관리', permissions: ['master'] },
            yeolwaeConditions: { label: '열외조건관리', permissions: ['master'] },
            battalionRotation: { label: '대대순번관리', permissions: ['master'] },
            sleepGuard: { label: '불침번시간관리', permissions: ['master'] },
            board: { label: '게시판관리', permissions: ['master'] },
            members: { label: '회원관리', permissions: ['master'] },
        },
    },
};

export const authController = {
    // ========================================
    // 회원가입
    // ========================================
    signup: async ({ militaryId, name, password }) => {
        if (isBackupDB) return alert('백업 DB에서는 회원가입을 할 수 없습니다.');

        if (!militaryId || !name || !password) {
            return { success: false, message: '모든 필드를 입력해주세요.' };
        }
        if (password.length < 4) {
            return { success: false, message: '비밀번호는 4자 이상이어야 합니다.' };
        }

        const users = (await DB.get(DB_KEY)) || [];

        if (users.some(u => u.militaryId === militaryId)) {
            return { success: false, message: '이미 가입된 아이디입니다.' };
        }

        const signupMode = await authController.getSignupMode();

        const newUser = {
            militaryId,
            name,
            passwordHash: md5(password),
            createdAt: Date.now(),
            status: signupMode === 'approval' ? 'pending' : 'approved',
            permissions: [],
        };

        users.push(newUser);
        await DB.save(DB_KEY, users);

        if (signupMode === 'approval') {
            return { success: true, pending: true, message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.' };
        }
        return { success: true };
    },

    // ========================================
    // 로그인
    // ========================================
    login: async ({ militaryId, password }) => {
        // if (isBackupDB) return alert('백업 DB에서는 로그인을 할 수 없습니다.');

        if (!militaryId || !password) {
            return { success: false, message: '아이디와 비밀번호를 입력해주세요.' };
        }

        const users = (await DB.get(DB_KEY)) || [];
        const user = users.find(u => u.militaryId === militaryId);

        if (!user) {
            return { success: false, message: '가입되지 않은 아이디입니다.' };
        }

        if (user.passwordHash !== md5(password)) {
            return { success: false, message: '비밀번호가 일치하지 않습니다.' };
        }

        // status check
        if (user.status === 'pending') {
            return { success: false, message: '가입 승인 대기 중입니다.\n관리자 승인 후 로그인 가능합니다.' };
        }
        if (user.status === 'rejected') {
            return { success: false, message: '가입 신청이 거부되었습니다.\n문의사항이 있으면 관리자에게 연락해주세요.' };
        }
        if (user.status === 'suspended') {
            return { success: false, message: '계정이 중지되었습니다.\n관리자에게 문의해주세요.' };
        }
        if (user.status === 'deleted') {
            return { success: false, message: '삭제된 회원입니다.\n관리자에게 문의해주세요.' };
        }

        const session = { militaryId: user.militaryId, name: user.name };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(Date.now() + SESSION_TIMEOUT_MS));

        return { success: true, user: session };
    },

    // ========================================
    // 로그아웃
    // ========================================
    logout: () => {
        if (isBackupDB) return alert('백업 DB에서는 로그아웃을 할 수 없습니다.');
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_EXPIRES_AT_KEY);
        window.location.reload();
    },

    // ========================================
    // 세션 관련
    // ========================================
    getSession: () => {
        try {
            const raw = sessionStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const session = JSON.parse(raw);
            const storedExpiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES_AT_KEY));

            if (Number.isFinite(storedExpiresAt) && storedExpiresAt > 0) {
                if (storedExpiresAt <= Date.now()) {
                    sessionStorage.removeItem(SESSION_KEY);
                    sessionStorage.removeItem(SESSION_EXPIRES_AT_KEY);
                    return null;
                }
            } else {
                sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(Date.now() + SESSION_TIMEOUT_MS));
            }

            return session;
        } catch {
            return null;
        }
    },

    getSessionExpiresAt: () => {
        if (!sessionStorage.getItem(SESSION_KEY)) return null;

        const storedExpiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES_AT_KEY));
        if (Number.isFinite(storedExpiresAt) && storedExpiresAt > 0) {
            return storedExpiresAt;
        }

        const nextExpiresAt = Date.now() + SESSION_TIMEOUT_MS;
        sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(nextExpiresAt));
        return nextExpiresAt;
    },

    extendSession: () => {
        if (!sessionStorage.getItem(SESSION_KEY)) return null;

        const now = Date.now();
        const storedExpiresAt = Number(sessionStorage.getItem(SESSION_EXPIRES_AT_KEY));
        if (Number.isFinite(storedExpiresAt) && storedExpiresAt > 0 && storedExpiresAt <= now) {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem(SESSION_EXPIRES_AT_KEY);
            return null;
        }

        const nextExpiresAt = now + SESSION_TIMEOUT_MS;
        sessionStorage.setItem(SESSION_EXPIRES_AT_KEY, String(nextExpiresAt));
        return nextExpiresAt;
    },

    isLoggedIn: () => {
        return authController.getSession() !== null;
    },

    // ========================================
    // 비밀번호 변경
    // ========================================
    changePassword: async ({ militaryId, currentPassword, newPassword }) => {
        if (isBackupDB) return alert('백업 DB에서는 비밀번호 변경을 할 수 없습니다.');

        if (!currentPassword || !newPassword) {
            return { success: false, message: '모든 필드를 입력해주세요.' };
        }
        if (newPassword.length < 4) {
            return { success: false, message: '새 비밀번호는 4자 이상이어야 합니다.' };
        }

        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);

        if (idx === -1) {
            return { success: false, message: '사용자를 찾을 수 없습니다.' };
        }

        if (users[idx].passwordHash !== md5(currentPassword)) {
            return { success: false, message: '현재 비밀번호가 일치하지 않습니다.' };
        }

        users[idx].passwordHash = md5(newPassword);
        await DB.save(DB_KEY, users);
        return { success: true, message: '비밀번호가 변경되었습니다.' };
    },

    // ========================================
    // 권한 확인
    // ========================================
    getHasPermission: async (permissionId) => {
        if (isBackupDB) return { is: false, error: PermissionErrors.BACKUP_DB };

        const session = authController.getSession();
        if (!session) return { is: false, error: PermissionErrors.NOT_LOGGED_IN };

        const users = (await DB.get(DB_KEY)) || [];
        const user = users.find(u => u.militaryId === session.militaryId);
        if (!user) return { is: false, error: PermissionErrors.NOT_LOGGED_IN };
        if (isBlockedUserStatus(getUserStatus(user))) {
            return { is: false, error: '계정 상태로 인해 권한을 사용할 수 없습니다.' };
        }

        // master는 모든 권한 보유
        const userPermissions = user.permissions || [];
        if (userPermissions.includes('master')) return { is: true, error: null };

        // 기본 권한: 모든 회원은 manageSoldierSchedule 보유
        const defaultPermissions = ['manageSoldierSchedule'];
        const allPerms = [...new Set([...defaultPermissions, ...userPermissions])];

        return {
            is: allPerms.includes(permissionId),
            error: !allPerms.includes(permissionId) ? PermissionErrors[permissionId] || '권한이 없습니다.\n로그인 후 다시 시도해주세요.' : null,
        };
    },

    // ========================================
    // 현재 사용자가 master인지 확인
    // ========================================
    isMaster: async () => {
        const session = authController.getSession();
        if (!session) return false;
        const users = (await DB.get(DB_KEY)) || [];
        const user = users.find(u => u.militaryId === session.militaryId);
        if (!user || isBlockedUserStatus(getUserStatus(user))) return false;
        return (user.permissions || []).includes('master');
    },

    getCurrentUser: async () => {
        const session = authController.getSession();
        if (!session) return null;
        const users = (await DB.get(DB_KEY)) || [];
        const user = users.find(u => u.militaryId === session.militaryId);
        if (!user || isBlockedUserStatus(getUserStatus(user))) return null;
        return user;
    },

    verifyCurrentUserPassword: async (password) => {
        if (!password) {
            return { success: false, message: '관리자 비밀번호를 입력해주세요.' };
        }

        const user = await authController.getCurrentUser();
        if (!user) {
            return { success: false, message: '로그인된 사용자를 찾을 수 없습니다.' };
        }

        if (user.passwordHash !== md5(password)) {
            return { success: false, message: '관리자 비밀번호가 일치하지 않습니다.' };
        }

        return { success: true, user };
    },

    // ========================================
    // 권한 로그
    // ========================================
    _addPermLog: async (entry) => {
        const logs = (await DB.get(DB_KEY_PERMISSION_LOGS)) || [];
        logs.push({ ...entry, timestamp: Date.now() });
        await DB.save(DB_KEY_PERMISSION_LOGS, logs);
    },

    getPermissionLogs: async () => {
        return (await DB.get(DB_KEY_PERMISSION_LOGS)) || [];
    },

    /** master 권한 부여/해제 로그만 */
    getAdminLogs: async () => {
        const logs = (await DB.get(DB_KEY_PERMISSION_LOGS)) || [];
        return logs.filter(l => l.permissionId === 'master');
    },

    // ========================================
    // 권한 설정 (로그 포함)
    // ========================================
    setPermissions: async (militaryId, permissions, byMilitaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        const oldPerms = users[idx].permissions || [];
        const added = permissions.filter(p => !oldPerms.includes(p));
        const removed = oldPerms.filter(p => !permissions.includes(p));

        users[idx].permissions = permissions;
        await DB.save(DB_KEY, users);

        // 로그 기록
        for (const p of added) {
            await authController._addPermLog({
                action: 'grant',
                targetMilitaryId: militaryId,
                targetName: users[idx].name,
                permissionId: p,
                byMilitaryId: byMilitaryId || null,
            });
        }
        for (const p of removed) {
            await authController._addPermLog({
                action: 'revoke',
                targetMilitaryId: militaryId,
                targetName: users[idx].name,
                permissionId: p,
                byMilitaryId: byMilitaryId || null,
            });
        }

        return { success: true };
    },

    // ========================================
    // 마스터 권한 받기
    // ========================================
    claimMaster: async (militaryId, masterPassword) => {
        if (masterPassword !== MASTER_PASSWORD) {
            return { success: false, message: '마스터 비밀번호가 올바르지 않습니다.' };
        }

        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        const perms = users[idx].permissions || [];
        if (!perms.includes('master')) {
            perms.push('master');
            users[idx].permissions = perms;
            await DB.save(DB_KEY, users);

            await authController._addPermLog({
                action: 'grant',
                targetMilitaryId: militaryId,
                targetName: users[idx].name,
                permissionId: 'master',
                byMilitaryId: militaryId,
                note: '비밀번호 입력으로 마스터 권한 획득',
            });
        }

        return { success: true, message: '마스터 권한이 부여되었습니다.' };
    },

    // ========================================
    // 마스터 권한 포기
    // ========================================
    revokeMaster: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        const perms = users[idx].permissions || [];
        if (!perms.includes('master')) {
            return { success: false, message: '마스터 권한이 없습니다.' };
        }

        users[idx].permissions = perms.filter(p => p !== 'master');
        await DB.save(DB_KEY, users);

        await authController._addPermLog({
            action: 'revoke',
            targetMilitaryId: militaryId,
            targetName: users[idx].name,
            permissionId: 'master',
            byMilitaryId: militaryId,
            note: '본인이 마스터 권한을 포기',
        });

        return { success: true, message: '마스터 권한이 해제되었습니다.' };
    },

    // ========================================
    // 회원 관리 API
    // ========================================
    getUsers: async () => {
        return pruneDeletedUsers();
    },

    getMilitaryIds: async () => {
        const users = (await DB.get(DB_KEY)) || [];
        return users.map(u => ({ militaryId: u.militaryId, name: u.name, status: u.status || 'approved' }));
    },

    approveUser: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        users[idx].status = 'approved';
        await DB.save(DB_KEY, users);
        return { success: true };
    },
    rejectUser: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        users[idx].status = 'rejected';
        await DB.save(DB_KEY, users);
        return { success: true };
    },
    deleteUser: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        const perms = users[idx].permissions || [];
        if (perms.includes('master')) {
            return { success: false, message: '관리자 권한이 있는 회원은 삭제할 수 없습니다.' };
        }

        const session = authController.getSession();
        const prevStatus = getUserStatus(users[idx]);
        users[idx] = {
            ...users[idx],
            status: 'deleted',
            deletedAt: Date.now(),
            deletedById: session?.militaryId || '',
            deletedByName: session?.name || '',
            deletedPreviousStatus: prevStatus === 'deleted' ? (users[idx].deletedPreviousStatus || 'approved') : prevStatus,
        };
        await DB.save(DB_KEY, users);
        return { success: true };
    },

    restoreUser: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };
        if (getUserStatus(users[idx]) !== 'deleted') return { success: false, message: '삭제된 회원만 복원할 수 있습니다.' };

        const restoredStatus = ['approved', 'pending', 'rejected', 'suspended'].includes(users[idx].deletedPreviousStatus)
            ? users[idx].deletedPreviousStatus
            : 'approved';

        users[idx] = {
            ...users[idx],
            status: restoredStatus,
            deletedAt: undefined,
            deletedById: undefined,
            deletedByName: undefined,
            deletedPreviousStatus: undefined,
        };

        await DB.save(DB_KEY, users);
        return { success: true };
    },

    suspendUser: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        // 관리자(master)는 중지 불가
        const perms = users[idx].permissions || [];
        if (perms.includes('master')) {
            return { success: false, message: '관리자 권한이 있는 회원은 중지할 수 없습니다.' };
        }

        users[idx].status = 'suspended';
        await DB.save(DB_KEY, users);
        return { success: true };
    },

    unsuspendUser: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const idx = users.findIndex(u => u.militaryId === militaryId);
        if (idx === -1) return { success: false, message: '사용자를 찾을 수 없습니다.' };

        users[idx].status = 'approved';
        await DB.save(DB_KEY, users);
        return { success: true };
    },

    getUserPermissions: async (militaryId) => {
        const users = (await DB.get(DB_KEY)) || [];
        const user = users.find(u => u.militaryId === militaryId);
        if (!user) return [];
        return user.permissions || [];
    },

    // ========================================
    // 가입 방식 설정
    // ========================================
    getSignupMode: async () => {
        const mode = await DB.get(DB_KEY_SIGNUP_MODE);
        return mode || 'auto'; // 'auto' | 'approval'
    },

    setSignupMode: async (mode) => {
        await DB.save(DB_KEY_SIGNUP_MODE, mode);
        return { success: true };
    },

    // ========================================
    // 커스텀 권한 종류 관리
    // ========================================
    getPermissionTypes: async () => {
        const types = await DB.get(DB_KEY_PERMISSION_TYPES);
        // master는 항상 포함
        const defaults = [
            { id: 'master', label: '마스터', builtIn: true },
            { id: 'loginRequired', label: '로그인필요', builtIn: true },
        ];
        if (!types) return defaults;
        // merge: defaults first, then custom
        const customIds = new Set(defaults.map(d => d.id));
        return [...defaults, ...types.filter(t => !customIds.has(t.id))];
    },

    addPermissionType: async ({ id, label }) => {
        if (!id || !label) return { success: false, message: 'ID와 이름을 입력해주세요.' };
        if (id === 'master' || id === 'loginRequired') return { success: false, message: '기본 권한은 수정할 수 없습니다.' };

        let types = (await DB.get(DB_KEY_PERMISSION_TYPES)) || [];
        if (types.some(t => t.id === id)) {
            return { success: false, message: '이미 존재하는 권한 ID입니다.' };
        }

        types.push({ id, label });
        await DB.save(DB_KEY_PERMISSION_TYPES, types);
        return { success: true };
    },

    deletePermissionType: async (id) => {
        if (id === 'master' || id === 'loginRequired') return { success: false, message: '기본 권한은 삭제할 수 없습니다.' };

        let types = (await DB.get(DB_KEY_PERMISSION_TYPES)) || [];
        types = types.filter(t => t.id !== id);
        await DB.save(DB_KEY_PERMISSION_TYPES, types);
        return { success: true };
    },

    // ========================================
    // 기능별 권한 매핑
    // ========================================
    getFeaturePermissions: async () => {
        const saved = await DB.get(DB_KEY_FEATURE_PERMISSIONS);
        if (!saved) return JSON.parse(JSON.stringify(DEFAULT_FEATURE_MAP));

        // merge saved with defaults (add missing pages/features)
        const result = JSON.parse(JSON.stringify(DEFAULT_FEATURE_MAP));
        for (const pageId of Object.keys(result)) {
            if (saved[pageId]) {
                for (const featureId of Object.keys(result[pageId].features)) {
                    if (saved[pageId].features?.[featureId]) {
                        result[pageId].features[featureId].permissions =
                            saved[pageId].features[featureId].permissions || [];
                    }
                }
            }
        }
        return result;
    },

    setFeaturePermissions: async (map) => {
        const normalized = JSON.parse(JSON.stringify(map || {}));
        for (const [pageId, page] of Object.entries(normalized)) {
            if (!page?.features) continue;
            for (const [featureId, feature] of Object.entries(page.features)) {
                const perms = Array.isArray(feature?.permissions) ? [...new Set(feature.permissions)] : [];
                const filteredPerms = (pageId === 'home' && featureId === 'viewHome')
                    ? perms.filter(p => p !== 'master')
                    : perms;
                const hasAnyExceptLoginRequired = filteredPerms.some(p => p !== 'loginRequired');
                if (hasAnyExceptLoginRequired && !filteredPerms.includes('loginRequired')) {
                    filteredPerms.push('loginRequired');
                }
                feature.permissions = filteredPerms;
            }
        }
        await DB.save(DB_KEY_FEATURE_PERMISSIONS, normalized);
        return { success: true };
    },

    // ========================================
    // 기능별 권한 확인
    // ========================================
    /**
     * 현재 로그인 사용자가 특정 페이지/기능에 접근 가능한지 확인
     * @param {string} pageId   - DEFAULT_FEATURE_MAP의 최상위 키 (e.g. 'soldiers')
     * @param {string} featureId - features 하위 키 (e.g. 'manageSoldiers')
     * @returns {{ allowed: boolean }}
     */
    checkFeaturePermission: async (pageId, featureId) => {
        if (!(pageId === 'home' && featureId === 'viewHome')) {
            if (isBackupDB) return { allowed: false };
        }

        // feature map에서 필요 권한 먼저 조회
        const featureMap = await authController.getFeaturePermissions();
        const page = featureMap[pageId];
        if (!page) return { allowed: false };
        const feature = page.features?.[featureId];
        if (!feature) return { allowed: false };

        const requiredPerms = feature.permissions || [];
        const needLogin = requiredPerms.includes('loginRequired');
        const needMaster = requiredPerms.includes('master');
        const otherPerms = requiredPerms.filter(p => p !== 'loginRequired' && p !== 'master');

        // 1) 로그인필요 체크
        if (needLogin && !authController.isLoggedIn()) return { allowed: false };

        // 2) 별도 권한이 하나도 없고 로그인도 필요 없으면 누구나 허용
        if (!needMaster && otherPerms.length === 0) return { allowed: true };

        // 3) 권한 확인이 필요한 경우 사용자 로드
        const session = authController.getSession();
        if (!session) return { allowed: false };

        const users = (await DB.get(DB_KEY)) || [];
        const user = users.find(u => u.militaryId === session.militaryId);
        if (!user) return { allowed: false };
        if (isBlockedUserStatus(getUserStatus(user))) return { allowed: false };

        const userPerms = user.permissions || [];
        const isMasterUser = userPerms.includes('master');

        // 4) master 체크된 경우: 반드시 master 필요
        if (needMaster && !isMasterUser) return { allowed: false };

        // 5) 그 외 권한이 없으면 (master/login 검증 통과 시) 허용
        if (otherPerms.length === 0) return { allowed: true };

        // 6) 그 외 권한은 OR 조건
        if (isMasterUser) return { allowed: true };
        return { allowed: otherPerms.some(p => userPerms.includes(p)) };
    },

    // ========================================
    // 근무일정표 달력 편집 상세 권한 (제한 설정)
    // ========================================
    getScheduleRestrictions: async () => {
        const saved = await DB.get(DB_KEY_SCHEDULE_RESTRICTIONS);
        return saved ? normalizeScheduleRestrictions(saved) : {
            editablePeriodEnabled: false,
            editablePeriodStart: '',
            editablePeriodEnd: '',
            editablePeriodExceptionPermissions: [],
            pastDayLockEnabled: false,
            pastDayLockExceptionPermissions: [],
        };
    },

    setScheduleRestrictions: async (restrictions) => {
        await DB.save(DB_KEY_SCHEDULE_RESTRICTIONS, normalizeScheduleRestrictions(restrictions));
        return { success: true };
    },
};
