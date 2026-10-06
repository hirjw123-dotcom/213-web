import DB from '../@modules/db.js';

// 데이터 구조:
// {
//   weeklySchedules: { [year-week]: { text: string } },  // 주간 일정
//   dailySchedules: { [YYYY-MM-DD]: { text: string } },  // 일간 일정
//   holidays: { [YYYY-MM-DD]: boolean },                  // 휴일 지정
// }

const DB_KEY = 'battalionSchedules';
const DAY_TYPE_ASSIGN_PREFIX = 'dayTypeAssign_';
const HOLIDAY_DAY_TYPE_LABEL = '휴일';
const DAY_MS = 86400000;

const stripTime = (date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
};

const getFirstMondayOfYear = (year) => {
    const jan1 = stripTime(new Date(year, 0, 1));
    const offset = (8 - jan1.getDay()) % 7;
    jan1.setDate(jan1.getDate() + offset);
    return jan1;
};

const normalizeDayTypeAssignments = (assignments) => {
    const normalized = {};
    for (const [day, value] of Object.entries(assignments || {})) {
        const labels = Array.isArray(value)
            ? value
            : (typeof value === 'string' && value ? [value] : []);
        const unique = [...new Set(labels.filter(Boolean))];
        if (unique.length > 0) normalized[day] = unique;
    }
    return normalized;
};

const _getRaw = async () => {
    const data = await DB.get(DB_KEY);
    return data || {
        weeklySchedules: {},
        dailySchedules: {},
        holidays: {},
    };
};

