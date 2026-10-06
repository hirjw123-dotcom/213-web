import DB from '../@modules/db.js';

// 근무 변경 히스토리 관리 컨트롤러
// 키: scheduleHistory_{y}_{m}
// 값: [ { timestamp, type, changes: [...] } ]
const _getHistoryKey = (y, m) => `scheduleHistory_${y}_${m}`;

export const scheduleHistoryController = {
    /**
     * 히스토리 조회
     */
    get: async (y, m) => {
        return (await DB.get(_getHistoryKey(y, m))) || [];
    },

    /**
     * 히스토리 항목 추가
     * @param {number} y - 년도
     * @param {number} m - 월
     * @param {object} entry - { type: 'schedule'|'dayType', changes: [...] }
     *   schedule change: { soldierId, day, before: [...labels], after: [...labels] }
     *   dayType change:  { day, before: { label, ... } | null, after: { label, ... } | null }
     */
    add: async (y, m, entry) => {
        const key = _getHistoryKey(y, m);
        const history = (await DB.get(key)) || [];
        history.push({
            timestamp: Date.now(),
            ...entry,
        });
        await DB.save(key, history);
        return history;
    },

    /**
     * 마지막 히스토리 제거 (undo 후 히스토리 정리)
     */
    removeLast: async (y, m) => {
        const key = _getHistoryKey(y, m);
        const history = (await DB.get(key)) || [];
        if (history.length === 0) return null;
        const removed = history.pop();
        await DB.save(key, history);
        return removed;
    },

    /**
     * 전체 히스토리 저장 (덮어쓰기)
     */
    save: async (y, m, history) => {
        await DB.save(_getHistoryKey(y, m), history);
    },

    /**
     * 히스토리 초기화
     */
    clear: async (y, m) => {
        await DB.save(_getHistoryKey(y, m), []);
    },
};
