import { useState, useEffect, useMemo } from 'preact/hooks';
import { soldiersController } from '../../@controllers/soldiersController.js';
import { scheduleTypesController } from '../../@controllers/soldierScheduleTypesController.js';
import { scheduleHistoryController } from '../../@controllers/scheduleHistoryController.js';
import { HISTORY_STYLES } from '../css/soldierScheduleCss.js';
import { useDraggableHistoryModal } from '../@hooks/useDraggableHistoryModal.js';
import { _buildHistoryActivities } from '../@modules/historyUtils.jsx';
import HistoryActivityList from './HistoryActivityList.jsx';

// ========================================
// 전체 변경 히스토리 모달
// ========================================
export default function FullHistoryModal({ year, month, onClose }) {
    const [history, setHistory] = useState([]);
    const [soldiers, setSoldiers] = useState([]);
    const [scheduleTypes, setScheduleTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { modalRef, modalStyle, headerProps, handleOverlayClick } = useDraggableHistoryModal();

    useEffect(() => {
        const load = async () => {
            const [allHistory, soldierList, types] = await Promise.all([
                scheduleHistoryController.get(year, month),
                soldiersController.get(),
                scheduleTypesController.get(),
            ]);
            const relevant = allHistory.filter(e => e.type === 'schedule');
            setHistory(relevant);
            setSoldiers(soldierList);
            setScheduleTypes(types);
            setLoading(false);
        };
        load();
    }, [year, month]);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    const findName = (id) => {
        const s = soldiers.find(s => s.id === id);
        return s ? `${s.rank} ${s.name}` : '알 수 없음';
    };

    const activities = useMemo(() => {
        return _buildHistoryActivities(history, findName);
    }, [history, soldiers]);

    return (
        <div className="hist-overlay" onClick={(event) => handleOverlayClick(event, onClose)}>
            <style>{HISTORY_STYLES}</style>
            <div ref={modalRef} className="hist-modal" style={{ ...modalStyle }} onClick={(e) => e.stopPropagation()}>
                <div className="hist-hdr" {...headerProps}>
                    <span>{year}년 {month}월 — 전체 변경 히스토리</span>
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
