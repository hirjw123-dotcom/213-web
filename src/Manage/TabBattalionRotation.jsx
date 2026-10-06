import { useState, useEffect, useCallback } from 'preact/hooks';
import { battalionRotationController } from '../@controllers/battalionRotationController';
import { __controllers } from '../@controllers/__controllers';
import ModalPopup from '../@components/ModalPopup';

/**
 * 순번 항목 편집 팝업
 */
function ItemEditorPopup({ item, onSave, onDelete, canEdit = true }) {
    const [form, setForm] = useState({ ...item, order: [...item.order] });
    const [orderText, setOrderText] = useState(item.order.join(', '));

    const handleOrderChange = (val) => {
        setOrderText(val);
        const arr = val.split(',').map(s => s.trim()).filter(Boolean);
        setForm({ ...form, order: arr });
    };

    const save = () => {
        if (!canEdit) return;
        if (!form.name.trim()) return;
        onSave({ ...form, order: form.order.length > 0 ? form.order : item.order });
        __controllers.popup.pop();
    };

    const del = async () => {
        if (!canEdit) return;
        if (!await confirm(`'${item.name}' 항목을 삭제하시겠습니까?`)) return;
        onDelete(item.key);
        __controllers.popup.pop();
    };

    return (
        <div style={{
            width: 420,
            maxHeight: '80vh',
            background: '#fff',
            border: '1px solid var(--c2)',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div className="f row aCenter jBetween" style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--c6)',
                background: 'var(--c8)',
            }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>항목 편집 {canEdit ? '' : '(읽기 전용)'}</span>
                <span onClick={() => __controllers.popup.pop()} className="pointer" style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
            </div>
            <div style={{ padding: 16, overflow: 'auto', flex: 1 }}>
                <div className="f" style={{ gap: 10 }}>
                    <div className="f row aCenter" style={{ gap: 8 }}>
                        <label style={{ fontSize: 12, width: 70, color: 'var(--c3)', flexShrink: 0 }}>이름</label>
                        <input value={form.name} onInput={e => setForm({ ...form, name: e.target.value })}
                            disabled={!canEdit}
                            style={{ flex: 1, fontSize: 12, padding: '4px 8px' }} />
                    </div>
                    <div className="f row aCenter" style={{ gap: 8 }}>
                        <label style={{ fontSize: 12, width: 70, color: 'var(--c3)', flexShrink: 0 }}>타입</label>
                        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                            disabled={!canEdit}
                            style={{ fontSize: 12, padding: '4px 8px' }}>
                            <option value="daily">매일(daily)</option>
                            <option value="weekly">매주(weekly)</option>
                            <option value="monthly">매월(monthly)</option>
                            <option value="quarterly">분기(quarterly)</option>
                        </select>
                    </div>
                    <div className="f row aCenter" style={{ gap: 8 }}>
                        <label style={{ fontSize: 12, width: 70, color: 'var(--c3)', flexShrink: 0 }}>그룹명</label>
                        <input value={form.group} onInput={e => setForm({ ...form, group: e.target.value })}
                            disabled={!canEdit}
                            style={{ flex: 1, fontSize: 12, padding: '4px 8px' }} />
                    </div>
                    <div className="f row" style={{ gap: 8 }}>
                        <label style={{ fontSize: 12, width: 70, color: 'var(--c3)', flexShrink: 0, paddingTop: 4 }}>순번 배열</label>
                        <div style={{ flex: 1 }}>
                            <input value={orderText} onInput={e => handleOrderChange(e.target.value)}
                                disabled={!canEdit}
                                placeholder="콤마로 구분 (예: 1중대, 2중대, 4중대, 본부/통신)"
                                style={{ width: '100%', fontSize: 12, padding: '4px 8px', boxSizing: 'border-box' }} />
                            <div style={{ fontSize: 10, color: 'var(--c5)', marginTop: 2 }}>
                                현재: {form.order.join(' → ')}
                            </div>
                        </div>
                    </div>
                    <div className="f row" style={{ gap: 8 }}>
                        <label style={{ fontSize: 12, width: 70, color: 'var(--c3)', flexShrink: 0, paddingTop: 4 }}>코멘트</label>
                        <textarea value={form.comment || ''} onInput={e => setForm({ ...form, comment: e.target.value })}
                            disabled={!canEdit}
                            style={{ flex: 1, fontSize: 12, padding: '4px 8px', minHeight: 50, resize: 'vertical' }} />
                    </div>
                </div>
            </div>
            <div className="f row" style={{
                padding: '8px 16px',
                borderTop: '1px solid var(--c6)',
                background: 'var(--c8)',
                gap: 4,
            }}>
                {canEdit && <button onClick={save} style={{ fontSize: 12, padding: '4px 14px' }}>저장</button>}
                <button onClick={() => __controllers.popup.pop()} className="secondary" style={{ fontSize: 12, padding: '4px 14px' }}>
                    {canEdit ? '취소' : '닫기'}
                </button>
                <div style={{ flex: 1 }} />
                {canEdit && <button onClick={del} className="danger" style={{ fontSize: 12, padding: '4px 10px' }}>삭제</button>}
            </div>
        </div>
    );
}

