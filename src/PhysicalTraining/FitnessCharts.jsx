import { useMemo, useState } from 'preact/hooks';
import LiteChart from '../@components/LiteChart.jsx';
import { fitnessController, fitnessUtils } from '../@controllers/fitnessController.js';

const EVENT_COLORS = [
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#06B6D4'  // Cyan
];

const MAX_LEGEND_LEN = 12;
function truncLabel(s) {
    return s && s.length > MAX_LEGEND_LEN ? s.slice(0, MAX_LEGEND_LEN) + '…' : s;
}

function calculateBeeswarmX(pointsArray, baseX) {
    if (!pointsArray || pointsArray.length === 0) return [];
    // Y축으로 정렬하여 유사한 점수끼리 그룹화
    const sorted = [...pointsArray].sort((a, b) => a.y - b.y);
    const yThreshold = 0.15; // 겹치는 것으로 간주할 Y 간격 제한
    
    let bucket = [];
    const result = [];
    
    const flushBucket = () => {
        const count = bucket.length;
        if (count === 0) return;
        if (count === 1) {
            bucket[0].x = baseX;
            result.push(bucket[0]);
        } else {
            // 여러 개일 경우에만 중앙을 기준으로 좌우 분산
            const step = 0.08;
            const totalWidth = Math.min(0.6, (count - 1) * step);
            for (let i = 0; i < count; i++) {
                bucket[i].x = baseX + (i / (count - 1) - 0.5) * totalWidth;
                result.push(bucket[i]);
            }
        }
        bucket = [];
    };

    for (let i = 0; i < sorted.length; i++) {
        if (bucket.length === 0) {
            bucket.push(sorted[i]);
        } else {
            if (Math.abs(sorted[i].y - bucket[0].y) <= yThreshold) {
                bucket.push(sorted[i]);
            } else {
                flushBucket();
                bucket.push(sorted[i]);
            }
        }
    }
    flushBucket();
    return result;
}

function getSectionCells(sectionCellsMap, section, fallbackCells) {
    return sectionCellsMap?.[section.id] || fallbackCells;
}

// 등급 -> 정규화된 점수 (0~4) 매핑 로직
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
            if (th === null && u == 0) th = 0; // Fix explicitly for 0
            isUnder = true;
        } else if (o !== undefined && o !== '') {
            th = (typeof o === 'string' || typeof o === 'number') ? fitnessUtils.timeToSeconds(o.toString(), cell.type) : o;
            if (th === null && o == 0) th = 0; // Fix explicitly for 0
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
    if (value === '소견서' || value === '열외') return 2; // 중간 2급 
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
            // 값이 작을수록 좋은 것
            if (v <= bottomTh && v > topTh) {
                const ratio = (bottomTh - v) / (bottomTh - topTh);
                return bottomY + ratio;
            } else if (i === levels.length - 2 && v === topTh) {
                return bottomY + 1;
            }
        } else {
            // 값이 클수록 좋은 것
            if (v >= bottomTh && v < topTh) {
                const ratio = (v - bottomTh) / (topTh - bottomTh);
                return bottomY + ratio;
            } else if (i === levels.length - 2 && v === topTh) {
                return bottomY + 1;
            }
        }
    }

    // Out of bounds (특급 초과 또는 불합격 미만)
    if (isUnder) {
        if (v <= levels[levels.length - 1].th) {
            const bottomY = levels.length - 1;
            const bottomTh = levels[levels.length - 1].th;
            const topTh = bottomTh - step;
            if (topTh === bottomTh) return bottomY + (v < bottomTh ? 1 : 0);
            const ratio = (bottomTh - v) / (bottomTh - topTh);
            return bottomY + ratio; // 특급을 뚫고 올라감
        } else if (v > levels[0].th) {
            return 0; // 0점 밑으로 내려감
        }
    } else {
        if (v >= levels[levels.length - 1].th) {
            const bottomY = levels.length - 1;
            const bottomTh = levels[levels.length - 1].th;
            const topTh = bottomTh + step;
            if (topTh === bottomTh) return bottomY + (v > bottomTh ? 1 : 0);
            const ratio = (v - bottomTh) / (topTh - bottomTh);
            return bottomY + ratio; // 특급을 뚫고 올라감
        } else if (v < levels[0].th) {
            return 0; // 0점 밑으로 내려감
        }
    }
    return 0;
}

