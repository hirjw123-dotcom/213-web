import { useState } from 'preact/hooks';
import { authController } from '../../@controllers/authController';
import { __controllers } from '../../@controllers/__controllers';

export default function PermissionEditPopup({ user, permTypes, onSave }) {
    const [selected, setSelected] = useState([...(user.permissions || [])]);
    const [saving, setSaving] = useState(false);

    const editableTypes = permTypes.filter((typeItem) => typeItem.id !== 'master' && typeItem.id !== 'loginRequired');

    const toggle = (id) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((perm) => perm !== id) : [...prev, id],
        );
    };

    const handleSave = async () => {
        setSaving(true);
        const session = authController.getSession();
        const hasMaster = (user.permissions || []).includes('master');
        const newPerms = hasMaster
            ? ['master', ...selected.filter((perm) => perm !== 'master')]
            : selected.filter((perm) => perm !== 'master');

        await authController.setPermissions(user.militaryId, newPerms, session?.militaryId);
        setSaving(false);
        onSave?.();
        __controllers.popup.pop();
    };

    return (
        <div className="perm-edit-popup">
            <div className="pep-header">
                <span>🔑 {user.name} 권한 편집</span>
                <button className="pep-close" onClick={() => __controllers.popup.pop()}>×</button>
            </div>
            <div className="pep-body">
                {editableTypes.length === 0 ? (
                    <div style={{ color: 'var(--c4)', fontSize: 13, padding: '12px 0' }}>
                        편집 가능한 권한이 없습니다.<br />
                        권한 관리 탭에서 권한을 먼저 추가해주세요.
                    </div>
                ) : editableTypes.map((typeItem) => (
                    <div key={typeItem.id} className="pep-item">
                        <input
                            type="checkbox"
                            checked={selected.includes(typeItem.id)}
                            onChange={() => toggle(typeItem.id)}
                            style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontWeight: 500 }}>{typeItem.label}</span>
                        <span style={{ fontSize: 11, color: 'var(--c4)' }}>({typeItem.id})</span>
                    </div>
                ))}
            </div>
            <div className="pep-footer">
                <button
                    onClick={() => __controllers.popup.pop()}
                    style={{ padding: '6px 14px', fontSize: 12 }}
                >
                    취소
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    style={{ padding: '6px 14px', fontSize: 12, background: 'var(--c1)', color: '#fff', border: '1px solid var(--c1)', fontWeight: 600 }}
                >
                    {saving ? '저장 중...' : '저장'}
                </button>
            </div>
        </div>
    );
}
