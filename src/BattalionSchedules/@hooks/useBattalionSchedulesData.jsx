import { useCallback, useEffect, useState } from 'preact/hooks';
import { battalionSchedulesController } from '../../@controllers/battalionSchedulesController.js';
import { authController } from '../../@controllers/authController.js';

const generateCalendarData = (year, month) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    const startDayOfWeek = firstDay.getDay();

    const prevMonthLast = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonthLast.getDate();

    const weeks = [];
    let currentWeek = [];
    let dayCounter = 1;
    let nextMonthDay = 1;

    for (let i = 0; i < startDayOfWeek; i++) {
        const day = prevMonthDays - startDayOfWeek + 1 + i;
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        const date = new Date(prevYear, prevMonth - 1, day);
        currentWeek.push({
            date,
            day,
            isCurrentMonth: false,
            isPrevMonth: true,
        });
    }

    while (dayCounter <= daysInMonth) {
        const date = new Date(year, month - 1, dayCounter);
        currentWeek.push({
            date,
            day: dayCounter,
            isCurrentMonth: true,
            isPrevMonth: false,
        });

        if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
        dayCounter++;
    }

    while (currentWeek.length > 0 && currentWeek.length < 7) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const date = new Date(nextYear, nextMonth - 1, nextMonthDay);
        currentWeek.push({
            date,
            day: nextMonthDay,
            isCurrentMonth: false,
            isNextMonth: true,
        });
        nextMonthDay++;
    }
    if (currentWeek.length === 7) {
        weeks.push(currentWeek);
    }

    return weeks.map((week) => {
        const thursday = week.find((dayInfo) => dayInfo.date.getDay() === 4) || week[3];
        const { year: weekYear, weekNum } = battalionSchedulesController.utils.getWeekNumber(thursday.date);
        const weekKey = battalionSchedulesController.utils.getWeekKey(weekYear, weekNum);

        const monday = week.find((dayInfo) => dayInfo.date.getDay() === 1);
        const friday = week.find((dayInfo) => dayInfo.date.getDay() === 5);

        let weekRangeText = '';
        if (monday && friday) {
            const mMonth = monday.date.getMonth() + 1;
            const mDay = monday.date.getDate();
            const fMonth = friday.date.getMonth() + 1;
            const fDay = friday.date.getDate();
            weekRangeText = `(${mMonth}/${mDay}-${fMonth}/${fDay})`;
        }

        return {
            days: week,
            weekKey,
            weekYear,
            weekNum,
            weekRangeText,
        };
    });
};

const getInitialPeriod = () => {
    const today = new Date();
    try {
        const savedYear = Number(localStorage.getItem('battalionSchedules.lastYear'));
        const savedMonth = Number(localStorage.getItem('battalionSchedules.lastMonth'));
        if (Number.isInteger(savedYear) && savedYear > 0 && Number.isInteger(savedMonth) && savedMonth >= 1 && savedMonth <= 12) {
            return { year: savedYear, month: savedMonth };
        }
    } catch {
    }
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
};

const initialPeriod = getInitialPeriod();
let lastYear = initialPeriod.year;
let lastMonth = initialPeriod.month;

export default function useBattalionSchedulesData() {
    const today = new Date();
    const [year, setYear] = useState(lastYear);
    const [month, setMonth] = useState(lastMonth);
    const [loading, setLoading] = useState(true);

    const [weeklySchedules, setWeeklySchedules] = useState({});
    const [dailySchedules, setDailySchedules] = useState({});
    const [holidays, setHolidays] = useState({});

    const [contextMenu, setContextMenu] = useState(null);

    const [canEditDaily, setCanEditDaily] = useState(false);
    const [canEditWeekly, setCanEditWeekly] = useState(false);

    const formatDateKey = useCallback((date) => battalionSchedulesController.utils.formatDate(date), []);

    const loadData = useCallback(async () => {
        setLoading(true);
        const data = await battalionSchedulesController.getAll();
        setWeeklySchedules(data.weeklySchedules || {});
        setDailySchedules(data.dailySchedules || {});
        setHolidays(data.holidays || {});
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
        authController.checkFeaturePermission('battalionSchedules', 'dailySchedule').then((result) => setCanEditDaily(result.allowed));
        authController.checkFeaturePermission('battalionSchedules', 'weeklySchedule').then((result) => setCanEditWeekly(result.allowed));
    }, [loadData]);

    const weeks = generateCalendarData(year, month);

    const changePeriod = (nextYear, nextMonth) => {
        setYear(nextYear);
        setMonth(nextMonth);
        lastYear = nextYear;
        lastMonth = nextMonth;
        localStorage.setItem('battalionSchedules.lastYear', nextYear);
        localStorage.setItem('battalionSchedules.lastMonth', nextMonth);
    };

    const prevMonth = () => {
        if (month === 1) changePeriod(year - 1, 12);
        else changePeriod(year, month - 1);
    };

    const nextMonth = () => {
        if (month === 12) changePeriod(year + 1, 1);
        else changePeriod(year, month + 1);
    };

    const handleWeeklyChange = async (weekKey, weekYear, weekNum, text) => {
        if (!canEditWeekly) return;
        setWeeklySchedules((prev) => ({
            ...prev,
            [weekKey]: { text },
        }));
        await battalionSchedulesController.weekly.save(weekYear, weekNum, text);
    };

    const handleDailyChange = async (date, text) => {
        if (!canEditDaily) return;
        const key = formatDateKey(date);
        setDailySchedules((prev) => ({
            ...prev,
            [key]: { text },
        }));
        await battalionSchedulesController.daily.save(date, text);
    };

    const handleToggleHoliday = async (date) => {
        if (!canEditDaily) return;
        const key = formatDateKey(date);
        const isNowHoliday = !holidays[key];
        setHolidays((prev) => {
            const newHolidays = { ...prev };
            if (isNowHoliday) {
                newHolidays[key] = true;
            } else {
                delete newHolidays[key];
            }
            return newHolidays;
        });
        await battalionSchedulesController.holiday.set(date, isNowHoliday);
    };

    const handleContextMenu = (e, date) => {
        if (!canEditDaily) return;
        e.preventDefault();
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const key = formatDateKey(date);
        const isHoliday = !!holidays[key];

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            date,
            isHoliday,
            isWeekend,
        });
    };

    const goToToday = () => {
        const currentDate = new Date();
        setYear(currentDate.getFullYear());
        setMonth(currentDate.getMonth() + 1);
        lastYear = currentDate.getFullYear();
        lastMonth = currentDate.getMonth() + 1;
        localStorage.setItem('battalionSchedules.lastYear', currentDate.getFullYear());
        localStorage.setItem('battalionSchedules.lastMonth', currentDate.getMonth() + 1);
    };

    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

    return {
        year,
        month,
        loading,
        weeklySchedules,
        dailySchedules,
        holidays,
        contextMenu,
        canEditDaily,
        canEditWeekly,
        weeks,
        isCurrentMonth,
        prevMonth,
        nextMonth,
        goToToday,
        setContextMenu,
        handleContextMenu,
        handleToggleHoliday,
        handleDailyChange,
        handleWeeklyChange,
        formatDateKey,
    };
}
