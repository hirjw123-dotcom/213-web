import { battalionSchedulesController } from '../../@controllers/battalionSchedulesController.js';
import { useMemo } from 'preact/hooks';
import PreventUpdate from '../../@components/PreventUpdate.jsx';
import { findDutySoldiers } from '../../@modules/dutyData.js';
import { getDayOfWeek } from '../@modules/utils.js';

function ScheduleDayTooltipContent({
    tooltipDay,
    filteredSoldiers,
    soldiers,
    schedules,
    scheduleTypes,
    year,
    month,
    weeklySchedules,
    dailySchedules,
    holidays,
    dutyReplacements,
    tooltipExcludedSoldiers,
}) {
    const daySummary = {};
    const trackedLabels = ['주', '평', '야주', '야평', '주주', '주평', '훈', '출', '박', '휴'];
    for (const label of trackedLabels) {
        const dutySoldiers = findDutySoldiers(filteredSoldiers, schedules, tooltipDay, [label], dutyReplacements, soldiers);
        if (dutySoldiers.length > 0) {
            daySummary[label] = dutySoldiers;
        }
    }

    const dutyLabels = ['주', '평', '야주', '야평', '주주', '주평', '훈'];
    const leaveLabels = ['출', '박', '휴'];

    const dutyEntries = dutyLabels.filter((label) => daySummary[label]);
    const leaveEntries = leaveLabels.filter((label) => daySummary[label]);

    const leaveSet = new Set();
    for (const label of leaveLabels) {
        if (daySummary[label]) {
            for (const soldier of daySummary[label]) leaveSet.add(soldier.id);
        }
    }
    const currentLeaveCount = leaveSet.size;
    const maxLeaveCount = Math.floor(filteredSoldiers.length * 0.35);

    const date = new Date(year, month - 1, tooltipDay);
    const { year: weekYear, weekNum } = battalionSchedulesController.utils.getWeekNumber(date);
    const weekKey = battalionSchedulesController.utils.getWeekKey(weekYear, weekNum);
    const weeklyText = weeklySchedules[weekKey]?.text || '';

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(tooltipDay).padStart(2, '0')}`;
    const dailyText = dailySchedules[dateKey]?.text || '';

    const isHoliday = holidays[dateKey] || false;
    const dow = getDayOfWeek(year, month, tooltipDay);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const renderSoldierList = (soldierList) => (
        <div style={{ color: '#555', fontSize: 11, flexWrap: 'wrap', gap: 2, marginTop: 2 }} className="f row">
            {soldierList.map((soldier) => (
                <div key={soldier.id} style={{ borderRadius: 2, border: '1px solid #eee', padding: 2 }}>
                    {soldier.rank} {soldier.name}
                </div>
            ))}
        </div>
    );

    return (
        <>
            <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>
                    {month}/{tooltipDay} ({dayNames[dow]})
                    {(dow === 0 || dow === 6 || isHoliday) && <span style={{ color: '#e53935', marginLeft: 4, fontSize: 11 }}>휴일</span>}
                </div>

                {dutyEntries.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: '#e65100', marginBottom: 4, borderBottom: '1px solid #f0f0f0', paddingBottom: 2 }}>
                            📋 근무일정
                        </div>
                        {dutyEntries.map((label) => {
                            const scheduleType = scheduleTypes.find((type) => type.label === label);
                            const labelSoldiers = daySummary[label];
                            return (
                                <div key={label} style={{ marginBottom: 4 }}>
                                    <span style={{
                                        display: 'inline-block', padding: '1px 5px', borderRadius: 3,
                                        background: scheduleType?.bg || '#eee', color: scheduleType?.color || '#333',
                                        fontWeight: scheduleType?.bold ? 700 : 500, fontSize: 11, marginRight: 4,
                                    }}>
                                        {label}
                                    </span>
                                    <span style={{ color: '#1976d2', fontWeight: 600, fontSize: 11 }}>{labelSoldiers.length}명</span>
                                    {renderSoldierList(labelSoldiers)}
                                </div>
                            );
                        })}
                    </div>
                )}

                {leaveEntries.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: '#2e7d32', marginBottom: 4, borderBottom: '1px solid #f0f0f0', paddingBottom: 2 }}>
                            🚪 출타 일정 ({currentLeaveCount}/{maxLeaveCount})
                        </div>
                        {leaveEntries.map((label) => {
                            const scheduleType = scheduleTypes.find((type) => type.label === label);
                            const labelSoldiers = daySummary[label];
                            return (
                                <div key={label} style={{ marginBottom: 4 }}>
                                    <span style={{
                                        display: 'inline-block', padding: '1px 5px', borderRadius: 3,
                                        background: scheduleType?.bg || '#eee', color: scheduleType?.color || '#333',
                                        fontWeight: scheduleType?.bold ? 700 : 500, fontSize: 11, marginRight: 4,
                                    }}>
                                        {label}
                                    </span>
                                    <span style={{ color: '#1976d2', fontWeight: 600, fontSize: 11 }}>{labelSoldiers.length}명</span>
                                    {renderSoldierList(labelSoldiers)}
                                </div>
                            );
                        })}
                        {currentLeaveCount > maxLeaveCount && (
                            <div style={{ color: '#c62828', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                                ⚠ 최대 출타 인원 초과!
                            </div>
                        )}
                    </div>
                )}

                {tooltipExcludedSoldiers.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 11, color: '#c62828', marginBottom: 4, borderBottom: '1px solid #f0f0f0', paddingBottom: 2 }}>
                            🚫 열외자 ({tooltipExcludedSoldiers.length}명)
                        </div>
                        {tooltipExcludedSoldiers.map(({ soldier, reasons }) => (
                            <div key={soldier.id} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                                <span style={{ fontSize: 11, borderRadius: 2, border: '1px solid #eee', padding: 2 }}>
                                    {soldier.rank} {soldier.name}
                                </span>
                                {reasons.map((reason) => {
                                    const scheduleType = scheduleTypes.find((type) => type.label === reason);
                                    return (
                                        <span key={reason} style={{
                                            fontSize: 10, padding: '0 3px', borderRadius: 2,
                                            background: scheduleType?.bg || '#f5f5f5', color: scheduleType?.color || '#666',
                                        }}>{reason}</span>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ flex: 1, minWidth: 100, borderLeft: '1px solid #e0e0e0', paddingLeft: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, borderBottom: '1px solid #ddd', paddingBottom: 4 }}>
                    대대 일정
                </div>
                <div style={{ marginBottom: 6 }}>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#1565c0', marginBottom: 2 }}>주간 일정</div>
                    <div style={{ color: weeklyText ? '#333' : '#aaa', fontSize: 11, whiteSpace: 'pre-wrap' }}>
                        {weeklyText || '-'}
                    </div>
                </div>
                <div>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#2e7d32', marginBottom: 2 }}>일간 일정</div>
                    <div style={{ color: dailyText ? '#333' : '#aaa', fontSize: 11, whiteSpace: 'pre-wrap' }}>
                        {dailyText || '-'}
                    </div>
                </div>
            </div>
        </>
    );
}

export default function ScheduleDayTooltip({
    tooltipDay,
    tooltipPos,
    filteredSoldiers,
    soldiers,
    schedules,
    scheduleTypes,
    year,
    month,
    weeklySchedules,
    dailySchedules,
    holidays,
    dutyReplacements,
    tooltipExcludedSoldiers,
}) {
    return null;
    if (tooltipDay === null) return null;

    const contentUpdateKey = useMemo(() => ({
        tooltipDay,
        filteredSoldiers,
        soldiers,
        schedules,
        scheduleTypes,
        year,
        month,
        weeklySchedules,
        dailySchedules,
        holidays,
        dutyReplacements,
        tooltipExcludedSoldiers,
    }), [
        tooltipDay,
        filteredSoldiers,
        soldiers,
        schedules,
        scheduleTypes,
        year,
        month,
        weeklySchedules,
        dailySchedules,
        holidays,
        dutyReplacements,
        tooltipExcludedSoldiers,
    ]);

    let tx = tooltipPos.x + 14;
    let ty = tooltipPos.y + 14;
    if (tx + 420 > window.innerWidth) tx = tooltipPos.x - 420;
    if (ty + 350 > window.innerHeight) ty = tooltipPos.y - 350;
    if (tx < 4) tx = 4;
    if (ty < 4) ty = 4;

    return (
        <div style={{
            position: 'fixed', left: tx, top: ty,
            pointerEvents: 'none', zIndex: 9999,
            background: '#fff', border: '1px solid #bbb',
            borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            padding: '10px 14px', fontSize: 12, lineHeight: 1.5,
            display: 'flex', gap: 16, minWidth: 260, maxWidth: 540,
        }}>
            <PreventUpdate updateKey={contentUpdateKey}>
                <ScheduleDayTooltipContent
                    tooltipDay={tooltipDay}
                    filteredSoldiers={filteredSoldiers}
                    soldiers={soldiers}
                    schedules={schedules}
                    scheduleTypes={scheduleTypes}
                    year={year}
                    month={month}
                    weeklySchedules={weeklySchedules}
                    dailySchedules={dailySchedules}
                    holidays={holidays}
                    dutyReplacements={dutyReplacements}
                    tooltipExcludedSoldiers={tooltipExcludedSoldiers}
                />
            </PreventUpdate>
        </div>
    );
}
