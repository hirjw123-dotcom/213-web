import { useEffect, useMemo, useState } from 'preact/hooks';
import DB from '../../@modules/db';

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const buildCalendarCells = (year, month) => {
    const firstDay = new Date(year, month - 1, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
    const cells = [];

    for (let index = 0; index < 42; index += 1) {
        const offset = index - startWeekday + 1;

        if (offset <= 0) {
            const prevDate = new Date(year, month - 2, prevMonthLastDate + offset);
            cells.push({
                key: `prev-${index}`,
                year: prevDate.getFullYear(),
                month: prevDate.getMonth() + 1,
                day: prevDate.getDate(),
                inCurrentMonth: false,
            });
            continue;
        }

        if (offset > daysInMonth) {
            const nextDate = new Date(year, month - 1, offset);
            cells.push({
                key: `next-${index}`,
                year: nextDate.getFullYear(),
                month: nextDate.getMonth() + 1,
                day: nextDate.getDate(),
                inCurrentMonth: false,
            });
            continue;
        }

        cells.push({
            key: `current-${offset}`,
            year,
            month,
            day: offset,
            inCurrentMonth: true,
        });
    }

    return cells;
};

const formatHeader = (year, month) => `${year}.${String(month).padStart(2, '0')}`;

const getMonthKey = (year, month) => `${year}-${month}`;
const HOLIDAY_ASSIGNMENTS_CACHE = {};

const normalizeDayTypeAssignments = (value) => {
    if (!value || typeof value !== 'object') return {};

    return Object.entries(value).reduce((acc, [day, labels]) => {
        if (Array.isArray(labels)) {
            acc[day] = labels;
            return acc;
        }
        if (typeof labels === 'string' && labels) {
            acc[day] = [labels];
        }
        return acc;
    }, {});
};

const getTargetMonths = (year, month) => ([
    new Date(year, month - 2, 1),
    new Date(year, month - 1, 1),
    new Date(year, month, 1),
]);

const getCachedHolidayAssignments = (months) => months.reduce((acc, date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const cacheKey = getMonthKey(year, month);
    if (HOLIDAY_ASSIGNMENTS_CACHE[cacheKey]) {
        acc[cacheKey] = HOLIDAY_ASSIGNMENTS_CACHE[cacheKey];
    }
    return acc;
}, {});

export default function MiniDateCalendar({ selectedDate, onSelectDate, onToday }) {
    const [viewDate, setViewDate] = useState({ y: selectedDate.y, m: selectedDate.m });
    const [holidayAssignments, setHolidayAssignments] = useState(() => {
        return getCachedHolidayAssignments(getTargetMonths(selectedDate.y, selectedDate.m));
    });

    useEffect(() => {
        setViewDate({ y: selectedDate.y, m: selectedDate.m });
    }, [selectedDate.y, selectedDate.m]);

    const today = useMemo(() => {
        const now = new Date();
        return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    }, []);

    const cells = useMemo(() => buildCalendarCells(viewDate.y, viewDate.m), [viewDate.y, viewDate.m]);

    useEffect(() => {
        let cancelled = false;

        const targetMonths = getTargetMonths(viewDate.y, viewDate.m);
        const cachedAssignments = getCachedHolidayAssignments(targetMonths);

        if (Object.keys(cachedAssignments).length > 0) {
            setHolidayAssignments((prev) => ({ ...prev, ...cachedAssignments }));
        }

        const loadHolidayAssignments = async () => {
            const missingMonths = targetMonths.filter((date) => {
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                return !HOLIDAY_ASSIGNMENTS_CACHE[getMonthKey(year, month)];
            });

            if (missingMonths.length === 0) {
                return;
            }

            const entries = await Promise.all(missingMonths.map(async (date) => {
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const stored = await DB.get(`dayTypeAssign_${year}_${month}`);
                const normalized = normalizeDayTypeAssignments(stored);
                const cacheKey = getMonthKey(year, month);
                HOLIDAY_ASSIGNMENTS_CACHE[cacheKey] = normalized;
                return [cacheKey, normalized];
            }));

            if (!cancelled && entries.length > 0) {
                setHolidayAssignments((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
            }
        };

        loadHolidayAssignments();

        return () => {
            cancelled = true;
        };
    }, [viewDate.y, viewDate.m]);

    const moveMonth = (delta) => {
        const nextMonth = new Date(viewDate.y, viewDate.m - 1 + delta, 1);
        setViewDate({ y: nextMonth.getFullYear(), m: nextMonth.getMonth() + 1 });
    };

    return (
        <aside className="mini-date-calendar">
            <div className="mini-date-calendar__header">
                <strong>{formatHeader(viewDate.y, viewDate.m)}</strong>
                <div className="mini-date-calendar__controls">
                    <button type="button" className="mini-date-calendar__nav" onClick={() => moveMonth(-1)} aria-label="이전 달">◀</button>
                    <button type="button" className="mini-date-calendar__nav" onClick={() => moveMonth(1)} aria-label="다음 달">▶</button>
                </div>
            </div>

            <div className="mini-date-calendar__weekdays">
                {DAY_LABELS.map((label, index) => (
                    <span
                        key={label}
                        className={`mini-date-calendar__weekday${index === 0 ? ' is-sunday' : ''}${index === 6 ? ' is-saturday' : ''}`}
                    >
                        {label}
                    </span>
                ))}
            </div>

            <div className="mini-date-calendar__grid">
                {cells.map((cell) => {
                    const isSelected = cell.year === selectedDate.y && cell.month === selectedDate.m && cell.day === selectedDate.d;
                    const isToday = cell.year === today.y && cell.month === today.m && cell.day === today.d;
                    const weekday = new Date(cell.year, cell.month - 1, cell.day).getDay();
                    const monthAssignments = holidayAssignments[getMonthKey(cell.year, cell.month)] || {};
                    const isHoliday = (monthAssignments[cell.day] || []).includes('휴일');

                    return (
                        <button
                            key={cell.key}
                            type="button"
                            className={[
                                'mini-date-calendar__day',
                                cell.inCurrentMonth ? '' : 'is-outside',
                                isSelected ? 'is-selected' : '',
                                isToday ? 'is-today' : '',
                                isHoliday ? 'is-holiday' : '',
                                weekday === 0 ? 'is-sunday' : '',
                                weekday === 6 ? 'is-saturday' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => onSelectDate({ y: cell.year, m: cell.month, d: cell.day })}
                            aria-pressed={isSelected}
                        >
                            <span>{cell.day}</span>
                        </button>
                    );
                })}
            </div>

            <div className="mini-date-calendar__footer">
                <div className="mini-date-calendar__selected-date">
                    {selectedDate.y}/{selectedDate.m}/{selectedDate.d}
                </div>
                <button type="button" className="mini-date-calendar__today" onClick={onToday}>오늘</button>
            </div>
        </aside>
    );
}