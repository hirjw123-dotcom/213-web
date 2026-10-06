import { UNITS } from '../../@modules/configs';
import { COMPANY_SCHEDULE_THEMES } from '../themes';

export default function CompanySchedulesHeader({
    year,
    month,
    unit,
    theme,
    onUnitChange,
    onThemeChange,
    onPrevMonth,
    onNextMonth,
    onToday,
    onPrint,
}) {
    return (
        <div className="cs-header">
            <div className="cs-unit-btns">
                {UNITS.map((unitItem) => (
                    <button
                        key={unitItem.id}
                        className={`cs-unit-btn${unit === unitItem.id ? ' active' : ''}`}
                        onClick={() => onUnitChange(unitItem.id)}
                        style={unit === unitItem.id ? { background: unitItem.bg, color: '#000', borderColor: '#999' } : {}}
                    >
                        {unitItem.name}
                    </button>
                ))}
            </div>

            <div className="cs-sep" />

            <div className="cs-theme-btns">
                {COMPANY_SCHEDULE_THEMES.map((themeItem) => (
                    <button
                        key={themeItem.id}
                        className={`cs-theme-btn${theme === themeItem.id ? ' active' : ''}`}
                        onClick={() => onThemeChange(themeItem.id)}
                        title={themeItem.description}
                    >
                        {themeItem.label}
                    </button>
                ))}
            </div>

            <div className="cs-sep" />

            <button className="cs-nav-btn" onClick={onPrevMonth} title="이전 달">◀</button>
            <span className="cs-month-title">{year}년 {String(month).padStart(2, '0')}월</span>
            <button className="cs-nav-btn" onClick={onNextMonth} title="다음 달">▶</button>
            <button className="cs-today-btn" onClick={onToday}>오늘</button>
            <button className="cs-print-btn" onClick={() => onPrint(false)}>🖨 인쇄</button>
            <button className="cs-print-btn" onClick={() => onPrint(true)}>🖨 인쇄 (가로)</button>
        </div>
    );
}
