import React, { useLayoutEffect, useRef } from 'react';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const isToday = (date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
};

const resizeTextarea = (textarea) => {
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
};

export default function CalendarTable({
    weeks,
    holidays,
    dailySchedules,
    weeklySchedules,
    canEditDaily,
    canEditWeekly,
    onContextMenu,
    onDailyChange,
    onWeeklyChange,
    formatDateKey,
}) {
    const textareaRefs = useRef({});

    useLayoutEffect(() => {
        Object.values(textareaRefs.current).forEach(resizeTextarea);
    }, [dailySchedules, weeks]);

    const setTextareaRef = (dateKey, node) => {
        if (!node) {
            delete textareaRefs.current[dateKey];
            return;
        }

        textareaRefs.current[dateKey] = node;
        resizeTextarea(node);
    };

    return (
        <div className="bs-body">
            <div className="bs-body-inner">
                <table className="bs-calendar">
                    <thead>
                        <tr>
                            {WEEKDAY_NAMES.map((name, idx) => (
                                <th
                                    key={idx}
                                    className={idx === 0 ? 'sunday' : idx === 6 ? 'saturday' : ''}
                                >
                                    {name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {weeks.map((week, weekIdx) => (
                            <React.Fragment key={week.weekKey || `week-${weekIdx}`}>
                                <tr key={`dates-${weekIdx}`}>
                                    {week.days.map((dayInfo, dayIdx) => {
                                        const dayOfWeek = dayInfo.date.getDay();
                                        const isSunday = dayOfWeek === 0;
                                        const isSaturday = dayOfWeek === 6;
                                        const isWeekend = isSunday || isSaturday;
                                        const key = formatDateKey(dayInfo.date);
                                        const isCustomHoliday = !!holidays[key];
                                        const isTodayCell = isToday(dayInfo.date);

                                        let cellClass = 'day-cell';
                                        if (!dayInfo.isCurrentMonth) cellClass += ' other-month';
                                        if (isSunday) cellClass += ' sunday';
                                        if (isSaturday) cellClass += ' saturday';
                                        if (isWeekend) cellClass += ' weekend';
                                        if (isCustomHoliday && !isWeekend) cellClass += ' holiday';
                                        if (isTodayCell) cellClass += ' today';

                                        return (
                                            <td
                                                key={dayIdx}
                                                className={cellClass}
                                                onContextMenu={(e) => onContextMenu(e, dayInfo.date)}
                                            >
                                                <div className="day-cell-top">
                                                    <span className="day-num">{dayInfo.day}</span>
                                                    {isCustomHoliday && !isWeekend && (
                                                        <span className="holiday-badge">휴일</span>
                                                    )}
                                                </div>
                                                <div className="day-input-wrap">
                                                    <textarea
                                                        ref={(node) => setTextareaRef(key, node)}
                                                        className="day-input"
                                                        placeholder="일정 입력"
                                                        value={dailySchedules[key]?.text || ''}
                                                        readOnly={!canEditDaily}
                                                        onInput={(e) => resizeTextarea(e.target)}
                                                        onChange={(e) => onDailyChange(dayInfo.date, e.target.value)}
                                                    />
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                                <tr key={`weekly-${weekIdx}`} className="week-schedule-row">
                                    <td colSpan={7} className="week-summary-cell">
                                        <div className="week-panel">
                                            <div className="week-panel-meta">
                                                <span className="week-label-pill">{week.weekNum}주차</span>
                                                <span className="week-range-text">{week.weekRangeText}</span>
                                                <span className="week-panel-title">주간 일정</span>
                                            </div>
                                            <div className="week-input-shell">
                                                <input
                                                    type="text"
                                                    placeholder="이번 주 공통 일정 입력"
                                                    className="week-input"
                                                    value={weeklySchedules[week.weekKey]?.text || ''}
                                                    readOnly={!canEditWeekly}
                                                    onChange={(e) => onWeeklyChange(
                                                        week.weekKey,
                                                        week.weekYear,
                                                        week.weekNum,
                                                        e.target.value,
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
