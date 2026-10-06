import { useEffect, useRef, useState } from 'preact/hooks';

const EDGE_PADDING = 12;
const DRAG_THRESHOLD = 4;
const OVERLAY_CLICK_SUPPRESS_MS = 220;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getViewportPosition = (element, position = null) => {
    if (!element) {
        return { left: EDGE_PADDING, top: EDGE_PADDING };
    }

    const rect = element.getBoundingClientRect();
    const maxLeft = Math.max(EDGE_PADDING, window.innerWidth - rect.width - EDGE_PADDING);
    const maxTop = Math.max(EDGE_PADDING, window.innerHeight - rect.height - EDGE_PADDING);

    if (!position) {
        return {
            left: clamp((window.innerWidth - rect.width) / 2, EDGE_PADDING, maxLeft),
            top: clamp((window.innerHeight - rect.height) / 2, EDGE_PADDING, maxTop),
        };
    }

    return {
        left: clamp(position.left, EDGE_PADDING, maxLeft),
        top: clamp(position.top, EDGE_PADDING, maxTop),
    };
};

export function useDraggableHistoryModal() {
    const modalRef = useRef(null);
    const dragRef = useRef(null);
    const suppressOverlayCloseUntilRef = useRef(0);
    const [position, setPosition] = useState(null);

    useEffect(() => {
        const handlePointerMove = (event) => {
            if (!dragRef.current || !modalRef.current) return;

            const deltaX = event.clientX - dragRef.current.startX;
            const deltaY = event.clientY - dragRef.current.startY;
            if (!dragRef.current.moved && (Math.abs(deltaX) >= DRAG_THRESHOLD || Math.abs(deltaY) >= DRAG_THRESHOLD)) {
                dragRef.current.moved = true;
            }

            const nextPosition = getViewportPosition(modalRef.current, {
                left: dragRef.current.left + deltaX,
                top: dragRef.current.top + deltaY,
            });

            setPosition(nextPosition);
        };

        const finishDrag = () => {
            if (!dragRef.current) return;
            if (dragRef.current.moved) {
                suppressOverlayCloseUntilRef.current = Date.now() + OVERLAY_CLICK_SUPPRESS_MS;
            }
            dragRef.current = null;
            document.body.style.userSelect = '';
        };

        const handleResize = () => {
            if (!modalRef.current || !position) return;
            setPosition((current) => getViewportPosition(modalRef.current, current));
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', finishDrag);
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', finishDrag);
            window.removeEventListener('resize', handleResize);
            document.body.style.userSelect = '';
        };
    }, [position]);

    const handleHeaderPointerDown = (event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (event.target.closest('button')) return;
        if (!modalRef.current) return;

        const rect = modalRef.current.getBoundingClientRect();
        const nextPosition = getViewportPosition(modalRef.current, {
            left: rect.left,
            top: rect.top,
        });
        dragRef.current = {
            startX: event.clientX,
            startY: event.clientY,
            left: nextPosition.left,
            top: nextPosition.top,
            moved: false,
        };
        setPosition(nextPosition);
        document.body.style.userSelect = 'none';
        event.currentTarget?.setPointerCapture?.(event.pointerId);
        event.preventDefault();
    };

    const handleOverlayClick = (event, onClose) => {
        if (Date.now() < suppressOverlayCloseUntilRef.current) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        onClose();
    };

    return {
        modalRef,
        modalStyle: position
            ? {
                position: 'fixed',
                left: `${position.left}px`,
                top: `${position.top}px`,
                margin: 0,
            }
            : {
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                margin: 0,
            },
        handleOverlayClick,
        headerProps: {
            onPointerDown: handleHeaderPointerDown,
        },
    };
}