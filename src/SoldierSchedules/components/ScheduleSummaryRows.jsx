import React from "preact/compat";
import { getDutyCountTotalsForLabels } from '../../@controllers/dutyReplacementController.js';

const ORANGE_BG = '#ff9800';
const GREEN_BG = '#4caf50';
const DANGER_BG = '#f44336';
const STICKY_ROW_HEIGHT = 24;

const getTypeStyle = (scheduleTypeByLabel, label) => {
    const type = scheduleTypeByLabel[label];
    if (!type) return null;
    return {
        background: type.bg,
        color: type.color,
        fontWeight: type.bold ? 'bold' : 'normal',
        '-webkit-text-stroke': type.bold ? `0.5px ${type.color}` : 'none',
    };
};

const getCountByLabel = (filteredSoldiers, schedules, day, label) => {
    let count = 0;
    for (const soldier of filteredSoldiers) {
        const cellLabels = schedules[soldier.id]?.[day] || [];
        if (cellLabels.includes(label)) count += 1;
    }
    return count;
};

const getDutySummaryCountByLabel = (filteredSoldiers, schedules, day, label) => {
    let count = 0;
    for (const soldier of filteredSoldiers) {
        const cellLabels = schedules[soldier.id]?.[day] || [];
        const dutyCounts = getDutyCountTotalsForLabels(cellLabels);
        count += dutyCounts[label] || 0;
    }
    return count;
};

const getCountByLabels = (filteredSoldiers, schedules, day, labels) => {
    const labelSet = new Set(labels);
    let count = 0;
    for (const soldier of filteredSoldiers) {
        const cellLabels = schedules[soldier.id]?.[day] || [];
        if (cellLabels.some((label) => labelSet.has(label))) count += 1;
    }
    return count;
};

const hasDayTypeLabel = (dayTypeAssignments, day, targetLabel) => {
    const dayTypes = dayTypeAssignments[day] || [];
    return dayTypes.includes(targetLabel);
};

const isExitDateAfterOrSame = (soldier, year, month, day) => {
    if (!Array.isArray(soldier.exitDate) || soldier.exitDate.length < 3) return true;
    const [exitYear, exitMonth, exitDay] = soldier.exitDate;
    const exitDate = new Date(exitYear, exitMonth - 1, exitDay);
    const targetDate = new Date(year, month - 1, day);
    return exitDate > targetDate;
};

const getAliveSoldierCount = (filteredSoldiers, year, month, day) => {
    return filteredSoldiers.filter((soldier) => isExitDateAfterOrSame(soldier, year, month, day)).length;
};

const DUTY_LABELS = ['평', '주', '불', '훈', '동반'];

