import { useState } from 'preact/hooks';
import { authController } from '../@controllers/authController';
import { __controllers } from '../@controllers/__controllers';
import ModalPopup from '../@components/ModalPopup';

export default function SignupPopup({ onSuccess }) {
    const [form, setForm] = useState({
        militaryId: '',
        name: '',
        password: '',
        passwordConfirm: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');

        if (!form.militaryId.trim()) {
            setError('아이디을 입력해주세요.');
            return;
        }
        if (!form.name.trim()) {
            setError('이름을 입력해주세요.');
            return;
        }
        if (!form.password) {
            setError('비밀번호를 입력해주세요.');
            return;
        }
        if (form.password !== form.passwordConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        setLoading(true);
        const result = await authController.signup({
            militaryId: form.militaryId.trim(),
            name: form.name.trim(),
            password: form.password,
        });
        setLoading(false);

        if (!result.success) {
            setError(result.message);
            return;
        }

        if (result.pending) {
            // 승인 대기 모드
            await alert(result.message);
            __controllers.popup.pop();
            return;
        }

        // 가입 성공 → 자동 로그인
        await authController.login({
            militaryId: form.militaryId.trim(),
            password: form.password,
        });

        onSuccess?.();
        __controllers.popup.pop();
    };

    const close = () => {
        __controllers.popup.pop();
    };

    return (
        <div className="signup-popup f" style={{
            width: 360,
            background: '#fff',
            border: '1px solid var(--c2)',
        }}>
            <div className="f row aCenter jBetween" style={{
                padding: '10px 16px',
                borderBottom: '1px solid var(--c6)',
                background: 'var(--c8)',
            }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>회원가입</span>
                <span onClick={close} className="pointer" style={{ fontSize: 18, lineHeight: 1 }}>✕</span>
            </div>

            <div style={{ padding: '16px 20px' }}>
                <div className="auth-field">
                    <label className="auth-label">아이디</label>
                    <input
                        type="text"
                        value={form.militaryId}
                        onInput={e => setForm({ ...form, militaryId: e.target.value })}
                        placeholder="예: 22-76012345"
                        className="auth-input"
                        autoFocus
                    />
                </div>
                <div className="auth-field">
                    <label className="auth-label">이름</label>
                    <input
                        type="text"
                        value={form.name}
                        onInput={e => setForm({ ...form, name: e.target.value })}
                        placeholder="이름 입력"
                        className="auth-input"
                    />
                </div>
                <div className="auth-field">
                    <label className="auth-label">비밀번호</label>
                    <input
                        autocomplete="off"
                        type="password"
                        value={form.password}
                        onInput={e => setForm({ ...form, password: e.target.value })}
                        placeholder="비밀번호 입력"
                        className="auth-input"
                    />
                </div>
                <div className="auth-field">
                    <label className="auth-label">비밀번호 확인</label>
                    <input
                        type="password"
                        value={form.passwordConfirm}
                        onInput={e => setForm({ ...form, passwordConfirm: e.target.value })}
                        placeholder="비밀번호 재입력"
                        className="auth-input"
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                    />
                </div>

                {error && (
                    <div className="auth-error">{error}</div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    style={{
                        width: '100%',
                        marginTop: 12,
                        padding: '8px 0',
                        background: 'var(--c1)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 14,
                        border: '1px solid var(--c1)',
                    }}
                >
                    {loading ? '처리 중...' : '가입하기'}
                </button>
            </div>
        </div>
    );
}
