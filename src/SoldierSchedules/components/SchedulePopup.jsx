import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { schedulePopupCss } from './css/schedulePopupCss';
import {
    DUTY_REPLACEMENT_LABELS,
    getEffectiveScheduleLabelsForSoldierDay,
    getDutyReplacementCellKey,
    getRegisteredScheduleLabelsForSoldierDay,
} from '../../@controllers/dutyReplacementController';
import { UNITS } from '../../@modules/configs';
import useEffectEvent from '../../Soldiers/@hooks/useEffectEvent';

const MANAGED_COMBAT_LEAVE_LABELS = new Set(['전휴', '반투']);

// ========================================
// 스케줄 편집 팝업
// ========================================
export default function SchedulePopup({ x, y, year, month, selection, schedules, scheduleTypes, memos, lockedCells, soldiers, dutyReplacements, combatLeaveData, canEdit = true, onSave, onBlockedEdit, onToggleLock, onClose }) {
    const [labelStates, setLabelStates] = useState({});
    const [inputText, setInputText] = useState('');
    const [memo, setMemo] = useState('');
    const [replacementSelections, setReplacementSelections] = useState({});
    const [position, setPosition] = useState({ x, y });
    const [dragging, setDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const initialLabelStatesRef = useRef({});
    const inputRef = useRef(null);
    const isSingleCell = selection.cells.length === 1;
    const singleCell = isSingleCell ? selection.cells[0] : null;

    const activeDutyLabels = useMemo(
        () => DUTY_REPLACEMENT_LABELS.filter((label) => labelStates[label] === 'checked'),
        [labelStates]
    );

    const soldierNameById = useMemo(
        () => new Map((soldiers || []).map((soldier) => [String(soldier.id), `${soldier.rank} ${soldier.name}`.trim()])),
        [soldiers]
    );

    const soldierShortNameById = useMemo(
        () => new Map((soldiers || []).map((soldier) => [String(soldier.id), `${soldier.name}`.trim()])),
        [soldiers]
    );

    const replacementSoldierGroups = useMemo(() => {
        if (!singleCell) return [];

        const selectedSoldierId = String(singleCell.soldierId);
        const knownUnitIds = new Set(UNITS.map((unit) => unit.id));
        const grouped = new Map(UNITS.map((unit) => [unit.id, { key: unit.id, label: unit.name, soldiers: [] }]));
        const unknownGroup = { key: 'unknown', label: '기타/미소속', soldiers: [] };

        for (const soldier of soldiers || []) {
            if (String(soldier.id) === selectedSoldierId) continue;

            const rawUnit = String(soldier.unit || '').trim();
            const matchedUnit = UNITS.find((unit) => unit.id === rawUnit || unit.name === rawUnit);
            const targetGroup = matchedUnit
                ? grouped.get(matchedUnit.id)
                : (knownUnitIds.has(rawUnit) ? grouped.get(rawUnit) : unknownGroup);

            targetGroup.soldiers.push(soldier);
        }

        const orderedGroups = UNITS
            .map((unit) => grouped.get(unit.id))
            .filter((group) => group?.soldiers.length);

        if (unknownGroup.soldiers.length) {
            orderedGroups.push(unknownGroup);
        }

        return orderedGroups;
    }, [singleCell, soldiers]);

    const popupTitle = useMemo(() => {
        const cells = selection.cells || [];
        if (cells.length === 0) return '일정 편집';

        const monthText = String(month || new Date().getMonth() + 1).padStart(2, '0');
        const yearValue = Number(year) || new Date().getFullYear();
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const uniqueSoldierIds = [...new Set(cells.map((cell) => String(cell.soldierId)))];
        const soldierText = uniqueSoldierIds
            .map((soldierId) => {
                if (uniqueSoldierIds.length === 1) {
                    return soldierNameById.get(soldierId) || '알 수 없는 용사';
                }
                return soldierShortNameById.get(soldierId) || soldierNameById.get(soldierId) || '알 수 없는 용사';
            })
            .join(', ');

        const selectedDays = cells
            .map((cell) => Number(cell.day))
            .filter((day) => Number.isFinite(day))
            .sort((left, right) => left - right);

        if (selectedDays.length === 0) return soldierText;

        const formatDayText = (day) => {
            const dayText = String(day).padStart(2, '0');
            const dayName = dayNames[new Date(yearValue, Number(monthText) - 1, day).getDay()] || '';
            return `${monthText}/${dayText}(${dayName})`;
        };

        const dateText = selectedDays[0] === selectedDays[selectedDays.length - 1]
            ? formatDayText(selectedDays[0])
            : `${formatDayText(selectedDays[0])} ~ ${formatDayText(selectedDays[selectedDays.length - 1])}`;

        return `${soldierText} ${dateText}`;
    }, [month, selection.cells, soldierNameById, soldierShortNameById, year]);

    const hasActiveReplacementSelection = useMemo(
        () => activeDutyLabels.some((label) => !!replacementSelections[label]),
        [activeDutyLabels, replacementSelections]
    );

    const incomingReplacementItems = useMemo(() => {
        if (!singleCell) return [];

        const targetSoldierId = String(singleCell.soldierId);
        const targetDay = Number(singleCell.day);

        return Object.entries(dutyReplacements || []).flatMap(([cellKey, replacementMap]) => {
            const separatorIndex = cellKey.lastIndexOf('_');
            if (separatorIndex <= 0) return [];

            const sourceSoldierId = cellKey.slice(0, separatorIndex).trim();
            const day = Number(cellKey.slice(separatorIndex + 1));
            if (!sourceSoldierId || day !== targetDay) return [];

            const sourceLabels = schedules?.[sourceSoldierId]?.[day] || [];
            const sourceSoldierName = soldierNameById.get(sourceSoldierId) || '알 수 없는 용사';

            return DUTY_REPLACEMENT_LABELS.flatMap((label) => {
                if (String(replacementMap?.[label] || '') !== targetSoldierId) return [];
                if (!sourceLabels.includes(label)) return [];

                return [{
                    key: `${cellKey}_${label}`,
                    label,
                    sourceSoldierId,
                    sourceSoldierName,
                }];
            });
        });
    }, [dutyReplacements, schedules, singleCell, soldierNameById]);

    const currentDutySummaries = useMemo(() => {
        if (!singleCell) return [];

        const day = Number(singleCell.day);
        const selectedSoldierId = String(singleCell.soldierId);
        const effectiveDutyLabels = getEffectiveScheduleLabelsForSoldierDay(
            schedules,
            dutyReplacements || {},
            selectedSoldierId,
            day
        ).filter((label) => DUTY_REPLACEMENT_LABELS.includes(label));

        return effectiveDutyLabels.map((label) => {
            const coworkers = (soldiers || []).filter((soldier) => {
                const soldierId = String(soldier.id);
                // if (soldierId === selectedSoldierId) return false;

                const soldierDutyLabels = getEffectiveScheduleLabelsForSoldierDay(
                    schedules,
                    dutyReplacements || {},
                    soldierId,
                    day
                );

                return soldierDutyLabels.includes(label);
            }).map((soldier) => ({
                id: String(soldier.id),
                name: `${soldier.rank} ${soldier.name}`.trim(),
            }));

            return {
                label,
                coworkers,
            };
        });
    }, [dutyReplacements, schedules, singleCell, soldiers]);

    const currentCombatLeaveEntry = useMemo(() => {
        if (!singleCell) return null;
        return combatLeaveData?.[singleCell.soldierId]?.[singleCell.day] || null;
    }, [combatLeaveData, singleCell]);

    useEffect(() => {
        setPosition({ x, y });
    }, [x, y]);

    useEffect(() => {
        const states = {};
        for (const type of scheduleTypes) {
            let hasIt = 0;
            let notHasIt = 0;
            for (const cell of selection.cells) {
                const cellSchedules = schedules[cell.soldierId]?.[cell.day] || [];
                if (cellSchedules.includes(type.label)) hasIt += 1;
                else notHasIt += 1;
            }
            if (hasIt === selection.cells.length) states[type.label] = 'checked';
            else if (notHasIt === selection.cells.length) states[type.label] = 'unchecked';
            else states[type.label] = 'mixed';
        }

        for (const cell of selection.cells) {
            const cellSchedules = schedules[cell.soldierId]?.[cell.day] || [];
            for (const label of cellSchedules) {
                if (!(label in states)) states[label] = 'checked';
            }
        }

        if (isSingleCell) {
            const cell = selection.cells[0];
            const combatLeaveEntry = combatLeaveData?.[cell.soldierId]?.[cell.day] || null;
            if (combatLeaveEntry?.type && MANAGED_COMBAT_LEAVE_LABELS.has(combatLeaveEntry.type)) {
                states[combatLeaveEntry.type] = 'checked';
                for (const managedLabel of MANAGED_COMBAT_LEAVE_LABELS) {
                    if (managedLabel !== combatLeaveEntry.type && !(managedLabel in states)) {
                        states[managedLabel] = 'unchecked';
                    }
                }
            }
        }

        initialLabelStatesRef.current = states;
        setLabelStates(states);

        const checkedLabels = Object.entries(states)
            .filter(([, state]) => state === 'checked')
            .map(([label]) => label);
        setInputText(checkedLabels.join(' '));

        if (isSingleCell) {
            const cell = selection.cells[0];
            setMemo(memos[`${cell.soldierId}_${cell.day}`] || '');
            const replacementKey = getDutyReplacementCellKey(cell.soldierId, cell.day);
            setReplacementSelections(dutyReplacements?.[replacementKey] || {});
        } else {
            setMemo('');
            setReplacementSelections({});
        }

        setTimeout(() => inputRef.current?.focus(), 50);
    }, [selection.cells, schedules, scheduleTypes, memos, dutyReplacements, isSingleCell, combatLeaveData]);

    const handleDragStart = (e) => {
        setDragging(true);
        dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    useEffect(() => {
        if (!dragging) return undefined;
        const handleMove = (e) => {
            setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
        };
        const handleUp = () => setDragging(false);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [dragging]);

    const buildChangesFromStates = (states) => {
        const changes = {};
        const initialStates = initialLabelStatesRef.current || {};
        const labels = new Set([...Object.keys(initialStates), ...Object.keys(states || {})]);

        for (const label of labels) {
            const previousState = initialStates[label] || 'unchecked';
            const nextState = states?.[label] || 'unchecked';

            if (previousState === nextState) continue;
            if (nextState === 'checked') changes[label] = 'add';
            else if (nextState === 'unchecked') changes[label] = 'remove';
        }
        return changes;
    };

    const buildDutyReplacementPayload = (states, selections) => {
        if (!isSingleCell) return undefined;

        return DUTY_REPLACEMENT_LABELS.reduce((acc, label) => {
            if (states?.[label] !== 'checked') return acc;

            const replacementSoldierId = String(selections?.[label] || '').trim();
            if (replacementSoldierId) acc[label] = replacementSoldierId;
            return acc;
        }, {});
    };

    const hasIncomingReplacementConflict = (replacementSoldierId, label) => {
        if (!singleCell) return false;

        const currentCellKey = getDutyReplacementCellKey(singleCell.soldierId, singleCell.day);
        const targetSoldierId = String(replacementSoldierId);
        const targetDay = Number(singleCell.day);

        return Object.entries(dutyReplacements || {}).some(([cellKey, replacementMap]) => {
            if (cellKey === currentCellKey) return false;

            const separatorIndex = cellKey.lastIndexOf('_');
            if (separatorIndex <= 0) return false;

            const sourceSoldierId = cellKey.slice(0, separatorIndex).trim();
            const day = Number(cellKey.slice(separatorIndex + 1));
            if (day !== targetDay) return false;
            if (!sourceSoldierId) return false;

            const sourceLabels = getRegisteredScheduleLabelsForSoldierDay(schedules, sourceSoldierId, day);
            if (!sourceLabels.includes(label)) return false;

            return String(replacementMap?.[label] || '') === targetSoldierId;
        });
    };

    const getIncomingReplacementConflictItem = (label) => {
        if (!singleCell) return null;
        return incomingReplacementItems.find((item) => item.label === label) || null;
    };

    const validateIncomingReplacementDutyConflicts = useEffectEvent(async (states) => {
        if (!singleCell) return false;

        const checkedDutyLabels = DUTY_REPLACEMENT_LABELS.filter((label) => states?.[label] === 'checked');
        for (const label of checkedDutyLabels) {
            const conflictItem = getIncomingReplacementConflictItem(label);
            if (!conflictItem) continue;

            await alert(`${singleCell.day}일 ${label} 근무는 이미 ${conflictItem.sourceSoldierName} 대신 근무로 지정되어 있습니다. 먼저 대신근무를 해제한 뒤 직접 배정해주세요.`);
            return true;
        }

        return false;
    });

    const handleReplacementSelectionChange = useEffectEvent(async (label, nextSoldierId) => {
        if (!canEdit) {
            await onBlockedEdit?.();
            return;
        }

        const replacementSoldierId = String(nextSoldierId || '').trim();

        if (!replacementSoldierId) {
            setReplacementSelections((prev) => {
                const next = { ...prev };
                delete next[label];
                return next;
            });
            return;
        }

        if (!singleCell) return;

        const day = Number(singleCell.day);
        const soldierName = soldierNameById.get(replacementSoldierId) || '선택한 용사';
        const registeredLabels = getRegisteredScheduleLabelsForSoldierDay(schedules, replacementSoldierId, day);
        if (registeredLabels.includes(label)) {
            await alert(`${soldierName} 용사는 ${day}일에 이미 ${label} 근무가 배정되어 있습니다.`);
            return;
        }

        if (hasIncomingReplacementConflict(replacementSoldierId, label)) {
            await alert(`${soldierName} 용사는 ${day}일에 이미 다른 용사의 ${label} 근무를 대신 서고 있습니다.`);
            return;
        }

        setReplacementSelections((prev) => ({ ...prev, [label]: replacementSoldierId }));
    });

    const showBlockedEditAlert = useEffectEvent(async () => {
        if (canEdit) return false;
        await onBlockedEdit?.();
        return true;
    });

    const saveAndClose = async (states, memoText = memo, selections = replacementSelections) => {
        if (await validateIncomingReplacementDutyConflicts(states)) {
            return;
        }

        const changes = buildChangesFromStates(states);
        const nextDutyReplacements = buildDutyReplacementPayload(states, selections);

        if (!event?.ctrlKey) {
            onClose();
        }
        await onSave(changes, isSingleCell ? memoText : undefined, nextDutyReplacements);
    };

    const toggleLabel = useEffectEvent(async (label) => {
        if (await showBlockedEditAlert()) return;

        const current = labelStates[label];
        let next;
        if (MANAGED_COMBAT_LEAVE_LABELS.has(label)) next = current === 'checked' ? 'unchecked' : 'checked';
        else if (current === 'unchecked') next = 'checked';
        else if (current === 'checked') next = 'unchecked';
        else next = 'checked';

        if (next === 'checked' && getIncomingReplacementConflictItem(label)) {
            await validateIncomingReplacementDutyConflicts({ ...labelStates, [label]: 'checked' });
            return;
        }

        const newStates = { ...labelStates, [label]: next };
        if (MANAGED_COMBAT_LEAVE_LABELS.has(label) && next === 'checked') {
            for (const managedLabel of MANAGED_COMBAT_LEAVE_LABELS) {
                if (managedLabel !== label) {
                    newStates[managedLabel] = 'unchecked';
                }
            }
        }
        const checkedLabels = Object.entries(newStates)
            .filter(([, state]) => state === 'checked')
            .map(([checkedLabel]) => checkedLabel);

        setLabelStates(newStates);
        setInputText(checkedLabels.join(' '));

        if (isSingleCell) {
            void saveAndClose(newStates);
        }
    });

    const handleInputChange = useEffectEvent(async (text) => {
        if (await showBlockedEditAlert()) return;

        const inputLabels = text.trim().split(/\s+/).filter(Boolean);
        const filteredInputLabels = inputLabels.filter((label) => !MANAGED_COMBAT_LEAVE_LABELS.has(label));

        setInputText(text);

        setLabelStates((prev) => {
            const newStates = { ...prev };
            for (const type of scheduleTypes) {
                if (MANAGED_COMBAT_LEAVE_LABELS.has(type.label)) continue;
                if (filteredInputLabels.includes(type.label)) newStates[type.label] = 'checked';
                else if (prev[type.label] === 'checked') newStates[type.label] = 'unchecked';
            }
            return newStates;
        });
    });

    const handleSave = async () => {
        await saveAndClose(labelStates);
    };

    const handleReset = () => {
        const newStates = {};
        for (const type of scheduleTypes) {
            newStates[type.label] = 'unchecked';
        }
        for (const cell of selection.cells) {
            const cellSchedules = schedules[cell.soldierId]?.[cell.day] || [];
            for (const label of cellSchedules) {
                if (!(label in newStates)) newStates[label] = 'unchecked';
            }
        }
        setLabelStates(newStates);
        setInputText('');
        setMemo('');
        setReplacementSelections({});
    };

    const handleKeyDown = useEffectEvent((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    });

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const allLocked = selection.cells.every((cell) => lockedCells?.[`${cell.soldierId}_${cell.day}`]);

    const handleToggleLockClick = () => {
        if (!canEdit) {
            void onBlockedEdit?.();
            return;
        }
        if (onToggleLock) onToggleLock(selection.cells);
    };

    const handleBlockedFieldKeyDown = useEffectEvent((e) => {
        if (canEdit) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

        e.preventDefault();
        void onBlockedEdit?.();
    });

    const handleBlockedFieldPaste = useEffectEvent((e) => {
        if (canEdit) return;
        e.preventDefault();
        void onBlockedEdit?.();
    });

    return (
        <div className="schedule-popup-shell" style={{
            pointerEvents: 'none',
            left: position.x, top: position.y
        }} onClick={(e) => e.stopPropagation()}>
            <style>{schedulePopupCss}</style>

            <div className="schedule-popup" role="dialog" aria-modal="true"
                style={{
                    pointerEvents: 'visibleFill',
                }}
            >
                <div className="schedule-popup-header" onMouseDown={handleDragStart}>
                    <span className="schedule-popup-title" title={popupTitle}>{popupTitle}</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="schedule-popup-body">
                    {/* <div className="popup-section">
                        <div className="popup-section-title">직접 입력 (Enter 저장)</div>
                        <input
                            ref={inputRef}
                            type="text"
                            className="popup-input"
                            placeholder="주 평 훈"
                            value={inputText}
                            readOnly={!canEdit}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleBlockedFieldKeyDown}
                            onPaste={handleBlockedFieldPaste}
                        />
                    </div> */}

                    <div className="popup-section">
                        <div className="popup-section-title">클릭 선택{isSingleCell ? ' (CTRL 누르고 클릭=안닫힘)' : ''}</div>
                        <div className="schedule-type-grid">
                            {scheduleTypes.filter((type) => isSingleCell || !MANAGED_COMBAT_LEAVE_LABELS.has(type.label)).map((type) => {
                                const state = labelStates[type.label] || 'unchecked';
                                return (
                                    <div
                                        key={type.label}
                                        className="schedule-type-btn"
                                        style={{
                                            background: type.bg,
                                            color: type.color,
                                            opacity: state === 'unchecked' ? 0.5 : 1,
                                            border: '1px solid #666',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            void toggleLabel(type.label);
                                        }}
                                        title={MANAGED_COMBAT_LEAVE_LABELS.has(type.label) && currentCombatLeaveEntry?.status === 'approved'
                                            ? `${type.desc}\n승인된 전투휴무는 제거하거나 덮어쓸 수 없습니다.`
                                            : type.desc}
                                    >
                                        {type.label}
                                        {state !== 'unchecked' && (
                                            <span className={`state-badge ${state}`}>
                                                {state === 'checked' ? '✓' : '−'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {isSingleCell && (
                        <div className="popup-section">
                            <div className="popup-section-title">메모</div>
                            <textarea
                                className="popup-memo"
                                placeholder="메모 입력..."
                                value={memo}
                                readOnly={!canEdit}
                                onChange={(e) => setMemo(e.target.value)}
                                onBeforeInput={(e) => {
                                    if (!canEdit) {
                                        e.preventDefault();
                                        void onBlockedEdit?.();
                                    }
                                }}
                                onPaste={handleBlockedFieldPaste}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    )}

                    <div className="popup-actions">
                        {canEdit ? (<>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn-reset" onClick={handleReset}>초기화</button>
                                <button className={`btn-lock ${allLocked ? 'locked' : 'unlocked'}`} onClick={handleToggleLockClick}>
                                    {allLocked ? '🔓 해제' : '🔒 검정색'}
                                </button>
                            </div>
                        </>) : <div className='f1' />}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={onClose}>취소</button>
                            {canEdit && (<>
                                <button className="btn-save" onClick={handleSave}>저장</button>
                            </>)}
                        </div>
                    </div>
                </div>
            </div>

            {isSingleCell && (
                <div className="schedule-popup-sidecars" style={{ pointerEvents: 'visibleFill' }}>
                    <div className="schedule-popup-sidecar">
                        <div className="schedule-popup-sidecar-title">근무 대신 세우기</div>
                        <div className="schedule-popup-sidecar-body">
                            {activeDutyLabels.length === 0 && (
                                <div className="schedule-popup-sidecar-empty">선택된 근무가 없습니다.</div>
                            )}

                            {activeDutyLabels.map((label) => {
                                const selectedSoldierId = replacementSelections[label] || '';
                                const rowActive = !!selectedSoldierId;
                                const dutyType = scheduleTypes.find((t) => t.label === label);
                                const labelStyle = dutyType ? { background: dutyType.bg, color: dutyType.color } : { background: '#555', color: '#fff' };
                                return (
                                    <div key={label} className={`duty-replacement-row ${rowActive ? 'active' : 'inactive'}`}>
                                        <div className="duty-replacement-label" style={labelStyle}>{label}</div>
                                        <select
                                            className="duty-replacement-select"
                                            value={selectedSoldierId}
                                            onChange={(e) => {
                                                void handleReplacementSelectionChange(label, e.target.value);
                                            }}
                                            onMouseDown={(e) => {
                                                if (!canEdit) {
                                                    e.preventDefault();
                                                    void onBlockedEdit?.();
                                                }
                                            }}
                                        >
                                            <option value="">선택안함</option>
                                            {replacementSoldierGroups.map((group) => (
                                                <optgroup key={group.key} label={group.label}>
                                                    {group.soldiers.map((soldier) => (
                                                        <option key={soldier.id} value={soldier.id}>
                                                            {soldier.rank} {soldier.name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            ))}
                                        </select>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {incomingReplacementItems.length > 0 && (
                        <div className="schedule-popup-sidecar incoming">
                            <div className="schedule-popup-sidecar-title">누구의 근무를 대신 서나요?</div>
                            <div className="schedule-popup-sidecar-body">
                                {incomingReplacementItems.map((item) => {
                                    const dutyType = scheduleTypes.find((t) => t.label === item.label);
                                    const labelStyle = dutyType ? { background: dutyType.bg, color: dutyType.color } : { background: '#555', color: '#fff' };

                                    return (
                                        <div key={item.key} className="incoming-duty-row active">
                                            <div className="incoming-duty-header">
                                                <div className="duty-replacement-label" style={labelStyle}>{item.label}</div>
                                                <div className="incoming-duty-text">{item.sourceSoldierName}</div>
                                                <div>{`→`}</div>
                                                <div>{`나`}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="schedule-popup-sidecar own-duty">
                        <div className="schedule-popup-sidecar-title">내 근무 / 같이 서는 인원</div>
                        <div className="schedule-popup-sidecar-body">
                            {currentDutySummaries.length === 0 && (
                                <div className="schedule-popup-sidecar-empty">현재 실제 근무가 없습니다.</div>
                            )}

                            {currentDutySummaries.map((item) => {
                                const dutyType = scheduleTypes.find((t) => t.label === item.label);
                                const labelStyle = dutyType ? { background: dutyType.bg, color: dutyType.color } : { background: '#555', color: '#fff' };

                                return (
                                    <div key={item.label} className="own-duty-row active">
                                        <div className="incoming-duty-header">
                                            <div className="duty-replacement-label" style={labelStyle}>{item.label}</div>
                                        </div>
                                        {item.coworkers.length > 0
                                            && <>
                                                <div className='f row own-duty-coworkers' style={{
                                                    flexWrap: 'wrap',
                                                }}>
                                                    {item.coworkers.map((coworker, idx) => (
                                                        <div key={coworker.id} className="own-duty-coworker">{coworker.name}{idx < item.coworkers.length - 1 ? ', ' : ''}</div>
                                                    ))}
                                                </div>
                                            </>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
