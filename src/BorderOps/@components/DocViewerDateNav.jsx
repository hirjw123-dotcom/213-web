export default function DocViewerDateNav({
    dateText,
    dateValue,
    isToday,
    onPrev,
    onNext,
    onToday,
    onDateChange,
    showPrint,
    onCopyAll,
    onPrint,
}) {
    return (
        <div className="f row aCenter jCenter bo-date-nav">
            <button className="date-nav-btn" onClick={onPrev} title="이전 날짜">◀</button>
            <div className="f row aCenter" style={{ gap: 8, minWidth: 200, justifyContent: 'center' }}>
                <span className="date-text">{dateText}</span>
                {isToday && <span className="today-badge">오늘</span>}
            </div>
            <input
                type="date"
                className="date-picker-input"
                value={dateValue}
                onInput={(e) => onDateChange(e.currentTarget.value)}
                title="날짜 선택"
                aria-label="날짜 선택"
            />
            <button className="date-nav-btn" onClick={onNext} title="다음 날짜">▶</button>
            {/* {!isToday && (
                <button style={{ fontSize: 11, padding: '2px 8px', marginLeft: 8 }} onClick={onToday}>오늘</button>
            )} */}

            {showPrint && (
                <>
                    <button
                        style={{ marginLeft: 12, fontSize: 12, padding: '3px 10px' }}
                        onClick={onPrint}
                        title="인쇄"
                    >🖨 인쇄</button>
                    <button
                        style={{ marginLeft: 6, fontSize: 12, padding: '3px 10px' }}
                        onClick={onCopyAll}
                        title="전체 복사"
                    >전체 복사</button>
                </>
            )}
        </div>
    );
}
