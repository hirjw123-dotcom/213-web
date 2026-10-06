import DB from './db.js';

// 불침번 시간 기본값
export const DEFAULT_HOLIDAY_TIMES = [
    { start: '22:00', end: '24:00' },
    { start: '00:00', end: '02:00' },
    { start: '02:00', end: '03:30' },
    { start: '03:30', end: '05:00' },
    { start: '05:00', end: '07:00' },
];

export const DEFAULT_WEEKDAY_TIMES = [
    { start: '22:00', end: '24:00' },
    { start: '00:00', end: '01:30' },
    { start: '01:30', end: '03:00' },
    { start: '03:00', end: '04:30' },
    { start: '04:30', end: '06:30' },
];

const DB_HOLIDAY_TIMES_KEY = 'guard_holiday_times';
const DB_WEEKDAY_TIMES_KEY = 'guard_weekday_times';

// 불침번 순서 관리 모듈
export const sleepGuard = {
    orders: {},      // 날짜+조합별 배정 결과 캐시
    history: {},     // 용사별 번초 히스토리 (용사이름 → [1번초횟수, 2번초횟수, ...])
    holidayTimes: null,
    weekdayTimes: null,

    // 초기화
    async init() {
        this.orders = await DB.get('guard_orders') || {};
        this.history = await DB.get('guard_history') || {};
        this.holidayTimes = await DB.get(DB_HOLIDAY_TIMES_KEY) || [...DEFAULT_HOLIDAY_TIMES];
        this.weekdayTimes = await DB.get(DB_WEEKDAY_TIMES_KEY) || [...DEFAULT_WEEKDAY_TIMES];
    },

    // 이름 조합 생성 (순서 무관하게 정렬된 문자열)
    makeNameSet(soldiers) {
        return soldiers.map(s => s.name).sort().join('|');
    },

    // 저장된 순서와 현재 조합 비교하여 무효화된 데이터 정리
    async cleanupInvalidOrders(dateKey, currentSoldiers) {
        const stored = this.orders[dateKey];
        if (!stored) return;

        const currentNameSet = this.makeNameSet(currentSoldiers);

        // 이름 조합이 다르면 해당 날짜 데이터 삭제 및 히스토리 롤백
        if (stored.nameSet !== currentNameSet) {
            // 기존 배정에서 히스토리 롤백
            if (stored.positions) {
                Object.entries(stored.positions).forEach(([name, pos]) => {
                    if (this.history[name] && pos >= 0 && pos < 5) {
                        this.history[name][pos] = Math.max(0, this.history[name][pos] - 1);
                    }
                });
                await DB.save('guard_history', this.history);
            }

            delete this.orders[dateKey];
            await DB.save('guard_orders', this.orders);
        }
    },

    // 불침번 순서 계산 (핵심 로직)
    async getOrder(dateKey, guardSoldiers) {
        if (guardSoldiers.length === 0) return [];

        // 먼저 무효화된 데이터 정리
        await this.cleanupInvalidOrders(dateKey, guardSoldiers);

        const nameSet = this.makeNameSet(guardSoldiers);
        const stored = this.orders[dateKey];

        // 저장된 순서가 있고 이름 조합이 같으면 저장된 순서 사용
        if (stored && stored.nameSet === nameSet && stored.positions) {
            // positions에서 순서대로 복원 (0번초→4번초)
            const result = new Array(5).fill(null);
            Object.entries(stored.positions).forEach(([name, pos]) => {
                const soldier = guardSoldiers.find(s => s.name === name);
                if (soldier && pos >= 0 && pos < 5) {
                    result[pos] = soldier;
                }
            });
            return result;  // 5개 슬롯 유지 (null 포함)
        }

        // 새로운 순서 생성
        const { orderedSoldiers, positions } = this.assignPositions(guardSoldiers);

        // 히스토리 업데이트
        Object.entries(positions).forEach(([name, pos]) => {
            if (!this.history[name]) {
                this.history[name] = [0, 0, 0, 0, 0];
            }
            if (pos >= 0 && pos < 5) {
                this.history[name][pos]++;
            }
        });
        await DB.save('guard_history', this.history);

        // 순서 저장
        this.orders[dateKey] = {
            nameSet,
            positions
        };
        await DB.save('guard_orders', this.orders);

        return orderedSoldiers;
    },

    // 각 용사에게 가장 적게 선 번초 배정
    assignPositions(soldiers) {
        const positions = {};           // 용사이름 → 배정된 번초
        const usedPositions = new Set(); // 이미 사용된 번초
        const orderedSoldiers = new Array(5).fill(null);

        // 각 용사별로 처리
        soldiers.forEach(soldier => {
            const name = soldier.name;

            // 이 용사의 히스토리 가져오기
            const soldierHistory = this.history[name] || [0, 0, 0, 0, 0];

            // 아직 배정되지 않은 번초 중에서 가장 적게 선 번초 찾기
            let minCount = Infinity;
            let candidates = [];

            for (let pos = 0; pos < 5; pos++) {
                if (usedPositions.has(pos)) continue; // 이미 다른 용사가 배정됨

                const count = soldierHistory[pos];
                if (count < minCount) {
                    minCount = count;
                    candidates = [pos];
                } else if (count === minCount) {
                    candidates.push(pos);
                }
            }

            if (candidates.length === 0) return; // 배정 가능한 자리 없음

            // 같은 횟수끼리는 랜덤 선택
            const selectedPos = candidates[Math.floor(Math.random() * candidates.length)];

            positions[name] = selectedPos;
            usedPositions.add(selectedPos);
            orderedSoldiers[selectedPos] = soldier;
        });

        return {
            orderedSoldiers,  // 5개 슬롯 유지 (null 포함)
            positions
        };
    },

    // 불침번 시간 계산
    getTimes(isHoliday) {
        if (isHoliday) {
            return this.holidayTimes || [...DEFAULT_HOLIDAY_TIMES];
        } else {
            return this.weekdayTimes || [...DEFAULT_WEEKDAY_TIMES];
        }
    },

    // 불침번 시간 저장
    async saveTimes(isHoliday, times) {
        if (isHoliday) {
            this.holidayTimes = times;
            await DB.save(DB_HOLIDAY_TIMES_KEY, times);
        } else {
            this.weekdayTimes = times;
            await DB.save(DB_WEEKDAY_TIMES_KEY, times);
        }
    },

    // 용사의 번초 히스토리 조회 (디버깅/확인용)
    getHistory(soldierName) {
        return this.history[soldierName] || [0, 0, 0, 0, 0];
    },

    // 전체 히스토리 초기화 (필요시)
    async resetHistory() {
        this.history = {};
        this.orders = {};
        await DB.save('guard_history', this.history);
        await DB.save('guard_orders', this.orders);
    }
};
