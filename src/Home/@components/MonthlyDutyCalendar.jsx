import { useState, useEffect, useMemo, useCallback, useRef } from 'preact/hooks';
import { dutyReplacementController } from '../../@controllers/dutyReplacementController';
import { soldiersController } from '../../@controllers/soldiersController';
import { soldierSchedulesController } from '../../@controllers/soldierSchedulesController';
import { dayTypesController } from '../../@controllers/soldierScheduleTypesController';
import { getCctvLabels, findGuardSoldiersWithRank, findSoldiersWithRank } from '../../@modules/dutyData';
import { DUTY_REPLACEMENT_LABELS, getEffectiveScheduleLabelsForSoldierDay } from '../../@controllers/dutyReplacementController';
import { filterValidSoldiers, getDaysInMonth } from '../../SoldierSchedules/@modules/utils';
import { UNITS } from '../../@modules/configs';
import DB from '../../@modules/db';

// ========================================
// 월간 근무 달력 팝업
// ========================================

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const DUTY_LABEL_ORDER = new Map(DUTY_REPLACEMENT_LABELS.map((label, index) => [label, index]));

// 전역 캐시: { "2026-2": { soldiers, schedules, dayTypes, dayTypeAssignments, dutyReplacements } }
const _cache = {};

// 이름 NFD 검색 캐시

// 영타 입력 방지용 키보드 매핑
const ENG_TO_KOR_MAP = {
    'q': 'ㅂ', 'w': 'ㅈ', 'e': 'ㄷ', 'r': 'ㄱ', 't': 'ㅅ', 'y': 'ㅛ', 'u': 'ㅕ', 'i': 'ㅑ', 'o': 'ㅐ', 'p': 'ㅔ',
    'a': 'ㅁ', 's': 'ㄴ', 'd': 'ㅇ', 'f': 'ㄹ', 'g': 'ㅎ', 'h': 'ㅗ', 'j': 'ㅓ', 'k': 'ㅏ', 'l': 'ㅣ',
    'z': 'ㅋ', 'x': 'ㅌ', 'c': 'ㅊ', 'v': 'ㅍ', 'b': 'ㅠ', 'n': 'ㅜ', 'm': 'ㅡ',
    'Q': 'ㅃ', 'W': 'ㅉ', 'E': 'ㄸ', 'R': 'ㄲ', 'T': 'ㅆ', 'O': 'ㅒ', 'P': 'ㅖ'
};

// 종성(U+11A8~11C2) -> 초성(U+1100~1112) 변환 맵 (복합 종성 포함)
const JONG_TO_CHO = {
    '\u11A8': '\u1100', '\u11A9': '\u1101', '\u11AA': '\u1100\u1109', '\u11AB': '\u1102',
    '\u11AC': '\u1102\u110C', '\u11AD': '\u1102\u1112', '\u11AE': '\u1103', '\u11AF': '\u1105',
    '\u11B0': '\u1105\u1100', '\u11B1': '\u1105\u1106', '\u11B2': '\u1105\u1107', '\u11B3': '\u1105\u1109',
    '\u11B4': '\u1105\u1110', '\u11B5': '\u1105\u1111', '\u11B6': '\u1105\u1112', '\u11B7': '\u1106',
    '\u11B8': '\u1107', '\u11B9': '\u1107\u1109', '\u11BA': '\u1109', '\u11BB': '\u110A',
    '\u11BC': '\u110B', '\u11BD': '\u110C', '\u11BE': '\u110E', '\u11BF': '\u110F',
    '\u11C0': '\u1110', '\u11C1': '\u1111', '\u11C2': '\u1112'
};

const formats = (arr) => {
    return arr;
};

const _nameCompatCache = new Map();
function getSearchable(str) {
    if (!str) return '';
    if (!_nameCompatCache.has(str)) {
        const nfkd = str.replace(/\s+/g, '').normalize('NFKD');
        let res = '';
        for (const c of nfkd) {
            res += JONG_TO_CHO[c] || c;
        }
        _nameCompatCache.set(str, res);
    }
    return _nameCompatCache.get(str);
}

