import { soldierScheduleCss } from './css/soldierScheduleCss.js';

import { createPortal } from 'preact/compat';
import ScheduleTable from './components/ScheduleTable.jsx';
import ExcelPasteModal from './components/ExcelPasteModal.jsx';
import FullHistoryModal from './components/FullHistoryModal.jsx';
import SoldierSchedulesHeader from './@components/SoldierSchedulesHeader.jsx';
import useSoldierSchedulesPageState from './@hooks/useSoldierSchedulesPageState.jsx';
import { downloadTableAsExcelFile } from '../@modules/sheetExport.js';

// ========================================
// 메인 컴포넌트
// ========================================
export default function SoldierSchedules() {
    const {
        year,
        month,
        showExcelModal,
        showFullHistory,
        reloadKey,
        undoStack,
        redoStack,
        categories,
        selectedCategories,
        showCategoryFilter,
        categoryFilterRef,
        featurePermissions,
        scheduleRestrictions,
        cellWidthMode,
        showPayGrade,
        undoRef,
        redoRef,
        setShowExcelModal,
        setShowFullHistory,
        setReloadKey,
        setUndoStack,
        setRedoStack,
        setSelectedCategories,
        setShowCategoryFilter,
        setCellWidthMode,
        setShowPayGrade,
        prevMonth,
        nowMonth,
        nextMonth,
        handleUndo,
        handleRedo,
        closeCategoryFilterIfOutside,
    } = useSoldierSchedulesPageState();

    const exportToSheet = async () => {
        const table = document.querySelector('.soldier-schedules .ss-table');
        const result = await downloadTableAsExcelFile(table, {
            fileName: `근무일정표_${year}_${String(month).padStart(2, '0')}.xls`,
            title: `${year}년 ${String(month).padStart(2, '0')}월 근무일정표`,
        });
        await alert(result.message);
    };

    return (
        <div className="soldier-schedules" onClick={(e) => {
            closeCategoryFilterIfOutside(e.target);
        }} style={{
            zoom: .85
        }}>
            <style>{soldierScheduleCss}</style>

            <SoldierSchedulesHeader
                year={year}
                month={month}
                undoStack={undoStack}
                redoStack={redoStack}
                selectedCategories={selectedCategories}
                showCategoryFilter={showCategoryFilter}
                categories={categories}
                featurePermissions={featurePermissions}
                categoryFilterRef={categoryFilterRef}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onPrevMonth={prevMonth}
                onNowMonth={nowMonth}
                onNextMonth={nextMonth}
                onToggleCategoryFilter={() => setShowCategoryFilter(!showCategoryFilter)}
                onSelectAllCategories={() => {
                    setSelectedCategories([]);
                    setShowCategoryFilter(false);
                }}
                onToggleCategory={(categoryId) => {
                    setSelectedCategories((prev) => {
                        if (prev.includes(categoryId)) return prev.filter((id) => id !== categoryId);
                        return [...prev, categoryId];
                    });
                    setShowCategoryFilter(false);
                }}
                onOpenHistory={() => setShowFullHistory(true)}
                onOpenExcel={() => setShowExcelModal(true)}
                onExportSheet={exportToSheet}
                cellWidthMode={cellWidthMode}
                onChangeCellWidthMode={setCellWidthMode}
                showPayGrade={showPayGrade}
                onTogglePayGrade={() => setShowPayGrade((visible) => !visible)}
            />

            <ScheduleTable
                key={`${year}-${month}-${reloadKey}`}
                year={year} month={month}
                undoStack={undoStack} setUndoStack={setUndoStack}
                redoStack={redoStack} setRedoStack={setRedoStack}
                undoRef={undoRef} redoRef={redoRef}
                selectedCategories={selectedCategories}
                featurePermissions={featurePermissions}
                scheduleRestrictions={scheduleRestrictions}
                cellWidthMode={cellWidthMode}
                showPayGrade={showPayGrade}
            />

            {showExcelModal && (
                <ExcelPasteModal
                    year={year}
                    month={month}
                    onClose={() => setShowExcelModal(false)}
                    onComplete={() => { setReloadKey(k => k + 1); setShowExcelModal(false); }}
                    pushUndoAction={(action) => {
                        setUndoStack(prev => [...prev, action]);
                        setRedoStack([]);
                    }}
                />
            )}

            {showFullHistory && createPortal(
                <FullHistoryModal
                    year={year}
                    month={month}
                    onClose={() => setShowFullHistory(false)}
                />,
                document.body
            )}
        </div>
    );
}
