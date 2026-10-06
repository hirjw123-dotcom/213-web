import { useEffect, useState } from 'preact/hooks';
import { authController } from '../../@controllers/authController';

function formatTime(ts) {
    const date = new Date(ts);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function PermLogView({ permTypes }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authController.getPermissionLogs().then((loadedLogs) => {
            setLogs(loadedLogs);
            setLoading(false);
        });
    }, []);

    const getPermLabel = (id) => {
        const typeItem = permTypes.find((permType) => permType.id === id);
        return typeItem ? typeItem.label : id;
    };

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--c4)' }}>로딩 중...</div>;
    }

    if (logs.length === 0) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--c4)' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                권한 변동 기록이 없습니다.
            </div>
        );
    }

    return (
        <table className="tm-table">
            <thead>
                <tr>
                    <th style={{ width: 60 }}>구분</th>
                    <th style={{ width: 150 }}>대상</th>
                    <th style={{ width: 100 }}>처리자</th>
                    <th style={{ width: 300 }}>권한</th>
                    <th>비고</th>
                    <th style={{ width: 130 }}>시간</th>
                </tr>
            </thead>
            <tbody>
                {[...logs].reverse().map((log, idx) => (
                    <tr key={idx}>
                        <td>
                            <span className={`tm-log-action ${log.action === 'grant' ? 'tm-log-grant' : 'tm-log-revoke'}`}>
                                {log.action === 'grant' ? '부여' : '해제'}
                            </span>
                        </td>
                        <td>
                            <div style={{ fontWeight: 600 }}>{log.targetName}</div>
                            <div style={{ fontSize: 11, color: 'var(--c4)', marginLeft: 4 }}>{log.targetMilitaryId}</div>
                        </td>
                        <td style={{ fontSize: 12 }}>
                            {log.byMilitaryId || '-'}
                        </td>
                        <td>
                            <span className={`tm-perm-chip ${log.permissionId === 'master' ? 'master' : ''}`}>
                                {getPermLabel(log.permissionId)}
                            </span>
                        </td>
                        <td style={{ fontSize: 11, color: 'var(--c4)' }}>
                            {log.note || '-'}
                        </td>
                        <td className="tm-log-time">
                            {formatTime(log.timestamp)}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
