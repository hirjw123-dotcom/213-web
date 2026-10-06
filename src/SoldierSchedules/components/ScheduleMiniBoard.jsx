
import React, { useState, useEffect } from 'react';
import DB from '../../@modules/db.js';
import { DragItem } from '../../@components/DragItem.jsx';
import BoardPostEditorModal from './BoardPostEditorModal.jsx';

// Generate short random ID
const genId = () => Math.random().toString(36).substring(2, 9);

const DEFAULT_MEMO = {
    id: '',
    text: '',
    color: '#000000',
    bgColor: '#ffffff',
    borderColor: '#cccccc',
    borderWidth: 1,
    useBorder: true,
    fontSize: 16,
    fontWeight: 'normal',
};

const DEFAULT_POST = {
    id: '',
    title: '',
    contentHtml: '',
    createdAt: 0,
    updatedAt: 0,
};

const createMemoDraft = (memo = {}) => ({
    ...DEFAULT_MEMO,
    ...memo,
    borderWidth: Math.min(12, Math.max(0, Number.parseInt(memo.borderWidth, 10) || DEFAULT_MEMO.borderWidth)),
    useBorder: memo.useBorder !== false,
});

const createPostDraft = (post = {}) => ({
    ...DEFAULT_POST,
    ...post,
});

const createBoardItem = (item = {}) => {
    if (item.itemType === 'post') {
        return {
            itemType: 'post',
            ...createPostDraft(item),
        };
    }

    return {
        itemType: 'memo',
        ...createMemoDraft(item),
    };
};

const getPostTextPreview = (html = '') => {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container.textContent.replace(/\s+/g, ' ').trim();
};

