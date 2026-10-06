import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { authController } from '../@controllers/authController';
import { borderOpsController } from './borderOpsController';
import DocEditorCanvas from './@components/DocEditorCanvas';
import DocEditorSidebar from './@components/DocEditorSidebar';

const clampMarginValue = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(60, Math.round(n)));
};

const normalizeMargin = (margin) => {
    const base = borderOpsController.getDefaultPageMargin();
    return {
        top: clampMarginValue(margin?.top ?? base.top),
        right: clampMarginValue(margin?.right ?? base.right),
        bottom: clampMarginValue(margin?.bottom ?? base.bottom),
        left: clampMarginValue(margin?.left ?? base.left),
    };
};

const normalizeHtmlForDisplay = (html) => {
    if (!html) return '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    wrapper.querySelectorAll('img').forEach((img) => {
        const src = (img.getAttribute('src') || '').trim();
        if (!src) return;
        if (/^file:\/\//i.test(src)) {
            img.remove();
        }
    });
    return wrapper.innerHTML;
};

const stripEditorOnlyImageUi = (root) => {
    root.querySelectorAll('.bo-draggable-image').forEach((box) => {
        box.classList.remove('active');
        box.querySelectorAll('.bo-image-resize-handle').forEach((handle) => handle.remove());

        if (!box.getAttribute('data-bo-image-id')) {
            box.setAttribute('data-bo-image-id', `boimg_${Date.now()}_${Math.floor(Math.random() * 100000)}`);
        }

        const img = box.querySelector('img');
        if (!img) {
            box.remove();
            return;
        }

        box.setAttribute('contenteditable', 'false');
        img.setAttribute('contenteditable', 'false');
        img.draggable = false;
    });
};

const ensureTableIdentity = (table) => {
    if (!table.getAttribute('data-bo-table-id')) {
        table.setAttribute('data-bo-table-id', `botbl_${Date.now()}_${Math.floor(Math.random() * 100000)}`);
    }
    table.classList.add('bo-draggable-table');
};

const stripEditorOnlyTableUi = (root) => {
    root.querySelectorAll('table').forEach((table) => {
        ensureTableIdentity(table);
        table.classList.remove('bo-table-active');
        table.querySelectorAll('.bo-table-drag-handle, .bo-table-resize-handle, .bo-table-delete-btn').forEach((el) => el.remove());
    });
};

const hydrateEditorTableUi = (root) => {
    stripEditorOnlyTableUi(root);
    root.querySelectorAll('table').forEach((table) => {
        ensureTableIdentity(table);

        const dragHandle = document.createElement('span');
        dragHandle.className = 'bo-table-drag-handle';
        dragHandle.setAttribute('contenteditable', 'false');
        dragHandle.title = '표 이동';
        dragHandle.textContent = '↕';

        const resizeHandle = document.createElement('span');
        resizeHandle.className = 'bo-table-resize-handle';
        resizeHandle.setAttribute('contenteditable', 'false');
        resizeHandle.title = '표 크기';

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'bo-table-delete-btn';
        deleteBtn.setAttribute('contenteditable', 'false');
        deleteBtn.title = '표 삭제';
        deleteBtn.textContent = '✕';

        table.appendChild(dragHandle);
        table.appendChild(resizeHandle);
        table.appendChild(deleteBtn);
    });
};

const hydrateEditorImageUi = (root) => {
    stripEditorOnlyImageUi(root);
    root.querySelectorAll('.bo-draggable-image').forEach((box) => {
        const handle = document.createElement('span');
        handle.className = 'bo-image-resize-handle';
        handle.setAttribute('contenteditable', 'false');
        box.appendChild(handle);
    });
};

const makeStoredHtml = (html) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = normalizeHtmlForDisplay(html || '');
    stripEditorOnlyImageUi(wrapper);
    stripEditorOnlyTableUi(wrapper);
    return wrapper.innerHTML;
};

const makeEditorHtml = (html) => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = normalizeHtmlForDisplay(html || '');
    hydrateEditorImageUi(wrapper);
    hydrateEditorTableUi(wrapper);
    return wrapper.innerHTML;
};

