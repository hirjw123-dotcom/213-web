import { useState, useEffect, useRef } from 'preact/hooks';
import { soldiersController } from '../@controllers/soldiersController.js';
import { soldierCategoriesController } from '../@controllers/soldierCategoriesController.js';
import { authController } from '../@controllers/authController.js';
import { UNITS } from '../@modules/configs.js';
import { calcServiceDays, arrToDate } from '../@modules/dates.js';
import ModalPopup from '../@components/ModalPopup.jsx';
import { __controllers } from '../@controllers/__controllers.js';
import FromExcel from './FromExcel.jsx';
import { CategoryPanel } from './CategoryPanel.jsx';
import { EditSoldier } from './EditSoldier/index.jsx';
import { downloadTableAsExcelFile } from '../@modules/sheetExport.js';
import SoldierProgressBar from './@components/SoldierProgressBar.jsx';
import SoldierCategoryBadge from './@components/SoldierCategoryBadge.jsx';
import { soldiersPageCss } from './css/soldiersPageCss.js';

// 드래그 상태 관리
const soldierDragState = {
    draggedSoldier: null,
    sourceUnitId: null,
    sourceIndex: null,
};

const formatDate = (arr) => {
    if (!arr) return '-';
    return `${arr[0]}.${String(arr[1]).padStart(2, '0')}.${String(arr[2]).padStart(2, '0')}`;
};


// 월 필터 함수: 해당 y/m에 1일 이상 복무한 용사인지 판별
const isSoldierInMonth = (soldier, year, month) => {
    // 해당 월의 시작일, 마지막일
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // 해당 월의 마지막 날

    const joinDate = arrToDate(soldier.joinDate || soldier.startDate);
    const exitDate = arrToDate(soldier.exitDate);
    if (!joinDate || !exitDate) return false;

    // 전입일이 해당 월 이후여야 하는 게 아니라, 해당 월 이하여야 함
    // 전역일이 해당 월 이전이면 안 됨
    // → 전입일 <= monthEnd && 전역일 >= monthStart
    return joinDate <= monthEnd && exitDate >= monthStart;
};

