import { useState, useEffect } from 'preact/hooks';
import { sleepGuardController } from '../@controllers/sleepGuardController';

const cs = { padding: '5px 8px', overflow: 'hidden', flexShrink: 0 };

function TimeList({ isHoliday, label, canEdit }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const times = await sleepGuardController.getTimes(isHoliday);
        setItems(times);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const save = async (newItems) => {
        if (!canEdit) return;
        setItems(newItems);
        await sleepGuardController.saveTimes(isHoliday, newItems);
    };

    const handleChange = (index, field, value) => {
        const updated = items.map((item, i) => i === index ? { ...item, [field]: value } : item);
        save(updated);
    };

    const handleAdd = () => {
        const last = items[items.length - 1];
        const newItem = last ? { start: last.end, end: last.end } : { start: '00:00', end: '00:00' };
        save([...items, newItem]);
    };

    const handleDelete = async (index) => {
        if (items.length <= 1) { await alert('최소 1개의 시간대가 필요합니다.'); return; }
        save(items.filter((_, i) => i !== index));
    };

    const handleReset = async () => {
        if (!await confirm(`${label} 시간을 기본값으로 초기화하시겠습니까?`)) return;
        save(sleepGuardController.getDefaults(isHoliday));
    };

    if (loading) return <div className="f ajCenter" style={{ padding: 20 }}>불러오는 중...</div>;

    return (
        <div className="f" style={{ gap: 0 }}>
            <div className="f row jBetween aCenter" style={{ marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14 }}>{label}</h4>
                {canEdit && <div className="f row" style={{ gap: 6 }}>
                    <button onClick={handleReset} style={{ fontSize: 12, padding: '3px 10px' }}>기본값 초기화</button>
                    <button onClick={handleAdd} style={{ fontSize: 12, padding: '3px 10px' }}>+ 추가</button>
                </div>}
            </div>

            {/* Header */}
            <div className="f row aCenter" style={{
                background: 'var(--c8)', border: '1px solid var(--c6)',
                fontWeight: 600, fontSize: 12, color: 'var(--c3)',
            }}>
                <div style={{ ...cs, width: 80 }}>번초</div>
                <div style={{ ...cs, flex: 1 }}>시작 시간</div>
                <div style={{ ...cs, flex: 1 }}>종료 시간</div>
                <div style={{ ...cs, width: 60, textAlign: 'center' }}>삭제</div>
            </div>

            {/* Rows */}
            {items.map((item, index) => (
                <div key={index} className="f row aCenter manage-row-hover"
                    style={{ borderBottom: '1px solid var(--c7)', minHeight: 36 }}>
                    <div style={{ ...cs, width: 80, fontWeight: 600 }}>
                        {index + 1}번초
                    </div>
                    <div style={{ ...cs, flex: 1 }}>
                        <input
                            type="text"
                            value={item.start}
                            onInput={(e) => handleChange(index, 'start', e.target.value)}
                            disabled={!canEdit}
                            style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid var(--c5)', fontSize: 13, width: 120 }}
                        />
                    </div>
                    <div style={{ ...cs, flex: 1 }}>
                        <input
                            type="text"
                            value={item.end}
                            onInput={(e) => handleChange(index, 'end', e.target.value)}
                            disabled={!canEdit}
                            style={{ padding: '6px 8px', textAlign: 'center', border: '1px solid var(--c5)', fontSize: 13, width: 120 }}
                        />
                    </div>
                    <div style={{ ...cs, width: 60, textAlign: 'center' }}>
                        {canEdit && <button className="danger" style={{ padding: '2px 6px', fontSize: 11 }}
                            onClick={() => handleDelete(index)}>삭제</button>}
                    </div>
                </div>
            ))}

            {items.length === 0 && (
                <div className="f ajCenter" style={{ padding: 30, color: 'var(--c4)' }}>
                    등록된 시간이 없습니다.
                </div>
            )}
        </div>
    );
}

export default function TabSleepGuard({ canEdit = false }) {
    return (
        <div className="f row" style={{ gap: 20 }}>
            <div style={{ minWidth: 0 }}>
                <TimeList isHoliday={false} label="평일 불침번 시간 관리" canEdit={canEdit} />
            </div>
            <div style={{ minWidth: 0 }}>
                <TimeList isHoliday={true} label="휴일 불침번 시간 관리" canEdit={canEdit} />
            </div>
        </div>
    );
}