const ensureEditorOverlayUi = (root) => {
    root.querySelectorAll('.bo-draggable-image').forEach((box) => {
        if (!box.getAttribute('data-bo-image-id')) {
            box.setAttribute('data-bo-image-id', `boimg_${Date.now()}_${Math.floor(Math.random() * 100000)}`);
        }
        box.setAttribute('contenteditable', 'false');
        const img = box.querySelector('img');
        if (!img) {
            box.remove();
            return;
        }
        img.setAttribute('contenteditable', 'false');
        img.draggable = false;
        if (!box.querySelector('.bo-image-resize-handle')) {
            const handle = document.createElement('span');
            handle.className = 'bo-image-resize-handle';
            handle.setAttribute('contenteditable', 'false');
            box.appendChild(handle);
        }
    });

    root.querySelectorAll('table').forEach((table) => {
        ensureTableIdentity(table);
        const dragHandles = table.querySelectorAll('.bo-table-drag-handle');
        dragHandles.forEach((h, i) => { if (i > 0) h.remove(); });
        const resizeHandles = table.querySelectorAll('.bo-table-resize-handle');
        resizeHandles.forEach((h, i) => { if (i > 0) h.remove(); });
        const deleteBtns = table.querySelectorAll('.bo-table-delete-btn');
        deleteBtns.forEach((h, i) => { if (i > 0) h.remove(); });

        if (!table.querySelector('.bo-table-drag-handle')) {
            const dragHandle = document.createElement('span');
            dragHandle.className = 'bo-table-drag-handle';
            dragHandle.setAttribute('contenteditable', 'false');
            dragHandle.title = '표 이동';
            dragHandle.textContent = '↕';
            table.appendChild(dragHandle);
        }

        if (!table.querySelector('.bo-table-resize-handle')) {
            const resizeHandle = document.createElement('span');
            resizeHandle.className = 'bo-table-resize-handle';
            resizeHandle.setAttribute('contenteditable', 'false');
            resizeHandle.title = '표 크기';
            table.appendChild(resizeHandle);
        }

        if (!table.querySelector('.bo-table-delete-btn')) {
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'bo-table-delete-btn';
            deleteBtn.setAttribute('contenteditable', 'false');
            deleteBtn.title = '표 삭제';
            deleteBtn.textContent = '✕';
            table.appendChild(deleteBtn);
        }
    });
};

const removeImagesFromPastedHtml = (html) => {
    if (!html) return '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;
    wrapper.querySelectorAll('img').forEach((img) => img.remove());
    return wrapper.innerHTML;
};

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onload = (e) => resolve(e.target?.result || null);
    rd.onerror = reject;
    rd.readAsDataURL(file);
});

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const insertHtmlAtCursor = (html) => {
    document.execCommand('insertHTML', false, html);
};

const insertTextAtCursor = (text) => {
    document.execCommand('insertText', false, text);
};

