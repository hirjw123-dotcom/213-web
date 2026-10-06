import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import StatusSectionHeader from './@components/StatusSectionHeader';
import StatusDutyCard from './@components/StatusDutyCard';
import StatusBulchimCard from './@components/StatusBulchimCard';
import StatusUnitSoldierCard from './@components/StatusUnitSoldierCard';
import MiniDateCalendar from './@components/MiniDateCalendar';
import MonthlyDutyCalendar from './@components/MonthlyDutyCalendar';
import { UNITS } from '../@modules/configs';
import { plugins } from '../@modules/plugins';
import { combatLeaveController } from '../@controllers/combatLeaveController';
import { dutyReplacementController, getDisplayScheduleLabelsForSoldierDay } from '../@controllers/dutyReplacementController';
import { scheduleTypesController } from '../@controllers/soldierScheduleTypesController';
import useStatusPanelData from './@hooks/useStatusPanelData';

const TIME_FILTER_OPTIONS = [
    { key: 'morningOnly', label: <>오전 <font style={{ color: '#777' }}>가용인원</font></> },
    { key: 'afternoonOnly', label: <>오후 <font style={{ color: '#777' }}>가용인원</font></> },
    { key: 'morningToAfternoon', label: <>오전~오후 <font style={{ color: '#777' }}>가용인원</font></> },
    { key: 'nightOnly', label: <>야간 <font style={{ color: '#777' }}>가용인원</font></> },
    { key: 'morningToNight', label: <>오전~야간 <font style={{ color: '#777' }}>가용인원</font></> },
    { key: 'afternoonToNight', label: <>오후~야간 <font style={{ color: '#777' }}>가용인원</font></> },
];

const TIME_SLOT_RANGES = [
    { key: '오전', label: '오전', startHour: 8.5, endHour: 12, color: '#66BB6A' },
    { key: '오후', label: '오후', startHour: 12, endHour: 17, color: '#26A69A' },
    { key: '저녁일과', label: '야간', startHour: 17, endHour: 24, color: '#5C6BC0' },
];

const TIMELINE_MARKERS = [
    { hour: 0, label: '00:00' },
    { hour: 6.5, label: '06:30', eventLabel: '' },
    { hour: 8.5, label: '08:30', eventLabel: '아침' },
    { hour: 12, label: '12:00', eventLabel: '점심' },
    { hour: 17, label: '17:00', eventLabel: '저녁' },
    { hour: 24, label: '24:00' },
];

const formatHour = (hour) => {
    const wholeHour = Math.floor(hour);
    const minutes = Math.round((hour - wholeHour) * 60);
    return `${String(wholeHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const getTimelineLeft = (hour) => `${(hour / 24) * 100}%`;

const MANAGED_COMBAT_LEAVE_LABELS = new Set(['전휴', '반투']);
const buildReasonItem = (label, options = {}) => ({
    label,
    isPendingCombatLeave: !!options.isPendingCombatLeave,
});

const STATUS_PRINT_CSS = `
    @page {
        size: A4 portrait;
        margin: 8mm;
    }

    html,
    body {
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
        background: #fff !important;
    }

    .status-print-root {
        display: block !important;
        width: auto !important;
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        flex: none !important;
        color: #000 !important;
        background: #fff !important;
    }

    .status-print-root .home-date-nav,
    .status-print-root .status-overview {
        display: none !important;
    }

    .status-print-root .status-print-only {
        display: block !important;
    }

    .status-print-root .status-container {
        display: block !important;
        overflow: visible !important;
        padding: 0 !important;
    }

    .status-print-document-header {
        margin-bottom: 5mm;
        padding-bottom: 3mm;
        border-bottom: 2px solid #263238;
    }

    .status-print-document-title {
        margin-bottom: 1.5mm;
        font-size: 18px;
        font-weight: 800;
        text-align: center;
    }

    .status-print-document-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4mm;
        font-size: 11px;
        color: #444;
    }

    .status-print-document-date {
        font-size: 13px;
        font-weight: 700;
        color: #111;
    }

    .status-print-section-header {
        display: flex !important;
        align-items: baseline;
        gap: 2mm;
        margin: 0 0 2mm;
        padding-bottom: 1.2mm;
        border-bottom: 2px solid var(--print-section-color);
        break-after: avoid;
        page-break-after: avoid;
    }

    .status-print-section-header strong {
        color: var(--print-section-color);
        font-size: 13px;
    }

    .status-print-section-header span {
        font-size: 11px;
        font-weight: 600;
    }

    .status-print-root .status-unit-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 2mm !important;
        margin-bottom: 4mm !important;
    }

    .status-print-root .status-excluded-grid {
        display: grid !important;
    }

    .status-print-root .unit-soldier-card,
    .status-print-root .status-leave-grid > div {
        break-inside: avoid;
        page-break-inside: avoid;
    }

    .status-print-root .unit-soldier-list {
        max-height: none !important;
        overflow: visible !important;
    }

    .status-print-root .unit-soldier-header {
        padding: 1.2mm 2mm !important;
    }

    .status-print-root .unit-soldier-row {
        padding: 0.7mm 1.5mm !important;
    }

    .status-print-root .us-reasons {
        gap: 1mm !important;
        padding-left: 1mm !important;
    }

    .status-print-root .us-reason-chip {
        min-height: 14px !important;
        font-size: 8px !important;
    }

    .status-print-root .status-leave-grid {
        gap: 3mm !important;
        margin-top: 1mm;
    }

    .status-print-root button,
    .status-print-root input {
        display: none !important;
    }
