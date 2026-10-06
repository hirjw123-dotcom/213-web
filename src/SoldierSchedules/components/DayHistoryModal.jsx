import { useState, useEffect, useMemo } from 'preact/hooks';
import { scheduleHistoryController } from '../../@controllers/scheduleHistoryController.js';
import { DUTY_REPLACEMENT_LABELS } from '../../@controllers/dutyReplacementController.js';
import { HISTORY_STYLES } from '../css/soldierScheduleCss.js';
import { useDraggableHistoryModal } from '../@hooks/useDraggableHistoryModal.js';
import { _buildHistoryActivities } from '../@modules/historyUtils.jsx';
import HistoryActivityList from './HistoryActivityList.jsx';

const FILTERABLE_DUTY_GROUPS = {
    '평': ['평', '주평', '야평'],
    '주': ['주', '주평', '주주', '야주', '주당'],
    '당': ['주당', '야당'],
    '야': ['야평', '야주', '야당'],
};

const areLabelCountsEqual = (left = [], right = []) => {
    if (left.length !== right.length) return false;

    const leftCount = {};
    const rightCount = {};
    for (const label of left) leftCount[label] = (leftCount[label] || 0) + 1;
    for (const label of right) rightCount[label] = (rightCount[label] || 0) + 1;

    const allLabels = new Set([...Object.keys(leftCount), ...Object.keys(rightCount)]);
    for (const label of allLabels) {
        if ((leftCount[label] || 0) !== (rightCount[label] || 0)) return false;
    }
    return true;
};

const getLabelsForSelectedFilter = (labels = [], selectedLabel = '') => {
    if (!selectedLabel) return labels;

    const relatedDutyLabels = FILTERABLE_DUTY_GROUPS[selectedLabel] || null;
    return labels.flatMap((label) => {
        if (label === selectedLabel) return [label];
        if (relatedDutyLabels?.includes(label)) return [selectedLabel];
        return [];
    });
};

const projectEntryForSelectedFilter = (entry, selectedLabel) => {
    if (!selectedLabel) return entry;

    const changes = (entry.changes || []).flatMap((change) => {
        const before = getLabelsForSelectedFilter(change.before || [], selectedLabel);
        const after = getLabelsForSelectedFilter(change.after || [], selectedLabel);

        if (before.length === 0 && after.length === 0) return [];
        if (areLabelCountsEqual(before, after)) return [];

        return [{
            ...change,
            before,
            after,
        }];
    });

    return {
        ...entry,
        changes,
    };
};