export default function TabBattalionRotation({ canEdit = false }) {
    const [items, setItems] = useState([]);
    const [bases, setBases] = useState({});
    const [tab, setTab] = useState('bases'); // 'bases' | 'items'

    const loadData = useCallback(async () => {
        const [its, bs] = await Promise.all([
            battalionRotationController.getItems(),
            battalionRotationController.getBases(),
        ]);
        setItems(its);
        setBases(bs);
    }, []);

    useEffect(() => { loadData(); }, []);

    // ─── 항목 관리 ───
    const handleSaveItem = async (updatedItem) => {
        const exists = items.find(it => it.key === updatedItem.key);
        const newItems = exists
            ? items.map(it => it.key === updatedItem.key ? updatedItem : it)
            : [...items, updatedItem];
        await battalionRotationController.saveItems(newItems);
        loadData();
    };

    const handleDeleteItem = async (key) => {
        const newItems = items.filter(it => it.key !== key);
        await battalionRotationController.saveItems(newItems);
        const newBases = { ...bases };
        delete newBases[key];
        await battalionRotationController.saveBases(newBases);
        loadData();
    };

    const openItemEditor = (item) => {
        ModalPopup.push(
            <ItemEditorPopup item={item} onSave={handleSaveItem} onDelete={handleDeleteItem} canEdit={canEdit} />
        );
    };

    const handleAddItem = () => {
        if (!canEdit) return;
        const key = 'item_' + Date.now();
        const newItem = {
            key, name: '새 항목', type: 'weekly', group: '이번 주',
            order: ['1중대', '2중대', '4중대', '본부/통신'], comment: '',
        };
        openItemEditor(newItem);
    };

    const handleResetItems = async () => {
        if (!canEdit) return;
        if (!await confirm('순번 항목을 기본값으로 초기화하시겠습니까?')) return;
        await battalionRotationController.resetItems();
        await battalionRotationController.resetBases();
        loadData();
    };

    // ─── 기준값 관리 ───
    const handleSaveBase = async (key, data) => {
        if (!canEdit) return;
        await battalionRotationController.saveBase(key, data);
        loadData();
    };

    return (
        <div className="f" style={{ gap: 16 }}>
            {/* 탭 전환 */}
            <div className="f row" style={{ gap: 0, borderBottom: '1px solid var(--c6)' }}>
                {[
                    { id: 'bases', label: '기준값 설정' },
                    { id: 'items', label: '목록 정의' },
                ].map(t => (
                    <div
                        key={t.id}
                        className="pointer"
                        onClick={() => setTab(t.id)}
                        style={{
                            padding: '8px 16px', fontSize: 13,
                            fontWeight: tab === t.id ? 700 : 400,
                            borderBottom: tab === t.id ? '2px solid var(--c1)' : '2px solid transparent',
                            color: tab === t.id ? 'var(--c1)' : 'var(--c4)',
                        }}
                    >{t.label}</div>
                ))}
            </div>
            <div style={{
                maxWidth: 500,
            }}>

                {tab === 'bases' ? (
                    <div>
                        <div style={{ fontSize: 12, color: 'var(--c4)', marginBottom: 12 }}>
                            각 순번의 기준일과 해당일의 순번값을 설정합니다. 이 기준을 바탕으로 날짜별 순번이 자동 계산됩니다.
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {items.map(item => (
                                <BaseCard key={item.key} item={item} base={bases[item.key]} onSave={handleSaveBase} canEdit={canEdit} />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="f row aCenter jBetween" style={{ marginBottom: 12 }}>
                            <span style={{ fontSize: 12, color: 'var(--c4)' }}>
                                순번 항목을 추가/수정/삭제할 수 있습니다. 클릭하여 편집합니다.
                            </span>
                            <div className="f row" style={{ gap: 4 }}>
                                {canEdit && <button onClick={handleResetItems} className="secondary" style={{ fontSize: 11, padding: '2px 8px' }}>
                                    기본값 초기화
                                </button>}
                                {canEdit && <button onClick={handleAddItem} style={{ fontSize: 11, padding: '2px 8px' }}>
                                    + 추가
                                </button>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {items.map(item => (
                                <div
                                    key={item.key}
                                    className="pointer"
                                    onClick={() => openItemEditor(item)}
                                    style={{
                                        width: 220,
                                        padding: 10,
                                        border: '1px solid var(--c6)',
                                        background: '#fff',
                                    }}
                                >
                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--c4)', marginBottom: 2 }}>
                                        {{ daily: '매일', weekly: '매주', monthly: '매월', quarterly: '분기' }[item.type]} · {item.group}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--c5)' }}>
                                        {item.order.join(' → ')}
                                    </div>
                                    {item.comment && (
                                        <div style={{
                                            fontSize: 10, color: 'var(--c5)', marginTop: 4,
                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                        }}>
                                            {item.comment}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * 기준값 카드 (compact, flex-wrap)
 */
function BaseCard({ item, base, onSave, canEdit = true }) {
    const [form, setForm] = useState({
        baseDate: base?.baseDate || '',
        startValue: base?.startValue || (item.order[0] || ''),
    });
    const [dirty, setDirty] = useState(false);

    const handleChange = (field, val) => {
        setForm(prev => ({ ...prev, [field]: val }));
        setDirty(true);
    };

    const save = () => {
        if (!canEdit) return;
        if (!form.baseDate) return;
        onSave(item.key, form);
        setDirty(false);
    };

    return (
        <div style={{
            width: 220,
            padding: 10,
            border: dirty ? '1px solid var(--accent)' : '1px solid var(--c6)',
            background: dirty ? '#fffff5' : '#fff',
        }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--c2)' }}>
                {item.name}
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--c5)', marginLeft: 4 }}>
                    {{ daily: '매일', weekly: '매주', monthly: '매월', quarterly: '분기' }[item.type]}
                </span>
            </div>
            <div className="f" style={{ gap: 4 }}>
                <div className="f row aCenter" style={{ gap: 6 }}>
                    <label style={{ fontSize: 11, width: 40, color: 'var(--c4)' }}>기준일</label>
                    <input type="date" value={form.baseDate}
                        onInput={e => handleChange('baseDate', e.target.value)}
                        disabled={!canEdit}
                        style={{ flex: 1, fontSize: 11, padding: '2px 4px' }} />
                </div>
                <div className="f row aCenter" style={{ gap: 6 }}>
                    <label style={{ fontSize: 11, width: 40, color: 'var(--c4)' }}>순번</label>
                    <select value={form.startValue}
                        onChange={e => handleChange('startValue', e.target.value)}
                        disabled={!canEdit}
                        style={{ flex: 1, fontSize: 11, padding: '2px 4px' }}>
                        {item.order.map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>
                </div>
                {dirty && canEdit && (
                    <button onClick={save} style={{ fontSize: 11, padding: '2px 8px', marginTop: 2, alignSelf: 'flex-end' }}>저장</button>
                )}
            </div>
        </div>
    );
}
