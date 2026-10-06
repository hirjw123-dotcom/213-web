import DB from '../@modules/db.js';
import { combatLeaveController } from './combatLeaveController.js';
import { dutyReplacementController, getAssignedScheduleLabelsForSoldierDay, getEffectiveScheduleLabelsForSoldierDay } from './dutyReplacementController.js';
import { scheduleTypesController } from './soldierScheduleTypesController.js';

// 스케줄 데이터 키 생성 (년-월 형식)
const _getScheduleKey = (y, m) => `schedules_${y}_${m}`;

const getConditionCheckDate = (y, m, d, dayType) => {
    const checkDate = new Date(y, m - 1, d);
    if (dayType === '어제') {
        checkDate.setDate(checkDate.getDate() - 1);
    }
    return checkDate;
};

export const isConditionMonthMatched = (monthType, checkDate) => {
    const checkMonth = checkDate.getMonth() + 1;
    if (monthType === '홀수달') return checkMonth % 2 === 1;
    if (monthType === '짝수달') return checkMonth % 2 === 0;
    return true;
};

export const matchesConditionScheduleType = (schedules, scheduleType) => {
    if (!Array.isArray(schedules) || schedules.length === 0 || !scheduleType) return false;
    return schedules.includes(scheduleType);
};

export const matchesGeunchwiConditionScheduleType = (schedules, scheduleType) => {
    if (!Array.isArray(schedules) || schedules.length === 0 || !scheduleType) return false;
    return schedules.includes(scheduleType);
};

const buildEffectiveScheduleLabels = ({ allSchedules, dutyReplacements, soldierId, day, includeIncoming = true }) => {
    const baseSchedules = allSchedules || {};
    if (includeIncoming) {
        return getEffectiveScheduleLabelsForSoldierDay(baseSchedules, dutyReplacements || {}, soldierId, day);
    }
    return getAssignedScheduleLabelsForSoldierDay(baseSchedules, dutyReplacements || {}, soldierId, day);
};

const appendCombatLeaveLabel = (schedules, combatLeaveEntry) => {
    if (!combatLeaveEntry?.type || combatLeaveEntry.status !== 'approved') return schedules;
    if (schedules.includes(combatLeaveEntry.type)) return schedules;
    return [combatLeaveEntry.type, ...schedules];
};

const EXTRA_EXCLUDED_REASON_LABELS = new Set(['근취']);

const getScheduleLabelsFromLoadedMonthData = ({ allSchedulesByMonth, dutyReplacementsByMonth, combatLeaveByMonth, soldierId, y, m, d }) => {
    const monthKey = `${y}_${m}`;
    return appendCombatLeaveLabel(buildEffectiveScheduleLabels({
        allSchedules: allSchedulesByMonth?.[monthKey] || {},
        dutyReplacements: dutyReplacementsByMonth?.[monthKey] || {},
        soldierId,
        day: d,
        includeIncoming: true,
    }), combatLeaveByMonth?.[monthKey]?.[soldierId]?.[d]);
};

export const isSoldierGeunchwiFromLoadedData = ({
    soldierId,
    y,
    m,
    d,
    conditions = [],
    allSchedulesByMonth,
    dutyReplacementsByMonth,
    combatLeaveByMonth,
}) => {
    for (const cond of conditions) {
        const checkDate = getConditionCheckDate(y, m, d, cond.day);
        if (!isConditionMonthMatched(cond.monthType, checkDate)) continue;

        const checkY = checkDate.getFullYear();
        const checkM = checkDate.getMonth() + 1;
        const checkD = checkDate.getDate();
        const schedules = getScheduleLabelsFromLoadedMonthData({
            allSchedulesByMonth,
            dutyReplacementsByMonth,
            combatLeaveByMonth,
            soldierId,
            y: checkY,
            m: checkM,
            d: checkD,
        });

        if (matchesGeunchwiConditionScheduleType(schedules, cond.scheduleType)) {
            return true;
        }
    }

    return false;
};