// ========================================
// 날짜별 히스토리 모달
// ========================================
export default function DayHistoryModal({ day, year, month, soldiers, scheduleTypes, soldierId = null, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDutyLabel, setSelectedDutyLabel] = useState('');
    const { modalRef, modalStyle, headerProps, handleOverlayClick } = useDraggableHistoryModal();

    useEffect(() => {
        const load = async () => {
            const allHistory = await scheduleHistoryController.get(year, month);
            // 일정 변경만 (dayType 제외)
            const relevant = allHistory
                .filter(entry => entry.type === 'schedule' && entry.changes?.some(c => c.day === day && (soldierId == null || String(c.soldierId) === String(soldierId))))
                .map(entry => ({
                    ...entry,
                    changes: entry.changes.filter(c => c.day === day && (soldierId == null || String(c.soldierId) === String(soldierId))),
                }));
            setHistory(relevant);
            setLoading(false);
        };
        load();
    }, [day, month, soldierId, year]);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    useEffect(() => {
        setSelectedDutyLabel('');
    }, [day, month, soldierId, year]);

    const findName = (id) => {
        const s = soldiers.find(s => s.id === id);
        return s ? `${s.rank} ${s.name}` : '알 수 없음';
    };

    const titleSuffix = soldierId == null ? '' : ` - ${findName(soldierId)}`;

    const isDayWideHistory = useMemo(() => soldierId == null, [soldierId]);

    const availableFilterLabels = useMemo(() => {
        const labelSet = new Set();

        for (const entry of history) {
            for (const change of entry.changes || []) {
                for (const label of [...(change.before || []), ...(change.after || [])]) {
                    if (label) labelSet.add(label);
                }
            }
        }

        const orderedByType = [...(scheduleTypes || [])]
            .sort((left, right) => {
                const leftOrder = left?.order ?? 9999;
                const rightOrder = right?.order ?? 9999;
                if (leftOrder !== rightOrder) return leftOrder - rightOrder;
                return String(left?.label || '').localeCompare(String(right?.label || ''), 'ko');
            })
            .map((type) => type.label)
            .filter((label) => labelSet.has(label));

        const orderedDutyExtras = DUTY_REPLACEMENT_LABELS
            .filter((label) => labelSet.has(label) && !orderedByType.includes(label));

        const extras = [...labelSet]
            .filter((label) => !orderedByType.includes(label) && !orderedDutyExtras.includes(label))
            .sort((a, b) => String(a).localeCompare(String(b), 'ko'));

        return [...orderedByType, ...orderedDutyExtras, ...extras];
    }, [history, scheduleTypes]);

    const filteredHistory = useMemo(() => {
        if (!selectedDutyLabel) return history;

        return history
            .map((entry) => projectEntryForSelectedFilter(entry, selectedDutyLabel))
            .filter((entry) => entry.changes.length > 0);
    }, [history, selectedDutyLabel]);

    const activities = useMemo(() => {
        return _buildHistoryActivities(filteredHistory, findName);
    }, [filteredHistory, soldiers]);

    return (
        <div className="hist-overlay" onClick={(event) => handleOverlayClick(event, onClose)}>
            <style>{HISTORY_STYLES}</style>
            <div ref={modalRef} className="hist-modal" style={{ ...modalStyle }} onClick={(e) => e.stopPropagation()}>
                <div className="hist-hdr" {...headerProps}>
                    <span>{month}월 {day}일 — 변경기록{titleSuffix}</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="hist-body">
                    {!loading && isDayWideHistory && availableFilterLabels.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, padding: '12px 12px 14px', border: '1px solid #e5e7eb', borderRadius: 12, background: '#f8fafc' }}>
                            <button
                                type="button"
                                className="hist-filter-btn"
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 999,
                                    border: selectedDutyLabel ? '1px solid #d0d7de' : '1px solid #1f6feb',
                                    background: selectedDutyLabel ? '#fff' : '#e8f1ff',
                                    color: selectedDutyLabel ? '#444' : '#1f6feb',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                                onClick={() => setSelectedDutyLabel('')}
                            >
                                전체
                            </button>
                            {availableFilterLabels.map((label) => {
                                const scheduleType = scheduleTypes?.find((item) => item.label === label);
                                const selected = selectedDutyLabel === label;
                                return (
                                    <button
                                        key={label}
                                        type="button"
                                        className="hist-filter-btn"
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 999,
                                            border: selected ? '1px solid #222' : '1px solid rgba(0,0,0,0.12)',
                                            background: scheduleType?.bg || '#f3f4f6',
                                            color: scheduleType?.color || '#222',
                                            fontWeight: selected || scheduleType?.bold ? 700 : 600,
                                            cursor: 'pointer',
                                            opacity: selected ? 1 : 0.78,
                                            boxShadow: selected ? 'inset 0 0 0 1px rgba(0,0,0,0.08)' : 'none',
                                        }}
                                        onClick={() => setSelectedDutyLabel((prev) => prev === label ? '' : label)}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <HistoryActivityList
                        activities={activities}
                        scheduleTypes={scheduleTypes}
                        loading={loading}
                        emptyText="이 날짜의 변경 내역이 없습니다."
                    />
                </div>
            </div>
        </div>
    );
}
