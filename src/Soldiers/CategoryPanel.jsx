import { useState, useEffect, useRef } from 'preact/hooks';
import { DEFAULT_CATEGORY_IDS, soldierCategoriesController } from '../@controllers/soldierCategoriesController.js';
import { __controllers } from '../@controllers/__controllers.js';

// 드래그 상태 관리
const catDragState = {
    draggedCat: null,
    sourceIndex: null,
};

// 카테고리 관리 패널
export const CategoryPanel = ({ categories, selectedCategoryIds, setSelectedCategoryIds, onCategoryChange, canEdit = false }) => {
    const [editingId, setEditingId] = useState(null);
    const [dragOverInfo, setDragOverInfo] = useState(null); // { catId, position }

    const addCategory = async () => {
        const newCat = await soldierCategoriesController.add({ label: '새 카테고리' });
        if (newCat) {
            onCategoryChange();
            setEditingId(newCat.id);
        }
    };

    const deleteCategory = async (id) => {
        if (DEFAULT_CATEGORY_IDS.includes(id)) {
            await alert('기본 분류는 삭제할 수 없습니다.');
            return;
        }
        if (await confirm('이 카테고리를 삭제하시겠습니까?')) {
            await soldierCategoriesController.delete(id);
            setSelectedCategoryIds(prev => prev.filter(cid => cid !== id));
            onCategoryChange();
        }
    };

    const toggleCategory = (id) => {
        setSelectedCategoryIds(prev =>
            prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
        );
    };

    const selectAll = () => setSelectedCategoryIds([]);
    const hasFilter = selectedCategoryIds.length > 0;

    // 드래그 핸들러
    const handleDragStart = (e, cat, index) => {
        catDragState.draggedCat = cat;
        catDragState.sourceIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.4';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        catDragState.draggedCat = null;
        catDragState.sourceIndex = null;
        setDragOverInfo(null);
    };

    const handleDragOver = (e, cat, index) => {
        e.preventDefault();
        if (!catDragState.draggedCat || catDragState.draggedCat.id === cat.id) {
            setDragOverInfo(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';
        setDragOverInfo({ catId: cat.id, position });
    };

    const handleDragLeave = () => {
        setDragOverInfo(null);
    };

    const handleDrop = async (e, targetCat, targetIndex) => {
        e.preventDefault();
        const draggedCat = catDragState.draggedCat;
        if (!draggedCat || draggedCat.id === targetCat.id) {
            setDragOverInfo(null);
            return;
        }

        const sourceIdx = catDragState.sourceIndex;
        const insertAfter = sourceIdx < targetIndex;

        // 새로운 순서 계산
        const allCats = [...categories];
        const draggedIdx = allCats.findIndex(c => c.id === draggedCat.id);

        // 배열에서 제거 후 새 위치에 삽입
        allCats.splice(draggedIdx, 1);
        let newIdx = allCats.findIndex(c => c.id === targetCat.id);
        if (insertAfter) newIdx++;
        allCats.splice(newIdx, 0, draggedCat);

        // order 값 재계산 및 저장
        for (let i = 0; i < allCats.length; i++) {
            await soldierCategoriesController.update(allCats[i].id, { order: i });
        }

        setDragOverInfo(null);
        onCategoryChange();
    };

    return (
        <div className="cat-panel">
            <div className="cat-panel-hd">
                <span>📂 분류</span>
                {canEdit && <button className="btn-icon" onClick={addCategory} title="추가">+</button>}
            </div>
            <div className="cat-panel-body">
                <div className={`cat-item ${!hasFilter ? 'active' : ''}`} onClick={selectAll}>
                    <input type="checkbox" checked={!hasFilter} readOnly />
                    <span className="cat-lbl">전체 표시</span>
                </div>
                {categories.map((cat, idx) => {
                    const isDefaultCategory = DEFAULT_CATEGORY_IDS.includes(cat.id);
                    const isOver = dragOverInfo?.catId === cat.id;
                    const overStyle = isOver
                        ? dragOverInfo.position === 'top'
                            ? { borderTop: '3px solid var(--c1)' }
                            : { borderBottom: '3px solid var(--c1)' }
                        : {};

                    return (
                        <div key={cat.id} className="cat-item-wrap">
                            <div
                                className={`cat-item ${selectedCategoryIds.includes(cat.id) ? 'active' : ''}`}
                                style={{ cursor: canEdit ? 'grab' : 'default', ...overStyle }}
                                draggable={canEdit}
                                onDragStart={(e) => handleDragStart(e, cat, idx)}
                                onDragEnd={handleDragEnd}
                                onDragOver={(e) => handleDragOver(e, cat, idx)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, cat, idx)}
                            >
                                <label className='f row aCenter f1' style={{ gap: 4 }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedCategoryIds.includes(cat.id)}
                                        onChange={() => toggleCategory(cat.id)}
                                    />
                                    <span className="cat-color" style={{ background: cat.bg, borderColor: cat.color }} />
                                    <span className="cat-lbl">{cat.label}</span>
                                </label>
                                {!!cat.show_in_cell && <span className="cat-show-in-cell" title="근무일정표 셀 표시 대상">◉</span>}
                                {canEdit && <button
                                    className="btn-icon-xs"
                                    onClick={() => setEditingId(editingId === cat.id ? null : cat.id)}
                                    title="편집"
                                >✎</button>}
                                {canEdit && !isDefaultCategory && <button className="btn-icon-xs del" onClick={() => deleteCategory(cat.id)} title="삭제">×</button>}
                            </div>
                            {editingId === cat.id && (
                                <CategoryEditBox
                                    category={cat}
                                    onSave={() => { setEditingId(null); onCategoryChange(); }}
                                    onClose={() => setEditingId(null)}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};



// 카테고리 편집 박스
const CategoryEditBox = ({ category, onSave, onClose }) => {
    const [label, setLabel] = useState(category.label);
    const [bg, setBg] = useState(category.bg);
    const [color, setColor] = useState(category.color);
    const [showInCell, setShowInCell] = useState(category.show_in_cell ?? (category.id === 'officer' ? false : true));

    const handleSave = async () => {
        await soldierCategoriesController.update(category.id, { label, bg, color, show_in_cell: showInCell });
        onSave();
    };

    return (
        <div className="cat-edit-box">
            <div className="cat-edit-row">
                <label>이름</label>
                <input type="text" value={label} onInput={e => setLabel(e.target.value)} />
            </div>
            <div className="cat-edit-row">
                <label>배경</label>
                <input type="color" value={bg} onInput={e => setBg(e.target.value)} />
                <label>글자</label>
                <input type="color" value={color} onInput={e => setColor(e.target.value)} />
            </div>
            <div className="cat-edit-row">
                <label style={{ minWidth: 64 }}>외부 표시</label>
                <label className="f row aCenter" style={{ gap: 6 }}>
                    <input type="checkbox" checked={showInCell} onChange={e => setShowInCell(e.target.checked)} />
                </label>
            </div>
            <div className="cat-edit-actions">
                <button className="btn-sm" onClick={handleSave}>저장</button>
                <button className="btn-sm secondary" onClick={onClose}>취소</button>
            </div>
        </div>
    );
};
