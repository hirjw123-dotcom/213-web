import { useState, useEffect, useRef } from 'preact/hooks';
import { dayTypesController, PROTECTED_DAY_TYPE_LABELS } from '../@controllers/soldierScheduleTypesController';
import { DragItem, DragDropZone } from '../@components/DragItem';
import ModalPopup from '../@components/ModalPopup';
import { __controllers } from '../@controllers/__controllers';
import React from 'preact/compat';

const CW = { handle: 28, bg: 90, color: 90, scope: 80, preview: 130, del: 60 };
const cs = { padding: '5px 8px', overflow: 'hidden', flexShrink: 0 };

export default function TabDayTypes({ canEdit = false }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const mouseRef = useRef(null);

    const load = async () => {
        setLoading(true);
        setItems(await dayTypesController.get());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleDrop = async (draggedItem, targetItem, position) => {
        if (!canEdit) return;
        const list = [...items];
        const fromIdx = list.findIndex(i => i.label === draggedItem.label);
        if (fromIdx === -1) return;
        const [moved] = list.splice(fromIdx, 1);
        let toIdx = list.findIndex(i => i.label === targetItem.label);
        if (toIdx === -1) return;
        if (position === 'after') toIdx += 1;
        list.splice(toIdx, 0, moved);
        list.forEach((it, i) => { it.order = i; });
        setItems(list);
        for (const it of list) await dayTypesController.update(it.label, { order: it.order });
    };

    const openAdd = (e) => {
        if (!canEdit) return;
        e.currentTarget.blur();
        ModalPopup.push(
            <DayTypeEditForm onSave={async (data) => {
                if (!(await dayTypesController.add(data))) { await alert('이미 존재하는 라벨입니다.'); return; }
                load();
            }} />
        );
    };

    const openEdit = (item) => {
        ModalPopup.push(
            <DayTypeEditForm initial={item} canEdit={canEdit} onSave={async (data) => {
                if (!canEdit) return;
                await dayTypesController.update(item.label, data);
                load();
            }} />
        );
    };

    const handleDelete = async (e, item) => {
        e.stopPropagation();
        e.currentTarget.blur();
        if (!canEdit) return;
        if (PROTECTED_DAY_TYPE_LABELS.includes(item.label)) {
            await alert('기본 날짜타입은 삭제할 수 없습니다.');
            return;
        }
        if (!await confirm(`"${item.label}" 날짜타입을 삭제하시겠습니까?`)) return;
        await dayTypesController.delete(item.label);
        load();
    };

    const onMD = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onClk = (e, item) => {
        const p = mouseRef.current;
        mouseRef.current = null;
        if (!p || Math.abs(e.clientX - p.x) > 4 || Math.abs(e.clientY - p.y) > 4) return;
        openEdit(item);
    };

    if (loading) return <div className="f ajCenter" style={{ padding: 40 }}>불러오는 중...</div>;

    return (
        <div className="f" style={{ gap: 0, maxWidth: 700 }}>
            <div className="f row jEnd" style={{ marginBottom: 8 }}>
                {canEdit && <button onClick={openAdd}>+ 추가</button>}
            </div>

            {/* Header */}
            <div className="f row aCenter" style={{
                background: 'var(--c8)', border: '1px solid var(--c6)',
                fontWeight: 600, fontSize: 12, color: 'var(--c3)',
            }}>
                <div style={{ ...cs, width: CW.handle }} />
                <div style={{ ...cs, flex: 1 }}>라벨</div>
                <div style={{ ...cs, width: CW.bg }}>배경색</div>
                <div style={{ ...cs, width: CW.color }}>글자색</div>
                <div style={{ ...cs, width: CW.scope }}>적용범위</div>
                <div style={{ ...cs, width: CW.preview }}>미리보기</div>
                <div style={{ ...cs, width: CW.del }} />
            </div>

            {/* Rows */}
            <DragDropZone groupKey="dayTypes" containerId="dayTypes">
                {items.map((item, index) => (
                    (() => {
                        const isProtected = PROTECTED_DAY_TYPE_LABELS.includes(item.label);
                        return (
                            <DragItem key={item.label} groupKey="dayTypes" containerId="dayTypes"
                                item={item} index={index} onDrop={handleDrop} disabled={!canEdit}>
                                <div className="f row aCenter manage-row-hover pointer"
                                    style={{ borderBottom: '1px solid var(--c7)', minHeight: 34 }}
                                    onMouseDown={onMD} onClick={(e) => onClk(e, item)}>
                                    <div style={{ ...cs, width: CW.handle, textAlign: 'center', color: 'var(--c4)', cursor: canEdit ? 'grab' : 'default' }}>
                                        {canEdit ? '☰' : ''}
                                    </div>
                                    <div style={{ ...cs, flex: 1, fontWeight: 600 }}>{item.label}</div>
                                    <div style={{ ...cs, width: CW.bg }}>
                                        {item.bg ? (
                                            <div className="f row aCenter" style={{ gap: 5 }}>
                                                <div style={{ width: 14, height: 14, background: item.bg, border: '1px solid var(--c5)', flexShrink: 0 }} />
                                                <span style={{ fontSize: 11, color: 'var(--c4)' }}>{item.bg}</span>
                                            </div>
                                        ) : <span style={{ color: 'var(--c4)', fontSize: 12 }}>없음</span>}
                                    </div>
                                    <div style={{ ...cs, width: CW.color }}>
                                        {item.color ? (
                                            <div className="f row aCenter" style={{ gap: 5 }}>
                                                <div style={{ width: 14, height: 14, background: item.color, border: '1px solid var(--c5)', flexShrink: 0 }} />
                                                <span style={{ fontSize: 11, color: 'var(--c4)' }}>{item.color}</span>
                                            </div>
                                        ) : <span style={{ color: 'var(--c4)', fontSize: 12 }}>없음</span>}
                                    </div>
                                    <div style={{ ...cs, width: CW.scope }}>
                                        <span className={`badge ${item.applyAll ? 'primary' : ''}`} style={{ fontSize: 11 }}>
                                            {item.applyAll ? '전체 셀' : '해당 셀만'}
                                        </span>
                                    </div>
                                    <div style={{ ...cs, width: CW.preview }}>
                                        <div className="f row" style={{ gap: 3 }}>
                                            {[1, 2, 3].map(n => (
                                                <div key={n} style={{
                                                    padding: '1px 7px', background: item.bg || 'transparent',
                                                    color: item.color || 'inherit', border: '1px solid var(--c6)',
                                                    fontWeight: 600, fontSize: 11,
                                                }}>{n}일</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ ...cs, width: CW.del, textAlign: 'center' }}>
                                        {canEdit && !isProtected && <button className="danger" style={{ padding: '2px 6px', fontSize: 11 }}
                                            onClick={(e) => handleDelete(e, item)}>삭제</button>}
                                    </div>
                                </div>
                            </DragItem>
                        );
                    })()
                ))}
            </DragDropZone>

            {items.length === 0 && (
                <div className="f ajCenter" style={{ padding: 40, color: 'var(--c4)' }}>
                    등록된 날짜타입이 없습니다.
                </div>
            )}
        </div>
    );
}

function DayTypeEditForm({ initial, onSave, canEdit = true }) {
    const [label, setLabel] = useState(initial?.label || '');
    const [bg, setBg] = useState(initial?.bg || '#ffffff');
    const [useBg, setUseBg] = useState(initial?.bg !== false);
    const [color, setColor] = useState(initial?.color || '#000000');
    const [useColor, setUseColor] = useState(initial?.color !== false);
    const [applyAll, setApplyAll] = useState(initial?.applyAll ?? true);
    const formRef = useRef(null);
    const isEdit = !!initial;

    useEffect(() => { formRef.current?.focus(); }, []);

    const handleSubmit = async () => {
        if (!canEdit) return;
        if (!label.trim()) { await alert('라벨을 입력해주세요.'); return; }
        onSave({ label: label.trim(), bg: useBg ? bg : false, color: useColor ? color : false, applyAll });
        __controllers.popup.pop();
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && (e.target === formRef.current || e.target.type === 'text')) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div ref={formRef} tabIndex={-1} className="card"
            style={{ width: 360, background: 'var(--c9)', outline: 'none' }}
            onKeyDown={onKeyDown}>
            <h4 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--c6)', paddingBottom: 8 }}>
                {isEdit ? '날짜타입 수정' : '날짜타입 추가'}
                {!canEdit && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, color: 'var(--c4)' }}>(읽기 전용)</span>}
            </h4>
            <div className="f" style={{ gap: 12 }}>
                <div className="f" style={{ gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>라벨 (고유값)</label>
                    <input type="text" value={label} onInput={(e) => setLabel(e.target.value)}
                        disabled={isEdit || !canEdit} placeholder="예: 휴일, 훈련 근무"
                        style={{ padding: '5px 8px', border: '1px solid var(--c5)', fontSize: 13 }} />
                </div>
                <div className="f" style={{ gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>배경색</label>
                    <div className="f row aCenter" style={{ gap: 8 }}>
                        <label className="f row aCenter" style={{ gap: 4, fontSize: 13 }}>
                            <input type="checkbox" checked={useBg} onChange={(e) => setUseBg(e.target.checked)} disabled={!canEdit} /> 사용
                        </label>
                        {useBg && <input type="color" value={bg} onInput={(e) => setBg(e.target.value)} disabled={!canEdit}
                            style={{ width: 36, height: 26, padding: 2, border: '1px solid var(--c5)' }} />}
                        {useBg && <span style={{ fontSize: 12, color: 'var(--c4)' }}>{bg}</span>}
                    </div>
                </div>
                <div className="f" style={{ gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>글자색</label>
                    <div className="f row aCenter" style={{ gap: 8 }}>
                        <label className="f row aCenter" style={{ gap: 4, fontSize: 13 }}>
                            <input type="checkbox" checked={useColor} onChange={(e) => setUseColor(e.target.checked)} disabled={!canEdit} /> 사용
                        </label>
                        {useColor && <input type="color" value={color} onInput={(e) => setColor(e.target.value)} disabled={!canEdit}
                            style={{ width: 36, height: 26, padding: 2, border: '1px solid var(--c5)' }} />}
                        {useColor && <span style={{ fontSize: 12, color: 'var(--c4)' }}>{color}</span>}
                    </div>
                </div>
                <div className="f" style={{ gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>적용범위</label>
                    <div className="f row" style={{ gap: 12 }}>
                        <label className="f row aCenter" style={{ gap: 4, fontSize: 13 }}>
                            <input type="radio" name="applyAll" checked={applyAll} onChange={() => setApplyAll(true)} disabled={!canEdit} />
                            전체 셀 (해당 날짜 모든 병사)
                        </label>
                        <label className="f row aCenter" style={{ gap: 4, fontSize: 13 }}>
                            <input type="radio" name="applyAll" checked={!applyAll} onChange={() => setApplyAll(false)} disabled={!canEdit} />
                            해당 타입 셀만
                        </label>
                    </div>
                </div>
                <div className="f" style={{ gap: 4 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>미리보기</label>
                    <div className="f row" style={{ gap: 4 }}>
                        {[1, 2, 3].map(n => (
                            <div key={n} style={{
                                padding: '2px 10px', background: useBg ? bg : 'transparent',
                                color: useColor ? color : 'inherit', border: '1px solid var(--c6)', fontWeight: 600, fontSize: 12,
                            }}>{n}일</div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="f row jEnd" style={{ gap: 8, marginTop: 16 }}>
                <button className="secondary" onClick={() => __controllers.popup.pop()}>
                    {canEdit ? '취소' : '닫기'}
                </button>
                {canEdit && <button onClick={handleSubmit}>{isEdit ? '저장' : '추가'}</button>}
            </div>
        </div>
    );
}
