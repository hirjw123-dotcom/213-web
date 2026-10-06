import { useEffect, useState } from 'preact/hooks';
import { backupController } from '../@controllers/backupController';
import { authController } from '../@controllers/authController';
import { isBackupDB } from '../@modules/db';
import { tabBackupDbCss } from './css/tabBackupDbCss';

export default function TabBackupDB() {
    const [isMaster, setIsMaster] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [restoreLogs, setRestoreLogs] = useState([]);
    const [backupPassword, setBackupPassword] = useState('');
    const [restorePassword, setRestorePassword] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [restoreFile, setRestoreFile] = useState(null);
    const [busyAction, setBusyAction] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        const [master, user, logs] = await Promise.all([
            authController.isMaster(),
            authController.getCurrentUser(),
            backupController.getRestoreLogs(),
        ]);
        setIsMaster(master);
        setCurrentUser(user);
        setRestoreLogs(logs);
    };

    useEffect(() => {
        loadData()
            .catch((error) => {
                setStatus(error?.message || '백업 화면을 불러오지 못했습니다.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const handleExport = async () => {
        // 비번 4자 이상
        if (backupPassword.trim().length < 4) {
            alert('백업 파일 암호는 4자 이상이어야 합니다.');
            return;
        }
        setBusyAction('export');
        setStatus('');
        try {
            const result = await backupController.exportBackupFile({ password: backupPassword.trim() });
            alert(result.message || '백업이 완료되었습니다.');
            if (!result.success) return;
            setBackupPassword('');
        } catch (error) {
            alert(error?.message || '백업 중 오류가 발생했습니다.');
        } finally {
            setBusyAction('');
        }
    };

    const handleRestore = async () => {
        if (!await confirm('현재 메인 DB를 백업 파일 내용으로 덮어씁니다. 계속하시겠습니까?')) return;

        setBusyAction('restore');
        setStatus('');
        try {
            const result = await backupController.restoreBackupFile({
                file: restoreFile,
                backupPassword: restorePassword.trim(),
                adminPassword: adminPassword.trim(),
            });
            setStatus(result.message || '복원이 완료되었습니다.');
            if (!result.success) return alert(result.message || '복원에 실패했습니다.');
            setRestorePassword('');
            setAdminPassword('');
            setRestoreFile(null);
            await loadData();
            alert(`${result.message}\n페이지를 새로고침합니다.`);
            location.reload();
        } catch (error) {
            setStatus(error?.message || '복원 중 오류가 발생했습니다.');
        } finally {
            setBusyAction('');
        }
    };

    const formatDateTime = (value) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleString('ko-KR');
    };

    if (loading) {
        return <div className="bk-loading">로딩 중...</div>;
    }

    if (isBackupDB) {
        return (
            <div className="bk-root">
                <style>{tabBackupDbCss}</style>
                <div className="bk-section-header">백업 DB 읽기 전용 상태</div>
                <div className="bk-warning-card">
                    <div className="bk-section-title">접근 제한</div>
                    <div className="bk-desc">백업 DB로 접속한 상태에서는 백업과 복원을 실행할 수 없습니다.</div>
                </div>
            </div>
        );
    }

    if (!isMaster) {
        return (
            <div className="bk-root">
                <style>{tabBackupDbCss}</style>
                <div className="bk-section-header">마스터 전용 화면</div>
                <div className="bk-warning-card">
                    <div className="bk-section-title">접근 권한 없음</div>
                    <div className="bk-desc">DB 백업과 복원은 마스터 계정만 사용할 수 있습니다.</div>
                    {currentUser && (
                        <div className="bk-current-user">현재 로그인: {currentUser.name} ({currentUser.militaryId})</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bk-root">
            <style>{tabBackupDbCss}</style>

            {status && <div className="bk-feedback">{status}</div>}

            <div className="bk-grid">
                <div className="bk-card">
                    <div className="bk-section-header">백업하기</div>
                    <div className="bk-card-body">
                        <label className="bk-field">
                            <span>백업 파일 암호</span>
                            <input
                                type="password"
                                value={backupPassword}
                                onInput={(e) => setBackupPassword(e.target.value)}
                                placeholder="백업 파일을 열 때 사용할 암호"
                            />
                        </label>
                        <button className="bk-primary-btn" onClick={handleExport} disabled={busyAction === 'export'}>
                            {busyAction === 'export' ? '백업 중...' : '백업 실행'}
                        </button>
                    </div>
                </div>

                <div className="bk-card">
                    <div className="bk-section-header danger">복원하기</div>
                    <div className="bk-card-body">
                        <label className="bk-field">
                            <span>복원 파일 선택</span>
                            <input
                                type="file"
                                accept=".db,application/octet-stream,application/json"
                                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                            />
                        </label>
                        <div className="bk-file-name">{restoreFile ? restoreFile.name : '선택된 파일 없음'}</div>
                        <label className="bk-field">
                            <span>백업 파일 암호</span>
                            <input
                                type="password"
                                value={restorePassword}
                                onInput={(e) => setRestorePassword(e.target.value)}
                                placeholder="백업 파일 암호"
                            />
                        </label>
                        <label className="bk-field">
                            <span>관리자 비밀번호</span>
                            <input
                                type="password"
                                value={adminPassword}
                                onInput={(e) => setAdminPassword(e.target.value)}
                                placeholder="현재 로그인한 마스터 계정 비밀번호"
                            />
                        </label>
                        <button className="bk-danger-btn" onClick={handleRestore} disabled={busyAction === 'restore'}>
                            {busyAction === 'restore' ? '복원 중...' : '복원 실행'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bk-log-card">
                <div className="bk-section-header log">
                    복원 기록
                    <span className="bk-badge">{restoreLogs.length}</span>
                </div>

                {restoreLogs.length === 0 ? (
                    <div className="bk-empty">복원 기록이 없습니다.</div>
                ) : (
                    <table className="bk-log-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>복원 실행자</th>
                                <th>백업 파일명</th>
                                <th>백업 생성 일시</th>
                                <th>복원 일시</th>
                                <th>항목 수</th>
                            </tr>
                        </thead>
                        <tbody>
                            {restoreLogs.map((log, index) => (
                                <tr key={`${log.restoredAt}_${index}`}>
                                    <td>{restoreLogs.length - index}</td>
                                    <td>
                                        <div className="bk-log-name">{log.restorerName}</div>
                                        <div className="bk-log-id">{log.restorerMilitaryId}</div>
                                    </td>
                                    <td>{log.fileName || '-'}</td>
                                    <td>{formatDateTime(log.backupExportedAt)}</td>
                                    <td>{formatDateTime(log.restoredAt)}</td>
                                    <td><span className="bk-log-count">{log.entryCount || 0}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