export default function FitnessCharts({ activeTab, sections, sectionCellsMap, soldiersByUnit, allHealth, activeTabId, showSummary, showSoldierCharts, showGrowthCharts }) {
    if (!activeTab || !activeTab.cells || sections.length === 0) {
        return <div className="fit-chart-empty">회차을 추가하고 기록을 입력하면<br />요약과 차트가 표시됩니다.</div>;
    }

    const cells = activeTab.cells;
    const allFilteredSoldiers = useMemo(() => soldiersByUnit.flatMap(u => u.soldiers), [soldiersByUnit]);
    const gradeCellsBySection = useMemo(() => {
        const map = {};
        sections.forEach(section => {
            map[section.id] = getSectionCells(sectionCellsMap, section, cells).filter(cell => cell.useGrade);
        });
        return map;
    }, [sections, sectionCellsMap, cells]);

    // 회차별 요약
    const summaryBySection = useMemo(() => {
        const res = {};
        sections.forEach(sec => {
            res[sec.id] = {};
            const activeGradeCells = gradeCellsBySection[sec.id] || [];
            activeGradeCells.forEach(cell => {
                const counts = {};
                cell.grades.forEach(g => { counts[g.name] = 0; });
                counts['소견서'] = 0;
                counts['열외'] = 0;

                allFilteredSoldiers.forEach(s => {
                    const val = fitnessController.getCellValue(allHealth, s.id, activeTabId, sec.id, cell.id);
                    if (val === null || val === undefined) return;
                    if (val === '소견서') { counts['소견서']++; return; }
                    if (val === '열외') { counts['열외']++; return; }

                    const grade = fitnessUtils.calcGrade(val, cell);
                    if (grade && counts[grade.name] !== undefined) counts[grade.name]++;
                });
                res[sec.id][cell.id] = { cell, counts };
            });
        });
        return res;
    }, [sections, gradeCellsBySection, allFilteredSoldiers, allHealth, activeTabId]);

    return (
        <>
            {showSummary && (
                <div className="fit-summary-col">
                    <div className="fit-summary-scroll">
                        {sections.map((sec) => {
                            const gradeCells = gradeCellsBySection[sec.id] || [];

                            return (
                                <div key={sec.id} className="fit-summary-card">
                                    <div className="fit-summary-title">{sec.name} 요약</div>
                                    {gradeCells.length === 0 ? (
                                        <div className="fit-summary-empty">활성화된 등급 종목이 없습니다.</div>
                                    ) : (
                                        <table className="fit-summary-table">
                                            <thead>
                                                <tr>
                                                    <th>종목</th>
                                                    {gradeCells[0]?.grades.map(g => (
                                                        <th key={g.name} style={{ color: g.color, fontWeight: g.bold ? 'bold' : 'normal' }}>{g.name}</th>
                                                    )) || null}
                                                    <th style={{ color: '#444' }}>소견</th>
                                                    <th style={{ color: '#444' }}>열외</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {gradeCells.map(cell => {
                                                    const data = summaryBySection[sec.id]?.[cell.id];
                                                    if (!data) return null;
                                                    return (
                                                        <tr key={cell.id}>
                                                            <td className="fit-summary-event">{cell.text}</td>
                                                            {cell.grades.map(g => (
                                                                <td key={g.name} style={{
                                                                    color: g.color,
                                                                    fontWeight: data.counts[g.name] > 0 ? 'bold' : 'normal',
                                                                }}>{data.counts[g.name]}</td>
                                                            ))}
                                                            <td style={{ fontWeight: data.counts['소견서'] > 0 ? 'bold' : 'normal', color: '#444' }}>{data.counts['소견서']}</td>
                                                            <td style={{ fontWeight: data.counts['열외'] > 0 ? 'bold' : 'normal', color: '#444' }}>{data.counts['열외']}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {gradeCells.length >= 1 && (() => {
                                                    const gradeNames = gradeCells[0].grades.map(g => g.name);
                                                    const allGradeCounts = {};
                                                    gradeNames.forEach(gradeName => { allGradeCounts[gradeName] = 0; });

                                                    allFilteredSoldiers.forEach(soldier => {
                                                        const gradeIndices = gradeCells.map(cell => {
                                                            const val = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                                                            if (val === null || val === undefined || val === '' || val === '소견서' || val === '열외') return null;
                                                            const grade = fitnessUtils.calcGrade(val, cell);
                                                            if (!grade) return null;
                                                            const idx = gradeNames.indexOf(grade.name);
                                                            return idx >= 0 ? idx : null;
                                                        });

                                                        if (gradeIndices.some(gradeIndex => gradeIndex === null)) return;
                                                        const worstIdx = Math.max(...gradeIndices);
                                                        allGradeCounts[gradeNames[worstIdx]]++;
                                                    });

                                                    return (
                                                        <tr style={{ borderTop: '2px solid var(--c4)', fontStyle: 'italic' }}>
                                                            <td className="fit-summary-event">전 종목 기준</td>
                                                            {gradeCells[0].grades.map(g => (
                                                                <td key={g.name} style={{
                                                                    color: g.color,
                                                                    fontWeight: allGradeCounts[g.name] > 0 ? 'bold' : 'normal',
                                                                }}>{allGradeCounts[g.name]}</td>
                                                            ))}
                                                            <td style={{ color: '#444' }}>-</td>
                                                            <td style={{ color: '#444' }}>-</td>
                                                        </tr>
                                                    );
                                                })()}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {/* 
            <div className="fit-chart-col" key={activeTabId}>
                <div className="fit-chart-scroll">
                    {!showSoldierCharts && !showGrowthCharts && (
                        <div className="fit-chart-empty">표시할 차트를 선택하세요.</div>
                    )}
                    {showSoldierCharts && allFilteredSoldiers.map(soldier => (
                        <CombinedSoldierChart key={`${soldier.id}-soldier`} soldier={soldier} cells={cells.filter(cell => cell.useGrade)}
                            sectionCellsMap={sectionCellsMap}
                            allHealth={allHealth} activeTabId={activeTabId} sections={sections} mode="soldier" />
                    ))}
                    {showGrowthCharts && allFilteredSoldiers.map(soldier => (
                        <CombinedSoldierChart key={`${soldier.id}-growth`} soldier={soldier} cells={cells.filter(cell => cell.useGrade)}
                            sectionCellsMap={sectionCellsMap}
                            allHealth={allHealth} activeTabId={activeTabId} sections={sections} mode="growth" />
                    ))}
                </div>
            </div> */}
        </>
    );
}

function CombinedSoldierChart({ soldier, cells, sectionCellsMap, allHealth, activeTabId, sections, mode }) {
    const isGrowth = mode === 'growth';
    const enabledCellIdsBySection = useMemo(() => {
        const map = {};
        sections.forEach(section => {
            map[section.id] = new Set(getSectionCells(sectionCellsMap, section, cells).map(cell => cell.id));
        });
        return map;
    }, [sections, sectionCellsMap, cells]);

    // 용사가 기록을 입력한 회차 필터링 (sections는 최신이 앞에 위치)
    const targetSections = useMemo(() => {
        const mapped = sections.map(sec => {
            const hasData = cells.some(cell => {
                if (!enabledCellIdsBySection[sec.id]?.has(cell.id)) return false;
                const val = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);
                return val !== null && val !== undefined && val !== '';
            });
            return { sec, hasData, id: sec.id };
        });

        let filtered = mapped.filter(m => m.hasData).map(m => m.sec);
        if (filtered.length < 3) {
            // 최신순으로 앞에 있으므로 앞에서 3개를 가져옴
            let needAddCount = 3 - filtered.length;
            for (let i = 0; i < Math.min(sections.length, needAddCount); i++) {
                // filtered에 안들어있는애만 추가
                if (!filtered.find(s => s.id === sections[i].id)) {
                    filtered.push(sections[i]);
                }
            }
        }

        // 차트에서 왼쪽이 최신이 되도록 정렬 (최신이 index 0)
        return filtered;
    }, [sections, cells, enabledCellIdsBySection, allHealth, soldier.id, activeTabId]);

    const visibleCells = useMemo(() => cells.filter(cell =>
        targetSections.some(section => enabledCellIdsBySection[section.id]?.has(cell.id))
    ), [cells, targetSections, enabledCellIdsBySection]);

    const gradeSettingsMap = useMemo(() => {
        const map = {};
        visibleCells.forEach(c => map[c.id] = getGradeLevels(c));
        return map;
    }, [visibleCells]);

    const labels = targetSections.map(s => truncLabel(s.name));

    const datasets = useMemo(() => visibleCells.map((cell, ci) => {
        const gs = gradeSettingsMap[cell.id];
        let data = [];

        if (isGrowth) {
            data = targetSections.map((sec, i) => {
                if (!enabledCellIdsBySection[sec.id]?.has(cell.id)) return null;
                const prevSec = targetSections[i + 1]; // 이전 시점의 회차
                const currV = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id);

                if (currV == null || currV === '소견서' || currV === '열외') return null;

                if (!prevSec) return 0;
                if (!enabledCellIdsBySection[prevSec.id]?.has(cell.id)) return null;
                const prevV = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, prevSec.id, cell.id);
                if (prevV == null || prevV === '소견서' || prevV === '열외') return null;

                const c = Number(currV);
                const p = Number(prevV);
                if (isNaN(c)) return null;
                if (isNaN(p)) return null;

                const diff = gs.isUnder ? (p - c) : (c - p);
                if (p === 0) return diff > 0 ? 100 : (diff < 0 ? -100 : 0);
                return Math.round((diff / Math.abs(p)) * 1000) / 10;
            });
        } else {
            data = targetSections.map(sec => {
                if (!enabledCellIdsBySection[sec.id]?.has(cell.id)) return null;
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
            pointRadius: 4,
            maxBarThickness: 6,
            type: isGrowth ? 'line' : 'bar',
            tension: 0.3,
            fill: false,
            spanGaps: true,
            minBarLength: 2,
            rawValues: targetSections.map(sec => enabledCellIdsBySection[sec.id]?.has(cell.id)
                ? fitnessController.getCellValue(allHealth, soldier.id, activeTabId, sec.id, cell.id)
                : null)
        };
    }), [visibleCells, gradeSettingsMap, isGrowth, targetSections, enabledCellIdsBySection, allHealth, soldier.id, activeTabId]);

    const hasData = datasets.some(ds => ds.data.some(d => d !== null));
    // 데이터가 아예 없더라도 화면에 깡통 차트로 표시하여 일관성 유지 (사용자 요청)

    const maxGrowth = isGrowth ? Math.max(30, ...datasets.flatMap(d => d.data).filter(v => v !== null)) : 0;
    const minGrowth = isGrowth ? Math.min(-30, ...datasets.flatMap(d => d.data).filter(v => v !== null)) : 0;

    // 만약 max나 min이 30을 넘으면 5 단위 올림/내림으로 맞춤.
    const dynamicMaxGrowth = Math.ceil(maxGrowth / 5) * 5;
    const dynamicMinGrowth = Math.floor(minGrowth / 5) * 5;

    const options = useMemo(() => {
        const baseOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: { display: false },
                legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const ds = ctx.dataset || ctx.chart.data.datasets[ctx.datasetIndex];
                            if (isGrowth) {
                                const val = ctx.parsed.y;
                                const sign = val > 0 ? '+' : '';
                                return `${ds.label}: ${sign}${val}%`;
                            }
                            const raw = ds.rawValues[ctx.dataIndex];
                            const cell = cells[ctx.datasetIndex];
                            if (raw === '소견서' || raw === '열외') return `${ds.label}: ${raw}`;
                            const isTimeType = cell.type === 'i:s' || cell.type === 'h:i:s';
                            const disp = isTimeType ? fitnessUtils.secondsToDisplay(raw, cell.type) : raw;
                            const grade = fitnessUtils.calcGrade(raw, cell);
                            const gStr = grade ? ` [${grade.name}]` : '';
                            return `${ds.label}: ${disp}${gStr}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: isGrowth ? dynamicMinGrowth : 0,
                    max: isGrowth ? dynamicMaxGrowth : ((visibleCells[0]?.grades?.length || 1) * 2 - 2),
                    ticks: {
                        stepSize: isGrowth ? (Math.max(dynamicMaxGrowth, Math.abs(dynamicMinGrowth)) > 50 ? 20 : Math.max(dynamicMaxGrowth, Math.abs(dynamicMinGrowth)) > 30 ? 10 : 10) : 1,
                        callback: function (val) {
                            if (isGrowth) return val + '%';
                            const gradesNames = (visibleCells[0]?.grades || []).slice().reverse().map(g => g.name);
                            if (Number.isInteger(val) && val >= 0 && val < gradesNames.length) {
                                return gradesNames[val];
                            }
                            return '';
                        },
                        font: { size: 10, weight: isGrowth ? 'normal' : 'bold' },
                        color: '#444'
                    }
                },
                x: {
                    ticks: { font: { size: 9 }, maxRotation: 45 },
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
    }, [isGrowth, visibleCells, dynamicMinGrowth, dynamicMaxGrowth]);

    const customPlugins = useMemo(() => {
        if (isGrowth) return [];
        return [{
            id: 'barTextPlugin',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                ctx.save();
                ctx.font = 'normal 10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if (meta.hidden) return;

                    const cell = visibleCells[i];
                    meta.data.forEach((element, index) => {
                        const raw = dataset.rawValues ? dataset.rawValues[index] : null;
                        if (raw == null) return;
                        ctx.fillStyle = dataset.borderColor || '#333';

                        let beforeFont = ctx.font;
                        let disp = raw;
                        if (raw === '소견서' || raw === '열외') {
                            disp = raw === '소견서' ? '소견' : '열외';
                            ctx.font = 'normal 8px sans-serif';
                        } else if (cell && (cell.type === 'i:s')) {
                            disp = fitnessUtils.secondsToDisplay(raw, cell.type);
                            // fontSize 작게
                            ctx.font = 'normal 8px sans-serif';
                        } else if (cell && (cell.type === 'h:i:s')) {
                            disp = fitnessUtils.secondsToDisplay(raw, cell.type) + '';
                        }

                        ctx.fillText(disp, element.x, element.y - 4);
                        ctx.font = beforeFont;
                    });
                });
                ctx.restore();
            }
        }];
    }, [isGrowth, visibleCells]);

    const finalMaxWidth = Math.max(420, Math.min(620, targetSections.length * 90 + 120));

    if (visibleCells.length === 0) return null;

    return (
        <div style={{
            flex: `1 1 ${finalMaxWidth}px`,
            maxWidth: finalMaxWidth,
            boxSizing: 'border-box',
            position: 'relative',
        }}>
            <div style={{
                fontSize: 13,
                fontWeight: 'bold',
                color: 'var(--c1)',

                marginBottom: -20,
                padding: 4,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.5)',
                pointerEvents: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',

                position: 'absolute',
                top: 10,
                left: 10,

            }}>
                {soldier.rank} {soldier.name} {isGrowth ? '· 성장률' : '· 기록'}
            </div>
            <div style={{ height: 260, background: '#fff', border: '1px solid var(--c6)', padding: 4 }}>
                <LiteChart data={{ labels, datasets }} options={options} plugins={customPlugins} />
            </div>
        </div>
    );
}

function buildGradeAxisOptions(cells) {
    return {
        min: 0,
        max: ((cells[0]?.grades?.length || 1) * 2 - 2),
        ticks: {
            stepSize: 1,
            callback: function (val) {
                const gradeNames = (cells[0]?.grades || []).slice().reverse().map(g => g.name);
                if (Number.isInteger(val) && val >= 0 && val < gradeNames.length) {
                    return gradeNames[val];
                }
                return '';
            },
            font: { size: 11, weight: 'bold' },
            color: '#444'
        }
    };
}

export function SectionDistributionPopup({ section, activeTab, soldiersByUnit, allHealth, activeTabId, onClose }) {
    const [viewMode, setViewMode] = useState('event');

    const activeCells = useMemo(() => {
        const allCells = activeTab?.cells || [];
        const enabledCellIds = Array.isArray(section?.enabledCellIds)
            ? section.enabledCellIds
            : allCells.map(cell => cell.id);
        return allCells.filter(cell => enabledCellIds.includes(cell.id));
    }, [activeTab, section]);

    const gradeCells = useMemo(() => activeCells.filter(cell => cell.useGrade), [activeCells]);
    const unitsWithSoldiers = useMemo(() => soldiersByUnit.filter(group => group.soldiers.length > 0), [soldiersByUnit]);

    return (
        <div className="fit-popup-overlay" onClick={onClose}>
            <div className="fit-popup fit-popup-chart" onClick={e => e.stopPropagation()}>
                <div className="fit-popup-header fit-popup-header-row">
                    <div>
                        <div>{section.name} 분포 차트</div>
                        <div className="fit-popup-subtitle">활성 종목 {activeCells.length}개 기준</div>
                    </div>
                    <div className="fit-popup-header-actions">
                        <button type="button" className={`fit-popup-tab-btn ${viewMode === 'event' ? 'active' : ''}`} onClick={() => setViewMode('event')}>종목별</button>
                        <button type="button" className={`fit-popup-tab-btn ${viewMode === 'unit' ? 'active' : ''}`} onClick={() => setViewMode('unit')}>중대별</button>
                        <button type="button" onClick={onClose}>닫기</button>
                    </div>
                </div>
                <div className="fit-popup-body fit-popup-chart-body">
                    {gradeCells.length === 0 ? (
                        <div className="fit-chart-empty">활성화된 등급 종목이 없어 분포 차트를 그릴 수 없습니다.</div>
                    ) : viewMode === 'event' ? (
                        <div className="fit-popup-chart-grid">
                            {gradeCells.map(cell => (
                                <SectionEventComparisonChart
                                    key={cell.id}
                                    section={section}
                                    cell={cell}
                                    unitsWithSoldiers={unitsWithSoldiers}
                                    allHealth={allHealth}
                                    activeTabId={activeTabId}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="fit-popup-chart-grid">
                            {unitsWithSoldiers.map(group => (
                                <SectionUnitComparisonChart
                                    key={group.unit.id}
                                    section={section}
                                    unit={group.unit}
                                    unitSoldiers={group.soldiers}
                                    cells={gradeCells}
                                    allHealth={allHealth}
                                    activeTabId={activeTabId}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SectionEventComparisonChart({ section, cell, unitsWithSoldiers, allHealth, activeTabId }) {
    const gradeSettings = useMemo(() => getGradeLevels(cell), [cell]);

    const points = useMemo(() => {
        const data = [];
        unitsWithSoldiers.forEach((group, unitIdx) => {
            const rawPoints = [];
            group.soldiers.forEach(soldier => {
                const raw = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, section.id, cell.id);
                const normalized = getNormalizedScore(raw, gradeSettings);
                if (raw === null || raw === undefined || raw === '' || raw === '소견서' || raw === '열외' || normalized === null) return;

                rawPoints.push({
                    y: normalized,
                    raw,
                    unitName: group.unit.name,
                    soldierName: `${soldier.rank} ${soldier.name}`,
                });
            });
            data.push(...calculateBeeswarmX(rawPoints, unitIdx));
        });
        return data;
    }, [unitsWithSoldiers, allHealth, activeTabId, section.id, cell, gradeSettings]);

    if (points.length === 0) return null;

    const labels = unitsWithSoldiers.map(group => group.unit.name);
    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: { display: false },
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (ctxList) => ctxList[0]?.raw?.unitName || '',
                    label: (ctx) => {
                        const point = ctx.raw;
                        const isTimeType = cell.type === 'i:s' || cell.type === 'h:i:s';
                        const displayValue = isTimeType ? fitnessUtils.secondsToDisplay(point.raw, cell.type) : point.raw;
                        const grade = fitnessUtils.calcGrade(point.raw, cell);
                        return `${point.soldierName}: ${displayValue}${grade ? ` [${grade.name}]` : ''}`;
                    }
                }
            }
        },
        scales: {
            y: buildGradeAxisOptions([cell]),
            x: {
                type: 'linear',
                min: -0.5,
                max: labels.length - 0.5,
                ticks: {
                    stepSize: 1,
                    autoSkip: false,
                    callback: function (val) {
                        if (Number.isInteger(val) && labels[val]) return labels[val];
                        return '';
                    },
                    font: { size: 10, weight: 'bold' },
                    maxRotation: 35,
                },
                grid: { color: 'rgba(0,0,0,0.06)' },
            }
        }
    }), [cell, labels]);

    return (
        <div className="fit-popup-chart-card">
            <div className="fit-popup-chart-title">{cell.text}</div>
            <div className="fit-popup-chart-frame">
                <LiteChart
                    data={{
                        labels,
                        datasets: [{
                            label: cell.text,
                            data: points,
                            type: 'scatter',
                            backgroundColor: (cell.color || EVENT_COLORS[0]) + '88',
                            borderColor: (cell.color || EVENT_COLORS[0]) + 'CC',
                            pointRadius: 4,
                            pointHoverRadius: 5,
                        }],
                    }}
                    options={options}
                />
            </div>
        </div>
    );
}

function SectionUnitComparisonChart({ section, unit, unitSoldiers, cells, allHealth, activeTabId }) {
    const gradeSettingsMap = useMemo(() => {
        const map = {};
        cells.forEach(cell => {
            map[cell.id] = getGradeLevels(cell);
        });
        return map;
    }, [cells]);

    const labels = useMemo(() => cells.map(cell => truncLabel(cell.text)), [cells]);

    const datasets = useMemo(() => cells.map((cell, cellIdx) => {
        const rawPoints = [];
        unitSoldiers.forEach(soldier => {
            const raw = fitnessController.getCellValue(allHealth, soldier.id, activeTabId, section.id, cell.id);
            const normalized = getNormalizedScore(raw, gradeSettingsMap[cell.id]);
            if (raw === null || raw === undefined || raw === '' || raw === '소견서' || raw === '열외' || normalized === null) return;

            rawPoints.push({
                y: normalized,
                raw,
                eventName: cell.text,
                soldierName: `${soldier.rank} ${soldier.name}`,
            });
        });

        const points = calculateBeeswarmX(rawPoints, cellIdx);

        return {
            label: cell.text,
            data: points,
            type: 'scatter',
            backgroundColor: (cell.color || EVENT_COLORS[cellIdx % EVENT_COLORS.length]) + '88',
            borderColor: (cell.color || EVENT_COLORS[cellIdx % EVENT_COLORS.length]) + 'CC',
            pointRadius: 4,
            pointHoverRadius: 5,
        };
    }), [cells, unitSoldiers, allHealth, activeTabId, section.id, gradeSettingsMap]);

    const hasData = datasets.some(dataset => dataset.data.length > 0);
    if (!hasData) return null;

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: { display: false },
            legend: { position: 'bottom', labels: { font: { size: 10 }, boxWidth: 12 } },
            tooltip: {
                callbacks: {
                    title: (ctxList) => ctxList[0]?.raw?.eventName || '',
                    label: (ctx) => {
                        const point = ctx.raw;
                        const cell = cells[ctx.datasetIndex];
                        const isTimeType = cell.type === 'i:s' || cell.type === 'h:i:s';
                        const displayValue = isTimeType ? fitnessUtils.secondsToDisplay(point.raw, cell.type) : point.raw;
                        const grade = fitnessUtils.calcGrade(point.raw, cell);
                        return `${point.soldierName}: ${displayValue}${grade ? ` [${grade.name}]` : ''}`;
                    }
                }
            }
        },
        scales: {
            y: buildGradeAxisOptions(cells),
            x: {
                type: 'linear',
                min: -0.5,
                max: labels.length - 0.5,
                ticks: {
                    stepSize: 1,
                    autoSkip: false,
                    callback: function (val) {
                        if (Number.isInteger(val) && labels[val]) return labels[val];
                        return '';
                    },
                    font: { size: 10, weight: 'bold' },
                    maxRotation: 35,
                },
                grid: { color: 'rgba(0,0,0,0.06)' },
            }
        }
    }), [cells, labels]);

    return (
        <div className="fit-popup-chart-card fit-popup-chart-card-wide">
            <div className="fit-popup-chart-title">{unit.name}</div>
            <div className="fit-popup-chart-frame">
                <LiteChart data={{ labels, datasets }} options={options} />
            </div>
        </div>
    );
}
