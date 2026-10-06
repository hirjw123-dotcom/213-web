import { useState, useEffect } from 'preact/hooks';
import { authController } from '../@controllers/authController';
import { __controllers } from '../@controllers/__controllers';
import { accountSettingsPopupCss } from './css/accountSettingsPopupCss';

export default function AccountSettingsPopup({ militaryId }) {
    const [activeTab, setActiveTab] = useState('password');

    const close = () => __controllers.popup.pop();

    const tabs = [
        { id: 'password', label: '비밀번호 변경' },
        { id: 'master', label: '마스터 권한' },
        { id: 'myPermissions', label: '내 권한 보기' },
    ];

    return (
        <div className="acct-settings-modal">
            <style>{accountSettingsPopupCss}</style>

            <div className="asm-header">
                <span>⚙ 계정 설정</span>
                <button className="asm-close" onClick={close}>×</button>
            </div>

            <div className="asm-body">
                <div className="asm-tabs">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            className={`asm-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>

                <div className="asm-content">
                    {activeTab === 'password' && <TabPassword militaryId={militaryId} />}
                    {activeTab === 'master' && <TabMaster militaryId={militaryId} />}
                    {activeTab === 'myPermissions' && <TabMyPermissions militaryId={militaryId} />}
                </div>
            </div>
        </div>
    );
}

// ─── 탭 1: 비밀번호 변경 ─────────────────────
function TabPassword({ militaryId }) {
    const [form, setForm] = useState({ current: '', newPw: '', confirm: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError(''); setSuccess('');
        if (!form.current || !form.newPw || !form.confirm) {
            setError('모든 필드를 입력해주세요.'); return;
        }
        if (form.newPw !== form.confirm) {
            setError('새 비밀번호가 일치하지 않습니다.'); return;
        }
        setLoading(true);
        const result = await authController.changePassword({
            militaryId,
            currentPassword: form.current,
            newPassword: form.newPw,
        });
        setLoading(false);
        if (!result.success) { setError(result.message); return; }
        setSuccess('비밀번호가 변경되었습니다.');
        setForm({ current: '', newPw: '', confirm: '' });
    };

    return (
        <>
            <div className="asm-form-group">
                <label className="asm-label">현재 비밀번호</label>
                <input type="password" className="asm-input" value={form.current}
                    onInput={e => setForm({ ...form, current: e.target.value })} />
            </div>
            <div className="asm-form-group">
                <label className="asm-label">새 비밀번호</label>
                <input type="password" className="asm-input" value={form.newPw}
                    onInput={e => setForm({ ...form, newPw: e.target.value })} />
            </div>
            <div className="asm-form-group">
                <label className="asm-label">새 비밀번호 확인</label>
                <input type="password" className="asm-input" value={form.confirm}
                    onInput={e => setForm({ ...form, confirm: e.target.value })} />
            </div>
            {error && <div className="asm-error">{error}</div>}
            {success && <div className="asm-success">{success}</div>}
            <button className="asm-btn asm-btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? '처리중...' : '비밀번호 변경'}
            </button>
        </>
    );
}

// ─── 탭 2: 마스터 권한 받기 ──────────────────
function TabMaster({ militaryId }) {
    const [pw, setPw] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMaster, setIsMaster] = useState(false);

    useEffect(() => {
        authController.getUserPermissions(militaryId).then(perms => {
            setIsMaster(perms.includes('master'));
        });
    }, []);

    const handleClaim = async () => {
        setError(''); setSuccess('');
        if (!pw) { setError('마스터 비밀번호를 입력해주세요.'); return; }
        setLoading(true);
        const result = await authController.claimMaster(militaryId, pw);
        setLoading(false);
        if (!result.success) { setError(result.message); return; }
        setSuccess(result.message);
        setIsMaster(true);
        setPw('');
    };

    const handleRevoke = async () => {
        setError(''); setSuccess('');
        if (!await confirm('정말 마스터 권한을 포기하시겠습니까?\n포기 후에는 다시 비밀번호를 입력해야 합니다.')) return;
        setLoading(true);
        const result = await authController.revokeMaster(militaryId);
        setLoading(false);
        if (!result.success) { setError(result.message); return; }
        setSuccess(result.message);
        setIsMaster(false);
    };

    if (isMaster) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
                <span style={{ fontSize: 36 }}>👑</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#e65100' }}>마스터 권한이 부여되어 있습니다</span>
                {error && <div className="asm-error">{error}</div>}
                {success && <div className="asm-success">{success}</div>}
                <button
                    className="asm-btn"
                    onClick={handleRevoke}
                    disabled={loading}
                    style={{ background: '#fbe9e7', color: '#c62828', border: '1px solid #ef9a9a', fontSize: 12 }}
                >
                    {loading ? '처리 중...' : '마스터 권한 포기'}
                </button>
            </div>
        );
    }

    return (
        <>
            <p style={{ fontSize: 13, color: 'var(--c3)', marginBottom: 16 }}>
                마스터 비밀번호를 입력하면 마스터 권한이 부여됩니다.<br />
                마스터는 모든 기능과 관리 화면을 편집할 수 있습니다.
            </p>
            <div className="asm-form-group">
                <label className="asm-label">마스터 비밀번호</label>
                <input type="password" className="asm-input" value={pw}
                    onInput={e => setPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleClaim()}
                    placeholder="마스터 비밀번호 입력" />
            </div>
            {error && <div className="asm-error">{error}</div>}
            {success && <div className="asm-success">{success}</div>}
            <button className="asm-btn asm-btn-primary" onClick={handleClaim} disabled={loading}>
                {loading ? '확인 중...' : '마스터 권한 받기'}
            </button>
        </>
    );
}

// ─── 탭 3: 내 권한 보기 ─────────────────────
function TabMyPermissions({ militaryId }) {
    const [permissions, setPermissions] = useState([]);
    const [permTypes, setPermTypes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const [perms, types] = await Promise.all([
                authController.getUserPermissions(militaryId),
                authController.getPermissionTypes(),
            ]);
            setPermissions(perms);
            setPermTypes(types);
            setLoading(false);
        })();
    }, []);

    if (loading) {
        return <div className="asm-empty">로딩 중...</div>;
    }

    if (permissions.length === 0) {
        return (
            <div className="asm-empty" style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                부여된 권한이 없습니다.
            </div>
        );
    }

    return (
        <div className="asm-perm-list">
            {permissions.map(permId => {
                const typeInfo = permTypes.find(t => t.id === permId);
                const label = typeInfo ? typeInfo.label : permId;
                const isMaster = permId === 'master';
                return (
                    <div key={permId} className={`asm-perm-badge ${isMaster ? 'master' : ''}`}>
                        {isMaster && '👑 '}
                        {label}
                    </div>
                );
            })}
        </div>
    );
}
