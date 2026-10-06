import { battalionSchedulesController } from '../@controllers/battalionSchedulesController';

const cloneDate = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date, days) => {
    const next = cloneDate(date);
    next.setDate(next.getDate() + days);
    return next;
};

const getWeekStart = (date) => {
    const start = cloneDate(date);
    start.setDate(start.getDate() - start.getDay());
    return start;
};

const buildWeek = (weekStart, currentYear, currentMonth) => {
    const days = Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return {
            date,
            day: date.getDate(),
            y: date.getFullYear(),
            m: date.getMonth() + 1,
            d: date.getDate(),
            isCurrentMonth: date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth,
        };
    });

    const thursday = days.find((dayInfo) => dayInfo.date.getDay() === 4) || days[4];
    const { year: weekYear, weekNum } = battalionSchedulesController.utils.getWeekNumber(thursday.date);
    const weekKey = battalionSchedulesController.utils.getWeekKey(weekYear, weekNum);
    const monday = days.find((dayInfo) => dayInfo.date.getDay() === 1);
    const friday = days.find((dayInfo) => dayInfo.date.getDay() === 5);
    const weekRangeText = monday && friday
        ? `(${monday.date.getMonth() + 1}/${monday.date.getDate()}-${friday.date.getMonth() + 1}/${friday.date.getDate()})`
        : '';

    return {
        days,
        weekKey,
        weekYear,
        weekNum,
        weekRangeText,
        containsCurrentMonth: days.some((dayInfo) => dayInfo.isCurrentMonth),
    };
};

export const getExtendedWeeks = (year, month, beforeCount = 4, afterCount = 4) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const firstWeekStart = getWeekStart(firstDay);
    const lastWeekStart = getWeekStart(lastDay);
    const totalWeeks = Math.round((lastWeekStart.getTime() - firstWeekStart.getTime()) / 604800000) + 1;
    const rangeStart = addDays(firstWeekStart, beforeCount * -7);
    const extendedCount = totalWeeks + beforeCount + afterCount;

    return Array.from({ length: extendedCount }, (_, index) => (
        buildWeek(addDays(rangeStart, index * 7), year, month)
    ));
};

export const getCurrentMonthWeekKeys = (year, month, beforeCount = 4, afterCount = 4) => {
    return getExtendedWeeks(year, month, beforeCount, afterCount)
        .filter((week) => week.containsCurrentMonth)
        .map((week) => week.weekKey);
};