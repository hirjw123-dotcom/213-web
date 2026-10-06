/**
 * 복무율 컨트롤러
 * - 입대일~전역일 기준으로 복무율을 실시간 계산
 * - 0.1초마다 갱신, 소수점 10자리까지
 */

const _listeners = new Set();
let _interval = null;
let _startDate = null;
let _exitDate = null;

/**
 * 날짜 배열 [y,m,d] 또는 "YYYY-MM-DD" 문자열을 Date 객체로 변환
 */
const _toDate = (v) => {
    if (!v) return null;
    if (Array.isArray(v)) return new Date(v[0], v[1] - 1, v[2]);
    if (typeof v === 'string') {
        const p = v.split('-').map(Number);
        return new Date(p[0], p[1] - 1, p[2]);
    }
    return null;
};

/**
 * 현재 복무율 데이터를 계산
 */
const _calculate = () => {
    const now = Date.now();
    const start = _startDate?.getTime();
    const end = _exitDate?.getTime();

    if (!start || !end || end <= start) {
        return { rate: 0, nextStep: 0, daysToNext: 0, valid: false, elapsed: 0, total: 0 };
    }

    const total = end - start;
    const elapsed = now - start;
    const rawRate = Math.min(Math.max((elapsed / total) * 100, 0), 100);

    // 다음 스텝 계산 (10% 단위)
    const currentStep = Math.floor(rawRate / 10) * 10;
    const nextStep = Math.min(currentStep + 10, 100);

    // 다음 스텝까지 남은 일수
    let daysToNext = 0;
    if (rawRate < 100) {
        const nextStepTime = start + (total * nextStep / 100);
        daysToNext = Math.max(0, Math.ceil((nextStepTime - now) / (1000 * 60 * 60 * 24)));
    }

    // 전체 남은 일수
    const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

    return {
        rate: rawRate,
        rateStr: rawRate.toFixed(7),
        nextStep,
        daysToNext,
        daysRemaining,
        valid: true,
        elapsed,
        total,
    };
};

const _notify = () => {
    const data = _calculate();
    for (const cb of _listeners) {
        cb(data);
    }
};

export const serviceRateController = {
    /**
     * 복무율 추적 시작
     * @param {Array|string} startDate - 입대일
     * @param {Array|string} exitDate - 전역일
     */
    start(startDate, exitDate) {
        _startDate = _toDate(startDate);
        _exitDate = _toDate(exitDate);

        // 기존 인터벌 정리
        if (_interval) clearInterval(_interval);

        // 0.1초마다 갱신
        _interval = setInterval(_notify, 100);
        _notify(); // 즉시 1회 실행
    },

    /**
     * 추적 중단
     */
    stop() {
        if (_interval) {
            clearInterval(_interval);
            _interval = null;
        }
        _startDate = null;
        _exitDate = null;
    },

    /**
     * 리스너 등록
     * @param {Function} callback
     * @returns {Function} unsubscribe
     */
    subscribe(callback) {
        _listeners.add(callback);
        // 구독 즉시 현재 값 전달
        if (_startDate && _exitDate) {
            callback(_calculate());
        }
        return () => _listeners.delete(callback);
    },

    /**
     * 현재 값 즉시 조회
     */
    current() {
        return _calculate();
    },
};