function MemoEditor({
    memo,
    onChange,
    onSave,
    onCancel,
    submitLabel,
    btnStyle,
}) {
    const isBold = memo.fontWeight === 'bold' || memo.fontWeight === 700 || memo.fontWeight === '700';
    const borderStyle = memo.useBorder
        ? `${Math.max(0, memo.borderWidth || 0)}px solid ${memo.borderColor || '#ccc'}`
        : '1px solid transparent';

    return (
        <div style={{ borderBottom: '1px solid #ccc', padding: '10px', backgroundColor: '#fcfcfc' }}>
            <textarea
                value={memo.text}
                onChange={(e) => onChange({ ...memo, text: e.target.value })}
                style={{
                    width: '100%',
                    fieldSizing: 'content',
                    minHeight: '5lh',
                    marginBottom: '8px',
                    padding: '6px',
                    boxSizing: 'border-box',
                    border: borderStyle,
                    fontSize: `${memo.fontSize}px`,
                    fontWeight: memo.fontWeight,
                    color: memo.color,
                    backgroundColor: memo.bgColor,
                    outline: 'none',
                    resize: 'vertical',
                }}
                placeholder="메모 작성..."
            />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '10px', alignItems: 'center', fontSize: '12px', color: '#444' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    글자 <input type="color" value={memo.color} onChange={(e) => onChange({ ...memo, color: e.target.value })} style={{ padding: 0, margin: 0, width: '24px', height: '24px', border: '1px solid #ccc', cursor: 'pointer' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    배경 <input type="color" value={memo.bgColor} onChange={(e) => onChange({ ...memo, bgColor: e.target.value })} style={{ padding: 0, margin: 0, width: '24px', height: '24px', border: '1px solid #ccc', cursor: 'pointer' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    테두리색 <input type="color" value={memo.borderColor} onChange={(e) => onChange({ ...memo, borderColor: e.target.value })} disabled={!memo.useBorder} style={{ padding: 0, margin: 0, width: '24px', height: '24px', border: '1px solid #ccc', cursor: memo.useBorder ? 'pointer' : 'not-allowed' }} />
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    폰트 <input type="number" min="10" max="40" value={memo.fontSize} style={{ width: '50px', border: '1px solid #aaa', padding: '2px 4px' }} onChange={(e) => onChange({ ...memo, fontSize: Number.parseInt(e.target.value, 10) || 12 })} /> px
                </label>
                <div
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                    onClick={() => onChange({ ...memo, fontWeight: isBold ? 'normal' : 'bold' })}
                >
                    <input
                        type="checkbox"
                        checked={isBold}
                        readOnly
                        style={{ cursor: 'pointer' }}
                    />
                    <span>굵게</span>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={onSave} style={{ ...btnStyle, flex: 1, backgroundColor: '#217346', color: '#fff', borderColor: '#1e6b41' }}>{submitLabel}</button>
                <button onClick={onCancel} style={btnStyle}>취소</button>
            </div>
        </div>
    );
}

export default function ScheduleMiniBoard({
    id = 'board',
    onCountChange = null,
}) {
    const boardStorageKey = 'schedules_mini_items_' + id;
    const memoStorageKey = 'schedules_mini_' + id;
    const postStorageKey = 'schedules_mini_posts_' + id;
    const boardTitle = ({
        news: '공지사항',
        sug: '건의사항',
    })[id] || '게시판';
    const [boardItems, setBoardItems] = useState([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, itemType: '', item: null });
    const [newMemoDraft, setNewMemoDraft] = useState(createMemoDraft());
    const [editingMemoId, setEditingMemoId] = useState('');
    const [editingMemoDraft, setEditingMemoDraft] = useState(createMemoDraft());
    const [postModalState, setPostModalState] = useState({ visible: false, mode: 'create', post: null });
    const [expandedPostIds, setExpandedPostIds] = useState([]);

    useEffect(() => {
        const loadBoardData = async () => {
            const combinedData = await DB.get(boardStorageKey);
            if (Array.isArray(combinedData)) {
                setBoardItems(combinedData.map(createBoardItem));
                return;
            }

            const [memoData, postData] = await Promise.all([
                DB.get(memoStorageKey),
                DB.get(postStorageKey),
            ]);

            const migratedItems = [
                ...(Array.isArray(postData) ? postData.map((post) => createBoardItem({ ...post, itemType: 'post' })) : []),
                ...(Array.isArray(memoData) ? memoData.map((memo) => createBoardItem({ ...memo, itemType: 'memo' })) : []),
            ];

            setBoardItems(migratedItems);
            if (migratedItems.length > 0) {
                await DB.save(boardStorageKey, migratedItems);
            }
        };
        loadBoardData();

        const handleClickOutside = () => setContextMenu({ visible: false, x: 0, y: 0, itemType: '', item: null });
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [boardStorageKey, memoStorageKey, postStorageKey]);

    useEffect(() => {
        if (typeof onCountChange === 'function') onCountChange(boardItems.length);
    }, [boardItems.length, onCountChange]);

    const saveBoardItemsToDB = async (newList) => {
        setBoardItems(newList);
        await DB.save(boardStorageKey, newList);
    };

    const resetInlineEdit = () => {
        setEditingMemoId('');
        setEditingMemoDraft(createMemoDraft());
    };

    const handleCreateSave = async () => {
        if (!newMemoDraft.text.trim()) return;

        const newMemo = createBoardItem({ ...newMemoDraft, id: genId(), itemType: 'memo' });
        await saveBoardItemsToDB([newMemo, ...boardItems]);
        resetForm();
    };

    const handleEditSave = async () => {
        if (!editingMemoDraft.text.trim() || !editingMemoId) return;

        const newList = boardItems.map((item) => (
            item.itemType === 'memo' && item.id === editingMemoId
                ? createBoardItem({ ...editingMemoDraft, itemType: 'memo' })
                : item
        ));
        await saveBoardItemsToDB(newList);
        resetInlineEdit();
    };

    const handleDelete = async (itemType, itemId) => {
        if (!await confirm('정말 삭제하시겠습니까?')) return;

        const newList = boardItems.filter((item) => !(item.itemType === itemType && item.id === itemId));
        await saveBoardItemsToDB(newList);
        if (itemType === 'post') {
            setExpandedPostIds((prev) => prev.filter((postId) => postId !== itemId));
        }
        if (editingMemoId === itemId) resetInlineEdit();
    };

    const resetForm = () => {
        setNewMemoDraft(createMemoDraft());
        setIsFormVisible(false);
    };

    const handleMemoEditClick = (memo) => {
        setContextMenu({ visible: false, x: 0, y: 0, itemType: '', item: null });
        setIsFormVisible(false);
        setNewMemoDraft(createMemoDraft());
        setEditingMemoId(memo.id);
        setEditingMemoDraft(createMemoDraft(memo));
    };

    const closePostModal = () => {
        setPostModalState({ visible: false, mode: 'create', post: null });
    };

    const handlePostModalSave = async (draft) => {
        const now = Date.now();
        const normalizedDraft = createPostDraft({
            ...draft,
            updatedAt: now,
        });

        if (normalizedDraft.id) {
            const newList = boardItems.map((item) => (
                item.itemType === 'post' && item.id === normalizedDraft.id
                    ? createBoardItem({ ...item, ...normalizedDraft, itemType: 'post' })
                    : item
            ));
            await saveBoardItemsToDB(newList);
            closePostModal();
            return;
        }

        const newPost = createBoardItem({
            ...normalizedDraft,
            id: genId(),
            createdAt: now,
            itemType: 'post',
        });
        await saveBoardItemsToDB([newPost, ...boardItems]);
        closePostModal();
    };

    const handlePostEditClick = (post) => {
        setContextMenu({ visible: false, x: 0, y: 0, itemType: '', item: null });
        setPostModalState({ visible: true, mode: 'edit', post: createPostDraft(post) });
    };

    const handleWriteClick = () => {
        closePostModal();
        resetInlineEdit();
        setNewMemoDraft(createMemoDraft());
        setIsFormVisible(true);
    };

    const handleCreatePostClick = () => {
        setContextMenu({ visible: false, x: 0, y: 0, itemType: '', item: null });
        resetInlineEdit();
        setIsFormVisible(false);
        setPostModalState({ visible: true, mode: 'create', post: createPostDraft() });
    };

    const handleContextMenu = (e, itemType, item) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.pageX,
            y: e.pageY,
            itemType,
            item,
        });
    };

    const handleDrop = (draggedItem, targetItem, position) => {
        const draggedIdx = boardItems.findIndex((item) => item.itemType === draggedItem.itemType && item.id === draggedItem.id);
        const targetIdx = boardItems.findIndex((item) => item.itemType === targetItem.itemType && item.id === targetItem.id);

        if (draggedIdx === -1 || targetIdx === -1) return;

        const reorderedItems = boardItems.filter((item) => !(item.itemType === draggedItem.itemType && item.id === draggedItem.id));
        const adjustedTargetIdx = draggedIdx < targetIdx ? targetIdx - 1 : targetIdx;
        const insertIdx = position === 'before' ? adjustedTargetIdx : adjustedTargetIdx + 1;
        reorderedItems.splice(insertIdx, 0, draggedItem);

        saveBoardItemsToDB(reorderedItems);
    };

    const togglePostExpanded = (postId) => {
        setExpandedPostIds((prev) => (
            prev.includes(postId)
                ? prev.filter((idValue) => idValue !== postId)
                : [postId, ...prev]
        ));
    };

    const handleContextEdit = () => {
        if (!contextMenu.item) return;
        if (contextMenu.itemType === 'post') {
            handlePostEditClick(contextMenu.item);
            return;
        }
        handleMemoEditClick(contextMenu.item);
    };

    const handleContextDelete = async () => {
        if (!contextMenu.item) return;
        const { itemType, item } = contextMenu;
        setContextMenu({ visible: false, x: 0, y: 0, itemType: '', item: null });
        await handleDelete(itemType, item.id);
    };

    const btnStyle = {
        padding: '4px 12px',
        fontSize: '12px',
        cursor: 'pointer',
        border: '1px solid #999',
        backgroundColor: '#f3f3f3',
        color: '#333',
        fontWeight: 'bold',
        outline: 'none'
    };

    const getMemoStyle = (memo, isEditing = false) => ({
        padding: '8px 12px',
        margin: '0',
        color: memo.color,
        backgroundColor: memo.bgColor,
        border: memo.useBorder === false ? '1px solid transparent' : `${memo.borderWidth || 1}px solid ${memo.borderColor || '#ccc'}`,
        borderLeft: memo.useBorder === false ? '4px solid transparent' : `${Math.max(4, memo.borderWidth || 1)}px solid ${memo.borderColor || '#ccc'}`,
        fontSize: `${memo.fontSize}px`,
        fontWeight: memo.fontWeight,
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        cursor: isEditing ? 'default' : 'grab',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        flexShrink: 0,
    });

    const getPostCardStyle = (isExpanded) => ({
        border: isExpanded ? '1px solid #8fa9c2' : '1px solid #bccbda',
        background: isExpanded ? 'linear-gradient(180deg, #ffffff 0%, #f5f9fd 100%)' : '#fff',
        boxShadow: isExpanded ? '0 8px 18px rgba(67, 93, 122, 0.14)' : '0 2px 8px rgba(65, 79, 92, 0.08)',
        cursor: 'pointer',
        overflow: 'hidden',
        flexShrink: 0,
        width: '100%',
        boxSizing: 'border-box',
    });

    const getPostBodyStyle = () => ({
        padding: '0 14px 14px',
        fontSize: '14px',
        color: '#26333f',
        lineHeight: 1.7,
        borderTop: '1px solid #dce5ee',
        background: '#fbfdff',
        overflow: 'visible',
    });

    return (
        <div
            style={{ padding: '0', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#fff', border: '1px solid #ccc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', backgroundColor: '#f3f3f3', borderBottom: '1px solid #ccc' }}>
                <h3 style={{ margin: '0', fontSize: '13px', color: '#333' }}>{boardTitle}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={handleCreatePostClick} style={{ ...btnStyle, backgroundColor: '#1f4c7a', color: '#fff', borderColor: '#193e64' }}>
                        새 게시글
                    </button>
                    {!isFormVisible && (
                        <button onClick={handleWriteClick} style={btnStyle}>
                            새 메모
                        </button>
                    )}
                </div>
            </div>

            {isFormVisible && (
                <MemoEditor
                    memo={newMemoDraft}
                    onChange={setNewMemoDraft}
                    onSave={handleCreateSave}
                    onCancel={resetForm}
                    submitLabel="등록"
                    btnStyle={btnStyle}
                />
            )}

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#eef0f2' }}>
                {boardItems.length === 0 && <div style={{ color: '#888', textAlign: 'center', padding: '20px', fontSize: '13px' }}>작성된 게시글과 메모가 없습니다.</div>}

                {boardItems.map((item, index) => {
                    if (item.itemType === 'post') {
                        const isExpanded = expandedPostIds.includes(item.id);
                        const previewText = getPostTextPreview(item.contentHtml);
                        const content = (
                            <div
                                onClick={() => togglePostExpanded(item.id)}
                                // onDoubleClick={(e) => {
                                //     e.stopPropagation();
                                //     handlePostEditClick(item);
                                // }}
                                onContextMenu={(e) => handleContextMenu(e, 'post', item)}
                                style={getPostCardStyle(isExpanded)}
                            >
                                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '48px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: '#1f4c7a', background: '#e6f0fb', border: '1px solid #c6d9ee' }}>글</span>
                                            <strong style={{ fontSize: '14px', color: '#233140', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</strong>
                                        </div>
                                        <span style={{ flexShrink: 0, fontSize: '18px', lineHeight: 1 }}>{isExpanded ? '▲' : '▼'}</span>
                                    </div>

                                    {!isExpanded && (
                                        <div style={{ fontSize: '12px', color: '#5f6e7f', lineHeight: 1.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {previewText ? previewText.slice(0, 120) + (previewText.length > 120 ? '...' : '') : '내용이 없습니다.'}
                                        </div>
                                    )}
                                </div>

                                {isExpanded && (
                                    <div style={getPostBodyStyle()}>
                                        <div
                                            style={{ paddingTop: '14px', overflow: 'visible' }}
                                            dangerouslySetInnerHTML={{ __html: item.contentHtml }}
                                        />
                                    </div>
                                )}
                            </div>
                        );

                        return (
                            <DragItem
                                key={`post_${item.id}`}
                                groupKey="miniboard"
                                containerId="main"
                                item={item}
                                index={index}
                                onDrop={handleDrop}
                                style={{ flexShrink: 0 }}
                            >
                                {content}
                            </DragItem>
                        );
                    }

                    const isEditing = editingMemoId === item.id;
                    const content = isEditing ? (
                        <div style={getMemoStyle(editingMemoDraft, true)}>
                            <MemoEditor
                                memo={editingMemoDraft}
                                onChange={setEditingMemoDraft}
                                onSave={handleEditSave}
                                onCancel={resetInlineEdit}
                                submitLabel="수정 완료"
                                btnStyle={btnStyle}
                            />
                        </div>
                    ) : (
                        <div
                            onContextMenu={(e) => handleContextMenu(e, 'memo', item)}
                            onDoubleClick={() => handleMemoEditClick(item)}
                            style={getMemoStyle(item)}
                        >
                            {item.text}
                        </div>
                    );

                    if (isEditing) {
                        return <div key={`memo_${item.id}`} style={{ flexShrink: 0 }}>{content}</div>;
                    }

                    return (
                        <DragItem
                            key={`memo_${item.id}`}
                            groupKey="miniboard"
                            containerId="main"
                            item={item}
                            index={index}
                            onDrop={handleDrop}
                            style={{ flexShrink: 0 }}
                        >
                            {content}
                        </DragItem>
                    );
                })}
            </div>

            {contextMenu.visible && (
                <div style={{
                    position: 'fixed',
                    top: contextMenu.y,
                    left: contextMenu.x,
                    backgroundColor: '#fff',
                    border: '1px solid #999',
                    boxShadow: '2px 2px 6px rgba(0,0,0,0.2)',
                    zIndex: 9999,
                    padding: '4px 0',
                    minWidth: '120px',
                    fontSize: '13px',
                    color: '#333'
                }}>
                    <div
                        style={{ padding: '6px 20px', cursor: 'pointer' }}
                        onClick={handleContextEdit}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        수정
                    </div>
                    <div
                        style={{ padding: '6px 20px', cursor: 'pointer', color: '#d32f2f' }}
                        onClick={handleContextDelete}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        삭제
                    </div>
                </div>
            )}

            {postModalState.visible && (
                <BoardPostEditorModal
                    mode={postModalState.mode}
                    initialPost={postModalState.post}
                    onClose={closePostModal}
                    onSave={handlePostModalSave}
                />
            )}
        </div>
    );
}
