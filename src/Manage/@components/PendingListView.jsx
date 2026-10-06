import { authController } from '../../@controllers/authController';

function formatDate(ts) {
    if (!ts) return '-';
    const date = new Date(ts);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function PendingListView({ users, isMaster, reload, canEdit }) {
    const pendingUsers = users.filter((user) => (user.status || 'approved') === 'pending');
    const rejectedUsers = users.filter((user) => (user.status || 'approved') === 'rejected');

    const handleApprove = async (militaryId) => {
        if (!canEdit) return;
        if (!await confirm('가입 신청을 승인하시겠습니까?')) return;

        await authController.approveUser(militaryId);
        reload();
    };

    const handleReject = async (militaryId) => {
        if (!canEdit) return;
        if (!await confirm('가입 신청을 거부하시겠습니까?')) return;

        await authController.rejectUser(militaryId);
        reload();
    };

    const handleDelete = async (militaryId) => {
        if (!canEdit) return;
        if (!await confirm('거부된 가입 신청을 삭제하시겠습니까?')) return;

        await authController.deleteUser(militaryId);
        reload();
    };

    let pendingBody = null;
    if (pendingUsers.length === 0) {
        pendingBody = (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--c4)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                대기 중인 가입 신청이 없습니다.
            </div>
        );
    } else {
        pendingBody =
            <table className="tm-table">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th style={{ width: 150 }}>아이디</th>
                        <th style={{ width: 100 }}>이름</th>
                        <th style={{ width: 100 }}>신청일</th>
                        {canEdit && isMaster && <th style={{ width: 80 }}>승인</th>}
                        {canEdit && isMaster && <th style={{ width: 80 }}>거부</th>}
                    </tr>
                </thead>
                <tbody>
                    {pendingUsers.map((user, idx) => (
                        <tr key={user.militaryId}>
                            <td>{idx + 1}</td>
                            <td>{user.militaryId}</td>
                            <td style={{ fontWeight: 600 }}>{user.name}</td>
                            <td>{formatDate(user.createdAt)}</td>
                            {canEdit && isMaster && (
                                <td>
                                    <button
                                        className="tm-btn-sm"
                                        style={{ background: 'var(--c1)', color: '#fff', border: '1px solid var(--c1)' }}
                                        onClick={() => handleApprove(user.militaryId)}
                                    >
                                        승인
                                    </button>
                                </td>
                            )}
                            {canEdit && isMaster && (
                                <td>
                                    <button
                                        className="tm-btn-sm"
                                        style={{ background: 'var(--c1)', color: '#fff', border: '1px solid var(--c1)' }}
                                        onClick={() => handleReject(user.militaryId)}
                                    >
                                        거부
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>;
    }

    let rejectedBody = null;
    if (rejectedUsers.length === 0) {
        rejectedBody = (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--c4)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                거부된 가입 신청이 없습니다.
            </div>
        );
    } else {
        rejectedBody =
            <table className="tm-table">
                <thead>
                    <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th style={{ width: 150 }}>아이디</th>
                        <th style={{ width: 100 }}>이름</th>
                        <th style={{ width: 100 }}>신청일</th>
                        {canEdit && isMaster && <th style={{ width: 80 }}>삭제</th>}
                    </tr>
                </thead>
                <tbody>
                    {rejectedUsers.map((user, idx) => (
                        <tr key={user.militaryId}>
                            <td>{idx + 1}</td>
                            <td>{user.militaryId}</td>
                            <td style={{ fontWeight: 600 }}>{user.name}</td>
                            <td>{formatDate(user.createdAt)}</td>
                            {canEdit && isMaster && (
                                <td>
                                    <button
                                        className="tm-btn-sm"
                                        style={{ background: 'var(--c1)', color: '#fff', border: '1px solid var(--c1)' }}
                                        onClick={() => handleDelete(user.militaryId)}
                                    >
                                        삭제
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>;
    }

    return (<>
        <div className='f row' style={{ width: 1000, gap: 20 }}>
            <div style={{ flex: 1.2 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>대기 중인 가입 신청</div>
                {pendingBody}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>거부된 가입 신청</div>
                {rejectedBody}
            </div>
        </div>
    </>
    );

}
