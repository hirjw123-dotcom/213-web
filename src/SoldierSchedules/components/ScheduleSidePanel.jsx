import DutyCompositionPanel from './DutyCompositionPanel.jsx';
import ScheduleMiniBoard from './ScheduleMiniBoard.jsx';

export default function ScheduleSidePanel({
    sidePanelWidth,
    onStartPanelResize,
    sideTab,
    onChangeSideTab,
    year,
    month,
    filteredSoldiers,
    schedules,
    dutyReplacements,
    scheduleTypes,
    canEditComposition,
    canEditDuty,
    canEditServiceRate,
    canEditScheduleTypes,
    dutyComposition,
    onChangeComposition,
    onChangeTotalComposition,
    onReplaceDutyComposition,
    onAutoDistributeDuty,
    onOpenAddType,
    onReorderType,
    onEditType,
    onHoverSoldier,
    onFocusSoldier,
    focusedSoldierId,
    visibleScheduleTypeLabels,
    onToggleVisibleScheduleType,
    onClearScheduleTypeFilter,
    activeHotkeyScheduleType,
}) {
    return (
        <div className="ss-side-panel" style={{ width: sidePanelWidth }}>
            <div className="ss-resize-handle" onMouseDown={onStartPanelResize} />
            <div className="side-panel-tabs">
                <button
                    className={`side-tab${sideTab === 'schedule-mini-board' ? ' active' : ''}`}
                    onClick={() => onChangeSideTab('schedule-mini-board')}
                >게시판</button>
                <button
                    className={`side-tab${sideTab === 'composition' ? ' active' : ''}`}
                    onClick={() => onChangeSideTab('composition')}
                >근무 편성</button>
                <button
                    className={`side-tab${sideTab === 'types' ? ' active' : ''}`}
                    onClick={() => onChangeSideTab('types')}
                >일정분류</button>
            </div>
            <div className="side-panel-body">
                {sideTab === 'schedule-mini-board' && (
                    <ScheduleMiniBoard
                    />
                )}
                {sideTab === 'composition' && (
                    <DutyCompositionPanel
                        year={year}
                        month={month}
                        soldiers={filteredSoldiers}
                        schedules={schedules}
                        dutyReplacements={dutyReplacements}
                        scheduleTypes={scheduleTypes}
                        canEditComposition={canEditComposition}
                        canEditDuty={canEditDuty}
                        canEditServiceRate={canEditServiceRate}
                        compositionData={dutyComposition}
                        onChangeComposition={onChangeComposition}
                        onChangeTotalComposition={onChangeTotalComposition}
                        onReplaceDutyComposition={onReplaceDutyComposition}
                        onAutoDistributeDuty={onAutoDistributeDuty}
                        onHoverSoldier={onHoverSoldier}
                        onFocusSoldier={onFocusSoldier}
                        focusedSoldierId={focusedSoldierId}
                    />
                )}
                {sideTab === 'types' && (
                    <>
                        <div className="side-panel-header">
                            <span>일정 분류</span>
                            {canEditScheduleTypes && <button onClick={onOpenAddType}>+ 추가</button>}
                        </div>
                        {scheduleTypes.map((type, idx) => (
                            <div
                                key={type.label}
                                className={`type-item${activeHotkeyScheduleType?.label === type.label ? ' active-hotkey' : ''}`}
                                onDragOver={(e) => canEditScheduleTypes && e.preventDefault()}
                                onDrop={(e) => {
                                    if (!canEditScheduleTypes) return;
                                    const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                                    onReorderType(fromIdx, idx);
                                }}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.effectAllowed = 'move';
                                    e.dataTransfer.setData('text/plain', idx.toString());
                                }}
                            >
                                <div style={{
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                    width: 16,
                                }}>{idx + 1}</div>
                                <label
                                    className="type-filter-label"
                                    style={{
                                        alignSelf: 'stretch',
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        className="type-filter-check-input"
                                        checked={visibleScheduleTypeLabels.includes(type.label)}
                                        onChange={() => onToggleVisibleScheduleType?.(type.label)}
                                    />
                                    <div className="type-box" style={{ background: type.bg, color: type.color, fontWeight: type.bold ? 'bold' : 'normal', border: type.bg === '#fff' || type.bg === '#ffffff' ? '1px solid #333' : '1px solid transparent' }}>
                                        {type.label}
                                    </div>
                                    <span className="type-desc">{type.desc}</span>
                                </label>
                                {canEditScheduleTypes && (
                                    <div className="type-item-actions">
                                        <button
                                            type="button"
                                            className="type-item-action-btn"
                                            onClick={() => onEditType(type)}
                                        >
                                            수정
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {visibleScheduleTypeLabels.length > 0 && (
                            <div className="type-filter-footer">
                                <button type="button" onClick={onClearScheduleTypeFilter}>필터 해제</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
