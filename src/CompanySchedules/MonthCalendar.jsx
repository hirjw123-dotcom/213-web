import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { dutyReplacementController, getEffectiveScheduleLabelsForSoldierDay } from '../@controllers/dutyReplacementController';
import { soldiersController } from '../@controllers/soldiersController';
import { soldierSchedulesController, 열외Conditions, 근취Conditions, isConditionMonthMatched, matchesConditionScheduleType, isSoldierGeunchwiFromLoadedData, getDisplayExcludedReasonLabelsFromLoadedData } from '../@controllers/soldierSchedulesController';
import { battalionSchedulesController } from '../@controllers/battalionSchedulesController';
import { companyEventsController, COMPANY_OUTING_EVENT_TYPE } from '../@controllers/companyEventsController';
import { combatLeaveController } from '../@controllers/combatLeaveController';
import { scheduleTypesController } from '../@controllers/soldierScheduleTypesController';
import { getExtendedWeeks } from './weekUtils';


const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const LEAVE_LABELS = [
    '휴', '박', '출', '평출'
];
const LEAVE_DISPLAY = { '휴': '휴가', '박': '외박', '출': '외출', '평출': '평출' };
const COMPANY_OUTING_SOURCE_LABELS = new Set(['출', '평출']);
const EXCLUSIVE_LEAVE_LABELS = new Set(['휴', '박', '출']);
const DUTY_EXCLUDED_REASON_LABELS = new Set(['평', '주', '훈', '불', '주당', '야당', '주평', '주주', '야평', '야주']);
const PRIMARY_DISPLAY_REASON_LABELS = new Set([...EXCLUSIVE_LEAVE_LABELS, ...DUTY_EXCLUDED_REASON_LABELS]);
const HIDDEN_EXCLUDED_TIME_SLOTS = new Set(['저녁일과']);
const COMPANY_OUTING_BAR_BG = '#98d6ff';
const COMPANY_OUTING_BAR_COLOR = '#000';

// ======================== 최적화된 열외 계산 헬퍼 ========================

/**
 * 이미 로드된 allSchedules에서 특정 용사의 특정 날짜 스케줄 조회 (동기식)
 */
const getScheduleFromCache = (allSchedules, dutyReplacementsByMonth, combatLeaveByMonth, soldierId, y, m, d) => {
    const key = `${y}_${m}`;
    const effectiveLabels = getEffectiveScheduleLabelsForSoldierDay(allSchedules[key] || {}, dutyReplacementsByMonth?.[key] || {}, soldierId, d);
    const combatLeaveEntry = combatLeaveByMonth?.[key]?.[soldierId]?.[d];

    if (!combatLeaveEntry?.type || effectiveLabels.includes(combatLeaveEntry.type)) {
        return effectiveLabels;
    }

    return [combatLeaveEntry.type, ...effectiveLabels];
};

const findUnitDutySoldiers = (soldiers, allSchedules, dutyReplacementsByMonth, combatLeaveByMonth, y, m, d, labels) => {
    const labelSet = new Set(labels);

    return soldiers.filter((soldier) => {
        const effectiveLabels = getScheduleFromCache(allSchedules, dutyReplacementsByMonth, combatLeaveByMonth, soldier.id, y, m, d);
        return effectiveLabels.some((label) => labelSet.has(label));
    });
};

/**
 * 열외 사유 목록 반환 (동기식, 캐시된 데이터 사용)
 */
const get열외ReasonsSync = (soldierId, y, m, d, 열외Conds, 근취Conds, allSchedules, dutyReplacementsByMonth, combatLeaveByMonth) => {
    const reasons = [];
    for (const cond of 열외Conds) {
        let checkDate = new Date(y, m - 1, d);
        if (cond.day === '어제') checkDate.setDate(checkDate.getDate() - 1);
        if (!isConditionMonthMatched(cond.monthType, checkDate)) continue;

        const checkY = checkDate.getFullYear();
        const checkM = checkDate.getMonth() + 1;
        const checkD = checkDate.getDate();

        if (cond.scheduleType === '근취') {
            if (isSoldierGeunchwiFromLoadedData({
                soldierId,
                y,
                m,
                d,
                conditions: 근취Conds,
                allSchedulesByMonth: allSchedules,
                dutyReplacementsByMonth,
                combatLeaveByMonth,
            }) && !reasons.includes('근취')) {
                reasons.push('근취');
            }
            continue;
        }

        const schedules = getScheduleFromCache(allSchedules, dutyReplacementsByMonth, combatLeaveByMonth, soldierId, checkY, checkM, checkD);
        if (matchesConditionScheduleType(schedules, cond.scheduleType)) {
            if (!reasons.includes(cond.scheduleType)) reasons.push(cond.scheduleType);
        }
    }
    return reasons;
};

/**
 * 모든 날짜의 모든 용사에 대한 열외 데이터 일괄 계산 (동기식)
 */
