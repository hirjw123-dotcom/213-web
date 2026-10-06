import { useState, useEffect, useRef } from 'preact/hooks';
import { soldiersController } from '../../@controllers/soldiersController.js';
import { scheduleTypesController } from '../../@controllers/soldierScheduleTypesController.js';
import { scheduleHistoryController } from '../../@controllers/scheduleHistoryController.js';
import DB from '../../@modules/db.js';
import { _getScheduleKey, _arrEq, filterValidSoldiers } from '../@modules/utils.js';
import { parseExcelTable, parseCellTextToLabels } from '../@modules/excelParser.js';
import { excelPasteModalCss } from './css/excelPasteModalCss.js';

// ========================================
// 엑셀 붙여넣기 모달
// ========================================
export default function ExcelPasteModal({ year, month, onClose, onComplete, pushUndoAction }) {
    const pasteRef = useRef(null);
    const [parsedData, setParsedData] = useState(null);
    const [matchResult, setMatchResult] = useState(null);
    const [manualSelections, setManualSelections] = useState({});
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState('paste'); // 'paste' | 'preview'
    const [scheduleTypes, setScheduleTypes] = useState([]);

    useEffect(() => {
        scheduleTypesController.get().then(setScheduleTypes);
    }, []);

    const getTypeStyle = (label) => {
        const t = scheduleTypes.find(st => st.label === label);
        if (t) return { background: t.bg, color: t.color, fontWeight: t.bold ? 'bold' : 'normal' };
        return { background: '#eee', color: '#333' };
    };

    const getSoldierOptionLabel = (soldier) => {
        const enlistDate = soldier?.enlistDate || soldier?.joinDate || soldier?.입대일 || '-';
        return `${soldier.rank} ${soldier.name} ${enlistDate}`;
    };

    const getResolvedManualMatches = () => {
        if (!matchResult?.requiresSelection?.length) return [];
        return matchResult.requiresSelection.flatMap((entry, index) => {
            const selectedId = manualSelections[index];
            if (!selectedId) return [];
            const soldier = entry.candidates.find(candidate => String(candidate.id) === String(selectedId));
            if (!soldier) return [];
            return [{
                rank: entry.rank,
                name: entry.name,
                schedules: entry.schedules,
                soldierId: soldier.id,
            }];
        });
    };

    const getSyncTargets = () => ([...(matchResult?.matched || []), ...getResolvedManualMatches()]);

    // 붙여넣기 이벤트 처리
    const handlePaste = async (e) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');

        // contenteditable 내용 초기화
        if (pasteRef.current) pasteRef.current.innerHTML = '';

        if (!html) {
            setParsedData(null);
            setMatchResult(null);
            if (pasteRef.current) pasteRef.current.innerText = 'HTML 테이블을 찾을 수 없습니다. 엑셀에서 복사해주세요.';
            return;
        }

        const result = parseExcelTable(html);
        if (!result || result.soldiers.length === 0) {
            setParsedData(null);
            setMatchResult(null);
            if (pasteRef.current) pasteRef.current.innerText = '테이블 파싱 실패. 엑셀에서 올바른 형태로 복사해주세요.';
            return;
        }

        setParsedData(result);

        // 셀 텍스트를 스케줄 타입 라벨로 파싱
        const types = await scheduleTypesController.get();
        setScheduleTypes(types);

        for (const soldier of result.soldiers) {
            soldier.schedules = {};
            for (const { colIndex, day } of soldier.colIndices) {
                if (colIndex >= soldier.cells.length) continue;
                const targetCell = soldier.cells[colIndex];
                if (!targetCell) continue;
                const cellText = targetCell.textContent.replace(/\u00a0/g, '').replace(/\s+/g, '').trim();
                if (cellText) {
                    const labels = parseCellTextToLabels(cellText, types);
                    if (labels.length > 0) {
                        soldier.schedules[day] = labels;
                    }
                }
            }
        }

        // 용사 매칭
        const soldiers = await soldiersController.get();
        const validSoldiers = filterValidSoldiers(soldiers, year, month);
        const matched = [];
        const unmatched = [];
        const requiresSelection = [];

        for (const entry of result.soldiers) {
            const exactMatch = validSoldiers.find(s => s.rank === entry.rank && s.name === entry.name);
            if (exactMatch) {
                matched.push({ rank: entry.rank, name: entry.name, schedules: entry.schedules, soldierId: exactMatch.id });
                continue;
            }

            const sameName = validSoldiers.filter(s => s.name === entry.name);
            if (sameName.length === 1) {
                matched.push({ rank: entry.rank, name: entry.name, schedules: entry.schedules, soldierId: sameName[0].id });
                continue;
            }

            if (sameName.length > 1) {
                requiresSelection.push({
                    rank: entry.rank,
                    name: entry.name,
                    schedules: entry.schedules,
                    candidates: sameName,
                });
                continue;
            }

            unmatched.push({ rank: entry.rank, name: entry.name, schedules: entry.schedules });
        }

        setManualSelections({});
        setMatchResult({ matched, unmatched, requiresSelection, days: result.days });
        setStep('preview');
    };

    // 동기화 실행
    const handleSync = async () => {
        if (!parsedData || !matchResult || processing) return;
        const syncTargets = getSyncTargets();
        if (syncTargets.length === 0) return;

        setProcessing(true);

        try {
            const key = _getScheduleKey(year, month);
            const allSchedulesBefore = (await DB.get(key)) || {};

            // before 스냅샷 저장 (매칭된 용사들의 기존 일정)
            const beforeSnapshots = {};
            for (const entry of syncTargets) {
                beforeSnapshots[entry.soldierId] = allSchedulesBefore[entry.soldierId]
                    ? JSON.parse(JSON.stringify(allSchedulesBefore[entry.soldierId]))
                    : {};
            }

            // 새 일정 구성
            const allSchedulesAfter = JSON.parse(JSON.stringify(allSchedulesBefore));
            for (const entry of syncTargets) {
                delete allSchedulesAfter[entry.soldierId];

                const soldierSchedules = {};
                for (const [day, labels] of Object.entries(entry.schedules)) {
                    if (labels.length > 0) {
                        soldierSchedules[parseInt(day)] = labels;
                    }
                }

                if (Object.keys(soldierSchedules).length > 0) {
                    allSchedulesAfter[entry.soldierId] = soldierSchedules;
                }
            }

            await DB.save(key, allSchedulesAfter);

            // 히스토리 변경사항 계산
            const totalDays = new Date(year, month, 0).getDate();
            const historyChanges = [];
            for (const entry of syncTargets) {
                for (let d = 1; d <= totalDays; d++) {
                    const before = beforeSnapshots[entry.soldierId]?.[d] || [];
                    const after = allSchedulesAfter[entry.soldierId]?.[d] || [];
                    if (!_arrEq(before, after)) {
                        historyChanges.push({ soldierId: entry.soldierId, day: d, before, after });
                    }
                }
            }

            // undo/redo 지원
            const frozenBefore = JSON.parse(JSON.stringify(beforeSnapshots));
            const frozenAfter = JSON.parse(JSON.stringify(allSchedulesAfter));
            const matchedIds = syncTargets.map(e => e.soldierId);

            const applySync = async () => {
                const current = (await DB.get(key)) || {};
                for (const sid of matchedIds) {
                    delete current[sid];
                    if (frozenAfter[sid] && Object.keys(frozenAfter[sid]).length > 0) {
                        current[sid] = JSON.parse(JSON.stringify(frozenAfter[sid]));
                    }
                }
                await DB.save(key, current);
            };
            const revertSync = async () => {
                const current = (await DB.get(key)) || {};
                for (const sid of matchedIds) {
                    delete current[sid];
                    if (frozenBefore[sid] && Object.keys(frozenBefore[sid]).length > 0) {
                        current[sid] = JSON.parse(JSON.stringify(frozenBefore[sid]));
                    }
                }
                await DB.save(key, current);
            };

            pushUndoAction({ type: 'schedule', apply: applySync, revert: revertSync, historyChanges });

            // 히스토리 기록
            if (historyChanges.length > 0) {
                await scheduleHistoryController.add(year, month, {
                    type: 'schedule',
                    user: '엑셀 붙여넣기',
                    changes: historyChanges,
                });
            }

            onComplete();
        } catch (err) {
            await alert('동기화 중 오류가 발생했습니다: ' + err.message);
            setProcessing(false);
        }
    };

    const handleReset = () => {
        setParsedData(null);
        setMatchResult(null);
        setManualSelections({});
        setStep('paste');
        if (pasteRef.current) pasteRef.current.innerHTML = '';
    };

    // ESC로 닫기
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="excel-modal-overlay" onClick={onClose}>
            <style>{excelPasteModalCss}</style>
            <div className="excel-modal" onClick={(e) => e.stopPropagation()}>
                <div className="excel-modal-header">
                    <span>엑셀 일정 붙여넣기 — {year}년 {month}월</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="excel-modal-body">
                    {step === 'paste' && (<>
                        <div className="excel-info-box">
                            <span className="info-icon">📋</span>
                            <div>
                                엑셀에서 일정표 영역을 복사(<b>Ctrl+C</b>)한 뒤,<br />
                                아래 영역을 클릭하고 <b>Ctrl+V</b>로 붙여넣기 하세요.<br />
                                <span style={{ color: '#888', fontSize: 12 }}>첫 행: 헤더(계급/이름, 월, 날짜들) · 이후 행: 용사별 일정</span>
                            </div>
                        </div>
                        <div
                            ref={pasteRef}
                            className="excel-paste-area"
                            contentEditable
                            onPaste={handlePaste}
                            onKeyDown={(e) => {
                                if (!(e.ctrlKey && e.key === 'v') && !(e.ctrlKey && e.key === 'a') && e.key !== 'Escape') {
                                    e.preventDefault();
                                }
                            }}
                        />
                    </>)}

                    {step === 'preview' && matchResult && (<>
                        {/* 요약 배지 */}
                        <div className="excel-summary">
                            <span className="excel-badge matched">✓ 매칭 {matchResult.matched.length}명</span>
                            {matchResult.requiresSelection?.length > 0 && (
                                <span className="excel-badge manual">선택 필요 {matchResult.requiresSelection.length}명</span>
                            )}
                            {matchResult.unmatched.length > 0 && (
                                <span className="excel-badge unmatched">✕ 미매칭 {matchResult.unmatched.length}명</span>
                            )}
                            <span className="excel-badge days">📅 {matchResult.days[0]}일 ~ {matchResult.days[matchResult.days.length - 1]}일</span>
                            <span className="excel-badge sync">동기화 대상 {getSyncTargets().length}명</span>
                        </div>

                        {/* 매칭 테이블 */}
                        {matchResult.matched.length > 0 && (
                            <div className="excel-match-section">
                                <div className="excel-match-title">
                                    <span className="dot" style={{ background: '#4caf50' }} />
                                    매칭된 용사 ({matchResult.matched.length}명)
                                </div>
                                <div className="match-table-wrap">
                                    <table className="excel-match-table">
                                        <thead>
                                            <tr>
                                                <th className="col-num">#</th>
                                                <th className="col-status" />
                                                <th className="col-name">계급/이름</th>
                                                <th className="col-sched">일정 미리보기</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matchResult.matched.map((m, idx) => (
                                                <tr key={idx}>
                                                    <td className="col-num">{idx + 1}</td>
                                                    <td className="col-status"><span className="match-status-icon ok">✓</span></td>
                                                    <td className="col-name">{m.rank} {m.name}</td>
                                                    <td className="col-sched">
                                                        {matchResult.days.map(day => {
                                                            const labels = m.schedules[day];
                                                            if (!labels || labels.length === 0) return null;
                                                            return labels.map(label => (
                                                                <span key={`${day}-${label}`}>
                                                                    <span className="sched-day-label">{day}</span>
                                                                    <span className="sched-chip" style={getTypeStyle(label)}>{label}</span>
                                                                </span>
                                                            ));
                                                        })}
                                                        {Object.values(m.schedules).every(v => !v || v.length === 0) && (
                                                            <span style={{ color: '#bbb', fontSize: 11 }}>일정 없음</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {matchResult.requiresSelection?.length > 0 && (
                            <div className="excel-match-section">
                                <div className="excel-match-title">
                                    <span className="dot" style={{ background: '#fb8c00' }} />
                                    이름이 중복되어 선택이 필요한 용사 ({matchResult.requiresSelection.length}명)
                                </div>
                                <div className="match-table-wrap" style={{ maxHeight: 220 }}>
                                    <table className="excel-match-table">
                                        <thead>
                                            <tr>
                                                <th className="col-num">#</th>
                                                <th className="col-name">엑셀 이름</th>
                                                <th className="col-select">대상 선택</th>
                                                <th className="col-sched">일정 미리보기</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matchResult.requiresSelection.map((entry, idx) => (
                                                <tr key={`${entry.rank}-${entry.name}-${idx}`} className="manual-match-row">
                                                    <td className="col-num">{idx + 1}</td>
                                                    <td className="col-name">{entry.rank} {entry.name}</td>
                                                    <td className="col-select">
                                                        <select
                                                            className="excel-soldier-select"
                                                            value={manualSelections[idx] || ''}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setManualSelections(prev => ({
                                                                    ...prev,
                                                                    [idx]: value,
                                                                }));
                                                            }}
                                                        >
                                                            <option value="">무시하기</option>
                                                            {entry.candidates.map(candidate => (
                                                                <option key={candidate.id} value={candidate.id}>
                                                                    {getSoldierOptionLabel(candidate)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="col-sched">
                                                        {matchResult.days.map(day => {
                                                            const labels = entry.schedules[day];
                                                            if (!labels || labels.length === 0) return null;
                                                            return labels.map(label => (
                                                                <span key={`${entry.name}-${day}-${label}`}>
                                                                    <span className="sched-day-label">{day}</span>
                                                                    <span className="sched-chip" style={getTypeStyle(label)}>{label}</span>
                                                                </span>
                                                            ));
                                                        })}
                                                        {Object.values(entry.schedules).every(v => !v || v.length === 0) && (
                                                            <span style={{ color: '#bbb', fontSize: 11 }}>일정 없음</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 미매칭 테이블 */}
                        {matchResult.unmatched.length > 0 && (
                            <div className="excel-match-section">
                                <div className="excel-match-title">
                                    <span className="dot" style={{ background: '#ef5350' }} />
                                    미매칭 — DB에 없는 용사 ({matchResult.unmatched.length}명)
                                </div>
                                <div className="match-table-wrap" style={{ maxHeight: 150 }}>
                                    <table className="excel-match-table">
                                        <thead>
                                            <tr>
                                                <th className="col-num">#</th>
                                                <th className="col-status" />
                                                <th className="col-name">계급/이름</th>
                                                <th className="col-sched">비고</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matchResult.unmatched.map((u, idx) => (
                                                <tr key={idx} style={{ background: '#fff5f5' }}>
                                                    <td className="col-num">{idx + 1}</td>
                                                    <td className="col-status"><span className="match-status-icon fail">✕</span></td>
                                                    <td className="col-name">{u.rank} {u.name}</td>
                                                    <td className="col-sched" style={{ color: '#999', fontSize: 11 }}>동기화 건너뜀</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="excel-info-box" style={{ background: '#fff3e0', borderColor: '#ffe0b2' }}>
                            <span className="info-icon">⚠️</span>
                            <div style={{ fontSize: 12, color: '#e65100' }}>
                                매칭된 용사의 <b>{year}년 {month}월 기존 일정이 모두 삭제</b>되고 위 내용으로 덮어씌워집니다.
                            </div>
                        </div>
                    </>)}
                </div>

                <div className="excel-modal-actions">
                    <div>
                        {step === 'preview' && (
                            <button className="btn-reset-paste" onClick={handleReset}>다시 붙여넣기</button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-cancel" onClick={onClose}>취소</button>
                        {step === 'preview' && (
                            <button
                                className="btn-sync"
                                disabled={!matchResult || getSyncTargets().length === 0 || processing}
                                onClick={handleSync}
                            >
                                {processing ? '처리 중...' : `동기화 (${getSyncTargets().length}명)`}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
