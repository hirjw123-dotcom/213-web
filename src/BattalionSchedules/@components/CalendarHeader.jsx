export default function CalendarHeader({ year, month, isCurrentMonth, onPrevMonth, onNextMonth, onToday }) {
    return (
        <div className="bs-header">
            <button className="nav-btn" onClick={onPrevMonth} title="이전 달">◀</button>
            <span className="month-title">{year}년 {String(month).padStart(2, '0')}월</span>
            <button className="nav-btn" onClick={onNextMonth} title="다음 달">▶</button>
            <button
                className={`today-btn${isCurrentMonth ? ' is-current' : ''}`}
                onClick={onToday}
                title="오늘 날짜로 이동"
            >
                오늘
            </button>
            <div className="legend">
                <div className="legend-item">
                    <div className="legend-box daily" />
                    <span>일일</span>
                </div>
                <div className="legend-item">
                    <div className="legend-box weekly" />
                    <span>주간</span>
                </div>
            </div>
        </div>
    );
}
