import DB from '../@modules/db.js';

const COMBAT_LEAVE_TYPES = new Set(['전휴', '반투']);

// DB Key: combatLeave_{year}_{month}
// Data structure:
// {
//   [soldierId]: {
//     [day]: {
//       type: '전휴' | '반투',
//       reason: string,
//       status: 'pending' | 'approved',
//       approver: string | null,       // 승인자 이름
//       approverId: string | null,     // 승인자 militaryId
//       approvedAt: number | null,     // 승인 시각 (timestamp)
//       createdAt: number,
//       createdBy: string,             // 등록자 이름
//       createdById: string,           // 등록자 militaryId
//     }
//   }
// }

const _getKey = (y, m) => `combatLeave_${y}_${m}`;

export const combatLeaveController = {
    /**
     * 특정 월의 전투휴무 데이터 전체 가져오기
     */
    getAll: async (y, m) => {
        return (await DB.get(_getKey(y, m))) || {};
    },

    /**
     * 특정 용사의 특정 날짜 전투휴무 조회
     */
    get: async (y, m, soldierId, day) => {
        const all = await combatLeaveController.getAll(y, m);
        return all[soldierId]?.[day] || null;
    },

    /**
     * 전투휴무 등록
     */
    register: async ({ y, m, soldierId, day, type, reason, createdBy, createdById }) => {
        if (!y || !m || !soldierId || !day || !type) return { success: false, message: '필수 항목이 누락되었습니다.' };
        if (!COMBAT_LEAVE_TYPES.has(type)) return { success: false, message: '유효하지 않은 휴무 유형입니다.' };

        const key = _getKey(y, m);
        const all = (await DB.get(key)) || {};
        const existingEntry = all[soldierId]?.[day] || null;

        if (existingEntry?.status === 'approved') {
            return { success: false, message: '승인된 휴무는 덮어쓸 수 없습니다.' };
        }

        if (!all[soldierId]) all[soldierId] = {};
        all[soldierId][day] = {
            type,
            reason: reason || '',
            status: 'pending',
            approver: null,
            approverId: null,
            approvedAt: null,
            createdAt: Date.now(),
            createdBy: createdBy || '',
            createdById: createdById || '',
        };

        await DB.save(key, all);
        return { success: true };
    },

    /**
     * 전투휴무 제거 (승인 대기 상태에서만 가능)
     * 동기화 문제 방지를 위해 삭제 시 DB를 실시간 조회
     */
    remove: async ({ y, m, soldierId, day, force = false }) => {
        const key = _getKey(y, m);
        // 실시간 DB 조회 (동기화 문제 방지)
        const all = (await DB.get(key)) || {};

        const entry = all[soldierId]?.[day];
        if (!entry) return { success: false, message: '등록된 휴무가 없습니다.' };
        if (!force) {
            if (entry.status === 'approved') return { success: false, message: '승인된 휴무는 삭제할 수 없습니다.' };
        }

        delete all[soldierId][day];
        if (Object.keys(all[soldierId]).length === 0) {
            delete all[soldierId];
        }

        await DB.save(key, all);
        return { success: true };
    },

    removePending: async ({ y, m, soldierId, day }) => {
        return combatLeaveController.remove({ y, m, soldierId, day, force: false });
    },

    toggleType: async ({ y, m, soldierId, day }) => {
        const key = _getKey(y, m);
        const all = (await DB.get(key)) || {};
        const entry = all[soldierId]?.[day];

        if (!entry) return { success: false, message: '등록된 휴무가 없습니다.' };
        if (!COMBAT_LEAVE_TYPES.has(entry.type)) return { success: false, message: '전환할 수 없는 휴무 유형입니다.' };

        const nextType = entry.type === '전휴' ? '반투' : '전휴';
        all[soldierId][day] = {
            ...entry,
            type: nextType,
        };

        await DB.save(key, all);
        return { success: true, type: nextType };
    },

    /**
     * 전투휴무 승인
     * 동기화 문제 방지를 위해 승인 시 DB를 실시간 조회
     */
    approve: async ({ y, m, soldierId, day, approver, approverId }) => {
        const key = _getKey(y, m);
        // 실시간 DB 조회 (동기화 문제 방지)
        const all = (await DB.get(key)) || {};

        const entry = all[soldierId]?.[day];
        if (!entry) return { success: false, message: '등록된 휴무가 없습니다.' };
        if (entry.status === 'approved') return { success: false, message: '이미 승인된 휴무입니다.' };

        all[soldierId][day] = {
            ...entry,
            status: 'approved',
            approver: approver || '',
            approverId: approverId || '',
            approvedAt: Date.now(),
        };

        await DB.save(key, all);
        return { success: true };
    },

    /**
     * 특정 날짜의 승인된 휴무자 목록
     */
    getApprovedForDay: async (y, m, day) => {
        const all = await combatLeaveController.getAll(y, m);
        const results = [];
        for (const [soldierId, days] of Object.entries(all)) {
            const entry = days[day];
            if (entry && entry.status === 'approved') {
                results.push({ soldierId, ...entry });
            }
        }
        return results;
    },

    /**
     * 특정 날짜의 승인 대기 휴무자 목록
     */
    getPendingForDay: async (y, m, day) => {
        const all = await combatLeaveController.getAll(y, m);
        const results = [];
        for (const [soldierId, days] of Object.entries(all)) {
            const entry = days[day];
            if (entry && entry.status === 'pending') {
                results.push({ soldierId, ...entry });
            }
        }
        return results;
    },

    /**
     * 이번 달 전체 승인 대기 목록
     */
    getAllPending: async (y, m) => {
        const all = await combatLeaveController.getAll(y, m);
        const results = [];
        for (const [soldierId, days] of Object.entries(all)) {
            for (const [day, entry] of Object.entries(days)) {
                if (entry.status === 'pending') {
                    results.push({ soldierId, day: Number(day), ...entry });
                }
            }
        }
        return results;
    },

    /**
     * 이번 달 전체 승인됨 목록
     */
    getAllApproved: async (y, m) => {
        const all = await combatLeaveController.getAll(y, m);
        const results = [];
        for (const [soldierId, days] of Object.entries(all)) {
            for (const [day, entry] of Object.entries(days)) {
                if (entry.status === 'approved') {
                    results.push({ soldierId, day: Number(day), ...entry });
                }
            }
        }
        return results;
    },

    /**
     * 용사별 전휴/반투 카운트
     */
    getSoldierCounts: async (y, m, soldierId) => {
        const all = await combatLeaveController.getAll(y, m);
        const soldierData = all[soldierId] || {};
        let 전휴 = 0;
        let 반투 = 0;
        for (const entry of Object.values(soldierData)) {
            if (entry.type === '전휴') 전휴++;
            else if (entry.type === '반투') 반투++;
        }
        return { 전휴, 반투, 휴무: 전휴 + 반투 };
    },
};
