import { useState } from 'preact/hooks';
import { authController } from '../@controllers/authController';
import { __controllers } from '../@controllers/__controllers';

export default function PasswordChangePopup({ militaryId }) {
    const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        if (!form.current || !form.newPw || !form.confirm) {
            setError('모든 필드를 입력해주세요.');
            return;
        }
        if (form.newPw !== form.confirm) {
            setError('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        setLoading(true);
        const result = await authController.changePassword({
            militaryId,
            currentPassword: form.current,
            newPassword: form.newPw,
        });
        setLoading(false);
        if (!result.success) {
            setError(result.message);
            return;
        }
        await alert('비밀번호가 변경되었습니다.');
        __controllers.popup.pop();
    };

    const labelStyle = { fontSize: 12, fontWeight: 600, marginBottom: 2 };
    const inputStyle = { fontSize: 12, padding: '4px 8px', width: '100%', boxSizing: 'border-box' };

    return (
        <div className="f" style={{ width: 280, gap: 12, padding: 16, background:'#fff' }}>
            <div style={{ fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--c7)', paddingBottom: 8 }}>
                비밀번호 변경
            </div>

            <div className="f" style={{ gap: 4 }}>
                <label style={labelStyle}>현재 비밀번호</label>
                <input type="password" value={form.current}
                    onInput={e => setForm({ ...form, current: e.target.value })}
                    style={inputStyle} />
            </div>

            <div className="f" style={{ gap: 4 }}>
                <label style={labelStyle}>새 비밀번호</label>
                <input type="password" value={form.newPw}
                    onInput={e => setForm({ ...form, newPw: e.target.value })}
                    style={inputStyle} />
            </div>

            <div className="f" style={{ gap: 4 }}>
                <label style={labelStyle}>새 비밀번호 확인</label>
                <input type="password" value={form.confirm}
                    onInput={e => setForm({ ...form, confirm: e.target.value })}
                    style={inputStyle} />
            </div>

            {error && <div style={{ color: 'var(--err)', fontSize: 11 }}>{error}</div>}

            <div className="f row" style={{ gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => __controllers.popup.pop()}
                    style={{ fontSize: 12, padding: '4px 12px' }}>취소</button>
                <button onClick={handleSubmit} disabled={loading}
                    style={{ fontSize: 12, padding: '4px 12px' }}>
                    {loading ? '처리중...' : '변경'}
                </button>
            </div>
        </div>
    );
}
