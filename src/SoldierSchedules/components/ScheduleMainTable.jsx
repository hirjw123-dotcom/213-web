import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { battalionSchedulesController } from '../../@controllers/battalionSchedulesController.js';
import {
    getDutyCountTotalsForLabels,
    getIncomingReplacementDutyLabelsForSoldierDay,
    getRegisteredScheduleLabelsForSoldierDay,
    hasDutyReplacementForCell,
} from '../../@controllers/dutyReplacementController.js';
import { calcServiceDays } from '../../@modules/dates.js';
import { colorSettingsController } from '../../@controllers/colorSettingsController.js';
import { getDayOfWeek } from '../@modules/utils.js';
import DutyRosterTable from './DutyRosterTable.jsx';
import ScheduleSummaryRows from './ScheduleSummaryRows.jsx';

const DUTY_LABELS = ['평', '주', '불', '훈', '동반'];
const COMPOSITION_FIELDS = ['weekday', 'weekend', 'guard', 'fixedWeekday', 'fixedWeekend', 'fixedGuard'];
const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const getPayGrade = (promotionDate, year, month) => {
    if (!Array.isArray(promotionDate) || promotionDate.length < 2) return '';
    const promotionYear = Number(promotionDate[0]);
    const promotionMonth = Number(promotionDate[1]);
    if (!Number.isInteger(promotionYear) || !Number.isInteger(promotionMonth) || promotionMonth < 1 || promotionMonth > 12) return '';
    const elapsedMonths = ((year - promotionYear) * 12) + (month - promotionMonth);
    return elapsedMonths >= 0 ? elapsedMonths + 1 : '';
};

const normalizeCompositionInput = (field, value) => {
    const trimmed = String(value ?? '').trim();
    const isFixedField = field.startsWith('fixed');
    if (isFixedField) {
        const parsed = Math.floor(Number(trimmed));
        if (trimmed === '-' || trimmed === '' || !Number.isFinite(parsed) || parsed < 0) return '-';
        return String(parsed);
    }
    const parsed = Math.floor(Number(trimmed));
    if (trimmed === '' || !Number.isFinite(parsed) || parsed < 0) return '';
    return String(parsed);
};

function EditableCompositionInput({
    soldierId,
    field,
    value,
    canEditComposition,
    onChangeComposition,
    moveCompositionFocus,
}) {
    const inputRef = useRef(null);
    const isFixedField = field.startsWith('fixed');
    const displayValue = value === '-' ? '-' : (value || '');
    const lastCommittedValueRef = useRef(displayValue);
    const [localValue, setLocalValue] = useState(displayValue);

    useEffect(() => {
        const activeElement = document.activeElement;
        lastCommittedValueRef.current = displayValue;
        if (activeElement === inputRef.current) return;
        setLocalValue(displayValue);
    }, [displayValue]);

    const commitValue = (nextRawValue) => {
        const rawValue = nextRawValue ?? inputRef.current?.value ?? localValue;
        const normalized = normalizeCompositionInput(field, rawValue);
        if (inputRef.current && inputRef.current.value !== normalized) {
            inputRef.current.value = normalized;
        }
        setLocalValue(normalized);
        if (lastCommittedValueRef.current === normalized) return normalized;
        lastCommittedValueRef.current = normalized;
        onChangeComposition?.(soldierId, field, normalized);
        return normalized;
    };

    return (
        <input
            ref={inputRef}
            type="text"
            className="duty-target-input"
            value={localValue}
            data-composition-soldier={soldierId}
            data-composition-field={field}
            readOnly={!canEditComposition}
            onInput={(e) => {
                const nextValue = e.currentTarget.value.trim();
                if (isFixedField) {
                    if (nextValue === '' || nextValue === '-' || /^\d+$/.test(nextValue)) {
                        setLocalValue(nextValue === '' ? '-' : nextValue);
                    }
                    return;
                }
                if (nextValue === '' || /^\d+$/.test(nextValue)) {
                    setLocalValue(nextValue);
                }
            }}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={(e) => {
                commitValue(e.currentTarget.value);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Delete' && isFixedField) {
                    e.preventDefault();
                    setLocalValue('-');
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    setLocalValue(displayValue);
                    e.currentTarget.blur();
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    commitValue(e.currentTarget.value);
                    if (e.key === 'Enter') {
                        moveCompositionFocus(soldierId, field, 'ArrowDown');
                    } else if (e.key === 'Tab' && e.shiftKey) {
                        moveCompositionFocus(soldierId, field, 'ShiftTab');
                    } else if (e.key === 'Tab') {
                        moveCompositionFocus(soldierId, field, 'Tab');
                    } else {
                        moveCompositionFocus(soldierId, field, e.key);
                    }
                }
            }}
        />
    );
}

