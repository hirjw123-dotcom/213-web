import { useState, useEffect } from 'preact/hooks';
import { css } from './css';

// ========================================
// 타입 편집 모달
// ========================================
export default function TypeEditorModal({ type, onSave, onDelete, onClose }) {
    // 3자리 hex를 6자리로 변환
    const normalizeColor = (c) => {
        if (!c) return '#ffffff';
        c = c.trim().toLowerCase();
        if (c.length === 4 && c[0] === '#') {
            return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
        }
        return c;
    };

    const [form, setForm] = useState({
        label: type?.label || '',
        desc: type?.desc || '',
        regExp: type?.regExp || '',
        bg: normalizeColor(type?.bg) || '#ffffff',
        color: normalizeColor(type?.color) || '#000000',
        bold: type?.bold || false,
    });

    // ESC 키로 닫기
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="type-modal-overlay" onClick={onClose}>
            <style>{css}</style>
            <div className="type-modal" onClick={(e) => e.stopPropagation()}>
                <div className="type-modal-header">{type ? '분류 수정' : '분류 추가'}</div>
                <div className="type-modal-body">
                    <div className="form-row">
                        <label>라벨 (표시 텍스트)</label>
                        <input type="text" value={form.label} onChange={(e) => setForm(p => ({ ...p, label: e.target.value }))} disabled={!!type} placeholder="주, 평, 훈" />
                    </div>
                    <div className="form-row">
                        <label>설명</label>
                        <input type="text" value={form.desc} onChange={(e) => setForm(p => ({ ...p, desc: e.target.value }))} placeholder="주말 근무" />
                    </div>
                    <div className="form-row">
                        <label>정규식 패턴 (regExp)</label>
                        <input type="text" value={form.regExp} onChange={(e) => setForm(p => ({ ...p, regExp: e.target.value }))} placeholder="*주*, *주말*" />
                    </div>
                    <div className="form-row form-row-inline">
                        <div><label>배경색</label><input type="color" value={form.bg} onChange={(e) => setForm(p => ({ ...p, bg: e.target.value }))} /></div>
                        <div><label>글자색</label><input type="color" value={form.color} onChange={(e) => setForm(p => ({ ...p, color: e.target.value }))} /></div>
                    </div>
                    <div className="form-row">
                        <label><input type="checkbox" checked={form.bold} onChange={(e) => setForm(p => ({ ...p, bold: e.target.checked }))} />굵게 표시</label>
                    </div>
                    <div className="form-row">
                        <label>미리보기</label>
                        <div className="type-preview" style={{ background: form.bg, color: form.color, fontWeight: form.bold ? 'bold' : 'normal' }}>{form.label || '?'}</div>
                    </div>
                </div>
                <div className="type-modal-actions">
                    <div>{type && <button className="btn-delete" onClick={onDelete}>삭제</button>}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={onClose}>취소</button>
                        <button className="btn-save" onClick={() => onSave(form)}>저장</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
