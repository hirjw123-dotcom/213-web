import DB from '../@modules/db.js';

export const DUTY_REPLACEMENT_LABELS = ['평', '주', '불', '훈', '주평', '야평', '주주', '야주', '식', '야당', '주당'];

const DUTY_REPLACEMENT_LABEL_SET = new Set(DUTY_REPLACEMENT_LABELS);
const DUTY_COUNT_LABEL_MAP = {
    평: ['평'],
    주평: ['평'],
    야평: ['평'],
    전월주평: ['평'],
    전월야평: ['평'],
    주: ['주'],
    주주: ['주'],
    야주: ['주'],
    전월주주: ['주'],
    전월야주: ['주'],
    불: ['불'],
    훈: ['훈'],
    동반: ['동반'],
};

const getDutyReplacementKey = (y, m) => `dutyReplacements_${y}_${m}`;

const sortDutyLabels = (a, b) => {
    const aIndex = DUTY_REPLACEMENT_LABELS.indexOf(a);
    const bIndex = DUTY_REPLACEMENT_LABELS.indexOf(b);
    const normalizedA = aIndex === -1 ? 9999 : aIndex;
    const normalizedB = bIndex === -1 ? 9999 : bIndex;
    if (normalizedA !== normalizedB) return normalizedA - normalizedB;
    return String(a).localeCompare(String(b), 'ko');
};

const parseCellKey = (cellKey) => {
    if (typeof cellKey !== 'string') return null;
    const separatorIndex = cellKey.lastIndexOf('_');
    if (separatorIndex <= 0) return null;

    const soldierId = cellKey.slice(0, separatorIndex).trim();
    const day = Number(cellKey.slice(separatorIndex + 1));
    if (!soldierId || !Number.isInteger(day) || day < 1) return null;

    return { soldierId, day };
};

const getSortedCellKeys = (data = {}) => {
    return Object.keys(data).sort((left, right) => {
        const leftParsed = parseCellKey(left);
        const rightParsed = parseCellKey(right);
        if (!leftParsed && !rightParsed) return String(left).localeCompare(String(right), 'ko');
        if (!leftParsed) return 1;
        if (!rightParsed) return -1;
        if (leftParsed.day !== rightParsed.day) return leftParsed.day - rightParsed.day;
        return leftParsed.soldierId.localeCompare(rightParsed.soldierId, 'ko');
    });
};

export const getDutyReplacementCellKey = (soldierId, day) => `${String(soldierId)}_${Number(day)}`;

export const isDutyReplacementLabel = (label) => DUTY_REPLACEMENT_LABEL_SET.has(label);

export const getDutyReplacementForCell = (dutyReplacements, soldierId, day) => {
    const cellKey = getDutyReplacementCellKey(soldierId, day);
    return dutyReplacements?.[cellKey] || {};
};

export const hasDutyReplacementForCell = (dutyReplacements, soldierId, day) => {
    return Object.keys(getDutyReplacementForCell(dutyReplacements, soldierId, day)).length > 0;
};

const getSourceCellLabels = (monthSchedules, soldierId, day) => {
    return Array.isArray(monthSchedules?.[soldierId]?.[day])
        ? monthSchedules[soldierId][day]
        : [];
};

export const getRegisteredScheduleLabelsForSoldierDay = (monthSchedules, soldierId, day) => {
    return getSourceCellLabels(monthSchedules, String(soldierId), day);
};

export const getDutyCountLabels = (label) => DUTY_COUNT_LABEL_MAP[label] || [];

export const getDutyCountTotalsForLabels = (labels = []) => {
    const totals = { 평: 0, 주: 0, 불: 0, 훈: 0, 동반: 0 };
    for (const label of Array.isArray(labels) ? labels : []) {
        const normalizedLabels = getDutyCountLabels(label);
        for (const normalizedLabel of normalizedLabels) {
            totals[normalizedLabel] += 1;
        }
    }
    return totals;
};

export const getOutgoingReplacementDutyLabelsForSoldierDay = (monthSchedules, dutyReplacements, soldierId, day) => {
    const sourceLabels = getSourceCellLabels(monthSchedules, String(soldierId), day);
    if (sourceLabels.length === 0) return [];

    const replacementMap = getDutyReplacementForCell(dutyReplacements, soldierId, day);
    return DUTY_REPLACEMENT_LABELS.filter((label) => sourceLabels.includes(label) && !!replacementMap[label]);
};

export const getAssignedScheduleLabelsForSoldierDay = (monthSchedules, dutyReplacements, soldierId, day) => {
    const sourceLabels = getSourceCellLabels(monthSchedules, String(soldierId), day);
    if (sourceLabels.length === 0) return [];

    const outgoingLabels = new Set(getOutgoingReplacementDutyLabelsForSoldierDay(monthSchedules, dutyReplacements, soldierId, day));
    return sourceLabels.filter((label) => !outgoingLabels.has(label));
};

