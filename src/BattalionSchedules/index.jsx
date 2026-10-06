import CalendarHeader from './@components/CalendarHeader.jsx';
import CalendarTable from './@components/CalendarTable.jsx';
import useBattalionSchedulesData from './@hooks/useBattalionSchedulesData.jsx';
import DateContextMenu from './DateContextMenu.jsx';
import { battalionSchedulesCss } from './css/battalionSchedulesCss.js';

export default function BattalionSchedules() {
    const {
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
    } = useBattalionSchedulesData();

    if (loading) {
        return <div className="f ajCenter wh100p"><div className="spinner" /></div>;
    }

    return (
        <div className="battalion-schedules">
            <style>{battalionSchedulesCss}</style>

            <CalendarHeader
                year={year}
                month={month}
                isCurrentMonth={isCurrentMonth}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onToday={goToToday}
            />

            <CalendarTable
                weeks={weeks}
                holidays={holidays}
                dailySchedules={dailySchedules}
                weeklySchedules={weeklySchedules}
                canEditDaily={canEditDaily}
                canEditWeekly={canEditWeekly}
                onContextMenu={handleContextMenu}
                onDailyChange={handleDailyChange}
                onWeeklyChange={handleWeeklyChange}
                formatDateKey={formatDateKey}
            />

            {/* 컨텍스트 메뉴 */}
            {contextMenu && (
                <DateContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    date={contextMenu.date}
                    isHoliday={contextMenu.isHoliday}
                    isWeekend={contextMenu.isWeekend}
                    onToggleHoliday={handleToggleHoliday}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}