
export const dateYMD = (d, separator = '') => {
    let D = new Date(d);
    return [D.getFullYear(), D.getMonth() + 1, D.getDate()].join(separator);
};

export const dateYMDHM = (d, separator = '') => {
    let D = new Date(d);
    return [D.getFullYear(), D.getMonth() + 1, D.getDate(), D.getHours(), D.getMinutes()].join(separator);
};

export const dateYM = (d, separator = '') => {
    let D = new Date(d);
    return [D.getFullYear(), D.getMonth() + 1].join(separator);
};

// 날짜 배열 [year, month, day]를 Date 객체로 변환
export const arrToDate = (arr) => {
    if (!arr || arr.length < 3) return null;
    return new Date(arr[0], arr[1] - 1, arr[2]);
};

// 두 날짜 사이의 일수 차이 계산
export const daysBetween = (date1, date2) => {
    const d1 = date1 instanceof Date ? date1 : arrToDate(date1);
    const d2 = date2 instanceof Date ? date2 : arrToDate(date2);
    if (!d1 || !d2) return 0;
    const diffTime = d2.getTime() - d1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// 용사 복무 관련 계산 함수들
// refDate 파라미터: 오늘 날짜를 대체할 기준일 (Date 객체). 생략 시 실제 오늘 사용.
export const calcServiceDays = {
    // 총 복무일 (입대일 ~ 전역일, 양쪽 포함)
    total: (startDate, exitDate) => {
        const days = daysBetween(startDate, exitDate) + 1; // 시작일 포함
        return days > 0 ? days : 0;
    },
    // 현재까지 복무일 (입대일 ~ 오늘, 양쪽 포함)
    current: (startDate, refDate) => {
        const today = refDate ? new Date(refDate) : new Date();
        today.setHours(0, 0, 0, 0);
        const days = daysBetween(startDate, today) + 1; // 시작일 포함
        return days > 0 ? days : 0;
    },
    // 남은 복무일 (내일 ~ 전역일, 전역일 포함)
    remaining: (exitDate, refDate, onlyDays = false) => {
        const today = refDate ? new Date(refDate) : new Date();
        today.setHours(0, 0, 0, 0);
        const days = daysBetween(today, exitDate); // 오늘 제외 (현복무에 포함됨)
        return (onlyDays ? days : (days > 0 ? days : 0))
    },
    // 복무율 (현재 복무일 / 총 복무일 * 100)
    percentage: (startDate, exitDate, refDate) => {
        const total = calcServiceDays.total(startDate, exitDate);
        if (total <= 0) return 0;
        const current = calcServiceDays.current(startDate, refDate);
        const pct = Math.floor((current / total) * 10000) / 100;
        return Math.min(100, Math.max(0, pct));
    }
};