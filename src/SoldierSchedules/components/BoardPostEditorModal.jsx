import { useEffect, useRef, useState } from 'preact/hooks';

const EDITOR_MODAL_CSS = `
    .board-post-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 10020;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.45);
        padding: 20px;
        box-sizing: border-box;
    }
    .board-post-modal {
        width: min(860px, 100%);
        max-height: calc(100vh - 40px);
        display: flex;
        flex-direction: column;
        background: #ffffff;
        border: 1px solid #aeb7c2;
        box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
        overflow: hidden;
    }
    .board-post-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 12px 16px;
        background: linear-gradient(180deg, #f5f7fa 0%, #e7edf3 100%);
        border-bottom: 1px solid #c5ced8;
    }
    .board-post-modal-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #25313f;
    }
    .board-post-modal-close {
        border: none;
        background: transparent;
        color: #526273;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        padding: 0;
    }
    .board-post-modal-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px 16px 16px;
        overflow: auto;
    }
    .board-post-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .board-post-label {
        font-size: 12px;
        font-weight: 700;
        color: #536171;
    }
    .board-post-title-input {
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        border: 1px solid #aeb7c2;
        font-size: 15px;
        color: #22303d;
    }
    .board-post-title-input:focus,
    .board-post-editor:focus {
        outline: 2px solid rgba(45, 113, 193, 0.22);
        border-color: #2d71c1;
    }
    .board-post-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px 12px;
        border: 1px solid #cfd6de;
        background: #f7f9fb;
    }
    .board-post-toolbar-group {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-right: 8px;
        border-right: 1px solid #d9e0e7;
    }
    .board-post-toolbar-group:last-child {
        padding-right: 0;
        border-right: none;
    }
    .board-post-toolbar button,
    .board-post-toolbar select,
    .board-post-toolbar input[type="color"] {
        height: 30px;
        box-sizing: border-box;
        border: 1px solid #b2bcc7;
        background: #fff;
    }
    .board-post-toolbar button {
        min-width: 32px;
        padding: 0 10px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
        color: #2d3b49;
    }
    .board-post-toolbar select {
        padding: 0 8px;
        font-size: 12px;
        color: #2d3b49;
    }
    .board-post-toolbar input[type="color"] {
        width: 34px;
        padding: 2px;
        cursor: pointer;
    }
    .board-post-editor {
        min-height: 280px;
        padding: 14px 16px;
        border: 1px solid #aeb7c2;
        box-sizing: border-box;
        background: #fff;
        font-size: 15px;
        color: #1f2933;
        line-height: 1.7;
        overflow-wrap: anywhere;
        white-space: pre-wrap;
    }
    .board-post-editor:empty::before {
        content: attr(data-placeholder);
        color: #9aa6b2;
        pointer-events: none;
    }
    .board-post-editor ul {
        margin: 0.35em 0;
        padding-left: 1.4em;
    }
    .board-post-editor p,
    .board-post-editor div {
        margin: 0;
    }
    .board-post-help {
        font-size: 12px;
        color: #697585;
        line-height: 1.6;
    }
    .board-post-modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding-top: 4px;
    }
    .board-post-modal-actions button {
        min-width: 100px;
        padding: 8px 16px;
        border: 1px solid #9da8b4;
        cursor: pointer;
        font-size: 13px;
        font-weight: 700;
    }
    .board-post-modal-actions .primary {
        background: #1d6f42;
        border-color: #185c37;
        color: #fff;
    }
    .board-post-modal-actions .secondary {
        background: #fff;
        color: #334155;
    }
`;

const EMPTY_HTML = '<div><br></div>';
const FONT_SIZE_OPTIONS = [
    { label: '12px', value: '2' },
    { label: '14px', value: '3' },
    { label: '18px', value: '4' },
    { label: '24px', value: '5' },
    { label: '32px', value: '6' },
];

const unwrapElement = (element) => {
    const parent = element.parentNode;
    if (!parent) return;

    while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
    }

    parent.removeChild(element);
};

