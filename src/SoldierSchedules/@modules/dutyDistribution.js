const DUTY_CONFIG = {
    평: {
        field: 'weekday',
        dailyLimit: 4,
        primaryDays: ({ dayTypeAssignments, days }) => days.filter((day) => {
            const labels = dayTypeAssignments[day] || [];
            return !labels.includes('훈련 근무') && !labels.includes('주말 근무');
        }),
        secondaryDays: () => [],
    },
    주: {
        field: 'weekend',
        dailyLimit: 4,
        primaryDays: ({ dayTypeAssignments, days }) => days.filter((day) => {
            const labels = dayTypeAssignments[day] || [];
            return labels.includes('주말 근무');
        }),
        secondaryDays: () => [],
    },
    불: {
        field: 'guard',
        dailyLimit: 5,
        primaryDays: ({ dayTypeAssignments, days }) => days.filter((day) => {
            const labels = dayTypeAssignments[day] || [];
            return !labels.includes('훈련 근무');
        }),
        secondaryDays: ({ dayTypeAssignments, days }) => days.filter((day) => {
            const labels = dayTypeAssignments[day] || [];
            return labels.includes('훈련 근무');
        }),
    },
};

const cloneSchedules = (schedules = {}) => {
    const cloned = {};
    for (const [soldierId, byDay] of Object.entries(schedules || {})) {
        const clonedByDay = {};
        for (const [day, labels] of Object.entries(byDay || {})) {
            if (!Array.isArray(labels) || labels.length === 0) continue;
            clonedByDay[day] = [...labels];
        }
        if (Object.keys(clonedByDay).length > 0) cloned[soldierId] = clonedByDay;
    }
    return cloned;
};

const getCellLabels = (schedules, soldierId, day) => {
    return Array.isArray(schedules?.[soldierId]?.[day]) ? schedules[soldierId][day] : [];
};

const setCellLabels = (schedules, soldierId, day, labels) => {
    const nextLabels = Array.isArray(labels) ? [...new Set(labels.filter(Boolean))] : [];
    const nextByDay = { ...(schedules[soldierId] || {}) };

    if (nextLabels.length > 0) {
        nextByDay[day] = nextLabels;
        schedules[soldierId] = nextByDay;
        return;
    }

    delete nextByDay[day];
    if (Object.keys(nextByDay).length > 0) schedules[soldierId] = nextByDay;
    else delete schedules[soldierId];
};

const getTargetCount = (compositionBySoldier, soldierId, field) => {
    const value = Number(compositionBySoldier?.[soldierId]?.[field]);
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.floor(value);
};

const buildDayLoadMap = (schedules, days) => {
    const dayLoadMap = Object.fromEntries(
        Object.keys(DUTY_CONFIG).map((label) => [
            label,
            Object.fromEntries(days.map((day) => [day, 0])),
        ])
    );

    for (const byDay of Object.values(schedules || {})) {
        for (const [dayKey, labels] of Object.entries(byDay || {})) {
            const day = Number(dayKey);
            if (!Number.isInteger(day) || !Array.isArray(labels)) continue;
            for (const label of Object.keys(DUTY_CONFIG)) {
                if (labels.includes(label)) dayLoadMap[label][day] = (dayLoadMap[label][day] || 0) + 1;
            }
        }
    }

    return dayLoadMap;
};

const formatUnresolved = (unresolvedByLabel) => {
    const lines = [];
    for (const [label, unresolved] of Object.entries(unresolvedByLabel)) {
        if (!Array.isArray(unresolved) || unresolved.length === 0) continue;
        const summary = unresolved.map((item) => `${item.name} ${item.remaining}회`).join(', ');
        lines.push(`${label}: ${summary}`);
    }
    return lines;
};

const shuffleArray = (items = []) => {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [next[index], next[randomIndex]] = [next[randomIndex], next[index]];
    }
    return next;
};

const getAssignedDaysForLabel = (schedules, soldierId, label, days) => {
    return days.filter((day) => getCellLabels(schedules, soldierId, day).includes(label));
};

const getDistanceWeight = (day, assignedDays) => {
    if (assignedDays.length === 0) return 12;

    let minDistance = Number.POSITIVE_INFINITY;
    for (const assignedDay of assignedDays) {
        minDistance = Math.min(minDistance, Math.abs(day - assignedDay));
    }

    if (!Number.isFinite(minDistance)) return 12;
    if (minDistance <= 1) return 0.15;
    if (minDistance === 2) return 1.2;
    return Math.pow(minDistance, 2);
};

const getCapacityWeight = (dayLoad, dailyLimit) => {
    const remainingCapacity = Math.max(0, dailyLimit - dayLoad);
    return 1 + (remainingCapacity / Math.max(1, dailyLimit));
};

const pickWeightedRandomDay = (candidateDays, getWeight) => {
    if (candidateDays.length === 0) return null;

    const weightedCandidates = candidateDays.map((day) => ({
        day,
        weight: Math.max(0.01, Number(getWeight(day)) || 0.01),
    }));

    const totalWeight = weightedCandidates.reduce((sum, item) => sum + item.weight, 0);
    if (totalWeight <= 0) return weightedCandidates[0]?.day ?? null;

    let randomPoint = Math.random() * totalWeight;
    for (const item of weightedCandidates) {
        randomPoint -= item.weight;
        if (randomPoint <= 0) return item.day;
    }

    return weightedCandidates[weightedCandidates.length - 1]?.day ?? null;
};