export const getExtraExcludedReasonLabels = (reasonLabels = []) => {
    if (!Array.isArray(reasonLabels) || reasonLabels.length === 0) return [];
    return [...new Set(reasonLabels.filter((label) => EXTRA_EXCLUDED_REASON_LABELS.has(label)))];
};

export const getDisplayExcludedReasonLabelsFromLoadedData = ({
    soldierId,
    y,
    m,
    d,
    matchedReasonLabels = [],
    allSchedulesByMonth,
    dutyReplacementsByMonth,
    combatLeaveByMonth,
}) => {
    const todayLabels = getScheduleLabelsFromLoadedMonthData({
        allSchedulesByMonth,
        dutyReplacementsByMonth,
        combatLeaveByMonth,
        soldierId,
        y,
        m,
        d,
    });
    const extraLabels = getExtraExcludedReasonLabels(matchedReasonLabels)
        .filter((label) => !todayLabels.includes(label));

    return [...extraLabels, ...todayLabels];
};

// 용사 스케줄 관리 컨트롤러
export const soldierSchedulesController = {
    /**
     * 용사 스케줄 조회
     * @param {object} options - 조회 옵션
     * @param {string} [options.soldierId] - 용사 ID (선택)
     * @param {number} [options.y] - 년도 (선택)
     * @param {number} [options.m] - 월 (선택)
     * @param {number} [options.d] - 일 (선택)
     */
    getSoldierSchedules: async ({ soldierId, y, m, d } = {}) => {
        // 년, 월이 지정되지 않으면 현재 날짜 사용
        const now = new Date();
        const year = y ?? now.getFullYear();
        const month = m ?? (now.getMonth() + 1);

        const key = _getScheduleKey(year, month);
        const allSchedules = (await DB.get(key)) || {};

        // 특정 용사의 스케줄만 조회
        if (soldierId) {
            const soldierSchedules = allSchedules[soldierId] || {};
            // 특정 일자만 조회
            if (d) {
                return soldierSchedules[d] || [];
            }
            return soldierSchedules;
        }

        // 특정 일자의 모든 용사 스케줄 조회
        if (d) {
            const result = {};
            for (const sid in allSchedules) {
                if (allSchedules[sid][d]) {
                    result[sid] = allSchedules[sid][d];
                }
            }
            return result;
        }

        return allSchedules;
    },

    /**
     * 부대 스케줄 조회
     * @param {object} options - 조회 옵션
     * @param {string} [options.unitId] - 중대 ID (선택)
     * @param {number} [options.y] - 년도 (선택)
     * @param {number} [options.m] - 월 (선택)
     * @param {number} [options.d] - 일 (선택)
     */
    getUnitSchedules: async ({ unitId, y, m, d } = {}) => {
        const now = new Date();
        const year = y ?? now.getFullYear();
        const month = m ?? (now.getMonth() + 1);

        const key = _getScheduleKey(year, month);
        const allSchedules = (await DB.get(key)) || {};

        // unitId가 없으면 전체 반환
        if (!unitId) {
            if (d) {
                const result = {};
                for (const sid in allSchedules) {
                    if (allSchedules[sid][d]) {
                        result[sid] = allSchedules[sid][d];
                    }
                }
                return result;
            }
            return allSchedules;
        }

        // TODO: unitId 기반 필터링 - soldiers 데이터와 조인 필요
        // 현재는 전체 반환
        return allSchedules;
    },

    /**
     * 스케줄 추가/수정
     * @param {object} options - 추가 옵션
     * @param {string} options.soldierId - 용사 ID
     * @param {number} options.y - 년도
     * @param {number} options.m - 월
     * @param {number} options.d - 일
     * @param {string} options.scheduleLabel - 스케줄 타입 라벨
     */
    add: async ({ soldierId, y, m, d, scheduleLabel }) => {
        if (!soldierId || !y || !m || !d || !scheduleLabel) {
            return false;
        }

        const key = _getScheduleKey(y, m);
        const allSchedules = (await DB.get(key)) || {};

        // 용사 스케줄 초기화
        if (!allSchedules[soldierId]) {
            allSchedules[soldierId] = {};
        }
        if (!allSchedules[soldierId][d]) {
            allSchedules[soldierId][d] = [];
        }

        // 중복 체크 후 추가
        if (!allSchedules[soldierId][d].includes(scheduleLabel)) {
            allSchedules[soldierId][d].push(scheduleLabel);
        }

        await DB.save(key, allSchedules);
        return true;
    },

    /**
     * 스케줄 삭제
     * @param {object} options - 삭제 옵션
     * @param {string} options.soldierId - 용사 ID
     * @param {number} options.y - 년도
     * @param {number} options.m - 월
     * @param {number} options.d - 일
     * @param {string} [options.scheduleLabel] - 스케줄 타입 라벨 (없으면 해당 일자 전체 삭제)
     */
    remove: async ({ soldierId, y, m, d, scheduleLabel }) => {
        if (!soldierId || !y || !m || !d) {
            return false;
        }

        const key = _getScheduleKey(y, m);
        const allSchedules = (await DB.get(key)) || {};

        if (!allSchedules[soldierId] || !allSchedules[soldierId][d]) {
            return false;
        }

        if (scheduleLabel) {
            // 특정 스케줄만 삭제
            const index = allSchedules[soldierId][d].indexOf(scheduleLabel);
            if (index > -1) {
                allSchedules[soldierId][d].splice(index, 1);
            }
        } else {
            // 해당 일자 전체 삭제
            delete allSchedules[soldierId][d];
        }

        await DB.save(key, allSchedules);
        return true;
    },

    /**
     * 여러 셀의 스케줄을 한 번에 덮어쓰기
     * @param {object} options
     * @param {number} options.y - 년도
     * @param {number} options.m - 월
     * @param {Array<{soldierId: string, d: number, labels: string[]}>} options.cells - 셀 목록
     */
    setCells: async ({ y, m, cells = [] } = {}) => {
        if (!y || !m || !Array.isArray(cells)) return false;

        const key = _getScheduleKey(y, m);
        const allSchedules = (await DB.get(key)) || {};

        for (const cell of cells) {
            const soldierId = cell?.soldierId;
            const day = cell?.d;
            if (!soldierId || !day) continue;

            if (!allSchedules[soldierId]) allSchedules[soldierId] = {};

            const labels = Array.isArray(cell.labels)
                ? [...new Set(cell.labels.filter(Boolean))]
                : [];

            if (labels.length > 0) {
                allSchedules[soldierId][day] = labels;
            } else {
                delete allSchedules[soldierId][day];
            }

            if (Object.keys(allSchedules[soldierId]).length === 0) {
                delete allSchedules[soldierId];
            }
        }

        await DB.save(key, allSchedules);
        return true;
    },
};