const sanitizePostHtml = (html = '') => {
    const container = document.createElement('div');
    container.innerHTML = html;

    const allowedTags = new Set(['DIV', 'P', 'BR', 'UL', 'LI', 'SPAN', 'B', 'STRONG', 'U', 'FONT']);
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    const elements = [];

    while (walker.nextNode()) {
        elements.push(walker.currentNode);
    }

    for (const element of elements) {
        if (!allowedTags.has(element.tagName)) {
            unwrapElement(element);
            continue;
        }

        [...element.attributes].forEach((attribute) => {
            const name = attribute.name.toLowerCase();
            if (name === 'style') return;
            if (element.tagName === 'FONT' && (name === 'size' || name === 'color')) return;
            element.removeAttribute(attribute.name);
        });

        if (element.hasAttribute('style')) {
            const nextStyle = [];
            const style = element.style;
            if (style.color) nextStyle.push(`color: ${style.color}`);
            if (style.backgroundColor) nextStyle.push(`background-color: ${style.backgroundColor}`);
            if (style.fontWeight) nextStyle.push(`font-weight: ${style.fontWeight}`);
            if (style.textDecoration) nextStyle.push(`text-decoration: ${style.textDecoration}`);
            if (style.fontSize) nextStyle.push(`font-size: ${style.fontSize}`);
            if (nextStyle.length > 0) element.setAttribute('style', nextStyle.join('; '));
            else element.removeAttribute('style');
        }
    }

    const text = container.textContent.replace(/\u00a0/g, ' ').trim();
    if (!text) return '';
    return container.innerHTML;
};

const normalizeEditorHtml = (html = '') => {
    const sanitized = sanitizePostHtml(html);
    return sanitized || EMPTY_HTML;
};

const selectionBelongsTo = (root) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const anchorNode = selection.anchorNode;
    return !!anchorNode && root.contains(anchorNode);
};

const getCurrentBlock = (root) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.anchorNode;
    if (!node || !root.contains(node)) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element?.closest('div, p, li') || null;
};

const getCurrentListItem = (root) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    const node = selection.anchorNode;
    if (!node || !root.contains(node)) return null;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    return element?.closest('li') || null;
};

