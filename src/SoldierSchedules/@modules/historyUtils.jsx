const SESSION_GROUP_WINDOW_MS = 60 * 1000;

const buildCountMap = (labels = []) => {
    const counts = {};
    for (const label of labels) {
        counts[label] = (counts[label] || 0) + 1;
    }
    return counts;
};

export const _getDiffLabels = (before = [], after = []) => {
    const beforeRemaining = buildCountMap(before);
    const afterRemaining = buildCountMap(after);
    const removed = [];
    const added = [];

    for (const label of before) {
        if (afterRemaining[label] > 0) {
            afterRemaining[label] -= 1;
            continue;
        }
        removed.push(label);
    }

    for (const label of after) {
        if (beforeRemaining[label] > 0) {
            beforeRemaining[label] -= 1;
            continue;
        }
        added.push(label);
    }

    return { added, removed };
};

export const _buildHistoryActivities = (entries = [], findName) => {
    const activities = [];
    let order = 0;

    for (const entry of entries || []) {
        for (const change of entry.changes || []) {
            const { added, removed } = _getDiffLabels(change.before || [], change.after || []);

            for (const label of removed) {
                activities.push({
                    id: `${entry.timestamp}_${order}_del_${change.soldierId}_${change.day}_${label}`,
                    timestamp: entry.timestamp,
                    user: entry.user || '',
                    type: 'del',
                    label,
                    day: change.day,
                    soldierId: change.soldierId,
                    soldierName: findName(change.soldierId),
                });
                order += 1;
            }

            for (const label of added) {
                activities.push({
                    id: `${entry.timestamp}_${order}_add_${change.soldierId}_${change.day}_${label}`,
                    timestamp: entry.timestamp,
                    user: entry.user || '',
                    type: 'add',
                    label,
                    day: change.day,
                    soldierId: change.soldierId,
                    soldierName: findName(change.soldierId),
                });
                order += 1;
            }
        }
    }

    return activities.sort((left, right) => {
        if (right.timestamp !== left.timestamp) return right.timestamp - left.timestamp;
        return left.id.localeCompare(right.id, 'ko');
    });
};

export const _groupActivitiesBySession = (activities = []) => {
    const groups = [];

    for (const activity of activities) {
        const currentGroup = groups[groups.length - 1];
        const lastItem = currentGroup?.items[currentGroup.items.length - 1] || null;
        const isSameSession = !!currentGroup
            && currentGroup.user === activity.user
            && Math.abs((lastItem?.timestamp || 0) - activity.timestamp) <= SESSION_GROUP_WINDOW_MS;

        if (isSameSession) {
            currentGroup.items.push(activity);
            continue;
        }

        groups.push({
            id: activity.id,
            user: activity.user,
            items: [activity],
        });
    }

    return groups;
};

export const _formatHistoryTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const _renderActivityChip = (label, scheduleTypes = []) => {
    const scheduleType = scheduleTypes.find((item) => item.label === label);
    if (scheduleType) {
        return (
            <span
                className="hist-chip"
                style={{
                    background: scheduleType.bg || '#eee',
                    color: scheduleType.color || '#333',
                    fontWeight: scheduleType.bold ? 'bold' : 700,
                }}
            >
                {label}
            </span>
        );
    }

    return <span className="hist-chip" style={{ background: '#263238', color: '#fff' }}>{label}</span>;
};