export const getIncomingReplacementDutyLabelsForSoldierDay = (monthSchedules, dutyReplacements, soldierId, day) => {
    const targetSoldierId = String(soldierId);
    const virtualLabels = [];

    for (const cellKey of getSortedCellKeys(dutyReplacements)) {
        const parsed = parseCellKey(cellKey);
        if (!parsed || parsed.day !== Number(day)) continue;

        const sourceLabels = getSourceCellLabels(monthSchedules, parsed.soldierId, parsed.day);
        if (sourceLabels.length === 0) continue;

        const replacementMap = dutyReplacements[cellKey] || {};
        for (const label of DUTY_REPLACEMENT_LABELS) {
            if (!sourceLabels.includes(label)) continue;
            if (String(replacementMap[label] || '') !== targetSoldierId) continue;
            if (!virtualLabels.includes(label)) virtualLabels.push(label);
        }
    }

    return virtualLabels;
};

export const getEffectiveScheduleLabelsForSoldierDay = (monthSchedules, dutyReplacements, soldierId, day) => {
    const assignedLabels = getAssignedScheduleLabelsForSoldierDay(monthSchedules, dutyReplacements, soldierId, day);
    const incomingLabels = getIncomingReplacementDutyLabelsForSoldierDay(monthSchedules, dutyReplacements, soldierId, day);
    return [...new Set([...assignedLabels, ...incomingLabels])];
};

export const hasIncomingDutyReplacementForSoldierDay = (monthSchedules, dutyReplacements, soldierId, day) => {
    return getIncomingReplacementDutyLabelsForSoldierDay(monthSchedules, dutyReplacements, soldierId, day).length > 0;
};

export const getDisplayScheduleLabelsForSoldierDay = (monthSchedules, dutyReplacements, soldierId, day) => {
    return getEffectiveScheduleLabelsForSoldierDay(monthSchedules, dutyReplacements, soldierId, day);
};

export const normalizeDutyReplacementData = (data = {}, { validSoldierIds = null, monthSchedules = null } = {}) => {
    const validSoldierIdSet = Array.isArray(validSoldierIds)
        ? new Set(validSoldierIds.map((value) => String(value)))
        : null;

    const normalized = {};
    for (const cellKey of getSortedCellKeys(data)) {
        const parsed = parseCellKey(cellKey);
        if (!parsed) continue;

        const sourceSoldierId = String(parsed.soldierId);
        const day = parsed.day;
        if (validSoldierIdSet && !validSoldierIdSet.has(sourceSoldierId)) continue;

        const rawMap = data[cellKey];
        if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) continue;

        const activeLabels = Array.isArray(monthSchedules?.[sourceSoldierId]?.[day])
            ? monthSchedules[sourceSoldierId][day]
            : null;

        const nextMap = {};
        for (const label of Object.keys(rawMap).sort(sortDutyLabels)) {
            if (!isDutyReplacementLabel(label)) continue;
            if (activeLabels && !activeLabels.includes(label)) continue;

            const replacementSoldierId = String(rawMap[label] || '').trim();
            if (!replacementSoldierId || replacementSoldierId === sourceSoldierId) continue;
            if (validSoldierIdSet && !validSoldierIdSet.has(replacementSoldierId)) continue;

            nextMap[label] = replacementSoldierId;
        }

        if (Object.keys(nextMap).length > 0) {
            normalized[getDutyReplacementCellKey(sourceSoldierId, day)] = nextMap;
        }
    }

    return normalized;
};

export const areDutyReplacementDataEqual = (left = {}, right = {}) => {
    return JSON.stringify(normalizeDutyReplacementData(left)) === JSON.stringify(normalizeDutyReplacementData(right));
};

export const dutyReplacementController = {
    getKey: getDutyReplacementKey,

    get: async (y, m, options = {}) => {
        const raw = (await DB.get(getDutyReplacementKey(y, m))) || {};
        const normalized = normalizeDutyReplacementData(raw, options);

        if (!areDutyReplacementDataEqual(raw, normalized)) {
            await DB.save(getDutyReplacementKey(y, m), normalized);
        }

        return normalized;
    },

    save: async (y, m, data, options = {}) => {
        const normalized = normalizeDutyReplacementData(data, options);
        await DB.save(getDutyReplacementKey(y, m), normalized);
        return normalized;
    },

    clear: async (y, m) => {
        await DB.save(getDutyReplacementKey(y, m), {});
    },
};