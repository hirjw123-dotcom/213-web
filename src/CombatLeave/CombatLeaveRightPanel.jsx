import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks';
import { combatLeaveController } from '../@controllers/combatLeaveController.js';
import ModalPopup from '../@components/ModalPopup.jsx';
import { ApprovalPopup, ApprovalViewPopup } from './CombatLeavePopups.jsx';
import { getDayOfWeek } from '../SoldierSchedules/@modules/utils.js';
import { buildCombatLeaveStats } from './combatLeaveStats.js';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const ENABLE_TAB_SLIDE_ANIMATION = true;
const TAB_SLIDE_DURATION_MS = 280;

// ===== 간단한 테이블 형태 미니달력 (헤더 없음, 현재 월 고정) =====
function CLMiniCalendar({ year, month, selectedDay, onSelectDay, dayCounts, dayTypeCounts, holidays, dayTypeAssignments }) {
    const today = new Date();
    const todayY = today.getFullYear(), todayM = today.getMonth() + 1, todayD = today.getDate();

    const cells = useMemo(() => {
        const firstDay = new Date(year, month - 1, 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const rows = [];
        let row = [];
        // 앞쪽 빈칸
        for (let i = 0; i < startWeekday; i++) row.push(null);
        for (let d = 1; d <= daysInMonth; d++) {
            row.push(d);
            if (row.length === 7) { rows.push(row); row = []; }
        }
        if (row.length > 0) { while (row.length < 7) row.push(null); rows.push(row); }
        return rows;
    }, [year, month]);

    return (
        <table className="cl-mini-cal">
            <thead>
                <tr>
                    {DAY_NAMES.map((d, i) => (
                        <th key={d} className={`cl-mini-cal__head ${i === 0 ? 'sunday' : i === 6 ? 'saturday' : ''}`}>{d}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {cells.map((row, ri) => (
                    <tr key={ri}>
                        {row.map((day, ci) => {
                            if (day === null) return <td key={ci} className="cl-mini-cal__cell empty"></td>;
                            const isSelected = day === selectedDay;
                            const isToday = year === todayY && month === todayM && day === todayD;
                            const dow = getDayOfWeek(year, month, day);
                            const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dtLabels = dayTypeAssignments?.[day];
                            const isHoliday = !!holidays?.[dateKey] || (Array.isArray(dtLabels) && dtLabels.includes('휴일'));
                            const leaveCount = dayCounts[day] || 0;
                            const typeCounts = dayTypeCounts[day] || {};
                            const halfDayCount = typeCounts['반투'] || 0;
                            const fullDayCount = typeCounts['전휴'] || 0;
                            return (
                                <td
                                    key={ci}
                                    className={`cl-mini-cal__cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${isHoliday ? 'holiday' : ''} ${dow === 0 ? 'sunday' : dow === 6 ? 'saturday' : ''}`}
                                    onClick={() => onSelectDay(day)}
                                >
                                    <div className="cl-mini-cal__day">
                                        <span className="cl-mini-cal__day-labels">
                                            <span className="cl-mini-cal__day-number">{day}</span>
                                            {isToday && <span className="cl-mini-cal__today-badge">오늘</span>}
                                        </span>
                                        {leaveCount > 0 && <span className="cl-mini-cal__badge">대기 {leaveCount}</span>}
                                    </div>
                                    {(halfDayCount > 0 || fullDayCount > 0) && (
                                        <div className="cl-mini-cal__summary">
                                            {halfDayCount > 0 && <div className="cl-mini-cal__summary-item half-day">반투 {halfDayCount}</div>}
                                            {fullDayCount > 0 && <div className="cl-mini-cal__summary-item full-day">전휴 {fullDayCount}</div>}
                                        </div>
                                    )}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export default function CombatLeaveRightPanel({
    year, month, soldiers, combatLeaveData, holidays, dayTypeAssignments,
    schedules, dutyReplacements, scheduleTypes, onDataChanged, selectedDay, setSelectedDay,
}) {
    const [dateMode, setDateMode] = useState('daily'); // 'daily' | 'monthly'
    const [rightTab, setRightTab] = useState('approved'); // 'approved' | 'pending'
    const panelRef = useRef(null);
    const handledAutoTabScopeRef = useRef('');
    const [resizing, setResizing] = useState(false);

    const today = new Date();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

    const effectiveDay = useMemo(() => {
        if (dateMode === 'monthly') return null;
        return selectedDay || (isCurrentMonth ? today.getDate() : 1);
    }, [dateMode, selectedDay, isCurrentMonth]);

    const activeDateScopeKey = useMemo(() => (
        `${dateMode}_${year}_${month}_${effectiveDay ?? 'monthly'}`
    ), [dateMode, effectiveDay, month, year]);

    const dateModeLabel = useMemo(() => {
        if (dateMode === 'monthly') return '월간';
        if (isCurrentMonth && effectiveDay === today.getDate()) return '오늘';
        const dayOfWeek = DAY_NAMES[new Date(year, month - 1, effectiveDay).getDay()];
        return `${String(month).padStart(2, '0')}/${String(effectiveDay).padStart(2, '0')}(${dayOfWeek})`;
    }, [dateMode, effectiveDay, isCurrentMonth, month, year]);

    const soldierMap = useMemo(() => {
        const map = {};
        for (const s of soldiers) map[s.id] = s;
        return map;
    }, [soldiers]);

    const dailyLeaveCounts = useMemo(() => {
        const counts = {};
        for (const days of Object.values(combatLeaveData)) {
            for (const [day, entry] of Object.entries(days)) {
                if (entry?.status !== 'pending') continue;
                const dayNum = Number(day);
                counts[dayNum] = (counts[dayNum] || 0) + 1;
            }
        }
        return counts;
    }, [combatLeaveData]);

    const dailyApprovedLeaveTypeCounts = useMemo(() => {
        const counts = {};
        for (const days of Object.values(combatLeaveData)) {
            for (const [day, entry] of Object.entries(days)) {
                if (entry?.status !== 'approved') continue;
                const dayNum = Number(day);
                if (!counts[dayNum]) counts[dayNum] = { '반투': 0, '전휴': 0 };
                if (entry.type === '반투' || entry.type === '전휴') {
                    counts[dayNum][entry.type] += 1;
                }
            }
        }
        return counts;
    }, [combatLeaveData]);

    const { approvedList, pendingList } = useMemo(() => {
        const approved = [];
        const pending = [];
        for (const [soldierId, days] of Object.entries(combatLeaveData)) {
            for (const [day, entry] of Object.entries(days)) {
                const dayNum = Number(day);
                if (dateMode !== 'monthly' && effectiveDay && dayNum !== effectiveDay) continue;
                const soldier = soldierMap[soldierId];
                const item = { soldierId, day: dayNum, soldier, ...entry };
                if (entry.status === 'approved') approved.push(item);
                else if (entry.status === 'pending') pending.push(item);
            }
        }
        approved.sort((a, b) => a.day - b.day || (a.soldier?.name || '').localeCompare(b.soldier?.name || '', 'ko'));
        pending.sort((a, b) => a.day - b.day || (a.soldier?.name || '').localeCompare(b.soldier?.name || '', 'ko'));
        return { approvedList: approved, pendingList: pending };
    }, [combatLeaveData, dateMode, effectiveDay, soldierMap]);

    const getTypeCountsForList = useCallback((list) => {
        let halfDayCount = 0;
        let fullDayCount = 0;

        for (const item of list) {
            if (item.type === '반투') halfDayCount++;
            else if (item.type === '전휴') fullDayCount++;
        }

        return { halfDayCount, fullDayCount };
    }, []);

    useEffect(() => {
        handledAutoTabScopeRef.current = '';
        setRightTab('approved');
    }, [activeDateScopeKey]);

    useEffect(() => {
        if (handledAutoTabScopeRef.current === activeDateScopeKey) return;
        if (approvedList.length === 0 && pendingList.length === 0) return;

        handledAutoTabScopeRef.current = activeDateScopeKey;
        if (approvedList.length === 0 && pendingList.length > 0) {
            setRightTab('pending');
        }
    }, [activeDateScopeKey, approvedList.length, pendingList.length]);

    const selectRightTab = useCallback((nextTab) => {
        handledAutoTabScopeRef.current = activeDateScopeKey;
        setRightTab(nextTab);
    }, [activeDateScopeKey]);

    // 용사별 이번달 통계 (공통 함수)
    const allSoldierStats = useMemo(() => {
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

    const openLeaveDocument = useCallback((entry) => {
        const soldier = soldierMap[entry.soldierId];
        if (!soldier) return;

        if (entry.status === 'approved') {
            ModalPopup.push(
                <ApprovalViewPopup entry={entry} soldier={soldier} year={year} month={month} onApproved={onDataChanged} />
            );
            return;
        }

        ModalPopup.push(
            <ApprovalPopup entry={entry} soldier={soldier} year={year} month={month} onApproved={onDataChanged} />
        );
    }, [month, onDataChanged, soldierMap, year]);

    const renderStatsTable = (list, showApproveBtn) => (
        <table className="cl-right-list-table">
            <thead>
                <tr>
                    <th style={{ width: 70 }}>날짜</th>
                    <th style={{ width: 100 }}>계급/이름</th>
                    <th style={{ width: 50 }}>유형</th>
                    <th className="cl-col-reason">사유</th>
                    {showApproveBtn ? <th style={{ width: 80 }}>문서</th> : <th style={{ width: 80 }}>승인자</th>}
                    <th style={{ width: 35 }}>주</th>
                    <th style={{ width: 35 }}>야당</th>
                    <th style={{ width: 35 }}>주당</th>
                    {/* <th className="cl-col-leave" style={{ width: 40 }}>휴무</th> */}
                    <th className="cl-col-leave" style={{ width: 35 }}>전휴</th>
                    <th className="cl-col-leave" style={{ width: 35 }}>반투</th>
                </tr>
            </thead>
            <tbody>
                {[
                    ...list,
                ].map((item) => {
                    const dayOfWeek = DAY_NAMES[new Date(year, month - 1, item.day).getDay()];
                    const stats = allSoldierStats[item.soldierId] || {};
                    return (
                        <tr key={`${item.soldierId}_${item.day}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => openLeaveDocument(item)}
                        >
                            <td style={{ fontSize: 13 }}>{month}/{String(item.day).padStart(2, '0')}({dayOfWeek})</td>
                            <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                                {item.soldier?.rank || ''} {item.soldier?.name || '?'}
                            </td>
                            <td style={{ fontSize: 13, fontWeight: 600, color: '#c62828' }}>{item.type}</td>
                            <td className="cl-col-reason" title={item.reason || '-'}>
                                {item.reason || '-'}
                            </td>
                            {showApproveBtn ? (
                                <td style={{ padding: 0 }}>
                                    <button className="cl-approve-btn"
                                        onClick={(e) => { e.stopPropagation(); openLeaveDocument(item); }}
                                    >열기</button>
                                </td>
                            ) : (
                                <td style={{ fontSize: 13 }}>{item.approver || '-'}</td>
                            )}
                            <td style={{ fontSize: 12, color: stats.주 ? '#333' : '#ccc' }}>{stats.주 || 0}</td>
                            <td style={{ fontSize: 12, color: stats.야당 ? '#333' : '#ccc' }}>{stats.야당 || 0}</td>
                            <td style={{ fontSize: 12, color: stats.주당 ? '#333' : '#ccc' }}>{stats.주당 || 0}</td>
                            {/* <td className="cl-col-leave" style={{ fontSize: 12, fontWeight: 700, color: stats.휴무 ? '#c62828' : '#ccc' }}>{stats.휴무 || 0}</td> */}
                            <td className="cl-col-leave" style={{ borderRight: 0, fontSize: 12, color: stats.전휴 ? '#c62828' : '#ccc' }}>{stats.전휴 || 0}</td>
                            <td className="cl-col-leave" style={{ borderRight: 0, fontSize: 12, color: stats.반투 ? '#c62828' : '#ccc' }}>{stats.반투 || 0}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );

    const renderListPanel = (list, panelType) => {
        const typeCounts = getTypeCountsForList(list);
        const showApproveBtn = panelType === 'pending';
        const emptyMessage = showApproveBtn
            ? '승인 대기 중인 휴무가 없습니다.'
            : `${dateModeLabel} 승인된 휴무자가 없습니다.`;

        return (
            <div className={`cl-right-panel-page ${panelType}`}>
                <div className="cl-right-page-scroll">
                    {list.length === 0 ? (
                        <div className="cl-empty-message">{emptyMessage}</div>
                    ) : renderStatsTable(list, showApproveBtn)}
                </div>

                {(typeCounts.halfDayCount > 0 || typeCounts.fullDayCount > 0) && (
                    <div className="cl-right-summary">
                        {typeCounts.halfDayCount > 0 && (
                            <span className="cl-right-summary__item half-day">반투 {typeCounts.halfDayCount}명</span>
                        )}
                        {typeCounts.fullDayCount > 0 && (
                            <span className="cl-right-summary__item full-day">전휴 {typeCounts.fullDayCount}명</span>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const slideTrackStyle = useMemo(() => ({
        transform: rightTab === 'approved' ? 'translate3d(0%, 0, 0)' : 'translate3d(-50%, 0, 0)',
        transition: ENABLE_TAB_SLIDE_ANIMATION
            ? `transform ${TAB_SLIDE_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
            : 'none',
    }), [rightTab]);

    // 리사이즈 핸들
    const handleResizeStart = useCallback((e) => {
        e.preventDefault();
        setResizing(true);
        const startX = e.clientX;
        const startWidth = panelRef.current?.offsetWidth || 480;
        const onMove = (e2) => {
            const delta = startX - e2.clientX;
            const newWidth = Math.max(300, Math.min(800, startWidth + delta));
            if (panelRef.current) panelRef.current.style.width = newWidth + 'px';
        };
        const onUp = () => {
            setResizing(false);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }, []);

    return (
        <div className="cl-right-panel" ref={panelRef}>
            {/* 리사이즈 핸들 */}
            <div className={`cl-resize-handle ${resizing ? 'active' : ''}`} onMouseDown={handleResizeStart} />
            {/* 일일/월간 모드 탭 */}
            <div className="cl-mode-tabs">
                <button className={`cl-mode-tab ${dateMode === 'daily' ? 'active' : ''}`}
                    onClick={() => { setDateMode('daily'); if (!selectedDay) setSelectedDay(isCurrentMonth ? today.getDate() : 1); }}>
                    📅 일일 휴무자
                </button>
                <button className={`cl-mode-tab ${dateMode === 'monthly' ? 'active' : ''}`}
                    onClick={() => { setDateMode('monthly'); }}>
                    📋 월간 휴무자
                </button>
            </div>

            {/* 일일 모드: 테이블 달력 (헤더 없음, 현재 월 고정) */}
            {dateMode === 'daily' && (
                <div className="cl-calendar-wrap">
                    <CLMiniCalendar
                        year={year}
                        month={month}
                        selectedDay={effectiveDay}
                        onSelectDay={(d) => setSelectedDay(d)}
                        dayCounts={dailyLeaveCounts}
                        dayTypeCounts={dailyApprovedLeaveTypeCounts}
                        holidays={holidays}
                        dayTypeAssignments={dayTypeAssignments}
                    />
                </div>
            )}

            {/* 승인/대기 탭 */}
            <div className="cl-right-tabs">
                <button className={`cl-right-tab ${rightTab === 'approved' ? 'active' : ''}`}
                    onClick={() => selectRightTab('approved')}>
                    {dateModeLabel} 휴무자({approvedList.length})
                </button>
                <button className={`cl-right-tab ${rightTab === 'pending' ? 'active' : ''}`}
                    onClick={() => selectRightTab('pending')}>
                    승인대기({pendingList.length})
                </button>
            </div>

            {/* 내용 */}
            <div className="cl-right-body">
                <div className="cl-right-panels" style={slideTrackStyle}>
                    {renderListPanel(approvedList, 'approved')}
                    {renderListPanel(pendingList, 'pending')}
                </div>
            </div>
        </div>
    );
}
