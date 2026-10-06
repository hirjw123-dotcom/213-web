import DB from '../@modules/db.js';

const DB_ITEMS_KEY = 'rotationItems-4';
const DB_BASES_KEY = 'rotationBases-3';

/**
 * 대대순번 항목 기본값
 * key: 고유 키
 * name: 표시 이름
 * type: daily(매일) / weekly(매주) / monthly(매월) / quarterly(분기)
 * group: 표시 그룹명
 * order: 순번 배열 (텍스트 값)
 * comment: 코멘트 (선택)
 */
const DEFAULT_ROT_ITEMS = [
    { key: 'jeomho', name: '점호현황판', type: 'daily', group: '오늘', order: ['1중대', '2중대', '4중대', '본부/통신'], comment: '' },
    { key: 'lunch', name: '점심', type: 'weekly', group: '이번 주', order: ['11:30', '11:40', '11:50', '12:00', '12:10', '12:20'], comment: '' },
    { key: 'breakfast', name: '아침', type: 'weekly', group: '이번 주', order: ['07:15', '07:30'], comment: '' },
    { key: 'cleaning', name: '식당 청소', type: 'weekly', group: '이번 주 금요일', order: ['1중대', '2중대', '4중대', '본부/통신'], comment: '' },
    { key: 'recycle', name: '분리수거', type: 'weekly', group: '이번 주 분리수거', order: ['1중대', '2중대', '4중대', '본부/통신'], comment: '금요일 병영생활지도 일과까지 적용. 병영생활 지도때 분리수거를 하는 것으로 마무리.\n기준값은 월요일로 하는 것을 권장' },
    { key: 'smoking', name: '흡연장 청소', type: 'quarterly', group: '이번 분기', order: ['1대대', '2대대', '3대대', '4대대', '방패관'], comment: '' },
];

/**
 * 기준값 기본값
 * { [key]: { baseDate: 'YYYY-MM-DD', startValue: string } }
 * startValue: baseDate에 해당하는 순번 값 (order 배열 중 하나)
 * - daily: baseDate 기준 일 단위
 * - weekly: baseDate 기준 주 단위
 * - monthly: baseDate의 월 기준 월 단위
 * - quarterly: baseDate의 분기 기준 분기 단위
 */
const DEFAULT_BASES = {
    jeomho: { baseDate: '2026-01-23', startValue: '1중대' },
    lunch: { baseDate: '2026-01-12', startValue: '12:00' },
    breakfast: { baseDate: '2026-01-12', startValue: '07:30' },
    cleaning: { baseDate: '2026-01-12', startValue: '1중대' },
    recycle: { baseDate: '2026-01-12', startValue: '1중대' },
    smoking: { baseDate: '2026-01-01', startValue: '1대대' },
};

export const battalionRotationController = {
    // ─── 항목 관리 ───

    getItems: async () => {
        const list = await DB.get(DB_ITEMS_KEY);
        if (list && list.length > 0) return list;
        await DB.save(DB_ITEMS_KEY, DEFAULT_ROT_ITEMS);
        return [...DEFAULT_ROT_ITEMS];
    },

    saveItems: async (list) => {
        await DB.save(DB_ITEMS_KEY, list);
    },

    resetItems: async () => {
        await DB.save(DB_ITEMS_KEY, [...DEFAULT_ROT_ITEMS]);
        return [...DEFAULT_ROT_ITEMS];
    },

    // ─── 기준값 관리 ───

    getBases: async () => {
        const bases = await DB.get(DB_BASES_KEY);
        if (bases && Object.keys(bases).length > 0) return bases;
        await DB.save(DB_BASES_KEY, { ...DEFAULT_BASES });
        return { ...DEFAULT_BASES };
    },

    saveBases: async (bases) => {
        await DB.save(DB_BASES_KEY, bases);
    },

    saveBase: async (key, baseData) => {
        const bases = await battalionRotationController.getBases();
        bases[key] = baseData;
        await DB.save(DB_BASES_KEY, bases);
    },

    resetBases: async () => {
        await DB.save(DB_BASES_KEY, { ...DEFAULT_BASES });
        return { ...DEFAULT_BASES };
    },

    // ─── 순번 계산 ───

    /**
     * 특정 날짜에 대한 순번 계산
     * @param {object} item - 순번 항목 (key, type, order 등)
     * @param {object} base - 기준값 { baseDate: 'YYYY-MM-DD', startValue: string }
     * @param {Date} targetDate - 계산 대상 날짜
     * @returns {string} 해당 날짜의 순번 값
     */
    calcRotation: (item, base, targetDate) => {
        if (!item || !base || !item.order || item.order.length === 0) return null;

        const baseDate = new Date(base.baseDate);
        baseDate.setHours(0, 0, 0, 0);
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);

        // startValue의 인덱스 찾기
        let startIdx = item.order.indexOf(base.startValue);
        if (startIdx < 0) startIdx = 0;

        let diff;
        if (item.type === 'daily') {
            diff = Math.round((target - baseDate) / (1000 * 60 * 60 * 24));
        } else if (item.type === 'weekly') {
            const getWeekMonday = (d) => {
                const day = d.getDay();
                const mondayOffset = day === 0 ? -6 : 1 - day;
                const monday = new Date(d);
                monday.setDate(monday.getDate() + mondayOffset);
                return monday;
            };
            const baseMonday = getWeekMonday(baseDate);
            const targetMonday = getWeekMonday(target);
            diff = Math.round((targetMonday - baseMonday) / (1000 * 60 * 60 * 24 * 7));
        } else if (item.type === 'monthly') {
            diff = (target.getFullYear() - baseDate.getFullYear()) * 12
                 + (target.getMonth() - baseDate.getMonth());
        } else if (item.type === 'quarterly') {
            const getQuarter = (d) => Math.floor(d.getMonth() / 3);
            diff = (target.getFullYear() - baseDate.getFullYear()) * 4
                 + (getQuarter(target) - getQuarter(baseDate));
        } else {
            diff = 0;
        }

        const len = item.order.length;
        // 음수 diff 처리: JS의 % 연산자는 음수를 반환할 수 있음
        const idx = ((startIdx + diff) % len + len) % len;
        return item.order[idx];
    },

    /**
     * 특정 날짜의 모든 순번 결과 계산
     * @param {Date} targetDate
     * @returns {Promise<Array<{ item, value, displayValue }>>}
     */
    calcAll: async (targetDate) => {
        const [items, bases] = await Promise.all([
            battalionRotationController.getItems(),
            battalionRotationController.getBases(),
        ]);

        return items.map(item => {
            const base = bases[item.key];
            const value = base
                ? battalionRotationController.calcRotation(item, base, targetDate)
                : null;
            return { item, value };
        });
    },
};
