import { useState, useEffect } from 'preact/hooks';
import { getDayOfWeek } from '../@modules/utils.js';
import { sleepGuard } from '../../@modules/sleepGuard.js';
import { findDutySoldiers, findSoldiersWithRank as findDutyNamesWithRank, getCctvLabels } from '../../@modules/dutyData.js';

// ========================================
// 날짜별 근무 목록표
// ========================================
export default function DutyRosterTable({ year, month, days, soldiers, schedules, dutyReplacements }) {
    const [guardOrders, setGuardOrders] = useState({});


    // 불침번 순서 계산
    useEffect(() => {
        const loadGuardOrders = async () => {
            await sleepGuard.init();
            const orders = {};
            for (const day of days) {
                const guardSoldiers = findDutySoldiers(soldiers, schedules, day, ['불'], dutyReplacements);
                if (guardSoldiers.length > 0) {
                    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    orders[day] = await sleepGuard.getOrder(dateKey, guardSoldiers);
                } else {
                    orders[day] = new Array(5).fill(null);
                }
            }
            setGuardOrders(orders);
        };
        loadGuardOrders();
    }, [year, month, soldiers, schedules, dutyReplacements]);

    // 특정 날짜에 특정 라벨을 가진 용사 찾기 (계급 이름 포함)
    const findSoldiersWithRank = (day, labels) => {
        return findDutyNamesWithRank(soldiers, schedules, day, labels, dutyReplacements);
    };

    // 불침번 용사 이름 (계급 포함)
    const guardName = (day, pos) => {
        const o = guardOrders[day];
        return o && o[pos] ? [`${o[pos].rank} ${o[pos].name}`] : [];
    };

    // CCTV 라벨 결정 (공통 모듈 사용)
    const cctvLabels = getCctvLabels(month);
    const cctvDayLabels = cctvLabels.day;
    const cctvNightLabels = cctvLabels.night;

    // CCTV 주간/야간 중 데이터가 있는 행만 표시 판별
    const isOddMonth = month % 2 === 1;
    const cctvDayHasData = days.some(day => findSoldiersWithRank(day, cctvDayLabels).length > 0);
    const cctvNightHasData = days.some(day => findSoldiersWithRank(day, cctvNightLabels).length > 0);
    const cctvRows = [];
    if (cctvDayHasData) cctvRows.push({ label: '주간', getNames: (day) => findSoldiersWithRank(day, cctvDayLabels) });
    if (cctvNightHasData) cctvRows.push({ label: '야간', getNames: (day) => findSoldiersWithRank(day, cctvNightLabels) });
    // 둘 다 없으면 홀수달→야간, 짝수달→주간
    if (cctvRows.length === 0) {
        if (isOddMonth) cctvRows.push({ label: '야간', getNames: (day) => findSoldiersWithRank(day, cctvNightLabels) });
        else cctvRows.push({ label: '주간', getNames: (day) => findSoldiersWithRank(day, cctvDayLabels) });
    }

    const sections = [
        {
            header: '당직', rows: [
                { label: '주간', getNames: (day) => findSoldiersWithRank(day, ['주당']) },
                { label: '야간', getNames: (day) => findSoldiersWithRank(day, ['야당']) },
            ]
        },
        { header: 'CCTV', rows: cctvRows },
        {
            header: '불침번',
            rows: sleepGuard.getTimes(true).map((_, i) => {
                return { label: `${i + 1}번초`, getNames: (day) => guardName(day, i) };
            }),
        },
    ];

    return (
        <table className="ss-table duty-roster" style={{ marginTop: 12 }}>
            <thead>
                <tr>
                    <th className="col-num" style={{ position: 'sticky', left: 0, zIndex: 110, width: '55px !important' }}>구분</th>
                    <th className="col-name" style={{ position: 'sticky', left: 55, zIndex: 110, width: '95px !important' }}>근무</th>
                    {days.map(day => {
                        const dow = getDayOfWeek(year, month, day);
                        const today = new Date();
                        const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
                        let cls = 'col-day';
                        if (isToday) cls += ' today';
                        else if (dow === 0) cls += ' sunday';
                        else if (dow === 6) cls += ' saturday';
                        return <th key={day} className={cls}>{day}</th>;
                    })}
                </tr>
            </thead>
            <tbody>
                {sections.map(section => (
                    section.rows.map((row, rowIdx) => (
                        <tr key={`${section.header}-${rowIdx}`} className={rowIdx === 0 ? 'duty-section-start' : ''}>
                            {rowIdx === 0 && (
                                <td className="sticky-cell col-num duty-section-header"
                                    rowSpan={section.rows.length}
                                    style={{
                                        left: 0,
                                    }}>
                                    {section.header}
                                </td>
                            )}
                            <td className="sticky-cell col-name duty-row-label" style={{
                                left: 55,
                            }}>
                                {row.label}
                            </td>
                            {days.map(day => {
                                const names = row.getNames(day);
                                return (
                                    <td key={day} className="duty-cell">
                                        {names.map((n, i) => (
                                            <div key={i} className="duty-name">{n}</div>
                                        ))}
                                    </td>
                                );
                            })}
                        </tr>
                    ))
                ))}
            </tbody>
        </table>
    );
}
