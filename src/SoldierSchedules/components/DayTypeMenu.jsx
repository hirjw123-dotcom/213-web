export default function DayTypeMenu({
    x,
    y,
    dayTypes,
    dayTypeSelectedDays,
    getIsChecked,
    onToggleLabel,
    onClearAll,
    onOpenDayHistory,
}) {
    return (
        <div className="day-type-menu" style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
            {dayTypes.map((dayType) => (
                <div key={dayType.label} className="day-type-menu-item" onClick={() => onToggleLabel(dayType.label)}>
                    <div className="dt-swatch" style={{ background: dayType.bg || '#fff' }} />
                    <span style={{
                        color: dayType.color || '#000',
                        fontWeight: dayType.bold ? 'bold' : 'normal',
                    }}>{dayType.label}</span>
                    {dayType.applyAll && <span style={{ fontSize: 10, color: '#999', marginLeft: 'auto' }}>전체적용</span>}
                    <span className="day-type-check">{getIsChecked(dayType.label) ? '✓' : ''}</span>
                </div>
            ))}
            <div className="day-type-menu-divider" />
            <div className="day-type-menu-item" onClick={onClearAll}>
                <div className="dt-swatch" style={{ background: '#fff' }} />
                <span style={{ color: '#999' }}>해제</span>
            </div>
            {dayTypeSelectedDays.length === 1 && (
                <>
                    <div className="day-type-menu-divider" />
                    <div className="day-type-menu-item" onClick={onOpenDayHistory}>
                        <span style={{ fontSize: 14 }}>📋</span>
                        <span style={{ color: '#1976d2' }}>히스토리 보기</span>
                    </div>
                </>
            )}
        </div>
    );
}
