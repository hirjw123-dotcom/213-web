import { useState, useEffect, useCallback, useMemo, useRef } from 'preact/hooks';
import { soldiersController } from '../@controllers/soldiersController.js';
import { soldierSchedulesController } from '../@controllers/soldierSchedulesController.js';
import { scheduleTypesController } from '../@controllers/soldierScheduleTypesController.js';
import { battalionSchedulesController } from '../@controllers/battalionSchedulesController.js';
import { combatLeaveController } from '../@controllers/combatLeaveController.js';
import { authController } from '../@controllers/authController.js';
import { UNITS } from '../@modules/configs.js';
import DB from '../@modules/db.js';
import ModalPopup from '../@components/ModalPopup.jsx';
import { filterValidSoldiers, getDaysInMonth, getDayOfWeek } from '../SoldierSchedules/@modules/utils.js';
import { combatLeaveCss, combatLeaveTableCss } from './combatLeaveCss.js';
import { dutyReplacementController } from '../@controllers/dutyReplacementController.js';
import { buildCombatLeaveStats, formatCreditValue } from './combatLeaveStats.js';
import CombatLeaveRightPanel from './CombatLeaveRightPanel.jsx';
import { RegisterPopup, ApprovalPopup, ApprovalViewPopup, LeaveHistoryPopup } from './CombatLeavePopups.jsx';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

let lastYear = +localStorage.getItem('combatLeave.lastYear');
let lastMonth = +localStorage.getItem('combatLeave.lastMonth');

const normalizeDayTypeAssignments = (assignments) => {
    const normalized = {};
    const source = assignments || {};
    for (const [day, value] of Object.entries(source)) {
        const labels = Array.isArray(value)
            ? value
            : (typeof value === 'string' && value ? [value] : []);
        const unique = [...new Set(labels.filter(Boolean))];
        if (unique.length > 0) normalized[day] = unique;
    }
    return normalized;
};

