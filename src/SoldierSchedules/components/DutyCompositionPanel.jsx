import { useState, useEffect, useRef, useCallback, useMemo } from 'preact/hooks';
import { dutyCompositionController, normalizeDutyCompositionData } from '../../@controllers/dutyCompositionController.js';
import { cctvOrderController } from '../../@controllers/cctvOrderController.js';
import { getDutyCountTotalsForLabels, getRegisteredScheduleLabelsForSoldierDay } from '../../@controllers/dutyReplacementController.js';
import { UNITS } from '../../@modules/configs.js';
import { dutyCompositionPanelCss } from './css/dutyCompositionPanelCss.js';

// ========================================
// 근무 편성표 패널
// ========================================

const ASSIGNED_FIELDS = ['weekday', 'weekend', 'guard'];
const FIXED_FIELDS = ['fixedWeekday', 'fixedWeekend', 'fixedGuard'];
const FIELDS = [...ASSIGNED_FIELDS];

const normalizeFixedCompositionValue = (value) => {
    if (value === '-' || value == null || value === '') return '-';
    return Math.max(0, Number(value) || 0);
};

// 셀 data attribute로 input 찾기
const getCellSelector = (type, field, soldierId) => {
    if (type === 'total') return `[data-cell-type="total"][data-cell-field="${field}"]`;
    return `[data-cell-type="soldier"][data-cell-field="${field}"][data-cell-soldier="${soldierId}"]`;
};

