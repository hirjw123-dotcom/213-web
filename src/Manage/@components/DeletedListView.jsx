import { authController } from '../../@controllers/authController';

function formatDate(ts) {
    if (!ts) return '-';
    const date = new Date(ts);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function DeletedListView({ users, isMaster, reload, canEdit }) {
    const deletedUsers = users.filter((user) => (user.status || 'approved') === 'deleted');

    const handleRestore = async (user) => {
        if (!canEdit || !isMaster) return;
        if (!await confirm(`'${user.name}' 회원을 복원하시겠습니까?`)) return;

        const result = await authController.restoreUser(user.militaryId);
        if (!result.success) {
            await alert(result.message);
            return;
        }

        reload();
    };

    return (
        <div className="tm-deleted-wrap">
            <div className="tm-deleted-head">
                <div className="tm-deleted-title">삭제된 회원</div>
                <div className="tm-deleted-note">7일이 지난 항목은 자동으로 삭제됩니다.</div>
            </div>
            {deletedUsers.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#a14b52' }}>삭제된 회원이 없습니다.</div>
            ) : (
                <table className="tm-table tm-table-deleted">
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>#</th>
                            <th style={{ width: 150 }}>아이디</th>
                            <th style={{ width: 100 }}>이름</th>
                            <th style={{ width: 100 }}>삭제일</th>
                            <th style={{ width: 120 }}>삭제자</th>
                            {canEdit && isMaster && <th style={{ width: 80 }}>복원</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {deletedUsers.map((user, idx) => (
                            <tr key={user.militaryId}>
                                <td>{idx + 1}</td>
                                <td>{user.militaryId}</td>
                                <td style={{ fontWeight: 600 }}>{user.name}</td>
                                <td>{formatDate(user.deletedAt)}</td>
                                <td>{user.deletedByName || user.deletedById || '-'}</td>
                                {canEdit && isMaster && (
                                    <td>
                                        <button className="tm-btn-sm tm-btn-restore" onClick={() => handleRestore(user)}>
                                            복원
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}