export default function BoardPostEditorModal({
    mode = 'create',
    initialPost = null,
    onClose,
    onSave,
}) {
    const [title, setTitle] = useState(initialPost?.title || '');
    const titleInputRef = useRef(null);
    const editorRef = useRef(null);
    const selectionRangeRef = useRef(null);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return undefined;

        document.execCommand('styleWithCSS', false, true);
        editor.innerHTML = normalizeEditorHtml(initialPost?.contentHtml || '');
        setTimeout(() => {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        }, 0);

        const saveSelection = () => {
            if (!selectionBelongsTo(editor)) return;
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;
            selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
        };

        document.addEventListener('selectionchange', saveSelection);
        return () => document.removeEventListener('selectionchange', saveSelection);
    }, [initialPost?.contentHtml]);

    const restoreSelection = () => {
        const editor = editorRef.current;
        const selection = window.getSelection();
        const savedRange = selectionRangeRef.current;
        if (!editor || !selection || !savedRange) return false;
        if (!editor.contains(savedRange.commonAncestorContainer)) return false;

        editor.focus();
        selection.removeAllRanges();
        selection.addRange(savedRange);
        return true;
    };

    const syncSelectionSnapshot = () => {
        const editor = editorRef.current;
        if (!editor || !selectionBelongsTo(editor)) return;
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
    };

    const runCommand = (command, value = null) => {
        const editor = editorRef.current;
        if (!editor) return;
        restoreSelection();
        document.execCommand('styleWithCSS', false, true);
        document.execCommand(command, false, value);
        syncSelectionSnapshot();
    };

    const handleToolbarMouseDown = (event) => {
        event.preventDefault();
    };

    const handleSave = async () => {
        const editor = editorRef.current;
        const nextTitle = title.trim();
        const contentHtml = sanitizePostHtml(editor?.innerHTML || '');
        const contentText = editor?.textContent?.replace(/\u00a0/g, ' ').trim() || '';

        if (!nextTitle || !contentText) {
            await alert('제목과 내용을 모두 입력해주세요.');
            return;
        }

        await onSave({
            ...initialPost,
            title: nextTitle,
            contentHtml,
        });
    };

    const handleKeyDown = (event) => {
        const editor = editorRef.current;
        if (!editor) return;

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
            event.preventDefault();
            void handleSave();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
            return;
        }

        if (event.key === ' ' && !event.shiftKey) {
            const currentBlock = getCurrentBlock(editor);
            if (currentBlock && !currentBlock.closest('ul, ol') && currentBlock.textContent.trim() === '-') {
                event.preventDefault();
                currentBlock.textContent = '';
                runCommand('insertUnorderedList');
                return;
            }
        }

        if (event.key === 'Enter' && event.shiftKey) {
            const currentItem = getCurrentListItem(editor);
            if (currentItem) {
                event.preventDefault();
                runCommand('insertLineBreak');
                return;
            }
        }

        if (event.key === 'Backspace') {
            const currentItem = getCurrentListItem(editor);
            if (currentItem && currentItem.textContent.replace(/\u00a0/g, ' ').trim() === '') {
                event.preventDefault();
                runCommand('outdent');
            }
        }
    };

    const handlePaste = (event) => {
        event.preventDefault();
        const text = event.clipboardData?.getData('text/plain') || '';
        runCommand('insertText', text);
    };

    return (
        <div className="board-post-modal-overlay" onClick={onClose}>
            <style>{EDITOR_MODAL_CSS}</style>
            <div className="board-post-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <div className="board-post-modal-header">
                    <h3 className="board-post-modal-title">{mode === 'edit' ? '게시글 수정' : '새 게시글'}</h3>
                    <button type="button" className="board-post-modal-close" onClick={onClose}>×</button>
                </div>

                <div className="board-post-modal-body">
                    <div className="board-post-field">
                        <label className="board-post-label">제목</label>
                        <input
                            ref={titleInputRef}
                            className="board-post-title-input"
                            value={title}
                            onInput={(event) => setTitle(event.currentTarget.value)}
                            placeholder="제목을 입력하세요"
                        />
                    </div>

                    <div className="board-post-field">
                        <label className="board-post-label">내용</label>

                        <div className="board-post-toolbar">
                            <div className="board-post-toolbar-group">
                                <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => runCommand('bold')}>B</button>
                                <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => runCommand('underline')} style={{ textDecoration: 'underline' }}>U</button>
                                <button type="button" onMouseDown={handleToolbarMouseDown} onClick={() => runCommand('insertUnorderedList')}>- 목록</button>
                            </div>

                            <div className="board-post-toolbar-group">
                                <select defaultValue="" onChange={(event) => {
                                    if (!event.currentTarget.value) return;
                                    runCommand('fontSize', event.currentTarget.value);
                                    event.currentTarget.value = '';
                                }}>
                                    <option value="">글씨크기</option>
                                    {FONT_SIZE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="board-post-toolbar-group">
                                <span style={{ fontSize: '12px', color: '#536171', fontWeight: 700 }}>글자</span>
                                <input type="color" defaultValue="#222222" onInput={(event) => runCommand('foreColor', event.currentTarget.value)} />
                            </div>

                            <div className="board-post-toolbar-group">
                                <span style={{ fontSize: '12px', color: '#536171', fontWeight: 700 }}>배경</span>
                                <input type="color" defaultValue="#fff59d" onInput={(event) => runCommand('hiliteColor', event.currentTarget.value)} />
                            </div>
                        </div>

                        <div
                            ref={editorRef}
                            className="board-post-editor"
                            contentEditable
                            suppressContentEditableWarning
                            data-placeholder="내용을 입력하세요"
                            onKeyDown={handleKeyDown}
                            onKeyUp={syncSelectionSnapshot}
                            onMouseUp={syncSelectionSnapshot}
                            onPaste={handlePaste}
                        />
                    </div>


                    <div className="board-post-modal-actions">
                        <button type="button" className="secondary" onClick={onClose}>취소</button>
                        <button type="button" className="primary" onClick={handleSave}>{mode === 'edit' ? '수정 저장' : '등록'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}