export default function ScheduleMainTable({
    tableRef,
    days,
    year,
    month,
    weeklySchedules,
    dailySchedules,
    filteredSoldiers,
    soldiers,
    schedules,
    combatLeaveData,
    scheduleTypeByLabel,
    dayTypeAssignments,
    lockedCells,
    memos,
    dutyReplacements,
    dayDragState,
    tooltipDay,
    dragSource,
    isDragging,
    isToday,
    isSunday,
    isSaturday,
    isDayInDragRange,
    getDayHeaderStyle,
    getWeekdayColspan,
    getUnitInfo,
    getScheduleStyle,
    isCellSelected,
    isDragTarget,
    handleDayHeaderMouseDown,
    handleDayHeaderMouseEnter,
    handleMouseDown,
    handleMouseEnter,
    setTooltipDay,
    setTooltipPos,
    setShowSoldierHistory,
    hoveredSoldierId,
    focusedSoldierId,
    getSoldierCellCategories,
    onHoverSoldier,
    onDayHover,
    onClearDayHover,
    onFocusSoldier,
    onOpenSoldierMenu,
    onOpenCategoryMenu,
    showDutyCount,
    onToggleDutyCount,
    dutyCompositionBySoldier,
    canEditComposition,
    onChangeComposition,
    cellWidthMode,
    showPayGrade,
    zzamColors,
    categoryColorMap,
    visibleScheduleTypeLabels,
    isScheduleTypeFilterActive,
}) {
    let lastUnit = null;
    const dutyTargetFieldByLabel = { 평: 'weekday', 주: 'weekend', 불: 'guard' };
    const dutyFixedFieldByLabel = { 평: 'fixedWeekday', 주: 'fixedWeekend', 불: 'fixedGuard' };
    const [dailyScheduleTooltip, setDailyScheduleTooltip] = useState(null);
    const visibleScheduleTypeLabelSet = useMemo(() => new Set(visibleScheduleTypeLabels || []), [visibleScheduleTypeLabels]);

    const dailyScheduleItemsByDay = useMemo(() => {
        const result = {};
        for (const day of days) {
            const dateKey = battalionSchedulesController.utils.formatDate(new Date(year, month - 1, day));
            const text = dailySchedules?.[dateKey]?.text || '';
            result[day] = text.split('\n').map((line) => line.trim()).filter(Boolean);
        }
        return result;
    }, [days, year, month, dailySchedules]);

    const getDisplayedScheduleLabels = (soldierId, day, registeredSchedules) => {
        const combatLeaveEntry = combatLeaveData?.[soldierId]?.[day];
        if (!combatLeaveEntry?.type || registeredSchedules.includes(combatLeaveEntry.type)) return registeredSchedules;
        return [combatLeaveEntry.type, ...registeredSchedules];
    };

    const focusCompositionInput = (soldierId, field) => {
        const target = tableRef.current?.querySelector(`[data-composition-soldier="${soldierId}"][data-composition-field="${field}"]`);
        if (target) {
            target.focus();
            target.select();
        }
    };

    const moveCompositionFocus = (soldierId, field, direction) => {
        const rowIndex = filteredSoldiers.findIndex((soldier) => String(soldier.id) === String(soldierId));
        const fieldIndex = COMPOSITION_FIELDS.indexOf(field);
        if (rowIndex < 0 || fieldIndex < 0) return;

        let nextRowIndex = rowIndex;
        let nextFieldIndex = fieldIndex;

        if (direction === 'ArrowLeft') nextFieldIndex = Math.max(0, fieldIndex - 1);
        else if (direction === 'ArrowRight') nextFieldIndex = Math.min(COMPOSITION_FIELDS.length - 1, fieldIndex + 1);
        else if (direction === 'ArrowUp') nextRowIndex = Math.max(0, rowIndex - 1);
        else if (direction === 'ArrowDown') nextRowIndex = Math.min(filteredSoldiers.length - 1, rowIndex + 1);
        else if (direction === 'Tab') {
            nextFieldIndex = fieldIndex + 1;
            if (nextFieldIndex >= COMPOSITION_FIELDS.length) {
                nextFieldIndex = 0;
                nextRowIndex = Math.min(filteredSoldiers.length - 1, rowIndex + 1);
            }
        } else if (direction === 'ShiftTab') {
            nextFieldIndex = fieldIndex - 1;
            if (nextFieldIndex < 0) {
                nextFieldIndex = COMPOSITION_FIELDS.length - 1;
                nextRowIndex = Math.max(0, rowIndex - 1);
            }
        }

        const nextSoldier = filteredSoldiers[nextRowIndex];
        if (!nextSoldier) return;
        focusCompositionInput(nextSoldier.id, COMPOSITION_FIELDS[nextFieldIndex]);
    };

    // 근무 타입별 스타일
    const dutyTypeStyles = useMemo(() => {
        const styles = {};
        for (const label of DUTY_LABELS) {
            const type = scheduleTypeByLabel[label];
            if (type) {
                styles[label] = {
                    background: type.bg || '#fff',
                    color: type.color || '#333',
                    fontWeight: type.bold ? 700 : 600,
                };
            } else {
                styles[label] = { background: '#f0f0f0', color: '#333', fontWeight: 600 };
            }
        }
        return styles;
    }, [scheduleTypeByLabel]);

    const dutySummaryTotals = useMemo(() => {
        const totals = {
            actual: { 평: 0, 주: 0, 불: 0, 훈: 0, 동반: 0 },
            assigned: { 평: 0, 주: 0, 불: 0 },
            fixed: { 평: 0, 주: 0, 불: 0 },
        };

        for (const soldier of filteredSoldiers) {
            const soldierId = String(soldier.id);
            const soldierSchedules = schedules[soldierId];
            if (soldierSchedules) {
                for (const day of Object.keys(soldierSchedules)) {
                    const labels = getRegisteredScheduleLabelsForSoldierDay(schedules, soldierId, Number(day));
                    const labelCounts = getDutyCountTotalsForLabels(labels);
                    for (const label of DUTY_LABELS) {
                        totals.actual[label] += labelCounts[label] || 0;
                    }
                }
            }

            const composition = dutyCompositionBySoldier?.[soldierId] || {};
            totals.assigned.평 += Number(composition.weekday) || 0;
            totals.assigned.주 += Number(composition.weekend) || 0;
            totals.assigned.불 += Number(composition.guard) || 0;
            totals.fixed.평 += composition.fixedWeekday === '-' ? 0 : (Number(composition.fixedWeekday) || 0);
            totals.fixed.주 += composition.fixedWeekend === '-' ? 0 : (Number(composition.fixedWeekend) || 0);
            totals.fixed.불 += composition.fixedGuard === '-' ? 0 : (Number(composition.fixedGuard) || 0);
        }

        return totals;
    }, [filteredSoldiers, schedules, dutyCompositionBySoldier]);

    // 용사별 근무 횟수 계산
    const soldierDutyCounts = useMemo(() => {
        if (!showDutyCount) return {};
        const result = {};
        for (const soldier of filteredSoldiers) {
            const counts = {};
            for (const label of DUTY_LABELS) counts[label] = 0;

            const soldierSchedules = schedules[soldier.id];
            if (soldierSchedules) {
                for (const [day, dayLabels] of Object.entries(soldierSchedules)) {
                    if (!Array.isArray(dayLabels)) continue;
                    const registeredLabels = getRegisteredScheduleLabelsForSoldierDay(schedules, soldier.id, Number(day));
                    const labelCounts = getDutyCountTotalsForLabels(registeredLabels);
                    for (const label of DUTY_LABELS) {
                        counts[label] += labelCounts[label] || 0;
                    }
                }
            }
            result[soldier.id] = counts;
        }
        return result;
    }, [filteredSoldiers, schedules, showDutyCount]);

    const getSoldierServiceInfo = (soldier) => {
        const hasServiceDates = Array.isArray(soldier.startDate) && Array.isArray(soldier.exitDate);
        const rate = hasServiceDates ? calcServiceDays.percentage(soldier.startDate, soldier.exitDate) : 0;
        const displayRate = Math.round(rate * 10) / 10;
        const colorInfo = colorSettingsController.getSoldierColor(soldier, displayRate, zzamColors || [], categoryColorMap || {});
        return {
            rate,
            displayRate,
            colorInfo: colorInfo || {},
        };
    };

    const getTooltipPosition = (clientX, clientY) => {
        const width = 260;
        const height = 220;
        const padding = 16;
        return {
            x: Math.max(padding, Math.min(clientX + 14, window.innerWidth - width - padding)),
            y: Math.max(padding, Math.min(clientY + 14, window.innerHeight - height - padding)),
        };
    };

    const handleDailyScheduleMouseEnter = (e, day) => {
        const items = dailyScheduleItemsByDay[day] || [];
        if (items.length === 0) {
            setDailyScheduleTooltip(null);
            return;
        }
        setDailyScheduleTooltip({
            day,
            items,
            ...getTooltipPosition(e.clientX, e.clientY),
        });
    };

    const handleDailyScheduleMouseMove = (e, day) => {
        setDailyScheduleTooltip((prev) => {
            if (!prev || prev.day !== day) return prev;
            return {
                ...prev,
                ...getTooltipPosition(e.clientX, e.clientY),
            };
        });
    };

    const handleDailyScheduleMouseLeave = () => {
        setDailyScheduleTooltip(null);
    };

    useEffect(() => {
        return () => {
            window.hoveredController.setShow(null);
        };
    }, [])

    const dayCellWidth = cellWidthMode + 'px';

    return (
        <div className="ss-table-wrap" ref={tableRef} style={{ '--ss-day-cell-width': dayCellWidth }}>
            <table className="ss-table"
                onMouseLeave={() => {
                    onClearDayHover?.();
                }}>
                <thead>
                    <tr>
                        <th className="col-num">#</th>
                        <th className="col-name">계급/이름</th>
                        {showPayGrade && <th className="col-pay-grade">호봉</th>}
                        {days.map((day) => {
                            let cls = 'col-day';
                            if (isToday(day)) cls += ' today';
                            if (isSunday(day)) cls += ' sunday sunday-col';
                            else if (isSaturday(day)) cls += ' saturday';
                            if (isDayInDragRange(day)) cls += ' day-drag-active';
                            // if (hoveredDay === day) cls += ' col-hover';
                            const dayTypeStyle = getDayHeaderStyle(day);
                            return (
                                <th
                                    key={day}
                                    data-day={day}
                                    className={cls}
                                    style={dayTypeStyle || {}}
                                    onMouseDown={(e) => handleDayHeaderMouseDown(e, day)}
                                    onMouseEnter={(e) => {
                                        handleDayHeaderMouseEnter(day);
                                        onDayHover?.(day);
                                        if (!dayDragState.isDragging) {
                                            setTooltipDay(day);
                                            setTooltipPos({ x: e.clientX, y: e.clientY });
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        if (tooltipDay === day) setTooltipPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    onMouseLeave={() => {
                                        setTooltipDay(null);
                                    }}
                                >
                                    {day}
                                </th>
                            );
                        })}
                        <th className="col-cat">분류(우클릭)</th>
                        {showDutyCount && DUTY_LABELS.map((label) => (
                            <th
                                key={`dc-h-${label}`}
                                className="col-duty-count"
                                style={dutyTypeStyles[label]}
                            >
                                {label}
                            </th>
                        ))}
                        {showDutyCount && ['평', '주', '불'].map((label) => (
                            <th key={`dt-h-${label}`} className="col-duty-target" style={{ background: 'rgb(255, 243, 224)' }}>편{label}</th>
                        ))}
                        {showDutyCount && ['평', '주', '불'].map((label) => (
                            <th key={`df-h-${label}`} className="col-duty-target" style={{
                                background: '#000',
                                color: '#fff',
                                borderLeft: label == '평' ? '2px solid #000' : undefined,
                            }}>고{label}</th>
                        ))}
                        {showDutyCount && <th className="col-service-info" style={{
                            minWidth: 45,
                            width: 45,
                        }}>전입</th>}
                        {showDutyCount && <th className="col-service-info">복무율</th>}
                        <th
                            className="col-duty-toggle"
                            onClick={onToggleDutyCount}
                            title={showDutyCount ? '근무 횟수 숨기기' : '근무 횟수 보기'}
                        >
                            {showDutyCount ? '◀' : '▶'}
                        </th>
                    </tr>
                    <tr className="daily-row">
                        <td className="sticky-cell" style={{ left: 0 }}></td>
                        <td className="sticky-cell" style={{ left: 35, fontWeight: 600, fontSize: 11 }}>일일일정</td>
                        {showPayGrade && <td className="sticky-cell col-pay-grade" />}
                        {days.map((day) => {
                            const items = dailyScheduleItemsByDay[day] || [];
                            return (
                                <td
                                    key={day}
                                    className={`daily-schedule-cell${items.length ? ' has-items' : ''}${isSunday(day) ? ' sunday-col' : ''}`}
                                    onMouseEnter={(e) => handleDailyScheduleMouseEnter(e, day)}
                                    onMouseMove={(e) => handleDailyScheduleMouseMove(e, day)}
                                    onMouseLeave={handleDailyScheduleMouseLeave}
                                >
                                    {items.length ? `${items.length}개` : ''}
                                </td>
                            );
                        })}
                        <td className="col-cat" />
                        {showDutyCount && DUTY_LABELS.map((label) => (
                            <td key={`dc-d-${label}`} className="col-duty-count" style={{ background: '#f5f5f5' }} />
                        ))}
                        {showDutyCount && ['평', '주', '불'].map((label) => (
                            <td key={`dt-d-${label}`} className="col-duty-target" style={{ background: 'rgb(255, 243, 224)' }} />
                        ))}
                        {showDutyCount && ['평', '주', '불'].map((label) => (
                            <td key={`df-d-${label}`} className="col-duty-target" style={{
                                background: '#f5f5f5',
                                borderLeft: label == '평' ? '2px solid #000' : undefined,
                            }} />
                        ))}
                        {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5' }} />}
                        {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5' }} />}
                        <td className="col-duty-toggle" />
                    </tr>
                    <tr className="week-row">
                        <td className="sticky-cell" style={{ left: 0 }}></td>
                        <td className="sticky-cell" style={{ left: 35, fontWeight: 600, fontSize: 11 }}>주간일정</td>
                        {showPayGrade && <td className="sticky-cell col-pay-grade" />}
                        {days.map((day) => {
                            const dayOfWeek = getDayOfWeek(year, month, day);
                            if (dayOfWeek === 0 || dayOfWeek === 6) {
                                return <td key={day} className={dayOfWeek === 0 ? 'sunday-col' : ''} style={{ background: '#eee' }}>-</td>;
                            }

                            const prevDayOfWeek = day > 1 ? getDayOfWeek(year, month, day - 1) : -1;
                            const isWeekStart = dayOfWeek === 1 || (day === 1 && dayOfWeek >= 1 && dayOfWeek <= 5) || (prevDayOfWeek === 0 || prevDayOfWeek === 6);
                            if (isWeekStart) {
                                const colspan = getWeekdayColspan(day);
                                if (colspan === 0) return null;
                                const date = new Date(year, month - 1, day);
                                const { year: weekYear, weekNum } = battalionSchedulesController.utils.getWeekNumber(date);
                                const weekKey = battalionSchedulesController.utils.getWeekKey(weekYear, weekNum);
                                return <td key={day} colSpan={colspan} className="week-content" style={{
                                    maxWidth: dayCellWidth,
                                }}>{weeklySchedules[weekKey]?.text || '-'}</td>;
                            }

                            return null;
                        })}
                        <td className="col-cat" />
                        {showDutyCount && DUTY_LABELS.map((label) => (
                            <td key={`dc-w-${label}`} className="col-duty-count" style={{ background: '#f5f5f5' }} />
                        ))}
                        {showDutyCount && ['평', '주', '불'].map((label) => (
                            <td key={`dt-w-${label}`} className="col-duty-target" style={{ background: 'rgb(255, 243, 224)' }} />
                        ))}
                        {showDutyCount && ['평', '주', '불'].map((label) => (
                            <td key={`df-w-${label}`} className="col-duty-target" style={{
                                background: '#f5f5f5',
                                borderLeft: label == '평' ? '2px solid #000' : undefined,
                            }} />
                        ))}
                        {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5' }} />}
                        {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5' }} />}
                        <td className="col-duty-toggle" />
                    </tr>
                </thead>
                <tbody>
                    {filteredSoldiers.map((soldier, idx) => {
                        const counts = soldierDutyCounts[soldier.id] || {};
                        const composition = dutyCompositionBySoldier?.[soldier.id] || {};
                        const serviceInfo = getSoldierServiceInfo(soldier);
                        const payGrade = getPayGrade(soldier.promotionDate, year, month);
                        return (
                            <tr
                                key={soldier.id}
                                data-soldier-id={soldier.id}
                                className={`${soldier.unit !== lastUnit ? 'newUnit' : ''}${hoveredSoldierId === soldier.id ? ' hover-row' : ''}${focusedSoldierId && focusedSoldierId !== soldier.id ? ' focus-dim' : ''}${focusedSoldierId === soldier.id ? ' focus-active' : ''}`}
                            >
                                {(() => {
                                    lastUnit = soldier.unit;
                                })()}
                                <td className="sticky-cell col-num">{idx + 1}</td>
                                <td
                                    className="sticky-cell col-name"
                                    style={{
                                        background: soldier.categories?.includes('special') ? '#000' : getUnitInfo(soldier.unit).bg,
                                        color: soldier.categories?.includes('special') ? '#ff0000' : undefined,
                                        fontWeight: soldier.categories?.includes('special') ? 'bold' : undefined,
                                        cursor: 'pointer',
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenSoldierMenu?.(soldier, { x: e.clientX, y: e.clientY, rect: e.currentTarget.getBoundingClientRect() });
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenSoldierMenu?.(soldier, { x: e.clientX, y: e.clientY, rect: e.currentTarget.getBoundingClientRect() });
                                    }}
                                    onMouseEnter={() => onHoverSoldier?.(soldier.id)}
                                    onMouseLeave={() => onHoverSoldier?.(null)}
                                    title="클릭 또는 우클릭하여 메뉴 열기"
                                >
                                    <div style={{
                                        zoom: 1.1
                                    }}>
                                        {soldier.rank} {soldier.name}
                                    </div>
                                </td>
                                {showPayGrade && (
                                    <td className="sticky-cell col-pay-grade">
                                        {payGrade ? `${payGrade}호` : ''}
                                    </td>
                                )}
                                {days.map((day) => {
                                    const registeredSchedules = getRegisteredScheduleLabelsForSoldierDay(schedules, soldier.id, day);
                                    const displayedSchedules = getDisplayedScheduleLabels(soldier.id, day, registeredSchedules);
                                    const combatLeaveEntry = combatLeaveData?.[soldier.id]?.[day];
                                    const incomingReplacementLabels = getIncomingReplacementDutyLabelsForSoldierDay(schedules, dutyReplacements, soldier.id, day);
                                    const filteredDisplayedSchedules = isScheduleTypeFilterActive
                                        ? displayedSchedules.filter((label) => visibleScheduleTypeLabelSet.has(label))
                                        : displayedSchedules;
                                    const filteredIncomingReplacementLabels = isScheduleTypeFilterActive
                                        ? incomingReplacementLabels.filter((label) => visibleScheduleTypeLabelSet.has(label))
                                        : incomingReplacementLabels;
                                    const isLocked = lockedCells[`${soldier.id}_${day}`];
                                    const contentStyle = isLocked
                                        ? { background: '#222', color: '#fff' }
                                        : getScheduleStyle(filteredDisplayedSchedules, day);
                                    const hasDutyReplacement = hasDutyReplacementForCell(dutyReplacements, soldier.id, day) && filteredDisplayedSchedules.length > 0;
                                    const hasIncomingReplacement = filteredIncomingReplacementLabels.length > 0;
                                    const hasPendingFullDayCombatLeave =
                                        filteredDisplayedSchedules.includes(combatLeaveEntry?.type) &&
                                        combatLeaveEntry?.status === 'pending' && (
                                            combatLeaveEntry?.type === '전휴'
                                            || combatLeaveEntry?.type === '반투'
                                        );
                                    const cellStyle = hasDutyReplacement
                                        ? { ...(contentStyle || {}), filter: 'grayscale(100%)' }
                                        : hasPendingFullDayCombatLeave
                                            ? { ...(contentStyle || {}), filter: 'grayscale(100%)' }
                                            : (contentStyle || {});
                                    const selected = isCellSelected(soldier.id, day);
                                    const hasMemo = memos[`${soldier.id}_${day}`];
                                    const dragTargetCell = isDragTarget(soldier.id, day);
                                    const dragSourceCell = isDragging && dragSource?.cells.some((cell) => cell.soldierId === soldier.id && cell.day === day);
                                    const hoverText = `${soldier.rank} ${soldier.name} ${month}/${day} (${DAY_NAMES[getDayOfWeek(year, month, day)]})`;

                                    let cls = 'schedule-cell';
                                    if (isSunday(day)) cls += ' sunday-col';
                                    if (selected) cls += ' selected';
                                    if (dragTargetCell) cls += ' drag-target';
                                    if (dragSourceCell) cls += ' drag-source';
                                    if (hasIncomingReplacement) cls += ' has-incoming-replacement';
                                    return (
                                        <td
                                            key={day}
                                            data-soldier-id={soldier.id}
                                            data-day={day}
                                            className={cls}
                                            style={cellStyle}
                                            onMouseDown={(e) => handleMouseDown(e, soldier.id, day)}
                                            onMouseEnter={(e) => {
                                                onHoverSoldier?.(soldier.id);
                                                onDayHover?.(day);
                                                handleMouseEnter(e, soldier.id, day);
                                                window.hoveredController.setShow(hoverText);
                                                window.hoveredController.setTransXY(e.clientX, e.clientY);
                                            }}
                                            onMouseMove={(e) => {
                                                window.hoveredController.setTransXY(e.clientX, e.clientY);
                                            }}
                                            onMouseLeave={() => {
                                                window.hoveredController.setShow(null);
                                            }}
                                        >
                                            <div className="schedule-content" style={contentStyle || {}}>{filteredDisplayedSchedules.map((scheduleLabel, index) => {
                                                return scheduleLabel;
                                                return <span key={scheduleLabel} style={{
                                                    fontSize: scheduleLabel?.length >= 4 ? 11 : (scheduleLabel?.length >= 3 ? 12 : null),
                                                }}>{scheduleLabel}</span>;
                                            })}</div>
                                            {hasIncomingReplacement && (
                                                <div className="incoming-replacement-bars">
                                                    {filteredIncomingReplacementLabels.map((label) => {
                                                        const type = scheduleTypeByLabel[label];
                                                        return (
                                                            <span
                                                                key={`${soldier.id}_${day}_${label}`}
                                                                className="incoming-replacement-bar"
                                                                title={`${label} 대신 근무`}
                                                                style={{ background: type?.bg || '#999' }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            {hasMemo && <div className="memo-indicator" />}
                                        </td>
                                    );
                                })}
                                <td
                                    className="col-cat"
                                    onMouseEnter={() => onHoverSoldier?.(soldier.id)}
                                    onMouseLeave={() => onHoverSoldier?.(null)}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenCategoryMenu?.(soldier, { x: e.clientX, y: e.clientY, rect: e.currentTarget.getBoundingClientRect() });
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onOpenCategoryMenu?.(soldier, { x: e.clientX, y: e.clientY, rect: e.currentTarget.getBoundingClientRect() });
                                    }}
                                >
                                    <div className="soldier-cat-cell">
                                        {(getSoldierCellCategories?.(soldier) || []).map((category) => (
                                            <span
                                                key={category.id}
                                                className="soldier-cat-chip"
                                                style={{
                                                    background: category.bg || '#fff',
                                                    color: category.color || '#333',
                                                    borderColor: category.color || '#999',
                                                    fontWeight: category.bold ? 700 : 500,
                                                }}
                                                title={category.label}
                                            >
                                                {category.label}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                {showDutyCount && DUTY_LABELS.map((label) => {
                                    const val = counts[label] || 0;
                                    const targetField = dutyTargetFieldByLabel[label];
                                    const targetVal = targetField ? Number(composition?.[targetField]) || 0 : 0;
                                    const isMismatch = !!targetField && val !== targetVal;
                                    return (
                                        <td
                                            key={`dc-${label}`}
                                            className="col-duty-count"
                                            style={{
                                                color: isMismatch ? '#000' : (val > 0 || targetVal > 0 ? '#000' : '#bbb'),
                                                background: isMismatch ? '#f44336' : '#fff',
                                                fontWeight: isMismatch || val > 0 || targetVal > 0 ? 700 : 400,
                                            }}
                                            title={targetField ? `실제 ${val} / 편성 ${targetVal}` : undefined}
                                        >
                                            {val}
                                        </td>
                                    );
                                })}
                                {showDutyCount && [
                                    { label: '평', field: 'weekday' },
                                    { label: '주', field: 'weekend' },
                                    { label: '불', field: 'guard' },
                                ].map((item) => {
                                    const targetVal = Number(composition?.[item.field]) || 0;
                                    return (
                                        <td key={`dt-${item.label}`} className="col-duty-target" style={{ background: 'rgb(255, 243, 224)' }}>
                                            <EditableCompositionInput
                                                soldierId={soldier.id}
                                                field={item.field}
                                                value={targetVal ? String(targetVal) : ''}
                                                canEditComposition={canEditComposition}
                                                onChangeComposition={onChangeComposition}
                                                moveCompositionFocus={moveCompositionFocus}
                                            />
                                        </td>
                                    );
                                })}
                                {showDutyCount && ['평', '주', '불'].map((label) => {
                                    const field = dutyFixedFieldByLabel[label];
                                    const fixedValue = composition?.[field] ?? '-';
                                    const displayValue = fixedValue === '-' ? '-' : (Number(fixedValue) || 0);
                                    return (
                                        <td key={`df-${label}`} className="col-duty-target" style={{
                                            borderLeft: label == '평' ? '2px solid #000' : undefined,
                                        }}>
                                            <EditableCompositionInput
                                                soldierId={soldier.id}
                                                field={field}
                                                value={displayValue === '-' ? '-' : String(displayValue)}
                                                canEditComposition={canEditComposition}
                                                onChangeComposition={onChangeComposition}
                                                moveCompositionFocus={moveCompositionFocus}
                                            />
                                        </td>
                                    );
                                })}
                                {showDutyCount && (
                                    <td className="col-service-info">
                                        {Array.isArray(soldier.joinDate) ? calcServiceDays.current(soldier.joinDate) + '일' : '-'}
                                    </td>
                                )}
                                {showDutyCount && (
                                    <td className="col-service-info col-service-rate">
                                        {Array.isArray(soldier.startDate) && Array.isArray(soldier.exitDate) ? (
                                            <div className="service-rate-chip" title={`${serviceInfo.displayRate}%`}>
                                                <div className="service-rate-bar-track">
                                                    <div
                                                        className="service-rate-bar-fill"
                                                        style={{
                                                            width: `${serviceInfo.rate}%`,
                                                            background: serviceInfo.colorInfo.bg || '#94a3b8',
                                                            color: serviceInfo.colorInfo.color || '#fff',
                                                            borderColor: serviceInfo.colorInfo.border || 'transparent',
                                                        }}
                                                    />
                                                    <span className="service-rate-bar-label">{serviceInfo.displayRate}%</span>
                                                </div>
                                            </div>
                                        ) : '-'}
                                    </td>
                                )}
                                <td className="col-duty-toggle" />
                            </tr>
                        );
                    })}
                    <ScheduleSummaryRows
                        days={days}
                        year={year}
                        month={month}
                        filteredSoldiers={filteredSoldiers}
                        schedules={schedules}
                        dayTypeAssignments={dayTypeAssignments}
                        scheduleTypeByLabel={scheduleTypeByLabel}
                        showDutyCount={showDutyCount}
                        showPayGrade={showPayGrade}
                        dutySummaryTotals={dutySummaryTotals}
                        onDayHover={onDayHover}
                        isSunday={isSunday}
                    />
                </tbody>
            </table>
            {dailyScheduleTooltip && (
                <div className="ss-daily-tooltip" style={{ left: dailyScheduleTooltip.x, top: dailyScheduleTooltip.y }}>
                    <div className="ss-daily-tooltip-title">
                        {month}/{String(dailyScheduleTooltip.day).padStart(2, '0')} 일일 일정
                    </div>
                    {dailyScheduleTooltip.items.map((item, index) => (
                        <div key={`${dailyScheduleTooltip.day}-${index}`} className="ss-daily-tooltip-item">{item}</div>
                    ))}
                </div>
            )}
            <DutyRosterTable year={year} month={month} days={days} soldiers={soldiers} schedules={schedules} dutyReplacements={dutyReplacements} />
        </div>
    );
}


