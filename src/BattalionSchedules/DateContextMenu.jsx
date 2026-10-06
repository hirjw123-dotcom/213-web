import { useEffect, useRef } from 'preact/hooks';
import { dateContextMenuCss } from './css/dateContextMenuCss.js';

export default function DateContextMenu({
    x,
    y,
    date,
    isHoliday,
    isWeekend,
    onToggleHoliday,
    onClose,
}) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    // 메뉴가 화면 밖으로 나가지 않도록 위치 조정
    const adjustedX = Math.min(x, window.innerWidth - 200);
    const adjustedY = Math.min(y, window.innerHeight - 100);

    const dateStr = new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });

    return (
        <>
            <style>{dateContextMenuCss}</style>
            <div className="date-ctx-overlay" onClick={onClose} />
            <div
                ref={menuRef}
                className="date-ctx-menu"
                style={{ left: adjustedX, top: adjustedY }}
            >
                <div className="ctx-header">{dateStr}</div>
                {isWeekend ? (
                    <div className="ctx-item disabled">
                        <span className="icon">🔒</span>
                        <span>주말은 자동 휴일</span>
                    </div>
                ) : (
                    <div
                        className={`ctx-item ${isHoliday ? 'holiday' : ''}`}
                        onClick={() => {
                            onToggleHoliday(date);
                            onClose();
                        }}
                    >
                        <span className="icon">{isHoliday ? '❌' : '🔴'}</span>
                        <span>{isHoliday ? '휴일 해제' : '휴일로 지정'}</span>
                    </div>
                )}
            </div>
        </>
    );
}
