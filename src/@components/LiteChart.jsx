/**
 * LiteChart — 경량 자체 차트 엔진
 * chart.js / react-chartjs-2 / chartjs-plugin-annotation 대체
 *
 * 지원 차트 유형: bar, line, scatter
 * 지원 기능: 범례, 툴팁, annotation 선, 바 위 텍스트, 반응형
 */
import { useRef, useEffect, useState, useCallback } from 'preact/hooks';

// ─── 유틸 ──────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function resolveFontStr(size, weight) {
    return `${weight || 'normal'} ${size || 12}px sans-serif`;
}

// ─── 메인 컴포넌트 ─────────────────────────────────────
/**
 * props:
 *   data     : { labels: string[], datasets: Dataset[] }
 *   options  : Options 객체 (chart.js 호환 형식 그대로 사용)
 *   plugins  : [{ id, afterDatasetsDraw(chartProxy) }] — bar 위 텍스트 등
 *   width/height : 픽셀 (기본 responsive fill)
 *   style    : wrapper 스타일
 *
 * Dataset: { label, data, type('bar'|'line'|'scatter'), backgroundColor, borderColor,
 *            borderWidth, borderRadius, pointRadius, pointHoverRadius,
 *            maxBarThickness, tension, fill, spanGaps, minBarLength, rawValues }
 *
 * Options (chart.js 호환 서브셋):
 *   responsive, maintainAspectRatio,
 *   plugins: { title, legend, tooltip: { callbacks: { title, label } }, annotation: { annotations } }
 *   scales: { x: { type, min, max, ticks, grid, offset }, y: { min, max, ticks, grid } }
 */