// ============================================
// 근취 조건 관리
// ============================================
const DEFAULT_근취_CONDITIONS = [
    { monthType: '전체', day: '어제', scheduleType: '야평' },
    { monthType: '전체', day: '어제', scheduleType: '야주' },
    // { monthType: '전체', day: '어제', scheduleType: '주평' },
    // { monthType: '전체', day: '어제', scheduleType: '주주' },
    { monthType: '전체', day: '어제', scheduleType: '야당' },
    { monthType: '홀수달', day: '어제', scheduleType: '평' },
    { monthType: '홀수달', day: '어제', scheduleType: '주' },
    { monthType: '홀수달', day: '어제', scheduleType: '훈' },
];
/*
    monthType: '전체' | '홀수달' | '짝수달'
    day: '오늘' | '어제'
    scheduleType: 스케줄 타입 라벨들(근취 포함)(평, 주, 훈, 야평, 주평, 야주, 주주, 야당 을 앞쪽에 둔다.)
*/
const 근취ConditionsKey = '근취Conditions-2';
export const 근취Conditions = {
    get: async () => {
        const list = await DB.get(근취ConditionsKey);
        if (list && list.length > 0) return list;
        // await DB.save(근취ConditionsKey, DEFAULT_근취_CONDITIONS);
        return [...DEFAULT_근취_CONDITIONS];
    },

    update: async (index, data) => {
        const list = await 근취Conditions.get();
        if (index < 0 || index >= list.length) return false;
        list[index] = { ...list[index], ...data };
        await DB.save(근취ConditionsKey, list);
        return true;
    },

    delete: async (index) => {
        const list = await 근취Conditions.get();
        if (index < 0 || index >= list.length) return false;
        list.splice(index, 1);
        await DB.save(근취ConditionsKey, list);
        return true;
    },

    add: async (data) => {
        const list = await 근취Conditions.get();
        const newCondition = {
            monthType: data.monthType || '전체',
            day: data.day || '오늘',
            scheduleType: data.scheduleType || '',
        };
        list.push(newCondition);
        await DB.save(근취ConditionsKey, list);
        return newCondition;
    },

    /**
     * 특정 용사가 특정 날짜에 근취인지 확인
     * @param {string} soldierId - 용사 ID
     * @param {number} y - 년도
     * @param {number} m - 월
     * @param {number} d - 일
     */
    isSoldier근취: async (soldierId, y, m, d) => {
        const conditions = await 근취Conditions.get();
        const scheduleCache = new Map();
        const dutyReplacementCache = new Map();

        const getSchedulesCached = async (checkY, checkM) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!scheduleCache.has(cacheKey)) {
                scheduleCache.set(cacheKey, await soldierSchedulesController.getSoldierSchedules({ y: checkY, m: checkM }));
            }
            return scheduleCache.get(cacheKey);
        };

        const getDutyReplacementsCached = async (checkY, checkM, allSchedules) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!dutyReplacementCache.has(cacheKey)) {
                dutyReplacementCache.set(cacheKey, await dutyReplacementController.get(checkY, checkM, { monthSchedules: allSchedules }));
            }
            return dutyReplacementCache.get(cacheKey);
        };

        for (const cond of conditions) {
            const checkDate = getConditionCheckDate(y, m, d, cond.day);
            if (!isConditionMonthMatched(cond.monthType, checkDate)) continue;

            const checkY = checkDate.getFullYear();
            const checkM = checkDate.getMonth() + 1;
            const checkD = checkDate.getDate();

            const monthSchedules = await getSchedulesCached(checkY, checkM);
            const dutyReplacements = await getDutyReplacementsCached(checkY, checkM, monthSchedules);
            const schedules = buildEffectiveScheduleLabels({
                allSchedules: monthSchedules,
                dutyReplacements,
                soldierId,
                day: checkD,
                includeIncoming: true,
            });

            if (matchesGeunchwiConditionScheduleType(schedules, cond.scheduleType)) {
                return true;
            }
        }

        return false;
    },
};

