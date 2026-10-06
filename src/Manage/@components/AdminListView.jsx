import { useEffect, useState } from 'preact/hooks';
import { authController } from '../../@controllers/authController';

function formatTime(ts) {
    const date = new Date(ts);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function AdminListView({ users }) {
    const [adminLogs, setAdminLogs] = useState([]);
    const [logLoading, setLogLoading] = useState(true);

    const admins = users.filter((user) => (user.permissions || []).includes('master'));

    useEffect(() => {
        authController.getAdminLogs().then((logs) => {
            setAdminLogs(logs);
            setLogLoading(false);
        });
    }, []);

    return (
        <div className="tm-admin-wrap">
            <div className="tm-admin-panel">
                <div className="tm-admin-panel-header">👑 현재 관리자 ({admins.length}명)</div>
                <div className="tm-admin-panel-body">
                    {admins.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--c4)', fontSize: 13 }}>
                            관리자가 없습니다.
                        </div>
                    ) : admins.map((user) => (
                        <div key={user.militaryId} className="tm-admin-item">
                            <span style={{ fontSize: 16 }}>👑</span>
                            <div>
                                <div style={{ fontWeight: 600 }}>{user.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--c4)' }}>{user.militaryId}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="tm-admin-panel" style={{ width: 500 }}>
                <div className="tm-admin-panel-header">📋 관리자 권한 변동 로그</div>
                <div className="tm-admin-panel-body">
                    {logLoading ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--c4)', fontSize: 13 }}>로딩 중...</div>
                    ) : adminLogs.length === 0 ? (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--c4)', fontSize: 13 }}>
                            기록이 없습니다.
                        </div>
                    ) : [...adminLogs].reverse().map((log, idx) => (
                        <div key={idx} className="tm-log-item">
                            <span className={`tm-log-action ${log.action === 'grant' ? 'tm-log-grant' : 'tm-log-revoke'}`}>
                                {log.action === 'grant' ? '부여' : '해제'}
                            </span>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontWeight: 600 }}>{log.targetName}</span>
                                {log.byMilitaryId && log.byMilitaryId !== log.targetMilitaryId && (
                                    <span style={{ color: 'var(--c4)', fontSize: 11 }}> (by {log.byMilitaryId})</span>
                                )}
                                {log.note && <div style={{ fontSize: 11, color: 'var(--c4)' }}>{log.note}</div>}
                            </div>
                            <span className="tm-log-time">{formatTime(log.timestamp)}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