// 메인 컴포넌트
export default function SoldiersPage() {
    const now = new Date();
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [showDischarged, setShowDischarged] = useState(false);
    const [soldiers, setSoldiers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [canManageSoldiers, setCanManageSoldiers] = useState(false);
    const [canManageCategories, setCanManageCategories] = useState(false);
    const [soldierContextMenu, setSoldierContextMenu] = useState(null); // { soldier, x, y }

    const goToPrevMonth = () => {
        setSelectedMonth(m => {
            if (m === 1) { setSelectedYear(y => y - 1); return 12; }
            return m - 1;
        });
    };
    const goToNextMonth = () => {
        setSelectedMonth(m => {
            if (m === 12) { setSelectedYear(y => y + 1); return 1; }
            return m + 1;
        });
    };
    const goToCurrentMonth = () => {
        const n = new Date();
        setSelectedYear(n.getFullYear());
        setSelectedMonth(n.getMonth() + 1);
    };

    const loadData = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        const [soldierList, catList] = await Promise.all([
            soldiersController.get(),
            soldierCategoriesController.get()
        ]);
        setSoldiers(soldierList.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)));
        setCategories(catList.sort((a, b) => a.order - b.order));
        if (showLoading) setLoading(false);
    };

    useEffect(() => {
        loadData(true);
        authController.checkFeaturePermission('soldiers', 'manageSoldiers').then(r => setCanManageSoldiers(r.allowed));
        authController.checkFeaturePermission('soldiers', 'manageCategories').then(r => setCanManageCategories(r.allowed));
    }, []);

    useEffect(() => {
        const handleGlobalClick = () => setSoldierContextMenu(null);
        const handleEsc = (e) => { if (e.key === 'Escape') setSoldierContextMenu(null); };
        window.addEventListener('click', handleGlobalClick);
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('click', handleGlobalClick);
            window.removeEventListener('keydown', handleEsc);
        };
    }, []);

    const openFromExcel = () => {
        if (!canManageSoldiers) return;
        ModalPopup.push(<FromExcel existingSoldiers={soldiers} onComplete={() => { goToCurrentMonth(); loadData(); }} />);
    };

    const exportToSheet = async () => {
        const table = document.querySelector('.soldiers-page .sol-table');
        const result = await downloadTableAsExcelFile(table, {
            fileName: `용사목록_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.xls`,
            title: `${selectedYear}년 ${String(selectedMonth).padStart(2, '0')}월 용사목록`,
        });
        await alert(result.message);
    };

    const openEditSoldier = (soldier) => {
        // if (!canManageSoldiers) return; // 열기는 해도 되게
        ModalPopup.push(<EditSoldier soldier={soldier} onSave={loadData} />);
    };

    const canToggleCategories = canManageSoldiers || canManageCategories;

    const openSoldierContextMenu = (e, soldier) => {
        e.preventDefault();
        e.stopPropagation();

        const menuW = 210;
        const menuH = 360;
        let x = e.clientX;
        let y = e.clientY;

        if (x + menuW > window.innerWidth - 8) x = window.innerWidth - menuW - 8;
        if (y + menuH > window.innerHeight - 8) y = window.innerHeight - menuH - 8;
        if (x < 8) x = 8;
        if (y < 8) y = 8;

        setSoldierContextMenu({ soldier, x, y });
    };

    const toggleSoldierCategoryFromMenu = async (soldier, categoryId) => {
        if (!canToggleCategories) return;
        const prevCats = soldier.categories || [];
        const nextCats = prevCats.includes(categoryId)
            ? prevCats.filter((id) => id !== categoryId)
            : [...prevCats, categoryId];

        const updated = { ...soldier, categories: nextCats };
        setSoldiers((prev) => prev.map((item) => item.id === soldier.id ? updated : item));
        await soldiersController.save(updated, soldier.id);
        setSoldierContextMenu((prev) => prev ? { ...prev, soldier: updated } : prev);
    };

    const addNewSoldier = (unitId) => {
        if (!canManageSoldiers) return;
        const newSoldier = soldiersController.createDraft({
            unit: unitId,
            rank: '이병',
        });
        ModalPopup.push(
            <EditSoldier
                soldier={newSoldier}
                isNew
                onSave={() => {
                    goToCurrentMonth();
                    loadData();
                }}
            />
        );
    };

    const sortUnitByCurrentService = async (unitId, unitName) => {
        if (!canManageSoldiers) return;

        const targetIndexes = [];
        const targetSoldiers = [];

        soldiers.forEach((soldier, index) => {
            if (soldier.unit === unitId || soldier.unit === unitName) {
                targetIndexes.push(index);
                targetSoldiers.push(soldier);
            }
        });

        if (targetSoldiers.length < 2) return;

        const sortedUnitSoldiers = [...targetSoldiers].sort((a, b) => {
            const diff = calcServiceDays.current(b.startDate) - calcServiceDays.current(a.startDate);
            if (diff !== 0) return diff;
            return (a.order ?? 9999) - (b.order ?? 9999);
        });

        const nextSoldiers = [...soldiers];
        targetIndexes.forEach((arrayIndex, i) => {
            nextSoldiers[arrayIndex] = sortedUnitSoldiers[i];
        });

        const reordered = nextSoldiers.map((soldier, order) => ({ ...soldier, order }));
        setSoldiers(reordered);

        for (const soldier of reordered) {
            await soldiersController.save(soldier, soldier.id);
        }
    };

    // 드래그 핸들러
    const [dragOverInfo, setDragOverInfo] = useState(null); // { soldierId, position }

    const handleDragStart = (e, soldier, unitId, index) => {
        soldierDragState.draggedSoldier = soldier;
        soldierDragState.sourceUnitId = unitId;
        soldierDragState.sourceIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.target.style.opacity = '0.4';
    };

    const handleDragEnd = (e) => {
        e.target.style.opacity = '1';
        soldierDragState.draggedSoldier = null;
        soldierDragState.sourceUnitId = null;
        soldierDragState.sourceIndex = null;
        setDragOverInfo(null);
    };

    const handleDragOver = (e, soldier, unitId, index) => {
        e.preventDefault();
        if (!soldierDragState.draggedSoldier || soldierDragState.draggedSoldier.id === soldier.id) {
            setDragOverInfo(null);
            return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'top' : 'bottom';
        setDragOverInfo({ soldierId: soldier.id, position });
    };

    const handleDragLeave = () => {
        setDragOverInfo(null);
    };

    const handleDrop = async (e, targetSoldier, targetUnitId, targetIndex) => {
        e.preventDefault();
        const draggedSoldier = soldierDragState.draggedSoldier;
        if (!draggedSoldier || draggedSoldier.id === targetSoldier.id) {
            setDragOverInfo(null);
            return;
        }

        // 드래그 방향에 따른 위치 결정
        const sourceIdx = soldierDragState.sourceIndex;
        const sameUnit = soldierDragState.sourceUnitId === targetUnitId;
        let insertAfter = sameUnit ? (sourceIdx < targetIndex) : (dragOverInfo?.position === 'bottom');

        // 새로운 순서 계산 및 저장
        const allSoldiers = [...soldiers];
        const draggedIdx = allSoldiers.findIndex(s => s.id === draggedSoldier.id);
        const targetIdx = allSoldiers.findIndex(s => s.id === targetSoldier.id);

        // 드래그된 용사의 중대 변경
        const updatedDragged = { ...allSoldiers[draggedIdx], unit: targetUnitId };

        // 배열에서 제거 후 새 위치에 삽입
        allSoldiers.splice(draggedIdx, 1);
        let newIdx = allSoldiers.findIndex(s => s.id === targetSoldier.id);
        if (insertAfter) newIdx++;
        allSoldiers.splice(newIdx, 0, updatedDragged);

        // order 값 재계산
        const reordered = allSoldiers.map((s, i) => ({ ...s, order: i }));

        // 상태 먼저 업데이트 (스크롤 위치 유지)
        setSoldiers(reordered);
        setDragOverInfo(null);

        // DB에 저장 (백그라운드)
        for (const s of reordered) {
            await soldiersController.save(s, s.id);
        }
    };

    // 빈 중대에 드랍
    const [emptyUnitOver, setEmptyUnitOver] = useState(null); // unitId

    const handleEmptyDragOver = (e, unitId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (soldierDragState.draggedSoldier) {
            setEmptyUnitOver(unitId);
        }
    };

    const handleEmptyDragLeave = () => {
        setEmptyUnitOver(null);
    };

    const handleDropToEmptyUnit = async (e, targetUnitId) => {
        e.preventDefault();
        const draggedSoldier = soldierDragState.draggedSoldier;
        if (!draggedSoldier) {
            setEmptyUnitOver(null);
            return;
        }

        // 중대 변경
        const updatedSoldier = { ...draggedSoldier, unit: targetUnitId };

        // 상태 먼저 업데이트 (스크롤 위치 유지)
        setSoldiers(prev => prev.map(s => s.id === draggedSoldier.id ? updatedSoldier : s));
        setEmptyUnitOver(null);

        // DB에 저장 (백그라운드)
        await soldiersController.save(updatedSoldier, draggedSoldier.id);
    };

    const getCategoriesForSoldier = (soldier) => {
        if (!soldier.categories || soldier.categories.length === 0) return [];
        return soldier.categories.map(catId => categories.find(c => c.id === catId)).filter(Boolean);
    };

    // 월 기준 필터 + 카테고리 필터
    const monthFiltered = soldiers.filter(s => isSoldierInMonth(s, selectedYear, selectedMonth));

    // 전역자 토글: showDischarged가 false이면, 해당 월 마지막일 기준 남은일 0인 용사 제거
    const dischargeFiltered = showDischarged
        ? monthFiltered
        : monthFiltered.filter(s => {
            const rem = calcServiceDays.remaining(s.exitDate, null, true);
            return rem >= 0;
        });

    const filteredSoldiers = selectedCategoryIds.length === 0
        ? dischargeFiltered
        : dischargeFiltered.filter(s => s.categories && s.categories.some(catId => selectedCategoryIds.includes(catId)));

    // 중대별 용사 그룹화
    const soldiersByUnit = UNITS.map(unit => {
        const unitSoldiers = filteredSoldiers.filter(s => s.unit === unit.id || s.unit === unit.name);
        let avgPercent = 0;
        if (unitSoldiers.length > 0) {
            const totalPct = unitSoldiers.reduce((sum, s) => sum + calcServiceDays.percentage(s.startDate, s.exitDate), 0);
            avgPercent = Math.round(totalPct / unitSoldiers.length);
        }
        return { unit, soldiers: unitSoldiers, avgPercent };
    });

    // 미소속 용사
    const unassignedSoldiers = filteredSoldiers.filter(
        s => !s.unit || !UNITS.some(u => u.id === s.unit || u.name === s.unit)
    );
    let unassignedAvg = 0;
    if (unassignedSoldiers.length > 0) {
        const totalPct = unassignedSoldiers.reduce((sum, s) => sum + calcServiceDays.percentage(s.startDate, s.exitDate), 0);
        unassignedAvg = Math.round(totalPct / unassignedSoldiers.length);
    }

    if (loading) {
        return <div className="f ajCenter wh100p"><div className="spinner" /></div>;
    }

    let globalIndex = 0;

    return (
        <div className="soldiers-page">
            <style>{soldiersPageCss}</style>

            {/* 툴바 */}
            <div className="soldiers-toolbar">
                {canManageSoldiers && <button onClick={openFromExcel}>📋 엑셀에서 가져오기</button>}
                <button className="secondary" onClick={loadData}>🔄 새로고침</button>
                <button className="secondary" onClick={exportToSheet}>시트로 내보내기</button>
                <div className="spacer" />
                <div className="date-selector">
                    <button onClick={goToPrevMonth}>◀</button>
                    <span className="date-label" onClick={goToCurrentMonth} title="현재 달로 이동">
                        {selectedYear}년 {String(selectedMonth).padStart(2, '0')}월
                    </span>
                    <button onClick={goToNextMonth}>▶</button>
                </div>
                <div className="spacer" />
                <label className="discharged-toggle">
                    <input
                        type="checkbox"
                        checked={showDischarged}
                        onChange={(e) => setShowDischarged(e.target.checked)}
                    />
                    전역자 표시
                </label>
            </div>

            {/* 본문 영역 */}
            <div className="soldiers-body">
                {/* 중앙 메인 */}
                <div className="soldiers-main">
                    {soldiers.length === 0 && 0 ? (
                        <div className="empty-state-mini">
                            <div className="icon">👤</div>
                            <div className="text">등록된 용사가 없습니다.</div>
                            <button onClick={openFromExcel}>엑셀에서 가져오기</button>
                        </div>
                    ) : (
                        <div className="soldiers-scroll">
                            <table className="sol-table">
                                <thead>
                                    <tr>
                                        <th className="sticky c-num">#</th>
                                        <th className="sticky c-rank">계급</th>
                                        <th className="sticky c-name">이름</th>
                                        <th className="c-date">입대일</th>
                                        <th className="c-date">전역일</th>
                                        <th className="c-days chdqhran">총복무</th>
                                        <th className="c-days gusqhran">현복무</th>
                                        <th className="c-days skadmsdlf">남은일</th>
                                        <th className="c-prog">복무율</th>
                                        <th className="c-join">전입일</th>
                                        <th className="c-join-days">전입경과</th>
                                        <th className="c-cat">분류</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {soldiersByUnit.map(({ unit, soldiers: unitSoldiers, avgPercent }) => (
                                        <>
                                            {/* 중대 구분 행 */}
                                            <tr key={`unit-${unit.id}`} className="unit-row">
                                                <td colSpan="12">
                                                    <div className="unit-info">
                                                        <span>{unit.name}</span>
                                                        <span className="unit-avg">평균 {avgPercent}%</span>
                                                        <span className="unit-cnt">{unitSoldiers.length}명</span>
                                                        {canManageSoldiers && <button
                                                            className="btn-add-soldier"
                                                            onClick={(e) => { e.stopPropagation(); sortUnitByCurrentService(unit.id, unit.name); }}
                                                            title="현복무 높은 순 정렬"
                                                        >
                                                            정렬하기
                                                        </button>}
                                                        {canManageSoldiers && <button
                                                            className="btn-add-soldier"
                                                            onClick={(e) => { e.stopPropagation(); addNewSoldier(unit.id); }}
                                                            title="새 용사 추가"
                                                        >
                                                            + 용사 추가
                                                        </button>}
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* 용사 행 */}
                                            {unitSoldiers.length === 0 ? (
                                                <tr
                                                    className="empty-row"
                                                    style={{
                                                        '--unit-bg': emptyUnitOver === unit.id ? unit.bg : '#eee',
                                                        background: emptyUnitOver === unit.id ? 'rgba(74, 93, 78, 0.3)' : undefined,
                                                    }}
                                                    onDragOver={(e) => handleEmptyDragOver(e, unit.id)}
                                                    onDragLeave={handleEmptyDragLeave}
                                                    onDrop={(e) => handleDropToEmptyUnit(e, unit.id)}
                                                >
                                                    <td colSpan="12" style={{ textAlign: 'center', padding: '20px' }}>
                                                        {emptyUnitOver === unit.id ? '📥 여기에 드롭하여 이동' : '등록된 용사 없음'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                unitSoldiers.map((s, idx) => {
                                                    globalIndex++;
                                                    const totalDays = calcServiceDays.total(s.startDate, s.exitDate);
                                                    const currentDays = calcServiceDays.current(s.startDate);
                                                    const remainingDays = calcServiceDays.remaining(s.exitDate);
                                                    const percentage = calcServiceDays.percentage(s.startDate, s.exitDate);
                                                    const soldierCats = getCategoriesForSoldier(s);
                                                    const joinDays = calcServiceDays.current(s.joinDate || s.startDate);
                                                    const isDischarged = remainingDays === 0;
                                                    const isOver = dragOverInfo?.soldierId === s.id;
                                                    const overStyle = isOver
                                                        ? dragOverInfo.position === 'top'
                                                            ? { borderTop: '1px dotted var(--c1)' }
                                                            : { borderBottom: '1px dotted var(--c1)' }
                                                        : {};

                                                    const tdStyle = {
                                                        borderTop: '1px solid var(--unit-bg)',
                                                        borderBottom: '1px solid #000',

                                                        ...overStyle,
                                                    };

                                                    return (
                                                        <tr
                                                            key={s.id + '/' + unitSoldiers.length + '/' + idx}
                                                            className={`soldier-row${isDischarged ? ' discharged' : ''}`}
                                                            style={{ '--unit-bg': unit.bg, cursor: canManageSoldiers || 1 ? 'pointer' : 'default', }}
                                                            draggable={canManageSoldiers}
                                                            onDragStart={(e) => handleDragStart(e, s, unit.id, idx)}
                                                            onDragEnd={handleDragEnd}
                                                            onDragOver={(e) => handleDragOver(e, s, unit.id, idx)}
                                                            onDragLeave={handleDragLeave}
                                                            onDrop={(e) => handleDrop(e, s, unit.id, idx)}
                                                            onClick={() => openEditSoldier(s)}
                                                            onContextMenu={(e) => openSoldierContextMenu(e, s)}
                                                        >
                                                            <td style={tdStyle} className="sticky c-num">{globalIndex}</td>
                                                            <td style={tdStyle} className="sticky c-rank">{s.rank}</td>
                                                            <td style={tdStyle} className="sticky c-name">{s.name}</td>
                                                            <td style={tdStyle} className="c-date">{formatDate(s.startDate)}</td>
                                                            <td style={tdStyle} className="c-date">{formatDate(s.exitDate)}</td>
                                                            <td style={tdStyle} className="c-days chdqhran">{totalDays}</td>
                                                            <td style={tdStyle} className="c-days gusqhran">{currentDays}</td>
                                                            <td style={tdStyle} className="c-days skadmsdlf">{remainingDays}</td>
                                                            <td style={tdStyle} className="c-prog">
                                                                <SoldierProgressBar percent={percentage} />
                                                            </td>
                                                            <td style={tdStyle} className="c-join">{formatDate(s.joinDate || s.startDate)}</td>
                                                            <td style={tdStyle} className="c-join-days">{joinDays}일</td>
                                                            <td style={tdStyle} className="c-cat">
                                                                <div className="cat-badges">
                                                                    {soldierCats.map(cat => (
                                                                        <SoldierCategoryBadge key={cat.id} category={cat} />
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                            {/* <tr
                                            >
                                                <td colSpan="12" style={{
                                                    border: 0,
                                                    height: 20,
                                                    background: '#fff',
                                                }}></td>
                                            </tr> */}
                                        </>
                                    ))}

                                    {/* 미소속 */}
                                    {unassignedSoldiers.length > 0 && (
                                        <>
                                            <tr className="unit-row">
                                                <td colSpan="12">
                                                    <div className="unit-info">
                                                        <span>미소속</span>
                                                        <span className="unit-avg">평균 {unassignedAvg}%</span>
                                                        <span className="unit-cnt">{unassignedSoldiers.length}명</span>
                                                    </div>
                                                </td>
                                            </tr>
                                            {unassignedSoldiers.map((s, idx) => {
                                                globalIndex++;
                                                const totalDays = calcServiceDays.total(s.startDate, s.exitDate);
                                                const currentDays = calcServiceDays.current(s.startDate);
                                                const remainingDays = calcServiceDays.remaining(s.exitDate);
                                                const percentage = calcServiceDays.percentage(s.startDate, s.exitDate);
                                                const soldierCats = getCategoriesForSoldier(s);
                                                const joinDays = calcServiceDays.current(s.joinDate || s.startDate);
                                                const isOver = dragOverInfo?.soldierId === s.id;
                                                const overStyle = isOver
                                                    ? dragOverInfo.position === 'top'
                                                        ? { borderTop: '3px solid var(--c1)' }
                                                        : { borderBottom: '3px solid var(--c1)' }
                                                    : {};

                                                return (
                                                    <tr
                                                        key={s.id}
                                                        className="soldier-row"
                                                        style={{ '--unit-bg': '#e0e0e0', cursor: canManageSoldiers ? 'grab' : 'default', ...overStyle }}
                                                        draggable={canManageSoldiers}
                                                        onDragStart={(e) => handleDragStart(e, s, null, idx)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={(e) => handleDragOver(e, s, null, idx)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, s, null, idx)}
                                                        onClick={() => openEditSoldier(s)}
                                                        onContextMenu={(e) => openSoldierContextMenu(e, s)}
                                                    >
                                                        <td className="sticky c-num">{globalIndex}</td>
                                                        <td className="sticky c-rank">{s.rank}</td>
                                                        <td className="sticky c-name">{s.name}</td>
                                                        <td className="c-date">{formatDate(s.startDate)}</td>
                                                        <td className="c-date">{formatDate(s.exitDate)}</td>
                                                        <td className="c-days">{totalDays}</td>
                                                        <td className="c-days">{currentDays}</td>
                                                        <td className="c-days">{remainingDays}</td>
                                                        <td className="c-prog">
                                                            <SoldierProgressBar percent={percentage} />
                                                        </td>
                                                        <td className="c-cat">
                                                            <div className="cat-badges">
                                                                {soldierCats.map(cat => (
                                                                    <SoldierCategoryBadge key={cat.id} category={cat} />
                                                                ))}
                                                            </div>
                                                        </td>
                                                        <td className="c-join">{formatDate(s.joinDate || s.startDate)}</td>
                                                        <td className="c-join-days">{joinDays}일</td>
                                                    </tr>
                                                );
                                            })}
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 우측 카테고리 패널 */}
                <CategoryPanel
                    categories={categories}
                    selectedCategoryIds={selectedCategoryIds}
                    setSelectedCategoryIds={setSelectedCategoryIds}
                    onCategoryChange={loadData}
                    canEdit={canManageCategories}
                />
            </div>

            {soldierContextMenu && (
                <div
                    className="soldier-ctx-menu"
                    style={{ left: soldierContextMenu.x, top: soldierContextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="soldier-ctx-item"
                        onClick={() => {
                            openEditSoldier(soldierContextMenu.soldier);
                            setSoldierContextMenu(null);
                        }}
                    >
                        상세보기
                    </button>
                    <div className="soldier-ctx-divider" />
                    {categories.map((category) => {
                        const checked = (soldierContextMenu.soldier.categories || []).includes(category.id);
                        return (
                            <button
                                key={category.id}
                                className="soldier-ctx-item"
                                disabled={!canToggleCategories}
                                onClick={() => {
                                    toggleSoldierCategoryFromMenu(soldierContextMenu.soldier, category.id);
                                    setSoldierContextMenu(null);
                                }}
                            >
                                <span className="soldier-ctx-check">{checked ? '✓' : ''}</span>
                                <span className="soldier-ctx-color" style={{ background: category.bg || '#fff', borderColor: category.color || '#999' }} />
                                <span className="soldier-ctx-label">{category.label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
