import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { cctvOrderController } from '../../@controllers/cctvOrderController.js';
import { soldiersController } from '../../@controllers/soldiersController.js';
import { soldierCategoriesController } from '../../@controllers/soldierCategoriesController.js';
import { calcServiceDays } from '../../@modules/dates.js';
import { cctvOrderPanelCss } from './css/cctvOrderPanelCss.js';

export default function CctvOrderPanel({ onClose, canEdit = false, soldiers: visibleSoldiers = null }) {
    const [soldiers, setSoldiers] = useState([]);
    const [orderMap, setOrderMap] = useState({});
    const [sorted, setSorted] = useState([]);
    const [categories, setCategories] = useState([]);
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);
    const listRef = useRef(null);

    const load = useCallback(async () => {
        const hasProvidedSoldiers = Array.isArray(visibleSoldiers);
        const [allSoldiers, savedOrder, cats] = await Promise.all([
            hasProvidedSoldiers ? Promise.resolve(null) : soldiersController.get(),
            cctvOrderController.get(),
            soldierCategoriesController.get(),
        ]);

        setCategories(cats);

        const sourceSoldiers = hasProvidedSoldiers ? visibleSoldiers : (allSoldiers || []);
        const valid = sourceSoldiers.filter((soldier) => !soldier.categories?.includes('officer'));

        setSoldiers(valid);
        setOrderMap(savedOrder || {});

        // 정렬: order가 있는 용사는 order순, 없는 용사는 남은 날짜 적은 순
        const ordered = valid.filter(s => savedOrder?.[s.id] != null)
            .sort((a, b) => savedOrder[a.id] - savedOrder[b.id]);
        const unordered = valid.filter(s => savedOrder?.[s.id] == null)
            .sort((a, b) => {
                const aNeed = a.categories?.includes('cctv-need') ? 1 : 0;
                const bNeed = b.categories?.includes('cctv-need') ? 1 : 0;
                if (aNeed !== bNeed) return aNeed - bNeed;
                const remA = calcServiceDays.remaining(a.exitDate);
                const remB = calcServiceDays.remaining(b.exitDate);
                return remA - remB;
            });

        setSorted([...ordered, ...unordered]);
    }, [visibleSoldiers]);

    useEffect(() => { load(); }, [load]);

    // 드래그 앤 드롭으로 순서 변경 후 저장
    const saveOrder = async (newSorted) => {
        if (!canEdit) return;
        const newMap = {};
        newSorted.forEach((s, i) => {
            newMap[s.id] = i;
        });
        setOrderMap(newMap);
        setSorted(newSorted);
        await cctvOrderController.save(newMap);
    };

    // --- 드래그 핸들러 ---
    const handleDragStart = (e, idx) => {
        if (!canEdit) return;
        setDragIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(idx));
        // 투명도
        requestAnimationFrame(() => {
            if (e.target) e.target.style.opacity = '0.4';
        });
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        setDragIdx(null);
        setDragOverIdx(null);
    };

    const handleDragOver = (e, idx) => {
        if (!canEdit) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (idx !== dragOverIdx) setDragOverIdx(idx);
    };

    const handleDrop = (e, targetIdx) => {
        if (!canEdit) return;
        e.preventDefault();
        const sourceIdx = dragIdx;
        if (sourceIdx == null || sourceIdx === targetIdx) return;

        const newList = [...sorted];
        const [moved] = newList.splice(sourceIdx, 1);
        newList.splice(targetIdx, 0, moved);
        saveOrder(newList);
        setDragIdx(null);
        setDragOverIdx(null);
    };

    const getRankLabel = (rank) => {
        const ranks = { '이등병': '이병', '이병': '이병', '일병': '일병', '상병': '상병', '병장': '병장' };
        return ranks[rank] || rank;
    };

    const getRankColor = (rank) => {
        const colors = {
            '이병': { bg: '#e8eaf6', color: '#3949ab' },
            '이등병': { bg: '#e8eaf6', color: '#3949ab' },
            '일병': { bg: '#e8f5e9', color: '#2e7d32' },
            '상병': { bg: '#fff3e0', color: '#e65100' },
            '병장': { bg: '#fce4ec', color: '#c62828' },
        };
        return colors[rank] || { bg: '#e0e0e0', color: '#555' };
    };

    const getCategoryLabels = (soldier) => {
        if (!soldier.categories || soldier.categories.length === 0) return [];
        return soldier.categories
            .filter(catId => catId !== 'officer')
            .map(catId => categories.find(c => c.id === catId))
            .filter(cat => !!cat?.show_in_cell)
            .filter(Boolean);
    };

    // 합격 순 초기화: cctv-need 후순위, 남은 복무일 적은 순으로 재정렬
    const resetToDefaultOrder = async () => {
        if (!canEdit) return;
        const newSorted = [...sorted].sort((a, b) => {
            const aNeed = a.categories?.includes('cctv-need') ? 1 : 0;
            const bNeed = b.categories?.includes('cctv-need') ? 1 : 0;
            if (aNeed !== bNeed) return aNeed - bNeed;
            const remA = calcServiceDays.remaining(a.exitDate);
            const remB = calcServiceDays.remaining(b.exitDate);
            return remA - remB;
        });
        await saveOrder(newSorted);
    };

    const getRemainingDays = (s) => {
        if (!s.exitDate) return '-';
        return calcServiceDays.remaining(s.exitDate);
    };

    return (
        <div className="cctv-order-panel">
            <style>{cctvOrderPanelCss}</style>

            <div className="cctv-header">
                <span>📹 CCTV 합격 순서</span>
                {onClose && <button className="cctv-header-close" onClick={onClose} title="닫기">✕</button>}
            </div>
            <div className="cctv-subtitle">
                <span>드래그하여 순서 변경</span>
                <button className="cctv-reset-btn" onClick={resetToDefaultOrder} disabled={!canEdit}>복무율 정렬</button>
            </div>

            <div className="cctv-list" ref={listRef}>
                {sorted.length === 0 && (
                    <div className="cctv-empty">표시할 용사가 없습니다.</div>
                )}
                {sorted.map((s, idx) => {
                    const remaining = getRemainingDays(s);
                    const isBeingDragged = dragIdx === idx;
                    const isOver = dragOverIdx === idx;
                    const overClass = isOver
                        ? (dragIdx != null && dragIdx < idx ? 'drag-over-bottom' : 'drag-over-top')
                        : '';
                    const rankColor = getRankColor(s.rank);
                    const catLabels = getCategoryLabels(s);

                    return (
                        <div
                            key={s.id}
                            className={`cctv-item ${isBeingDragged ? 'dragging' : ''} ${overClass}`}
                            draggable={canEdit}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, idx)}
                            onDrop={(e) => handleDrop(e, idx)}
                        >
                            <div className="cctv-drag-handle">⠿</div>
                            <div className="cctv-rank-num">{idx + 1}</div>
                            <span className="cctv-rank-badge" style={{ zoom: 1.1 }}>{getRankLabel(s.rank)}</span>
                            <span className="cctv-name" style={{ zoom: 1.1 }}>{s.name}</span>
                            <span className="cctv-remaining">D-{remaining}</span>
                            {catLabels.length > 0 && (
                                <div className="cctv-categories">
                                    {catLabels.map(cat => (
                                        <span key={cat.id} className="cctv-cat-tag" style={{
                                            background: cat.bg || '#eee', color: cat.color || '#333'
                                        }}>
                                            {cat.label}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
