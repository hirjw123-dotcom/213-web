// 스케줄 데이터 키 생성 (년-월 형식) - soldierSchedulesController와 동일
export const _getScheduleKey = (y, m) => `schedules_${y}_${m}`;

// 배열 동일 비교 (순서 무시)
export const _arrEq = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
};

export const filterValidSoldiers = (soldiers, year, month) => {
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    return soldiers.filter(s => {
        // 간부 카테고리 제외 (soldierCategoriesController 기본 ID 'officer')
        if (s.categories?.includes('officer')) return false;
        if (s.exitDate) {
            const exit = new Date(s.exitDate[0], s.exitDate[1] - 1, s.exitDate[2]);
            if (exit < first) return false;
        }
        if (s.startDate) {
            const start = new Date(s.startDate[0], s.startDate[1] - 1, s.startDate[2]);
            if (start > last) return false;
        }
        return true;
    });
};

export const getDaysInMonth = (year, month) => Array.from({ length: new Date(year, month, 0).getDate() }, (_, i) => i + 1);
export const getDayOfWeek = (year, month, day) => new Date(year, month - 1, day).getDay();