const _getDayTypeHolidayMap = async () => {
    const keys = await DB.getAllKeys();
    const assignKeys = (keys || []).filter((key) => typeof key === 'string' && key.startsWith(DAY_TYPE_ASSIGN_PREFIX));
    const assignResults = await Promise.all(assignKeys.map((key) => DB.get(key)));

    const map = {};
    for (let i = 0; i < assignKeys.length; i++) {
        const key = assignKeys[i];
        const match = key.match(/^dayTypeAssign_(\d+)_(\d+)$/);
        if (!match) continue;

        const year = Number(match[1]);
        const month = Number(match[2]);
        const assignment = normalizeDayTypeAssignments(assignResults[i]);

        for (const [day, labels] of Object.entries(assignment)) {
            if (!labels.includes(HOLIDAY_DAY_TYPE_LABEL)) continue;
            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`;
            map[dateKey] = true;
        }
    }
    return map;
};

const _getAll = async () => {
    const [raw, dayTypeHolidayMap] = await Promise.all([
        _getRaw(),
        _getDayTypeHolidayMap(),
    ]);

    return {
        ...raw,
        holidays: {
            ...(raw.holidays || {}),
            ...(dayTypeHolidayMap || {}),
        },
    };
};

// 날짜 관련 유틸리티
const dateUtils = {
    // Date 객체를 YYYY-MM-DD 형식으로
    formatDate: (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    // 주차 key 생성 (YYYY-Www 형식)
    getWeekKey: (year, weekNum) => {
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
    },

    // 특정 주차의 월요일 날짜 가져오기
    getMondayOfWeek: (year, weekNum) => {
        if (weekNum <= 0) {
            return stripTime(new Date(year, 0, 1));
        }

        const monday = getFirstMondayOfYear(year);
        monday.setDate(monday.getDate() + (weekNum - 1) * 7);
        return monday;
    },

    // 특정 날짜의 주차 계산
    getWeekNumber: (date) => {
        const d = stripTime(date);
        const year = d.getFullYear();
        const firstMonday = getFirstMondayOfYear(year);

        if (d < firstMonday) {
            return { year, weekNum: 0 };
        }

        const diffDays = Math.floor((d.getTime() - firstMonday.getTime()) / DAY_MS);
        const weekNum = Math.floor(diffDays / 7) + 1;
        return { year, weekNum };
    },

    // 요일 가져오기 (0=일, 1=월, ..., 6=토)
    getDayOfWeek: (date) => {
        return new Date(date).getDay();
    },
};

export const battalionSchedulesController = {
    // 모든 데이터 가져오기
    getAll: _getAll,

    // 주간 일정 관련
    weekly: {
        // 특정 주차 일정 가져오기
        get: async (year, weekNum) => {
            const data = await _getRaw();
            const key = dateUtils.getWeekKey(year, weekNum);
            return data.weeklySchedules[key] || { text: '' };
        },

        // 특정 주차 일정 저장
        save: async (year, weekNum, text) => {
            const data = await _getRaw();
            const key = dateUtils.getWeekKey(year, weekNum);
            data.weeklySchedules[key] = { text };
            await DB.save(DB_KEY, data);
        },
    },

    // 일간 일정 관련
    daily: {
        // 특정 날짜 일정 가져오기
        get: async (date) => {
            const data = await _getRaw();
            const key = dateUtils.formatDate(date);
            return data.dailySchedules[key] || { text: '' };
        },

        // 특정 날짜 일정 저장
        save: async (date, text) => {
            const data = await _getRaw();
            const key = dateUtils.formatDate(date);
            data.dailySchedules[key] = { text };
            await DB.save(DB_KEY, data);
        },
    },

    // 휴일 관련
    holiday: {
        // 특정 날짜가 휴일인지 확인 (토/일 포함)
        isHoliday: async (date) => {
            const d = new Date(date);
            const dayOfWeek = d.getDay();
            // 토요일(6), 일요일(0)은 무조건 휴일
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                return true;
            }
            // 사용자 지정 휴일 확인
            const data = await _getAll();
            const key = dateUtils.formatDate(date);
            return !!data.holidays[key];
        },

        // 사용자 지정 휴일만 확인 (토/일 제외)
        isCustomHoliday: async (date) => {
            const data = await _getAll();
            const key = dateUtils.formatDate(date);
            return !!data.holidays[key];
        },

        // 휴일 설정/해제
        set: async (date, isHoliday) => {
            const data = await _getRaw();
            const key = dateUtils.formatDate(date);
            if (isHoliday) {
                data.holidays[key] = true;
            } else {
                delete data.holidays[key];
            }

            const targetDate = new Date(date);
            const year = targetDate.getFullYear();
            const month = targetDate.getMonth() + 1;
            const day = targetDate.getDate();
            const assignKey = `dayTypeAssign_${year}_${month}`;
            const currentAssign = normalizeDayTypeAssignments(await DB.get(assignKey));
            const dayLabels = [...(currentAssign[day] || [])];
            const hasHolidayLabel = dayLabels.includes(HOLIDAY_DAY_TYPE_LABEL);

            if (isHoliday && !hasHolidayLabel) {
                dayLabels.push(HOLIDAY_DAY_TYPE_LABEL);
            }
            if (!isHoliday && hasHolidayLabel) {
                const filtered = dayLabels.filter((label) => label !== HOLIDAY_DAY_TYPE_LABEL);
                if (filtered.length > 0) {
                    currentAssign[day] = filtered;
                } else {
                    delete currentAssign[day];
                }
            } else if (isHoliday) {
                currentAssign[day] = dayLabels;
            }

            await DB.save(assignKey, currentAssign);
            await DB.save(DB_KEY, data);
        },

        // 휴일 토글
        toggle: async (date) => {
            const isCustom = await battalionSchedulesController.holiday.isCustomHoliday(date);
            await battalionSchedulesController.holiday.set(date, !isCustom);
            return !isCustom;
        },
    },

    // 유틸리티 함수들 노출
    utils: dateUtils,

    // 특정 월의 모든 데이터 가져오기 (캘린더 렌더링용)
    getMonthData: async (year, month) => {
        const data = await _getAll();

        // 해당 월의 일간 일정들
        const dailySchedules = {};
        for (const [key, value] of Object.entries(data.dailySchedules)) {
            const date = new Date(key);
            if (date.getFullYear() === year && date.getMonth() + 1 === month) {
                dailySchedules[key] = value;
            }
        }

        // 해당 월의 휴일들
        const holidays = {};
        for (const [key, value] of Object.entries(data.holidays)) {
            const date = new Date(key);
            if (date.getFullYear() === year && date.getMonth() + 1 === month) {
                holidays[key] = value;
            }
        }

        // 해당 월에 포함된 주차들의 주간 일정
        const weeklySchedules = {};
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);

        let currentDate = new Date(firstDay);
        const processedWeeks = new Set();

        while (currentDate <= lastDay) {
            const { year: weekYear, weekNum } = dateUtils.getWeekNumber(currentDate);
            const weekKey = dateUtils.getWeekKey(weekYear, weekNum);

            if (!processedWeeks.has(weekKey)) {
                processedWeeks.add(weekKey);
                const weekData = data.weeklySchedules[weekKey];
                if (weekData) {
                    weeklySchedules[weekKey] = weekData;
                }
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            dailySchedules,
            holidays,
            weeklySchedules,
        };
    },
};