// 데이터를 가공하는 공통 함수
function processRawData(soldierList, scheduleData, dtypes, dtAssign, viewYear, viewMonth) {
    const valid = filterValidSoldiers(soldierList, viewYear, viewMonth);
    const unitOrder = Object.fromEntries(UNITS.map((u, i) => [u.id, i]));
    valid.sort((a, b) => {
        const uA = unitOrder[a.unit] ?? 9999;
        const uB = unitOrder[b.unit] ?? 9999;
        if (uA !== uB) return uA - uB;
        return (a.order ?? 9999) - (b.order ?? 9999);
    });

    // dayTypeAssignments 정규화
    const normalized = {};
    const src = dtAssign || {};
    for (const [day, value] of Object.entries(src)) {
        const labels = Array.isArray(value)
            ? value
            : (typeof value === 'string' && value ? [value] : []);
        const unique = [...new Set(labels.filter(Boolean))];
        if (unique.length > 0) normalized[day] = unique;
    }

    return {
        soldiers: valid,
        schedules: scheduleData || {},
        dayTypes: dtypes || [],
        dayTypeAssignments: normalized,
    };
}

// 이전 달의 연/월 계산
function getPrevMonth(y, m) {
    return m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
}

function sortDutyLabels(left, right) {
    const leftOrder = DUTY_LABEL_ORDER.get(left) ?? 9999;
    const rightOrder = DUTY_LABEL_ORDER.get(right) ?? 9999;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left).localeCompare(String(right), 'ko');
}

function getDutySectionColor(label, month) {
    const cctvLabels = getCctvLabels(month);
    if (cctvLabels.day.includes(label) || cctvLabels.night.includes(label)) return '#1976D2';
    if (label === '주당' || label === '야당') return '#FF6B35';
    if (label === '불') return '#9c27b0';
    return '#455A64';
}

function buildFocusedDutyEntries(soldiers, monthSchedules, dutyReplacements, soldierId, day) {
    if (!soldierId) return [];

    const targetLabels = getEffectiveScheduleLabelsForSoldierDay(monthSchedules, dutyReplacements, soldierId, day)
        .filter((label) => DUTY_LABEL_ORDER.has(label))
        .sort(sortDutyLabels);

    if (targetLabels.length === 0) return [];

    const uniqueTargetLabels = [...new Set(targetLabels)];
    const entries = [];

    for (const label of uniqueTargetLabels) {
        const matchedNames = soldiers
            .filter((soldier) => getEffectiveScheduleLabelsForSoldierDay(monthSchedules, dutyReplacements, soldier.id, day).includes(label))
            .map((soldier) => `${soldier.rank} ${soldier.name}`);

        if (matchedNames.length > 0) {
            entries.push({ label, names: matchedNames });
        }
    }

    return entries;
}

