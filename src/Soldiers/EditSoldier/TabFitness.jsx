import { useState, useEffect, useMemo } from 'preact/hooks';
import { fitnessController, fitnessUtils } from '../../@controllers/fitnessController.js';
import LiteChart from '../../@components/LiteChart.jsx';

export const TabFitness = ({ soldier }) => {
    const [tabs, setTabs] = useState([]);
    const [allHealth, setAllHealth] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTabId, setActiveTabId] = useState(null);
    const [isGrowthMode, setIsGrowthMode] = useState(false);

    useEffect(() => {
        Promise.all([
            fitnessController.getTabs(),
            fitnessController.getAllHealth(),
        ]).then(([fitTabs, health]) => {
            const visibleTabs = fitTabs.filter(t => !t.hidden);
            setTabs(visibleTabs);
            setAllHealth(health);
            if (visibleTabs.length > 0) setActiveTabId(visibleTabs[0].id);
            setLoading(false);
        });
    }, []);

    const activeTab = useMemo(() => tabs.find(t => t.id === activeTabId), [tabs, activeTabId]);
    const sections = useMemo(() => activeTab?.sections || [], [activeTab]);

    if (loading) return <div style={{ padding: 20 }}>데이터 불러오는 중...</div>;
    if (tabs.length === 0) return <div style={{ padding: 20, color: 'var(--c4)' }}>체단기록 탭이 없습니다.</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--c9)' }}>
            <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: 'var(--c8)', borderBottom: '1px solid var(--c6)', flexWrap: 'wrap', flexShrink: 0 }}>
                {tabs.map(t => (
                    <button key={t.id}
                        style={{ padding: '4px 12px', fontSize: 13, fontWeight: activeTabId === t.id ? 'bold' : 'normal', background: activeTabId === t.id ? 'var(--c1)' : 'var(--c7)', color: activeTabId === t.id ? '#fff' : 'var(--c3)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => setActiveTabId(t.id)}>
                        {t.text}
                    </button>
                ))}

                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <button
                        style={{ padding: '4px 10px', fontSize: 12, background: !isGrowthMode ? 'var(--accent)' : 'var(--c7)', color: !isGrowthMode ? '#fff' : 'var(--c2)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => setIsGrowthMode(false)}>📊 기록 차트</button>
                    <button
                        style={{ padding: '4px 10px', fontSize: 12, background: isGrowthMode ? 'var(--accent)' : 'var(--c7)', color: isGrowthMode ? '#fff' : 'var(--c2)', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => setIsGrowthMode(true)}>📈 성장 차트</button>
                </div>
            </div>

            <div
                key={activeTabId}
                style={{ flex: 1, padding: 14, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {activeTab ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                            background: '#fff',
                            flexShrink: 0,
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                        }}>
                            <div style={{ fontSize: 15, fontWeight: 'bold', marginBottom: 16, color: 'var(--c1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 4, height: 16, background: 'var(--accent)', borderRadius: 2 }}></div>
                                {activeTab.text}
                            </div>
                            <div style={{ width: '100%', minHeight: 280, position: 'relative' }}>
                                <SoldierChartRenderer
                                    soldier={soldier}
                                    cells={activeTab.cells}
                                    allHealth={allHealth}
                                    activeTabId={activeTab.id}
                                    sections={sections}
                                    isGrowth={isGrowthMode}
                                />
                            </div>

                            <div style={{ marginTop: 24 }}>
                                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: 'var(--c2)' }}>
                                    최근 요약 ({activeTab.text})
                                </div>
                                <SoldierRecordSummary
                                    soldier={soldier}
                                    cells={activeTab.cells}
                                    allHealth={allHealth}
                                    activeTabId={activeTab.id}
                                    sections={sections}
                                />
                            </div>
                        </div>

                        <SoldierRecordTable
                            soldier={soldier}
                            cells={activeTab.cells}
                            allHealth={allHealth}
                            activeTabId={activeTab.id}
                            sections={sections}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export const EVENT_COLORS = [
    '#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4'
];

function truncLabel(s) {
    return s && s.length > 12 ? s.slice(0, 12) + '…' : s;
}

function getGradeLevels(cell) {
    if (!cell.useGrade || !cell.grades || cell.grades.length === 0) return null;
    const sortedGrades = [...cell.grades].reverse();
    const levels = [];
    let isUnder = false;

    for (const g of sortedGrades) {
        let th = null;
        const u = g.under;
        const o = g.over;
        if (u !== undefined && u !== '') {
            th = (typeof u === 'string' || typeof u === 'number') ? fitnessUtils.timeToSeconds(u.toString(), cell.type) : u;
            if (th === null && u == 0) th = 0;
            isUnder = true;
        } else if (o !== undefined && o !== '') {
            th = (typeof o === 'string' || typeof o === 'number') ? fitnessUtils.timeToSeconds(o.toString(), cell.type) : o;
            if (th === null && o == 0) th = 0;
        }
        levels.push({ name: g.name, th });
    }

    let step = isUnder ? 30 : 5;
    const validLevels = levels.filter(l => l.th !== null);
    if (validLevels.length >= 2) {
        step = Math.abs(validLevels[1].th - validLevels[0].th);
    }
    if (levels[0].th === null && levels.length > 1 && levels[1].th !== null) {
        levels[0].th = isUnder ? levels[1].th + step : levels[1].th - step;
    }

    return { levels, isUnder, step };
}

function getNormalizedScore(value, gradeSettings) {
    if (value === '소견서' || value === '열외') return 2;
    if (value === null || value === undefined || value === '') return null;
    const v = Number(value);
    if (isNaN(v)) return null;

    if (!gradeSettings) return 0;
    const { levels, isUnder, step } = gradeSettings;

    for (let i = 0; i < levels.length - 1; i++) {
        const bottomY = i;
        const bottomTh = levels[i].th;
        const topTh = levels[i + 1].th;

        if (isUnder) {
            if (v <= bottomTh && v > topTh) {
                const ratio = (bottomTh - v) / (bottomTh - topTh);
                return bottomY + ratio;
            } else if (i === levels.length - 2 && v === topTh) {
                return bottomY + 1;
            }
        } else {
            if (v >= bottomTh && v < topTh) {
                const ratio = (v - bottomTh) / (topTh - bottomTh);
                return bottomY + ratio;
            } else if (i === levels.length - 2 && v === topTh) {
                return bottomY + 1;
            }
        }
    }

    if (isUnder) {
        if (v <= levels[levels.length - 1].th) {
            const bottomY = levels.length - 1;
            const bottomTh = levels[levels.length - 1].th;
            const topTh = bottomTh - step;
            if (topTh === bottomTh) return bottomY + (v < bottomTh ? 1 : 0);
            const ratio = (bottomTh - v) / (bottomTh - topTh);
            return bottomY + ratio;
        } else if (v > levels[0].th) {
            return 0;
        }
    } else {
        if (v >= levels[levels.length - 1].th) {
            const bottomY = levels.length - 1;
            const bottomTh = levels[levels.length - 1].th;
            const topTh = bottomTh + step;
            if (topTh === bottomTh) return bottomY + (v > bottomTh ? 1 : 0);
            const ratio = (v - bottomTh) / (topTh - bottomTh);
            return bottomY + ratio;
        } else if (v < levels[0].th) {
            return 0;
        }
    }
    return 0;
}

function SoldierChartRenderer({ soldier, cells, allHealth, activeTabId, sections, isGrowth }) {
    if (!sections || sections.length === 0) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>설정된 회차(회차)가 없습니다.</div>;

    const targetSections = useMemo(() => {
        for (let i = 0; i < sections.length; i++) {
            sections[i].idx = sections[i].idx ?? i + 1;
        }

        const mapped = sections.map(sec => {
            const hasData = cells.some(cell => {
                const val = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                return val !== null && val !== undefined && val !== '';
            });
            return { sec, hasData };
        });

        let filtered = mapped.filter(m => m.hasData).map(m => m.sec);
        if (filtered.length < 3) {
            let needAddCount = 3 - filtered.length;
            for (let i = 0; i < needAddCount && i < sections.length; i++) {
                if (!filtered.find(s => s.id === sections[i].id)) {
                    filtered.push(sections[i]);
                }
            }
            filtered.sort((a, b) => a.idx - b.idx);
        }
        return filtered;
    }, [sections, cells, allHealth, soldier.id, activeTabId]);

    const gradeSettingsMap = useMemo(() => {
        const map = {};
        cells.forEach(c => map[c.id] = getGradeLevels(c));
        return map;
    }, [cells]);

    const labels = targetSections.map(s => truncLabel(s.name));

    const datasets = useMemo(() => cells.map((cell, ci) => {
        const gs = gradeSettingsMap[cell.id];
        let data = [];

        if (isGrowth) {
            data = targetSections.map((sec, i) => {
                const prevSec = targetSections[i + 1];
                const currV = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                if (currV == null || currV === '소견서' || currV === '열외') return null;
                if (!prevSec) return 0;

                const prevV = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, prevSec.id, cell.id);
                if (prevV == null || prevV === '소견서' || prevV === '열외') return 0;

                const c = Number(currV);
                const p = Number(prevV);
                if (isNaN(c)) return null;
                if (isNaN(p)) return 0;

                const diff = gs.isUnder ? (p - c) : (c - p);
                if (p === 0) return diff > 0 ? 100 : (diff < 0 ? -100 : 0);
                return Math.round((diff / Math.abs(p)) * 1000) / 10;
            });
        } else {
            data = targetSections.map(sec => {
                const v = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                return getNormalizedScore(v, gs);
            });
        }

        return {
            label: cell.text,
            data,
            backgroundColor: (cell.color || EVENT_COLORS[ci % EVENT_COLORS.length]) + '88',
            borderColor: (cell.color || EVENT_COLORS[ci % EVENT_COLORS.length]) + 'CC',

            borderWidth: isGrowth ? 2 : 1,
            borderRadius: isGrowth ? 0 : 6,
            pointRadius: 5,
            pointHoverRadius: 8,
            maxBarThickness: 6,
            type: isGrowth ? 'line' : 'bar',
            tension: 0.3,
            fill: false,
            spanGaps: true,
            minBarLength: 3,
            rawValues: targetSections.map(sec => fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id))
        };
    }), [cells, gradeSettingsMap, isGrowth, targetSections, allHealth, soldier.id, activeTabId]);

    const hasData = datasets.some(ds => ds.data.some(d => d !== null));
    if (!hasData) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>체단 기록이 없습니다.</div>;

    const maxGrowth = isGrowth ? Math.max(30, ...datasets.flatMap(d => d.data).filter(v => v !== null)) : 0;
    const minGrowth = isGrowth ? Math.min(-30, ...datasets.flatMap(d => d.data).filter(v => v !== null)) : 0;
    const dynamicMaxGrowth = Math.ceil(maxGrowth / 5) * 5;
    const dynamicMinGrowth = Math.floor(minGrowth / 5) * 5;

    const options = useMemo(() => {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { position: 'bottom', labels: { font: { size: 12, weight: 'bold' }, padding: 15, boxWidth: 16 } },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    padding: 12,
                    titleFont: { size: 13 },
                    bodyFont: { size: 14, weight: 'bold' },
                    callbacks: {
                        label: (ctx) => {
                            const ds = ctx.dataset || ctx.chart.data.datasets[ctx.datasetIndex];
                            if (isGrowth) {
                                const val = ctx.parsed.y;
                                const sign = val > 0 ? '+' : '';
                                return ` ${ds.label} : ${sign}${val}% 변동`;
                            }
                            const raw = ds.rawValues[ctx.dataIndex];
                            const cell = cells[ctx.datasetIndex];
                            if (raw === '소견서' || raw === '열외') return ` ${ds.label} : ${raw}`;
                            const isTimeType = cell.type === 'i:s' || cell.type === 'h:i:s';
                            const disp = isTimeType ? fitnessUtils.secondsToDisplay(raw, cell.type) : raw;
                            const grade = fitnessUtils.calcGrade(raw, cell);
                            const gStr = grade ? ` [${grade.name}]` : '';
                            return ` ${ds.label} : ${disp}${gStr}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: isGrowth ? dynamicMinGrowth : 0,
                    max: isGrowth ? dynamicMaxGrowth : (cells[0].grades.length * 2 - 2),
                    ticks: {
                        stepSize: isGrowth ? (Math.max(dynamicMaxGrowth, Math.abs(dynamicMinGrowth)) > 50 ? 20 : Math.max(dynamicMaxGrowth, Math.abs(dynamicMinGrowth)) > 30 ? 10 : 10) : 1,
                        callback: function (val) {
                            if (isGrowth) return val + '%';
                            const gradesNames = cells[0].grades.slice().reverse().map(g => g.name);
                            if (Number.isInteger(val) && val >= 0 && val < gradesNames.length) {
                                return gradesNames[val];
                            }
                            return '';
                        },
                        font: { size: 12, weight: isGrowth ? 'normal' : 'bold' },
                        color: '#444',
                        padding: 8
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { font: { size: 12, weight: 'bold' }, color: '#333' },
                    grid: { display: false }
                }
            }
        };

        if (isGrowth) {
            baseOptions.plugins.annotation = {
                annotations: {
                    zeroLine: {
                        type: 'line',
                        yMin: 0,
                        yMax: 0,
                        borderColor: 'rgba(0, 0, 0, 0.4)',
                        borderWidth: 2,
                    }
                }
            };
        }

        return baseOptions;
    }, [isGrowth, cells, dynamicMinGrowth, dynamicMaxGrowth]);

    const customPlugins = useMemo(() => {
        if (isGrowth) return [];
        return [{
            id: 'barTextPlugin',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                ctx.save();
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.hidden) return;

                    const cell = cells[i];
                    meta.data.forEach((element, index) => {
                        const raw = dataset.rawValues[index];
                        if (raw == null) return;

                        let disp = raw;
                        if (raw === '소견서' || raw === '열외') {
                            disp = raw;
                        } else if (cell && (cell.type === 'i:s' || cell.type === 'h:i:s')) {
                            disp = fitnessUtils.secondsToDisplay(raw, cell.type);
                        }

                        ctx.fillStyle = dataset.borderColor || '#333';
                        ctx.fillText(disp, element.x, element.y - 4);
                    });
                });
                ctx.restore();
            }
        }];
    }, [isGrowth, cells]);

    return (
        <div style={{ position: 'absolute', inset: 0 }}>
            <LiteChart data={{ labels, datasets }} options={options} plugins={customPlugins} />
        </div>
    );
}

function SoldierRecordTable({ soldier, cells, allHealth, activeTabId, sections }) {
    if (!sections || sections.length === 0) return null;

    const targetSections = useMemo(() => {
        const mapped = sections.map(sec => {
            const hasData = cells.some(cell => {
                const val = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                return val !== null && val !== undefined && val !== '';
            });
            return { sec, hasData };
        });
        return mapped.filter(m => m.hasData).map(m => m.sec);
    }, [sections, cells, allHealth, soldier.id, activeTabId]);

    if (targetSections.length === 0) return null;

    return (
        <div style={{}}>
            <div style={{ overflowX: 'auto', }}>
                <table style={{
                    width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'center', background: '#fff', whiteSpace: 'nowrap',

                    borderRadius: 8, border: '1px solid var(--c6)'

                }}>
                    <thead style={{ background: 'var(--c8)', borderBottom: '2px solid var(--c5)' }}>
                        <tr>
                            <th style={{ padding: '10px 8px', borderRight: '1px solid var(--c6)', width: 120, color: 'var(--c2)', fontWeight: 'bold' }}>회차 명칭</th>
                            {cells.map(cell => (
                                <th key={cell.id} style={{ padding: '10px 8px', borderRight: '1px solid var(--c6)', color: 'var(--c1)' }}>{cell.text}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {targetSections.map((sec, i) => (
                            <tr key={sec.id} style={{ borderBottom: '1px solid var(--c7)', background: i % 2 === 0 ? '#fff' : 'var(--c9)' }}>
                                <td style={{ padding: '10px 8px', borderRight: '1px solid var(--c6)', fontWeight: 'bold', color: 'var(--c3)' }}>{sec.name}</td>
                                {cells.map(cell => {
                                    const raw = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                                    if (raw === null || raw === undefined || raw === '') return <td key={cell.id} style={{ borderRight: '1px solid var(--c6)', color: 'var(--c6)' }}>-</td>;
                                    if (raw === '소견서' || raw === '열외') return <td key={cell.id} style={{ borderRight: '1px solid var(--c6)', color: '#F59E0B', fontWeight: 'bold', fontSize: 13 }}>{raw}</td>;

                                    const isTimeType = cell.type === 'i:s' || cell.type === 'h:i:s';
                                    const disp = isTimeType ? fitnessUtils.secondsToDisplay(raw, cell.type) : raw;
                                    const grade = fitnessUtils.calcGrade(raw, cell);

                                    return (
                                        <td key={cell.id} style={{ padding: '8px 4px', borderRight: '1px solid var(--c6)' }}>
                                            <div className='f row ajCenter' style={{ gap: 10, }}>
                                                <div style={{ fontWeight: 'bold', fontSize: 14, color: '#111' }}>{disp}</div>
                                                {grade && <div style={{ fontSize: 11, color: grade.color, marginTop: 4, background: grade.color + '1A', display: 'inline-block', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>{grade.name}</div>}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SoldierRecordSummary({ soldier, cells, allHealth, activeTabId, sections }) {
    if (!sections || sections.length === 0) return null;

    const targetSections = useMemo(() => {
        const mapped = sections.map(sec => {
            const hasData = cells.some(cell => {
                const val = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                return val !== null && val !== undefined && val !== '';
            });
            return { sec, hasData };
        });
        return mapped.filter(m => m.hasData).map(m => m.sec);
    }, [sections, cells, allHealth, soldier.id, activeTabId]);

    if (targetSections.length === 0) return null;

    const currentSec = targetSections[0];
    const prevSec = targetSections[1];

    return (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
            {cells.map((cell, idx) => {
                const currV = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, currentSec.id, cell.id);

                if (currV === null || currV === undefined || currV === '') return null;

                const isTimeType = cell.type === 'i:s' || cell.type === 'h:i:s';
                const disp = currV === '소견서' || currV === '열외' ? currV : (isTimeType ? fitnessUtils.secondsToDisplay(currV, cell.type) : currV);
                const grade = (currV === '소견서' || currV === '열외') ? null : fitnessUtils.calcGrade(currV, cell);

                let diffNode = null;
                if (prevSec && currV !== '소견서' && currV !== '열외') {
                    const prevV = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, prevSec.id, cell.id);
                    if (prevV !== null && prevV !== undefined && prevV !== '' && prevV !== '소견서' && prevV !== '열외') {
                        const numericCurr = isTimeType ? fitnessUtils.timeToSeconds(currV, cell.type) : Number(currV);
                        const numericPrev = isTimeType ? fitnessUtils.timeToSeconds(prevV, cell.type) : Number(prevV);
                        if (!isNaN(numericCurr) && !isNaN(numericPrev) && numericCurr !== null && numericPrev !== null) {
                            let isUnder = false;
                            if (cell.useGrade && cell.grades && cell.grades.length > 0) {
                                isUnder = cell.grades.some(g => g.under !== undefined && g.under !== '');
                            }

                            const diff = numericCurr - numericPrev;
                            if (diff !== 0) {
                                const isImproved = isUnder ? diff < 0 : diff > 0;
                                const sign = isUnder ? (diff < 0 ? '▼' : '▲') : (diff > 0 ? '▲' : '▼');
                                const diffDisp = isTimeType ? fitnessUtils.secondsToDisplay(Math.abs(diff), cell.type) : Math.abs(diff);
                                diffNode = (
                                    <div style={{ fontSize: 11, color: isImproved ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                                        {sign} {diffDisp}
                                    </div>
                                );
                            } else {
                                diffNode = <div style={{ fontSize: 11, color: '#888' }}>- 유지</div>;
                            }
                        }
                    }
                }

                return (
                    <div key={cell.id} style={{
                        flex: '1 1 0', minWidth: 120, background: 'var(--c9)', border: '1px solid var(--c7)',
                        borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6
                    }}>
                        <div style={{ fontSize: 12, color: 'var(--c3)', fontWeight: 'bold' }}>{cell.text}</div>

                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <div style={{ fontSize: 18, fontWeight: 'bold', color: 'var(--c1)' }}>{disp}</div>
                            {diffNode}
                        </div>

                        {grade ? (
                            <div style={{ fontSize: 11, fontWeight: 'bold', color: grade.color, background: grade.color + '1A', alignSelf: 'flex-start', padding: '2px 6px', borderRadius: 4 }}>
                                {grade.name}
                            </div>
                        ) : (
                            <div style={{ fontSize: 11, color: 'var(--c5)' }}>등급 없음</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
