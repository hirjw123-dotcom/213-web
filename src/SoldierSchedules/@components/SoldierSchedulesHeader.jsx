export default function SoldierSchedulesHeader({
    year,
    month,
    undoStack,
    redoStack,
    selectedCategories,
    showCategoryFilter,
    categories,
    featurePermissions,
    categoryFilterRef,
    onUndo,
    onRedo,
    onPrevMonth,
    onNextMonth,
    onNowMonth,
    onToggleCategoryFilter,
    onSelectAllCategories,
    onToggleCategory,
    onOpenHistory,
    onOpenExcel,
    onExportSheet,
    cellWidthMode,
    onChangeCellWidthMode,
    showPayGrade,
    onTogglePayGrade,
}) {
    return (
        <div className="ss-header">
            <div className="ss-header-left">
                {featurePermissions.manageDuty && <button className="undo-btn" onClick={onUndo} disabled={undoStack.length === 0} title="실행 취소 (Ctrl+Z)">↩</button>}
                {featurePermissions.manageDuty && <button className="undo-btn" onClick={onRedo} disabled={redoStack.length === 0} title="다시 실행 (Ctrl+Y)">↪</button>}
                <div style={{ position: 'relative' }} ref={categoryFilterRef}>
                    <button
                        className={`category-filter-btn${selectedCategories.length > 0 ? ' active' : ''}`}
                        onClick={onToggleCategoryFilter}
                        title="카테고리 필터"
                    >
                        ▤ 필터{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}
                    </button>
                    {showCategoryFilter && (
                        <div className="category-filter-popup" onClick={(e) => e.stopPropagation()}>
                            <div className="category-filter-item" onClick={onSelectAllCategories}>
                                <input type="checkbox" checked={selectedCategories.length === 0} readOnly />
                                <span style={{ fontWeight: 600 }}>전체 보기</span>
                            </div>
                            <div className="category-filter-divider" />
                            {categories.filter((category) => category.id !== 'officer').map((category) => (
                                <div key={category.id} className="category-filter-item" onClick={() => onToggleCategory(category.id)}>
                                    <input type="checkbox" checked={selectedCategories.includes(category.id)} readOnly />
                                    <div className="cat-dot" style={{ background: category.bg || '#ddd' }} />
                                    <span>{category.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    className="category-filter-btn"
                    onClick={onOpenHistory}
                    title="변경 히스토리"
                >
                    📋 히스토리
                </button>
                <button
                    className={`category-filter-btn${cellWidthMode === '50' ? ' active' : ''}`}
                    onClick={() => onChangeCellWidthMode('50')}
                    title="셀 너비 50px"
                >
                    셀 50
                </button>
                <button
                    className={`category-filter-btn${cellWidthMode === '40' ? ' active' : ''}`}
                    onClick={() => onChangeCellWidthMode('40')}
                    title="셀 너비 40px"
                >
                    셀 40
                </button>
                <button
                    className={`category-filter-btn${cellWidthMode === '35' ? ' active' : ''}`}
                    onClick={() => onChangeCellWidthMode('35')}
                    title="셀 너비 35px"
                >
                    셀 35
                </button>
                <button
                    className={`category-filter-btn${cellWidthMode === '30' ? ' active' : ''}`}
                    onClick={() => onChangeCellWidthMode('30')}
                    title="셀 너비 30px"
                >
                    셀 30
                </button>
                <button
                    className="category-filter-btn"
                    onClick={onExportSheet}
                    title="현재 근무일정표를 시트로 내보내기"
                >
                    시트로 내보내기
                </button>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <input
                        type="checkbox"
                        checked={showPayGrade}
                        onChange={onTogglePayGrade}
                        style={{ margin: 0 }}
                    />
                    호봉 표시
                </label>
            </div>
            <div className="ss-header-center">
                <button className="nav-btn" onClick={onPrevMonth}>◀ 이전</button>
                <span className="month-title pointer" onClick={onNowMonth}>{year}년 {month}월</span>
                <button className="nav-btn" onClick={onNextMonth}>다음 ▶</button>
            </div>
            {/* <div className="ss-header-right">
                <button className="excel-btn" onClick={onOpenExcel}>엑셀 붙여넣기</button>
            </div> */}
        </div>
    );
}
