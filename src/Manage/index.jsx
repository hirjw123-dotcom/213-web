import { useEffect, useState } from 'preact/hooks';
import TabDayTypes from './TabDayTypes';
import TabGeunchwiConditions from './TabGeunchwiConditions';
import TabYeolwaeConditions from './TabYeolwaeConditions';
import TabBoard from './TabBoard';
import TabMembers from './TabMembers';
import TabBattalionRotation from './TabBattalionRotation';
import TabSleepGuard from './TabSleepGuard';
import TabPermissions from './TabPermissions';
import TabBackupDB from './TabBackupDB';
import ManageSidebar from './@components/ManageSidebar';
import useManageFeaturePermissions from './@hooks/useManageFeaturePermissions';
import { authController } from '../@controllers/authController';

// 사이드바 메뉴 구조
const menuGroups = [
    {
        label: '관리하기',
        items: [
            { id: 'dayTypes', label: '날짜타입 관리', component: TabDayTypes, featureId: 'dayTypes' },
            { id: 'geunchwiConditions', label: '근취조건 관리', component: TabGeunchwiConditions, featureId: 'geunchwiConditions' },
            { id: 'yeolwaeConditions', label: '열외조건 관리', component: TabYeolwaeConditions, featureId: 'yeolwaeConditions' },
            { id: 'battalionRotation', label: '대대순번 관리', component: TabBattalionRotation, featureId: 'battalionRotation' },
            { id: 'sleepGuard', label: '불침번 시간 관리', component: TabSleepGuard, featureId: 'sleepGuard' },
        ],
    },
    {
        label: '게시판 관리',
        items: [
            { id: 'board', label: '게시판 관리', component: TabBoard, featureId: 'board' },
        ],
    },
    {
        label: '회원관리',
        items: [
            { id: 'members', label: '회원관리', component: TabMembers, featureId: 'members' },
        ],
    },
    {
        label: '권한관리',
        items: [
            { id: 'permissions', label: '권한 관리', component: TabPermissions, featureId: 'members' },
        ],
    },
].filter(i => !i.hidden);

// 전체 아이템 플랫 목록
const backupItem = { id: 'backupdb', label: 'DB 백업', component: TabBackupDB };
const allItems = [...menuGroups.flatMap(g => g.items), backupItem];

export default function Manage({ subTabId, setSubTabId }) {
    const [isMaster, setIsMaster] = useState(false);
    const currentId = subTabId || allItems[0].id;
    const current = allItems.find(i => i.id === currentId) || allItems[0];
    const allowedFeatures = useManageFeaturePermissions();

    useEffect(() => {
        if (!subTabId) {
            setSubTabId(allItems[0].id);
        }
    }, []);

    useEffect(() => {
        authController.isMaster().then(setIsMaster);
    }, []);

    const ContentComponent = current.component;
    const canEdit = !current.featureId || allowedFeatures?.[current.featureId];
    const handleOpenBackup = () => {
        if (!isMaster) {
            alert('마스터 계정만 DB 백업 화면에 들어갈 수 있습니다.');
            return;
        }
        setSubTabId('backupdb');
    };

    return (
        <div className="manage-root f row wh100p">
            <ManageSidebar
                menuGroups={menuGroups}
                currentId={currentId}
                onSelect={setSubTabId}
                onOpenBackup={handleOpenBackup}
                isBackupActive={currentId === 'backupdb'}
                canOpenBackup={isMaster}
            />

            {/* 우측 컨텐츠 영역 */}
            <div className="manage-content f1">
                <div className="manage-content-header">
                    <h3 style={{ margin: 0 }}>{current.label}</h3>
                </div>
                <div className="manage-content-body">
                    <ContentComponent canEdit={canEdit} />
                </div>
            </div>
        </div>
    );
}