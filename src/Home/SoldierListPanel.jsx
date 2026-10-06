import { useState, useEffect, useCallback, useRef } from 'preact/hooks';
import { soldiersController } from '../@controllers/soldiersController';
import { colorSettingsController } from '../@controllers/colorSettingsController';
import { soldierCategoriesController } from '../@controllers/soldierCategoriesController';
import { calcServiceDays, arrToDate } from '../@modules/dates';
import { UNITS } from '../@modules/configs';
import { __controllers } from '../@controllers/__controllers';
import { plugins } from '../@modules/plugins';
import ModalPopup from '../@components/ModalPopup';
import ColorSettingsPopup from './ColorSettingsPopup';
import { EditSoldier } from '../Soldiers/EditSoldier';
import useReferenceDate from './@hooks/useReferenceDate';

const fmtDate = (arr) => {
    if (!arr || arr.length < 3) return '-';
    return `${arr[0]}.${String(arr[1]).padStart(2, '0')}.${String(arr[2]).padStart(2, '0')}`;
};

export default function SoldierListPanel() {
    const [allSoldiers, setAllSoldiers] = useState([]);
    const [zzamColors, setZzamColors] = useState([]);
    const [categoryColorMap, setCategoryColorMap] = useState({});
    const [categories, setCategories] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const printRef = useRef(null);
    const {
        refDate,
        formatRefDate,
        shiftRefDate,
        resetRefDate,
    } = useReferenceDate();

    const loadData = useCallback(async () => {
        const [list, colors, catColors, cats] = await Promise.all([
            soldiersController.get(),
            colorSettingsController.get(),
            colorSettingsController.getCategoryColors(),
            soldierCategoriesController.get(),
        ]);
        setAllSoldiers(list);
        setZzamColors(colors);
        setCategoryColorMap(catColors);
        setCategories(cats);
    }, []);

    useEffect(() => { loadData(); }, []);

    // 오늘 날짜(실제) 기준으로 월 필터: 전입일 <= 오늘이 속한 월 말일, 전역일 >= 오늘이 속한 월 1일
    const filterByCurrentMonth = (list) => {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth(); // 0-based
        const monthStart = new Date(y, m, 1);
        const monthEnd = new Date(y, m + 1, 0);
        const nowDay = new Date(y, m, now.getDate());
        return list.filter(s => {
            const joinDate = arrToDate(s.joinDate || s.startDate);
            const exitDate = arrToDate(s.exitDate);
            if (!joinDate || !exitDate) return false;
            return joinDate <= monthEnd && exitDate >= nowDay;
        });
    };

    // 용사 (간부가 아닌 병사), 남은일 오름차순
    const soldiers = filterByCurrentMonth(
        allSoldiers.filter(s => !s.categories || !s.categories.includes('officer'))
    ).sort((a, b) => calcServiceDays.remaining(a.exitDate) - calcServiceDays.remaining(b.exitDate));

    // 간부 목록
    const officers = filterByCurrentMonth(
        allSoldiers.filter(s => s.categories && s.categories.includes('officer'))
    );

    const openColorSettings = () => {
        ModalPopup.push(
            <ColorSettingsPopup onClose={() => { loadData(); }} onUpdate={() => { loadData(); }} />
        );
    };

    const openEditSoldier = (soldier) => {
        ModalPopup.push(
            <EditSoldier soldier={soldier} onSave={() => { loadData(); }} />
        );
    };

    const getUnitName = (unitId) => {
        const u = UNITS.find(u => u.id === unitId);
        return u ? u.mini_name : unitId;
    };

    // 동기 그룹 결정 (3개월 단위): 1~3월=0, 4~6월=1, 7~9월=2, 10~12월=3
    const getDonggiGroup = (soldier) => {
        const startDate = soldier.startDate;
        if (!startDate || startDate.length < 2) return null;
        const year = startDate[0];
        const month = startDate[1]; // 1-based
        const quarter = Math.floor((month - 1) / 3); // 0~3
        return { year, quarter };
    };

    // 동기끼리 서열 계산 (같은 동기 그룹 내 입대일 순서)
    const calcDonggiRank = (soldier) => {
        const group = getDonggiGroup(soldier);
        if (!group) return '-';

        // 같은 동기 그룹 찾기
        const sameGroup = soldiers.filter(s => {
            const g = getDonggiGroup(s);
            return g && g.year === group.year && g.quarter === group.quarter;
        });

        // 입대일 순서로 정렬
        const sorted = sameGroup.sort((a, b) => {
            const dateA = arrToDate(a.startDate);
            const dateB = arrToDate(b.startDate);
            if (!dateA || !dateB) return 0;
            return dateA - dateB;
        });

        const rank = sorted.findIndex(s => s.id === soldier.id) + 1;
        return rank > 0 ? rank : '-';
    };

    // 동기 그룹별 배경색 계산
    // 규칙: 1) 동기 중 가장 복무율 높은 사람의 복무율 색상 적용
    //       2) 윗서열 동기와 색상이 겹치면 다음 단계 색상 적용
    const getDonggiGroupColor = (soldier) => {
        const rd = refDate || undefined;

        // 동기 그룹별 정보 수집 (key: "year-quarter")
        const groupInfoMap = new Map();
        soldiers.forEach(s => {
            const g = getDonggiGroup(s);
            if (!g) return;
            const key = `${g.year}-${g.quarter}`;
            const pct = calcServiceDays.percentage(s.startDate, s.exitDate, rd);

            if (!groupInfoMap.has(key)) {
                groupInfoMap.set(key, { startDate: arrToDate(s.startDate), maxPct: pct });
            } else {
                const info = groupInfoMap.get(key);
                if (pct > info.maxPct) info.maxPct = pct;
            }
        });

        // 동기 그룹 순서 정렬 (입대일 기준 오름차순 = 복무율 높은 순)
        const sortedGroups = [...groupInfoMap.entries()]
            .sort((a, b) => a[1].startDate - b[1].startDate)
            .map(e => ({ key: e[0], maxPct: e[1].maxPct }));

        if (sortedGroups.length === 0 || zzamColors.length === 0) return null;

        // 각 동기 그룹에 색상 할당 (윗서열과 겹치면 다음 단계로)
        const usedColorIndices = new Set();
        const groupColorMap = new Map();

        for (const grp of sortedGroups) {
            // 해당 동기의 최고 복무율로 색상 인덱스 찾기
            let colorIdx = zzamColors.findIndex(c => grp.maxPct >= c.percentOver);
            if (colorIdx < 0) colorIdx = zzamColors.length - 1;

            // 윗서열과 색상이 겹치면 다음 단계로
            while (usedColorIndices.has(colorIdx) && colorIdx < zzamColors.length - 1) {
                colorIdx++;
            }

            usedColorIndices.add(colorIdx);
            groupColorMap.set(grp.key, zzamColors[colorIdx]);
        }

        const group = getDonggiGroup(soldier);
        if (!group) return null;

        const key = `${group.year}-${group.quarter}`;
        return groupColorMap.get(key) || null;
    };

    const getCategoryLabels = (soldier) => {
        if (!soldier.categories || soldier.categories.length === 0) return '';
        return soldier.categories
            .map(catId => {
                const cat = categories.find(c => c.id === catId);
                return cat ? cat.label : '';
            })
            .filter(Boolean)
            .join(', ');
    };

    const getSoldierStyle = (soldier) => {
        const rd = refDate || undefined;
        const pct = calcServiceDays.percentage(soldier.startDate, soldier.exitDate, rd);
        // 표시값(toFixed(1))과 동일한 반올림 값을 색상 판정에 사용
        const displayPct = parseFloat(pct.toFixed(1));
        const colorInfo = colorSettingsController.getSoldierColor(soldier, displayPct, zzamColors, categoryColorMap);
        const style = {};
        if (colorInfo.bg) style.backgroundColor = colorInfo.bg;
        if (colorInfo.color) style.color = colorInfo.color;
        if (colorInfo.border) style.border = `2px solid ${colorInfo.border}`;
        return style;
    };

    const handlePrint = () => {
        if (printRef.current) {
            plugins.print(printRef.current, { landscape: false });
        }
    };

    // 접힌 상태 컬럼: 계급/이름, 현복무, 남은일, 복무율, 중대
    // 펼친 상태 컬럼: 계급/이름, 입대일, 전역일, 총복무, 현복무, 남은일, 복무율, 중대, 분류

    const renderSoldierRow = (soldier, isOfficer) => {
        const rd = refDate || undefined;
        const served = calcServiceDays.current(soldier.startDate, rd);
        const remaining = calcServiceDays.remaining(soldier.exitDate, rd);
        const total = calcServiceDays.total(soldier.startDate, soldier.exitDate);
        const pct = calcServiceDays.percentage(soldier.startDate, soldier.exitDate, rd);
        const cellStyle = isOfficer ? { background: '#f5f5f5' } : getSoldierStyle(soldier);

        if (expanded) {
            return (
                <div
                    key={soldier.id}
                    className="soldier-list-row f row pointer"
                    style={cellStyle}
                    onClick={() => openEditSoldier(soldier)}
                >
                    <div className="sl-col sl-ex-name">
                        <span className="sl-rank">{soldier.rank}</span>
                        <span className="sl-name">{soldier.name}</span>
                    </div>
                    <div className="sl-col sl-ex-start tCenter">{fmtDate(soldier.startDate)}</div>
                    <div className="sl-col sl-ex-exit tCenter">{fmtDate(soldier.exitDate)}</div>
                    <div className="sl-col sl-ex-total tCenter">{total}일</div>
                    <div className="sl-col sl-ex-served tCenter">{served}일</div>
                    <div className="sl-col sl-ex-remain tCenter">{remaining}일</div>
                    <div className="sl-col sl-ex-rate tCenter">{pct.toFixed(1)}%</div>
                    <div className="sl-col sl-ex-unit tCenter">{getUnitName(soldier.unit)}</div>
                    <div className="sl-col sl-ex-donggi tCenter" style={getDonggiGroupColor(soldier) ? { backgroundColor: getDonggiGroupColor(soldier)?.bg, color: getDonggiGroupColor(soldier)?.color } : undefined}>{calcDonggiRank(soldier)}</div>
                    <div className="sl-col sl-ex-cat">{getCategoryLabels(soldier)}</div>
                </div>
            );
        }

        return (
            <div
                key={soldier.id}
                className="soldier-list-row f row pointer"
                style={cellStyle}
                onClick={() => openEditSoldier(soldier)}
            >
                <div className="sl-col sl-col-name">
                    <span className="sl-rank">{soldier.rank}</span>
                    <span className="sl-name">{soldier.name}</span>
                </div>
                <div className="sl-col sl-col-served tCenter">{served}일</div>
                <div className="sl-col sl-col-remain tCenter">{remaining}일</div>
                <div className="sl-col sl-col-rate tCenter">{pct.toFixed(1)}%</div>
                <div className="sl-col sl-col-unit tCenter">{getUnitName(soldier.unit)}</div>
            </div>
        );
    };

    return (
        <div className={`home-left f ${expanded ? 'home-left-expanded' : ''}`}>
            <div className="home-panel-header f row aCenter jBetween">
                <div className="f row aCenter" style={{ gap: 6 }}>
                    <span className="home-panel-title">용사목록</span>
                    <button
                        onClick={() => setExpanded(v => !v)}
                        style={{ fontSize: 11, padding: '2px 8px' }}
                        title={expanded ? '접기' : '펼치기'}
                    >
                        {expanded ? '◀ 접기' : '펼치기 ▶'}
                    </button>
                    {expanded && (
                        <button onClick={handlePrint} style={{ fontSize: 11, padding: '2px 8px' }}>
                            🖨 프린트
                        </button>
                    )}
                    {expanded && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                            <button onClick={() => shiftRefDate(-1)} style={{ fontSize: 11, padding: '2px 6px' }}>◀</button>
                            <span
                                style={{ fontSize: 11, fontWeight: 600, cursor: 'pointer', minWidth: 80, textAlign: 'center' }}
                                onClick={resetRefDate}
                                title="오늘 날짜로 초기화"
                            >
                                기준: {formatRefDate()}
                            </span>
                            <button onClick={() => shiftRefDate(1)} style={{ fontSize: 11, padding: '2px 6px' }}>▶</button>
                        </div>
                    )}
                </div>
                <button onClick={openColorSettings} style={{ fontSize: 12, padding: '3px 10px' }}>
                    복무율 색상 설정
                </button>
            </div>

            {/* 테이블 헤더 + 목록 */}
            <div className="f1" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }} ref={printRef}>
                {expanded ? (
                    <div className="soldier-list-header f row">
                        <div className="sl-col sl-ex-name">계급/이름</div>
                        <div className="sl-col sl-ex-start">입대일</div>
                        <div className="sl-col sl-ex-exit">전역일</div>
                        <div className="sl-col sl-ex-total">총복무</div>
                        <div className="sl-col sl-ex-served">현복무</div>
                        <div className="sl-col sl-ex-remain">남은일</div>
                        <div className="sl-col sl-ex-rate">복무율</div>
                        <div className="sl-col sl-ex-unit">중대</div>
                        <div className="sl-col sl-ex-donggi">동기</div>
                        <div className="sl-col sl-ex-cat">분류</div>
                    </div>
                ) : (
                    <div className="soldier-list-header f row">
                        <div className="sl-col sl-col-name">계급/이름</div>
                        <div className="sl-col sl-col-served">현복무</div>
                        <div className="sl-col sl-col-remain">남은일</div>
                        <div className="sl-col sl-col-rate">복무율</div>
                        <div className="sl-col sl-col-unit">중대</div>
                    </div>
                )}

                <div className="soldier-list-body" style={{ overflowY: 'auto', flex: 1 }}>
                    {soldiers.length === 0 && (
                        <div className="f ajCenter" style={{ padding: 40, color: 'var(--c4)' }}>
                            용사 데이터가 없습니다
                        </div>
                    )}
                    {soldiers.map(s => renderSoldierRow(s, false))}

                    {/* 간부 회차 */}
                    {officers.length > 0 && (
                        <>
                            <div style={{ height: 30 }} />
                            <div style={{
                                padding: '6px 10px',
                                fontSize: 12,
                                fontWeight: 700,
                                color: 'var(--c3)',
                                background: 'var(--c8)',
                                borderTop: '1px solid var(--c5)',
                                borderBottom: '1px solid var(--c6)',
                            }}>간부</div>
                            {officers.map(s => renderSoldierRow(s, true))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
