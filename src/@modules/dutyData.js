import { dutyReplacementController, getDutyReplacementForCell } from '../@controllers/dutyReplacementController.js';
import { sleepGuard } from './sleepGuard.js';

// ========================================
// 근무 데이터 모듈 (당직, CCTV, 불침번)
// DutyRosterTable & StatusPanel에서 공통 사용
// ========================================

// CCTV 라벨 결정 (홀수월/짝수월에 따라 다름)
export const getCctvLabels = (month) => {
    const isOddMonth = month % 2 === 1;
    return {
        day: ['주주', '주평'].concat(isOddMonth ? [] : ['평', '주', '훈']),
        night: ['야평', '야주'].concat(isOddMonth ? ['평', '주', '훈'] : []),
    };
};

const buildLabelOrderMap = (labels = []) => {
    return new Map(labels.map((label, index) => [label, index]));
};

const resolveMatchedLabel = (cellLabels, labelSet, labelOrderMap) => {
    const matchedLabels = cellLabels.filter((label) => labelSet.has(label));
    if (matchedLabels.length === 0) return null;
    matchedLabels.sort((left, right) => {
        const leftOrder = labelOrderMap.get(left) ?? 9999;
        const rightOrder = labelOrderMap.get(right) ?? 9999;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return String(left).localeCompare(String(right), 'ko');
    });
    return matchedLabels[0];
};

const buildDutyEntries = (soldiers, getCellLabels, day, labels, dutyReplacements = {}, allSoldiers = soldiers) => {
    const labelSet = new Set(labels);
    const labelOrderMap = buildLabelOrderMap(labels);
    const soldierById = Object.fromEntries((allSoldiers || soldiers).map((soldier) => [String(soldier.id), soldier]));
    const entries = [];

    for (const sourceSoldier of soldiers) {
        const sourceSoldierId = String(sourceSoldier.id);
        const cellLabels = getCellLabels(sourceSoldierId, day);
        if (!Array.isArray(cellLabels) || cellLabels.length === 0) continue;

        const matchedLabel = resolveMatchedLabel(cellLabels, labelSet, labelOrderMap);
        if (!matchedLabel) continue;

        const replacementMap = getDutyReplacementForCell(dutyReplacements, sourceSoldierId, day);
        const replacementSoldierId = replacementMap[matchedLabel];
        const actualSoldier = replacementSoldierId
            ? soldierById[String(replacementSoldierId)] || sourceSoldier
            : sourceSoldier;

        entries.push({
            label: matchedLabel,
            sourceSoldier,
            soldier: actualSoldier,
            replaced: String(actualSoldier.id) !== sourceSoldierId,
        });
    }

    return entries;
};

export const findDutySoldiers = (soldiers, monthSchedules, day, labels, dutyReplacements = {}, allSoldiers = soldiers) => {
    return buildDutyEntries(
        soldiers,
        (soldierId, targetDay) => monthSchedules?.[soldierId]?.[targetDay] || [],
        day,
        labels,
        dutyReplacements,
        allSoldiers,
    ).map((entry) => entry.soldier);
};

export const findDutySoldiersFromDaySchedules = (soldiers, daySchedules, day, labels, dutyReplacements = {}, allSoldiers = soldiers) => {
    return buildDutyEntries(
        soldiers,
        (soldierId) => daySchedules?.[soldierId] || [],
        day,
        labels,
        dutyReplacements,
        allSoldiers,
    ).map((entry) => entry.soldier);
};

/**
 * 특정 날짜의 근무 데이터 조회
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {Array} soldiers - 용사 목록
 * @param {Object} daySchedules - { soldierId: [labels] }
 * @returns {Object} { dangzik, cctv, bulchim }
 */
export const getDayDutyData = async (year, month, day, soldiers, daySchedules) => {
    const dutyReplacements = await dutyReplacementController.get(year, month);
    const cctvLabels = getCctvLabels(month);

    // 당직
    const dangzik = {
        day: findDutySoldiersFromDaySchedules(soldiers, daySchedules, day, ['주당'], dutyReplacements),
        night: findDutySoldiersFromDaySchedules(soldiers, daySchedules, day, ['야당'], dutyReplacements),
    };

    // CCTV
    const cctv = {
        day: findDutySoldiersFromDaySchedules(soldiers, daySchedules, day, cctvLabels.day, dutyReplacements),
        night: findDutySoldiersFromDaySchedules(soldiers, daySchedules, day, cctvLabels.night, dutyReplacements),
    };

    // 불침번 (순서 포함)
    await sleepGuard.init();
    const guardSoldiers = findDutySoldiersFromDaySchedules(soldiers, daySchedules, day, ['불'], dutyReplacements);

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const guardOrder = guardSoldiers.length > 0
        ? await sleepGuard.getOrder(dateKey, guardSoldiers)
        : [];
    const times = sleepGuard.getTimes(true);

    const bulchim = times.map((time, i) => ({
        label: `${i + 1}번초`,
        time: `${time.start}~${time.end}`,
        soldier: guardOrder[i] || null,
    }));

    return { dangzik, cctv, bulchim };
};

export const findGuardSoldiersWithRank = async (year, month, day, soldiers, monthSchedules, dutyReplacements = {}, allSoldiers = soldiers) => {
    const guardSoldiers = findDutySoldiers(soldiers, monthSchedules, day, ['불'], dutyReplacements, allSoldiers);
    if (guardSoldiers.length === 0) return [];

    await sleepGuard.init();

    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const guardOrder = await sleepGuard.getOrder(dateKey, guardSoldiers);

    return guardOrder
        .filter(Boolean)
        .map((soldier) => `${soldier.rank} ${soldier.name}`);
};

/**
 * DutyRosterTable용: 월간 데이터에서 특정 날짜의 라벨 매칭 용사 조회
 * @param {Array} soldiers
 * @param {Object} monthSchedules - { soldierId: { day: [labels] } }
 * @param {number} day
 * @param {Array} labels
 * @returns {string[]} "계급 이름" 배열
 */
export const findSoldiersWithRank = (soldiers, monthSchedules, day, labels, dutyReplacements = {}, allSoldiers = soldiers) => {
    return findDutySoldiers(soldiers, monthSchedules, day, labels, dutyReplacements, allSoldiers)
        .map((soldier) => `${soldier.rank} ${soldier.name}`);
};
