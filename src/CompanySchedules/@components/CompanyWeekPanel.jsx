export default function CompanyWeekPanel({ weekOptions, selectedWeekKeys, setSelectedWeekKeys }) {
    const selectedSet = new Set(selectedWeekKeys);

    const toggleWeek = (weekKey) => {
        setSelectedWeekKeys((prev) => (
            prev.includes(weekKey)
                ? prev.filter((key) => key !== weekKey)
                : [...prev, weekKey]
        ));
    };

    const selectCurrentMonthWeeks = () => {
        setSelectedWeekKeys(weekOptions
            .filter((week) => week.containsCurrentMonth)
            .map((week) => week.weekKey));
    };

    const selectAllWeeks = () => {
        setSelectedWeekKeys(weekOptions.map((week) => week.weekKey));
    };

    return (
        <div className="cs-week-panel">
            <h3 className="cs-week-title">표시할 주차</h3>
            <div className="cs-week-actions">
                <button type="button" className="cs-week-action-btn" onClick={selectCurrentMonthWeeks}>이번달만</button>
                <button type="button" className="cs-week-action-btn" onClick={selectAllWeeks}>전체</button>
            </div>
            <div className="cs-week-list">
                {weekOptions.map((week) => (
                    <label key={week.weekKey} className="cs-week-item">
                        <input
                            type="checkbox"
                            checked={selectedSet.has(week.weekKey)}
                            onChange={() => toggleWeek(week.weekKey)}
                        />
                        <span className={`cs-week-item-badge${week.containsCurrentMonth ? ' is-current-month' : ''}`}>
                            {week.weekNum}주차
                        </span>
                        <span className="cs-week-item-range">{week.weekRangeText || week.weekKey}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}