import { useState, useEffect, useRef } from 'preact/hooks';
import { authController } from '../@controllers/authController';
import { __controllers } from '../@controllers/__controllers';
import ModalPopup from '../@components/ModalPopup';
import SignupPopup from './SignupPopup';
import { loginPopupCss } from './css/loginPopupCss';
const maskLast4 = (v) => {
    const s = String(v ?? "");
    return s.replace(/.(?=.{4})/g, "*"); // 마지막 4글자만 남기고 나머지 전부 *
};
export default function LoginPopup({ onSuccess }) {
    const [form, setForm] = useState({ militaryId: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 자동완성
    const [allIds, setAllIds] = useState([]);
    const [filteredIds, setFilteredIds] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // 팝업이 열리면 가입된 아이디 목록 캐시
    useEffect(() => {
        authController.getMilitaryIds().then(ids => {
            setAllIds(ids.filter(u => u.status === 'approved'));
        });
    }, []);

    // 입력 변경 시 필터링
    const handleMilitaryIdInput = (val) => {
        setForm(prev => ({ ...prev, militaryId: val }));
        if (val.trim()) {
            let matches = allIds.filter(u =>
                u.militaryId.includes(val.trim())
            );
            setFilteredIds(matches);
            setShowSuggestions(matches.length > 0);
            setSelectedIdx(-1);
        } else {
            setFilteredIds([]);
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (item) => {
        setForm(prev => ({ ...prev, militaryId: item.militaryId }));
        setShowSuggestions(false);
        setSelectedIdx(-1);
    };

    const handleKeyDown = (e) => {
        if (!showSuggestions) {
            if (e.key === 'Enter') handleLogin();
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(prev => Math.min(prev + 1, filteredIds.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(prev => Math.max(prev - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIdx >= 0 && selectedIdx < filteredIds.length) {
                selectSuggestion(filteredIds[selectedIdx]);
            } else {
                handleLogin();
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleLogin = async () => {
        setError('');
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
        if (!result.success) { setError(result.message); return; }
        onSuccess?.(result.user);
        __controllers.popup.pop();
    };

    const openSignup = () => {
        __controllers.popup.pop();
        ModalPopup.push(<SignupPopup onSuccess={onSuccess} />);
    };

    const close = () => __controllers.popup.pop();

    return (
        <div className="login-popup-modal">
            <style>{loginPopupCss}</style>

            <div className="lpm-header">
                <span className="lpm-header-title">🔐 로그인</span>
                <button className="lpm-close" onClick={close}>×</button>
            </div>

            <div className="lpm-body">
                <div className="lpm-field">
                    <label className="lpm-label">아이디</label>
                    <input
                        ref={inputRef}
                        type="text"
                        className="lpm-input"
                        value={form.militaryId}
                        onInput={e => handleMilitaryIdInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onFocus={() => {
                            if (form.militaryId.trim() && filteredIds.length > 0) {
                                setShowSuggestions(true);
                            }
                        }}
                        placeholder="예: 22-76012345"
                        autoFocus
                        autoComplete="off"
                    />
                    {showSuggestions && filteredIds.length > 0 && (
                        <div className="lpm-suggestions" ref={suggestionsRef}>
                            {filteredIds.map((item, idx) => (
                                <div
                                    key={item.militaryId}
                                    className={`lpm-suggestion-item ${idx === selectedIdx ? 'selected' : ''}`}
                                    onMouseDown={() => selectSuggestion(item)}
                                >
                                    <span>{maskLast4(item.militaryId)}</span>
                                    <span className="lpm-suggestion-name">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="lpm-field">
                    <label className="lpm-label">비밀번호</label>
                    <input
                        type="password"
                        className="lpm-input"
                        value={form.password}
                        onInput={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                        placeholder="비밀번호 입력"
                        autoComplete="off"
                    />
                </div>

                {error && <div className="lpm-error">{error}</div>}

                <div className="lpm-actions">
                    <button className="lpm-btn-login" onClick={handleLogin} disabled={loading}>
                        {loading ? '로그인 중...' : '로그인'}
                    </button>
                </div>
            </div>

            <div className="lpm-footer">
                <span>계정이 없으신가요?</span>
                <span className="lpm-link" onClick={openSignup}>회원가입</span>
            </div>
        </div>
    );
}
