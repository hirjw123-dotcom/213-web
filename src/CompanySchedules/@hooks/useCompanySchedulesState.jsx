import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { UNITS } from '../../@modules/configs';
import { plugins } from '../../@modules/plugins';
import { DEFAULT_COMPANY_SCHEDULE_THEME } from '../themes';
import { getCurrentMonthWeekKeys, getExtendedWeeks } from '../weekUtils';

const THEME_STORAGE_KEY = 'companySchedules.themeByUnit';

const loadSavedThemes = () => {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const saveThemes = (themeByUnit) => {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(themeByUnit));
    } catch {
        // ignore storage failures and keep in-memory state
    }
};

const FILTER_ITEMS = [
    { key: 'weeklySchedule', label: '대대 주간 일정' },
    { key: 'dailySchedule', label: '대대 일일 일정' },
    { key: 'events', label: '이벤트' },
    { key: 'leave', label: '출타(휴/출/박/평출)' },
    { key: 'duty', label: '근무' },
    { key: 'excluded', label: '열외' },
    { key: 'birthday', label: '생일' },
];

export { FILTER_ITEMS };

let lastYear = +localStorage.getItem('companySchedules.lastYear');
let lastMonth = +localStorage.getItem('companySchedules.lastMonth');
export default function useCompanySchedulesState() {
    const today = new Date();
    const initialYear = Number.isInteger(lastYear) && lastYear > 0 ? lastYear : today.getFullYear();
    const initialMonth = Number.isInteger(lastMonth) && lastMonth >= 1 && lastMonth <= 12 ? lastMonth : today.getMonth() + 1;
    const [year, setYear] = useState(initialYear);
    const [month, setMonth] = useState(initialMonth);
    const [unit, setUnit] = useState(() => {
        const savedUnit = localStorage.getItem('companySchedulesLastUnit');
        return savedUnit || UNITS[0].id;
    });
    const [themeByUnit, setThemeByUnit] = useState(loadSavedThemes);
    const [filters, setFilters] = useState(() => {
        const initialFilters = {};
        FILTER_ITEMS.forEach((item) => {
            initialFilters[item.key] = true;
        });
        return initialFilters;
    });
    const [selectedWeekKeys, setSelectedWeekKeys] = useState(() => getCurrentMonthWeekKeys(initialYear, initialMonth));
    const [refreshKey, setRefreshKey] = useState(0);

    const calRef = useRef(null);
    const theme = themeByUnit[unit] || DEFAULT_COMPANY_SCHEDULE_THEME;
    const weekOptions = useMemo(() => getExtendedWeeks(year, month), [year, month]);

    useEffect(() => {
        setSelectedWeekKeys(weekOptions
            .filter((week) => week.containsCurrentMonth)
            .map((week) => week.weekKey));
    }, [weekOptions]);

    const handleEventsChange = useCallback(() => {
        setRefreshKey((prev) => prev + 1);
    }, []);

    const setTheme = useCallback((nextTheme) => {
        setThemeByUnit((prev) => {
            const next = { ...prev, [unit]: nextTheme };
            saveThemes(next);
            return next;
        });
    }, [unit]);


    const prevMonth = () => {
        if (month === 1) {
            setYear(year - 1);
            setMonth(12);

            lastYear = year - 1;
            lastMonth = 12;
        } else {
            setMonth(month - 1);
            lastMonth = month - 1;
        }

        localStorage.setItem('companySchedules.lastYear', year);
        localStorage.setItem('companySchedules.lastMonth', month - 1);
    };

    const nextMonth = () => {
        if (month === 12) {
            setYear(year + 1);
            setMonth(1);

            lastYear = year + 1;
            lastMonth = 1;
        } else {
            setMonth(month + 1);

            lastMonth = month + 1;
        }

        localStorage.setItem('companySchedules.lastYear', year);
        localStorage.setItem('companySchedules.lastMonth', month + 1);
    };

    const goToday = () => {
        setYear(today.getFullYear());
        setMonth(today.getMonth() + 1);
        lastYear = today.getFullYear();
        lastMonth = today.getMonth() + 1;

        localStorage.setItem('companySchedules.lastYear', today.getFullYear());
        localStorage.setItem('companySchedules.lastMonth', today.getMonth() + 1);
    };

    const handlePrint = (landscape = false) => {
        if (calRef.current) {
            plugins.print(calRef.current, { landscape });
        }
    };

    const calKey = `${year}-${month}`;

    return {
        year,
        month,
        unit,
        theme,
        filters,
        weekOptions,
        selectedWeekKeys,
        refreshKey,
        calRef,
        calKey,
        setUnit,
        setTheme,
        setFilters,
        setSelectedWeekKeys,
        prevMonth,
        nextMonth,
        goToday,
        handlePrint,
        handleEventsChange,
    };
}
