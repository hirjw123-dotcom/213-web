import { useEffect, useRef, useState } from 'preact/hooks';

export default function CellContextMenu({
    x,
    y,
    title,
    items = [],
}) {
    const [position, setPosition] = useState({ x, y });
    const dragStateRef = useRef(null);

    useEffect(() => {
        setPosition({ x, y });
    }, [x, y]);

    useEffect(() => {
        const handleMouseMove = (event) => {
            if (!dragStateRef.current) return;
            const { offsetX, offsetY } = dragStateRef.current;
            setPosition({ x: event.clientX - offsetX, y: event.clientY - offsetY });
        };

        const handleMouseUp = () => {
            dragStateRef.current = null;
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const handleDragStart = (event) => {
        dragStateRef.current = {
            offsetX: event.clientX - position.x,
            offsetY: event.clientY - position.y,
        };
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div
            className="schedule-cell-context-menu"
            style={{ left: position.x, top: position.y }}
            onClick={(e) => e.stopPropagation()}
        >
            {title && <div className="schedule-cell-context-menu-header" onMouseDown={handleDragStart}>{title}</div>}

            {items.map((item, index) => {
                if (item?.divider) {
                    return <div key={item.key || `divider_${index}`} className="schedule-cell-context-menu-divider" />;
                }

                return (
                    <button
                        key={item.key || item.label || `item_${index}`}
                        type="button"
                        className="schedule-cell-context-menu-item"
                        onClick={item.onClick}
                        disabled={item.disabled}
                    >
                        <div className={`schedule-cell-context-menu-swatch${item.swatchClass ? ` ${item.swatchClass}` : ''}`} style={item.swatchStyle}>
                            {item.swatch || item.label}
                        </div>
                        <div className="schedule-cell-context-menu-copy">
                            <div className="schedule-cell-context-menu-label">{item.label}</div>
                            {item.description && <div className="schedule-cell-context-menu-description">{item.description}</div>}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
