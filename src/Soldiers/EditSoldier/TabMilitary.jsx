import { useState, useEffect, useRef } from 'preact/hooks';
import DB from '../../@modules/db.js';
import { authController } from '../../@controllers/authController.js';
import MilitarySubTabs from './@components/MilitarySubTabs.jsx';
import MilitaryAccessStatus from './@components/MilitaryAccessStatus.jsx';
import useMilitaryCredential from './@hooks/useMilitaryCredential.jsx';
import { tabMilitaryCss } from './css/tabMilitaryCss.js';

const DB_KEY_PREFIX = 'mil_cred_';

export function TabMilitary({ soldier }) {
    const {
        cred,
        setCred,
        loading,
        subTab,
        setSubTab,
    } = useMilitaryCredential(soldier.id);

    if (loading) return <div className="f ajCenter" style={{ padding: 40 }}><div className="spinner" /></div>;

    return (
        <div className="tab-military">
            <style>{tabMilitaryCss}</style>

            <MilitarySubTabs subTab={subTab} onChange={setSubTab} />

            <div className="mil-body">
                {subTab === 'setup' && (
                    <SetupPanel soldier={soldier} cred={cred} setCred={setCred} setSubTab={setSubTab} />
                )}
                {subTab === 'access' && (
                    <AccessPanel soldier={soldier} cred={cred} />
                )}
            </div>
        </div>
    );
}

// ========================================
// 설정하기 패널
// ========================================
function SetupPanel({ soldier, cred, setCred, setSubTab }) {
    const [pin, setPin] = useState('');
    const [usrId, setUsrId] = useState('');
    const [usrPw, setUsrPw] = useState('');
    const [saving, setSaving] = useState(false);

    const isLoggedIn = authController.isLoggedIn();

    const handleSave = async () => {
        if (!isLoggedIn) {
            await alert('로그인 상태에서만 저장할 수 있습니다.');
            return;
        }
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
            await alert('핀번호는 숫자 4자리여야 합니다.');
            return;
        }
        if (!usrId.trim()) {
            await alert('아이디를 입력해주세요.');
            return;
        }
        if (!usrPw.trim()) {
            await alert('비밀번호를 입력해주세요.');
            return;
        }

        setSaving(true);
        const session = authController.getSession();
        const data = {
            pin,
            usrId: usrId.trim(),
            usrPw: usrPw.trim(),
            setBy: session?.name || '알 수 없음',
            setAt: new Date().toISOString(),
        };
        await DB.save(DB_KEY_PREFIX + soldier.id, data);
        setCred(data);
        setSaving(false);
        await alert('저장되었습니다.');
        setSubTab('access');
    };

    return (
        <div className="mil-setup">
            {!isLoggedIn && (
                <div className="mil-warning">⚠️ 로그인 상태에서만 저장할 수 있습니다.</div>
            )}

            <div className="mil-form-group">
                <label className="mil-label">핀번호 (숫자 4자리)</label>
                <input
                    type="password"
                    className="esm-input"
                    maxLength={4}
                    placeholder="0000"
                    value={pin}
                    onInput={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                />
            </div>

            <div className="mil-form-group">
                <label className="mil-label">아이디</label>
                <input
                    type="text"
                    className="esm-input"
                    placeholder="국인체 아이디"
                    value={usrId}
                    onInput={(e) => setUsrId(e.target.value)}
                />
            </div>

            <div className="mil-form-group">
                <label className="mil-label">비밀번호</label>
                <input
                    type="password"
                    className="esm-input"
                    placeholder="국인체 비밀번호"
                    value={usrPw}
                    onInput={(e) => setUsrPw(e.target.value)}
                />
            </div>

            <button
                className="mil-save-btn"
                onClick={handleSave}
                disabled={saving || !isLoggedIn}
            >
                {saving ? '저장 중...' : '💾 저장하기'}
            </button>
        </div>
    );
}

// ========================================
// 국인체 접속 패널 (PIN 입력)
// ========================================
function AccessPanel({ soldier, cred }) {
    const [digits, setDigits] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const formRef = useRef(null);
    const containerRef = useRef(null);

    // 전역 keydown으로 어디서든 PIN 입력 가능
    useEffect(() => {
        const handleKeyDown = (e) => {
            // 설정 탭의 input에 포커스 중이면 무시
            if (e.target.closest('.mil-setup')) return;
            // 숫자 키만 처리
            if (!/^\d$/.test(e.key)) {
                if (e.key === 'Backspace') {
                    e.preventDefault();
                    setDigits(prev => {
                        const newDigits = [...prev];
                        // 마지막 입력된 자리 삭제
                        for (let i = 3; i >= 0; i--) {
                            if (newDigits[i] !== '') {
                                newDigits[i] = '';
                                break;
                            }
                        }
                        return newDigits;
                    });
                    setError('');
                }
                return;
            }

            e.preventDefault();
            setDigits(prev => {
                const newDigits = [...prev];
                // 첫 빈 자리에 입력
                for (let i = 0; i < 4; i++) {
                    if (newDigits[i] === '') {
                        newDigits[i] = e.key;
                        break;
                    }
                }
                return newDigits;
            });
            setError('');
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 4자리 모두 입력되면 자동 확인
    useEffect(() => {
        if (digits.every(d => d !== '')) {
            const enteredPin = digits.join('');
            if (!cred) {
                setError('설정된 정보가 없습니다.');
                setTimeout(() => setDigits(['', '', '', '']), 500);
                return;
            }
            if (enteredPin === cred.pin) {
                // PIN 일치 → 자동 로그인 실행
                submitLogin();
            } else {
                setError('핀번호가 일치하지 않습니다.');
                setTimeout(() => {
                    setDigits(['', '', '', '']);
                    setError('');
                }, 800);
            }
        }
    }, [digits]);

    const submitLogin = () => {
        if (!cred) return;
        // hidden form으로 POST 전송
        if (formRef.current) {
            // window open 후
            let win = window.open('about:blank', 'doksuri');

            formRef.current.querySelector('[name="usrId"]').value = cred.usrId;
            formRef.current.querySelector('[name="usrPw"]').value = cred.usrPw;
            formRef.current.submit();

            // setTimeout(() => {
            //     try {
            //         win.location.href = 'https://hrmnd.mhr.mil/?t';
            //     } catch (e) {
            //     }
            // }, 1456);
            // 입력 초기화
            setTimeout(() => setDigits(['', '', '', '']), 500);
        }
    };

    const setAtFormatted = cred?.setAt
        ? new Date(cred.setAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        : '';

    return (
        <div className="mil-access" ref={containerRef}>
            <MilitaryAccessStatus
                digits={digits}
                error={error}
                cred={cred}
                setAtFormatted={setAtFormatted}
            />

            {/* hidden form */}
            <form
                ref={formRef}
                action="https://hrmnd.mhr.mil/sec/login.do"
                method="post"
                target="doksuri"
                style={{ display: 'none' }}
            >
                <input type="hidden" name="usrId" value="" />
                <input type="hidden" name="usrPw" value="" />
                <input type="hidden" name="usrDvsCd" value="1" />
            </form>
        </div>
    );
}

