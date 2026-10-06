import { useState, useRef, useEffect } from 'preact/hooks';

// 드래그 그룹 상태 관리 (groupKey별로 공유)
const dragState = {};

const getDragState = (groupKey) => {
    if (!dragState[groupKey]) {
        dragState[groupKey] = {
            draggedItem: null,
            draggedFromId: null,
            sourceIndex: null,
        };
    }
    return dragState[groupKey];
};

/**
 * 드래그 가능한 아이템 컴포넌트
 * @param {Object} props
 * @param {string} props.groupKey - 드래그 그룹 키 (같은 키끼리만 드래그 가능)
 * @param {string} props.containerId - 컨테이너 ID (중대 ID 등)
 * @param {any} props.item - 드래그할 아이템 데이터
 * @param {number} props.index - 현재 인덱스
 * @param {Function} props.onDrop - 드롭 시 콜백 (draggedItem, targetItem, position: 'before'|'after')
 * @param {React.ReactNode} props.children - 자식 요소
 * @param {string} props.className - 추가 클래스명
 */
export const DragItem = ({
    groupKey,
    containerId,
    item,
    index,
    onDrop,
    children,
    className = '',
    style = {},
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOver, setDragOver] = useState(null); // 'top' | 'bottom' | null
    const ref = useRef(null);

    const handleDragStart = (e) => {
        const state = getDragState(groupKey);
        state.draggedItem = item;
        state.draggedFromId = containerId;
        state.sourceIndex = index;

        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ groupKey, containerId, index }));

        // 드래그 이미지 설정
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            e.dataTransfer.setDragImage(ref.current, rect.width / 2, rect.height / 2);
        }
    };

    const handleDragEnd = () => {
        const state = getDragState(groupKey);
        state.draggedItem = null;
        state.draggedFromId = null;
        state.sourceIndex = null;
        setIsDragging(false);
        setDragOver(null);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const state = getDragState(groupKey);
        if (!state.draggedItem || state.draggedItem === item) {
            setDragOver(null);
            return;
        }

        // 마우스 위치에 따라 위/아래 결정
        const rect = ref.current.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';
        setDragOver(position);
    };

    const handleDragLeave = () => {
        setDragOver(null);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const state = getDragState(groupKey);

        if (!state.draggedItem || state.draggedItem === item) {
            setDragOver(null);
            return;
        }

        const position = dragOver === 'top' ? 'before' : 'after';

        onDrop?.(state.draggedItem, item, position, {
            fromContainerId: state.draggedFromId,
            toContainerId: containerId,
        });

        setDragOver(null);
    };

    const dragOverStyle = dragOver === 'top'
        ? { borderTop: '3px solid var(--c1) !important' }
        : dragOver === 'bottom'
            ? { borderBottom: '3px solid var(--c1) !important' }
            : {};

    return (
        <div
            ref={ref}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`drag-item ${isDragging ? 'dragging' : ''} ${className}`}
            style={{
                ...style,
                ...dragOverStyle,
                opacity: isDragging ? 0.4 : 1,
                cursor: 'grab',
            }}
        >
            {children}
        </div>
    );
};

/**
 * 드래그 가능한 빈 드롭존 (빈 컨테이너에 드롭 가능하게)
 */
export const DragDropZone = ({
    groupKey,
    containerId,
    onDrop,
    children,
    className = '',
    style = {},
}) => {
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault();
        const state = getDragState(groupKey);
        if (state.draggedItem) {
            setIsOver(true);
        }
    };

    const handleDragLeave = () => {
        setIsOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const state = getDragState(groupKey);

        if (state.draggedItem) {
            onDrop?.(state.draggedItem, null, 'end', {
                fromContainerId: state.draggedFromId,
                toContainerId: containerId,
            });
        }
        setIsOver(false);
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`drag-drop-zone ${isOver ? 'drag-over' : ''} ${className}`}
            style={{
                ...style,
                background: isOver ? 'rgba(74, 93, 78, 0.1)' : undefined,
            }}
        >
            {children}
        </div>
    );
};
