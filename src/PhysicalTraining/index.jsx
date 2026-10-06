import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { soldiersController } from '../@controllers/soldiersController.js';
import { soldierCategoriesController } from '../@controllers/soldierCategoriesController.js';
import { authController } from '../@controllers/authController.js';
import { fitnessController, fitnessUtils, getCellWidth, GRADE_COL_WIDTH, DEFAULT_CELLS, getSectionEnabledCellIds } from '../@controllers/fitnessController.js';
import { UNITS } from '../@modules/configs.js';
import { calcServiceDays } from '../@modules/dates.js';
import ModalPopup from '../@components/ModalPopup.jsx';
import { DragItem } from '../@components/DragItem.jsx';
import { EditSoldier } from '../Soldiers/EditSoldier/index.jsx';
import { fitnessPageCss } from './css/fitnessPageCss.js';
import FitnessCharts, { SectionDistributionPopup } from './FitnessCharts.jsx';
import { EVENT_COLORS } from '../Soldiers/EditSoldier/TabFitness.jsx';

const TYPE_OPTIONS = [
    { value: 'count', label: '횟수' },
    { value: 'i:s', label: '분:초 (M:SS)' },
    { value: 'h:i:s', label: '시:분:초 (H:MM:SS)' },
];

export default function PhysicalTraining() {
    const [soldiers, setSoldiers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [allHealth, setAllHealth] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState('all');

    // 패널 리사이징
    const [panelWidth, setPanelWidth] = useState(350);
    const [showSummary, setShowSummary] = useState(true);
    const [showSoldierCharts, setShowSoldierCharts] = useState(true);
    const [showGrowthCharts, setShowGrowthCharts] = useState(false);
    const resizerRef = useRef(false);

    // 탭 편집 팝업
    const [tabPopup, setTabPopup] = useState(null);
    const [hiddenTabsPopup, setHiddenTabsPopup] = useState(false);
    const [sectionCellMenuId, setSectionCellMenuId] = useState(null);
    const [sectionChartPopup, setSectionChartPopup] = useState(null);

    const saveTimerRef = useRef(null);

    // 권한 상태
    const [perms, setPerms] = useState({ manageTabs: false, manageSections: false, editRecords: false });
    const [isMaster, setIsMaster] = useState(false);

    const loadData = async () => {
        const [soldierList, catList, fitTabs, health] = await Promise.all([
            soldiersController.get(),
            soldierCategoriesController.get(),
            fitnessController.getTabs(),
            fitnessController.getAllHealth(),
        ]);
        setSoldiers(soldierList.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)));
        setCategories(catList.sort((a, b) => a.order - b.order));
        setTabs(fitTabs);
        setAllHealth(health);
        if (fitTabs.length > 0) {
            setActiveTabId(prev => {
                if (prev && fitTabs.some(tab => tab.id === prev)) return prev;
                return fitTabs.find(tab => !tab.hidden)?.id || fitTabs[0].id;
            });
        }
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            loadData(),
            Promise.all([
                authController.checkFeaturePermission('physicalTraining', 'manageTabs'),
                authController.checkFeaturePermission('physicalTraining', 'manageSections'),
                authController.checkFeaturePermission('physicalTraining', 'editRecords'),
                authController.isMaster(),
            ]).then(([tabs, sections, records, master]) => {
                setPerms({
                    manageTabs: tabs.allowed,
                    manageSections: sections.allowed,
                    editRecords: records.allowed,
                });
                setIsMaster(master);
            }),
        ]).then(() => setLoading(false));
    }, []);

    const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
    const visibleTabs = useMemo(() => tabs.filter(t => !t.hidden), [tabs]);

    const setTabsAndSyncActive = useCallback((updatedTabs, requestedActiveTabId = activeTabId) => {
        setTabs(updatedTabs);

        if (!updatedTabs.length) {
            setActiveTabId(null);
            return;
        }

        if (requestedActiveTabId && updatedTabs.some(tab => tab.id === requestedActiveTabId)) {
            setActiveTabId(requestedActiveTabId);
            return;
        }

        setActiveTabId(updatedTabs.find(tab => !tab.hidden)?.id || updatedTabs[0].id);
    }, [activeTabId]);

    const soldiersByUnit = useMemo(() => {
        const activeSoldiers = soldiers.filter(s => calcServiceDays.remaining(s.exitDate, null, true) >= 0);
        const categoryFiltered = selectedCategoryIds.length === 0
            ? activeSoldiers
            : activeSoldiers.filter(s => s.categories && s.categories.some(catId => selectedCategoryIds.includes(catId)));

        const unitFiltered = selectedUnitId === 'all'
            ? categoryFiltered
            : categoryFiltered.filter(s => s.unit === selectedUnitId || s.unit === UNITS.find(u => u.id === selectedUnitId)?.name);

        const unitsToMap = selectedUnitId === 'all' ? UNITS : UNITS.filter(u => u.id === selectedUnitId);
        return unitsToMap.map(unit => ({
            unit,
            soldiers: unitFiltered.filter(s => s.unit === unit.id || s.unit === unit.name),
        }));
    }, [soldiers, selectedCategoryIds, selectedUnitId]);

    const sections = useMemo(() => activeTab?.sections || [], [activeTab]);

    const sectionCellsMap = useMemo(() => {
        const map = {};
        if (!activeTab?.cells) return map;
        sections.forEach(section => {
            const enabledCellIds = getSectionEnabledCellIds(section, activeTab.cells);
            map[section.id] = activeTab.cells.filter(cell => enabledCellIds.includes(cell.id));
        });
        return map;
    }, [activeTab, sections]);

    const handleCellChange = useCallback((soldierId, tabId, sectionId, cellId, rawText, cellType) => {
        const stored = fitnessUtils.displayToStored(rawText, cellType);
        setAllHealth(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            fitnessController.setCellValue(next, soldierId, tabId, sectionId, cellId, stored);
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
            saveTimerRef.current = setTimeout(() => fitnessController.saveAllHealth(next), 800);
            return next;
        });
    }, []);

    // ─── 탭 추가/편집 팝업 ───
    const openAddTabPopup = () => {
        setTabPopup({
            mode: 'add',
            text: '',
            cells: DEFAULT_CELLS.map(c => ({ ...c, grades: c.grades?.map(g => ({ ...g })) })),
        });
    };

    const openEditTabPopup = (tab) => {
        setTabPopup({
            mode: 'edit',
            tabId: tab.id,
            text: tab.text,
            cells: tab.cells.map(c => ({ ...c, grades: c.grades?.map(g => ({ ...g })) })),
        });
    };

    const handleSaveTabPopup = async () => {
        if (!tabPopup) return;
        const { mode, tabId, text, cells } = tabPopup;
        const cleanCells = cells.filter(c => c.text.trim());
        if (cleanCells.length === 0) return;
        if (mode === 'add') {
            const updated = await fitnessController.addTab(text.trim() || '새 탭', cleanCells);
            setTabsAndSyncActive(updated, updated[updated.length - 1].id);
        } else {
            const updated = await fitnessController.updateTab(tabId, { text: text.trim() || '탭', cells: cleanCells });
            setTabsAndSyncActive(updated);
        }
        setTabPopup(null);
    };

    const handleToggleTabVisibility = async (tabId, hide) => {
        const updated = hide ? await fitnessController.hideTab(tabId) : await fitnessController.showTab(tabId);
        const nextActiveTabId = hide && activeTabId === tabId ? null : activeTabId;
        setTabsAndSyncActive(updated, nextActiveTabId);
    };

    const handleDeleteTab = async (tabId) => {
        if (tabId === 'default') return;

        const targetTab = tabs.find(tab => tab.id === tabId);
        const label = targetTab?.text || '이 탭';
        if (!await window.confirm(`'${label}' 탭을 삭제하시겠습니까?`)) return;

        const updated = await fitnessController.deleteTab(tabId);
        const nextActiveTabId = activeTabId === tabId ? null : activeTabId;
        setTabsAndSyncActive(updated, nextActiveTabId);
        setTabPopup(null);
    };

    const handleTabOrderDrop = useCallback(async (draggedTab, targetTab, position) => {
        if (!draggedTab || !targetTab || draggedTab.id === targetTab.id) return;

        const currentVisibleTabs = visibleTabs.filter(tab => !tab.hidden);
        const draggedIndex = currentVisibleTabs.findIndex(tab => tab.id === draggedTab.id);
        if (draggedIndex === -1) return;

        const nextVisibleTabs = currentVisibleTabs.filter(tab => tab.id !== draggedTab.id);
        let insertIndex = nextVisibleTabs.findIndex(tab => tab.id === targetTab.id);

        if (insertIndex === -1) insertIndex = nextVisibleTabs.length;
        if (position === 'after') insertIndex += 1;

        nextVisibleTabs.splice(insertIndex, 0, draggedTab);

        let visibleIndex = 0;
        const reorderedTabs = tabs.map(tab => {
            if (tab.hidden) return tab;
            const nextTab = nextVisibleTabs[visibleIndex];
            visibleIndex += 1;
            return nextTab;
        });

        const updated = await fitnessController.reorderTabs(reorderedTabs.map(tab => tab.id));
        setTabsAndSyncActive(updated);
    }, [tabs, visibleTabs, setTabsAndSyncActive]);

    const handleAddSection = async () => {
        if (!activeTabId) return;
        const updated = await fitnessController.addSection(activeTabId);
        setTabs(updated);
    };

    const handleSectionNameChange = async (sectionId, name) => {
        if (!activeTabId) return;
        const updated = await fitnessController.updateSection(activeTabId, sectionId, { name });
        setTabs(updated);
    };

    const handleDeleteSection = async (sectionId) => {
        if (!activeTabId) return;
        if (!await window.confirm('이 회차을 삭제하시겠습니까?')) return;
        const updated = await fitnessController.deleteSection(activeTabId, sectionId);
        setTabs(updated);
    };

    const handleSectionOrderDrop = useCallback(async (draggedSection, targetSection, position) => {
        if (!activeTabId || !draggedSection) return;

        const currentSections = [...sections];
        const draggedIndex = currentSections.findIndex(section => section.id === draggedSection.id);
        if (draggedIndex === -1) return;

        const nextSections = currentSections.filter(section => section.id !== draggedSection.id);
        let insertIndex = targetSection
            ? nextSections.findIndex(section => section.id === targetSection.id)
            : nextSections.length;

        if (insertIndex === -1) insertIndex = nextSections.length;
        if (targetSection && position === 'after') insertIndex += 1;

        nextSections.splice(insertIndex, 0, draggedSection);

        const updated = await fitnessController.reorderSections(activeTabId, nextSections.map(section => section.id));
        setTabs(updated);
    }, [activeTabId, sections]);

    const handleToggleSectionCell = useCallback(async (section, cellId, checked) => {
        if (!activeTabId || !activeTab?.cells) return;

        const enabledCellIds = getSectionEnabledCellIds(section, activeTab.cells);
        const nextEnabledCellIds = checked
            ? [...enabledCellIds, cellId]
            : enabledCellIds.filter(id => id !== cellId);

        if (nextEnabledCellIds.length === 0) return;

        const updated = await fitnessController.updateSection(activeTabId, section.id, {
            enabledCellIds: nextEnabledCellIds,
        });
        setTabs(updated);
    }, [activeTabId, activeTab]);

    const handleMouseMove = useCallback((e) => {
        if (!resizerRef.current) return;
        setPanelWidth(prev => {
            // 패널이 우측에 있으므로, 마우스를 왼쪽으로 당길수록 너비 증가
            let n = prev - e.movementX;
            if (n < 350) n = 350;
            if (n > 600) n = 600;
            return n;
        });
    }, []);

    const handleMouseUp = useCallback(() => {
        resizerRef.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
    }, [handleMouseMove]);

    const handleMouseDown = useCallback((e) => {
        resizerRef.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
    }, [handleMouseMove, handleMouseUp]);

    const getSoldierStyle = (soldier) => {
        const isSpecial = soldier.categories?.includes('special');
        const unit = UNITS.find(u => u.id === soldier.unit || u.name === soldier.unit);
        if (isSpecial) return { background: '#000', color: '#ff0000', fontWeight: 'bold' };
        return { background: unit?.bg || '#f0f0f0', color: '#000' };
    };

    if (loading) return <div className="f ajCenter wh100p"><div className="spinner" /></div>;

    return (
        <div className="fitness-page">
            <style>{fitnessPageCss}</style>

            {/* 탭 바 */}
            <div className="fit-tab-bar">
                {visibleTabs.map((tab, index) => (
                    perms.manageTabs ? (
                    <DragItem
                        key={tab.id}
                        groupKey="fit-tabs"
                        containerId="fit-visible-tabs"
                        item={tab}
                        index={index}
                        onDrop={handleTabOrderDrop}
                        className="fit-tab-drag-wrap"
                    >
                        <div
                            className={`fit-tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                            onClick={() => setActiveTabId(tab.id)}
                        >
                            {tab.text}
                            <span style={{ marginLeft: 6, cursor: 'pointer', opacity: 0.6 }}
                                onClick={(e) => { e.stopPropagation(); openEditTabPopup(tab); }}
                                title="탭 설정"
                            >⚙️</span>
                        </div>
                    </DragItem>
                    ) : (
                    <div
                        key={tab.id}
                        className={`fit-tab-item ${tab.id === activeTabId ? 'active' : ''}`}
                        onClick={() => setActiveTabId(tab.id)}
                    >
                        {tab.text}
                    </div>
                    )
                ))}
                {perms.manageTabs && <button className="fit-tab-add" onClick={openAddTabPopup} title="탭 추가">+</button>}
                {tabs.some(t => t.hidden) && (
                    <button className="fit-tab-add" onClick={() => setHiddenTabsPopup(true)} style={{ marginLeft: 'auto', fontSize: 11, border: 'none' }} title="숨긴 탭 보기">
                        👁 숨긴 탭 보기
                    </button>
                )}
            </div>

            {/* 탭 추가/편집 팝업 */}
            {tabPopup && (
                <TabEditPopup
                    popup={tabPopup}
                    setPopup={setTabPopup}
                    onSave={handleSaveTabPopup}
                    onHide={() => { handleToggleTabVisibility(tabPopup.tabId, true); setTabPopup(null); }}
                    onDelete={() => handleDeleteTab(tabPopup.tabId)}
                    canHide={isMaster && tabPopup.tabId !== 'default'}
                    canDelete={isMaster && tabPopup.tabId !== 'default'}
                />
            )}

            {/* 탭 관리 팝업 */}
            {hiddenTabsPopup && (
                <div className="fit-popup-overlay" onClick={() => setHiddenTabsPopup(false)}>
                    <div className="fit-popup" onClick={e => e.stopPropagation()}>
                        <div className="fit-popup-header">숨긴 탭 관리</div>
                        <div className="fit-popup-body" style={{ padding: 10 }}>
                            {tabs.filter(t => t.hidden).map(t => (
                                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid var(--c6)' }}>
                                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>{t.text}</span>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button onClick={() => handleToggleTabVisibility(t.id, false)} style={{ fontSize: 11, padding: '2px 8px' }}>표시하기</button>
                                        {isMaster && t.id !== 'default' && (
                                            <button onClick={() => handleDeleteTab(t.id)} style={{ fontSize: 11, padding: '2px 8px', color: '#c62828', borderColor: '#c62828' }}>삭제</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {tabs.filter(t => t.hidden).length === 0 && <div style={{ fontSize: 12, textAlign: 'center', color: 'var(--c4)', padding: 10 }}>숨긴 탭이 없습니다.</div>}
                        </div>
                        <div className="fit-popup-footer">
                            <button onClick={() => setHiddenTabsPopup(false)}>닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 본문 */}
            {activeTab && (
                <div className="fit-body">
                    <div className="fit-table-area">
                        <div className="fit-table-toolbar">
                            {perms.manageSections && <button onClick={handleAddSection}>+ 회차 추가</button>}
                            {sections.length > 0 && (
                                <div className="fit-section-order-bar">
                                    <span className="fit-section-order-label">회차 순서</span>
                                    {sections.map((section, index) => (
                                        <DragItem
                                            key={section.id}
                                            groupKey={`fit-sections-${activeTabId}`}
                                            containerId={activeTabId || 'fit-sections'}
                                            item={section}
                                            index={index}
                                            onDrop={handleSectionOrderDrop}
                                            className="fit-section-chip"
                                        >
                                            <span className="fit-section-chip-name">{section.name}</span>
                                            <span className="fit-section-chip-meta">{(sectionCellsMap[section.id] || []).length}종목</span>
                                        </DragItem>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="fit-table-scroll">
                            <table className="fit-table">
                                <thead>
                                    {sections.length > 0 && (
                                        <tr className="fit-section-header-row">
                                            <th className="fit-sticky-col fit-col-num" rowSpan={2}>#</th>
                                            <th className="fit-sticky-col fit-col-name" rowSpan={2}>이름</th>
                                            {sections.map(sec => {
                                                const sectionCells = sectionCellsMap[sec.id] || [];
                                                const cc = sectionCells.reduce((acc, cell) => acc + 1 + (cell.useGrade ? 1 : 0), 0);
                                                const enabledCellIds = getSectionEnabledCellIds(sec, activeTab.cells);
                                                return (
                                                    <th key={sec.id} colSpan={cc} className="fit-section-header">
                                                        <div className="fit-section-name-wrap">
                                                            <input type="text" value={sec.name} className="fit-section-name-input"
                                                                onInput={e => handleSectionNameChange(sec.id, e.target.value)}
                                                                disabled={!perms.manageSections} />
                                                            <span className="fit-section-active-count">{sectionCells.length}/{activeTab.cells.length} 종목</span>
                                                            <div className="fit-section-action-group">
                                                                <button
                                                                    type="button"
                                                                    className={`fit-section-action-btn ${sectionCellMenuId === sec.id ? 'active' : ''}`}
                                                                    onClick={() => setSectionCellMenuId(prev => prev === sec.id ? null : sec.id)}
                                                                    title="활성 종목 설정"
                                                                >종목</button>
                                                                <button
                                                                    type="button"
                                                                    className="fit-section-action-btn"
                                                                    onClick={() => setSectionChartPopup(sec)}
                                                                    title="이 회차 차트 보기"
                                                                >차트보기</button>
                                                            </div>
                                                            {perms.manageSections && (
                                                                <button className="fit-section-del" onClick={() => handleDeleteSection(sec.id)} title="회차 삭제">×</button>
                                                            )}
                                                            {sectionCellMenuId === sec.id && (
                                                                <div className="fit-section-cell-menu" onClick={e => e.stopPropagation()}>
                                                                    <div className="fit-section-cell-menu-title">활성 종목</div>
                                                                    {activeTab.cells.map(cell => {
                                                                        const isChecked = enabledCellIds.includes(cell.id);
                                                                        const disableToggle = isChecked && enabledCellIds.length === 1;

                                                                        return (
                                                                            <label key={cell.id} className={`fit-section-cell-option ${isChecked ? 'checked' : ''}`}>
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={isChecked}
                                                                                    disabled={disableToggle}
                                                                                    onChange={e => handleToggleSectionCell(sec, cell.id, e.target.checked)}
                                                                                />
                                                                                <span className="fit-section-cell-color" style={{ background: cell.color || EVENT_COLORS[0] }} />
                                                                                <span>{cell.text}</span>
                                                                            </label>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    )}
                                    <tr>
                                        {sections.length === 0 && (<>
                                            <th className="fit-sticky-col fit-col-num">#</th>
                                            <th className="fit-sticky-col fit-col-name">이름</th>
                                        </>)}
                                        {sections.map(sec => (sectionCellsMap[sec.id] || []).map((cell, ci, arr) => {
                                            const isLastCell = ci === arr.length - 1;
                                            const lastClass = isLastCell && !cell.useGrade ? ' fit-section-last' : '';
                                            const lastGradeClass = isLastCell && cell.useGrade ? ' fit-section-last' : '';
                                            return (<>
                                                <th key={`${sec.id}-${cell.id}`} className={`fit-col-cell fit-type-${cell.type.replace(/:/g, '')}${lastClass}`}
                                                    style={{ width: getCellWidth(cell.type) }}>
                                                    {cell.text}
                                                </th>
                                                {cell.useGrade && (
                                                    <th key={`${sec.id}-${cell.id}-g`} className={`fit-col-grade${lastGradeClass}`} style={{ width: GRADE_COL_WIDTH }}>급</th>
                                                )}
                                            </>);
                                        }))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {soldiersByUnit.map(({ unit, soldiers: us }) => (<>
                                        <tr key={`u-${unit.id}`} className="fit-unit-row">
                                            <td colSpan={999}>
                                                <span className="fit-unit-name" style={{ borderLeft: `4px solid ${unit.bg}`, paddingLeft: 8 }}>{unit.name}</span>
                                                <span className="fit-unit-count">{us.length}명</span>
                                            </td>
                                        </tr>
                                        {us.map((s, idx) => {
                                            const st = getSoldierStyle(s);
                                            return (
                                                <tr key={s.id} className="fit-soldier-row">
                                                    <td className="fit-sticky-col fit-col-num" style={st}>{idx + 1}</td>
                                                    <td className="fit-sticky-col fit-col-name pointer" style={st} onClick={() => ModalPopup.push(<EditSoldier soldier={s} initialTab="fitness" onSave={loadData} />)}>{s.rank} {s.name}</td>
                                                    {sections.map(sec => (sectionCellsMap[sec.id] || []).map((cell, ci, arr) => {
                                                        const val = fitnessController.getCellValue(allHealth, s.id, activeTabId, sec.id, cell.id);
                                                        const dv = fitnessUtils.secondsToDisplay(val, cell.type);
                                                        const gi = cell.useGrade ? fitnessUtils.calcGrade(val, cell) : null;
                                                        const gs = gi ? fitnessUtils.gradeStyle(val, cell) : {};
                                                        const isLastCell = ci === arr.length - 1;
                                                        const lastClass = isLastCell && !cell.useGrade ? ' fit-section-last' : '';
                                                        const lastGradeClass = isLastCell && cell.useGrade ? ' fit-section-last' : '';
                                                        return (<>
                                                            <td key={`${s.id}-${sec.id}-${cell.id}`}
                                                                className={`fit-col-cell fit-type-${cell.type.replace(/:/g, '')}${lastClass}`}
                                                                style={{ width: getCellWidth(cell.type) }}>
                                                                <FitCellInput value={dv} type={cell.type}
                                                                    onChange={v => handleCellChange(s.id, activeTabId, sec.id, cell.id, v, cell.type)}
                                                                    disabled={!perms.editRecords} />
                                                            </td>
                                                            {cell.useGrade && (
                                                                <td key={`${s.id}-${sec.id}-${cell.id}-g`}
                                                                    className={`fit-col-grade${lastGradeClass}`} style={{ ...gs, width: GRADE_COL_WIDTH }}>
                                                                    {gi?.name || ''}
                                                                </td>
                                                            )}
                                                        </>);
                                                    }))}
                                                </tr>
                                            );
                                        })}
                                    </>))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 우측 패널 */}
                    <div className="fit-right-panel" style={{ width: panelWidth }}>
                        <div className="fit-resizer" onMouseDown={handleMouseDown} />
                        <div className="fit-filter-area">
                            <div className="fit-filter-top">
                                {categories.map(cat => (
                                    <label key={cat.id} className="fit-filter-cat-label">
                                        <input type="checkbox" checked={selectedCategoryIds.includes(cat.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedCategoryIds(p => [...p, cat.id]);
                                                else setSelectedCategoryIds(p => p.filter(id => id !== cat.id));
                                            }} />
                                        <span style={{ color: cat.color }}>{cat.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="fit-filter-bottom">
                                <label className="fit-filter-unit-label">
                                    <input type="radio" name="fit_unit" checked={selectedUnitId === 'all'}
                                        onChange={() => setSelectedUnitId('all')} /> 전체
                                </label>
                                {UNITS.map(u => (
                                    <label key={u.id} className="fit-filter-unit-label">
                                        <input type="radio" name="fit_unit" checked={selectedUnitId === u.id}
                                            onChange={() => setSelectedUnitId(u.id)} /> {u.name}
                                    </label>
                                ))}
                            </div>


                            <div className="fit-filter-bottom">
                                <div style={{ marginTop: 10, cursor: 'pointer', padding: '2px 8px', background: 'var(--c6)', borderRadius: 4, fontSize: 11, fontWeight: 'bold' }} onClick={() => setShowSummary(p => !p)}>
                                    {showSummary ? '요약 닫기 ◀' : '요약 열기 ▶'}
                                </div>
                            </div>
                        </div>

                        <div className="fit-right-content">
                            <FitnessCharts activeTab={activeTab} sections={sections}
                                sectionCellsMap={sectionCellsMap}
                                soldiersByUnit={soldiersByUnit} allHealth={allHealth} activeTabId={activeTabId}
                                showSummary={showSummary} showSoldierCharts={showSoldierCharts} showGrowthCharts={showGrowthCharts} />
                        </div>
                    </div>
                </div>
            )}

            {sectionChartPopup && activeTab && (
                <SectionDistributionPopup
                    section={sectionChartPopup}
                    activeTab={activeTab}
                    soldiersByUnit={soldiersByUnit}
                    allHealth={allHealth}
                    activeTabId={activeTabId}
                    onClose={() => setSectionChartPopup(null)}
                />
            )}
        </div>
    );
}


// ─── 탭 추가/편집 팝업 ─────────────────────
function TabEditPopup({ popup, setPopup, onSave, onHide, onDelete, canHide, canDelete }) {
    const { mode, text, cells } = popup;

    const update = (key, val) => setPopup(prev => ({ ...prev, [key]: val }));

    const updateCell = (idx, key, val) => {
        const next = [...cells];
        next[idx] = { ...next[idx], [key]: val };
        update('cells', next);
    };

    const addCell = () => {
        update('cells', [...cells, {
            id: 'cell_' + Date.now(),
            text: '',
            type: 'count',
            useGrade: false,
            grades: [],
        }]);
    };

    const removeCell = (idx) => {
        update('cells', cells.filter((_, i) => i !== idx));
    };

    const updateGrade = (cellIdx, gradeIdx, key, val) => {
        const next = [...cells];
        const grades = [...(next[cellIdx].grades || [])];
        grades[gradeIdx] = { ...grades[gradeIdx], [key]: val };
        next[cellIdx] = { ...next[cellIdx], grades };
        update('cells', next);
    };

    const addGrade = (cellIdx) => {
        const next = [...cells];
        const grades = [...(next[cellIdx].grades || [])];
        grades.push({ name: '', value: grades.length, color: '#444444' });
        next[cellIdx] = { ...next[cellIdx], grades };
        update('cells', next);
    };

    const removeGrade = (cellIdx, gradeIdx) => {
        const next = [...cells];
        const grades = [...(next[cellIdx].grades || [])].filter((_, i) => i !== gradeIdx);
        next[cellIdx] = { ...next[cellIdx], grades };
        update('cells', next);
    };



    return (
        <div className="fit-popup-overlay" onClick={() => setPopup(null)}>
            <div className="fit-popup fit-popup-wide" onClick={e => e.stopPropagation()}>
                <div className="fit-popup-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{mode === 'add' ? '탭 추가' : '탭 편집'}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {mode === 'edit' && canHide && (
                            <button style={{ fontSize: 11, background: 'transparent', color: '#ff4444', border: '1px solid #ff4444' }} onClick={onHide}>
                                🙈 숨기기
                            </button>
                        )}
                        {mode === 'edit' && canDelete && (
                            <button style={{ fontSize: 11, background: 'transparent', color: '#c62828', border: '1px solid #c62828' }} onClick={onDelete}>
                                삭제
                            </button>
                        )}
                    </div>
                </div>
                <div className="fit-popup-body">
                    {/* 탭 이름 */}
                    <div className="ftp-row">
                        <label className="ftp-label">탭 이름</label>
                        <input type="text" value={text} className="ftp-input"
                            placeholder="예: 체단기록"
                            onInput={e => update('text', e.target.value)} autoFocus />
                    </div>

                    {/* 셀 리스트 */}
                    <div className="ftp-section-title">종목 설정</div>
                    <div className="ftp-cells">
                        {cells.map((cell, ci) => {
                            cell.color = cell.color || EVENT_COLORS[ci];
                            return (
                                <div key={ci} className="ftp-cell-card" style={{ borderLeft: `4px solid ${cell.color}` }}>
                                    <div className="ftp-cell-top">
                                        <input type="text" value={cell.text} placeholder="종목명"
                                            className="ftp-cell-name" onInput={e => updateCell(ci, 'text', e.target.value)} />

                                        <input type="color" value={cell.color}
                                            style={{ width: 24, height: 24, padding: 0, border: '1px solid var(--c5)', cursor: 'pointer' }}
                                            onBlur={e => updateCell(ci, 'color', e.target.value)} title="종목 색상 선택" />

                                        <select value={cell.type} className="ftp-cell-type"
                                            onChange={e => updateCell(ci, 'type', e.target.value)}>
                                            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                        </select>
                                        <label className="ftp-cell-check">
                                            <input type="checkbox" checked={cell.useGrade}
                                                onChange={e => updateCell(ci, 'useGrade', e.target.checked)} />
                                            등급사용
                                        </label>
                                        <button className="ftp-cell-del" onClick={() => removeCell(ci)} title="삭제">×</button>
                                    </div>

                                    {/* 등급 편집 */}
                                    {cell.useGrade && (
                                        <div className="ftp-grades">
                                            <div className="ftp-grades-header">
                                                <span>등급</span><span>이름</span><span>조건</span><span>값</span><span>색상</span><span>굵게</span><span></span>
                                            </div>
                                            {(cell.grades || []).map((g, gi) => (
                                                <div key={gi} className="ftp-grade-row">
                                                    <span className="ftp-grade-idx">{gi + 1}</span>
                                                    <input type="text" value={g.name} className="ftp-grade-name"
                                                        placeholder="특" onInput={e => updateGrade(ci, gi, 'name', e.target.value)} />
                                                    <select value={g.under !== undefined ? 'under' : g.over !== undefined ? 'over' : 'else'}
                                                        className="ftp-grade-cond"
                                                        onChange={e => {
                                                            const v = e.target.value;
                                                            const cleaned = { ...g };
                                                            delete cleaned.under; delete cleaned.over;
                                                            if (v === 'under') cleaned.under = '';
                                                            else if (v === 'over') cleaned.over = '';
                                                            const next = [...cells];
                                                            next[ci].grades[gi] = cleaned;
                                                            update('cells', next);
                                                        }}>
                                                        <option value="under">이하(≤)</option>
                                                        <option value="over">이상(≥)</option>
                                                        <option value="else">기타</option>
                                                    </select>
                                                    <input type="text"
                                                        value={g.under !== undefined ? g.under : g.over !== undefined ? g.over : ''}
                                                        className="ftp-grade-val"
                                                        placeholder={cell.type === 'count' ? '72' : '12:30'}
                                                        disabled={g.under === undefined && g.over === undefined}
                                                        onInput={e => {
                                                            const key = g.under !== undefined ? 'under' : 'over';
                                                            const raw = e.target.value;
                                                            const val = cell.type === 'count' ? (parseInt(raw) || raw) : raw;
                                                            updateGrade(ci, gi, key, val);
                                                        }} />
                                                    <input type="color" value={g.color || '#000000'} className="ftp-grade-color"
                                                        onInput={e => updateGrade(ci, gi, 'color', e.target.value)} />
                                                    <input type="checkbox" checked={!!g.bold}
                                                        onChange={e => updateGrade(ci, gi, 'bold', e.target.checked)} />
                                                    <button className="ftp-grade-del" onClick={() => removeGrade(ci, gi)}>×</button>
                                                </div>
                                            ))}
                                            <button className="ftp-grade-add" onClick={() => addGrade(ci)}>+ 등급 추가</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <button className="ftp-add-cell" onClick={addCell}>+ 종목 추가</button>
                    </div>
                </div>
                <div className="fit-popup-footer">
                    <button onClick={() => setPopup(null)}>취소</button>
                    <button onClick={onSave}>{mode === 'add' ? '추가' : '저장'}</button>
                </div>
            </div>
        </div>
    );
}


// ─── 셀 간 키보드 네비게이션 ─────────────────────
function navigateCell(inputEl, direction) {
    const td = inputEl.closest('td');
    if (!td) return;
    const tr = td.closest('tr');
    if (!tr) return;

    // 현재 행의 모든 input이 있는 td들 수집 및 현재 인덱스 찾기
    const allInputTds = [...tr.querySelectorAll('td.fit-col-cell')];
    const colIdx = allInputTds.indexOf(td);

    if (direction === 'left') {
        for (let i = colIdx - 1; i >= 0; i--) {
            const inp = allInputTds[i]?.querySelector('input');
            if (inp) { inp.focus(); return; }
        }
    } else if (direction === 'right') {
        for (let i = colIdx + 1; i < allInputTds.length; i++) {
            const inp = allInputTds[i]?.querySelector('input');
            if (inp) { inp.focus(); return; }
        }
    } else if (direction === 'up' || direction === 'down') {
        // 같은 테이블 내에서 soldier-row만 탐색
        const tbody = tr.closest('tbody');
        if (!tbody) return;
        const rows = [...tbody.querySelectorAll('tr.fit-soldier-row')];
        const rowIdx = rows.indexOf(tr);
        const targetRow = direction === 'up' ? rows[rowIdx - 1] : rows[rowIdx + 1];
        if (!targetRow) return;
        const targetTds = [...targetRow.querySelectorAll('td.fit-col-cell')];
        const inp = targetTds[colIdx]?.querySelector('input');
        if (inp) inp.focus();
    }
}

// ─── 셀 입력 ─────────────────────
function FitCellInput({ value, type, onChange, disabled = false }) {
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState(value || '');
    const inputRef = useRef(null);

    useEffect(() => { setText(value || ''); }, [value]);

    const handleFocus = () => { setEditing(true); setTimeout(() => inputRef.current?.select(), 0); };
    const handleBlur = () => { setEditing(false); if (text !== (value || '')) onChange(text); };
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            // Enter → 아래로 이동
            e.preventDefault();
            if (text !== (value || '')) onChange(text);
            navigateCell(inputRef.current, 'down');
            return;
        }
        if (e.key === 'Escape') { setText(value || ''); inputRef.current?.blur(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); navigateCell(inputRef.current, 'down'); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); navigateCell(inputRef.current, 'up'); return; }
        if (e.key === 'ArrowLeft' && inputRef.current?.selectionStart === 0) {
            e.preventDefault(); navigateCell(inputRef.current, 'left'); return;
        }
        if (e.key === 'ArrowRight' && inputRef.current?.selectionStart === text.length) {
            e.preventDefault(); navigateCell(inputRef.current, 'right'); return;
        }
    };
    const ph = type === 'i:s' ? 'M:SS' : type === 'h:i:s' ? 'H:MM:SS' : '';
    const isException = text === '소견서' || text === '열외';

    return (
        <input ref={inputRef} type="text" className={`fit-cell-input ${editing ? 'editing' : ''}`}
            value={text} placeholder={ph} onFocus={handleFocus} onBlur={handleBlur}
            onInput={e => setText(e.target.value)} onKeyDown={handleKeyDown}
            style={{ background: isException ? '#eee' : undefined }}
            disabled={disabled} />
    );
}