const computeExcludedData = (weeks, soldiers, allSchedules, dutyReplacementsByMonth, combatLeaveByMonth, 열외Conds, 근취Conds) => {
    const exclMap = {};
    const visible열외Conds = 열외Conds.filter((cond) => !HIDDEN_EXCLUDED_TIME_SLOTS.has(cond.timeSlot));
    for (const week of weeks) {
        for (const di of week.days) {
            for (const s of soldiers) {
                const matchedReasons = get열외ReasonsSync(s.id, di.y, di.m, di.d, visible열외Conds, 근취Conds, allSchedules, dutyReplacementsByMonth, combatLeaveByMonth);
                if (matchedReasons.length === 0) continue;

                const displayReasons = getDisplayExcludedReasonLabelsFromLoadedData({
                    soldierId: s.id,
                    y: di.y,
                    m: di.m,
                    d: di.d,
                    matchedReasonLabels: matchedReasons,
                    allSchedulesByMonth: allSchedules,
                    dutyReplacementsByMonth,
                    combatLeaveByMonth,
                });

                // 출타/근무 계열은 별도 영역에 표시하고, 열외 영역에는 비근무 사유만 남긴다.
                if (displayReasons.some((reason) => PRIMARY_DISPLAY_REASON_LABELS.has(reason))) continue;

                const filtered2 = displayReasons.filter((reason) => !PRIMARY_DISPLAY_REASON_LABELS.has(reason));
                if (filtered2.length === 0) continue;
                const dk = `${di.y}_${di.m}_${di.d}`;
                if (!exclMap[dk]) exclMap[dk] = {};
                for (const reason of filtered2) {
                    if (!exclMap[dk][reason]) exclMap[dk][reason] = [];
                    exclMap[dk][reason].push(s);
                }
            }
        }
    }
    return exclMap;
};

// 근무 라벨 (홀수달/짝수달)
const DUTY_DAY_ODD = ['주평', '주주', '주당'];
const DUTY_NIGHT_ODD = ['주', '평', '훈', '야평', '야주', '야당'];
const DUTY_DAY_EVEN = ['주', '평', '훈', '주평', '주주', '주당'];
const DUTY_NIGHT_EVEN = ['야평', '야주', '야당'];

const isToday = (date) => {
    const t = new Date();
    return date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
};

const formatDateKey = (date) => battalionSchedulesController.utils.formatDate(date);
const dateToNum = (arr) => arr[0] * 10000 + arr[1] * 100 + arr[2];

const shouldRenderBar = (bar, filters, theme) => {
    if (theme === 'theme2' && bar.isWeekly) return false;
    if (bar.isWeekly && filters?.weeklySchedule === false) return false;
    if (bar.isEvent && filters?.events === false) return false;
    if (!bar.isWeekly && !bar.isEvent && filters?.leave === false) return false;
    return true;
};

