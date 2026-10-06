import DB, { formatYMD } from '../@modules/db.js';

const META_KEY = 'soldierVacationMeta';
const DEFAULT_LABEL = '휴';
const LEAVE_LABELS = new Set([
    '휴',
    '박',
    '출',
    '평출',
    '면회',
    '근무',
    '전휴',
    '외진',
    '입원',
    '파',
]);

const normalizeTitle = (value) => {
    const title = String(value || '').trim();
    return title || '휴가';
};

const normalizeDateKey = (value) => {
    if (!value) return null;
    if (typeof value === 'string') {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? value : null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return formatYMD(date);
};

const sortDateKeys = (keys) => [...new Set(keys.filter(Boolean))].sort();

const normalizeLeaveLabel = (label) => (LEAVE_LABELS.has(label) ? label : DEFAULT_LABEL);

const groupDateKeysByMonth = (dateKeys) => {
    const grouped = {};
    for (const key of dateKeys) {
        const match = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) continue;
        const year = Number(match[1]);
        const month = Number(match[2]);
        const day = Number(match[3]);
        const monthKey = `${year}_${month}`;
        if (!grouped[monthKey]) {
            grouped[monthKey] = { y: year, m: month, days: [] };
        }
        grouped[monthKey].days.push(day);
    }
    return grouped;
};

const getRaw = async () => {
    const data = (await DB.get(META_KEY)) || {};
    const migratedTitlesBySoldier = {};
    const migratedLeaveBySoldier = {};

    for (const [soldierId, titles] of Object.entries(data.titlesBySoldier || {})) {
        const values = titles || {};
        const hasNestedLabelMap = Object.values(values).some((value) => value && typeof value === 'object' && !Array.isArray(value));

        if (hasNestedLabelMap) {
            migratedTitlesBySoldier[soldierId] = values;
            continue;
        }

        migratedTitlesBySoldier[soldierId] = {
            [DEFAULT_LABEL]: values,
        };
    }

    for (const [soldierId, leaveValue] of Object.entries(data.leaveBySoldier || {})) {
        const normalizedByLabel = {};
        const source = leaveValue || {};
        for (const label of LEAVE_LABELS) {
            normalizedByLabel[label] = sortDateKeys((source[label] || []).map(normalizeDateKey));
        }
        migratedLeaveBySoldier[soldierId] = normalizedByLabel;
    }

    return {
        leaveBySoldier: migratedLeaveBySoldier,
        titlesBySoldier: migratedTitlesBySoldier,
        statsBySoldier: data.statsBySoldier || {},
    };
};

const saveRaw = async (data) => {
    await DB.save(META_KEY, data);
};