export default function DocEditor() {
    const [allowed, setAllowed] = useState(null); // null = loading
    const [templates, setTemplates] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [activeHtml, setActiveHtml] = useState('');
    const [activeMargin, setActiveMargin] = useState(borderOpsController.getDefaultPageMargin());
    const [pasteMode, setPasteMode] = useState('html');
    const [editingName, setEditingName] = useState(null); // { id, name }
    const [showHelp, setShowHelp] = useState(false);
    const editorRef = useRef(null);
    const saveTimerRef = useRef(null);
    const historyTimerRef = useRef(null);
    const interactionRef = useRef(null);
    const historyRef = useRef({ stack: [], index: -1, applying: false });
    const [selectedImageId, setSelectedImageId] = useState(null);
    const [selectedTableId, setSelectedTableId] = useState(null);

    const applyHistoryHtml = useCallback((storedHtml) => {
        const editor = editorRef.current;
        if (!editor) return;
        historyRef.current.applying = true;
        editor.innerHTML = makeEditorHtml(storedHtml || '');
        ensureEditorOverlayUi(editor);
        setSelectedImageId(null);
        setSelectedTableId(null);
        setActiveHtml(storedHtml || '');
        borderOpsController.saveTemplateHtml(activeId, storedHtml || '');
        setTimeout(() => {
            historyRef.current.applying = false;
        }, 0);
    }, [activeId]);

    const resetHistory = useCallback((storedHtml) => {
        historyRef.current.stack = [storedHtml || ''];
        historyRef.current.index = 0;
        historyRef.current.applying = false;
    }, []);

    const pushHistorySnapshot = useCallback((force = false) => {
        const editor = editorRef.current;
        if (!editor || historyRef.current.applying) return;
        const snapshot = makeStoredHtml(editor.innerHTML);
        const h = historyRef.current;
        const current = h.stack[h.index];
        if (!force && current === snapshot) return;

        if (h.index < h.stack.length - 1) {
            h.stack = h.stack.slice(0, h.index + 1);
        }
        h.stack.push(snapshot);
        if (h.stack.length > 120) {
            h.stack.shift();
        }
        h.index = h.stack.length - 1;
    }, []);

    const scheduleHistorySnapshot = useCallback(() => {
        if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
        historyTimerRef.current = setTimeout(() => {
            pushHistorySnapshot(false);
        }, 300);
    }, [pushHistorySnapshot]);

    const undoHistory = useCallback(() => {
        const h = historyRef.current;
        if (h.index <= 0) return;
        h.index -= 1;
        applyHistoryHtml(h.stack[h.index]);
    }, [applyHistoryHtml]);

    const redoHistory = useCallback(() => {
        const h = historyRef.current;
        if (h.index >= h.stack.length - 1) return;
        h.index += 1;
        applyHistoryHtml(h.stack[h.index]);
    }, [applyHistoryHtml]);

    // 권한 체크
    useEffect(() => {
        (async () => {
            const result = await authController.checkFeaturePermission('borderOps', 'manageTemplate');
            setAllowed(result.allowed);
        })();
    }, []);

    // 양식 목록 로드
    const loadTemplates = useCallback(async () => {
        const list = await borderOpsController.getTemplates();
        setTemplates(list);
        const savedActiveId = await borderOpsController.getActiveTemplateId();
        if (savedActiveId && list.some(t => t.id === savedActiveId)) {
            setActiveId(savedActiveId);
            const tpl = list.find(t => t.id === savedActiveId);
            if (tpl) {
                setActiveHtml(tpl.html);
                setActiveMargin(normalizeMargin(tpl.pageMargin));
            }
        } else if (list.length > 0) {
            setActiveId(list[0].id);
            setActiveHtml(list[0].html);
            setActiveMargin(normalizeMargin(list[0].pageMargin));
        }
    }, []);

    useEffect(() => {
        if (allowed) loadTemplates();
    }, [allowed, loadTemplates]);

    // 양식 선택
    const selectTemplate = useCallback((tpl) => {
        // 기존 양식 저장
        flushSave();
        setSelectedImageId(null);
        setSelectedTableId(null);
        setActiveId(tpl.id);
        setActiveHtml(tpl.html);
        setActiveMargin(normalizeMargin(tpl.pageMargin));
        borderOpsController.setActiveTemplateId(tpl.id);
        if (editorRef.current) {
            editorRef.current.innerHTML = makeEditorHtml(tpl.html);
            ensureEditorOverlayUi(editorRef.current);
            resetHistory(makeStoredHtml(editorRef.current.innerHTML));
        }
    }, [resetHistory]);

    // 자동 저장 (디바운스)
    const scheduleSave = useCallback(() => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            if (!activeId || !editorRef.current) return;
            const html = makeStoredHtml(editorRef.current.innerHTML);
            await borderOpsController.saveTemplateHtml(activeId, html);
            // 로컬 상태도 갱신
            setTemplates(prev => prev.map(t =>
                t.id === activeId ? { ...t, html, updatedAt: Date.now() } : t
            ));
        }, 800);
    }, [activeId]);

    const flushSave = useCallback(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
            saveTimerRef.current = null;
        }
        if (!activeId || !editorRef.current) return;
        const html = makeStoredHtml(editorRef.current.innerHTML);
        borderOpsController.saveTemplateHtml(activeId, html);
    }, [activeId]);

    const handlePaste = useCallback((e) => {
        if (!editorRef.current) return;
        e.preventDefault();

        const plainText = e.clipboardData?.getData('text/plain') || '';

        // 클립보드 이미지 파일은 붙여넣기에서 제거
        const hasClipboardImage = Array.from(e.clipboardData?.items || [])
            .some((item) => item.kind === 'file' && item.type.startsWith('image/'));
        if (hasClipboardImage && !plainText) {
            scheduleSave();
            return;
        }

        if (pasteMode === 'text') {
            insertTextAtCursor(plainText);
            scheduleSave();
            return;
        }

        const html = e.clipboardData?.getData('text/html') || '';
        if (!html) {
            insertTextAtCursor(plainText);
            scheduleSave();
            return;
        }

        const normalized = removeImagesFromPastedHtml(normalizeHtmlForDisplay(html));
        insertHtmlAtCursor(normalized);
        scheduleHistorySnapshot();
        scheduleSave();
    }, [pasteMode, scheduleHistorySnapshot, scheduleSave]);

    const insertImageAt = useCallback((dataUrl, left, top) => {
        const editor = editorRef.current;
        if (!editor || !dataUrl) return;

        const box = document.createElement('div');
        const imageId = `boimg_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
        const width = Math.min(260, Math.max(120, Math.round(editor.clientWidth * 0.35)));
        const height = Math.round(width * 0.75);

        box.className = 'bo-draggable-image';
        box.setAttribute('data-bo-image-id', imageId);
        box.setAttribute('contenteditable', 'false');
        box.style.left = `${clamp(left, 0, Math.max(0, editor.clientWidth - width))}px`;
        box.style.top = `${clamp(top, 0, Math.max(0, editor.clientHeight - height))}px`;
        box.style.width = `${width}px`;
        box.style.height = `${height}px`;

        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = '첨부 이미지';
        img.draggable = false;
        img.setAttribute('contenteditable', 'false');

        const handle = document.createElement('span');
        handle.className = 'bo-image-resize-handle';
        handle.setAttribute('contenteditable', 'false');

        box.appendChild(img);
        box.appendChild(handle);
        editor.appendChild(box);
        setSelectedImageId(imageId);
        pushHistorySnapshot(true);
        scheduleSave();
    }, [pushHistorySnapshot, scheduleSave]);

    const handleDrop = useCallback(async (e) => {
        if (!editorRef.current) return;
        e.preventDefault();

        const files = Array.from(e.dataTransfer?.files || []).filter((f) => f.type.startsWith('image/'));
        if (files.length === 0) return;

        const editor = editorRef.current;
        const rect = editor.getBoundingClientRect();
        const baseLeft = e.clientX - rect.left;
        const baseTop = e.clientY - rect.top;

        for (let i = 0; i < files.length; i += 1) {
            const dataUrl = await readFileAsDataUrl(files[i]);
            if (!dataUrl) continue;
            insertImageAt(dataUrl, baseLeft + (i * 14), baseTop + (i * 14));
        }
    }, [insertImageAt]);

    const handleDragOverEditor = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }, []);

    const handleEditorInput = useCallback(() => {
        if (editorRef.current) ensureEditorOverlayUi(editorRef.current);
        scheduleHistorySnapshot();
        scheduleSave();
    }, [scheduleHistorySnapshot, scheduleSave]);

    useEffect(() => {
        const onPointerMove = (e) => {
            const state = interactionRef.current;
            const editor = editorRef.current;
            if (!state || !editor || !state.el?.isConnected) return;

            const dx = e.clientX - state.startX;
            const dy = e.clientY - state.startY;

            if (state.mode === 'drag') {
                const nextLeft = clamp(state.originLeft + dx, 0, Math.max(0, editor.clientWidth - state.originWidth));
                const nextTop = clamp(state.originTop + dy, 0, Math.max(0, editor.clientHeight - state.originHeight));
                state.el.style.left = `${nextLeft}px`;
                state.el.style.top = `${nextTop}px`;
                return;
            }

            if (state.mode === 'drag-table') {
                const nextLeft = clamp(state.originLeft + dx, 0, Math.max(0, editor.clientWidth - state.originWidth));
                const nextTop = clamp(state.originTop + dy, 0, Math.max(0, editor.clientHeight - state.originHeight));
                state.el.style.left = `${nextLeft}px`;
                state.el.style.top = `${nextTop}px`;
                return;
            }

            if (state.mode === 'resize-table') {
                let nextWidth = state.originWidth + dx;
                nextWidth = clamp(nextWidth, 80, Math.max(80, editor.clientWidth - state.originLeft));
                state.el.style.width = `${Math.round(nextWidth)}px`;
                return;
            }

            let nextWidth = state.originWidth + dx;
            let nextHeight = state.originHeight + dy;

            if (e.shiftKey) {
                nextWidth = state.originWidth + dx;
                nextHeight = nextWidth / state.aspect;
            }

            nextWidth = clamp(nextWidth, 24, Math.max(24, editor.clientWidth - state.originLeft));
            nextHeight = clamp(nextHeight, 24, Math.max(24, editor.clientHeight - state.originTop));

            if (e.shiftKey) {
                const byW = nextWidth / state.aspect;
                if (byW > editor.clientHeight - state.originTop) {
                    nextHeight = Math.max(24, editor.clientHeight - state.originTop);
                    nextWidth = nextHeight * state.aspect;
                } else {
                    nextHeight = byW;
                }
            }

            state.el.style.width = `${Math.round(nextWidth)}px`;
            state.el.style.height = `${Math.round(nextHeight)}px`;
        };

        const onPointerUp = () => {
            if (!interactionRef.current) return;
            interactionRef.current = null;
            pushHistorySnapshot(true);
            scheduleSave();
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        return () => {
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
        };
    }, [pushHistorySnapshot, scheduleSave]);

    const handlePointerDownEditor = useCallback((e) => {
        const editor = editorRef.current;
        if (!editor) return;

        const tableEl = e.target?.closest?.('table.bo-draggable-table');
        if (tableEl && editor.contains(tableEl)) {
            const tableId = tableEl.getAttribute('data-bo-table-id');
            if (tableId) setSelectedTableId(tableId);
            setSelectedImageId(null);

            const isTableDelete = !!e.target?.closest?.('.bo-table-delete-btn');
            if (isTableDelete) {
                tableEl.remove();
                setSelectedTableId(null);
                pushHistorySnapshot(true);
                scheduleSave();
                e.preventDefault();
                return;
            }

            const isTableDrag = !!e.target?.closest?.('.bo-table-drag-handle');
            const isTableResize = !!e.target?.closest?.('.bo-table-resize-handle');
            if (!isTableDrag && !isTableResize) {
                return;
            }

            const rect = tableEl.getBoundingClientRect();
            const editorRect = editor.getBoundingClientRect();
            const currentLeft = parseFloat(tableEl.style.left || `${rect.left - editorRect.left}`) || 0;
            const currentTop = parseFloat(tableEl.style.top || `${rect.top - editorRect.top}`) || 0;
            const currentWidth = parseFloat(tableEl.style.width || `${rect.width}`) || rect.width;
            const currentHeight = parseFloat(tableEl.style.height || `${rect.height}`) || rect.height;

            tableEl.style.position = 'absolute';
            tableEl.style.left = `${currentLeft}px`;
            tableEl.style.top = `${currentTop}px`;
            tableEl.style.width = `${currentWidth}px`;

            interactionRef.current = {
                mode: isTableResize ? 'resize-table' : 'drag-table',
                el: tableEl,
                startX: e.clientX,
                startY: e.clientY,
                originLeft: currentLeft,
                originTop: currentTop,
                originWidth: currentWidth,
                originHeight: currentHeight,
                aspect: currentHeight > 0 ? currentWidth / currentHeight : 1,
            };

            e.preventDefault();
            return;
        }

        const imageBox = e.target?.closest?.('.bo-draggable-image');

        if (!imageBox || !editor.contains(imageBox)) {
            setSelectedImageId(null);
            setSelectedTableId(null);
            return;
        }

        const imageId = imageBox.getAttribute('data-bo-image-id');
        if (imageId) setSelectedImageId(imageId);
        setSelectedTableId(null);

        const isResize = !!e.target?.closest?.('.bo-image-resize-handle');
        const originLeft = parseFloat(imageBox.style.left || '0') || 0;
        const originTop = parseFloat(imageBox.style.top || '0') || 0;
        const originWidth = parseFloat(imageBox.style.width || '100') || 100;
        const originHeight = parseFloat(imageBox.style.height || '100') || 100;

        interactionRef.current = {
            mode: isResize ? 'resize' : 'drag',
            el: imageBox,
            startX: e.clientX,
            startY: e.clientY,
            originLeft,
            originTop,
            originWidth,
            originHeight,
            aspect: originHeight > 0 ? originWidth / originHeight : 1,
        };

        e.preventDefault();
    }, [pushHistorySnapshot, scheduleSave]);

    const handleKeyDownEditor = useCallback((e) => {
        const editor = editorRef.current;
        if (!editor) return;

        const lowerKey = String(e.key || '').toLowerCase();
        const hasMod = e.ctrlKey || e.metaKey;
        if (hasMod && lowerKey === 'z') {
            if (historyTimerRef.current) {
                clearTimeout(historyTimerRef.current);
                historyTimerRef.current = null;
            }
            pushHistorySnapshot(false);
            if (e.shiftKey) {
                redoHistory();
            } else {
                undoHistory();
            }
            e.preventDefault();
            return;
        }
        if (hasMod && lowerKey === 'y') {
            if (historyTimerRef.current) {
                clearTimeout(historyTimerRef.current);
                historyTimerRef.current = null;
            }
            pushHistorySnapshot(false);
            redoHistory();
            e.preventDefault();
            return;
        }

        if (!selectedImageId) return;
        const imageBox = editor.querySelector(`.bo-draggable-image[data-bo-image-id="${selectedImageId}"]`);
        if (!imageBox) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
            imageBox.remove();
            setSelectedImageId(null);
            pushHistorySnapshot(true);
            scheduleSave();
            e.preventDefault();
            return;
        }

        const arrowMap = {
            ArrowLeft: [-1, 0],
            ArrowRight: [1, 0],
            ArrowUp: [0, -1],
            ArrowDown: [0, 1],
        };
        const dir = arrowMap[e.key];
        if (!dir) return;

        const step = e.shiftKey ? 10 : 1;
        const [sx, sy] = dir;

        const left = parseFloat(imageBox.style.left || '0') || 0;
        const top = parseFloat(imageBox.style.top || '0') || 0;
        const width = parseFloat(imageBox.style.width || '100') || 100;
        const height = parseFloat(imageBox.style.height || '100') || 100;

        const nextLeft = clamp(left + (sx * step), 0, Math.max(0, editor.clientWidth - width));
        const nextTop = clamp(top + (sy * step), 0, Math.max(0, editor.clientHeight - height));

        imageBox.style.left = `${nextLeft}px`;
        imageBox.style.top = `${nextTop}px`;
        pushHistorySnapshot(true);
        scheduleSave();
        e.preventDefault();
    }, [pushHistorySnapshot, redoHistory, scheduleSave, selectedImageId, selectedTableId, undoHistory]);

    const handleChangeMargin = useCallback(async (key, value) => {
        if (!activeId) return;
        const next = { ...activeMargin, [key]: clampMarginValue(value) };
        setActiveMargin(next);
        setTemplates(prev => prev.map(t =>
            t.id === activeId ? { ...t, pageMargin: next, updatedAt: Date.now() } : t
        ));
        await borderOpsController.setTemplatePageMargin(activeId, next);
    }, [activeId, activeMargin]);

    // 양식 추가
    const handleAdd = async () => {
        const name = prompt('양식 이름을 입력하세요:');
        if (!name) return;
        const tpl = await borderOpsController.addTemplate(name);
        await loadTemplates();
        selectTemplate(tpl);
    };

    // 양식 삭제
    const handleDelete = async (id) => {
        const tpl = templates.find(t => t.id === id);
        if (!await confirm(`"${tpl?.name}" 양식을 삭제하시겠습니까?`)) return;
        await borderOpsController.deleteTemplate(id);
        if (activeId === id) {
            setActiveId(null);
            setActiveHtml('');
            if (editorRef.current) editorRef.current.innerHTML = '';
        }
        await loadTemplates();
    };

    // 양식 이름 변경
    const handleRename = async (id) => {
        if (!editingName || editingName.id !== id) return;
        await borderOpsController.renameTemplate(id, editingName.name);
        setEditingName(null);
        await loadTemplates();
    };

    const handleDuplicate = async (tpl) => {
        if (!await confirm(`"${tpl.name}" 양식을 복제하시겠습니까?`)) return;
        const newTpl = await borderOpsController.duplicateTemplate(tpl.id, `${tpl.name} 복사`);
        await loadTemplates();
        selectTemplate(newTpl);
    };

    // 에디터에 HTML 세팅
    useEffect(() => {
        if (editorRef.current && activeHtml !== undefined) {
            editorRef.current.innerHTML = makeEditorHtml(activeHtml);
            ensureEditorOverlayUi(editorRef.current);
            resetHistory(makeStoredHtml(editorRef.current.innerHTML));
        }
    }, [activeId, activeHtml, resetHistory]);

    useEffect(() => () => {
        if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const imageBoxes = editor.querySelectorAll('.bo-draggable-image');
        imageBoxes.forEach((el) => {
            const id = el.getAttribute('data-bo-image-id');
            if (id && id === selectedImageId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }, [selectedImageId, activeId]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const tables = editor.querySelectorAll('table.bo-draggable-table');
        tables.forEach((table) => {
            const id = table.getAttribute('data-bo-table-id');
            if (id && id === selectedTableId) {
                table.classList.add('bo-table-active');
            } else {
                table.classList.remove('bo-table-active');
            }
        });
    }, [selectedTableId, activeId]);

    const pageStyle = {
        minHeight: 1123,
        '--bo-margin-top': `${activeMargin.top}mm`,
        '--bo-margin-right': `${activeMargin.right}mm`,
        '--bo-margin-bottom': `${activeMargin.bottom}mm`,
        '--bo-margin-left': `${activeMargin.left}mm`,
    };

    // 권한 로딩 중
    if (allowed === null) {
        return <div className="f wh100p ajCenter" style={{ color: 'var(--c4)' }}>권한 확인 중...</div>;
    }

    // 권한 없음
    if (!allowed) {
        return (
            <div className="f wh100p ajCenter" style={{ color: 'var(--c4)', gap: 8, padding: 40 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>접근 권한이 없습니다</div>
                <div style={{ fontSize: 13 }}>경작서 양식 관리 권한이 필요합니다. 관리자에게 문의하세요.</div>
            </div>
        );
    }

    return (
        <div className="f row wh100p">
            <DocEditorCanvas
                activeId={activeId}
                editorRef={editorRef}
                handleEditorInput={handleEditorInput}
                handlePaste={handlePaste}
                handleDrop={handleDrop}
                handleDragOverEditor={handleDragOverEditor}
                handlePointerDownEditor={handlePointerDownEditor}
                handleKeyDownEditor={handleKeyDownEditor}
                pageStyle={pageStyle}
            />

            <DocEditorSidebar
                templates={templates}
                activeId={activeId}
                handleAdd={handleAdd}
                pasteMode={pasteMode}
                setPasteMode={setPasteMode}
                activeMargin={activeMargin}
                handleChangeMargin={handleChangeMargin}
                editingName={editingName}
                setEditingName={setEditingName}
                selectTemplate={selectTemplate}
                handleRename={handleRename}
                handleDelete={handleDelete}
                handleDuplicate={handleDuplicate}
                selectedImageId={selectedImageId}
                selectedTableId={selectedTableId}
                showHelp={showHelp}
                setShowHelp={setShowHelp}
            />
        </div>
    );
}
