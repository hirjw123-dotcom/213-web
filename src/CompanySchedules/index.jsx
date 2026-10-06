import MonthCalendar from './MonthCalendar';
import OptionManage from './OptionManage';
import CompanySchedulesHeader from './@components/CompanySchedulesHeader';
import CompanyFilterPanel from './@components/CompanyFilterPanel';
import CompanyWeekPanel from './@components/CompanyWeekPanel';
import useCompanySchedulesState from './@hooks/useCompanySchedulesState';
import { companySchedulesCss } from './css/companySchedulesCss';
import { UNITS } from '../@modules/configs';

// ======================== 메인 ========================

export default function CompanySchedules() {
    const {
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
    } = useCompanySchedulesState();
    const unitName = UNITS.find((unitItem) => unitItem.id === unit)?.name || '';

    return (
        <div className={`company-schedules cs-theme-${theme}`}>
            <style>{companySchedulesCss}</style>

            <CompanySchedulesHeader
                year={year}
                month={month}
                unit={unit}
                theme={theme}
                onUnitChange={v => {
                    localStorage.setItem('companySchedulesLastUnit', v);
                    setUnit(v);
                }}
                onThemeChange={setTheme}
                onPrevMonth={prevMonth}
                onNextMonth={nextMonth}
                onToday={goToday}
                onPrint={handlePrint}
            />

            {/* 본문 */}
            <div className="cs-body">
                <div className="cs-main">
                    <MonthCalendar
                        key={`${calKey}-${refreshKey}`}
                        y={year}
                        m={month}
                        unit={unit}
                        unitName={unitName}
                        calRef={calRef}
                        filters={filters}
                        theme={theme}
                        selectedWeekKeys={selectedWeekKeys}
                    />
                    <div style={{
                        marginTop: 20,
                        fontSize: 12,
                        color: '#444',
                        textAlign: 'center',
                    }}>날짜를 우클릭하면 "중대외출"로 지정할 수 있습니다.</div>
                </div>
                <div className="cs-sidebar">
                    <OptionManage key={calKey} y={year} m={month} unit={unit} onEventsChange={handleEventsChange} />
                    <CompanyFilterPanel filters={filters} setFilters={setFilters} />
                    <CompanyWeekPanel
                        weekOptions={weekOptions}
                        selectedWeekKeys={selectedWeekKeys}
                        setSelectedWeekKeys={setSelectedWeekKeys}
                    />
                </div>
            </div>
        </div>
    );
}