export const buildDutyDistribution = ({
    targetSoldiers = [],
    schedules = {},
    dayTypeAssignments = {},
    compositionBySoldier = {},
    days = [],
} = {}) => {
    const workingSchedules = cloneSchedules(schedules);
    const touchedCellKeys = new Set();
    const stats = { removed: 0, added: 0 };

    for (const [label, config] of Object.entries(DUTY_CONFIG)) {
        for (const soldier of targetSoldiers) {
            const currentDays = days.filter((day) => getCellLabels(workingSchedules, soldier.id, day).includes(label));
            const targetCount = getTargetCount(compositionBySoldier, soldier.id, config.field);
            const overflow = currentDays.length - targetCount;
            if (overflow <= 0) continue;

            const removeDays = [...currentDays].sort((a, b) => b - a).slice(0, overflow);
            for (const day of removeDays) {
                const nextLabels = getCellLabels(workingSchedules, soldier.id, day).filter((cellLabel) => cellLabel !== label);
                setCellLabels(workingSchedules, soldier.id, day, nextLabels);
                touchedCellKeys.add(JSON.stringify([soldier.id, day]));
                stats.removed += 1;
            }
        }
    }

    const dayLoadMap = buildDayLoadMap(workingSchedules, days);
    const unresolvedByLabel = {};

    for (const [label, config] of Object.entries(DUTY_CONFIG)) {
        const primaryDays = config.primaryDays({ dayTypeAssignments, days });
        const secondaryDays = config.secondaryDays({ dayTypeAssignments, days });
        const remainingBySoldier = new Map();

        for (const soldier of targetSoldiers) {
            const currentCount = days.reduce((count, day) => (
                count + (getCellLabels(workingSchedules, soldier.id, day).includes(label) ? 1 : 0)
            ), 0);
            const targetCount = getTargetCount(compositionBySoldier, soldier.id, config.field);
            const remaining = Math.max(0, targetCount - currentCount);
            if (remaining > 0) remainingBySoldier.set(soldier.id, remaining);
        }

        const randomizedSoldiers = shuffleArray(
            targetSoldiers.filter((soldier) => (remainingBySoldier.get(soldier.id) || 0) > 0)
        );

        for (const soldier of randomizedSoldiers) {
            let remaining = remainingBySoldier.get(soldier.id) || 0;
            if (remaining <= 0) continue;

            const assignFromCandidates = (candidateDays) => {
                while (remaining > 0 && candidateDays.length > 0) {
                    const availableDays = candidateDays.filter((day) => {
                        const currentLabels = getCellLabels(workingSchedules, soldier.id, day);
                        return !currentLabels.includes(label) && (dayLoadMap[label][day] || 0) < config.dailyLimit;
                    });

                    if (availableDays.length === 0) break;

                    const assignedDays = getAssignedDaysForLabel(workingSchedules, soldier.id, label, days);
                    const assignedDay = pickWeightedRandomDay(availableDays, (day) => {
                        const distanceWeight = getDistanceWeight(day, assignedDays);
                        const capacityWeight = getCapacityWeight(dayLoadMap[label][day] || 0, config.dailyLimit);
                        return distanceWeight * capacityWeight;
                    });

                    if (assignedDay === null) break;

                    const nextLabels = [...getCellLabels(workingSchedules, soldier.id, assignedDay), label];
                    setCellLabels(workingSchedules, soldier.id, assignedDay, nextLabels);
                    dayLoadMap[label][assignedDay] = (dayLoadMap[label][assignedDay] || 0) + 1;
                    touchedCellKeys.add(JSON.stringify([soldier.id, assignedDay]));
                    stats.added += 1;
                    remaining -= 1;
                }
            };

            assignFromCandidates(primaryDays);
            assignFromCandidates(secondaryDays);

            if (remaining <= 0) remainingBySoldier.delete(soldier.id);
            else remainingBySoldier.set(soldier.id, remaining);
        }

        const unresolved = targetSoldiers
            .map((soldier) => ({
                soldierId: soldier.id,
                name: `${soldier.rank} ${soldier.name}`,
                remaining: remainingBySoldier.get(soldier.id) || 0,
            }))
            .filter((item) => item.remaining > 0);

        if (unresolved.length > 0) unresolvedByLabel[label] = unresolved;
    }

    const changedSnapshots = [...touchedCellKeys].map((cellKey) => {
        const [soldierId, day] = JSON.parse(cellKey);
        return {
            soldierId,
            day: Number(day),
            before: getCellLabels(schedules, soldierId, day),
            after: getCellLabels(workingSchedules, soldierId, day),
        };
    }).filter((snapshot) => {
        if (snapshot.before.length !== snapshot.after.length) return true;
        const before = [...snapshot.before].sort();
        const after = [...snapshot.after].sort();
        return before.some((label, index) => label !== after[index]);
    });

    return {
        changedSnapshots,
        unresolvedByLabel,
        unresolvedLines: formatUnresolved(unresolvedByLabel),
        stats,
    };
};
