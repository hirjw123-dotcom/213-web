import { useState, useEffect } from 'preact/hooks';
import { __controllers } from '../@controllers/__controllers';
import { colorSettingsController } from '../@controllers/colorSettingsController';
import { soldierCategoriesController } from '../@controllers/soldierCategoriesController';
import ModalPopup from '../@components/ModalPopup';

function ColorPicker({ label, value, onChange, onClear }) {
    return (
        <div className="f row aCenter" style={{ gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 12, width: 50, color: 'var(--c3)' }}>{label}</span>
            <input
                type="color"
                value={value || '#000000'}
                onChange={e => onChange(e.target.value)}
                style={{ width: 28, height: 22, padding: 0, border: '1px solid var(--c6)', cursor: 'pointer' }}
            />
            {value && (
                <span
                    onClick={onClear}
                    style={{ fontSize: 11, color: 'var(--c4)', cursor: 'pointer', textDecoration: 'underline' }}
                >해제</span>
            )}
        </div>
    );
}

function ThresholdEditor({ item, index, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ ...item });

    if (!editing) {
        return (
            <div
                className="zzam-color-item f row aCenter pointer"
                onClick={() => setEditing(true)}
                style={{
                    backgroundColor: item.bg || 'transparent',
                    color: item.color || 'inherit',
                    border: item.border ? `2px solid ${item.border}` : '1px solid var(--c7)',
                    padding: '6px 10px',
                    marginBottom: 2,
                }}
            >
                <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
                <span style={{ fontSize: 12 }}>≥ {item.percentOver}%</span>
            </div>
        );
    }

    return (
        <div className="zzam-edit-form" style={{
            border: '2px solid var(--accent)',
            padding: 10,
            marginBottom: 4,
            background: '#fff',
        }}>
            <div className="f row aCenter" style={{ gap: 8, marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--c3)' }}>라벨</label>
                <input
                    value={form.label}
                    onInput={e => setForm({ ...form, label: e.target.value })}
                    style={{ flex: 1, fontSize: 12, padding: '2px 6px' }}
                />
            </div>
            <div className="f row aCenter" style={{ gap: 8, marginBottom: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--c3)' }}>복무율 ≥</label>
                <input
                    type="number"
                    min="0" max="100"
                    value={form.percentOver}
                    onInput={e => setForm({ ...form, percentOver: Number(e.target.value) })}
                    style={{ width: 60, fontSize: 12, padding: '2px 6px' }}
                />
                <span style={{ fontSize: 11, color: 'var(--c4)' }}>%</span>
            </div>
            <ColorPicker
                label="배경색"
                value={form.bg}
                onChange={v => setForm({ ...form, bg: v })}
                onClear={() => setForm({ ...form, bg: false })}
            />
            <ColorPicker
                label="글자색"
                value={form.color}
                onChange={v => setForm({ ...form, color: v })}
                onClear={() => setForm({ ...form, color: false })}
            />
            <ColorPicker
                label="테두리"
                value={form.border}
                onChange={v => setForm({ ...form, border: v })}
                onClear={() => setForm({ ...form, border: false })}
            />
            <div className="f row" style={{ gap: 4, marginTop: 8 }}>
                <button onClick={() => { onSave(index, form); setEditing(false); }}
                    style={{ fontSize: 12, padding: '3px 12px' }}>저장</button>
                <button onClick={() => { setEditing(false); setForm({ ...item }); }}
                    className="secondary" style={{ fontSize: 12, padding: '3px 12px' }}>취소</button>
                <div style={{ flex: 1 }} />
                <button onClick={() => { onDelete(index); setEditing(false); }}
                    className="danger" style={{ fontSize: 12, padding: '3px 8px' }}>삭제</button>
            </div>
        </div>
    );
}

function CategoryColorEditor({ category, colorData, onSave, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({
        bg: colorData?.bg || false,
        color: colorData?.color || false,
        border: colorData?.border || false,
    });

    const hasColor = colorData && (colorData.bg || colorData.color || colorData.border);

    if (!editing) {
        const previewStyle = {
            padding: '5px 10px',
            marginBottom: 2,
            border: hasColor && colorData.border ? `2px solid ${colorData.border}` : '1px solid var(--c7)',
        };
        if (hasColor && colorData.bg) previewStyle.backgroundColor = colorData.bg;
        if (hasColor && colorData.color) previewStyle.color = colorData.color;

        const tags = [];
        if (colorData?.bg) tags.push('배경');
        if (colorData?.color) tags.push('글자');
        if (colorData?.border) tags.push('테두리');

        return (
            <div
                className="cat-color-item f row aCenter pointer"
                onClick={() => setEditing(true)}
                style={previewStyle}
            >
                <span style={{
                    fontSize: 13,
                    flex: 1,
                    fontWeight: category.bold ? 700 : 400,
                }}>{category.label}</span>
                {hasColor ? (
                    <span style={{ fontSize: 11, opacity: 0.7 }}>{tags.join(', ')}</span>
                ) : (
                    <span style={{ fontSize: 11, color: 'var(--c5)' }}>미설정</span>
                )}
            </div>
        );
    }

    return (
        <div className="cat-edit-form" style={{
            border: '2px solid var(--accent)',
            padding: 10,
            marginBottom: 4,
            background: '#fff',
        }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{category.label}</div>
            <ColorPicker
                label="배경색"
                value={form.bg}
                onChange={v => setForm({ ...form, bg: v })}
                onClear={() => setForm({ ...form, bg: false })}
            />
            <ColorPicker
                label="글자색"
                value={form.color}
                onChange={v => setForm({ ...form, color: v })}
                onClear={() => setForm({ ...form, color: false })}
            />
            <ColorPicker
                label="테두리"
                value={form.border}
                onChange={v => setForm({ ...form, border: v })}
                onClear={() => setForm({ ...form, border: false })}
            />
            <div className="f row" style={{ gap: 4, marginTop: 8 }}>
                <button onClick={() => { onSave(category.id, form); setEditing(false); }}
                    style={{ fontSize: 12, padding: '3px 12px' }}>저장</button>
                <button onClick={() => setEditing(false)}
                    className="secondary" style={{ fontSize: 12, padding: '3px 12px' }}>취소</button>
                {hasColor && (
                    <>
                        <div style={{ flex: 1 }} />
                        <button onClick={() => { onDelete(category.id); setEditing(false); }}
                            className="danger" style={{ fontSize: 12, padding: '3px 8px' }}>초기화</button>
                    </>
                )}
            </div>
        </div>
    );
}

export default function ColorSettingsPopup({ onClose, onUpdate }) {
    const [zzamColors, setZzamColors] = useState([]);
    const [categories, setCategories] = useState([]);
    const [categoryColorMap, setCategoryColorMap] = useState({});

    const loadData = async () => {
        const [colors, cats, catColors] = await Promise.all([
            colorSettingsController.get(),
            soldierCategoriesController.get(),
            colorSettingsController.getCategoryColors(),
        ]);
        setZzamColors(colors);
        // 간부 카테고리는 색상 설정에서 제외 (soldierCategoriesController에서 관리)
        const officerCat = cats.find(c => c.label === '간부');
        setCategories(cats.filter(c => !officerCat || c.id !== officerCat.id));
        setCategoryColorMap(catColors);
    };

    useEffect(() => { loadData(); }, []);

    const notifyUpdate = () => { onUpdate?.(); };

    const handleSaveThreshold = async (index, data) => {
        await colorSettingsController.update(index, data);
        loadData();
        notifyUpdate();
    };

    const handleDeleteThreshold = async (index) => {
        await colorSettingsController.delete(index);
        loadData();
        notifyUpdate();
    };

    const handleAddThreshold = async () => {
        await colorSettingsController.add({
            label: '새 구간',
            percentOver: 0,
            bg: '#888888',
            color: false,
            border: false,
        });
        loadData();
        notifyUpdate();
    };

    const handleReset = async () => {
        if (!await confirm('복무율 색상을 기본값으로 초기화하시겠습니까?')) return;
        await colorSettingsController.reset();
        loadData();
        notifyUpdate();
    };

    const handleSaveCategoryColor = async (catId, data) => {
        await colorSettingsController.saveCategoryColor(catId, data);
        loadData();
        notifyUpdate();
    };

    const handleDeleteCategoryColor = async (catId) => {
        await colorSettingsController.deleteCategoryColor(catId);
        loadData();
        notifyUpdate();
    };

    const close = () => {
        onClose?.();
        __controllers.popup.pop();
    };

    return (
        <div className="color-settings-popup f" style={{
            width: 420,
            maxHeight: '80vh',
            background: '#fff',
            border: '1px solid var(--c2)',
        }}>
            {/* 헤더 */}
            <div className="f row aCenter jBetween" style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--c6)',
                background: 'var(--c8)',
            }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>복무율 색상 설정</span>
                <span onClick={close} className="pointer" style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
            </div>

            <div style={{ overflow: 'auto', flex: 1 }}>
                <div style={{ padding: '12px 16px' }}>
                    <div className="f row aCenter jBetween" style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c3)' }}>
                            복무율 기반 색상
                        </span>
                        <div className="f row" style={{ gap: 4 }}>
                            <button onClick={handleReset} className="secondary" style={{ fontSize: 11, padding: '2px 8px' }}>
                                기본값 초기화
                            </button>
                            <button onClick={handleAddThreshold} style={{ fontSize: 11, padding: '2px 8px' }}>
                                + 추가
                            </button>
                        </div>
                    </div>
                    {zzamColors.map((item, i) => (
                        <ThresholdEditor
                            key={i}
                            item={item}
                            index={i}
                            onSave={handleSaveThreshold}
                            onDelete={handleDeleteThreshold}
                        />
                    ))}
                </div>

                {/* 구분선 */}
                <div style={{ borderTop: '1px solid var(--c6)', margin: '0 16px' }} />

                {/* 카테고리별 색상 회차 */}
                <div style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c3)', display: 'block', marginBottom: 8 }}>
                        카테고리별 색상 (1순위 적용)
                    </span>
                    <div style={{ fontSize: 11, color: 'var(--c4)', marginBottom: 8 }}>
                        카테고리에 설정된 색상은 복무율 색상보다 우선 적용됩니다.
                    </div>
                    {categories.map(cat => (
                        <CategoryColorEditor
                            key={cat.id}
                            category={cat}
                            colorData={categoryColorMap[cat.id]}
                            onSave={handleSaveCategoryColor}
                            onDelete={handleDeleteCategoryColor}
                        />
                    ))}
                </div>
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
