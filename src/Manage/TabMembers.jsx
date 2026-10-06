import { useMemo, useState } from 'preact/hooks';
import TabMembersSubTabs from './@components/TabMembersSubTabs';
import MemberListView from './@components/MemberListView';
import PendingListView from './@components/PendingListView';
import DeletedListView from './@components/DeletedListView';
import SignupSettingsView from './@components/SignupSettingsView';
import AdminListView from './@components/AdminListView';
import PermLogView from './@components/PermLogView';
import useTabMembersData from './@hooks/useTabMembersData';
import { tabMembersCss } from './css/tabMembersCss';

export default function TabMembers({ canEdit = false }) {
    const [subTab, setSubTab] = useState('list');
    const { users, loading, signupMode, isMaster, permTypes, reload } = useTabMembersData();

    const pendingCount = users.filter((user) => (user.status || 'approved') === 'pending').length;
    const deletedCount = users.filter((user) => (user.status || 'approved') === 'deleted').length;

    const subTabs = useMemo(() => ([
        { id: 'list', label: '회원목록' },
        { id: 'pending', label: '가입대기', badge: pendingCount },
        { id: 'deleted', label: '삭제된 회원', badge: deletedCount },
        { id: 'settings', label: '가입 방식' },
        { id: 'admins', label: '관리자 목록' },
        { id: 'permLogs', label: '권한로그' },
    ]), [deletedCount, pendingCount]);

    return (
        <div className="f" style={{ gap: 0 }}>
            <style>{tabMembersCss}</style>

            <TabMembersSubTabs
                subTabs={subTabs}
                activeSubTab={subTab}
                onChange={setSubTab}
            />

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--c4)' }}>로딩 중...</div>
            ) : (
                <>
                    {subTab === 'list' && (
                        <MemberListView
                            users={users}
                            isMaster={isMaster}
                            permTypes={permTypes}
                            reload={reload}
                            canEdit={canEdit}
                        />
                    )}
                    {subTab === 'pending' && (
                        <PendingListView
                            users={users}
                            isMaster={isMaster}
                            reload={reload}
                            canEdit={canEdit}
                        />
                    )}
                    {subTab === 'settings' && (
                        <SignupSettingsView
                            mode={signupMode}
                            isMaster={isMaster}
                            reload={reload}
                            canEdit={canEdit}
                        />
                    )}
                    {subTab === 'deleted' && (
                        <DeletedListView
                            users={users}
                            isMaster={isMaster}
                            reload={reload}
                            canEdit={canEdit}
                        />
                    )}
                    {subTab === 'admins' && <AdminListView users={users} />}
                    {subTab === 'permLogs' && <PermLogView permTypes={permTypes} />}
                </>
            )}
        </div>
    );
}
