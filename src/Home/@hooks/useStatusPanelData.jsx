import { useEffect, useMemo, useState } from 'preact/hooks';
import { soldiersController } from '../../@controllers/soldiersController';
import { soldierSchedulesController, 열외Conditions } from '../../@controllers/soldierSchedulesController';
import { UNITS } from '../../@modules/configs';
import { getDayDutyData } from '../../@modules/dutyData';
import { arrToDate } from '../../@modules/dates';

const AVAILABLE_TIME_FILTERS = {
    morningOnly: ['오전'],
    afternoonOnly: ['오후'],
    morningToAfternoon: ['오전', '오후'],
    nightOnly: ['저녁일과'],
    morningToNight: ['오전', '오후', '저녁일과'],
    afternoonToNight: ['오후', '저녁일과'],
};

const DEFAULT_TIME_FILTER = 'morningToAfternoon';

const createEmptyUnitMap = () => UNITS.reduce((acc, unit) => {
    acc[unit.id] = [];
    return acc;
}, {});

export default function useStatusPanelData() {
    const [date, setDate] = useState(() => {
        let storage = localStorage.getItem('statusPanel.lastDate');
        if (storage) {
            try {
                const parsed = JSON.parse(storage);
                if (parsed.y && parsed.m && parsed.d) {
                    return parsed;
                }
            } catch {
                // ignore parsing errors
            }
        }
        const d = new Date();
        return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
    });
    const [soldiers, setSoldiers] = useState([]);
    const [allSchedules, setAllSchedules] = useState({});
    const [dutyData, setDutyData] = useState({ dangzik: { day: [], night: [] }, cctv: { day: [], night: [] }, bulchim: [] });
    const [excludedReasons, setExcludedReasons] = useState({});
    const [leaveData, setLeaveData] = useState({ onLeave: [], returning: [] });
    const [loading, setLoading] = useState(true);
    const [filtering, setFiltering] = useState(false);
    const [availableCollapsed, setAvailableCollapsed] = useState(false);
    const [excludedCollapsed, setExcludedCollapsed] = useState(false);
    const [selectedTimeFilter, setSelectedTimeFilter] = useState(DEFAULT_TIME_FILTER);

    const selectedTimeSlots = useMemo(() => {
        return AVAILABLE_TIME_FILTERS[selectedTimeFilter] || AVAILABLE_TIME_FILTERS[DEFAULT_TIME_FILTER];
    }, [selectedTimeFilter]);

    const loadData = async () => {
        setLoading(true);
        const [list, monthSchedules] = await Promise.all([
            soldiersController.get(),
            soldierSchedulesController.getSoldierSchedules({ y: date.y, m: date.m }),
        ]);

        const selectedDate = new Date(date.y, date.m - 1, date.d);
        selectedDate.setHours(0, 0, 0, 0);
        const filtered = list.filter((soldier) => {
            if (soldier.categories && soldier.categories.includes('officer')) return false;
            const joinDate = arrToDate(soldier.joinDate || soldier.startDate);
            if (joinDate > selectedDate) return false;
            const exitDate = arrToDate(soldier.exitDate);
            if (exitDate < selectedDate) return false;
            return true;
        });
        const daySchedules = filtered.reduce((acc, soldier) => {
            const labels = monthSchedules?.[soldier.id]?.[date.d];
            if (Array.isArray(labels) && labels.length > 0) {
                acc[soldier.id] = labels;
            }
            return acc;
        }, {});

        setSoldiers(filtered);
        setAllSchedules(monthSchedules);

        const duty = await getDayDutyData(date.y, date.m, date.d, filtered, daySchedules);
        setDutyData(duty);

        const onLeave = [];
        const returning = [];

        const hasLeaveOnDate = async (soldierId, year, month, day) => {
            const scheds = await soldierSchedulesController.getSoldierSchedules({ soldierId, y: year, m: month, d: day });
            return Array.isArray(scheds) && scheds.includes('휴');
        };

        const findLeaveRange = async (soldierId, year, month, day) => {
            let startDate = new Date(year, month - 1, day);
            for (let i = 1; i <= 60; i += 1) {
                const prev = new Date(year, month - 1, day - i);
                const has = await hasLeaveOnDate(soldierId, prev.getFullYear(), prev.getMonth() + 1, prev.getDate());
                if (!has) break;
                startDate = prev;
            }

            let endDate = new Date(year, month - 1, day);
            for (let i = 1; i <= 60; i += 1) {
                const next = new Date(year, month - 1, day + i);
                const has = await hasLeaveOnDate(soldierId, next.getFullYear(), next.getMonth() + 1, next.getDate());
                if (!has) break;
                endDate = next;
            }

            const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const fmt = (dt) => `${dt.getMonth() + 1}/${dt.getDate()}`;
            return { start: fmt(startDate), end: fmt(endDate), days };
        };

        for (const soldier of filtered) {
            const schedLabels = daySchedules[soldier.id] || [];
            const hasLeave = schedLabels.includes('휴');

            if (hasLeave) {
                const range = await findLeaveRange(soldier.id, date.y, date.m, date.d);
                onLeave.push({ soldier, ...range });

                const tomorrow = new Date(date.y, date.m - 1, date.d + 1);
                const hasLeaveTomorrow = await hasLeaveOnDate(
                    soldier.id,
                    tomorrow.getFullYear(),
                    tomorrow.getMonth() + 1,
                    tomorrow.getDate(),
                );
                if (!hasLeaveTomorrow) {
                    returning.push(soldier);
                }
            }
        }

        setLeaveData({ onLeave, returning });
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [date.y, date.m, date.d]);

    useEffect(() => {
        let cancelled = false;

        const updateExcludedReasons = async () => {
            if (soldiers.length === 0) {
                setFiltering(false);
                setExcludedReasons({});
                return;
            }

            setFiltering(true);
            const excludedMap = {};
            for (const soldier of soldiers) {
                const isExcluded = await 열외Conditions.isSoldier열외(
                    soldier.id,
                    date.y,
                    date.m,
                    date.d,
                    selectedTimeSlots,
                );
                if (cancelled) return;
                if (!isExcluded) {
                    continue;
                }

                const displayReasonLabels = await 열외Conditions.getDisplayReasonLabels(
                    soldier.id,
                    date.y,
                    date.m,
                    date.d,
                    selectedTimeSlots,
                );
                if (cancelled) return;
                excludedMap[soldier.id] = displayReasonLabels;
            }

            if (!cancelled) {
                setExcludedReasons(excludedMap);
                setFiltering(false);
            }
        };

        updateExcludedReasons();

        return () => {
            cancelled = true;
        };
    }, [soldiers, date.y, date.m, date.d, selectedTimeSlots]);

    const availableByUnit = useMemo(() => {
        const availByUnit = createEmptyUnitMap();

        for (const soldier of soldiers) {
            const unitId = soldier.unit || 'u1';
            if (!excludedReasons[soldier.id] && availByUnit[unitId]) {
                availByUnit[unitId].push(soldier);
            }
        }
        return availByUnit;
    }, [soldiers, excludedReasons, selectedTimeSlots]);

    const excludedByUnit = useMemo(() => {
        const exclByUnit = createEmptyUnitMap();

        for (const soldier of soldiers) {
            const unitId = soldier.unit || 'u1';
            if (excludedReasons[soldier.id] && exclByUnit[unitId]) {
                exclByUnit[unitId].push(soldier);
            }
        }
        return exclByUnit;
    }, [soldiers, excludedReasons, selectedTimeSlots]);

    const changeDate = (delta) => {
        const nextDate = new Date(date.y, date.m - 1, date.d + delta);
        let rs = { y: nextDate.getFullYear(), m: nextDate.getMonth() + 1, d: nextDate.getDate() };
        setDate(rs);
        localStorage.setItem('statusPanel.lastDate', JSON.stringify(rs));
    };

    const goToday = () => {
        const now = new Date();
        let rs = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
        setDate(rs);
        localStorage.setItem('statusPanel.lastDate', JSON.stringify(rs));
    };

    const setDateValue = ({ y, m, d }) => {
        if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return;

        const nextDate = new Date(y, m - 1, d);
        if (
            nextDate.getFullYear() !== y
            || nextDate.getMonth() + 1 !== m
            || nextDate.getDate() !== d
        ) {
            return;
        }

        const nextValue = { y, m, d };
        setDate(nextValue);
        localStorage.setItem('statusPanel.lastDate', JSON.stringify(nextValue));
    };

    const setDateFromInput = (value) => {
        if (!value) return;
        const [yStr, mStr, dStr] = String(value).split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        const d = Number(dStr);
        setDateValue({ y, m, d });
    };

    const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][new Date(date.y, date.m - 1, date.d).getDay()];

    const now = new Date();
    const isToday = date.y === now.getFullYear() && date.m === now.getMonth() + 1 && date.d === now.getDate();

    const totalAvailable = Object.values(availableByUnit).reduce((sum, arr) => sum + arr.length, 0);
    const totalExcluded = Object.values(excludedByUnit).reduce((sum, arr) => sum + arr.length, 0);
    const unitListMaxHeight = availableCollapsed !== excludedCollapsed ? 600 : 400;

    return {
        date,
        soldiers,
        allSchedules,
        dutyData,
        availableByUnit,
        excludedByUnit,
        excludedReasons,
        leaveData,
        loading,
        availableCollapsed,
        excludedCollapsed,
        changeDate,
        goToday,
        setDateValue,
        setDateFromInput,
        dayOfWeek,
        isToday,
        totalAvailable,
        totalExcluded,
        unitListMaxHeight,
        selectedTimeFilter,
        selectedTimeSlots,
        setAvailableCollapsed,
        setExcludedCollapsed,
        setSelectedTimeFilter,
    };
}