const getWeekSummaryLines = (week, weeklySchedules, filters) => {
    if (filters?.weeklySchedule === false) return [];

    return (weeklySchedules[week.weekKey]?.text || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
};

const formatLeaveDateRange = (range) => {
    if (range.start[0] === range.end[0] && range.start[1] === range.end[1]) return '';
    return `${range.start[0]}/${range.start[1]}~${range.end[0]}/${range.end[1]}`;
};

const toDateKeyParts = (y, m, d) => `${y}_${m}_${d}`;
const toDateNumParts = (y, m, d) => y * 10000 + m * 100 + d;

const splitRangeByExcludedDates = (range, excludedDateKeys) => {
    if (!excludedDateKeys || excludedDateKeys.size === 0) return [range];

    const segments = [];
    let segmentStart = null;
    let segmentEnd = null;
    const cursor = new Date(range.startDate);

    while (cursor <= range.endDate) {
        const dateKey = toDateKeyParts(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate());
        const excluded = excludedDateKeys.has(dateKey);

        if (!excluded) {
            if (!segmentStart) segmentStart = new Date(cursor);
            segmentEnd = new Date(cursor);
        } else if (segmentStart && segmentEnd) {
            segments.push({
                start: [segmentStart.getMonth() + 1, segmentStart.getDate()],
                end: [segmentEnd.getMonth() + 1, segmentEnd.getDate()],
                startDate: segmentStart,
                endDate: segmentEnd,
            });
            segmentStart = null;
            segmentEnd = null;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    if (segmentStart && segmentEnd) {
        segments.push({
            start: [segmentStart.getMonth() + 1, segmentStart.getDate()],
            end: [segmentEnd.getMonth() + 1, segmentEnd.getDate()],
            startDate: segmentStart,
            endDate: segmentEnd,
        });
    }

    return segments;
};

// ======================== 출타 바 계산 ========================

/** 용사의 특정 라벨의 연속 기간(시작~끝) 찾기 */
const findLeaveRange = (soldierId, label, startDate, allSchedules) => {
    const MAX = 60;
    // 뒤로
    let cur = new Date(startDate);
    for (let i = 0; i < MAX; i++) {
        const prev = new Date(cur); prev.setDate(prev.getDate() - 1);
        const k = `${prev.getFullYear()}_${prev.getMonth() + 1}`;
        if (!allSchedules[k]) break;
        const dl = allSchedules[k]?.[soldierId]?.[prev.getDate()];
        if (Array.isArray(dl) && dl.includes(label)) cur = prev; else break;
    }
    const s = cur;
    // 앞으로
    cur = new Date(startDate);
    for (let i = 0; i < MAX; i++) {
        const nxt = new Date(cur); nxt.setDate(nxt.getDate() + 1);
        const k = `${nxt.getFullYear()}_${nxt.getMonth() + 1}`;
        if (!allSchedules[k]) break;
        const dl = allSchedules[k]?.[soldierId]?.[nxt.getDate()];
        if (Array.isArray(dl) && dl.includes(label)) cur = nxt; else break;
    }
    return {
        start: [s.getMonth() + 1, s.getDate()],
        end: [cur.getMonth() + 1, cur.getDate()],
        startDate: s,
        endDate: cur,
    };
};

/**
 * 모든 주의 출타 + 주간일정 슬롯을 한번에 계산한다.
 * 같은 (용사, 라벨) 조합은 전 주차에 걸쳐 동일 row를 유지한다.
 * 겹치지 않는 바는 같은 row를 공유하여 높이를 최소화한다.
 *
 * @returns {{ weekIdx: { slotCount, byCol } }[]}
 */
const computeAllLeaveSlots = (weeks, allSchedules, soldiers, scheduleTypes, weeklySchedules, events, companyOutingMap) => {
    // 1) 모든 pair 수집
    const pairList = [];
    const companyOutingDateKeys = new Set(Object.keys(companyOutingMap || {}));

    // scheduleTypes를 Map으로 캐시 (빠른 조회)
    const scheduleTypeMap = new Map(scheduleTypes.map(t => [t.label, t]));

    // 날짜->숫자 변환 헬퍼
    const dateToNum = (arr) => arr[0] * 10000 + arr[1] * 100 + arr[2];

    // 주간 일정 pairs
    const weekCount = weeks.length;
    for (let wi = 0; wi < weekCount; wi++) {
        const week = weeks[wi];
        const weekText = weeklySchedules[week.weekKey]?.text;
        if (weekText) {
            const wCols = new Map([[wi, new Set([1, 2, 3, 4, 5])]]);
            pairList.push({
                key: `__weekly__${wi}`, displayLabel: weekText,
                bg: '#dceefa', color: '#1565c0', isWeekly: true, weekIdx: wi, weekCols: wCols,
                globalRow: 0,
            });
        }
    }

    // 이벤트 pairs (기타 일정)
    for (const ev of events) {
        if (ev.type === COMPANY_OUTING_EVENT_TYPE) continue;

        const evStart = dateToNum(ev.startDate);
        const evEnd = dateToNum(ev.endDate);
        const pair = {
            key: `__event__${ev.id}`, displayLabel: ev.label,
            bg: '#e8f5e9', color: '#2e7d32', isWeekly: false, isEvent: true, weekCols: new Map(),
            globalRow: 0,
        };
        for (let wi = 0; wi < weekCount; wi++) {
            const week = weeks[wi];
            for (let col = 0; col < 7; col++) {
                const di = week.days[col];
                const dNum = dateToNum([di.y, di.m, di.d]);
                if (dNum >= evStart && dNum <= evEnd) {
                    let weekSet = pair.weekCols.get(wi);
                    if (!weekSet) {
                        weekSet = new Set();
                        pair.weekCols.set(wi, weekSet);
                    }
                    weekSet.add(col);
                }
            }
        }
        if (pair.weekCols.size > 0) pairList.push(pair);
    }

    // 출타 pairs (라벨 우선: 휴가 → 외박 → 외출 순)
    const soldierCount = soldiers.length;
    for (const leaveLabel of LEAVE_LABELS) {
        for (let si = 0; si < soldierCount; si++) {
            const soldier = soldiers[si];
            const seenRanges = new Set();

            for (let wi = 0; wi < weekCount; wi++) {
                const week = weeks[wi];
                const days = week.days;
                for (let col = 0; col < 7; col++) {
                    const di = days[col];
                    const schedKey = `${di.y}_${di.m}`;
                    const dayLabels = allSchedules[schedKey]?.[soldier.id]?.[di.d];
                    if (dayLabels && dayLabels.includes(leaveLabel)) {
                        const range = findLeaveRange(soldier.id, leaveLabel, di.date, allSchedules);
                        const rangeKey = `${soldier.id}|${leaveLabel}|${range.startDate.getTime()}|${range.endDate.getTime()}`;
                        if (seenRanges.has(rangeKey)) continue;
                        seenRanges.add(rangeKey);

                        const st = scheduleTypeMap.get(leaveLabel);
                        const baseLabel = `${soldier.name} ${LEAVE_DISPLAY[leaveLabel] || leaveLabel}`;
                        const dateLabel = formatLeaveDateRange(range);
                        const displayLabel = dateLabel ? `${baseLabel} ${dateLabel}` : baseLabel;

                        const segments = COMPANY_OUTING_SOURCE_LABELS.has(leaveLabel)
                            ? splitRangeByExcludedDates(range, companyOutingDateKeys)
                            : [range];

                        for (const segment of segments) {
                            const segmentDateLabel = formatLeaveDateRange(segment);
                            const segmentDisplayLabel = segmentDateLabel ? `${baseLabel} ${segmentDateLabel}` : baseLabel;
                            const pair = {
                                key: `${rangeKey}|${segment.startDate.getTime()}|${segment.endDate.getTime()}`,
                                displayLabel: segmentDisplayLabel,
                                titleLabel: segmentDisplayLabel,
                                baseLabel,
                                dateLabel: segmentDateLabel,
                                bg: st?.bg || '#ddd',
                                color: st?.color || '#000',
                                isWeekly: false,
                                isLeave: true,
                                weekCols: new Map(),
                                globalRow: 0,
                            };

                            for (let targetWeekIdx = 0; targetWeekIdx < weekCount; targetWeekIdx++) {
                                const targetWeek = weeks[targetWeekIdx];
                                for (let targetCol = 0; targetCol < 7; targetCol++) {
                                    const targetDate = targetWeek.days[targetCol].date;
                                    if (targetDate < segment.startDate || targetDate > segment.endDate) continue;
                                    let weekSet = pair.weekCols.get(targetWeekIdx);
                                    if (!weekSet) {
                                        weekSet = new Set();
                                        pair.weekCols.set(targetWeekIdx, weekSet);
                                    }
                                    weekSet.add(targetCol);
                                }
                            }

                            if (pair.weekCols.size > 0) pairList.push(pair);
                        }
                    }
                }
            }
        }
    }

    for (const [dateKey, outingInfo] of Object.entries(companyOutingMap || {})) {
        const pair = {
            key: `__company_outing__${dateKey}`,
            displayLabel: `중대외출(${outingInfo.count}명)`,
            titleLabel: `중대외출(${outingInfo.count}명)`,
            bg: COMPANY_OUTING_BAR_BG,
            color: COMPANY_OUTING_BAR_COLOR,
            isWeekly: false,
            isLeave: true,
            isCompanyOuting: true,
            weekCols: new Map(),
            globalRow: 0,
        };

        for (let wi = 0; wi < weekCount; wi++) {
            const week = weeks[wi];
            for (let col = 0; col < 7; col++) {
                const di = week.days[col];
                if (toDateKeyParts(di.y, di.m, di.d) !== dateKey) continue;
                let weekSet = pair.weekCols.get(wi);
                if (!weekSet) {
                    weekSet = new Set();
                    pair.weekCols.set(wi, weekSet);
                }
                weekSet.add(col);
            }
        }

        if (pair.weekCols.size > 0) pairList.push(pair);
    }

    // 2) 전역 row 할당 — greedy 알고리즘 최적화
    const globalRows = []; // 각 row의 점유 Map<weekIdx, Set<col>>

    // pair를 시작 위치(주, 컬럼) 순으로 정렬
    pairList.sort((a, b) => {
        let aFirstWeek = Infinity, bFirstWeek = Infinity;
        let aFirstCol = Infinity, bFirstCol = Infinity;
        for (const [wi, cols] of a.weekCols) {
            if (wi < aFirstWeek) {
                aFirstWeek = wi;
                aFirstCol = Infinity;
                for (const c of cols) if (c < aFirstCol) aFirstCol = c;
            }
        }
        for (const [wi, cols] of b.weekCols) {
            if (wi < bFirstWeek) {
                bFirstWeek = wi;
                bFirstCol = Infinity;
                for (const c of cols) if (c < bFirstCol) bFirstCol = c;
            }
        }
        if (aFirstWeek !== bFirstWeek) return aFirstWeek - bFirstWeek;
        return aFirstCol - bFirstCol;
    });

    const pairCount = pairList.length;
    for (let pi = 0; pi < pairCount; pi++) {
        const pair = pairList[pi];
        let assigned = -1;
        const rowCount = globalRows.length;

        outer: for (let r = 0; r < rowCount; r++) {
            const rowOccupied = globalRows[r];
            for (const [wi, cols] of pair.weekCols) {
                const rowCols = rowOccupied.get(wi);
                if (rowCols) {
                    for (const c of cols) {
                        if (rowCols.has(c)) continue outer;
                    }
                }
            }
            assigned = r;
            break;
        }

        if (assigned === -1) {
            assigned = globalRows.length;
            globalRows.push(new Map());
        }

        // row에 점유 기록
        const rowOccupied = globalRows[assigned];
        for (const [wi, cols] of pair.weekCols) {
            let rowCols = rowOccupied.get(wi);
            if (!rowCols) {
                rowCols = new Set();
                rowOccupied.set(wi, rowCols);
            }
            for (const c of cols) rowCols.add(c);
        }
        pair.globalRow = assigned;
    }

    // 3) 주별 결과 구성
    const results = new Array(weekCount);
    for (let wi = 0; wi < weekCount; wi++) {
        const byCol = {};
        let maxRow = -1;

        for (let pi = 0; pi < pairCount; pi++) {
            const pair = pairList[pi];
            const cols = pair.weekCols.get(wi);
            if (!cols) continue;

            const pairRow = pair.globalRow;
            if (pairRow > maxRow) maxRow = pairRow;

            for (const col of cols) {
                if (!byCol[col]) byCol[col] = [];
                const isStart = pair.isWeekly ? col === 1 : !cols.has(col - 1);
                const isEnd = pair.isWeekly ? col === 5 : !cols.has(col + 1);
                let isRangeStart = isStart;
                let isRangeEnd = isEnd;
                if (!pair.isWeekly && isStart && col === 0) {
                    const prevCols = pair.weekCols.get(wi - 1);
                    if (prevCols && prevCols.has(6)) isRangeStart = false;
                }
                if (!pair.isWeekly && isEnd && col === 6) {
                    const nextCols = pair.weekCols.get(wi + 1);
                    if (nextCols && nextCols.has(0)) isRangeEnd = false;
                }
                const sortedCols = [...cols].sort((a, b) => a - b);
                const firstVisibleCol = sortedCols[0];
                const secondVisibleCol = sortedCols[1];
                const displayLabel = pair.isWeekly
                    ? (col === 1 ? pair.displayLabel : '')
                    : pair.isLeave
                        ? sortedCols.length === 1
                            ? pair.displayLabel
                            : col === firstVisibleCol
                                ? pair.baseLabel
                                : col === secondVisibleCol
                                    ? pair.dateLabel
                                    : ''
                        : pair.displayLabel;

                byCol[col].push({
                    row: pairRow,
                    pairKey: pair.key,
                    displayLabel,
                    titleLabel: pair.titleLabel || pair.displayLabel,
                    bg: pair.bg,
                    color: pair.color,
                    isStart,
                    isEnd,
                    isRangeStart,
                    isRangeEnd,
                    isWeekly: !!pair.isWeekly,
                    isLeave: !!pair.isLeave,
                    isEvent: !!pair.isEvent,
                    isCompanyOuting: !!pair.isCompanyOuting,
                });
            }
        }
        results[wi] = { slotCount: maxRow + 1, byCol };
    }

    return results;
};

function CompanyOutingContextMenu({ x, y, date, hasCompanyOuting, onSet, onClear, onClose }) {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('click', handleClick);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('click', handleClick);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    const adjustedX = Math.min(x, window.innerWidth - 220);
    const adjustedY = Math.min(y, window.innerHeight - 140);
    const dateStr = new Date(date).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
    });

    return (
        <>
            <div className="cs-ctx-overlay" onClick={onClose} />
            <div ref={menuRef} className="cs-ctx-menu" style={{ left: adjustedX, top: adjustedY }}>
                <div className="cs-ctx-header">{dateStr}</div>
                <button type="button" className={`cs-ctx-item${hasCompanyOuting ? ' active' : ''}`} onClick={onSet}>
                    중대외출 지정
                </button>
                <button type="button" className={`cs-ctx-item${!hasCompanyOuting ? ' disabled' : ''}`} onClick={onClear} disabled={!hasCompanyOuting}>
                    중대외출 해제
                </button>
            </div>
        </>
    );
}

// ======================== 컴포넌트 ========================

export default function MonthCalendar({ y, m, unit, unitName, calRef, filters, theme, selectedWeekKeys }) {
    const [loading, setLoading] = useState(true);
    const [allSoldiers, setAllSoldiers] = useState([]);
    const [soldiers, setSoldiers] = useState([]);
    const [scheduleTypes, setScheduleTypes] = useState([]);
    const [allSchedules, setAllSchedules] = useState({}); // { "y_m": scheduleData }
    const [dutyReplacementsByMonth, setDutyReplacementsByMonth] = useState({});
    const [combatLeaveByMonth, setCombatLeaveByMonth] = useState({});
    const [weeklySchedules, setWeeklySchedules] = useState({});
    const [dailySchedules, setDailySchedules] = useState({});
    const [holidays, setHolidays] = useState({});
    const [events, setEvents] = useState([]);
    const [excludedData, setExcludedData] = useState({}); // { "y_m_d": { reason: [soldier,...] } }
    const [contextMenu, setContextMenu] = useState(null);

    const allSelectableWeeks = useMemo(() => getExtendedWeeks(y, m), [y, m]);
    const selectedWeekKeySet = useMemo(() => new Set(selectedWeekKeys || []), [selectedWeekKeys]);
    const weeks = useMemo(() => {
        if (!selectedWeekKeys) return allSelectableWeeks.filter((week) => week.containsCurrentMonth);
        return allSelectableWeeks.filter((week) => selectedWeekKeySet.has(week.weekKey));
    }, [allSelectableWeeks, selectedWeekKeySet, selectedWeekKeys]);

    const companyOutingMap = useMemo(() => {
        if (loading) return {};

        const outingDates = new Set();
        for (const event of events) {
            if (event.type !== COMPANY_OUTING_EVENT_TYPE) continue;

            const cursor = new Date(event.startDate[0], event.startDate[1] - 1, event.startDate[2]);
            const endDate = new Date(event.endDate[0], event.endDate[1] - 1, event.endDate[2]);
            while (cursor <= endDate) {
                outingDates.add(toDateKeyParts(cursor.getFullYear(), cursor.getMonth() + 1, cursor.getDate()));
                cursor.setDate(cursor.getDate() + 1);
            }
        }

        const result = {};
        for (const dateKey of outingDates) {
            const [dateY, dateM, dateD] = dateKey.split('_').map(Number);
            let count = 0;
            for (const soldier of soldiers) {
                const labels = allSchedules[`${dateY}_${dateM}`]?.[soldier.id]?.[dateD] || [];
                if (labels.some((label) => COMPANY_OUTING_SOURCE_LABELS.has(label))) count += 1;
            }
            result[dateKey] = { count };
        }

        return result;
    }, [loading, events, soldiers, allSchedules]);

    // 모든 주의 슬롯을 한번에 계산 (이벤트 포함)
    const allWeekSlots = useMemo(() => {
        if (loading) return null;
        return computeAllLeaveSlots(weeks, allSchedules, soldiers, scheduleTypes, weeklySchedules, events, companyOutingMap);
    }, [loading, weeks, allSchedules, soldiers, scheduleTypes, weeklySchedules, events, companyOutingMap]);

    // 달력에 표시되는 모든 y-m 조합 계산
    const monthKeysNeeded = useMemo(() => {
        const set = new Set();
        for (const week of weeks) {
            for (const di of week.days) {
                set.add(`${di.y}_${di.m}`);
            }
        }
        return [...set];
    }, [weeks]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            const uniqueMonths = new Set();
            for (const week of weeks) {
                for (const di of week.days) {
                    uniqueMonths.add(`${di.y}_${di.m}`);
                }
            }
            // 어제 날짜도 필요할 수 있으므로 추가 월 확인
            for (const week of weeks) {
                for (const di of week.days) {
                    const yesterday = new Date(di.y, di.m - 1, di.d);
                    yesterday.setDate(yesterday.getDate() - 1);
                    uniqueMonths.add(`${yesterday.getFullYear()}_${yesterday.getMonth() + 1}`);
                }
            }

            const monthKeys = [...uniqueMonths];

            if (monthKeys.length === 0) {
                setAllSoldiers([]);
                setSoldiers([]);
                setScheduleTypes([]);
                setWeeklySchedules({});
                setDailySchedules({});
                setHolidays({});
                setAllSchedules({});
                setDutyReplacementsByMonth({});
                setCombatLeaveByMonth({});
                setEvents([]);
                setExcludedData({});
                setLoading(false);
                return;
            }

            // 모든 필요한 데이터를 병렬로 로드
            const [allSoldiers, types, batData, 열외Conds, 근취Conds, ...scheduleResults] = await Promise.all([
                soldiersController.get(),
                scheduleTypesController.get(),
                battalionSchedulesController.getAll(),
                열외Conditions.get(),
                근취Conditions.get(),
                ...monthKeys.map(key => {
                    const [sy, sm] = key.split('_').map(Number);
                    return Promise.all([
                        soldierSchedulesController.getSoldierSchedules({ y: sy, m: sm }),
                        combatLeaveController.getAll(sy, sm),
                    ]);
                })
            ]);

            const eventResults = await Promise.all(monthKeys.map((key) => {
                const [sy, sm] = key.split('_').map(Number);
                return companyEventsController.getByMonth(sy, sm, unit);
            }));

            // 스케줄 맵 구성
            const schMap = {};
            const combatLeaveMap = {};
            monthKeys.forEach((key, i) => {
                schMap[key] = scheduleResults[i]?.[0] || {};
                combatLeaveMap[key] = scheduleResults[i]?.[1] || {};
            });
            const ev = [...new Map(eventResults.flat().map((event) => [event.id, event])).values()];

            const replacementEntries = await Promise.all(
                monthKeys.map(async (key) => {
                    const [sy, sm] = key.split('_').map(Number);
                    const replacementData = await dutyReplacementController.get(sy, sm, {
                        validSoldierIds: allSoldiers.map((soldier) => soldier.id),
                        monthSchedules: schMap[key] || {},
                    });
                    return [key, replacementData];
                })
            );

            // 중대 필터
            const filtered = allSoldiers.filter(s => s.unit === unit);

            // 열외 데이터 동기식 계산 (이미 로드된 데이터 사용)
            const replacementMap = Object.fromEntries(replacementEntries);
            const exclMap = computeExcludedData(weeks, filtered, schMap, replacementMap, combatLeaveMap, 열외Conds, 근취Conds);

            // 상태 업데이트
            setAllSoldiers(allSoldiers);
            setSoldiers(filtered);
            setScheduleTypes(types);
            setWeeklySchedules(batData.weeklySchedules || {});
            setDailySchedules(batData.dailySchedules || {});
            setHolidays(batData.holidays || {});
            setAllSchedules(schMap);
            setDutyReplacementsByMonth(replacementMap);
            setCombatLeaveByMonth(combatLeaveMap);
            setEvents(ev);
            setExcludedData(exclMap);

            setLoading(false);
        })();
    }, [unit, weeks]);

    const handleCellContextMenu = (e, dayInfo) => {
        e.preventDefault();
        setContextMenu({
            menuX: e.clientX,
            menuY: e.clientY,
            date: dayInfo.date,
            dateKey: toDateKeyParts(dayInfo.y, dayInfo.m, dayInfo.d),
            year: dayInfo.y,
            month: dayInfo.m,
            day: dayInfo.d,
        });
    };

    const handleSetCompanyOuting = async () => {
        if (!contextMenu) return;
        const targetDateNum = toDateNumParts(contextMenu.year, contextMenu.month, contextMenu.day);
        const newEvent = await companyEventsController.setCompanyOuting(contextMenu.year, contextMenu.month, contextMenu.day, unit);
        setEvents((prev) => {
            const next = prev.filter((event) => {
                if (event.type !== COMPANY_OUTING_EVENT_TYPE) return true;
                if (event.unitId !== unit) return true;
                const start = toDateNumParts(event.startDate[0], event.startDate[1], event.startDate[2]);
                const end = toDateNumParts(event.endDate[0], event.endDate[1], event.endDate[2]);
                return targetDateNum < start || targetDateNum > end;
            });
            next.push(newEvent);
            return next;
        });
        setContextMenu(null);
    };

    const handleClearCompanyOuting = async () => {
        if (!contextMenu) return;
        const targetDateNum = toDateNumParts(contextMenu.year, contextMenu.month, contextMenu.day);
        await companyEventsController.clearCompanyOuting(contextMenu.year, contextMenu.month, contextMenu.day, unit);
        setEvents((prev) => prev.filter((event) => {
            if (event.type !== COMPANY_OUTING_EVENT_TYPE) return true;
            if (event.unitId !== unit) return true;
            const start = toDateNumParts(event.startDate[0], event.startDate[1], event.startDate[2]);
            const end = toDateNumParts(event.endDate[0], event.endDate[1], event.endDate[2]);
            return targetDateNum < start || targetDateNum > end;
        }));
        setContextMenu(null);
    };

    if (loading) {
        return <div className="f ajCenter wh100p" style={{ minHeight: 300 }}><div className="spinner" /></div>;
    }

    if (weeks.length === 0) {
        return <div className="cs-calendar-empty">표시할 주차를 선택하세요.</div>;
    }

    const showWeekSummaryColumn = theme === 'theme2';

    return (
        <div className={`cs-calendar-wrap cs-calendar-wrap-${theme}`} ref={calRef}>
            <div className="cs-calendar-title">
                {unitName && <span className="cs-calendar-title-unit">{unitName}</span>}
                <span className="cs-calendar-title-text">{y}년 {m}월</span>
            </div>
            <table className={`cs-calendar cs-calendar-${theme}${showWeekSummaryColumn ? ' has-week-summary' : ''}`}>
                <thead>
                    <tr>
                        {showWeekSummaryColumn && <th className="cs-week-summary-head">주차</th>}
                        {WEEKDAY_NAMES.map((name, idx) => (
                            <th key={idx} className={idx === 0 ? 'sunday' : idx === 6 ? 'saturday' : ''}>
                                {name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, weekIdx) => {
                        // 미리 계산된 슬롯 사용
                        const { byCol } = allWeekSlots[weekIdx];

                        // 주 단위로 필터링된 row 매핑 계산 (같은 주 내 모든 셀에서 일관된 compactRow 사용)
                        const weekRowsUsed = new Set();
                        for (let col = 0; col < 7; col++) {
                            const bars = byCol[col] || [];
                            for (const bar of bars) {
                                if (!shouldRenderBar(bar, filters, theme)) continue;
                                weekRowsUsed.add(bar.row);
                            }
                        }
                        const weekUsedRowsSorted = [...weekRowsUsed].sort((a, b) => a - b);
                        const weekRowMap = {};
                        weekUsedRowsSorted.forEach((r, i) => weekRowMap[r] = i);
                        const weekCompactSlotCount = weekUsedRowsSorted.length;
                        const weekLeaveAreaH = weekCompactSlotCount * 21;
                        const weekSummaryLines = getWeekSummaryLines(week, weeklySchedules, filters);

                        return (
                            <tr key={`dates-${weekIdx}`} className="cs-date-row">
                                {showWeekSummaryColumn && (
                                    <td className="cs-week-summary-cell">
                                        <div className="cs-week-summary-badge">{week.weekNum}주차</div>
                                        {week.weekRangeText && <div className="cs-week-summary-range">{week.weekRangeText}</div>}
                                        {weekSummaryLines.length > 0 ? (
                                            <div className="cs-week-summary-content">
                                                {weekSummaryLines.map((line, lineIdx) => (
                                                    <div key={lineIdx} className="cs-week-summary-line">{line}</div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="cs-week-summary-empty">주간 일정 없음</div>
                                        )}
                                    </td>
                                )}
                                    {week.days.map((dayInfo, dayIdx) => {
                                        const dow = dayInfo.date.getDay();
                                        const isSunday = dow === 0;
                                        const isSaturday = dow === 6;
                                        const dateKey = formatDateKey(dayInfo.date);
                                        const isCustomHoliday = !!holidays[dateKey];
                                        const isTodayCell = isToday(dayInfo.date);

                                        let cellClass = 'cs-day-cell';
                                        if (!dayInfo.isCurrentMonth) cellClass += ' other-month';
                                        if (isSunday) cellClass += ' sunday';
                                        if (isSaturday) cellClass += ' saturday';
                                        if ((isSunday || isSaturday || isCustomHoliday) && dayInfo.isCurrentMonth) cellClass += ' holiday';
                                        if (isTodayCell) cellClass += ' today';

                                        // 일간 일정 표시
                                        const dailyText = dailySchedules[dateKey]?.text || '';


                                        // 이 셀의 출타 바들 (필터 적용 + 주 단위 row 매핑 사용)
                                        const allCellBars = byCol[dayIdx] || [];
                                        const filteredBars = allCellBars.filter((bar) => shouldRenderBar(bar, filters, theme));
                                        // 주 단위 row 매핑 사용 (필터링 후에도 주 전체에서 일관된 높이 유지)
                                        const compactedBars = filteredBars.map(b => ({ ...b, compactRow: weekRowMap[b.row] }));
                                        const leaveAreaH = weekLeaveAreaH;

                                        // 근무자 계산
                                        const dayMonth = dayInfo.m;
                                        const isOdd = dayMonth % 2 === 1;
                                        const dutyDayLabels = isOdd ? DUTY_DAY_ODD : DUTY_DAY_EVEN;
                                        const dutyNightLabels = isOdd ? DUTY_NIGHT_ODD : DUTY_NIGHT_EVEN;
                                        const dayDutySoldiers = findUnitDutySoldiers(soldiers, allSchedules, dutyReplacementsByMonth, combatLeaveByMonth, dayInfo.y, dayInfo.m, dayInfo.d, dutyDayLabels);
                                        const nightDutySoldiers = findUnitDutySoldiers(soldiers, allSchedules, dutyReplacementsByMonth, combatLeaveByMonth, dayInfo.y, dayInfo.m, dayInfo.d, dutyNightLabels);

                                        // 열외자 (사전계산된 데이터 사용)
                                        const exclKey = `${dayInfo.y}_${dayInfo.m}_${dayInfo.d}`;
                                        const excludedGroups = excludedData[exclKey] || {};
                                        const hasExcluded = filters?.excluded !== false && Object.keys(excludedGroups).length > 0;
                                        const hasDuty = filters?.duty !== false && (dayDutySoldiers.length > 0 || nightDutySoldiers.length > 0);

                                        // 생일자
                                        const birthdaySoldiers = filters?.birthday !== false
                                            ? soldiers.filter(s => s.birthMonth === dayInfo.m && s.birthDay === dayInfo.d)
                                            : [];

                                        return (
                                            <td key={dayIdx} className={cellClass} onContextMenu={(e) => handleCellContextMenu(e, dayInfo)}>
                                                <div className={`cs-day-num${dayInfo.d === 1 && !dayInfo.isCurrentMonth ? ' has-month' : ''}`}>
                                                    {dayInfo.d === 1 && !dayInfo.isCurrentMonth ? `${dayInfo.m}/${dayInfo.d}` : dayInfo.day}
                                                </div>
                                                {isCustomHoliday && !(isSunday || isSaturday) && (
                                                    <span className="cs-holiday-badge">휴일</span>
                                                )}
                                                {filters?.dailySchedule !== false && dailyText && (
                                                    <div className="cs-daily-text" title={dailyText}>
                                                        {dailyText.split('\n').filter(a => a).join(',')}
                                                    </div>
                                                )}

                                                {/* 출타 바 & 주간 일정 영역 */}
                                                {weekCompactSlotCount > 0 && (
                                                    <div className="cs-leave-area" style={{ height: leaveAreaH }}>
                                                        {compactedBars.map((bar, bi) => (
                                                            <div
                                                                key={bi}
                                                                className={`cs-leave-bar${bar.isStart ? ' is-start' : ''}${bar.isEnd ? ' is-end' : ''}${bar.isRangeStart ? ' is-range-start' : ''}${bar.isRangeEnd ? ' is-range-end' : ''}${bar.isWeekly ? ' is-weekly' : ''}${bar.isEvent ? ' is-event' : ''}${bar.isCompanyOuting ? ' is-company-outing' : ''}`}
                                                                style={{
                                                                    top: bar.compactRow * 21,
                                                                    background: bar.bg,
                                                                    color: bar.color,
                                                                    borderTop: (!bar.isWeekly && (bar.bg === '#fff' || bar.bg === '#ffffff')) ? '1px solid #ccc' : 'none',
                                                                    borderBottom: (!bar.isWeekly && (bar.bg === '#fff' || bar.bg === '#ffffff')) ? '1px solid #ccc' : 'none',
                                                                    borderLeft: bar.isRangeStart && (!bar.isWeekly && (bar.bg === '#fff' || bar.bg === '#ffffff')) ? '1px solid #ccc' : 'none',
                                                                    borderRight: bar.isRangeEnd && (!bar.isWeekly && (bar.bg === '#fff' || bar.bg === '#ffffff')) ? '1px solid #ccc' : 'none',
                                                                }}
                                                                title={bar.titleLabel || bar.displayLabel}
                                                            >
                                                                {bar.displayLabel && <span className="cs-leave-label">{bar.displayLabel}</span>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {/* 근무자 영역 */}
                                                {hasDuty && (
                                                    <>
                                                        <div className="cs-duty-sep" />
                                                        <div className="cs-duty-area">
                                                            {dayDutySoldiers.length > 0 && (
                                                                <div className="cs-duty-box cs-duty-day">
                                                                    <span className="cs-duty-icon">☀️</span>
                                                                    {dayDutySoldiers.map(s => <span key={s.id}>{s.name}</span>)}
                                                                </div>
                                                            )}
                                                            {nightDutySoldiers.length > 0 && (
                                                                <div className="cs-duty-box cs-duty-night">
                                                                    <span className="cs-duty-icon">🌙</span>
                                                                    {nightDutySoldiers.map(s => <span key={s.id}>{s.name}</span>)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                                {/* 열외자 영역 */}
                                                {hasExcluded && (
                                                    <>
                                                        <div className="cs-excl-sep" />
                                                        <div className="cs-excl-area">
                                                            {Object.entries(excludedGroups).map(([reason, soldiers]) => (
                                                                <div key={reason} className="cs-excl-box">
                                                                    <span className="cs-excl-reason">{reason}</span>
                                                                    {soldiers.map(s => <span key={s.id} className="cs-excl-name">{s.name}</span>)}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                                {/* 생일자 영역 */}
                                                {birthdaySoldiers.length > 0 && (
                                                    <div className="cs-birthday">
                                                        <span className="cs-birthday-icon">🎂</span>
                                                        {birthdaySoldiers.map(s => <span key={s.id} className="cs-birthday-name">{s.name}</span>)}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {contextMenu && (
                <CompanyOutingContextMenu
                    x={contextMenu.menuX}
                    y={contextMenu.menuY}
                    date={contextMenu.date}
                    hasCompanyOuting={!!companyOutingMap[contextMenu.dateKey]}
                    onSet={handleSetCompanyOuting}
                    onClear={handleClearCompanyOuting}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}
