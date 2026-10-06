import { useState } from 'preact/hooks';
import { authController } from '../../@controllers/authController';

export default function SignupSettingsView({ mode, isMaster, reload, canEdit }) {
    const [saving, setSaving] = useState(false);

    const handleChange = async (newMode) => {
        if (!canEdit || !isMaster) return;

        setSaving(true);
        await authController.setSignupMode(newMode);
        setSaving(false);
        reload();
    };

    return (
        <div>
            <p style={{ fontSize: 13, color: 'var(--c3)', marginBottom: 16 }}>
                새 회원 가입 시 적용되는 방식을 선택합니다.
            </p>
            <div className="tm-radio-group">
                <div
                    className={`tm-radio-item ${mode === 'auto' ? 'selected' : ''}`}
                    onClick={() => handleChange('auto')}
                    style={{ cursor: (canEdit && isMaster) ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}
                >
                    <input type="radio" checked={mode === 'auto'} readOnly style={{ marginTop: 2 }} />
                    <div>
                        <div className="tm-radio-title">자동 가입</div>
                        <div className="tm-radio-desc">회원가입 즉시 계정이 활성화되어 로그인할 수 있습니다.</div>
                    </div>
                </div>
                <div
                    className={`tm-radio-item ${mode === 'approval' ? 'selected' : ''}`}
                    onClick={() => handleChange('approval')}
                    style={{ cursor: (canEdit && isMaster) ? 'pointer' : 'default', opacity: saving ? 0.6 : 1 }}
                >
                    <input type="radio" checked={mode === 'approval'} readOnly style={{ marginTop: 2 }} />
                    <div>
                        <div className="tm-radio-title">승인 후 가입</div>
                        <div className="tm-radio-desc">
                            회원가입 신청 후 관리자가 승인해야 로그인할 수 있습니다.
                            <br />대기 중인 신청은 '가입대기' 탭에서 확인할 수 있습니다.
                        </div>
                    </div>
                </div>
            </div>
            {(!isMaster || !canEdit) && (
                <div style={{ fontSize: 12, color: 'var(--c4)', marginTop: 12 }}>
                    ⚠ 마스터 권한이 있어야 가입 방식을 변경할 수 있습니다.
                </div>
            )}
        </div>
    );
}
