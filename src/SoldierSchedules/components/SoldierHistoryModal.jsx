import { useState, useEffect, useMemo } from 'preact/hooks';
import { scheduleHistoryController } from '../../@controllers/scheduleHistoryController.js';
import { HISTORY_STYLES } from '../css/soldierScheduleCss.js';
import { useDraggableHistoryModal } from '../@hooks/useDraggableHistoryModal.js';
import { _buildHistoryActivities } from '../@modules/historyUtils.jsx';
import HistoryActivityList from './HistoryActivityList.jsx';

// ========================================
// 용사 히스토리 모달
// ========================================
export default function SoldierHistoryModal({ soldier, year, month, soldiers, scheduleTypes, onClose }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const { modalRef, modalStyle, headerProps, handleOverlayClick } = useDraggableHistoryModal();

    useEffect(() => {
        const load = async () => {
            const allHistory = await scheduleHistoryController.get(year, month);
            const relevant = allHistory
                .filter(entry => entry.type === 'schedule' && entry.changes?.some(c => c.soldierId === soldier.id))
                .map(entry => ({ ...entry, changes: entry.changes.filter(c => c.soldierId === soldier.id) }));
            setHistory(relevant);
            setLoading(false);
        };
        load();
    }, [soldier.id, year, month]);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const activities = useMemo(() => {
        return _buildHistoryActivities(history, () => `${soldier.rank} ${soldier.name}`);
    }, [history, soldier.name, soldier.rank]);

    return (
        <div className="hist-overlay" onClick={(event) => handleOverlayClick(event, onClose)}>
            <style>{HISTORY_STYLES}</style>
            <div ref={modalRef} className="hist-modal" style={{ ...modalStyle }} onClick={(e) => e.stopPropagation()}>
                <div className="hist-hdr" {...headerProps}>
                    <span>{soldier.rank} {soldier.name} — {year}년 {month}월 변경기록</span>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                <div className="hist-body">
                    <HistoryActivityList
                        activities={activities}
                        scheduleTypes={scheduleTypes}
                        loading={loading}
                        emptyText="이번 달 변경 내역이 없습니다."
                    />
                </div>
            </div>
        </div>
    );
}
