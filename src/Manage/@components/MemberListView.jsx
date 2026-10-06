import ModalPopup from '../../@components/ModalPopup';
import { authController } from '../../@controllers/authController';
import PermissionEditPopup from './PermissionEditPopup';

function formatDate(ts) {
    if (!ts) return '-';
    const date = new Date(ts);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function MemberListView({ users, isMaster, permTypes, reload, canEdit }) {
    const approvedUsers = users.filter((user) => !['pending', 'rejected', 'deleted'].includes(user.status || 'approved'));

    const toggleSuspend = async (user) => {
        if (!canEdit) return;

        const status = user.status || 'approved';
        if (status === 'suspended') {
            await authController.unsuspendUser(user.militaryId);
        } else {
            const result = await authController.suspendUser(user.militaryId);
            if (!result.success) {
                alert(result.message);
                return;
            }
        }

        reload();
    };

    const handleDelete = async (user) => {
        if (!canEdit) return;
        if (!await confirm(`'${user.name}' 회원을 삭제하시겠습니까?\n삭제 후 7일이 지나면 자동으로 완전 삭제됩니다.`)) return;

        const result = await authController.deleteUser(user.militaryId);
        if (!result.success) {
            await alert(result.message);
            return;
        }

        reload();
    };

    const openPermEditor = (user) => {
        if (!canEdit) return;

        ModalPopup.push(
            <PermissionEditPopup
                user={user}
                permTypes={permTypes}
                onSave={reload}
            />,
        );
    };

    if (approvedUsers.length === 0) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c4)' }}>등록된 회원이 없습니다.</div>;
    }

    return (
        <table className="tm-table">
            <thead>
                <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th style={{ width: 150 }}>아이디</th>
                    <th style={{ width: 100 }}>이름</th>
                    <th style={{ width: 100 }}>가입일</th>
                    <th style={{ width: 80 }}>상태</th>
                    <th style={{ width: 140 }}>권한</th>
                    <th>&nbsp;</th>
                    {canEdit && isMaster && <th style={{ width: 140 }}>관리</th>}
                </tr>
            </thead>
            <tbody>
                {approvedUsers.map((user, idx) => {
                    const status = user.status || 'approved';
                    const isSuspended = status === 'suspended';
                    const perms = user.permissions || [];
                    const hasMasterPerm = perms.includes('master');

                    return (
                        <tr key={user.militaryId} className={isSuspended ? 'tm-suspended' : ''}>
                            <td>{idx + 1}</td>
                            <td>{user.militaryId}</td>
                            <td style={{ fontWeight: 600 }}>{user.name}</td>
                            <td>{formatDate(user.createdAt)}</td>
                            <td>
                                <span className={`tm-status-badge tm-status-${status}`}>
                                    {status === 'approved' ? '활성' : '중지'}
                                </span>
                            </td>
                            <td>
                                <div
                                    className="tm-perm-cell"
                                    onClick={() => canEdit && isMaster && openPermEditor(user)}
                                    title={canEdit && isMaster ? '클릭하여 권한 편집' : ''}
                                >
                                    {perms.length === 0 ? (
                                        <span style={{ color: 'var(--c5)', fontSize: 12 }}>-</span>
                                    ) : perms.map((permId) => {
                                        const typeInfo = permTypes.find((typeItem) => typeItem.id === permId);

                                        return (
                                            <span key={permId} className={`tm-perm-chip ${permId === 'master' ? 'master' : ''}`}>
                                                {typeInfo ? typeInfo.label : permId}
                                            </span>
                                        );
                                    })}
                                </div>
                            </td>
                            <td>&nbsp;</td>
                            {canEdit && isMaster && (
                                <td>
                                    {!hasMasterPerm && (
                                        <div className="tm-action-row">
                                            <button className="tm-btn-sm" onClick={() => toggleSuspend(user)}>
                                                {isSuspended ? '해제' : '중지'}
                                            </button>
                                            <button className="tm-btn-sm tm-btn-danger" onClick={() => handleDelete(user)}>
                                                삭제
                                            </button>
                                        </div>
                                    )}
                                </td>
                            )}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