export const soldierVacationController = {
    getMeta: async (soldierId) => {
        if (!soldierId) {
            return {
                titlesByLabel: {},
                stats: {
                    totalAllowance: null,
                    confirmedDays: null,
                    upcomingAllowance: null,
                },
            };
        }

        const data = await getRaw();
        return {
            titlesByLabel: data.titlesBySoldier[soldierId] || {},
            stats: {
                totalAllowance: data.statsBySoldier[soldierId]?.totalAllowance ?? null,
                confirmedDays: data.statsBySoldier[soldierId]?.confirmedDays ?? null,
                upcomingAllowance: data.statsBySoldier[soldierId]?.upcomingAllowance ?? null,
            },
        };
    },

    getLeaveDateMap: async (soldierId, labels = [...LEAVE_LABELS]) => {
        if (!soldierId) return {};

        const targetLabels = new Set(labels.map(normalizeLeaveLabel));

        const data = await getRaw();
        const stored = data.leaveBySoldier[soldierId] || {};
        const collectedByLabel = {};

        for (const label of targetLabels) {
            collectedByLabel[label] = sortDateKeys((stored[label] || []).map(normalizeDateKey));
        }

        return collectedByLabel;
    },

    getVacationDateKeys: async (soldierId) => {
        const map = await soldierVacationController.getLeaveDateMap(soldierId, [DEFAULT_LABEL]);
        return map[DEFAULT_LABEL] || [];
    },

    setLeaveDates: async ({ soldierId, dateKeys = [], label = DEFAULT_LABEL, enabled }) => {
        if (!soldierId) return false;

        const normalizedLabel = normalizeLeaveLabel(label);
        const normalizedKeys = sortDateKeys(dateKeys.map(normalizeDateKey));
        if (normalizedKeys.length === 0) return false;

        const data = await getRaw();
        const nextSoldierLeave = { ...(data.leaveBySoldier[soldierId] || {}) };
        const currentKeys = new Set((nextSoldierLeave[normalizedLabel] || []).map(normalizeDateKey).filter(Boolean));

        normalizedKeys.forEach((key) => {
            if (enabled) currentKeys.add(key);
            else currentKeys.delete(key);
        });

        nextSoldierLeave[normalizedLabel] = sortDateKeys([...currentKeys]);
        data.leaveBySoldier[soldierId] = Object.fromEntries(
            [...LEAVE_LABELS].map((leaveLabel) => [leaveLabel, sortDateKeys(nextSoldierLeave[leaveLabel] || [])])
        );
        await saveRaw(data);

        if (!enabled) {
            await soldierVacationController.removeTitles({ soldierId, label: normalizedLabel, dateKeys: normalizedKeys });
        }

        return true;
    },

    setVacationDates: async ({ soldierId, dateKeys = [], enabled }) => {
        return soldierVacationController.setLeaveDates({ soldierId, dateKeys, label: DEFAULT_LABEL, enabled });
    },

    setLeaveTypeDates: async ({ soldierId, dateKeys = [], label = null }) => {
        if (!soldierId) return false;

        const normalizedKeys = sortDateKeys(dateKeys.map(normalizeDateKey));
        if (normalizedKeys.length === 0) return false;

        const normalizedLabel = label ? normalizeLeaveLabel(label) : null;
        const data = await getRaw();
        const nextSoldierLeave = { ...(data.leaveBySoldier[soldierId] || {}) };
        const keysToUpdate = new Set(normalizedKeys);

        for (const leaveLabel of LEAVE_LABELS) {
            const filtered = sortDateKeys((nextSoldierLeave[leaveLabel] || []).filter((dateKey) => !keysToUpdate.has(dateKey)));
            nextSoldierLeave[leaveLabel] = filtered;
        }

        if (normalizedLabel) {
            nextSoldierLeave[normalizedLabel] = sortDateKeys([...(nextSoldierLeave[normalizedLabel] || []), ...normalizedKeys]);
        }

        data.leaveBySoldier[soldierId] = Object.fromEntries(
            [...LEAVE_LABELS].map((leaveLabel) => [leaveLabel, sortDateKeys(nextSoldierLeave[leaveLabel] || [])])
        );
        await saveRaw(data);

        const removalTasks = [...LEAVE_LABELS].map((leaveLabel) => (
            soldierVacationController.removeTitles({ soldierId, label: leaveLabel, dateKeys: normalizedKeys })
        ));
        await Promise.all(removalTasks);

        return true;
    },

    setStats: async (soldierId, stats = {}) => {
        if (!soldierId) return false;

        const data = await getRaw();
        data.statsBySoldier[soldierId] = {
            totalAllowance: Number.isFinite(Number(stats.totalAllowance)) ? Number(stats.totalAllowance) : null,
            confirmedDays: Number.isFinite(Number(stats.confirmedDays)) ? Number(stats.confirmedDays) : null,
            upcomingAllowance: Number.isFinite(Number(stats.upcomingAllowance)) ? Number(stats.upcomingAllowance) : null,
        };
        await saveRaw(data);
        return true;
    },

    setTitle: async ({ soldierId, label = DEFAULT_LABEL, dateKey, title }) => {
        if (!soldierId) return false;

        const normalizedLabel = normalizeLeaveLabel(label);
        const normalizedDateKey = normalizeDateKey(dateKey);
        if (!normalizedDateKey) return false;

        const data = await getRaw();
        const nextSoldierTitles = { ...(data.titlesBySoldier[soldierId] || {}) };
        const nextTitles = { ...(nextSoldierTitles[normalizedLabel] || {}) };
        nextTitles[normalizedDateKey] = normalizeTitle(title);
        nextSoldierTitles[normalizedLabel] = nextTitles;
        data.titlesBySoldier[soldierId] = nextSoldierTitles;
        await saveRaw(data);
        return true;
    },

    setTitles: async ({ soldierId, label = DEFAULT_LABEL, dateKeys = [], title }) => {
        if (!soldierId) return false;

        const normalizedLabel = normalizeLeaveLabel(label);
        const normalizedKeys = sortDateKeys(dateKeys.map(normalizeDateKey));
        if (normalizedKeys.length === 0) return false;

        const data = await getRaw();
        const nextSoldierTitles = { ...(data.titlesBySoldier[soldierId] || {}) };
        const nextTitles = { ...(nextSoldierTitles[normalizedLabel] || {}) };
        const nextTitle = normalizeTitle(title);

        for (const key of normalizedKeys) {
            nextTitles[key] = nextTitle;
        }

        nextSoldierTitles[normalizedLabel] = nextTitles;
        data.titlesBySoldier[soldierId] = nextSoldierTitles;
        await saveRaw(data);
        return true;
    },

    removeTitles: async ({ soldierId, label = DEFAULT_LABEL, dateKeys = [] }) => {
        if (!soldierId) return false;

        const normalizedLabel = normalizeLeaveLabel(label);
        const normalizedKeys = sortDateKeys(dateKeys.map(normalizeDateKey));
        const data = await getRaw();
        const nextSoldierTitles = { ...(data.titlesBySoldier[soldierId] || {}) };
        const nextTitles = { ...(nextSoldierTitles[normalizedLabel] || {}) };

        for (const key of normalizedKeys) {
            delete nextTitles[key];
        }

        if (Object.keys(nextTitles).length > 0) {
            nextSoldierTitles[normalizedLabel] = nextTitles;
        } else {
            delete nextSoldierTitles[normalizedLabel];
        }

        if (Object.keys(nextSoldierTitles).length > 0) {
            data.titlesBySoldier[soldierId] = nextSoldierTitles;
        } else {
            delete data.titlesBySoldier[soldierId];
        }

        await saveRaw(data);
        return true;
    },

    removeLeaveRange: async ({ soldierId, label = DEFAULT_LABEL, dateKeys = [] }) => {
        if (!soldierId) return false;

        const normalizedLabel = normalizeLeaveLabel(label);
        const normalizedKeys = sortDateKeys(dateKeys.map(normalizeDateKey));
        const data = await getRaw();
        const nextSoldierLeave = { ...(data.leaveBySoldier[soldierId] || {}) };
        nextSoldierLeave[normalizedLabel] = sortDateKeys((nextSoldierLeave[normalizedLabel] || []).filter((dateKey) => !normalizedKeys.includes(dateKey)));
        data.leaveBySoldier[soldierId] = Object.fromEntries(
            [...LEAVE_LABELS].map((leaveLabel) => [leaveLabel, sortDateKeys(nextSoldierLeave[leaveLabel] || [])])
        );
        await saveRaw(data);
        await soldierVacationController.removeTitles({ soldierId, label: normalizedLabel, dateKeys: normalizedKeys });
        return true;
    },
};