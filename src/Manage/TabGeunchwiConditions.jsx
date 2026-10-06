import { useState, useEffect } from 'preact/hooks';
import { 근취Conditions } from '../@controllers/soldierSchedulesController';
import { scheduleTypesController } from '../@controllers/soldierScheduleTypesController';

const MONTH_TYPE_OPTIONS = ['전체', '홀수달', '짝수달'];
const DAY_OPTIONS = ['오늘', '어제'];

// 스케줄 타입 정렬: scheduleTypesController의 order 필드 기반 + 근취 조건에 사용되는 타입 우선
function sortScheduleLabels(labels, conditions) {
    // 근취 조건에서 사용 중인 타입을 우선 배치
    const usedTypes = new Set(conditions.map(c => c.scheduleType));
    const priority = [];
    const rest = [];
    for (const label of labels) {
        if (usedTypes.has(label)) {
            priority.push(label);
        } else {
            rest.push(label);
        }
    }
    return [...priority, ...rest];
}

export default function TabGeunchwiConditions({ canEdit = false }) {
    const [items, setItems] = useState([]);
    const [scheduleLabels, setScheduleLabels] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const [conditions, types] = await Promise.all([
            근취Conditions.get(),
            scheduleTypesController.get(),
        ]);
        const labels = types.map(t => t.label);
        if (!labels.includes('근취')) labels.push('근취');
        setScheduleLabels(sortScheduleLabels(labels, conditions));
        setItems(conditions);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async (e) => {
        if (!canEdit) return;
        e.currentTarget.blur();
        await 근취Conditions.add({
            monthType: '전체',
            day: '오늘',
            scheduleType: scheduleLabels[0] || '',
        });
        load();
    };

    const handleUpdate = async (index, field, value) => {
        if (!canEdit) return;
        await 근취Conditions.update(index, { [field]: value });
        setItems(prev => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const handleDelete = async (index) => {
        if (!canEdit) return;
        await 근취Conditions.delete(index);
        load();
    };

    if (loading) return <div className="f ajCenter" style={{ padding: 40 }}>불러오는 중...</div>;

    return (
        <div className="f" style={{ gap: 8, maxWidth: 700 }}>
            <div className="f row aCenter jBetween" style={{ marginBottom: 4 }}>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--c4)' }}>
                    근취 대상 판별을 위한 조건 목록입니다. 조건 중 하나라도 해당되면 근취 대상입니다.
                </p>
                {canEdit && <button onClick={handleAdd}>+ 조건 추가</button>}
            </div>

            <table className="manage-table">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>번호</th>
                        <th style={{ width: 110 }}>월 조건</th>
                        <th style={{ width: 90 }}>일 조건</th>
                        <th style={{ width: 130 }}>스케줄 타입</th>
                        <th style={{ width: 56 }}>작업</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td style={{ textAlign: 'center', color: 'var(--c4)' }}>{index + 1}</td>
                            <td>
                                <select value={item.monthType}
                                    onChange={(e) => handleUpdate(index, 'monthType', e.target.value)}
                                    disabled={!canEdit}
                                    style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--c6)', fontSize: 13 }}>
                                    {MONTH_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>
                            <td>
                                <select value={item.day}
                                    onChange={(e) => handleUpdate(index, 'day', e.target.value)}
                                    disabled={!canEdit}
                                    style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--c6)', fontSize: 13 }}>
                                    {DAY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </td>
                            <td>
                                <select value={item.scheduleType}
                                    onChange={(e) => handleUpdate(index, 'scheduleType', e.target.value)}
                                    disabled={!canEdit}
                                    style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--c6)', fontSize: 13 }}>
                                    {scheduleLabels.map(label => <option key={label} value={label}>{label}</option>)}
                                </select>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                                {canEdit && <button className="danger" style={{ padding: '2px 7px', fontSize: 12 }}
                                    onClick={() => handleDelete(index)}>삭제</button>}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {items.length === 0 && (
                <div className="f ajCenter" style={{ padding: 40, color: 'var(--c4)' }}>
                    등록된 근취조건이 없습니다. 조건을 추가해주세요.
                </div>
            )}
        </div>
    );
}
