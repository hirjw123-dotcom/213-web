
import { useState } from 'preact/hooks';
import { authController } from './@controllers/authController';

export default function HomeAccessGate({ session, setSession }) {
    const [mode, setMode] = useState('login'); // 'login' | 'signup'
    const [form, setForm] = useState({ militaryId: '', name: '', password: '', pwConfirm: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const resetState = () => {
        setError('');
        setSuccess('');
        setForm({ militaryId: '', name: '', password: '', pwConfirm: '' });
    };

    const handleLogin = async () => {
        setError('');
        setSuccess('');

        if (!form.militaryId.trim() || !form.password) {
            setError('아이디와 비밀번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        const result = await authController.login({
            militaryId: form.militaryId.trim(),
            password: form.password,
        });
        setLoading(false);

        if (!result.success) {
            setError(result.message);
            return;
        }

        setSession(result.user || authController.getSession());
    };

    const handleSignup = async () => {
        setError('');
        setSuccess('');

        if (!form.militaryId.trim() || !form.name.trim() || !form.password || !form.pwConfirm) {
            setError('모든 항목을 입력해주세요.');
            return;
        }

        if (form.password !== form.pwConfirm) {
            setError('비밀번호가 일치하지 않습니다.');
            return;
        }

        if (form.password.length < 4) {
            setError('비밀번호는 4자 이상이어야 합니다.');
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
            setSuccess('가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.');
            setTimeout(() => {
                setMode('login');
                resetState();
                setSuccess('가입 대기 중: 관리자 승인 후 접속 가능합니다.');
            }, 2000);
        } else {
            setSuccess('회원가입이 완료되었습니다.');
            setTimeout(() => {
                setMode('login');
                resetState();
                setSuccess('회원가입 완료! 로그인을 진행하십시오.');
            }, 1500);
        }
    };

    const handleLogout = () => {
        authController.logout();
        setSession(null);
    };

    // ----------------------------------------------------------------
    // Render: Access Denied
    // ----------------------------------------------------------------
    if (session) {
        return (
            <GateWrapper>
                <div className="gate-content">
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <div style={{ color: 'var(--err)', fontSize: 40, marginBottom: 10 }}>⚠️</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--c2)', marginBottom: 6 }}>인가되지 않은 접근</div>
                        <div style={{ fontSize: 12, color: 'var(--c4)', lineHeight: 1.5 }}>
                            귀하의 계정은 시스템 접근 권한이 제한되어 있습니다.<br />
                            관리자에게 보안 승인을 요청하신 후 이용해 주십시오.
                        </div>
                    </div>

                    <button onClick={handleLogout} className="gate-btn" style={{ background: 'var(--c3)', borderColor: 'var(--c3)' }}>
                        접속 종료
                    </button>

                    <div style={{ marginTop: 24, padding: 10, background: 'var(--c8)', fontSize: 10, color: 'var(--c5)', border: '1px solid var(--c7)', lineHeight: 1.6 }}>
                        접속기록: {session.militaryId} ({session.name})<br />
                        시각: {new Date().toLocaleString('ko-KR')}<br />
                        상태: 권한 대기 (RESTRICTED)
                    </div>
                </div>
            </GateWrapper>
        );
    }

    // ----------------------------------------------------------------
    // Render: Auth Form
    // ----------------------------------------------------------------
    return (
        <GateWrapper>
            <div className="gate-tabs">
                <div
                    className={`gate-tab ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => { setMode('login'); resetState(); }}
                >
                    로그인
                </div>
                <div
                    className={`gate-tab ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => { setMode('signup'); resetState(); }}
                >
                    계정 생성
                </div>
            </div>

            <div className="gate-content">
                {(error || success) && (
                    <div className={`status-msg ${error ? 'error' : 'success'}`}>
                        {error || success}
                    </div>
                )}

                <div className="f">
                    <label className="gate-label">아이디</label>
                    <input
                        className="gate-input"
                        placeholder="id"
                        value={form.militaryId}
                        onInput={e => setForm(prev => ({ ...prev, militaryId: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (mode === 'login' && handleLogin())}
                    />

                    {mode === 'signup' && (
                        <>
                            <label className="gate-label">성명</label>
                            <input
                                className="gate-input"
                                placeholder="성명을 입력하세요"
                                value={form.name}
                                onInput={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </>
                    )}

                    <label className="gate-label">접속 비밀번호</label>
                    <input
                        type="password"
                        className="gate-input"
                        placeholder="••••••••"
                        value={form.password}
                        onInput={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : null)}
                    />

                    {mode === 'signup' && (
                        <>
                            <label className="gate-label">비밀번호 확인</label>
                            <input
                                type="password"
                                className="gate-input"
                                placeholder="••••••••"
                                value={form.pwConfirm}
                                onInput={e => setForm(prev => ({ ...prev, pwConfirm: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleSignup()}
                            />
                        </>
                    )}
                </div>

                <button
                    className="gate-btn"
                    onClick={mode === 'login' ? handleLogin : handleSignup}
                    disabled={loading}
                >
                    {loading ? '검증 중...' : (mode === 'login' ? '시스템 접속 승인' : '사용자 등록 요청')}
                </button>

                <div style={{ marginTop: 20, textAlign: 'center', opacity: 0.6 }}>
                    <div style={{ fontSize: 9, color: 'var(--c4)', letterSpacing: 0.5 }}>
                        데이터 보안 프로토콜 가동 중
                    </div>
                </div>
            </div>
        </GateWrapper>
    );
};

// ----------------------------------------------------------------
// Shared Layout Wrapper
// ----------------------------------------------------------------
const GateWrapper = ({ children }) => (
    <div className="f ajCenter wh100p" style={{ background: 'var(--c8)', padding: 20 }}>
        <style>{`
            .gate-container {
                width: 360px;
                border: 1px solid var(--c5);
                background: var(--c9);
                box-shadow: 2px 2px 4px rgba(0,0,0,0.05);
            }
            .gate-header {
                background: var(--c1);
                color: white;
                padding: 8px 12px;
                font-size: 11px;
                font-weight: 700;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .gate-content {
                padding: 24px 20px;
            }
            .gate-label {
                font-size: 11px;
                font-weight: 700;
                color: var(--c4);
                margin-bottom: 4px;
            }
            .gate-input {
                width: 100%;
                padding: 6px 8px;
                font-size: 13px;
                border: 1px solid var(--c6);
                background: var(--c9);
                margin-bottom: 12px;
                font-family: 'Consolas', 'Monaco', monospace;
            }
            .gate-input:focus {
                border-color: var(--c1);
                outline: none;
            }
            .gate-btn {
                width: 100%;
                padding: 8px;
                background: var(--c1);
                color: white;
                border: 1px solid var(--c1);
                font-size: 13px;
                font-weight: 700;
                cursor: pointer;
                margin-top: 8px;
            }
            .gate-btn:hover {
                background: #3e4d3f;
            }
            .gate-btn:disabled {
                background: var(--c6);
                border-color: var(--c6);
                cursor: not-allowed;
            }
            .gate-tabs {
                display: flex;
                border-bottom: 1px solid var(--c6);
                background: var(--c8);
            }
            .gate-tab {
                flex: 1;
                padding: 10px;
                font-size: 12px;
                font-weight: 700;
                color: var(--c4);
                text-align: center;
                cursor: pointer;
                background: var(--c7);
                border: none;
                border-right: 1px solid var(--c6);
            }
            .gate-tab.active {
                background: var(--c9);
                color: var(--c1);
                border-bottom: 2px solid var(--c1);
            }
            .gate-tab:last-child {
                border-right: none;
            }
            .security-tag {
                font-size: 9px;
                padding: 1px 5px;
                background: rgba(255,255,255,0.15);
                border-radius: 2px;
                letter-spacing: 0.5px;
            }
            .status-msg {
                padding: 8px 10px;
                font-size: 11px;
                margin-bottom: 16px;
                border-left: 3px solid transparent;
            }
            .status-msg.error {
                background: #fff5f5;
                border-color: var(--err);
                color: var(--err);
            }
            .status-msg.success {
                background: #f0fff4;
                border-color: #38a169;
                color: #2f855a;
            }
        `}</style>
        <div className="gate-container">
            <div className="gate-header">
                <span>시스템 접속 제어</span>
                <span className="security-tag">LEVEL 04</span>
            </div>
            {children}
        </div>
    </div>
);