// ============================================
// 열외 조건 관리
// ============================================
/*
    monthType: '전체' | '홀수달' | '짝수달'
    day: '오늘' | '어제'
    scheduleType: 스케줄 타입 라벨들(근취 포함)(근취, 검진, 외진, 식, 전휴, 휴, 출, 박 을 앞쪽으로 둔다.)
*/
const DEFAULT_열외_CONDITIONS = [
    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '주당' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '주당' },
    { monthType: '전체', day: '오늘', timeSlot: '저녁일과', scheduleType: '야당' },


    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '근취' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '근취' },

    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '검진' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '검진' },

    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '외진' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '외진' },

    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '식' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '식' },
    { monthType: '전체', day: '오늘', timeSlot: '저녁일과', scheduleType: '식' },


    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '파' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '파' },
    { monthType: '전체', day: '오늘', timeSlot: '저녁일과', scheduleType: '파' },

    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '반투' },

    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '전휴' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '전휴' },

    { monthType: '전체', day: '오늘', timeSlot: '오전', scheduleType: '휴' },
    { monthType: '전체', day: '오늘', timeSlot: '오후', scheduleType: '휴' },
    { monthType: '전체', day: '오늘', timeSlot: '저녁일과', scheduleType: '휴' },


    { monthType: '전체', day: '오늘', timeSlot: '저녁일과', scheduleType: '평출' },
    { monthType: '전체', day: '오늘', timeSlot: '전체', scheduleType: '출' },
    { monthType: '전체', day: '오늘', timeSlot: '전체', scheduleType: '박' },

    { monthType: '짝수달', day: '오늘', timeSlot: '전체', scheduleType: '평' },
    { monthType: '짝수달', day: '오늘', timeSlot: '전체', scheduleType: '주' },
    { monthType: '짝수달', day: '오늘', timeSlot: '전체', scheduleType: '훈' },



    // { monthType: '전체', day: '오늘', scheduleType: '근취' },
    // { monthType: '전체', day: '오늘', scheduleType: '검진' },
    // { monthType: '전체', day: '오늘', scheduleType: '외진' },
    // { monthType: '전체', day: '오늘', scheduleType: '식' },
    // { monthType: '전체', day: '오늘', scheduleType: '파' },
    // { monthType: '전체', day: '오늘', scheduleType: '전휴' },
    // { monthType: '전체', day: '오늘', scheduleType: '휴' },
    // { monthType: '전체', day: '오늘', scheduleType: '출' },
    // { monthType: '전체', day: '오늘', scheduleType: '박' },
];

