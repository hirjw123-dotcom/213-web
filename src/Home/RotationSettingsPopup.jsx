import { useState, useEffect, useCallback } from 'preact/hooks';
import { __controllers } from '../@controllers/__controllers';
import { battalionRotationController } from '../@controllers/battalionRotationController';

/**
 * 대대순번 기준값 설정 팝업
 * RightPanel의 ⚙ 버튼에서 열림
 */
export default function RotationSettingsPopup({ onUpdate }) {
    const [items, setItems] = useState([]);
    const [bases, setBases] = useState({});

    const loadData = useCallback(async () => {
        const [its, bs] = await Promise.all([
            battalionRotationController.getItems(),
            battalionRotationController.getBases(),
        ]);
        setItems(its);
        setBases(bs);
    }, []);

    useEffect(() => { loadData(); }, []);

    const handleSave = async (key, baseDate, startValue) => {
        await battalionRotationController.saveBase(key, { baseDate, startValue });
        loadData();
        onUpdate?.();
    };

    const close = () => {
        __controllers.popup.pop();
    };

    return (
        <div style={{
            width: 380,
            maxHeight: '80vh',
            background: '#fff',
            border: '1px solid var(--c2)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            {/* 헤더 */}
            <div className="f row aCenter jBetween" style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--c6)',
                background: 'var(--c8)',
            }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>⚙ 기준값 설정</span>
                <span onClick={close} className="pointer" style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
            </div>

            {/* 본문 */}
            <div style={{ overflow: 'auto', flex: 1, padding: '12px 16px' }}>
                <div style={{ fontSize: 12, color: 'var(--c4)', marginBottom: 12 }}>
                    각 항목의 기준일과 해당 날짜의 순번을 설정하면 날짜별 순번이 자동 계산됩니다.
                </div>
                {(() => {
                    const typeLabels = { daily: '매일', weekly: '매주', monthly: '매월', quarterly: '분기' };
                    const typeOrder = ['daily', 'weekly', 'monthly', 'quarterly'];
                    const grouped = {};
                    for (const item of items) {
                        if (!grouped[item.type]) grouped[item.type] = [];
                        grouped[item.type].push(item);
                    }
                    return typeOrder.filter(t => grouped[t]).map(t => (
                        <div key={t} style={{ marginBottom: 12 }}>
                            <div style={{
                                fontSize: 12, fontWeight: 700, color: 'var(--c3)',
                                padding: '4px 8px', background: 'var(--c8)',
                                borderBottom: '1px solid var(--c6)', marginBottom: 6,
                            }}>
                                {typeLabels[t]}
                            </div>
                            {grouped[t].map(item => {
                                const base = bases[item.key] || { baseDate: '', startValue: item.order[0] || '' };
                                return (
                                    <BaseRow
                                        key={item.key}
                                        item={item}
                                        base={base}
                                        onSave={(bd, sv) => handleSave(item.key, bd, sv)}
                                    />
                                );
                            })}
                        </div>
                    ));
                })()}
            </div>

            {/* 하단 */}
            <div className="f row jEnd" style={{
                padding: '8px 16px',
                borderTop: '1px solid var(--c6)',
                background: 'var(--c8)',
            }}>
                <button onClick={close} style={{ fontSize: 13, padding: '4px 16px' }}>닫기</button>
            </div>
        </div>
    );
}

function BaseRow({ item, base, onSave }) {
    const [baseDate, setBaseDate] = useState(base.baseDate);
    const [startValue, setStartValue] = useState(base.startValue);
    const [dirty, setDirty] = useState(false);

    const handleBd = (v) => { setBaseDate(v); setDirty(true); };
    const handleSv = (v) => { setStartValue(v); setDirty(true); };

    const save = () => {
        if (!baseDate) return;
        onSave(baseDate, startValue);
        setDirty(false);
    };

    return (
        <div style={{
            border: '1px solid var(--c6)',
            padding: 10,
            marginBottom: 8,
            background: dirty ? '#fffff5' : '#fff',
        }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--c2)' }}>
                {item.name}
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--c4)', marginLeft: 6 }}>
                    ({{ daily: '매일', weekly: '매주', monthly: '매월', quarterly: '분기' }[item.type]})
                </span>
            </div>
            <div className="f row aCenter" style={{ gap: 8, marginBottom: 4 }}>
                <label style={{ fontSize: 12, width: 50, color: 'var(--c3)' }}>기준일</label>
                <input type="date" value={baseDate}
                    onInput={e => handleBd(e.target.value)}
                    style={{ fontSize: 12, padding: '3px 6px' }} />
            </div>
            <div className="f row aCenter" style={{ gap: 8 }}>
                <label style={{ fontSize: 12, width: 50, color: 'var(--c3)' }}>순번</label>
                <select value={startValue}
                    onChange={e => handleSv(e.target.value)}
                    style={{ fontSize: 12, padding: '3px 6px' }}>
                    {item.order.map(v => (
                        <option key={v} value={v}>{v}</option>
                    ))}
                </select>
                {dirty && (
                    <button onClick={save} style={{ fontSize: 11, padding: '2px 8px', marginLeft: 'auto' }}>저장</button>
                )}
            </div>
        </div>
    );
}
