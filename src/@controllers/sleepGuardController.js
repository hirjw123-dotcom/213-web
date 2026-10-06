import { sleepGuard, DEFAULT_HOLIDAY_TIMES, DEFAULT_WEEKDAY_TIMES } from '../@modules/sleepGuard.js';

export const sleepGuardController = {
    // 불침번 시간 목록 가져오기
    async getTimes(isHoliday) {
        await sleepGuard.init();
        return sleepGuard.getTimes(isHoliday);
    },

    // 불침번 시간 목록 저장
    async saveTimes(isHoliday, times) {
        await sleepGuard.saveTimes(isHoliday, times);
    },

    // 기본값 가져오기
    getDefaults(isHoliday) {
        return isHoliday ? [...DEFAULT_HOLIDAY_TIMES] : [...DEFAULT_WEEKDAY_TIMES];
    },
};