export default function LiteChart({ data, options = {}, plugins: externalPlugins = [], style }) {
    const canvasRef = useRef(null);
    const wrapperRef = useRef(null);
    const [tooltip, setTooltip] = useState(null);
    const [hoveredDataset, setHoveredDataset] = useState(null);
    const [hiddenDatasets, setHiddenDatasets] = useState(new Set());
    const hitRectsRef = useRef([]);         // {x,y,w,h, dsIdx, ptIdx, type}
    const legendRectsRef = useRef([]);      // {x,y,w,h, dsIdx}

    // ─── 그리기 ──────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const wrapper = wrapperRef.current;
        if (!wrapper) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = wrapper.getBoundingClientRect();
        const W = Math.floor(rect.width);
        const H = Math.floor(rect.height);
        if (W <= 0 || H <= 0) return;

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';

        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        const { labels = [], datasets = [] } = data || {};
        const o = options || {};
        const scalesOpt = o.scales || {};
        const yOpt = scalesOpt.y || {};
        const xOpt = scalesOpt.x || {};
        const pluginsOpt = o.plugins || {};
        const legendOpt = pluginsOpt.legend || {};
        const annotationOpt = pluginsOpt.annotation || {};

        // 범례 높이 계산
        const showLegend = legendOpt.display !== false;
        const legendFontSize = legendOpt.labels?.font?.size || 11;
        const legendBoxW = legendOpt.labels?.boxWidth || 14;
        const legendPad = legendOpt.labels?.padding || 10;
        const legendH = showLegend ? legendFontSize + legendPad * 2 + 6 : 0;

        // 패딩
        const PADDING = { top: 16, right: 20, bottom: 30 + legendH, left: 50 };

        // Y축 라벨 최대 폭 측정
        const yTickCb = yOpt.ticks?.callback;
        const yTickFont = resolveFontStr(yOpt.ticks?.font?.size || 11, yOpt.ticks?.font?.weight);
        ctx.font = yTickFont;

        // Y range
        let yMin = yOpt.min ?? 0;
        let yMax = yOpt.max ?? 10;
        if (yMax <= yMin) yMax = yMin + 1;
        const yStepSize = yOpt.ticks?.stepSize || 1;

        // Y축 라벨 폭 측정
        let maxYLabelW = 0;
        for (let v = yMin; v <= yMax + 0.001; v += yStepSize) {
            const txt = yTickCb ? yTickCb(v) : String(Math.round(v * 100) / 100);
            if (txt) { const w = ctx.measureText(txt).width; if (w > maxYLabelW) maxYLabelW = w; }
        }
        PADDING.left = Math.max(PADDING.left, maxYLabelW + 20);

        const plotX = PADDING.left;
        const plotY = PADDING.top;
        const plotW = W - PADDING.left - PADDING.right;
        const plotH = H - PADDING.top - PADDING.bottom;
        if (plotW <= 0 || plotH <= 0) return;

        // 스케일 함수
        const isLinearX = xOpt.type === 'linear';
        const hasOffset = xOpt.offset === true;
        let xMin = isLinearX ? (xOpt.min ?? 0) : 0;
        let xMax = isLinearX ? (xOpt.max ?? labels.length - 1) : labels.length - 1;
        // offset: true → 양쪽에 0.5 패딩 추가 (첫/마지막 구역이 동일 크기)
        if (isLinearX && hasOffset) { xMin -= 0.5; xMax += 0.5; }
        const xRange = xMax - xMin || 1;

        const toCanvasX = (v) => plotX + ((v - xMin) / xRange) * plotW;
        // 카테고리 모드: 각 라벨의 중앙 X 위치 (바 그룹과 동일)
        const categoryCount = labels.length || 1;
        const catCenterX = (i) => plotX + (plotW / categoryCount) * i + (plotW / categoryCount) / 2;
        const toCanvasY = (v) => plotY + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

        // ─── 그리드 ───────────────────────────────
        // Y grid
        ctx.strokeStyle = yOpt.grid?.color || 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1;
        if (yOpt.grid?.borderDash) ctx.setLineDash(yOpt.grid.borderDash);
        for (let v = yMin; v <= yMax + 0.001; v += yStepSize) {
            const cy = toCanvasY(v);
            ctx.beginPath(); ctx.moveTo(plotX, cy); ctx.lineTo(plotX + plotW, cy); ctx.stroke();
        }
        ctx.setLineDash([]);

        // X grid
        if (xOpt.grid?.display !== false && isLinearX) {
            const xgColor = xOpt.grid?.color || 'rgba(0,0,0,0.06)';
            const xgDash = xOpt.grid?.borderDash || [];
            ctx.strokeStyle = xgColor;
            ctx.setLineDash(xgDash);
            for (let i = Math.ceil(xMin); i <= xMax; i++) {
                const cx = toCanvasX(i);
                ctx.beginPath(); ctx.moveTo(cx, plotY); ctx.lineTo(cx, plotY + plotH); ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // ─── Y축 라벨 ────────────────────────────
        ctx.font = yTickFont;
        ctx.fillStyle = yOpt.ticks?.color || '#444';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let v = yMin; v <= yMax + 0.001; v += yStepSize) {
            const txt = yTickCb ? yTickCb(v) : '';
            if (txt) ctx.fillText(txt, plotX - 8, toCanvasY(v));
        }

        // ─── X축 라벨 ────────────────────────────
        const xTickFont = resolveFontStr(xOpt.ticks?.font?.size || 11, xOpt.ticks?.font?.weight);
        ctx.font = xTickFont;
        ctx.fillStyle = xOpt.ticks?.color || '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const xTickCb = xOpt.ticks?.callback;

        if (isLinearX) {
            const xStep = xOpt.ticks?.stepSize || 1;
            const origXMin = xOpt.min ?? 0;
            const origXMax = xOpt.max ?? labels.length - 1;
            for (let i = Math.ceil(origXMin); i <= origXMax; i += xStep) {
                const txt = xTickCb ? xTickCb(i) : (labels[i] || '');
                if (txt) ctx.fillText(txt, toCanvasX(i), plotY + plotH + 8);
            }
        } else {
            // 카테고리 모드: 바 그룹 중앙에 라벨 배치
            labels.forEach((lbl, i) => {
                ctx.fillText(lbl, catCenterX(i), plotY + plotH + 8);
            });
        }

        // ─── Annotations ─────────────────────────
        const annotations = annotationOpt.annotations || {};
        Object.values(annotations).forEach(a => {
            if (a.type !== 'line') return;
            ctx.strokeStyle = a.borderColor || 'rgba(0,0,0,0.3)';
            ctx.lineWidth = a.borderWidth || 1;
            if (a.borderDash) ctx.setLineDash(a.borderDash);
            else ctx.setLineDash([]);

            if (a.yMin !== undefined && a.yMax !== undefined && a.xMin === undefined) {
                // horizontal line
                const cy = toCanvasY(a.yMin);
                ctx.beginPath(); ctx.moveTo(plotX, cy); ctx.lineTo(plotX + plotW, cy); ctx.stroke();
            }
            if (a.xMin !== undefined && a.xMax !== undefined && a.yMin === undefined) {
                // vertical line
                const cx = toCanvasX(a.xMin);
                ctx.beginPath(); ctx.moveTo(cx, plotY); ctx.lineTo(cx, plotY + plotH); ctx.stroke();
            }
            ctx.setLineDash([]);
        });

        // ─── 데이터셋 그리기 ──────────────────────
        const hitRects = [];

        // determine bar grouping
        const barDatasets = datasets.map((ds, i) => ({ ds, i })).filter(d => (d.ds.type || 'bar') === 'bar' && !hiddenDatasets.has(d.i));
        const barCount = barDatasets.length;

        // bar width calc — maxBarThickness 기반, 2px 간격
        const barGap = 2;
        const defaultBarW = barDatasets.length > 0 ? (barDatasets[0].ds.maxBarThickness ?? 30) : 30;
        const groupTotalW = barCount * defaultBarW + Math.max(0, barCount - 1) * barGap;

        datasets.forEach((ds, dsIdx) => {
            if (hiddenDatasets.has(dsIdx)) return;
            const type = ds.type || 'bar';
            const bgColor = ds.backgroundColor || '#3B82F6';
            const borderColor = ds.borderColor || bgColor;
            const borderWidth = ds.borderWidth ?? 1;
            const pointRadius = ds.pointRadius ?? 4;
            const borderRadius = ds.borderRadius ?? 0;
            const minBarLength = ds.minBarLength ?? 0;
            const maxBarThickness = ds.maxBarThickness ?? 30;

            if (type === 'bar') {
                const barIdx = barDatasets.findIndex(b => b.i === dsIdx);
                const bw = maxBarThickness;

                ds.data.forEach((val, ptIdx) => {
                    if (val === null || val === undefined) return;
                    const catCenter = catCenterX(ptIdx);
                    const groupStart = catCenter - groupTotalW / 2;
                    const bx = groupStart + barIdx * (bw + barGap);
                    const zeroY = toCanvasY(Math.max(0, yMin));
                    let barTop = toCanvasY(val);
                    let barH = zeroY - barTop;
                    if (val < 0) { barTop = zeroY; barH = toCanvasY(val) - zeroY; }
                    if (Math.abs(barH) < minBarLength) barH = val >= 0 ? -minBarLength : minBarLength;

                    const actualBarTop = val >= 0 ? barTop : barTop;
                    const actualBarH = val >= 0 ? barH : barH;

                    ctx.fillStyle = bgColor;
                    if (borderRadius > 0) {
                        roundRect(ctx, bx, Math.min(actualBarTop, actualBarTop + actualBarH), bw, Math.abs(actualBarH), borderRadius);
                        ctx.fill();
                    } else {
                        ctx.fillRect(bx, actualBarTop, bw, actualBarH);
                    }
                    if (borderWidth > 0) {
                        ctx.strokeStyle = borderColor;
                        ctx.lineWidth = borderWidth;
                        if (borderRadius > 0) {
                            roundRect(ctx, bx, Math.min(actualBarTop, actualBarTop + actualBarH), bw, Math.abs(actualBarH), borderRadius);
                            ctx.stroke();
                        } else {
                            ctx.strokeRect(bx, actualBarTop, bw, actualBarH);
                        }
                    }

                    hitRects.push({
                        x: bx, y: Math.min(actualBarTop, actualBarTop + actualBarH),
                        w: bw, h: Math.abs(actualBarH),
                        dsIdx, ptIdx, type: 'bar',
                        cx: bx + bw / 2, cy: val >= 0 ? barTop : barTop + barH
                    });
                });
            } else if (type === 'line') {
                const points = [];
                ds.data.forEach((val, ptIdx) => {
                    if (val === null || val === undefined) { points.push(null); return; }
                    let cx, cy;
                    if (isLinearX) {
                        cx = toCanvasX(ptIdx);
                    } else {
                        // 카테고리 모드: 바 그룹 중앙과 동일 위치 사용
                        cx = catCenterX(ptIdx);
                    }
                    cy = toCanvasY(val);
                    points.push({ cx, cy, ptIdx });
                });

                // draw line
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = borderWidth;
                ctx.beginPath();
                let started = false;
                const tension = ds.tension || 0;

                if (tension > 0 && points.filter(p => p !== null).length > 2) {
                    drawSmoothLine(ctx, points, tension, ds.spanGaps);
                } else {
                    for (let i = 0; i < points.length; i++) {
                        if (points[i] === null) {
                            if (!ds.spanGaps) started = false;
                            continue;
                        }
                        if (!started) { ctx.moveTo(points[i].cx, points[i].cy); started = true; }
                        else ctx.lineTo(points[i].cx, points[i].cy);
                    }
                    ctx.stroke();
                }

                // fill
                if (ds.fill) {
                    const baseY = toCanvasY(0);
                    ctx.fillStyle = bgColor;
                    ctx.beginPath();
                    let fillStarted = false;
                    for (let i = 0; i < points.length; i++) {
                        if (points[i] === null) continue;
                        if (!fillStarted) { ctx.moveTo(points[i].cx, baseY); ctx.lineTo(points[i].cx, points[i].cy); fillStarted = true; }
                        else ctx.lineTo(points[i].cx, points[i].cy);
                    }
                    for (let i = points.length - 1; i >= 0; i--) {
                        if (points[i] !== null) { ctx.lineTo(points[i].cx, baseY); break; }
                    }
                    ctx.closePath();
                    ctx.fill();
                }

                // draw points
                points.forEach(pt => {
                    if (!pt) return;
                    ctx.fillStyle = borderColor;
                    ctx.beginPath();
                    ctx.arc(pt.cx, pt.cy, pointRadius, 0, Math.PI * 2);
                    ctx.fill();

                    hitRects.push({
                        x: pt.cx - pointRadius - 2,
                        y: pt.cy - pointRadius - 2,
                        w: (pointRadius + 2) * 2,
                        h: (pointRadius + 2) * 2,
                        dsIdx,
                        ptIdx: pt.ptIdx,
                        type: 'line',
                        cx: pt.cx,
                        cy: pt.cy,
                        hitRadius: pointRadius + 8,
                    });
                });
            } else if (type === 'scatter') {
                const pr = pointRadius;
                ds.data.forEach((pt, ptIdx) => {
                    if (!pt || pt.x === undefined || pt.y === undefined) return;
                    const cx = toCanvasX(pt.x);
                    const cy = toCanvasY(pt.y);
                    ctx.fillStyle = bgColor;
                    ctx.strokeStyle = borderColor;
                    ctx.lineWidth = borderWidth;
                    ctx.beginPath();
                    ctx.arc(cx, cy, pr, 0, Math.PI * 2);
                    ctx.fill();
                    if (borderWidth > 0) ctx.stroke();
                    hitRects.push({
                        x: cx - pr - 2,
                        y: cy - pr - 2,
                        w: (pr + 2) * 2,
                        h: (pr + 2) * 2,
                        dsIdx,
                        ptIdx,
                        type: 'scatter',
                        cx,
                        cy,
                        hitRadius: pr + 10,
                    });
                });
            }
        });

        // ─── External plugins (afterDatasetsDraw) ──
        if (externalPlugins && externalPlugins.length > 0) {
            // chartProxy — chart.js 호환 최소 인터페이스
            const chartProxy = {
                ctx,
                data,
                getDatasetMeta(i) {
                    const rects = hitRects.filter(r => r.dsIdx === i);
                    return {
                        hidden: hiddenDatasets.has(i),
                        data: datasets[i].data.map((_, pIdx) => {
                            const r = rects.find(r2 => r2.ptIdx === pIdx);
                            return r ? { x: r.cx, y: r.cy } : { x: 0, y: 0 };
                        })
                    };
                }
            };
            externalPlugins.forEach(p => {
                if (p.afterDatasetsDraw) p.afterDatasetsDraw(chartProxy);
            });
        }

        // ─── 범례 그리기 ─────────────────────────
        const legendRects = [];
        if (showLegend) {
            const legendY = H - legendH + legendPad;
            ctx.font = resolveFontStr(legendFontSize, 'normal');
            let lx = plotX;
            datasets.forEach((ds, i) => {
                const isHidden = hiddenDatasets.has(i);
                const color = ds.borderColor || ds.backgroundColor || '#333';

                ctx.fillStyle = isHidden ? '#ccc' : color;
                ctx.fillRect(lx, legendY, legendBoxW, legendFontSize);

                ctx.fillStyle = isHidden ? '#aaa' : '#333';
                const truncLbl = ds.label && ds.label.length > 12 ? ds.label.slice(0, 12) + '…' : (ds.label || '');
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'left';
                ctx.fillText(truncLbl, lx + legendBoxW + 4, legendY + legendFontSize / 2);

                const tw = ctx.measureText(truncLbl).width;
                const entryW = legendBoxW + 4 + tw + legendPad;
                legendRects.push({ x: lx, y: legendY - 2, w: entryW, h: legendFontSize + 4, dsIdx: i });
                lx += entryW;
            });
        }

        hitRectsRef.current = hitRects;
        legendRectsRef.current = legendRects;
    }, [data, options, externalPlugins, hiddenDatasets, hoveredDataset]);

    // ─── ResizeObserver ──────────────────────────
    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        const ro = new ResizeObserver(() => draw());
        ro.observe(wrapper);
        draw();
        return () => ro.disconnect();
    }, [draw]);

    // ─── 마우스 이벤트 ──────────────────────────
    const handleMouseMove = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        // 범례 hover
        for (const lr of legendRectsRef.current) {
            if (mx >= lr.x && mx <= lr.x + lr.w && my >= lr.y && my <= lr.y + lr.h) {
                canvas.style.cursor = 'pointer';
                return;
            }
        }

        // 데이터 hit test
        let found = null;
        let bestDistance = Number.POSITIVE_INFINITY;
        for (const hr of hitRectsRef.current) {
            if (hr.type === 'scatter' || hr.type === 'line') {
                const dx = mx - hr.cx;
                const dy = my - hr.cy;
                const distance = Math.sqrt((dx * dx) + (dy * dy));
                if (distance <= (hr.hitRadius ?? 12) && distance < bestDistance) {
                    found = hr;
                    bestDistance = distance;
                }
                continue;
            }

            if (mx >= hr.x && mx <= hr.x + hr.w && my >= hr.y && my <= hr.y + hr.h) {
                found = hr;
                bestDistance = 0;
                break;
            }
        }

        if (found) {
            canvas.style.cursor = 'pointer';
            const ds = data.datasets[found.dsIdx];
            const tooltipCb = options?.plugins?.tooltip?.callbacks || {};

            let title = '';
            let label = '';

            if (found.type === 'scatter') {
                const pt = ds.data[found.ptIdx];
                if (tooltipCb.title) title = tooltipCb.title([{ raw: pt, datasetIndex: found.dsIdx, dataIndex: found.ptIdx }]);
                if (tooltipCb.label) {
                    label = tooltipCb.label({
                        datasetIndex: found.dsIdx, dataIndex: found.ptIdx,
                        raw: pt,
                        parsed: { x: pt.x, y: pt.y },
                        chart: { data },
                        dataset: ds,
                    });
                } else {
                    label = `${ds.label}: ${pt.raw || pt.y}`;
                }
            } else {
                const val = ds.data[found.ptIdx];
                const lbl = data.labels?.[found.ptIdx] || '';
                title = lbl;
                if (tooltipCb.label) {
                    label = tooltipCb.label({
                        datasetIndex: found.dsIdx, dataIndex: found.ptIdx,
                        raw: val,
                        parsed: { x: found.ptIdx, y: val },
                        chart: { data },
                        dataset: ds,
                    });
                } else {
                    label = `${ds.label}: ${val}`;
                }
            }

            setTooltip({ x: found.cx, y: found.cy, title, label });
        } else {
            canvas.style.cursor = 'default';
            setTooltip(null);
        }
    }, [data, options]);

    const handleMouseLeave = useCallback(() => {
        setTooltip(null);
        if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    }, []);

    const handleClick = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        for (const lr of legendRectsRef.current) {
            if (mx >= lr.x && mx <= lr.x + lr.w && my >= lr.y && my <= lr.y + lr.h) {
                setHiddenDatasets(prev => {
                    const next = new Set(prev);
                    if (next.has(lr.dsIdx)) next.delete(lr.dsIdx);
                    else next.add(lr.dsIdx);
                    return next;
                });
                return;
            }
        }
    }, []);

    return (
        <div ref={wrapperRef} style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                style={{ display: 'block', width: '100%', height: '100%' }}
            />
            {tooltip && (
                <div style={{
                    position: 'absolute',
                    left: clamp(tooltip.x + 12, 0, (wrapperRef.current?.clientWidth || 300) - 160),
                    top: clamp(tooltip.y - 40, 0, (wrapperRef.current?.clientHeight || 200) - 50),
                    background: 'rgba(0,0,0,0.85)',
                    color: '#fff',
                    padding: '6px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 'bold',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                    zIndex: 10,
                    maxWidth: 240,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {tooltip.title && <div style={{ fontSize: 11, color: '#ccc', marginBottom: 2 }}>{tooltip.title}</div>}
                    <div>{tooltip.label}</div>
                </div>
            )}
        </div>
    );
}

// ─── 유틸 함수들 ──────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
}

function drawSmoothLine(ctx, points, tension, spanGaps) {
    const valid = [];
    for (let i = 0; i < points.length; i++) {
        if (points[i] !== null) valid.push(points[i]);
        else if (!spanGaps && valid.length > 0) {
            drawCurveSegment(ctx, valid, tension);
            valid.length = 0;
        }
    }
    if (valid.length > 0) drawCurveSegment(ctx, valid, tension);
}

function drawCurveSegment(ctx, pts, tension) {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].cx, pts[0].cy);

    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];

        const cp1x = p1.cx + (p2.cx - p0.cx) * tension / 3;
        const cp1y = p1.cy + (p2.cy - p0.cy) * tension / 3;
        const cp2x = p2.cx - (p3.cx - p1.cx) * tension / 3;
        const cp2y = p2.cy - (p3.cy - p1.cy) * tension / 3;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.cx, p2.cy);
    }
    ctx.stroke();
}