const 열외ConditionsKey = '열외Conditions-3';
const DEFAULT_열외_TIME_SLOTS = ['오전', '오후', '저녁일과'];

const normalize열외TimeSlot = (value) => {
    if (value === '오전' || value === '오후' || value === '저녁일과') return value;
    return '전체';
};

const normalizeRequested열외TimeSlots = (timeSlots) => {
    if (timeSlots === undefined || timeSlots === null) return [...DEFAULT_열외_TIME_SLOTS];

    const values = Array.isArray(timeSlots) ? timeSlots : [timeSlots];
    const normalized = [...new Set(values
        .map((value) => value === '야간' ? '저녁일과' : value)
        .map((value) => normalize열외TimeSlot(value))
        .filter((value) => value !== '전체'))];

    return normalized.length > 0 ? normalized : [...DEFAULT_열외_TIME_SLOTS];
};

const is열외TimeSlotMatched = (conditionTimeSlot, requestedTimeSlots) => {
    const normalizedCondition = normalize열외TimeSlot(conditionTimeSlot);
    if (normalizedCondition === '전체') return true;
    return requestedTimeSlots.includes(normalizedCondition);
};

export const 열외Conditions = {
    get: async () => {
        const list = await DB.get(열외ConditionsKey);
        if (list && list.length > 0) {
            return list.map((item) => ({ ...item, timeSlot: normalize열외TimeSlot(item.timeSlot) }));
        }
        // await DB.save(열외ConditionsKey, DEFAULT_열외_CONDITIONS);
        return DEFAULT_열외_CONDITIONS.map((item) => ({ ...item, timeSlot: normalize열외TimeSlot(item.timeSlot) }));
    },

    update: async (index, data) => {
        const list = await 열외Conditions.get();
        if (index < 0 || index >= list.length) return false;
        list[index] = {
            ...list[index],
            ...data,
            timeSlot: normalize열외TimeSlot(data.timeSlot ?? list[index].timeSlot),
        };
        await DB.save(열외ConditionsKey, list);
        return true;
    },

    delete: async (index) => {
        const list = await 열외Conditions.get();
        if (index < 0 || index >= list.length) return false;
        list.splice(index, 1);
        await DB.save(열외ConditionsKey, list);
        return true;
    },

    add: async (data) => {
        const list = await 열외Conditions.get();
        const newCondition = {
            monthType: data.monthType || '전체',
            day: data.day || '오늘',
            timeSlot: normalize열외TimeSlot(data.timeSlot),
            scheduleType: data.scheduleType || '',
        };
        list.push(newCondition);
        await DB.save(열외ConditionsKey, list);
        return newCondition;
    },

    /**
     * 특정 용사가 특정 날짜에 열외인지 확인
     * @param {string} soldierId - 용사 ID
     * @param {number} y - 년도
     * @param {number} m - 월
     * @param {number} d - 일
     */
    isSoldier열외: async (soldierId, y, m, d, timeSlots) => {
        const conditions = await 열외Conditions.get();
        const requestedTimeSlots = normalizeRequested열외TimeSlots(timeSlots);
        const monthScheduleCache = new Map();
        const dutyReplacementCache = new Map();
        const combatLeaveCache = new Map();

        const getMonthSchedulesCached = async (checkY, checkM) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!monthScheduleCache.has(cacheKey)) {
                monthScheduleCache.set(cacheKey, await soldierSchedulesController.getSoldierSchedules({ y: checkY, m: checkM }));
            }
            return monthScheduleCache.get(cacheKey);
        };

        const getDutyReplacementsCached = async (checkY, checkM, monthSchedules) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!dutyReplacementCache.has(cacheKey)) {
                dutyReplacementCache.set(cacheKey, await dutyReplacementController.get(checkY, checkM, { monthSchedules }));
            }
            return dutyReplacementCache.get(cacheKey);
        };

        const getCombatLeaveCached = async (checkY, checkM) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!combatLeaveCache.has(cacheKey)) {
                combatLeaveCache.set(cacheKey, await combatLeaveController.getAll(checkY, checkM));
            }
            return combatLeaveCache.get(cacheKey);
        };

        for (const cond of conditions) {
            if (!is열외TimeSlotMatched(cond.timeSlot, requestedTimeSlots)) continue;

            const checkDate = getConditionCheckDate(y, m, d, cond.day);
            if (!isConditionMonthMatched(cond.monthType, checkDate)) continue;

            const checkY = checkDate.getFullYear();
            const checkM = checkDate.getMonth() + 1;
            const checkD = checkDate.getDate();

            // 근취 조건 확인 (scheduleType이 '근취'인 경우)
            if (cond.scheduleType === '근취') {
                const is근취 = await 근취Conditions.isSoldier근취(soldierId, y, m, d);
                if (is근취) return true;
                continue;
            }

            const monthSchedules = await getMonthSchedulesCached(checkY, checkM);
            const dutyReplacements = await getDutyReplacementsCached(checkY, checkM, monthSchedules);
            const monthCombatLeave = await getCombatLeaveCached(checkY, checkM);
            const schedules = appendCombatLeaveLabel(buildEffectiveScheduleLabels({
                allSchedules: monthSchedules,
                dutyReplacements,
                soldierId,
                day: checkD,
                includeIncoming: true,
            }), monthCombatLeave?.[soldierId]?.[checkD]);

            if (matchesConditionScheduleType(schedules, cond.scheduleType)) {
                return true;
            }
        }

        return false;
    },
    /**
     * 특정 용사가 특정 날짜에 열외인 사유(일정 라벨) 목록 반환
     * @param {string} soldierId - 용사 ID
     * @param {number} y - 년도
     * @param {number} m - 월
     * @param {number} d - 일
     * @returns {Promise<string[]>} 열외 사유 라벨 배열 (빈 배열이면 열외 아님)
     */
    get열외Reasons: async (soldierId, y, m, d, timeSlots) => {
        const conditions = await 열외Conditions.get();
        const reasons = [];
        const requestedTimeSlots = normalizeRequested열외TimeSlots(timeSlots);

        const scheduleCache = new Map();
        const dutyReplacementCache = new Map();
        const combatLeaveCache = new Map();
        const getSchedulesCached = async (checkY, checkM) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!scheduleCache.has(cacheKey)) {
                const result = await soldierSchedulesController.getSoldierSchedules({ y: checkY, m: checkM });
                scheduleCache.set(cacheKey, result);
            }
            return scheduleCache.get(cacheKey);
        };
        const getDutyReplacementsCached = async (checkY, checkM, monthSchedules) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!dutyReplacementCache.has(cacheKey)) {
                dutyReplacementCache.set(cacheKey, await dutyReplacementController.get(checkY, checkM, { monthSchedules }));
            }
            return dutyReplacementCache.get(cacheKey);
        };
        const getCombatLeaveCached = async (checkY, checkM) => {
            const cacheKey = `${checkY}_${checkM}`;
            if (!combatLeaveCache.has(cacheKey)) {
                combatLeaveCache.set(cacheKey, await combatLeaveController.getAll(checkY, checkM));
            }
            return combatLeaveCache.get(cacheKey);
        };

        // 근취 확인은 한번만 (여러 조건에서 중복 확인 방지)
        let 근취Checked = false;
        let is근취 = false;

        for (const cond of conditions) {
            if (!is열외TimeSlotMatched(cond.timeSlot, requestedTimeSlots)) continue;

            const checkDate = getConditionCheckDate(y, m, d, cond.day);
            if (!isConditionMonthMatched(cond.monthType, checkDate)) continue;

            const checkY = checkDate.getFullYear();
            const checkM = checkDate.getMonth() + 1;
            const checkD = checkDate.getDate();

            // 근취 조건 확인 (근취는 스케줄 라벨이 아닌 근취Conditions로 계산)
            if (cond.scheduleType === '근취') {
                if (!근취Checked) {
                    is근취 = await 근취Conditions.isSoldier근취(soldierId, y, m, d);
                    근취Checked = true;
                }
                if (is근취 && !reasons.includes('근취')) reasons.push('근취');
                continue;
            }

            // 해당 날짜의 스케줄 확인 (캐시 사용)
            const monthSchedules = await getSchedulesCached(checkY, checkM);
            const dutyReplacements = await getDutyReplacementsCached(checkY, checkM, monthSchedules);
            const monthCombatLeave = await getCombatLeaveCached(checkY, checkM);
            const schedules = appendCombatLeaveLabel(buildEffectiveScheduleLabels({
                allSchedules: monthSchedules,
                dutyReplacements,
                soldierId,
                day: checkD,
                includeIncoming: true,
            }), monthCombatLeave?.[soldierId]?.[checkD]);

            if (matchesConditionScheduleType(schedules, cond.scheduleType)) {
                if (!reasons.includes(cond.scheduleType)) reasons.push(cond.scheduleType);
            }
        }

        return reasons;
    },

    getDisplayReasonLabels: async (soldierId, y, m, d, timeSlots) => {
        const matchedReasonLabels = await 열외Conditions.get열외Reasons(soldierId, y, m, d, timeSlots);
        if (matchedReasonLabels.length === 0) return [];

        const [monthSchedules, dutyReplacements, monthCombatLeave] = await Promise.all([
            soldierSchedulesController.getSoldierSchedules({ y, m }),
            dutyReplacementController.get(y, m),
            combatLeaveController.getAll(y, m),
        ]);

        return getDisplayExcludedReasonLabelsFromLoadedData({
            soldierId,
            y,
            m,
            d,
            matchedReasonLabels,
            allSchedulesByMonth: { [`${y}_${m}`]: monthSchedules || {} },
            dutyReplacementsByMonth: { [`${y}_${m}`]: dutyReplacements || {} },
            combatLeaveByMonth: { [`${y}_${m}`]: monthCombatLeave || {} },
        });
    },
};