`;

export default function StatusPanel() {
    const {
        date,
        soldiers,
        allSchedules,
        dutyData,
        availableByUnit,
        excludedByUnit,
        excludedReasons,
        leaveData,
        loading,
        availableCollapsed,
        excludedCollapsed,
        changeDate,
        goToday,
        setDateValue,
        setDateFromInput,
        dayOfWeek,
        isToday,
        totalAvailable,
        totalExcluded,
        unitListMaxHeight,
        selectedTimeFilter,
        selectedTimeSlots,
        setAvailableCollapsed,
        setExcludedCollapsed,
        setSelectedTimeFilter,
    } = useStatusPanelData();

    const printRef = useRef(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [dutyReplacements, setDutyReplacements] = useState({});
    const [combatLeaveData, setCombatLeaveData] = useState({});
    const [scheduleTypeByLabel, setScheduleTypeByLabel] = useState({});

    useEffect(() => {
        let cancelled = false;

        const loadCombatLeaveData = async () => {
            const nextCombatLeaveData = await combatLeaveController.getAll(date.y, date.m);
            if (!cancelled) {
                setCombatLeaveData(nextCombatLeaveData || {});
            }
        };

        loadCombatLeaveData();

        return () => {
            cancelled = true;
        };
    }, [date.m, date.y]);

    useEffect(() => {
        let cancelled = false;

        const loadDutyReplacements = async () => {
            const replacements = await dutyReplacementController.get(date.y, date.m, { monthSchedules: allSchedules });
            if (!cancelled) {
                setDutyReplacements(replacements);
            }
        };

        loadDutyReplacements();

        return () => {
            cancelled = true;
        };
    }, [allSchedules, date.y, date.m]);

    useEffect(() => {
        let cancelled = false;

        const loadScheduleTypes = async () => {
            const scheduleTypes = await scheduleTypesController.get();
            if (!cancelled) {
                setScheduleTypeByLabel(Object.fromEntries(scheduleTypes.map((type) => [type.label, type])));
            }
        };

        loadScheduleTypes();

        return () => {
            cancelled = true;
        };
    }, []);

    const getHomeDisplayLabels = useMemo(() => {
        return (soldierId) => {
            const labels = getDisplayScheduleLabelsForSoldierDay(allSchedules, dutyReplacements, soldierId, date.d);
            const combatLeaveEntry = combatLeaveData?.[soldierId]?.[date.d];

            if (!combatLeaveEntry?.type || labels.includes(combatLeaveEntry.type)) {
                return labels;
            }

            if (!MANAGED_COMBAT_LEAVE_LABELS.has(combatLeaveEntry.type)) {
                return labels;
            }

            return [combatLeaveEntry.type, ...labels];
        };
    }, [allSchedules, combatLeaveData, date.d, dutyReplacements]);

    const getHomeDisplayReasonItems = useMemo(() => {
        return (soldierId) => {
            const labels = getHomeDisplayLabels(soldierId);
            const combatLeaveEntry = combatLeaveData?.[soldierId]?.[date.d];

            return labels.map((label) => buildReasonItem(label, {
                isPendingCombatLeave:
                    MANAGED_COMBAT_LEAVE_LABELS.has(label)
                    && combatLeaveEntry?.type === label
                    && combatLeaveEntry?.status === 'pending',
            }));
        };
    }, [combatLeaveData, date.d, getHomeDisplayLabels]);

    const handlePrint = () => {
        if (printRef.current) {
            plugins.print(printRef.current, {
                landscape: false,
                extraPrintCss: STATUS_PRINT_CSS,
            });
        }
    };

    const calendarButtonStyle = {
        position: 'absolute',
        left: 12,
        display: 'flex',
        flexDirection: 'column',
        width: 118,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
        border: '1px solid #c9d3df',
        borderRadius: 0,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
        cursor: 'pointer',
    };

    const dateValue = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    const selectedTimelineSegments = useMemo(() => {
        return TIME_SLOT_RANGES.filter((slot) => selectedTimeSlots.includes(slot.key));
    }, [selectedTimeSlots]);

    const selectedAvailabilityLabel = useMemo(() => {
        if (selectedTimelineSegments.length === 0) return '-';

        const startHour = selectedTimelineSegments[0].startHour;
        const endHour = selectedTimelineSegments[selectedTimelineSegments.length - 1].endHour;
        return `${formatHour(startHour)}~${formatHour(endHour)}`;
    }, [selectedTimelineSegments]);

    const availableReasons = useMemo(() => {
        return Object.values(availableByUnit).flat().reduce((acc, soldier) => {
            const reasonItems = getHomeDisplayReasonItems(soldier.id);
            if (reasonItems.length > 0) {
                acc[soldier.id] = reasonItems;
            }
            return acc;
        }, {});
    }, [availableByUnit, getHomeDisplayReasonItems]);

    const excludedDisplayReasons = useMemo(() => {
        return Object.values(excludedByUnit).flat().reduce((acc, soldier) => {
            const todayReasonItems = getHomeDisplayReasonItems(soldier.id);
            const todayLabels = todayReasonItems.map((item) => item.label);
            const extraExcludedReasonItems = (excludedReasons[soldier.id] || []).filter((label) => {
                if (todayLabels.includes(label)) return false;
                return label === '근취';
            }).map((label) => buildReasonItem(label));
            const displayReasonItems = [...extraExcludedReasonItems, ...todayReasonItems];

            if (displayReasonItems.length > 0) {
                acc[soldier.id] = displayReasonItems;
            }

            return acc;
        }, {});
    }, [excludedByUnit, excludedReasons, getHomeDisplayReasonItems]);

    const timeSlotSelector = (
        <div className="f row aCenter" style={{ gap: 8, flexWrap: 'wrap' }}>
            {TIME_FILTER_OPTIONS.map((option) => (
                <label key={option.key} className="f row aCenter" style={{ gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input
                        type="radio"
                        name="available-time-filter"
                        checked={selectedTimeFilter === option.key}
                        onChange={() => setSelectedTimeFilter(option.key)}
                    />
                    <span>{option.label}</span>
                </label>
            ))}
        </div>
    );

    const timeSlotTimeline = (
        <div className="status-time-range-card">
            <div className="status-time-range-header">
                <div>
                    <strong>가용 시간대</strong>
                    <span className="status-time-range-summary">{selectedAvailabilityLabel}</span>
                </div>
                <div className="status-time-range-chips">
                    {selectedTimelineSegments.map((segment) => (
                        <span key={segment.key} className="status-time-range-chip" style={{ '--slot-color': segment.color }}>
                            {segment.label}
                        </span>
                    ))}
                </div>
            </div>
            <div className="status-time-range-track">
                <div className="status-time-range-base" />
                {selectedTimelineSegments.map((segment) => (
                    <div
                        key={segment.key}
                        className="status-time-range-fill"
                        style={{
                            left: getTimelineLeft(segment.startHour),
                            width: `${((segment.endHour - segment.startHour) / 24) * 100}%`,
                            '--slot-color': segment.color,
                        }}
                    />
                ))}
                {TIME_SLOT_RANGES.map((segment) => (
                    <span
                        key={segment.key}
                        className="status-time-range-slot-label"
                        style={{
                            left: getTimelineLeft((segment.startHour + segment.endHour) / 2),
                        }}
                    >
                        {segment.label}
                    </span>
                ))}
                {TIMELINE_MARKERS.map((marker) => (
                    <div
                        key={marker.hour}
                        className={`status-time-range-marker${marker.eventLabel ? ' is-event' : ''}`}
                        style={{ left: getTimelineLeft(marker.hour) }}
                    >
                        {marker.eventLabel && <span className="status-time-range-event">{marker.eventLabel}</span>}
                        <span className="status-time-range-time">{marker.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    return (<>
        <div className="home-center f status-print-root" ref={printRef}>
            {/* 날짜 네비게이션 */}
            <div className="home-date-nav f row aCenter jCenter" style={{ position: 'relative', height: 60, }}>
                <button
                    onClick={() => setShowCalendar(true)}
                    style={calendarButtonStyle}
                    title="월간 근무 달력"
                >
                    근무달력 보기
                </button>

                {/* <button onClick={() => changeDate(-1)} className="date-nav-btn">◀</button>
                <div className="date-display f row aCenter jCenter pointer" onClick={goToday}
                    style={{ width: 200 }}>
                    <span className="date-text">
                        {date.y}/{date.m}/{date.d} ({dayOfWeek})
                    </span>
                    {isToday && <span className="today-badge">오늘</span>}
                </div>
                <input
                    type="date"
                    className="date-picker-input"
                    value={dateValue}
                    onInput={(e) => setDateFromInput(e.currentTarget.value)}
                    title="날짜 선택"
                    aria-label="날짜 선택"
                />
                <button onClick={() => changeDate(1)} className="date-nav-btn">▶</button> */}
                <button onClick={handlePrint} style={{ position: 'absolute', right: 12, fontSize: 12, padding: '4px 10px' }}
                    title="인원 현황 프린트">🖨 프린트</button>
            </div>

            {loading ? (
                <div className="f ajCenter" style={{ padding: 40 }}>
                    <div className="spinner" />
                </div>
            ) : (
                <div className="status-container f1" style={{ overflow: 'auto', padding: '12px 16px' }}>

                    <div className="status-print-only status-print-document-header" style={{ display: 'none' }}>
                        <div className="status-print-document-title">가용인원 현황</div>
                        <div className="status-print-document-meta">
                            <span className="status-print-document-date">
                                {date.y}년 {date.m}월 {date.d}일 ({dayOfWeek})
                            </span>
                            <span>가용 기준 {selectedAvailabilityLabel}</span>
                        </div>
                    </div>

                    <div className="status-overview">
                        <div className="status-overview__left">
                            {/* 1행: 당직, CCTV, 불침번 */}
                            <div className="status-row1__cards">
                                <StatusDutyCard title="당직" color="#FF6B35" sections={[
                                    { label: '주간', list: dutyData.dangzik.day },
                                    { label: '야간', list: dutyData.dangzik.night },
                                ]} />
                                <StatusDutyCard title="CCTV" color="#1976D2" sections={[
                                    { label: '주간', list: dutyData.cctv.day },
                                    { label: '야간', list: dutyData.cctv.night },
                                ]} />
                                <StatusBulchimCard bulchim={dutyData.bulchim} />
                            </div>
                            <div className='f1' />
                            {/* 2행 상단 요약: 가용인원 */}
                            <div className="status-overview__availability">
                                <StatusSectionHeader
                                    title="가용인원"
                                    count={totalAvailable}
                                    total={soldiers.length}
                                    color="#2E7D32"
                                    extraContent={availableCollapsed ? null : timeSlotSelector}
                                    collapsible
                                    collapsed={availableCollapsed}
                                    onToggle={() => setAvailableCollapsed(v => !v)}
                                />
                                {!availableCollapsed && timeSlotTimeline}
                            </div>
                        </div>

                        <MiniDateCalendar selectedDate={date} onSelectDate={setDateValue} onToday={goToday} />
                    </div>

                    <div
                        className="status-print-only status-print-section-header"
                        style={{ display: 'none', '--print-section-color': '#2E7D32' }}
                    >
                        <strong>가용인원</strong>
                        <span>{totalAvailable}명 / {soldiers.length}명</span>
                    </div>

                    <div className="status-unit-grid">
                        {UNITS.map(unit => (
                            <StatusUnitSoldierCard
                                key={unit.id}
                                unitName={unit.name}
                                unitBg={unit.bg}
                                soldiers={availableByUnit[unit.id] || []}
                                total={(availableByUnit[unit.id]?.length || 0) + (excludedByUnit[unit.id]?.length || 0)}
                                reasons={availableReasons}
                                scheduleTypeByLabel={scheduleTypeByLabel}
                                listMaxHeight={unitListMaxHeight}
                            />
                        ))}
                    </div>

                    {/* 3행: 열외인원 */}
                    <StatusSectionHeader
                        title="열외인원"
                        count={totalExcluded}
                        total={soldiers.length}
                        color="#C62828"
                        collapsed={excludedCollapsed}
                        onToggle={() => setExcludedCollapsed(v => !v)}
                    />
                    <div
                        className="status-unit-grid status-excluded-grid"
                        style={{ display: excludedCollapsed ? 'none' : undefined }}
                    >
                        {UNITS.map(unit => (
                            <StatusUnitSoldierCard
                                key={unit.id}
                                unitName={unit.name}
                                unitBg={unit.bg}
                                soldiers={excludedByUnit[unit.id] || []}
                                total={(availableByUnit[unit.id]?.length || 0) + (excludedByUnit[unit.id]?.length || 0)}
                                reasons={excludedDisplayReasons}
                                scheduleTypeByLabel={scheduleTypeByLabel}
                                listMaxHeight={unitListMaxHeight}
                            />
                        ))}
                    </div>

                    {/* 4행: 휴가자 / 오늘 복귀자 (가로 배열) */}
                    <div className="status-leave-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                            <StatusSectionHeader title="휴가자" count={leaveData.onLeave.length} total={soldiers.length} color="#E65100" />
                            {leaveData.onLeave.length > 0 ? (
                                <div style={{ border: '1px solid var(--c6)', background: 'var(--c9)' }}>
                                    {leaveData.onLeave.map((item, i) => (
                                        <div key={item.soldier.id} className="f row aCenter" style={{
                                            padding: '4px 8px', borderBottom: i < leaveData.onLeave.length - 1 ? '1px solid var(--c7)' : 'none',
                                            fontSize: 12, gap: 4,
                                        }}>
                                            <span style={{ width: 16, color: 'var(--c5)', fontSize: 11, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                                            <span style={{ color: 'var(--c4)', fontSize: 11, flexShrink: 0 }}>{item.soldier.rank}</span>
                                            <span style={{ fontWeight: 500 }}>{item.soldier.name}</span>
                                            <span style={{ color: 'var(--c4)', fontSize: 10, marginLeft: 'auto', flexShrink: 0 }}>
                                                {item.start}~{item.end} ({item.days}일)
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: 12, color: 'var(--c5)', padding: '4px 0' }}>없음</div>
                            )}
                        </div>
                        <div>
                            <StatusSectionHeader title="오늘 휴가 복귀자" count={leaveData.returning.length} total={leaveData.onLeave.length} color="#1565C0" />
                            {leaveData.returning.length > 0 ? (
                                <div style={{ border: '1px solid var(--c6)', background: 'var(--c9)' }}>
                                    {leaveData.returning.map((s, i) => (
                                        <div key={s.id} className="f row aCenter" style={{
                                            padding: '4px 8px', borderBottom: i < leaveData.returning.length - 1 ? '1px solid var(--c7)' : 'none',
                                            fontSize: 12, gap: 4,
                                        }}>
                                            <span style={{ width: 16, color: 'var(--c5)', fontSize: 11, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                                            <span style={{ color: 'var(--c4)', fontSize: 11, flexShrink: 0 }}>{s.rank}</span>
                                            <span style={{ fontWeight: 500 }}>{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ fontSize: 12, color: 'var(--c5)', padding: '4px 0' }}>없음</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {showCalendar && (
            <MonthlyDutyCalendar
                year={date.y}
                month={date.m}
                onClose={() => setShowCalendar(false)}
            />
        )}
    </>);
}