export default function DutyCompositionPanel({ year, month, soldiers, schedules, dutyReplacements, scheduleTypes, canEditComposition = false, canEditDuty = false, canEditServiceRate = false, compositionData = null, onChangeComposition, onChangeTotalComposition, onReplaceDutyComposition, onAutoDistributeDuty, onHoverSoldier, onFocusSoldier, focusedSoldierId = null }) {
    const [composition, setComposition] = useState(null);
    const [rankOrderMap, setRankOrderMap] = useState({});
    const [showLoadPopup, setShowLoadPopup] = useState(false);
    const [prevMonths, setPrevMonths] = useState([]);
    const panelRef = useRef(null);
    const pendingFocusRef = useRef(null); // 리렌더 후 포커스 복원용

    const load = useCallback(async () => {
        const orderMap = await cctvOrderController.get();
        setRankOrderMap(orderMap || {});
    }, [year, month]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (compositionData) {
            setComposition(normalizeDutyCompositionData(compositionData));
        }
    }, [compositionData]);

    // 리렌더 후 포커스 복원 (commitCellValue로 composition이 바뀌면 셀이 재생성되므로)
    useEffect(() => {
        if (pendingFocusRef.current) {
            const { type, field, soldierId } = pendingFocusRef.current;
            pendingFocusRef.current = null;
            requestAnimationFrame(() => {
                const selector = getCellSelector(type, field, soldierId);
                const el = panelRef.current?.querySelector(selector);
                if (el) {
                    el.focus();
                    el.select();
                }
            });
        }
    });

    // 불러오기 팝업 열기
    const openLoadPopup = async () => {
        if (!canEditComposition) return;
        const all = await dutyCompositionController.listAll();
        // 현재 월 제외
        const filtered = all.filter(m => !(m.year === year && m.month === month));
        setPrevMonths(filtered);
        setShowLoadPopup(true);
    };

    // 이전 달 근무편성 불러오기
    const loadFromMonth = async (item) => {
        if (!canEditComposition) return;
        if (!await confirm(`${item.year}년 ${item.month}월의 근무편성을 불러와 현재 달에 덮어쓰시겠습니까?`)) return;
        const newData = normalizeDutyCompositionData(JSON.parse(JSON.stringify(item.data)));
        await dutyCompositionController.save(year, month, newData);
        onReplaceDutyComposition?.(newData);
        setComposition(newData);
        setShowLoadPopup(false);
    };

    if (!composition) return null;

    // 용사별 근무 횟수를 사전 계산 (useMemo로 캐싱)
    const soldierScheduleCounts = useMemo(() => {
        const counts = {};
        for (const soldier of soldiers) {
            const soldierSchedules = schedules[soldier.id];
            const soldierCounts = { weekday: 0, weekend: 0, guard: 0 };

            if (soldierSchedules) {
                for (const day of Object.keys(soldierSchedules)) {
                    const labels = getRegisteredScheduleLabelsForSoldierDay(schedules, soldier.id, Number(day));
                    if (!labels || labels.length === 0) continue;

                    const labelCounts = getDutyCountTotalsForLabels(labels);
                    soldierCounts.weekday += labelCounts.평 || 0;
                    soldierCounts.weekend += labelCounts.주 || 0;
                    soldierCounts.guard += labelCounts.불 || 0;
                }
            }
            counts[soldier.id] = soldierCounts;
        }
        return counts;
    }, [soldiers, schedules]);

    const unitBgMap = useMemo(() => {
        const map = {};
        for (const unit of UNITS) {
            map[unit.id] = unit.bg;
            map[unit.name] = unit.bg;
        }
        return map;
    }, []);

    const getSoldierUnitBg = (soldier) => unitBgMap[soldier.unit] || '#fafafa';

    // 전체 용사 합산 (편성된 근무 수)
    const getTotalAssigned = (field) => {
        let sum = 0;
        for (const s of soldiers) {
            const sv = composition.soldiers[s.id];
            if (sv) sum += (Number(sv[field]) || 0);
        }
        return sum;
    };

    // 총 근무편성 값
    const total = composition.total || { weekday: 0, weekend: 0, guard: 0 };
    const totalWeekday = Number(total.weekday) || 0;
    const totalWeekend = Number(total.weekend) || 0;
    const totalGuard = Number(total.guard) || 0;
    const totalSum = totalWeekday + totalWeekend;
    const totalGrandSum = totalSum + totalGuard;

    // 편성된 근무 수 (용사 입력 합)
    const assignedWeekday = getTotalAssigned('weekday');
    const assignedWeekend = getTotalAssigned('weekend');
    const assignedGuard = getTotalAssigned('guard');
    const assignedSum = assignedWeekday + assignedWeekend;
    const assignedGrandSum = assignedSum + assignedGuard;

    const calendarWeekday = soldiers.reduce((sum, soldier) => sum + (soldierScheduleCounts[soldier.id]?.weekday || 0), 0);
    const calendarWeekend = soldiers.reduce((sum, soldier) => sum + (soldierScheduleCounts[soldier.id]?.weekend || 0), 0);
    const calendarGuard = soldiers.reduce((sum, soldier) => sum + (soldierScheduleCounts[soldier.id]?.guard || 0), 0);
    const calendarSum = calendarWeekday + calendarWeekend;
    const calendarGrandSum = calendarSum + calendarGuard;

    const fixedWeekdayTotal = soldiers.reduce((sum, soldier) => {
        const value = composition.soldiers?.[soldier.id]?.fixedWeekday;
        return sum + (value === '-' || value == null ? 0 : (Number(value) || 0));
    }, 0);
    const fixedWeekendTotal = soldiers.reduce((sum, soldier) => {
        const value = composition.soldiers?.[soldier.id]?.fixedWeekend;
        return sum + (value === '-' || value == null ? 0 : (Number(value) || 0));
    }, 0);
    const fixedGuardTotal = soldiers.reduce((sum, soldier) => {
        const value = composition.soldiers?.[soldier.id]?.fixedGuard;
        return sum + (value === '-' || value == null ? 0 : (Number(value) || 0));
    }, 0);
    const fixedSum = fixedWeekdayTotal + fixedWeekendTotal;
    const fixedGrandSum = fixedSum + fixedGuardTotal;

    // 셀 값 변경 핸들러
    const commitCellValue = async (cell, value) => {
        if (!cell || !canEditComposition) return;
        const isFixedField = FIXED_FIELDS.includes(cell.field);
        const parsedNumber = Math.floor(Number(value));
        const normalizedValue = isFixedField
            ? (value === '-' || value === '' || !Number.isFinite(parsedNumber) || parsedNumber < 0 ? '-' : parsedNumber)
            : (value === '' ? 0 : Math.max(0, Number(value) || 0));

        if (cell.type === 'total') {
            const newTotal = { ...composition.total, [cell.field]: normalizedValue };
            await dutyCompositionController.saveTotal(year, month, newTotal);
            onChangeTotalComposition?.(cell.field, normalizedValue);
            setComposition(prev => ({ ...prev, total: newTotal }));
        } else if (cell.type === 'soldier') {
            const soldierValues = composition.soldiers[cell.soldierId] || { weekday: 0, weekend: 0, guard: 0, fixedWeekday: '-', fixedWeekend: '-', fixedGuard: '-' };
            const newValues = { ...soldierValues, [cell.field]: normalizedValue };
            await dutyCompositionController.saveSoldier(year, month, cell.soldierId, newValues);
            onChangeComposition?.(cell.soldierId, cell.field, normalizedValue);
            setComposition(prev => ({
                ...prev,
                soldiers: { ...prev.soldiers, [cell.soldierId]: newValues },
            }));
        }
    };

    // 네비게이션: 현재 셀 기준으로 다음 셀 input을 찾아 포커스
    const navigateToCell = (currentType, currentField, currentSoldierId, direction) => {
        const fieldIdx = FIELDS.indexOf(currentField);
        // 행 목록: total + 각 soldier
        const rows = [{ type: 'total' }, ...soldiers.map(s => ({ type: 'soldier', soldierId: s.id }))];
        const rowIdx = currentType === 'total'
            ? 0
            : rows.findIndex(r => r.type === 'soldier' && r.soldierId === currentSoldierId);

        let newRowIdx = rowIdx;
        let newFieldIdx = fieldIdx;

        if (direction === 'ArrowLeft') newFieldIdx = Math.max(0, fieldIdx - 1);
        else if (direction === 'ArrowRight') newFieldIdx = Math.min(FIELDS.length - 1, fieldIdx + 1);
        else if (direction === 'ArrowUp') newRowIdx = Math.max(0, rowIdx - 1);
        else if (direction === 'ArrowDown') newRowIdx = Math.min(rows.length - 1, rowIdx + 1);
        else if (direction === 'Enter' || direction === 'Tab') {
            newFieldIdx = fieldIdx + 1;
            if (newFieldIdx >= FIELDS.length) {
                newFieldIdx = 0;
                newRowIdx = rowIdx + 1;
                if (newRowIdx >= rows.length) return; // 마지막 셀
            }
        } else if (direction === 'ShiftTab') {
            newFieldIdx = fieldIdx - 1;
            if (newFieldIdx < 0) {
                newFieldIdx = FIELDS.length - 1;
                newRowIdx = rowIdx - 1;
                if (newRowIdx < 0) return; // 첫 셀
            }
        }

        if (newRowIdx === rowIdx && newFieldIdx === fieldIdx) return;

        const targetRow = rows[newRowIdx];
        const focusTarget = {
            type: targetRow.type,
            field: FIELDS[newFieldIdx],
            soldierId: targetRow.soldierId,
        };
        // 리렌더 후에도 포커스가 복원되도록 저장
        pendingFocusRef.current = focusTarget;
        // 즉시 포커스도 시도 (값 변경 없이 이동하는 경우)
        const selector = getCellSelector(focusTarget.type, focusTarget.field, focusTarget.soldierId);
        const nextInput = panelRef.current?.querySelector(selector);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    };

    const getCellValue = (type, field, soldierId) => {
        if (type === 'total') {
            return Number(composition.total?.[field]) || 0;
        }
        const value = composition.soldiers?.[soldierId]?.[field];
        if (FIXED_FIELDS.includes(field)) return value === '-' ? '-' : (Number(value) || 0);
        return Number(value) || 0;
    };

    const replaceComposition = async (nextComposition) => {
        const normalized = normalizeDutyCompositionData(nextComposition);
        setComposition(normalized);
        await dutyCompositionController.save(year, month, normalized);
        onReplaceDutyComposition?.(normalized);
    };

    const handleResetComposition = async () => {
        if (!canEditComposition) return;
        if (!await confirm('현재 월의 근무 편성을 초기화할까요?')) return;

        const resetData = normalizeDutyCompositionData({
            total: composition.total,
            soldiers: Object.fromEntries(soldiers.map((soldier) => [soldier.id, {
                ...(composition.soldiers?.[soldier.id] || {}),
                weekday: 0,
                weekend: 0,
                guard: 0,
            }])),
        });
        await replaceComposition(resetData);
    };

    const handleAutoAssignNew = async () => {
        if (!canEditComposition) return;
        if (!await confirm('근무 수를 자동으로 편성할까요?')) return;
        const totalWeekdayTarget = Number(composition.total?.weekday) || 0;
        const totalWeekendTarget = Number(composition.total?.weekend) || 0;
        const totalGuardTarget = Number(composition.total?.guard) || 0;

        const getLowRankOrderValue = (soldier) => {
            const order = Number(rankOrderMap[soldier.id]);
            return Number.isFinite(order) ? order : -1;
        };

        const lowRankFirstSoldiers = [...soldiers].sort((a, b) => {
            const orderDiff = getLowRankOrderValue(b) - getLowRankOrderValue(a);
            if (orderDiff !== 0) return orderDiff;
            return `${a.rank} ${a.name}`.localeCompare(`${b.rank} ${b.name}`, 'ko');
        });

        const nextSoldiers = {};
        let assignedWeekday = 0;
        let assignedWeekend = 0;
        let assignedGuard = 0;

        for (const soldier of lowRankFirstSoldiers) {
            const current = composition.soldiers?.[soldier.id] || {};
            const fixedWeekday = normalizeFixedCompositionValue(current.fixedWeekday);
            const fixedWeekend = normalizeFixedCompositionValue(current.fixedWeekend);
            const fixedGuard = normalizeFixedCompositionValue(current.fixedGuard);
            const initial = {
                weekday: fixedWeekday === '-' ? 0 : fixedWeekday,
                weekend: fixedWeekend === '-' ? 0 : fixedWeekend,
                guard: fixedGuard === '-' ? 0 : fixedGuard,
                fixedWeekday,
                fixedWeekend,
                fixedGuard,
            };
            assignedWeekday += initial.weekday;
            assignedWeekend += initial.weekend;
            assignedGuard += initial.guard;
            nextSoldiers[soldier.id] = initial;
        }

        const assignByLowRankCycle = (field, totalTarget, currentAssigned, candidates) => {
            let remaining = Math.max(0, totalTarget - currentAssigned);
            if (remaining === 0 || candidates.length === 0) return;

            while (remaining > 0) {
                let progressed = false;
                for (const soldier of candidates) {
                    if (remaining <= 0) break;
                    nextSoldiers[soldier.id][field] += 1;
                    remaining -= 1;
                    progressed = true;
                }
                if (!progressed) break;
            }
        };

        const assignByBalancedGroups = (field, totalTarget, currentAssigned, candidates, scoreFn) => {
            let remaining = Math.max(0, totalTarget - currentAssigned);
            if (remaining === 0 || candidates.length === 0) return;

            while (remaining > 0) {
                const minScore = Math.min(...candidates.map(scoreFn));
                const lowestGroup = candidates.filter((soldier) => scoreFn(soldier) === minScore);
                if (lowestGroup.length === 0) break;

                for (const soldier of lowestGroup) {
                    if (remaining <= 0) break;
                    nextSoldiers[soldier.id][field] += 1;
                    remaining -= 1;
                }
            }
        };

        const assignGuardByPriority = (totalTarget, currentAssigned, candidates) => {
            let remaining = Math.max(0, totalTarget - currentAssigned);
            if (remaining === 0 || candidates.length === 0) return;

            while (remaining > 0) {
                const minTotalScore = Math.min(...candidates.map((soldier) => (
                    nextSoldiers[soldier.id].weekday + nextSoldiers[soldier.id].weekend + nextSoldiers[soldier.id].guard
                )));
                const lowestTotalGroup = candidates.filter((soldier) => (
                    nextSoldiers[soldier.id].weekday + nextSoldiers[soldier.id].weekend + nextSoldiers[soldier.id].guard
                ) === minTotalScore);
                const minWeekendScore = Math.min(...lowestTotalGroup.map((soldier) => nextSoldiers[soldier.id].weekend));
                const prioritizedGroup = lowestTotalGroup.filter((soldier) => nextSoldiers[soldier.id].weekend === minWeekendScore);

                if (prioritizedGroup.length === 0) break;

                for (const soldier of prioritizedGroup) {
                    if (remaining <= 0) break;
                    nextSoldiers[soldier.id].guard += 1;
                    remaining -= 1;
                }
            }
        };

        const weekendCandidates = lowRankFirstSoldiers.filter((soldier) => nextSoldiers[soldier.id].fixedWeekend === '-');
        assignByLowRankCycle('weekend', totalWeekendTarget, assignedWeekend, weekendCandidates);

        const weekdayCandidates = lowRankFirstSoldiers.filter((soldier) => nextSoldiers[soldier.id].fixedWeekday === '-');
        assignByBalancedGroups('weekday', totalWeekdayTarget, assignedWeekday, weekdayCandidates, soldier => nextSoldiers[soldier.id].weekday + nextSoldiers[soldier.id].weekend);

        const guardCandidates = lowRankFirstSoldiers.filter((soldier) => nextSoldiers[soldier.id].fixedGuard === '-');
        assignGuardByPriority(totalGuardTarget, assignedGuard, guardCandidates);

        await replaceComposition({ total: composition.total, soldiers: nextSoldiers });
    };

    const handleAutoAssign = async () => {
        if (!canEditComposition) return;
        if (!await confirm('근무 수를 자동으로 편성할까요?')) return;
        const totalWeekdayTarget = Number(composition.total?.weekday) || 0;
        const totalWeekendTarget = Number(composition.total?.weekend) || 0;
        const totalGuardTarget = Number(composition.total?.guard) || 0;

        const getLowRankOrderValue = (soldier) => {
            const order = Number(rankOrderMap[soldier.id]);
            return Number.isFinite(order) ? order : -1;
        };

        const lowRankFirstSoldiers = [...soldiers].sort((a, b) => {
            const orderDiff = getLowRankOrderValue(b) - getLowRankOrderValue(a);
            if (orderDiff !== 0) return orderDiff;
            return `${a.rank} ${a.name}`.localeCompare(`${b.rank} ${b.name}`, 'ko');
        });

        const nextSoldiers = {};
        let assignedWeekday = 0;
        let assignedWeekend = 0;
        let assignedGuard = 0;

        for (const soldier of lowRankFirstSoldiers) {
            const current = composition.soldiers?.[soldier.id] || {};
            const fixedWeekday = normalizeFixedCompositionValue(current.fixedWeekday);
            const fixedWeekend = normalizeFixedCompositionValue(current.fixedWeekend);
            const fixedGuard = normalizeFixedCompositionValue(current.fixedGuard);
            const initial = {
                weekday: fixedWeekday === '-' ? 0 : fixedWeekday,
                weekend: fixedWeekend === '-' ? 0 : fixedWeekend,
                guard: fixedGuard === '-' ? 0 : fixedGuard,
                fixedWeekday,
                fixedWeekend,
                fixedGuard,
            };
            assignedWeekday += initial.weekday;
            assignedWeekend += initial.weekend;
            assignedGuard += initial.guard;
            nextSoldiers[soldier.id] = initial;
        }

        const assignByLowRankCycle = (field, totalTarget, currentAssigned, candidates) => {
            let remaining = Math.max(0, totalTarget - currentAssigned);
            if (remaining === 0 || candidates.length === 0) return;

            while (remaining > 0) {
                let progressed = false;
                for (const soldier of candidates) {
                    if (remaining <= 0) break;
                    nextSoldiers[soldier.id][field] += 1;
                    remaining -= 1;
                    progressed = true;
                }
                if (!progressed) break;
            }
        };

        const assignByBalancedGroups = (field, totalTarget, currentAssigned, candidates, scoreFn) => {
            let remaining = Math.max(0, totalTarget - currentAssigned);
            if (remaining === 0 || candidates.length === 0) return;

            while (remaining > 0) {
                const minScore = Math.min(...candidates.map(scoreFn));
                const lowestGroup = candidates.filter((soldier) => scoreFn(soldier) === minScore);
                if (lowestGroup.length === 0) break;

                for (const soldier of lowestGroup) {
                    if (remaining <= 0) break;
                    nextSoldiers[soldier.id][field] += 1;
                    remaining -= 1;
                }
            }
        };

        const assignGuardByPriority = (totalTarget, currentAssigned, candidates) => {
            let remaining = Math.max(0, totalTarget - currentAssigned);
            if (remaining === 0 || candidates.length === 0) return;

            while (remaining > 0) {
                const minTotalScore = Math.min(...candidates.map((soldier) => (
                    nextSoldiers[soldier.id].weekday + nextSoldiers[soldier.id].weekend + nextSoldiers[soldier.id].guard
                )));
                const lowestTotalGroup = candidates.filter((soldier) => (
                    nextSoldiers[soldier.id].weekday + nextSoldiers[soldier.id].weekend + nextSoldiers[soldier.id].guard
                ) === minTotalScore);
                const minWeekendScore = Math.min(...lowestTotalGroup.map((soldier) => nextSoldiers[soldier.id].weekend));
                const prioritizedGroup = lowestTotalGroup.filter((soldier) => nextSoldiers[soldier.id].weekend === minWeekendScore);

                if (prioritizedGroup.length === 0) break;

                for (const soldier of prioritizedGroup) {
                    if (remaining <= 0) break;
                    nextSoldiers[soldier.id].guard += 1;
                    remaining -= 1;
                }
            }
        };

        const weekendCandidates = lowRankFirstSoldiers.filter((soldier) => nextSoldiers[soldier.id].fixedWeekend === '-');
        assignByLowRankCycle('weekend', totalWeekendTarget, assignedWeekend, weekendCandidates);

        const weekdayCandidates = lowRankFirstSoldiers.filter((soldier) => nextSoldiers[soldier.id].fixedWeekday === '-');
        assignByBalancedGroups('weekday', totalWeekdayTarget, assignedWeekday, weekdayCandidates, soldier => nextSoldiers[soldier.id].weekday + nextSoldiers[soldier.id].weekend);

        const guardCandidates = lowRankFirstSoldiers.filter((soldier) => nextSoldiers[soldier.id].fixedGuard === '-');
        assignGuardByPriority(totalGuardTarget, assignedGuard, guardCandidates);

        await replaceComposition({ total: composition.total, soldiers: nextSoldiers });
    };

    const handleAutoDistributeDutyClick = async () => {
        if (!canEditDuty) return;
        if (!await confirm('근무를 자동으로 배분할까요? (현재 편성된 근무 수에 따라 배분됩니다)')) return;
        await onAutoDistributeDuty?.(soldiers);
    };

    // 항상 투명 input으로 렌더링되는 편집 가능 셀
    const EditableCell = ({ type, field, soldierId, style = {}, className = '' }) => {
        const val = getCellValue(type, field, soldierId);
        const isFixedField = FIXED_FIELDS.includes(field);
        const [localVal, setLocalVal] = useState(val === '-' ? '-' : String(val || ''));
        const lastSavedRef = useRef(val); // 마지막 저장된 값 추적

        // 외부에서 composition이 변경되면 (불러오기 등) 로컬 값 동기화
        useEffect(() => {
            const newVal = val === '-' ? '-' : String(val || '');
            setLocalVal(newVal);
            lastSavedRef.current = val;
        }, [val]);

        const handleInput = (e) => {
            if (!canEditComposition) return;
            const v = e.target.value.trim();
            if (isFixedField) {
                if (v === '' || v === '-' || /^\d+$/.test(v)) {
                    setLocalVal(v === '' ? '-' : v);
                } else {
                    e.target.value = localVal;
                }
                return;
            }
            if (v === '' || /^\d+$/.test(v)) {
                setLocalVal(v);
            } else {
                e.target.value = localVal;
            }
        };

        // blur 시 변경된 경우만 저장
        const handleBlur = () => {
            const normalizedVal = isFixedField
                ? (localVal === '' || localVal === '-' ? '-' : Math.max(0, Number(localVal) || 0))
                : (localVal === '' ? 0 : Number(localVal));
            if (normalizedVal !== lastSavedRef.current) {
                lastSavedRef.current = normalizedVal;
                commitCellValue({ type, field, soldierId }, normalizedVal);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                // blur 전에 저장
                const normalizedVal = isFixedField
                    ? (localVal === '' || localVal === '-' ? '-' : Math.max(0, Number(localVal) || 0))
                    : (localVal === '' ? 0 : Number(localVal));
                if (normalizedVal !== lastSavedRef.current) {
                    lastSavedRef.current = normalizedVal;
                    commitCellValue({ type, field, soldierId }, normalizedVal);
                }
                navigateToCell(type, field, soldierId, e.key);
            } else if (e.key === 'Tab' && e.shiftKey) {
                e.preventDefault();
                const normalizedVal = isFixedField
                    ? (localVal === '' || localVal === '-' ? '-' : Math.max(0, Number(localVal) || 0))
                    : (localVal === '' ? 0 : Number(localVal));
                if (normalizedVal !== lastSavedRef.current) {
                    lastSavedRef.current = normalizedVal;
                    commitCellValue({ type, field, soldierId }, normalizedVal);
                }
                navigateToCell(type, field, soldierId, 'ShiftTab');
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const normalizedVal = isFixedField
                    ? (localVal === '' || localVal === '-' ? '-' : Math.max(0, Number(localVal) || 0))
                    : (localVal === '' ? 0 : Number(localVal));
                if (normalizedVal !== lastSavedRef.current) {
                    lastSavedRef.current = normalizedVal;
                    commitCellValue({ type, field, soldierId }, normalizedVal);
                }
                navigateToCell(type, field, soldierId, e.key);
            } else if (e.key === 'Escape') {
                e.target.blur();
            } else if (e.key === 'Delete') {
                setLocalVal(isFixedField ? '-' : '');
            }
        };

        const handleFocus = (e) => {
            e.target.select();
        };

        return (
            <td style={{ padding: 0, ...style }} className={className}>
                <input
                    type="text"
                    value={localVal}
                    data-cell-type={type}
                    data-cell-field={field}
                    data-cell-soldier={soldierId || ''}
                    readOnly={!canEditComposition}
                    style={{
                        width: '100%', height: '100%',
                        border: 'none', outline: 'none',
                        textAlign: 'center', fontSize: 14,
                        fontWeight: 'bold', padding: '0px 0',
                        background: 'transparent',
                        boxSizing: 'border-box',
                        cursor: canEditComposition ? 'text' : 'default',
                        color: !localVal || localVal === '-' ? '#aaa' : '#111',
                        opacity: localVal === '-' ? 0.6 : 1,
                    }}
                    placeholder="-"
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    onFocus={handleFocus}
                />
            </td>
        );
    };

    let lastUnit = null;
    return (
        <div className="duty-comp-panel" ref={panelRef}>
            <style>{dutyCompositionPanelCss}</style>

            <div style={{ display: 'flex', gap: 6 }}>
                <button
                    className="load-comp-btn"
                    disabled={!canEditComposition}
                    onClick={openLoadPopup}
                >
                    📂 불러오기
                </button>
            </div>

            {/* 총 근무편성 */}
            <div className="duty-comp-section-title">총 근무편성</div>
            <table style={{
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <thead>
                    <tr>
                        <th style={{ width: '20%' }}>구분</th>
                        <th>평</th>
                        <th>주</th>
                        <th>계</th>
                        <th>불</th>
                        <th>계</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style={{ fontSize: 13, borderBottom: '3px solid #000', background: '#f5f5f5', fontWeight: 600 }}>총 근무</td>
                        <EditableCell style={{ borderBottom: '3px solid #000' }} type="total" field="weekday" />
                        <EditableCell style={{ borderBottom: '3px solid #000' }} type="total" field="weekend" />
                        <td style={{ borderBottom: '3px solid #000', background: '#e8eaf6', fontWeight: 600 }}>{totalSum}</td>
                        <EditableCell style={{ borderBottom: '3px solid #000' }} type="total" field="guard" />
                        <td style={{ borderBottom: '3px solid #000', background: '#e8eaf6', fontWeight: 600 }}>{totalGrandSum}</td>
                    </tr>
                    <tr className='bottom-line'>
                        <td style={{ fontSize: 13, background: '#f5f5f5', fontWeight: 600 }}>할당</td>
                        <td style={{
                            fontSize: 12,
                            background: assignedWeekday !== totalWeekday ? '#ffcdd2' : undefined,
                        }}>{assignedWeekday}</td>
                        <td style={{
                            fontSize: 12,
                            background: assignedWeekend !== totalWeekend ? '#ffcdd2' : undefined,
                        }}>{assignedWeekend}</td>
                        <td style={{
                            background: assignedSum !== totalSum ? '#ffcdd2' : '#e8eaf6',
                            fontWeight: 600,
                        }}>{assignedSum}</td>
                        <td style={{
                            fontSize: 12,
                            background: assignedGuard !== totalGuard ? '#ffcdd2' : undefined,
                        }}>{assignedGuard}</td>
                        <td style={{
                            background: assignedGrandSum !== totalGrandSum ? '#ffcdd2' : '#e8eaf6',
                            fontWeight: 600,
                        }}>{assignedGrandSum}</td>
                    </tr>
                    <tr>
                        <td style={{ fontSize: 13, borderBottom: '3px solid #000', background: '#f5f5f5', fontWeight: 600 }}>달력</td>
                        <td style={{ borderBottom: '3px solid #000', fontSize: 12, background: calendarWeekday !== assignedWeekday ? '#ffcdd2' : undefined }}>{calendarWeekday}</td>
                        <td style={{ borderBottom: '3px solid #000', fontSize: 12, background: calendarWeekend !== assignedWeekend ? '#ffcdd2' : undefined }}>{calendarWeekend}</td>
                        <td style={{ borderBottom: '3px solid #000', background: calendarSum !== assignedSum ? '#ffcdd2' : '#e3f2fd', fontWeight: 600 }}>{calendarSum}</td>
                        <td style={{ borderBottom: '3px solid #000', fontSize: 12, background: calendarGuard !== assignedGuard ? '#ffcdd2' : undefined }}>{calendarGuard}</td>
                        <td style={{ borderBottom: '3px solid #000', background: calendarGrandSum !== assignedGrandSum ? '#ffcdd2' : '#e3f2fd', fontWeight: 600 }}>{calendarGrandSum}</td>
                    </tr>
                    <tr>
                        <td style={{ fontSize: 13, background: '#f5f5f5', fontWeight: 600 }}>고정</td>
                        <td style={{ fontSize: 12 }}>{fixedWeekdayTotal}</td>
                        <td style={{ fontSize: 12 }}>{fixedWeekendTotal}</td>
                        <td style={{ background: '#f1f1f1', fontWeight: 600 }}>{fixedSum}</td>
                        <td style={{ fontSize: 12 }}>{fixedGuardTotal}</td>
                        <td style={{ background: '#f1f1f1', fontWeight: 600 }}>{fixedGrandSum}</td>
                    </tr>
                </tbody>
            </table>


            <div style={{ display: 'flex', gap: 6, marginTop: 20, }}>
                <button
                    className="load-comp-btn"
                    disabled={!canEditComposition}
                    onClick={handleResetComposition}
                >
                    근무 수 초기화
                </button>
                {/* <button
                    className="load-comp-btn"
                    disabled={!canEditComposition}
                    onClick={handleAutoAssign}
                >
                    근무 수 분배
                </button> */}
                <button
                    className="load-comp-btn"
                    disabled={!canEditComposition}
                    onClick={handleAutoAssignNew}
                >
                    근무 수 분배(행보관ver)
                </button>
                {/* <button
                    className="load-comp-btn"
                    disabled={!canEditDuty}
                    onClick={handleAutoDistributeDutyClick}
                >
                    근무 분배
                </button> */}
            </div>
            {/* 용사 근무 편성 */}
            <div className="duty-comp-section-title" style={{ marginTop: 10 }}>용사 근무 편성</div>
            <table>
                <thead>
                    <tr>
                        <th rowSpan={2} style={{ width: 80 }}>용사</th>
                        <th colSpan={5} style={{ background: '#e3f2fd' }}>달력에 등록된 수</th>
                        <th colSpan={5} style={{ background: '#fff3e0' }} className='left-line'>근무 수 편성</th>
                    </tr>
                    <tr>
                        <th style={{ background: '#e3f2fd' }}>평</th>
                        <th style={{ background: '#e3f2fd' }}>주</th>
                        <th style={{ background: '#e3f2fd' }}>계</th>
                        <th style={{ background: '#e3f2fd' }}>불</th>
                        <th style={{ background: '#e3f2fd' }}>계</th>
                        <th style={{ background: '#fff3e0' }} className='left-line'>평</th>
                        <th style={{ background: '#fff3e0' }}>주</th>
                        <th style={{ background: '#fff3e0' }}>계</th>
                        <th style={{ background: '#fff3e0' }}>불</th>
                        <th style={{ background: '#fff3e0' }}>계</th>
                    </tr>
                </thead>
                <tbody>
                    {soldiers.map(soldier => {
                        // 서야할 근무 (사전 계산된 값 사용)
                        const sCounts = soldierScheduleCounts[soldier.id] || { weekday: 0, weekend: 0, guard: 0 };
                        const sWeekday = sCounts.weekday;
                        const sWeekend = sCounts.weekend;
                        const sGuard = sCounts.guard;
                        const sSum = sWeekday + sWeekend;
                        const sGrandSum = sSum + sGuard;

                        // 편성된 근무 (직접 입력)
                        const sv = composition.soldiers[soldier.id] || { weekday: 0, weekend: 0, guard: 0 };
                        const aWeekday = Number(sv.weekday) || 0;
                        const aWeekend = Number(sv.weekend) || 0;
                        const aGuard = Number(sv.guard) || 0;
                        const aSum = aWeekday + aWeekend;
                        const aGrandSum = aSum + aGuard;

                        // 서야할 근무와 편성된 근무 차이 → 배경색
                        const mismatchClass = (scheduled, assigned) =>
                            scheduled !== assigned ? 'mismatch' : '';

                        // 서야할 근무 '계' 부분 - 편성된 근무와 같으면 초록색
                        const sumMatchClass = sSum === aSum ? 'match-green' : (sSum !== aSum ? 'mismatch' : '');
                        const grandSumMatchClass = sGrandSum === aGrandSum ? 'match-green' : (sGrandSum !== aGrandSum ? 'mismatch' : '');

                        return (
                            <tr key={soldier.id} className={soldier.unit !== lastUnit ? 'unit-separator' : ''}>
                                {(() => {
                                    lastUnit = soldier.unit;
                                })()}
                                <td
                                    className={`soldier-name${focusedSoldierId === soldier.id ? ' active-focus' : ''}`}
                                    style={{ background: getSoldierUnitBg(soldier) }}
                                    title={`${soldier.rank} ${soldier.name}`}
                                    onMouseEnter={() => onHoverSoldier?.(soldier.id)}
                                    onMouseLeave={() => onHoverSoldier?.(null)}
                                    onClick={() => onFocusSoldier?.(soldier.id)}
                                >
                                    {/* {rankOrderMap[soldier.id] != null && (
                                        <span className="soldier-rank-order">{rankOrderMap[soldier.id] + 1}</span>
                                    )} */}
                                    {soldier.name}
                                </td>
                                {/* 서야할 근무 */}
                                <td className={mismatchClass(sWeekday, aWeekday)}>{sWeekday}</td>
                                <td className={mismatchClass(sWeekend, aWeekend)}>{sWeekend}</td>
                                <td className={sumMatchClass} style={{ fontWeight: 600 }}>{sSum}</td>
                                <td className={mismatchClass(sGuard, aGuard)}>{sGuard}</td>
                                <td className={grandSumMatchClass} style={{ fontWeight: 600 }}>{sGrandSum}</td>
                                {/* 편성된 근무 */}
                                <EditableCell type="soldier" field="weekday" soldierId={soldier.id} className='left-line' />
                                <EditableCell type="soldier" field="weekend" soldierId={soldier.id} />
                                <td style={{ fontWeight: 600, background: '#fff8e1' }}>{aSum}</td>
                                <EditableCell type="soldier" field="guard" soldierId={soldier.id} />
                                <td style={{ fontWeight: 600, background: '#fff8e1' }}>{aGrandSum}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* 불러오기 팝업 */}
            {showLoadPopup && (
                <div className="load-popup-overlay" onClick={() => setShowLoadPopup(false)}>
                    <div className="load-popup" onClick={e => e.stopPropagation()}>
                        <div className="load-popup-header">
                            <span>이전 달 근무편성 불러오기</span>
                            <button onClick={() => setShowLoadPopup(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#666' }}>✕</button>
                        </div>
                        <div className="load-popup-body">
                            {prevMonths.length === 0 && (
                                <div style={{ color: '#999', padding: 20, textAlign: 'center', width: '100%' }}>
                                    불러올 수 있는 이전 달 데이터가 없습니다.
                                </div>
                            )}
                            {prevMonths.slice(0, 10).map(item => {
                                const t = item.data.total || {};
                                const totalSum = (Number(t.weekday) || 0) + (Number(t.weekend) || 0) + (Number(t.guard) || 0);
                                const soldierCount = Object.keys(item.data.soldiers || {}).length;
                                return (
                                    <div
                                        key={`${item.year}-${item.month}`}
                                        className="load-month-card"
                                        onClick={() => loadFromMonth(item)}
                                    >
                                        <div className="month-label">{item.year}년 {item.month}월</div>
                                        <div className="month-detail">
                                            총 근무: 평{t.weekday || 0} / 주{t.weekend || 0} / 불{t.guard || 0} = {totalSum}
                                        </div>
                                        <div className="month-detail">편성 용사: {soldierCount}명</div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="load-popup-footer">
                            <button onClick={() => setShowLoadPopup(false)} style={{ padding: '6px 16px', border: '1px solid #ccc', borderRadius: 4, background: '#f5f5f5', cursor: 'pointer' }}>닫기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
