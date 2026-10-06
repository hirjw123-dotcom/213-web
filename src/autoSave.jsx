import { isBackupDB, backupDBDate } from './@modules/db.js';

const isBeforeDBUsed = isBackupDB;
const beforeDBDate = backupDBDate;

export const AutoSavedTopHeaderLabel = () => {
    if (!isBeforeDBUsed) return null;

    return (<>
        <div style={{
            background: '#e74c3c', color: '#fff', textAlign: 'center', padding: '6px 0', fontWeight: 'bold',
            cursor: 'pointer'
        }} onClick={async () => {
            if (await confirm('메인 DB로 돌아가시겠습니까?')) {
                window.location.href = './';
            }
        }}>
            {beforeDBDate} 의 백업 DB로 접속했습니다. [돌아가기]
        </div>
    </>);
};