export default function CombatLeave() {
    const today = new Date();
    const [year, setYear] = useState(lastYear || today.getFullYear());
    const [month, setMonth] = useState(lastMonth || today.getMonth() + 1);
    const [loading, setLoading] = useState(true);

    const [soldiers, setSoldiers] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [scheduleTypes, setScheduleTypes] = useState([]);
    const [holidays, setHolidays] = useState({});
    const [dailySchedules, setDailySchedules] = useState({});
    const [dayTypeAssignments, setDayTypeAssignments] = useState({});
    const [combatLeaveData, setCombatLeaveData] = useState({});
    const [dutyReplacements, setDutyReplacements] = useState({});
    const [weeklySchedules, setWeeklySchedules] = useState({});
    const [contextMenu, setContextMenu] = useState(null);
    const [selectedDay, setSelectedDay] = useState(null);
    const [dailyScheduleTooltip, setDailyScheduleTooltip] = useState(null);

    const tableRef = useRef(null);
    const contextMenuOpenRef = useRef(false);
    const suppressNextCellClickRef = useRef(false);
    const highlightedElementsRef = useRef([]);

    const clearHoveredCells = useCallback(() => {
        for (const el of highlightedElementsRef.current) {
            if (!el) continue;
            const baseFilter = el.dataset.clBaseFilter || '';
            el.style.filter = baseFilter;
            delete el.dataset.clBaseFilter;
        }
        highlightedElementsRef.current = [];
    }, []);

    const applyHoverFilter = useCallback((elements) => {
        const uniqueElements = [...new Set(elements.filter(Boolean))];
        highlightedElementsRef.current = uniqueElements;
        for (const el of uniqueElements) {
            const baseFilter = el.style.filter || '';
            el.dataset.clBaseFilter = baseFilter;
            el.style.filter = baseFilter ? `${baseFilter} brightness(0.9)` : 'brightness(0.9)';
        }
    }, []);

    const handleCellMouseEnter = useCallback((e, day) => {
        const cell = e.currentTarget;
        const row = cell.closest('tr');
        const table = tableRef.current?.querySelector('.cl-table');
        if (!row || !table) return;

        clearHoveredCells();

        const rowCells = [...row.querySelectorAll('td, th')];
        const columnCells = day == null
            ? []
            : [...table.querySelectorAll(`[data-day-column="${day}"]`)];

        applyHoverFilter([...rowCells, ...columnCells]);
    }, [applyHoverFilter, clearHoveredCells]);

    const handleCellMouseLeave = useCallback(() => {
        clearHoveredCells();
    }, [clearHoveredCells]);

    useEffect(() => {
        contextMenuOpenRef.current = !!contextMenu;
    }, [contextMenu]);

    // 데이터 로드
    const loadData = useCallback(async () => {
        setLoading(true);
        const [soldierList, scheduleData, types, battalionData, dtAssign, clData, replacementData] = await Promise.all([
            soldiersController.get(),
            soldierSchedulesController.getSoldierSchedules({ y: year, m: month }),
            scheduleTypesController.get(),
            battalionSchedulesController.getAll(),
            DB.get(`dayTypeAssign_${year}_${month}`),
            combatLeaveController.getAll(year, month),
            dutyReplacementController.get(year, month),
        ]);

        const validSoldiers = filterValidSoldiers(soldierList, year, month);
        const unitOrder = Object.fromEntries(UNITS.map((u, i) => [u.id, i]));
        validSoldiers.sort((a, b) => {
            const unitA = unitOrder[a.unit] ?? 9999;
            const unitB = unitOrder[b.unit] ?? 9999;
            if (unitA !== unitB) return unitA - unitB;
            return (a.order ?? 9999) - (b.order ?? 9999);
        });

        setSoldiers(validSoldiers);
        setSchedules(scheduleData || {});
        setScheduleTypes(types);
        setHolidays(battalionData.holidays || {});
        setDailySchedules(battalionData.dailySchedules || {});
        setWeeklySchedules(battalionData.weeklySchedules || {});
        setDayTypeAssignments(normalizeDayTypeAssignments(dtAssign));
        setCombatLeaveData(clData || {});
        setDutyReplacements(replacementData || {});
        setLoading(false);
    }, [year, month]);

    const reloadCombatLeave = useCallback(async () => {
        const clData = await combatLeaveController.getAll(year, month);
        setCombatLeaveData(clData || {});
    }, [year, month]);

    useEffect(() => { loadData(); }, [loadData]);

    const days = getDaysInMonth(year, month);
    const isToday = (day) => year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
    const isSaturday = (day) => getDayOfWeek(year, month, day) === 6;
    const isSunday = (day) => getDayOfWeek(year, month, day) === 0;

    const dailyScheduleItemsByDay = useMemo(() => {
        const result = {};
        for (const day of days) {
            const dateKey = battalionSchedulesController.utils.formatDate(new Date(year, month - 1, day));
            const text = dailySchedules[dateKey]?.text || '';
            result[day] = text.split('\n').map((line) => line.trim()).filter(Boolean);
        }
        return result;
    }, [days, year, month, dailySchedules]);

    const getTooltipPosition = useCallback((clientX, clientY) => {
        const width = 260;
        const height = 220;
        const padding = 16;
        return {
            x: Math.max(padding, Math.min(clientX + 14, window.innerWidth - width - padding)),
            y: Math.max(padding, Math.min(clientY + 14, window.innerHeight - height - padding)),
        };
    }, []);

    const handleDailyScheduleMouseEnter = useCallback((e, day) => {
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
    }, [dailyScheduleItemsByDay, getTooltipPosition]);

    const handleDailyScheduleMouseMove = useCallback((e, day) => {
        setDailyScheduleTooltip((prev) => {
            if (!prev || prev.day !== day) return prev;
            return {
                ...prev,
                ...getTooltipPosition(e.clientX, e.clientY),
            };
        });
    }, [getTooltipPosition]);

    const handleDailyScheduleMouseLeave = useCallback(() => {
        setDailyScheduleTooltip(null);
    }, []);

    const isDayHoliday = useCallback((day) => {
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (holidays[dateKey]) return true;
        const dtLabels = dayTypeAssignments[day];
        if (Array.isArray(dtLabels) && dtLabels.includes('휴일')) return true;
        return false;
    }, [year, month, holidays, dayTypeAssignments]);

    // 스케줄 타입별 스타일 맵
    const scheduleTypeByLabel = useMemo(() => {
        const map = {};
        for (const t of scheduleTypes) map[t.label] = t;
        return map;
    }, [scheduleTypes]);

    const 전휴Style = useMemo(() => {
        const t = scheduleTypeByLabel['전휴'];
        return t ? { background: t.bg || '#fff', color: t.color || '#ff4444', fontWeight: t.bold ? 'bold' : 'normal' } : { background: '#fff', color: '#ff4444', fontWeight: 'bold' };
    }, [scheduleTypeByLabel]);

    const 반투Style = useMemo(() => {
        const t = scheduleTypeByLabel['반투'];
        return t ? { background: t.bg || '#fff', color: t.color || '#ff4444', fontWeight: t.bold ? 'bold' : 'normal' } : { background: '#fff', color: '#ff4444', fontWeight: 'normal' };
    }, [scheduleTypeByLabel]);

    const getUnitInfo = (unitId) => UNITS.find(u => u.id === unitId) || { name: '', bg: '#fff' };

    // 주간일정 colspan 계산
    const getWeekdayColspan = useCallback((startDay) => {
        let colspan = 0;
        for (let d = startDay; d <= days.length; d++) {
            const dow = getDayOfWeek(year, month, d);
            if (dow >= 1 && dow <= 5) colspan++;
            else break;
        }
        return colspan;
    }, [year, month, days]);

    // 용사별 이번달 통계
    const soldierStats = useMemo(() => {
        return buildCombatLeaveStats({
            soldiers,
            schedules,
            dutyReplacements,
            combatLeaveData,
            year,
            month,
            holidays,
        });
    }, [soldiers, schedules, dutyReplacements, combatLeaveData, year, month, holidays]);

    // 합계 행
    const totals = useMemo(() => {
        let 합 = 0, 전휴 = 0, 반투 = 0;
        for (const day of days) {
            for (const soldier of soldiers) {
                const entry = combatLeaveData[soldier.id]?.[day];
                if (entry) {
                    합++;
                    if (entry.type === '전휴') 전휴++;
                    else if (entry.type === '반투') 반투++;
                }
            }
        }
        return { 합, 전휴, 반투 };
    }, [soldiers, combatLeaveData, days]);

    // 날짜별 전투휴무 합계 (전체/전휴/반투)
    const dayTotals = useMemo(() => {
        const all = {}, 전휴 = {}, 반투 = {};
        for (const day of days) {
            let a = 0, j = 0, b = 0;
            for (const soldier of soldiers) {
                const entry = combatLeaveData[soldier.id]?.[day];
                if (entry) { a++; if (entry.type === '전휴') j++; else if (entry.type === '반투') b++; }
            }
            all[day] = a; 전휴[day] = j; 반투[day] = b;
        }
        return { all, 전휴, 반투 };
    }, [soldiers, combatLeaveData, days]);

    // 월 이동
    const saveMonth = (y, m) => {
        setYear(y); setMonth(m);
        lastYear = y; lastMonth = m;
        localStorage.setItem('combatLeave.lastYear', y);
        localStorage.setItem('combatLeave.lastMonth', m);
    };
    const prevMonth = () => {
        const nm = month === 1 ? 12 : month - 1;
        const ny = month === 1 ? year - 1 : year;
        saveMonth(ny, nm);
    };
    const nowMonth = () => {
        if (year === today.getFullYear() && month === today.getMonth() + 1) return;
        saveMonth(today.getFullYear(), today.getMonth() + 1);
    };
    const nextMonth = () => {
        const nm = month === 12 ? 1 : month + 1;
        const ny = month === 12 ? year + 1 : year;
        saveMonth(ny, nm);
    };

    // 셀 클릭 - 컨텍스트 메뉴
    const handleCellClick = (e, soldierId, day) => {
        e.preventDefault();
        e.stopPropagation();
        suppressNextCellClickRef.current = false;
        setContextMenu({ soldierId, day, x: e.clientX + 8, y: e.clientY + 8 });
    };

    // 전역 클릭 + ESC 시 컨텍스트 메뉴 닫기
    useEffect(() => {
        const handleClick = (e) => {
            const clickedCell = !!e.target?.closest?.('.cl-cell');
            suppressNextCellClickRef.current = contextMenuOpenRef.current && clickedCell;
            setContextMenu(null);
        };
        const handleKeyDown = (e) => { if (e.key === 'Escape') setContextMenu(null); };
        window.addEventListener('mousedown', handleClick);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handleClick);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => clearHoveredCells, [clearHoveredCells]);

    const openLeaveHistoryPopup = useCallback((soldier) => {
        ModalPopup.push(<LeaveHistoryPopup soldier={soldier} />);
    }, []);

    const openLeaveDocument = useCallback((soldierId, day) => {
        const entry = combatLeaveData[soldierId]?.[day];
        if (!entry) return;

        const soldier = soldiers.find(s => s.id === soldierId);
        if (!soldier) return;

        if (entry.status === 'approved') {
            ModalPopup.push(
                <ApprovalViewPopup entry={{ ...entry, soldierId, day }} soldier={soldier} year={year} month={month} onApproved={reloadCombatLeave} />
            );
            return;
        }

        ModalPopup.push(
            <ApprovalPopup entry={{ ...entry, soldierId, day }} soldier={soldier} year={year} month={month} onApproved={reloadCombatLeave} />
        );
    }, [combatLeaveData, month, reloadCombatLeave, soldiers, year]);

    // 컨텍스트 메뉴 액션
    const handleRegister = async (type) => {
        if (!contextMenu) return;
        const soldier = soldiers.find(s => s.id === contextMenu.soldierId);
        if (!soldier) return;
        setContextMenu(null);
        ModalPopup.push(
            <RegisterPopup type={type} soldier={soldier} year={year} month={month} day={contextMenu.day} onRegistered={reloadCombatLeave} />
        );
    };

    let lastUnit = null;

    return (
        <div className="combat-leave" style={{ zoom: .85 }} onClick={() => setContextMenu(null)}>
            <style>{combatLeaveCss}</style>
            <style>{combatLeaveTableCss}</style>

            {/* 헤더 */}
            <div className="cl-header">
                <div className="cl-header-center">
                    <button className="nav-btn" onClick={prevMonth}>◀ 이전달</button>
                    <button className="nav-btn" onClick={nowMonth}>이번달</button>
                    <span className="month-title">{year}년 {month}월</span>
                    <button className="nav-btn" onClick={nextMonth}>다음달 ▶</button>
                </div>
            </div>

            {/* 바디 */}
            <div className="cl-body">
                {/* 테이블 */}
                <div className="cl-table-wrap" ref={tableRef} style={{ '--cl-day-cell-width': '32px' }}>
                    {loading ? (
                        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>로딩 중...</div>
                    ) : (
                        <table className="cl-table">
                            <thead>
                                <tr>
                                    <th className="col-num">#</th>
                                    <th className="col-name">계급/이름</th>
                                    {days.map((day) => {
                                        let cls = 'col-day';
                                        if (isToday(day)) cls += ' today';
                                        if (isSunday(day)) cls += ' sunday sunday-col';
                                        else if (isSaturday(day)) cls += ' saturday';
                                        if (isDayHoliday(day)) cls += ' holiday-col';
                                        return <th key={day} className={cls} data-day-column={day}>{day}</th>;
                                    })}
                                    <th className="col-summary" style={{ background: '#e8eaf6' }}>주</th>
                                    <th className="col-summary" style={{ background: '#e8eaf6' }}>야당</th>
                                    <th className="col-summary" style={{ background: '#e8eaf6' }}>주당</th>
                                    {/* <th className="col-summary" style={{ background: '#fce4ec' }}>휴무</th> */}
                                    <th className="col-summary" style={{ background: '#fce4ec' }}>전휴</th>
                                    <th className="col-summary" style={{ background: '#fce4ec' }}>반투</th>
                                    <th className="col-summary" style={{ background: '#fff1f1', color: '#c62828' }}>초과</th>
                                </tr>
                                <tr className="daily-row">
                                    <td className="sticky-cell" style={{ left: 0, background: '#eceff1' }}></td>
                                    <td className="sticky-cell" style={{ left: 35, fontWeight: 600, fontSize: 13, background: '#eceff1' }}>일일일정</td>
                                    {days.map((day) => {
                                        const items = dailyScheduleItemsByDay[day] || [];
                                        return (
                                            <td
                                                key={day}
                                                className={`daily-schedule-cell${items.length ? ' has-items' : ''}${isSunday(day) ? ' sunday-col' : ''}`}
                                                data-day-column={day}
                                                onMouseEnter={(e) => handleDailyScheduleMouseEnter(e, day)}
                                                onMouseMove={(e) => handleDailyScheduleMouseMove(e, day)}
                                                onMouseLeave={handleDailyScheduleMouseLeave}
                                            >
                                                {items.length ? `${items.length}개` : ''}
                                            </td>
                                        );
                                    })}
                                    <td className="col-summary" style={{ background: '#eef2f5' }}></td>
                                    <td className="col-summary" style={{ background: '#eef2f5' }}></td>
                                    <td className="col-summary" style={{ background: '#eef2f5' }}></td>
                                    <td className="col-summary" style={{ background: '#fdf1f4' }}></td>
                                    <td className="col-summary" style={{ background: '#fdf1f4' }}></td>
                                    <td className="col-summary" style={{ background: '#fff7f7' }}></td>
                                </tr>
                                {/* 주간일정 행 */}
                                <tr className="week-row">
                                    <td className="sticky-cell" style={{ left: 0, background: '#e0e0e0' }}></td>
                                    <td className="sticky-cell" style={{ left: 35, fontWeight: 600, fontSize: 13, background: '#e0e0e0' }}>주간일정</td>
                                    {days.map((day) => {
                                        const dayOfWeek = getDayOfWeek(year, month, day);
                                        if (dayOfWeek === 0 || dayOfWeek === 6) {
                                            return <td key={day} className={dayOfWeek === 0 ? 'sunday-col' : ''} style={{ background: '#eee', fontSize: 12, color: '#bbb' }}>-</td>;
                                        }
                                        const prevDow = day > 1 ? getDayOfWeek(year, month, day - 1) : -1;
                                        const isWeekStart = dayOfWeek === 1 || (day === 1 && dayOfWeek >= 1 && dayOfWeek <= 5) || (prevDow === 0 || prevDow === 6);
                                        if (isWeekStart) {
                                            const colspan = getWeekdayColspan(day);
                                            if (colspan === 0) return null;
                                            const date = new Date(year, month - 1, day);
                                            const { year: weekYear, weekNum } = battalionSchedulesController.utils.getWeekNumber(date);
                                            const weekKey = battalionSchedulesController.utils.getWeekKey(weekYear, weekNum);
                                            return <td key={day} colSpan={colspan} className="week-content" style={{
                                                maxWidth: 32 * colspan,
                                            }}>{weeklySchedules[weekKey]?.text || '-'}</td>;
                                        }
                                        return null;
                                    })}
                                    <td className="col-summary" style={{ background: '#e8eaf6' }}></td>
                                    <td className="col-summary" style={{ background: '#e8eaf6' }}></td>
                                    <td className="col-summary" style={{ background: '#e8eaf6' }}></td>
                                    {/* <td className="col-summary" style={{ background: '#fce4ec' }}></td> */}
                                    <td className="col-summary" style={{ background: '#fce4ec' }}></td>
                                    <td className="col-summary" style={{ background: '#fce4ec' }}></td>
                                    <td className="col-summary" style={{ background: '#fff1f1' }}></td>
                                </tr>
                            </thead>
                            <tbody>
                                {soldiers.map((soldier, idx) => {
                                    const stats = soldierStats[soldier.id] || {};
                                    const isNewUnit = soldier.unit !== lastUnit;
                                    lastUnit = soldier.unit;
                                    return (
                                        <tr key={soldier.id} className={isNewUnit ? 'newUnit' : ''} data-soldier-id={soldier.id}>
                                            <td className="sticky-cell col-num">{idx + 1}</td>
                                            <td className="sticky-cell col-name" style={{
                                                background: soldier.categories?.includes('special') ? '#000' : getUnitInfo(soldier.unit).bg,
                                                color: soldier.categories?.includes('special') ? '#ff0000' : undefined,
                                                fontWeight: soldier.categories?.includes('special') ? 'bold' : undefined,
                                            }}>
                                                <button
                                                    className="cl-link-button"
                                                    style={{ zoom: 1.1 }}
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        openLeaveHistoryPopup(soldier);
                                                    }}
                                                >
                                                    {soldier.rank} {soldier.name}
                                                </button>
                                            </td>
                                            {days.map((day) => {
                                                const entry = combatLeaveData[soldier.id]?.[day];
                                                const isPendingCell = entry?.status === 'pending';
                                                const isPendingFullDayLeave = isPendingCell && entry?.type === '전휴';
                                                const style = entry
                                                    ? {
                                                        ...(entry.type === '전휴' ? 전휴Style : 반투Style),
                                                        ...(isPendingFullDayLeave ? { filter: 'grayscale(100%)' } : {}),
                                                    }
                                                    : {};
                                                const isApprovedCell = entry?.status === 'approved';
                                                return (
                                                    <td key={day} className={`cl-cell${isSunday(day) ? ' sunday-col' : ''}`} style={style} data-day-column={day}
                                                        onClick={(e) => {
                                                            if (suppressNextCellClickRef.current) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                suppressNextCellClickRef.current = false;
                                                                return;
                                                            }
                                                            if (entry) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                openLeaveDocument(soldier.id, day);
                                                                return;
                                                            }
                                                            handleCellClick(e, soldier.id, day);
                                                        }}
                                                        onMouseEnter={(e) => handleCellMouseEnter(e, day)}
                                                        onMouseLeave={handleCellMouseLeave}
                                                        onContextMenu={(e) => {
                                                            if (entry) {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                openLeaveDocument(soldier.id, day);
                                                                return;
                                                            }
                                                            handleCellClick(e, soldier.id, day);
                                                        }}
                                                    >
                                                        {entry && (
                                                            <div className={`cl-cell-content ${isPendingCell ? 'pending' : ''}`} style={style}
                                                                title={isPendingCell ? `${entry.type} (승인대기)\n${entry.reason}` : `${entry.type} (승인됨)\n${entry.reason}`}
                                                            >{entry.type}</div>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                            <td className="col-summary" style={{ fontWeight: stats.주 ? 700 : 400, color: stats.주 ? '#000' : '#bbb' }}>{stats.주 || 0}</td>
                                            <td className="col-summary" style={{ fontWeight: stats.야당 ? 700 : 400, color: stats.야당 ? '#000' : '#bbb' }}>{stats.야당 || 0}</td>
                                            <td className="col-summary" style={{ fontWeight: stats.주당 ? 700 : 400, color: stats.주당 ? '#000' : '#bbb' }}>{stats.주당 || 0}</td>
                                            {/* <td className="col-summary" style={{ fontWeight: 700, color: stats.휴무 ? '#c62828' : '#bbb', background: '#fce4ec' }}>{stats.휴무 || 0}</td> */}
                                            <td className="col-summary" style={{ fontWeight: stats.전휴 ? 700 : 400, color: stats.전휴 ? '#c62828' : '#bbb', background: '#fce4ec' }}>{stats.전휴 || 0}</td>
                                            <td className="col-summary" style={{ fontWeight: stats.반투 ? 700 : 400, color: stats.반투 ? '#c62828' : '#bbb', background: '#fce4ec' }}>{stats.반투 || 0}</td>
                                            <td className="col-summary" style={{ fontWeight: stats.excessCredit ? 700 : 400, color: stats.excessCredit ? '#c62828' : '#ccc', background: '#fff1f1' }}>{stats.excessCredit ? formatCreditValue(stats.excessCredit) : ''}</td>
                                        </tr>
                                    );
                                })}
                                {/* 합계 행 */}
                                <tr className="cl-totals-row">
                                    <td className="sticky-cell col-num" style={{ background: '#e8e8e8' }}></td>
                                    <td className="sticky-cell col-name" style={{ background: '#e8e8e8', fontWeight: 700, textAlign: 'center' }}>합계</td>
                                    {days.map((day) => {
                                        const c = dayTotals.all[day] || 0;
                                        return <td key={day} className={`cl-cell${isSunday(day) ? ' sunday-col' : ''}`} style={{ background: '#f5f5f5', fontWeight: c ? 700 : 400, color: c ? '#c62828' : '#ccc', fontSize: 13 }} data-day-column={day} onMouseEnter={(e) => handleCellMouseEnter(e, day)} onMouseLeave={handleCellMouseLeave}>{c || ''}</td>;
                                    })}
                                    <td className="col-summary" style={{ background: '#e8eaf6' }}></td>
                                    <td className="col-summary" style={{ background: '#e8eaf6' }}></td>
                                    <td className="col-summary" style={{ background: '#e8eaf6' }}></td>
                                    {/* <td className="col-summary" style={{ background: '#e0b0b8', fontWeight: 900, color: '#b71c1c', fontSize: 14 }}>{totals.합}</td> */}
                                    <td className="col-summary" style={{ background: '#fce4ec', fontWeight: 700, color: '#c62828' }}>{totals.전휴}</td>
                                    <td className="col-summary" style={{ background: '#fce4ec', fontWeight: 700, color: '#c62828' }}>{totals.반투}</td>
                                    <td className="col-summary" style={{ background: '#fff1f1' }}></td>
                                </tr>
                                <tr className="cl-totals-row">
                                    <td className="sticky-cell col-num" style={{ background: '#e8e8e8' }}></td>
                                    <td className="sticky-cell col-name" style={{ background: '#fff0f0', fontWeight: 700, textAlign: 'center', color: '#c62828' }}>전휴</td>
                                    {days.map((day) => {
                                        const c = dayTotals.전휴[day] || 0;
                                        return <td key={day} className={`cl-cell${isSunday(day) ? ' sunday-col' : ''}`} style={{ background: '#fff8f8', fontWeight: c ? 700 : 400, color: c ? '#c62828' : '#ddd', fontSize: 13 }} data-day-column={day} onMouseEnter={(e) => handleCellMouseEnter(e, day)} onMouseLeave={handleCellMouseLeave}>{c || ''}</td>;
                                    })}
                                    <td className="col-summary" colSpan={7} style={{ background: '#f5f5f5' }}></td>
                                </tr>
                                <tr className="cl-totals-row">
                                    <td className="sticky-cell col-num" style={{ background: '#e8e8e8' }}></td>
                                    <td className="sticky-cell col-name" style={{ background: '#f0f0ff', fontWeight: 700, textAlign: 'center', color: '#1565c0' }}>반투</td>
                                    {days.map((day) => {
                                        const c = dayTotals.반투[day] || 0;
                                        return <td key={day} className={`cl-cell${isSunday(day) ? ' sunday-col' : ''}`} style={{ background: '#f8f8ff', fontWeight: c ? 700 : 400, color: c ? '#1565c0' : '#ddd', fontSize: 13 }} data-day-column={day} onMouseEnter={(e) => handleCellMouseEnter(e, day)} onMouseLeave={handleCellMouseLeave}>{c || ''}</td>;
                                    })}
                                    <td className="col-summary" colSpan={7} style={{ background: '#f5f5f5' }}></td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>

                {/* 우측 패널 */}
                <CombatLeaveRightPanel
                    year={year} month={month} soldiers={soldiers}
                    combatLeaveData={combatLeaveData} holidays={holidays}
                    dayTypeAssignments={dayTypeAssignments} schedules={schedules}
                    dutyReplacements={dutyReplacements}
                    scheduleTypes={scheduleTypes} onDataChanged={reloadCombatLeave}
                    selectedDay={selectedDay} setSelectedDay={setSelectedDay}
                />
            </div>

            {/* 컨텍스트 메뉴 */}
            {contextMenu && (() => {
                const soldier = soldiers.find(s => s.id === contextMenu.soldierId);
                const dayOfWeek = DAY_NAMES[new Date(year, month - 1, contextMenu.day).getDay()];
                const title = `${soldier?.rank || ''} ${soldier?.name || ''} ${month}/${String(contextMenu.day).padStart(2, '0')}(${dayOfWeek})`;
                return (
                    <div className="cl-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}
                        onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                        <div className="cl-context-menu-header">{title}</div>
                        <button className="cl-context-menu-item" onClick={() => handleRegister('전휴')}>🟢 전투휴무 등록</button>
                        <button className="cl-context-menu-item" onClick={() => handleRegister('반투')}>🔵 반투휴무 등록</button>
                    </div>
                );
            })()}

            {dailyScheduleTooltip && (
                <div className="cl-daily-tooltip" style={{ left: dailyScheduleTooltip.x, top: dailyScheduleTooltip.y }}>
                    <div className="cl-daily-tooltip-title">
                        {month}/{String(dailyScheduleTooltip.day).padStart(2, '0')} 일일 일정
                    </div>
                    {dailyScheduleTooltip.items.map((item, index) => (
                        <div key={`${dailyScheduleTooltip.day}-${index}`} className="cl-daily-tooltip-item">{item}</div>
                    ))}
                </div>
            )}
        </div>
    );
}
