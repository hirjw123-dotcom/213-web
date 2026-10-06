import DB from '../@modules/db.js';

// 근무 편성 관리 컨트롤러
// 키: dutyComposition_{y}_{m}
// 값: {
//   total: { weekday: 0, weekend: 0, guard: 0 },       // 총 근무편성 (평, 주, 불)
//   soldiers: { [soldierId]: { weekday: 0, weekend: 0, guard: 0 } }  // 용사별 편성
// }

const _getKey = (y, m) => `dutyComposition_${y}_${m}`;

const normalizeAssignedValue = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return 0;
    return Math.floor(num);
};

const normalizeFixedValue = (value) => {
    if (value === '-') return '-';
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return '-';
    return Math.floor(num);
};

const normalizeSoldierValues = (values = {}) => ({
    weekday: normalizeAssignedValue(values.weekday),
    weekend: normalizeAssignedValue(values.weekend),
    guard: normalizeAssignedValue(values.guard),
    fixedWeekday: normalizeFixedValue(values.fixedWeekday),
    fixedWeekend: normalizeFixedValue(values.fixedWeekend),
    fixedGuard: normalizeFixedValue(values.fixedGuard),
});

const normalizeTotalValues = (total = {}) => ({
    weekday: normalizeAssignedValue(total.weekday),
    weekend: normalizeAssignedValue(total.weekend),
    guard: normalizeAssignedValue(total.guard),
});

export const normalizeDutyCompositionData = (data = {}) => {
    const soldiers = {};
    for (const [soldierId, values] of Object.entries(data.soldiers || {})) {
        soldiers[soldierId] = normalizeSoldierValues(values);
    }

    return {
        total: normalizeTotalValues(data.total),
        soldiers,
    };
};

const _getDefault = () => normalizeDutyCompositionData({
    total: { weekday: 0, weekend: 0, guard: 0 },
    soldiers: {},
});

export const dutyCompositionController = {
    get: async (y, m) => {
        const data = await DB.get(_getKey(y, m));
        return data ? normalizeDutyCompositionData(data) : _getDefault();
    },

    save: async (y, m, data) => {
        await DB.save(_getKey(y, m), normalizeDutyCompositionData(data));
    },

    // 총 근무편성 저장
    saveTotal: async (y, m, total) => {
        const data = await DB.get(_getKey(y, m)) || _getDefault();
        data.total = normalizeTotalValues(total);
        await DB.save(_getKey(y, m), normalizeDutyCompositionData(data));
    },

    // 개별 용사 편성 저장
    saveSoldier: async (y, m, soldierId, values) => {
        const data = await DB.get(_getKey(y, m)) || _getDefault();
        if (!data.soldiers) data.soldiers = {};
        data.soldiers[soldierId] = normalizeSoldierValues(values);
        await DB.save(_getKey(y, m), normalizeDutyCompositionData(data));
    },

    // 저장된 모든 월 목록 반환 [{year, month, data}]
    listAll: async () => {
        const allKeys = await DB.getAllKeys();
        const prefix = 'dutyComposition_';
        const months = [];
        for (const key of allKeys) {
            if (typeof key === 'string' && key.startsWith(prefix)) {
                const parts = key.replace(prefix, '').split('_');
                if (parts.length === 2) {
                    const y = Number(parts[0]);
                    const m = Number(parts[1]);
                    if (y && m) {
                        const data = await DB.get(key);
                        if (data) months.push({ year: y, month: m, data });
                    }
                }
            }
        }
        // 최신순 정렬
        months.sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
        months.length = Math.min(months.length, 12); // 최대 12개월치만 반환
        return months;
    },
};