const SummaryRow = ({
    label,
    labelCount,
    days,
    renderDayCell,
    className = '',
    style = {},
    showDutyCount,
    showPayGrade,
    stickyBottom = null,
    isFirstSticky = false,
    showStickyToggle = false,
    stickyChecked = false,
    onToggleSticky,
}) => {
    const stickyStyle = stickyBottom === null ? null : {
        position: 'sticky',
        bottom: stickyBottom,
        zIndex: 12,
        backgroundClip: 'padding-box',
    };
    const labelText = typeof labelCount === 'number' ? `${label}(${labelCount})` : label;
    return (
        <tr className={`summary-row ${className}${stickyBottom !== null ? ' summary-row-sticky' : ''}${isFirstSticky ? ' summary-row-sticky-first' : ''}`.trim()}>
            <td className="sticky-cell summary-label" colSpan={showPayGrade ? 3 : 2} style={{ ...style, minWidth: showPayGrade ? 172 : 130, ...(stickyStyle ? { ...stickyStyle, zIndex: 14 } : {}) }}>
                {showStickyToggle ? (
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, width: '100%', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={stickyChecked}
                            onChange={() => onToggleSticky?.(label)}
                            style={{ margin: 0, flexShrink: 0 }}
                        />
                        <span>{labelText}</span>
                    </label>
                ) : labelText}
            </td>
            {days.map((day, index) => renderDayCell(day, index, days.length))}
            <td className="col-cat" style={stickyStyle || {}} />
            {showDutyCount && DUTY_LABELS.map((l) => (
                <td key={`sc-${l}`} className="col-duty-count" style={{ background: '#f5f5f5', ...(stickyStyle || {}) }} />
            ))}
            {showDutyCount && ['평', '주', '불'].map((l) => (
                <td key={`st-${l}`} className="col-duty-target" style={{ background: '#f5f5f5', ...(stickyStyle || {}) }} />
            ))}
            {showDutyCount && ['평', '주', '불'].map((l) => (
                <td key={`sf-${l}`} className="col-duty-target" style={{ background: '#f5f5f5', ...(stickyStyle || {}) }} />
            ))}
            {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5', ...(stickyStyle || {}) }} />}
            {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5', ...(stickyStyle || {}) }} />}
            <td className="col-duty-toggle" style={stickyStyle || {}} />
        </tr>
    );
};

export default function ScheduleSummaryRows({
    days,
    year,
    month,
    filteredSoldiers,
    schedules,
    dayTypeAssignments,
    scheduleTypeByLabel,
    showDutyCount,
    showPayGrade,
    dutySummaryTotals,
    onDayHover,
    isSunday,
}) {
    const [stickyLabels, setStickyLabels] = React.useState([]);

    const styleByLabel = {
        평: getTypeStyle(scheduleTypeByLabel, '평'),
        주: getTypeStyle(scheduleTypeByLabel, '주'),
        불: getTypeStyle(scheduleTypeByLabel, '불'),
        훈: getTypeStyle(scheduleTypeByLabel, '훈'),
        동반: getTypeStyle(scheduleTypeByLabel, '동반'),
        휴: getTypeStyle(scheduleTypeByLabel, '휴'),
    };

    const whiteBase = { background: '#fff', color: '#000' };
    const orangeBase = { background: ORANGE_BG, color: '#000' };
    const greenBase = { background: GREEN_BG, color: '#000' };
    const stickyLabelOrder = DUTY_LABELS.filter((label) => stickyLabels.includes(label));
    const stickyBottomByLabel = stickyLabelOrder.reduce((acc, label, index) => {
        acc[label] = (stickyLabelOrder.length - index - 1) * STICKY_ROW_HEIGHT;
        return acc;
    }, {});
    const firstStickyLabel = stickyLabelOrder[0] || null;
    const toggleStickyLabel = (label) => {
        setStickyLabels((prev) => prev.includes(label)
            ? prev.filter((item) => item !== label)
            : [...prev, label]);
    };
    const withSticky = (style, bottom) => (bottom === null ? style : {
        ...style,
        position: 'sticky',
        bottom,
        zIndex: 12,
        backgroundClip: 'padding-box',
    });
    const applicableDayCounts = React.useMemo(() => {
        const counts = { 평: 0, 주: 0, 훈: 0 };

        for (const day of days) {
            const hasWeekendDuty = hasDayTypeLabel(dayTypeAssignments, day, '주말 근무');
            const hasTrainingDuty = hasDayTypeLabel(dayTypeAssignments, day, '훈련 근무');

            if (!hasWeekendDuty && !hasTrainingDuty) counts.평 += 1;
            if (hasWeekendDuty) counts.주 += 1;
            if (hasTrainingDuty) counts.훈 += 1;
        }

        return counts;
    }, [dayTypeAssignments, days]);

    const buildSummaryCellClass = (day, index, total, emphasized = false) => {
        let cls = 'summary-cell';
        if (isSunday?.(day)) cls += ' sunday-col';
        if (emphasized) cls += ' summary-emphasis-cell';
        if (index === 0) cls += ' summary-start-cell';
        if (index === total - 1) cls += ' summary-end-cell';
        return cls;
    };

    const getRequiredDutyBorderStyle = (isActive, value, requiredCount) => {
        if (!isActive) return {};
        return value !== requiredCount ? { borderBottom: '3px solid red' } : {};
    };

    return (
        <>
            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                stickyBottom={stickyBottomByLabel.평 ?? null}
                isFirstSticky={firstStickyLabel === '평'}
                showStickyToggle
                stickyChecked={stickyLabels.includes('평')}
                onToggleSticky={toggleStickyLabel}
                label="평"
                labelCount={applicableDayCounts.평}
                days={days}
                renderDayCell={(day, index, total) => {
                    const value = getDutySummaryCountByLabel(filteredSoldiers, schedules, day, '평');
                    const hasWeekendDuty = hasDayTypeLabel(dayTypeAssignments, day, '주말 근무');
                    const hasTrainingDuty = hasDayTypeLabel(dayTypeAssignments, day, '훈련 근무');
                    const useTypeStyle = !hasWeekendDuty && !hasTrainingDuty;
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total)}
                            style={withSticky({
                                ...(useTypeStyle ? (styleByLabel.평 || whiteBase) : {
                                    ...whiteBase,
                                    ...(value == 0 ? { fontWeight: 'normal', color: '#ccc' } : { color: '#000' }),
                                }),
                                ...getRequiredDutyBorderStyle(useTypeStyle, value, 4),
                            }, stickyBottomByLabel.평 ?? null)}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                stickyBottom={stickyBottomByLabel.주 ?? null}
                isFirstSticky={firstStickyLabel === '주'}
                showStickyToggle
                stickyChecked={stickyLabels.includes('주')}
                onToggleSticky={toggleStickyLabel}
                label="주"
                labelCount={applicableDayCounts.주}
                days={days}
                renderDayCell={(day, index, total) => {
                    const value = getDutySummaryCountByLabel(filteredSoldiers, schedules, day, '주');
                    const hasWeekendDuty = hasDayTypeLabel(dayTypeAssignments, day, '주말 근무');
                    const useTypeStyle = hasWeekendDuty;
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total)}
                            style={withSticky({
                                ...(useTypeStyle ? (styleByLabel.주 || whiteBase) : {
                                    ...whiteBase,
                                    ...(value == 0 ? { fontWeight: 'normal', color: '#ccc' } : { color: '#000' }),
                                }),
                                ...getRequiredDutyBorderStyle(useTypeStyle, value, 4),
                            }, stickyBottomByLabel.주 ?? null)}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                stickyBottom={stickyBottomByLabel.불 ?? null}
                isFirstSticky={firstStickyLabel === '불'}
                showStickyToggle
                stickyChecked={stickyLabels.includes('불')}
                onToggleSticky={toggleStickyLabel}
                label="불"
                days={days}
                renderDayCell={(day, index, total) => {
                    const value = getDutySummaryCountByLabel(filteredSoldiers, schedules, day, '불');
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total)}
                            style={withSticky({
                                ...(styleByLabel.불 || {
                                    ...whiteBase,
                                }),
                                borderBottom: value !== 5 ? '3px solid red' : undefined,
                            }, stickyBottomByLabel.불 ?? null)}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                stickyBottom={stickyBottomByLabel.훈 ?? null}
                isFirstSticky={firstStickyLabel === '훈'}
                showStickyToggle
                stickyChecked={stickyLabels.includes('훈')}
                onToggleSticky={toggleStickyLabel}
                label="훈"
                labelCount={applicableDayCounts.훈}
                days={days}
                renderDayCell={(day, index, total) => {
                    const value = getDutySummaryCountByLabel(filteredSoldiers, schedules, day, '훈');
                    const hasTrainingDuty = hasDayTypeLabel(dayTypeAssignments, day, '훈련 근무');
                    const useTypeStyle = hasTrainingDuty;
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total)}
                            style={withSticky({
                                ...(useTypeStyle ? (styleByLabel.훈 || whiteBase) : {
                                    ...whiteBase,
                                    ...(value == 0 ? { fontWeight: 'normal', color: '#ccc' } : { color: '#000' }),
                                }),
                                ...getRequiredDutyBorderStyle(useTypeStyle, value, 4),
                            }, stickyBottomByLabel.훈 ?? null)}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                stickyBottom={stickyBottomByLabel.동반 ?? null}
                isFirstSticky={firstStickyLabel === '동반'}
                showStickyToggle
                stickyChecked={stickyLabels.includes('동반')}
                onToggleSticky={toggleStickyLabel}
                label="동반"
                days={days}
                renderDayCell={(day, index, total) => {
                    const value = getDutySummaryCountByLabel(filteredSoldiers, schedules, day, '동반');
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total)}
                            style={{
                                ...withSticky(
                                    styleByLabel.동반 || {
                                        ...whiteBase,
                                        ...(value == 0 ? { fontWeight: 'normal', color: '#ccc' } : { color: '#000' }),
                                    },
                                    stickyBottomByLabel.동반 ?? null,
                                ),
                                ...(value == 0 ? {
                                    color: '#ccc',
                                } : {
                                    fontWeight: 'bold',
                                })
                            }}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                style={{ background: '#aaa' }}
                label="출타 가능 수(35%)"
                days={days}
                renderDayCell={(day, index, total) => {
                    const aliveCount = getAliveSoldierCount(filteredSoldiers, year, month, day);
                    const value = Math.floor(aliveCount * 0.35);
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total, true)}
                            style={orangeBase}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                label="현재 출타 수"
                days={days}
                renderDayCell={(day, index, total) => {
                    const capacity = Math.floor(getAliveSoldierCount(filteredSoldiers, year, month, day) * 0.35);
                    const value = Math.floor(getCountByLabels(filteredSoldiers, schedules, day, ['출', '박', '휴', '평출']));
                    const style = value > capacity ? { ...orangeBase, background: DANGER_BG } : orangeBase;
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total, true)}
                            style={style}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                label="현재 외출외박 수"
                days={days}
                renderDayCell={(day, index, total) => {
                    const value = Math.floor(getCountByLabels(filteredSoldiers, schedules, day, ['출', '박', '평출']));
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total, true)}
                            style={greenBase}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                style={{ background: '#aaa' }}
                label="휴가 가능 수(20%)"
                days={days}
                renderDayCell={(day, index, total) => {
                    const aliveCount = getAliveSoldierCount(filteredSoldiers, year, month, day);
                    const value = Math.floor(aliveCount * 0.2);
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total, true)}
                            style={styleByLabel.휴 || whiteBase}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />

            <SummaryRow
                showDutyCount={showDutyCount}
                showPayGrade={showPayGrade}
                label="현재 휴가 수"
                days={days}
                renderDayCell={(day, index, total) => {
                    const capacity = Math.floor(getAliveSoldierCount(filteredSoldiers, year, month, day) * 0.2);
                    const value = Math.floor(getCountByLabel(filteredSoldiers, schedules, day, '휴'));
                    const baseStyle = styleByLabel.휴 || whiteBase;
                    const style = value > capacity ? { ...baseStyle, background: DANGER_BG, color: '#000' } : baseStyle;
                    return (
                        <td
                            key={day}
                            data-day={day}
                            className={buildSummaryCellClass(day, index, total, true)}
                            style={style}
                            onMouseEnter={() => onDayHover?.(day)}
                        >
                            {value}
                        </td>
                    );
                }}
            />


            {[
                { label: '반투', type: '반투', styleType: '주' },
                { label: '전휴', type: '전휴', styleType: '주' },
            ].map((item, idx) => {
                return (<React.Fragment key={idx}>
                    <SummaryRow
                        showDutyCount={showDutyCount}
                        showPayGrade={showPayGrade}
                        label={item.label}
                        days={days}
                        renderDayCell={(day, index, total) => {
                            const value = getCountByLabel(filteredSoldiers, schedules, day, item.type);
                            const hasWeekendDuty = hasDayTypeLabel(dayTypeAssignments, day, '주말 근무');
                            const dayOfWeek = new Date(year, month - 1, day).getDay();
                            const isSaturday = dayOfWeek === 6;
                            const isSunday = dayOfWeek === 0;

                            const useTypeStyle = hasWeekendDuty || isSaturday || isSunday;
                            return (
                                <td
                                    key={day}
                                    data-day={day}
                                    className={buildSummaryCellClass(day, index, total)}
                                    style={useTypeStyle ? (styleByLabel[item.styleType] || whiteBase) : {
                                        ...whiteBase,
                                    }}
                                    onMouseEnter={() => onDayHover?.(day)}
                                >
                                    {value}
                                </td>
                            );
                        }}
                    />
                </React.Fragment>);
            })}

            <tr className="summary-row">
                <td className="sticky-cell summary-label" colSpan={showPayGrade ? 3 : 2} style={{ background: '#f5f5f5', fontWeight: 700, minWidth: showPayGrade ? 172 : 130 }}>합계</td>
                {days.map((day, index) => (
                    <td
                        key={`summary-total-${day}`}
                        data-day={day}
                        className={buildSummaryCellClass(day, index, days.length)}
                        style={{ background: '#f5f5f5', color: '#999' }}
                    >
                        -
                    </td>
                ))}
                <td className="col-cat" style={{ background: '#f5f5f5' }} />
                {showDutyCount && DUTY_LABELS.map((label) => (
                    <td key={`sum-duty-${label}`} className="col-duty-count" style={{ background: '#f5f5f5', fontWeight: 700 }}>
                        {dutySummaryTotals?.actual?.[label] || 0}
                    </td>
                ))}
                {showDutyCount && ['평', '주', '불'].map((label) => (
                    <td key={`sum-assigned-${label}`} className="col-duty-target" style={{ background: 'rgb(255, 243, 224)', fontWeight: 700 }}>
                        {dutySummaryTotals?.assigned?.[label] || 0}
                    </td>
                ))}
                {showDutyCount && ['평', '주', '불'].map((label) => (
                    <td
                        key={`sum-fixed-${label}`}
                        className="col-duty-target"
                        style={{
                            background: '#000',
                            fontWeight: 700,
                            borderLeft: label == '평' ? '2px solid #000' : undefined,
                            color: '#fff',
                        }}
                    >
                        {dutySummaryTotals?.fixed?.[label] || 0}
                    </td>
                ))}
                {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5' }}>-</td>}
                {showDutyCount && <td className="col-service-info" style={{ background: '#f5f5f5' }}>-</td>}
                <td className="col-duty-toggle" style={{ background: '#f5f5f5' }} />
            </tr>

        </>
    );
}