export default function MonthlyDutyCalendar({ year, month, onClose, initialSearchQuery = '', focusSoldierId = null }) {
    const cacheKey = (y, m) => `${y}-${m}`;
    const normalizedFocusSoldierId = focusSoldierId === null || focusSoldierId === undefined || focusSoldierId === ''
        ? null
        : String(focusSoldierId);
    const isFocusedMode = !!normalizedFocusSoldierId;

    // 캐시된 초기값 가져오기
    const getInitial = (y, m) => {
        const cached = _cache[cacheKey(y, m)];
        return cached || { soldiers: [], schedules: {}, dayTypes: [], dayTypeAssignments: {}, dutyReplacements: {} };
    };

    const initialData = getInitial(year, month);
    const [soldiers, setSoldiers] = useState(initialData.soldiers);
    const [schedules, setSchedules] = useState(initialData.schedules);
    const [dayTypes, setDayTypes] = useState(initialData.dayTypes);
    const [dayTypeAssignments, setDayTypeAssignments] = useState(initialData.dayTypeAssignments);
    const [dutyReplacements, setDutyReplacements] = useState(initialData.dutyReplacements);

    // 이전 달 데이터
    const prev = getPrevMonth(year, month);
    const prevInitial = getInitial(prev.y, prev.m);
    const [prevSoldiers, setPrevSoldiers] = useState(prevInitial.soldiers);
    const [prevSchedules, setPrevSchedules] = useState(prevInitial.schedules);
    const [prevDayTypeAssignments, setPrevDayTypeAssignments] = useState(prevInitial.dayTypeAssignments);
    const [prevDutyReplacements, setPrevDutyReplacements] = useState(prevInitial.dutyReplacements);
    const [guardNamesByDay, setGuardNamesByDay] = useState({});
    const [prevGuardNamesByDay, setPrevGuardNamesByDay] = useState({});

    // 캐시가 있으면 로딩 없이 바로 표시
    const [loading, setLoading] = useState(!_cache[cacheKey(year, month)]);
    const overlayRef = useRef(null);

    // 월 이동
    const [viewYear, setViewYear] = useState(year);
    const [viewMonth, setViewMonth] = useState(month);

    // 검색어
    const [searchQuery, setSearchQuery] = useState(isFocusedMode ? '' : (initialSearchQuery || ''));
    const searchRegexes = useMemo(() => {
        if (!searchQuery) return [];

        // 1. 영타 -> 한글 자음/모음 변환
        const korQuery = [...searchQuery].map(c => ENG_TO_KOR_MAP[c] || c).join('');
        // 2. 검색어 쉼표 분리 및 공백 제거
        const queries = korQuery.split(',').map(q => q.replace(/\s+/g, '')).filter(Boolean);

        return queries.map(q => {
            const compat = getSearchable(q);

            let pattern = '';
            for (const c of compat) {
                pattern += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*?';
            }

            try { return new RegExp(pattern); } catch (e) { return null; }
        }).filter(Boolean);
    }, [searchQuery]);

    const changeMonth = useCallback((delta) => {
        let newMonth = viewMonth + delta;
        let newYear = viewYear;
        if (newMonth < 1) { newMonth = 12; newYear--; }
        if (newMonth > 12) { newMonth = 1; newYear++; }
        setViewYear(newYear);
        setViewMonth(newMonth);
    }, [viewYear, viewMonth]);

    const goToday = useCallback(() => {
        const now = new Date();
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth() + 1);
    }, []);

    useEffect(() => {
        setSearchQuery(isFocusedMode ? '' : (initialSearchQuery || ''));
    }, [initialSearchQuery, isFocusedMode]);

    // 데이터 로드 (캐시 우선 → 백그라운드 fetch → 캐시 갱신)
    useEffect(() => {
        let cancelled = false;
        const key = cacheKey(viewYear, viewMonth);
        const { y: pY, m: pM } = getPrevMonth(viewYear, viewMonth);
        const prevKey = cacheKey(pY, pM);

        // 캐시가 있으면 즉시 표시
        const cached = _cache[key];
        if (cached) {
            setSoldiers(cached.soldiers);
            setSchedules(cached.schedules);
            setDayTypes(cached.dayTypes);
            setDayTypeAssignments(cached.dayTypeAssignments);
            setDutyReplacements(cached.dutyReplacements || {});
            setLoading(false);
        } else {
            setLoading(true);
        }

        // 이전달 캐시
        const prevCached = _cache[prevKey];
        if (prevCached) {
            setPrevSoldiers(prevCached.soldiers);
            setPrevSchedules(prevCached.schedules);
            setPrevDayTypeAssignments(prevCached.dayTypeAssignments);
            setPrevDutyReplacements(prevCached.dutyReplacements || {});
        }

        // 항상 백그라운드에서 최신 데이터 fetch (현재 달 + 이전 달)
        (async () => {
            const [soldierList, scheduleData, dtypes, dtAssign, prevScheduleData, prevDtAssign] = await Promise.all([
                soldiersController.get(),
                soldierSchedulesController.getSoldierSchedules({ y: viewYear, m: viewMonth }),
                dayTypesController.get(),
                DB.get(`dayTypeAssign_${viewYear}_${viewMonth}`),
                soldierSchedulesController.getSoldierSchedules({ y: pY, m: pM }),
                DB.get(`dayTypeAssign_${pY}_${pM}`),
            ]);
            if (cancelled) return;

            const processed = processRawData(soldierList, scheduleData, dtypes, dtAssign, viewYear, viewMonth);
            const prevProcessed = processRawData(soldierList, prevScheduleData, dtypes, prevDtAssign, pY, pM);
            const [replacementData, prevReplacementData] = await Promise.all([
                dutyReplacementController.get(viewYear, viewMonth, {
                    validSoldierIds: processed.soldiers.map((soldier) => soldier.id),
                    monthSchedules: processed.schedules,
                }),
                dutyReplacementController.get(pY, pM, {
                    validSoldierIds: prevProcessed.soldiers.map((soldier) => soldier.id),
                    monthSchedules: prevProcessed.schedules,
                }),
            ]);

            processed.dutyReplacements = replacementData;
            prevProcessed.dutyReplacements = prevReplacementData;

            // 전역 캐시 갱신
            _cache[key] = processed;
            _cache[prevKey] = prevProcessed;

            setSoldiers(processed.soldiers);
            setSchedules(processed.schedules);
            setDayTypes(processed.dayTypes);
            setDayTypeAssignments(processed.dayTypeAssignments);
            setDutyReplacements(processed.dutyReplacements || {});

            setPrevSoldiers(prevProcessed.soldiers);
            setPrevSchedules(prevProcessed.schedules);
            setPrevDayTypeAssignments(prevProcessed.dayTypeAssignments);
            setPrevDutyReplacements(prevProcessed.dutyReplacements || {});

            setLoading(false);
        })();

        return () => { cancelled = true; };
    }, [viewYear, viewMonth]);

    // dayType을 label → object 매핑
    const dayTypeByLabel = useMemo(() => {
        const map = {};
        for (const dt of dayTypes) map[dt.label] = dt;
        return map;
    }, [dayTypes]);

    // CCTV 라벨
    const cctvLabels = useMemo(() => getCctvLabels(viewMonth), [viewMonth]);
    const { y: prevY, m: prevM } = useMemo(() => getPrevMonth(viewYear, viewMonth), [viewYear, viewMonth]);
    const prevCctvLabels = useMemo(() => getCctvLabels(prevM), [prevM]);

    // 달력 구성 (일월화수목금토) — 이전 달 날짜 포함
    const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
    const firstDow = useMemo(() => new Date(viewYear, viewMonth - 1, 1).getDay(), [viewYear, viewMonth]);
    const prevMonthDays = useMemo(() => getDaysInMonth(prevY, prevM), [prevY, prevM]);

    // calendarWeeks: 각 셀은 { day, isCurrentMonth } 또는 { day, isCurrentMonth: false, prevDay }
    const calendarWeeks = useMemo(() => {
        const weeks = [];

        // 첫 주: 이전 달 날짜로 채우기
        let week = [];
        if (firstDow > 0) {
            const prevLastDay = prevMonthDays[prevMonthDays.length - 1]; // 이전 달의 마지막 날
            for (let i = firstDow - 1; i >= 0; i--) {
                week.push({ day: prevLastDay - i, isCurrentMonth: false });
            }
        }

        for (const day of days) {
            week.push({ day, isCurrentMonth: true });
            if (week.length === 7) {
                weeks.push(week);
                week = [];
            }
        }
        if (week.length > 0) {
            while (week.length < 7) week.push(null);
            weeks.push(week);
        }
        return weeks;
    }, [days, firstDow, prevMonthDays]);

    // 날짜별 근무 데이터 (메모이제이션) — 현재 달
    const dutyByDay = useMemo(() => {
        const result = {};
        for (const day of days) {
            result[day] = {
                cctvDay: findSoldiersWithRank(soldiers, schedules, day, cctvLabels.day, dutyReplacements),
                cctvNight: findSoldiersWithRank(soldiers, schedules, day, cctvLabels.night, dutyReplacements),
                dangzikDay: findSoldiersWithRank(soldiers, schedules, day, ['주당'], dutyReplacements),
                dangzikNight: findSoldiersWithRank(soldiers, schedules, day, ['야당'], dutyReplacements),
                bulchim: guardNamesByDay[day] || [],
            };
        }
        return result;
    }, [soldiers, schedules, days, cctvLabels, dutyReplacements, guardNamesByDay]);

    // 이전 달 근무 데이터
    const prevDutyByDay = useMemo(() => {
        const result = {};
        // 이전 달에서 필요한 날짜만 계산
        if (firstDow > 0) {
            const prevLastDay = prevMonthDays[prevMonthDays.length - 1];
            for (let i = firstDow - 1; i >= 0; i--) {
                const d = prevLastDay - i;
                result[d] = {
                    cctvDay: findSoldiersWithRank(prevSoldiers, prevSchedules, d, prevCctvLabels.day, prevDutyReplacements),
                    cctvNight: findSoldiersWithRank(prevSoldiers, prevSchedules, d, prevCctvLabels.night, prevDutyReplacements),
                    dangzikDay: findSoldiersWithRank(prevSoldiers, prevSchedules, d, ['주당'], prevDutyReplacements),
                    dangzikNight: findSoldiersWithRank(prevSoldiers, prevSchedules, d, ['야당'], prevDutyReplacements),
                    bulchim: prevGuardNamesByDay[d] || [],
                };
            }
        }
        return result;
    }, [prevSoldiers, prevSchedules, firstDow, prevMonthDays, prevCctvLabels, prevDutyReplacements, prevGuardNamesByDay]);

    useEffect(() => {
        let cancelled = false;

        const loadGuardNames = async () => {
            setGuardNamesByDay({});
            setPrevGuardNamesByDay({});

            const currentEntries = await Promise.all(days.map(async (day) => ([
                day,
                await findGuardSoldiersWithRank(viewYear, viewMonth, day, soldiers, schedules, dutyReplacements),
            ])));

            if (!cancelled) {
                setGuardNamesByDay(Object.fromEntries(currentEntries));
            }

            if (firstDow <= 0) {
                if (!cancelled) setPrevGuardNamesByDay({});
                return;
            }

            const prevLastDay = prevMonthDays[prevMonthDays.length - 1];
            const prevDaysToLoad = [];
            for (let i = firstDow - 1; i >= 0; i--) {
                prevDaysToLoad.push(prevLastDay - i);
            }

            const prevEntries = await Promise.all(prevDaysToLoad.map(async (day) => ([
                day,
                await findGuardSoldiersWithRank(prev.y, prev.m, day, prevSoldiers, prevSchedules, prevDutyReplacements),
            ])));

            if (!cancelled) {
                setPrevGuardNamesByDay(Object.fromEntries(prevEntries));
            }
        };

        loadGuardNames();

        return () => {
            cancelled = true;
        };
    }, [
        days,
        dutyReplacements,
        firstDow,
        prev.m,
        prev.y,
        prevDutyReplacements,
        prevMonthDays,
        prevSchedules,
        prevSoldiers,
        schedules,
        soldiers,
        viewMonth,
        viewYear,
    ]);

    const focusedSoldier = useMemo(() => {
        if (!normalizedFocusSoldierId) return null;
        return soldiers.find((soldier) => String(soldier.id) === normalizedFocusSoldierId)
            || prevSoldiers.find((soldier) => String(soldier.id) === normalizedFocusSoldierId)
            || null;
    }, [normalizedFocusSoldierId, prevSoldiers, soldiers]);

    const focusedDutyByDay = useMemo(() => {
        const result = {};
        if (!normalizedFocusSoldierId) return result;

        for (const day of days) {
            result[day] = buildFocusedDutyEntries(soldiers, schedules, dutyReplacements, normalizedFocusSoldierId, day);
        }

        return result;
    }, [days, dutyReplacements, normalizedFocusSoldierId, schedules, soldiers]);

    const prevFocusedDutyByDay = useMemo(() => {
        const result = {};
        if (!normalizedFocusSoldierId || firstDow <= 0) return result;

        const prevLastDay = prevMonthDays[prevMonthDays.length - 1];
        for (let i = firstDow - 1; i >= 0; i--) {
            const day = prevLastDay - i;
            result[day] = buildFocusedDutyEntries(prevSoldiers, prevSchedules, prevDutyReplacements, normalizedFocusSoldierId, day);
        }

        return result;
    }, [firstDow, normalizedFocusSoldierId, prevDutyReplacements, prevMonthDays, prevSchedules, prevSoldiers]);

    // 특정 날짜가 주말/휴일인지 판별
    const getDayInfo = useCallback((day, targetYear, targetMonth, targetDtAssignments) => {
        if (!day) return {};
        const dow = new Date(targetYear, targetMonth - 1, day).getDay();
        const isSunday = dow === 0;
        const isSaturday = dow === 6;
        const isWeekend = isSunday || isSaturday;

        const dtLabels = ((targetDtAssignments || {})[day] || []).filter(a => a == '휴일');
        const isHoliday = dtLabels.includes('휴일');

        let dtColor = null;
        let dtBg = null;
        for (const label of dtLabels) {
            const dt = dayTypeByLabel[label];
            if (dt) {
                if (!dtColor && dt.color) dtColor = dt.color;
                if (!dtBg && dt.bg) dtBg = dt.bg;
            }
        }

        const today = new Date();
        const isToday = targetYear === today.getFullYear() && targetMonth === today.getMonth() + 1 && day === today.getDate();

        return {
            dow, isSunday, isSaturday, isWeekend, isHoliday,
            dtLabels, dtColor, dtBg, isToday,
        };
    }, [dayTypeByLabel]);

    // ESC로 닫기
    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    // 배경 클릭으로 닫기
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) onClose();
    };

    // 셀 렌더링 함수
    const renderCell = (cellData, di) => {
        if (!cellData) return <td key={di} />;

        const { day, isCurrentMonth } = cellData;
        const targetYear = isCurrentMonth ? viewYear : prevY;
        const targetMonth = isCurrentMonth ? viewMonth : prevM;
        const targetDtAssignments = isCurrentMonth ? dayTypeAssignments : prevDayTypeAssignments;
        const duties = isCurrentMonth ? (dutyByDay[day] || {}) : (prevDutyByDay[day] || {});
        const focusedEntries = isFocusedMode
            ? (isCurrentMonth ? (focusedDutyByDay[day] || []) : (prevFocusedDutyByDay[day] || []))
            : [];

        const info = getDayInfo(day, targetYear, targetMonth, targetDtAssignments);

        const filterNames = (names) => {
            if (!names) return [];
            return names.filter(n => {
                let nameArr = formats([...n.normalize('NFKD')]);
                return formats([...searchQuery.normalize('NFKD')]).every(c => nameArr.includes(c));
            });
        };

        const fCctvDay = filterNames(duties.cctvDay);
        const fCctvNight = filterNames(duties.cctvNight);
        const fDangzikDay = filterNames(duties.dangzikDay);
        const fDangzikNight = filterNames(duties.dangzikNight);
        const fBulchim = filterNames(duties.bulchim);

        const cellBg = info.isToday
            ? 'rgba(33, 150, 243, 0.08)'
            : info.dtBg
                ? info.dtBg
                : info.isWeekend
                    ? 'rgba(200, 200, 200, 0.1)'
                    : 'transparent';

        const dayNumColor = info.isHoliday || info.isSunday
            ? '#c00'
            : info.dtColor
                ? info.dtColor
                : info.isSaturday
                    ? '#1565c0'
                    : 'var(--c2, #333)';

        return (
            <td key={di} style={{
                ...cellStyle,
                background: cellBg,
                borderColor: info.isToday ? '#1976D2' : 'var(--c7, #ddd)',
                borderWidth: info.isToday ? 2 : 1,
                height: 100,
                opacity: isCurrentMonth ? 1 : 0.45,
            }}>
                {/* 날짜 숫자 */}
                <div style={{
                    fontWeight: 700, fontSize: 15,
                    color: dayNumColor,
                    marginBottom: 3,
                    display: 'flex', alignItems: 'center', gap: 5,
                }}>
                    {!isCurrentMonth && <span style={{ fontSize: 10, color: 'var(--c4, #999)', fontWeight: 400 }}>{targetMonth}/</span>}
                    {day}
                    {info.isHoliday && (
                        <span style={{ fontSize: 11, color: '#c00', fontWeight: 400 }}>휴</span>
                    )}
                    {info.dtLabels.filter(l => l !== '휴일').map(l => (
                        <span key={l} style={{
                            fontSize: 10, color: dayTypeByLabel[l]?.color || '#888',
                            fontWeight: 400,
                        }}>{l}</span>
                    ))}
                </div>

                {isFocusedMode ? (
                    focusedEntries.map((entry) => (
                        <DutySection
                            key={`${targetYear}_${targetMonth}_${day}_${entry.label}`}
                            color={getDutySectionColor(entry.label, targetMonth)}
                            label={entry.label}
                        >
                            <div>{formatNames(entry.names)}</div>
                        </DutySection>
                    ))
                ) : (
                    <>
                        {/* CCTV */}
                        {(fCctvDay?.length > 0 || fCctvNight?.length > 0) && (
                            <DutySection color="#1976D2" label="CCTV">
                                {fCctvDay?.length > 0 && (
                                    <div className='f row'>
                                        <span style={shiftLabelStyle}>주</span>
                                        <div className='f1'>{formatNames(fCctvDay)}</div>
                                    </div>
                                )}
                                {fCctvNight?.length > 0 && (
                                    <div className='f row'>
                                        <span style={shiftLabelStyle}>야</span>
                                        <div className='f1'>{formatNames(fCctvNight)}</div>
                                    </div>
                                )}
                            </DutySection>
                        )}

                        {/* 당직 */}
                        {(fDangzikDay?.length > 0 || fDangzikNight?.length > 0) && (
                            <DutySection color="#FF6B35" label="당직">
                                {fDangzikDay?.length > 0 && (
                                    <div><span style={shiftLabelStyle}>주</span> {formatNames(fDangzikDay)}</div>
                                )}
                                {fDangzikNight?.length > 0 && (
                                    <div><span style={shiftLabelStyle}>야</span> {formatNames(fDangzikNight)}</div>
                                )}
                            </DutySection>
                        )}

                        {/* 불침번 */}
                        {fBulchim?.length > 0 && (
                            <DutySection color="#9c27b0" label="불침번">
                                <div>{formatNames(fBulchim)}</div>
                            </DutySection>
                        )}
                    </>
                )}
            </td>
        );
    };
    const inputRef = useRef(null);
    useEffect(() => {
        if (isFocusedMode) return;
        inputRef.current?.focus?.();
    }, [isFocusedMode]);

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div style={{
                background: 'var(--c9, #fff)', border: '1px solid var(--c5, #aaa)',
                borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                width: 'min(97vw, 1150px)',
                maxHeight: '94vh',
                height: '94vh',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* 헤더 */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 16px', borderBottom: '1px solid var(--c6, #ccc)',
                    background: 'var(--c8, #f5f5f5)', flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, }}>
                        <button onClick={() => changeMonth(-1)} style={navBtnStyle}>◀</button>
                        <span style={{ fontWeight: 700, fontSize: 18, minWidth: 130, textAlign: 'center' }}>
                            {viewYear}년 {viewMonth}월
                        </span>
                        <button onClick={() => changeMonth(1)} style={navBtnStyle}>▶</button>
                        <button onClick={goToday} style={{ fontSize: 12, padding: '3px 10px', marginLeft: 4 }}>오늘</button>
                    </div>

                    <div style={{
                        flex: 1,
                    }} className='f ajCenter'>
                        {isFocusedMode ? (
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c3, #333)' }}>
                                {focusedSoldier ? `${focusedSoldier.rank} ${focusedSoldier.name}` : '선택한 용사'} 포함 근무
                            </div>
                        ) : (
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="검색: 반점(,)으로 구분"
                                value={searchQuery}
                                onInput={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    margin: '0 auto',
                                    width: 250,
                                    height: 30,
                                    borderRadius: 4,
                                    border: '1px solid var(--c6, #ccc)',
                                    padding: '0 8px',
                                    fontSize: 13,
                                    textAlign: 'center',
                                }}
                            />
                        )}
                    </div>

                    {/* 범례 */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ ...legendDot, background: '#1976D2' }} />CCTV
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ ...legendDot, background: '#FF6B35' }} />당직
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ ...legendDot, background: '#9c27b0' }} />불침번
                        </span>
                    </div>


                    <button onClick={onClose} style={{
                        border: 'none', background: 'transparent', fontSize: 22,
                        cursor: 'pointer', padding: '0 4px', color: 'var(--c3, #333)',
                    }}>✕</button>
                </div>

                {/* 달력 본체 */}
                <div style={{ overflow: 'auto', flex: 1, padding: 10 }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                            <div className="spinner" />
                        </div>
                    ) : (
                        <table style={{
                            width: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            tableLayout: 'fixed', fontSize: 13,
                            borderTop: '0',
                        }}>
                            <thead style={{
                                position: 'sticky',
                                top: 0,
                                zIndex: 1,
                                background: 'var(--c9, #fff)',
                            }}>
                                <tr>
                                    {DAY_LABELS.map((label, i) => (
                                        <th key={label} style={{
                                            padding: '8px 4px', textAlign: 'center',
                                            borderBottom: '2px solid var(--c5, #aaa)',
                                            borderTop: '2px solid var(--c5, #aaa)',
                                            fontWeight: 700, fontSize: 14,
                                            color: i === 0 ? '#c00' : i === 6 ? '#1565c0' : 'inherit',
                                        }}>
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {calendarWeeks.map((week, wi) => (
                                    <tr key={wi}>
                                        {week.map((cellData, di) => renderCell(cellData, di))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// 근무 회차 라벨 컴포넌트
function DutySection({ color, label, children }) {
    return (
        <div style={{
            marginTop: 3, padding: '2px 4px',
            borderLeft: `3px solid ${color}`,
            fontSize: 12, lineHeight: '17px',
            color: 'var(--c3, #444)',
        }}>
            <div style={{ fontWeight: 700, color, fontSize: 11, letterSpacing: -0.3 }}>{label}</div>
            {children}
        </div>
    );
}

// 이름 전체 표시 — 쉼표 구분, 자연스러운 줄바꿈
function formatNames(names) {
    if (!names || names.length === 0) return '';
    const shortNames = names.map(n => {
        const parts = n.split(' ');
        return parts.length > 1 ? parts.slice(1).join(' ') : n;
    });
    return shortNames.join(', ');
}

// 스타일 상수
const navBtnStyle = { padding: '3px 12px', fontSize: 16, cursor: 'pointer' };
const legendDot = { width: 11, height: 11, borderRadius: '50%', display: 'inline-block' };

const cellStyle = {
    border: '1px solid var(--c7, #ddd)',
    verticalAlign: 'top',
    padding: '5px 6px 8px',
    minHeight: 110,
    position: 'relative',
    wordBreak: 'keep-all',
    overflowWrap: 'anywhere',
    overflow: 'hidden',
};

const shiftLabelStyle = {
    fontWeight: 700, fontSize: 11,
    color: 'var(--c4, #777)',
    marginRight: 3,
};
