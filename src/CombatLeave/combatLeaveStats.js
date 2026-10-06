import { getDutyCountTotalsForLabels, getEffectiveScheduleLabelsForSoldierDay } from '../@controllers/dutyReplacementController.js';
import { combatLeaveController } from '../@controllers/combatLeaveController.js';
import { dutyReplacementController } from '../@controllers/dutyReplacementController.js';
import { soldierSchedulesController } from '../@controllers/soldierSchedulesController.js';
import { battalionSchedulesController } from '../@controllers/battalionSchedulesController.js';
import DB from '../@modules/db.js';

const formatDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const roundHalfStep = (value) => Math.round((value + Number.EPSILON) * 2) / 2;

export const formatCreditValue = (value) => {
    const rounded = roundHalfStep(value || 0);
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const isHolidayLike = (date, holidays = {}) => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    return !!holidays[formatDateKey(date)];
};

export const buildCombatLeaveStats = ({
    soldiers = [],
    schedules = {},
    dutyReplacements = {},
    combatLeaveData = {},
    year,
    month,
    holidays = {},
}) => {
    const result = {};
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const soldier of soldiers) {
        const sid = String(soldier.id);
        const leaveEntries = combatLeaveData[sid] || combatLeaveData[soldier.id] || {};
        let 주 = 0;
        let 주당 = 0;
        let 야당 = 0;
        let 전휴 = 0;
        let 반투 = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const labels = getEffectiveScheduleLabelsForSoldierDay(schedules, dutyReplacements, sid, day);
            if (!Array.isArray(labels) || labels.length === 0) continue;

            주 += getDutyCountTotalsForLabels(labels).주;

            if (labels.includes('야당')) {
                const nextDate = new Date(year, month - 1, day + 1);
                if (isHolidayLike(nextDate, holidays)) 야당++;
            }

            if (labels.includes('주당')) {
                const currentDate = new Date(year, month - 1, day);
                if (isHolidayLike(currentDate, holidays)) 주당++;
            }
        }

        for (const entry of Object.values(leaveEntries)) {
            if (entry?.type === '전휴') 전휴++;
            else if (entry?.type === '반투') 반투++;
        }

        const earnedCredit = roundHalfStep((주 * 0.5) + 주당 + 야당);
        const usedCredit = roundHalfStep(전휴 + (반투 * 0.5));
        const excessCredit = Math.max(0, roundHalfStep(usedCredit - earnedCredit));

        result[sid] = {
            주,
            주당,
            야당,
            전휴,
            반투,
            휴무: 전휴 + 반투,
            earnedCredit,
            usedCredit,
            excessCredit,
        };
    }

    return result;
};

const COMBAT_LEAVE_KEY_PATTERN = /^combatLeave_(\d+)_(\d+)$/;
const SCHEDULE_KEY_PATTERN = /^schedules_(\d+)_(\d+)$/;

const parseYearMonthKey = (key, pattern) => {
    if (typeof key !== 'string') return null;
    const match = key.match(pattern);
    if (!match) return null;
    return { year: Number(match[1]), month: Number(match[2]) };
};

export const getCombatLeaveHistoryForSoldier = async (soldierId) => {
    const normalizedSoldierId = String(soldierId);
    const [keys, battalionData] = await Promise.all([
        DB.getAllKeys(),
        battalionSchedulesController.getAll(),
    ]);

    const monthMap = new Map();
    for (const key of keys || []) {
        const parsed = parseYearMonthKey(key, COMBAT_LEAVE_KEY_PATTERN) || parseYearMonthKey(key, SCHEDULE_KEY_PATTERN);
        if (!parsed) continue;
        monthMap.set(`${parsed.year}-${parsed.month}`, parsed);
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    monthMap.set(`${currentYear}-${currentMonth}`, { year: currentYear, month: currentMonth });

    const months = [...monthMap.values()].sort((left, right) => {
        if (left.year !== right.year) return right.year - left.year;
        return right.month - left.month;
    });

    const holidays = battalionData?.holidays || {};
    const histories = [];
    let hasHistoryContent = false;
    for (const { year, month } of months) {
        const [monthSchedules, dutyReplacements, combatLeaveData] = await Promise.all([
            soldierSchedulesController.getSoldierSchedules({ y: year, m: month }),
            dutyReplacementController.get(year, month),
            combatLeaveController.getAll(year, month),
        ]);

        const stats = buildCombatLeaveStats({
            soldiers: [{ id: normalizedSoldierId }],
            schedules: monthSchedules,
            dutyReplacements,
            combatLeaveData,
            year,
            month,
            holidays,
        })[normalizedSoldierId] || {
            주: 0,
            주당: 0,
            야당: 0,
            전휴: 0,
            반투: 0,
            earnedCredit: 0,
            usedCredit: 0,
            excessCredit: 0,
        };

        const leaveEntries = Object.entries(combatLeaveData?.[normalizedSoldierId] || {})
            .map(([day, entry]) => ({
                ...entry,
                day: Number(day),
                year,
                month,
            }))
            .sort((left, right) => left.day - right.day);

        const isCurrentMonth = year === currentYear && month === currentMonth;
        const hasMonthHistory = !!(stats.주 || stats.주당 || stats.야당 || leaveEntries.length);
        if (!isCurrentMonth && !hasMonthHistory) continue;
        if (hasMonthHistory) hasHistoryContent = true;

        histories.push({ year, month, stats, leaveEntries });
    }

    return hasHistoryContent ? histories : [];
};
