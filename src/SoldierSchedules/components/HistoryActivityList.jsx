import { useEffect, useMemo, useState } from 'preact/hooks';
import { _formatHistoryTimestamp, _groupActivitiesBySession, _renderActivityChip } from '../@modules/historyUtils.jsx';

const PAGE_SIZE = 30;

export default function HistoryActivityList({ activities, scheduleTypes, loading, emptyText }) {
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [activities]);

    const visibleActivities = useMemo(() => {
        return activities.slice(0, visibleCount);
    }, [activities, visibleCount]);

    const sessionGroups = useMemo(() => {
        return _groupActivitiesBySession(visibleActivities);
    }, [visibleActivities]);

    const hasMore = visibleCount < activities.length;

    const handleScroll = (event) => {
        if (!hasMore) return;

        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
        if (scrollHeight - scrollTop - clientHeight > 160) return;

        setVisibleCount((current) => Math.min(current + PAGE_SIZE, activities.length));
    };

    return (
        <div className="hist-activity-scroll" onScroll={handleScroll}>
            {loading && <div style={{ textAlign: 'center', padding: 40 }}>로딩 중...</div>}
            {!loading && activities.length === 0 && <div className="hist-empty">{emptyText}</div>}
            {!loading && sessionGroups.map((group) => (
                <div key={group.id} className="hist-session-group">
                    {group.items.map((activity) => (
                        <div key={activity.id} className="hist-activity-row">
                            <div className="hist-activity-main">
                                <span className={`row-tag ${activity.type}`}>{activity.type === 'add' ? '추가' : '제거'}</span>
                                <span className="hist-activity-soldier">{activity.soldierName}</span>
                                {activity.day != null && <span className="hist-activity-day">{activity.day}일</span>}
                                {_renderActivityChip(activity.label, scheduleTypes || [])}
                            </div>
                            <div className="hist-activity-meta">
                                <span className="hist-activity-timestamp">{_formatHistoryTimestamp(activity.timestamp)}</span>
                                <span className="hist-activity-user">{activity.user || '알 수 없음'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
            {!loading && hasMore && <div className="hist-more">스크롤하면 변경기록을 더 불러옵니다.</div>}
        </div>
    );
}