import { useState } from 'react';
import { MACRO_HELP, MACRO_FIELDS, MACRO_DUTY_TYPES } from '../macroResolver';

const MARGIN_KEYS = [
    { key: 'top', label: '상' },
    { key: 'right', label: '우' },
    { key: 'bottom', label: '하' },
    { key: 'left', label: '좌' },
];

export default function DocEditorSidebar({
    templates,
    activeId,
    handleAdd,
    pasteMode,
    setPasteMode,
    activeMargin,
    handleChangeMargin,
    editingName,
    setEditingName,
    selectTemplate,
    handleRename,
    handleDelete,
    handleDuplicate,
    selectedImageId,
    selectedTableId,
    showHelp,
    setShowHelp,
}) {
    const [copiedIndex, setCopiedIndex] = useState(-1);

    const handleCopyExample = (text, index) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedIndex(index);
            setTimeout(() => setCopiedIndex(-1), 1500);
        });
    };

    return (
        <div className="f bo-sidebar">
            <div className="f row aCenter jBetween" style={{ padding: '8px 10px', borderBottom: '1px solid var(--c6)', background: 'var(--c8)' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>문서 양식 목록</span>
                <button style={{ fontSize: 12, padding: '2px 8px' }} onClick={handleAdd}>+ 추가</button>
            </div>

            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--c6)', background: 'var(--c9)' }}>
                <div style={{ fontSize: 11, marginBottom: 4, color: 'var(--c4)' }}>붙여넣기 옵션</div>
                <select
                    value={pasteMode}
                    onChange={(e) => setPasteMode(e.target.value)}
                    style={{ width: '100%', fontSize: 12, padding: '4px 6px', border: '1px solid var(--c6)' }}
                >
                    <option value="html">원본으로 넣기</option>
                    <option value="text">텍스트만 넣기</option>
                </select>
                <div style={{ fontSize: 10, color: 'var(--c4)', marginTop: 4 }}>
                    이미지는 붙여넣기에서 제거됩니다. 이미지는 페이지로 드래그 드롭하세요.
                </div>
            </div>

            {activeId && (
                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--c6)', background: 'var(--c9)' }}>
                    <div style={{ fontSize: 11, marginBottom: 6, color: 'var(--c4)' }}>문서 여백(mm)</div>
                    <div className="f row" style={{ gap: 4, flexWrap: 'wrap' }}>
                        {MARGIN_KEYS.map((marginKey) => (
                            <label key={marginKey.key} className="f row aCenter" style={{ gap: 3, width: 'calc(50% - 2px)' }}>
                                <span style={{ fontSize: 11, minWidth: 12 }}>{marginKey.label}</span>
                                <input
                                    type="number"
                                    min="0"
                                    max="60"
                                    value={activeMargin[marginKey.key]}
                                    onInput={(e) => handleChangeMargin(marginKey.key, e.target.value)}
                                    style={{ width: '100%', fontSize: 11, padding: '2px 4px', border: '1px solid var(--c6)' }}
                                />
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="f1" style={{ overflow: 'auto' }}>
                {templates.length === 0 && (
                    <div style={{ padding: 12, color: 'var(--c4)', fontSize: 12 }}>
                        양식이 없습니다. 추가 버튼을 눌러 새 양식을 만드세요.
                    </div>
                )}
                {templates.map((tpl) => (
                    <div
                        key={tpl.id}
                        className={`bo-tpl-item ${tpl.id === activeId ? 'active' : ''}`}
                        onClick={() => selectTemplate(tpl)}
                    >
                        {editingName && editingName.id === tpl.id ? (
                            <input
                                value={editingName.name}
                                onInput={(e) => setEditingName({ ...editingName, name: e.target.value })}
                                onBlur={() => handleRename(tpl.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(tpl.id); if (e.key === 'Escape') setEditingName(null); }}
                                onClick={(e) => e.stopPropagation()}
                                style={{ fontSize: 12, padding: '1px 4px', width: '100%', border: '1px solid var(--accent)' }}
                                autoFocus
                            />
                        ) : (
                            <div className="f row aCenter jBetween" style={{ gap: 4 }}>
                                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                    {tpl.name}
                                </span>
                                <div className="f row" style={{ gap: 2, flexShrink: 0 }}>
                                    <button
                                        style={{ fontSize: 10, padding: '1px 4px' }}
                                        onClick={(e) => { e.stopPropagation(); handleDuplicate(tpl); }}
                                        title="복제"
                                    >⎘</button>
                                    <button
                                        style={{ fontSize: 10, padding: '1px 4px' }}
                                        onClick={(e) => { e.stopPropagation(); setEditingName({ id: tpl.id, name: tpl.name }); }}
                                        title="이름 변경"
                                    >✏</button>
                                    <button
                                        className="danger"
                                        style={{ fontSize: 10, padding: '1px 4px' }}
                                        onClick={(e) => { e.stopPropagation(); handleDelete(tpl.id); }}
                                        title="삭제"
                                    >✕</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {selectedImageId && (
                <div style={{ padding: '6px 10px', borderTop: '1px solid var(--c6)', background: 'var(--c9)', fontSize: 11, color: 'var(--c4)' }}>
                    이미지 선택됨: 드래그로 이동, 우하단 핸들로 크기 조절 (Shift: 비율 유지)
                </div>
            )}

            {selectedTableId && (
                <div style={{ padding: '6px 10px', borderTop: '1px solid var(--c6)', background: 'var(--c9)', fontSize: 11, color: 'var(--c4)' }}>
                    표 선택됨: 좌상단 핸들로 이동, 우하단 핸들로 가로 크기 조절 (셀 내용 편집 가능)
                </div>
            )}

            <div style={{ borderTop: '1px solid var(--c6)' }}>
                <div
                    className="f row aCenter pointer"
                    style={{ padding: '6px 10px', background: 'var(--c8)', gap: 4 }}
                    onClick={() => setShowHelp(!showHelp)}
                >
                    <span style={{ fontSize: 12, fontWeight: 600 }}>약어 도움말</span>
                    <span style={{ fontSize: 10, marginLeft: 'auto' }}>{showHelp ? '▲' : '▼'}</span>
                </div>
                {showHelp && (
                    <div style={{ padding: '8px 10px', fontSize: 11, maxHeight: 300, overflow: 'auto', background: '#fffff8' }}>
                        <div style={{ marginBottom: 6, fontWeight: 600 }}>근무 타입:</div>
                        <div style={{ marginBottom: 8, color: 'var(--c3)' }}>
                            {MACRO_DUTY_TYPES.join(', ')}
                        </div>
                        <div style={{ marginBottom: 6, fontWeight: 600 }}>사용 가능 필드:</div>
                        <div style={{ marginBottom: 8, color: 'var(--c3)' }}>
                            {MACRO_FIELDS.join(', ')}
                        </div>
                        <div style={{ marginBottom: 4, fontWeight: 600 }}>예시 <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--c4)' }}>(클릭하면 복사)</span>:</div>
                        {MACRO_HELP.map((helpItem, index) => (
                            <div key={index} style={{ marginBottom: 4 }}>
                                <code
                                    style={{
                                        background: copiedIndex === index ? '#c8f7c5' : 'var(--c8)',
                                        padding: '1px 4px',
                                        border: `1px solid ${copiedIndex === index ? '#4caf50' : 'var(--c7)'}`,
                                        fontSize: 12,
                                        wordBreak: 'break-all',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s, border-color 0.2s',
                                        position: 'relative',
                                    }}
                                    title="클릭하여 복사"
                                    onClick={() => handleCopyExample(helpItem.example, index)}
                                >
                                    {helpItem.example}
                                    {copiedIndex === index && (
                                        <span style={{
                                            marginLeft: 6,
                                            fontSize: 10,
                                            color: '#388e3c',
                                            fontFamily: 'inherit',
                                        }}>✓ 복사됨</span>
                                    )}
                                </code>
                                <div style={{ color: 'var(--c4)', marginLeft: 4, marginTop: 1 }}>→ {helpItem.desc}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
