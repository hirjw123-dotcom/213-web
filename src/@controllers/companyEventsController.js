import DB from '../@modules/db.js';

export const COMPANY_OUTING_EVENT_TYPE = '중대외출';

// 데이터 구조:
// companyEvents: [
//   {
//     id: string,           // 고유 ID
//     type: string,         // '평일외출' | '면회' | '전역' | '기타'
//     soldierId: string,    // 용사 ID (기타는 null)
//     soldierName: string,  // 용사 이름 (기타는 '')
//     label: string,        // 표시 라벨 (예: '길영유 평일외출', '전투력 검정' 등)
//     startDate: [y, m, d], // 시작 날짜
//     endDate: [y, m, d],   // 종료 날짜
//     unitId: string,       // 중대 ID (기타는 'all')
//   }
// ]

const DB_KEY = 'companyEvents';

const _getAll = async () => {
    return (await DB.get(DB_KEY)) || [];
};

// 날짜 배열 비교 유틸
const _dateToNum = (arr) => arr[0] * 10000 + arr[1] * 100 + arr[2];
const _dateInRange = (dateArr, startArr, endArr) => {
    const d = _dateToNum(dateArr);
    return d >= _dateToNum(startArr) && d <= _dateToNum(endArr);
};

export const companyEventsController = {
    getAll: _getAll,

    /**
     * 특정 월의 이벤트 목록 가져오기 (시작/종료일이 해당 월과 겹치는 모든 이벤트)
     * @param {number} year
     * @param {number} month
     * @param {string} [unitId] - 중대 필터 (optional)
     */
    getByMonth: async (year, month, unitId) => {
        const all = await _getAll();
        const monthStart = _dateToNum([year, month, 1]);
        const lastDay = new Date(year, month, 0).getDate();
        const monthEnd = _dateToNum([year, month, lastDay]);

        return all.filter(ev => {
            // 이벤트의 날짜 범위가 해당 월과 겹치는지 확인
            const evStart = _dateToNum(ev.startDate);
            const evEnd = _dateToNum(ev.endDate);
            const overlaps = evStart <= monthEnd && evEnd >= monthStart;

            if (!overlaps) return false;

            // 중대 필터
            if (unitId) {
                if (ev.unitId !== unitId && ev.unitId !== 'all') return false;
            }

            return true;
        });
    },

    /**
     * 특정 날짜의 이벤트 목록
     */
    getByDate: async (year, month, day, unitId) => {
        const all = await _getAll();
        const dateArr = [year, month, day];

        return all.filter(ev => {
            if (!_dateInRange(dateArr, ev.startDate, ev.endDate)) return false;
            if (unitId && ev.unitId !== unitId && ev.unitId !== 'all') return false;
            return true;
        });
    },

    getCompanyOutingsByDate: async (year, month, day, unitId) => {
        const events = await companyEventsController.getByDate(year, month, day, unitId);
        return events.filter((event) => event.type === COMPANY_OUTING_EVENT_TYPE);
    },

    setCompanyOuting: async (year, month, day, unitId) => {
        const all = await _getAll();
        const next = all.filter((event) => {
            if (event.type !== COMPANY_OUTING_EVENT_TYPE) return true;
            if (event.unitId !== unitId) return true;
            return !_dateInRange([year, month, day], event.startDate, event.endDate);
        });

        const newEvent = {
            id: 'ce_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: COMPANY_OUTING_EVENT_TYPE,
            soldierId: null,
            soldierName: '',
            label: COMPANY_OUTING_EVENT_TYPE,
            startDate: [year, month, day],
            endDate: [year, month, day],
            unitId: unitId || 'all',
        };

        next.push(newEvent);
        await DB.save(DB_KEY, next);
        return newEvent;
    },

    clearCompanyOuting: async (year, month, day, unitId) => {
        const all = await _getAll();
        const next = all.filter((event) => {
            if (event.type !== COMPANY_OUTING_EVENT_TYPE) return true;
            if (event.unitId !== unitId) return true;
            return !_dateInRange([year, month, day], event.startDate, event.endDate);
        });

        if (next.length === all.length) return false;
        await DB.save(DB_KEY, next);
        return true;
    },

    /**
     * 이벤트 추가
     */
    add: async (eventData) => {
        const all = await _getAll();
        const newEvent = {
            id: 'ce_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            type: eventData.type || '기타',
            soldierId: eventData.soldierId || null,
            soldierName: eventData.soldierName || '',
            label: eventData.label || '',
            startDate: eventData.startDate,
            endDate: eventData.endDate,
            unitId: eventData.unitId || 'all',
        };
        all.push(newEvent);
        await DB.save(DB_KEY, all);
        return newEvent;
    },

    /**
     * 이벤트 수정
     */
    update: async (id, updates) => {
        const all = await _getAll();
        const idx = all.findIndex(e => e.id === id);
        if (idx === -1) return false;
        all[idx] = { ...all[idx], ...updates };
        await DB.save(DB_KEY, all);
        return true;
    },

    /**
     * 이벤트 삭제
     */
    delete: async (id) => {
        const all = await _getAll();
        const idx = all.findIndex(e => e.id === id);
        if (idx === -1) return false;
        all.splice(idx, 1);
        await DB.save(DB_KEY, all);
        return true;
    },
};
