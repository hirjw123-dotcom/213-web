import { soldiersController } from '../@controllers/soldiersController.js';
import { soldierSchedulesController } from '../@controllers/soldierSchedulesController.js';
import { dutyReplacementController } from '../@controllers/dutyReplacementController.js';
import { getDayDutyData, findDutySoldiersFromDaySchedules } from '../@modules/dutyData.js';
import { arrToDate, daysBetween, calcServiceDays } from '../@modules/dates.js';
import { plugins } from '../@modules/plugins.js';
import { sleepGuard } from '../@modules/sleepGuard.js';
import DB from '../@modules/db.js';

/**
 * 매크로 약어 치환 엔진
 * 
 * 형식: $[근무타입:순번:필드목록]
 * 형식: $[근무:라벨:순번:필드목록]
 * 
 * 근무타입: 주간cctv, 야간cctv, 주간당직, 야간당직, 불침번
 * 라벨: 동반, 주, 불 등 해당 날짜 셀에 들어있는 근무 라벨
 * 순번: 1-based index
 * 필드목록: 공백 구분된 필드 키워드들
 *   - 계급, 이름, 입대일, 전역일, 전입일
 *   - 총복무, 현복무, 남은일, 전입경과
 *   - 서명, 서명(WxH)
 */

// 매크로 정규식: $[타입:순번:필드] 패턴
const MACRO_REGEX = /\$\[([^\]:]+):(\d+):([^\]]+)\]/g;

// 일반 근무 라벨 매크로: $[근무:라벨:순번:필드]
const DUTY_LABEL_MACRO_REGEX = /\$\[근무:([^:\]]+):(\d+):([^\]]+)\]/g;

// 불침번시간 매크로: $[불침번시간:n:시작 ~ 종료], $[휴일불침번시간:n:시작 ~ 종료], $[평일불침번시간:n:시작 ~ 종료]
const GUARD_TIME_REGEX = /\$\[(불침번시간|휴일불침번시간|평일불침번시간):(\d+):([^\]]+)\]/g;

// 날짜 매크로: $[날짜], $[날짜:포맷], $[오늘날짜], $[오늘날짜:포맷]
const DATE_MACRO_REGEX = /\$\[(날짜|오늘날짜)(?::([^\]]+))?\]/g;

const DEFAULT_DATE_FORMAT = 'y-m-d';

// 서명 필드 정규식: 서명(100x50) 또는 서명
const SIGNATURE_REGEX = /^서명(?:\((\d+)x(\d+)\))?$/;

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const formatDateByPattern = (targetDate, pattern) => {
    if (!(targetDate instanceof Date) || Number.isNaN(targetDate.getTime())) return '';

    const format = (pattern || DEFAULT_DATE_FORMAT).trim() || DEFAULT_DATE_FORMAT;
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();

    const tokenMap = {
        y: String(year),
        m: String(month),
        M: String(month).padStart(2, '0'),
        d: String(day),
        D: String(day).padStart(2, '0'),
        K: DAY_NAMES[targetDate.getDay()],
    };

    return format.replace(/[ymMdDK]/g, (token) => tokenMap[token] ?? token);
};

/**
 * 용사로부터 필드 값을 추출
 */
const resolveField = async (soldier, fieldKey, refDate) => {
    if (!soldier) return '';

    const ref = refDate ? new Date(refDate) : new Date();
    ref.setHours(0, 0, 0, 0);

    switch (fieldKey) {
        case '계급':
            return soldier.rank || '';
        case '이름':
            return soldier.name || '';
        case '입대일': {
            if (!soldier.startDate) return '';
            const [y, m, d] = soldier.startDate;
            return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        }
        case '전역일': {
            if (!soldier.exitDate) return '';
            const [y, m, d] = soldier.exitDate;
            return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        }
        case '전입일': {
            if (!soldier.joinDate) return '';
            const [y, m, d] = soldier.joinDate;
            return `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')}`;
        }
        case '총복무': {
            const days = calcServiceDays.total(soldier.startDate, soldier.exitDate);
            return `${days}일`;
        }
        case '현복무': {
            const days = calcServiceDays.current(soldier.startDate, ref);
            return `${days}일`;
        }
        case '남은일': {
            const days = calcServiceDays.remaining(soldier.exitDate, ref);
            return `${days}일`;
        }
        case '전입경과': {
            if (!soldier.joinDate) return '';
            const joinD = arrToDate(soldier.joinDate);
            if (!joinD) return '';
            const days = daysBetween(joinD, ref);
            return `${days}일`;
        }
        default:
            return '';
    }
};

/**
 * 서명 필드를 HTML img 태그로 변환
 */
const resolveSignature = async (soldier, width, height) => {
    if (!soldier || !soldier.signatureImgId) return '🖼️';
    const imgData = await plugins.getImg(soldier.signatureImgId);
    if (!imgData) return '🖼️';

    const style = (width && height)
        ? `width:${width}px;height:${height}px;`
        : '';
    return `<img src="${imgData}" style="${style}vertical-align:middle;" />`;
};

/**
 * 근무 타입 키 → dutyData 경로 매핑
 */
const DUTY_TYPE_MAP = {
    '주간cctv': (duty) => duty.cctv.day,
    '야간cctv': (duty) => duty.cctv.night,
    '주간당직': (duty) => duty.dangzik.day,
    '야간당직': (duty) => duty.dangzik.night,
    '불침번': (duty) => duty.bulchim.map(b => b.soldier).filter(Boolean),
};

const getSoldiersByDutyLabel = (label, soldiers, daySchedules, day, dutyReplacements) => {
    if (!label) return [];
    return findDutySoldiersFromDaySchedules(soldiers, daySchedules, day, [label], dutyReplacements);
};

/**
 * HTML 문자열 내 모든 매크로를 치환
 * @param {string} html - 원본 HTML (양식)
 * @param {object} date - { y, m, d }
 * @returns {Promise<string>} 치환된 HTML
 */
export const resolveMacros = async (html, date) => {
    if (!html) return '';

    const { y, m, d } = date;
    const refDate = new Date(y, m - 1, d);
    refDate.setHours(0, 0, 0, 0);

    // 데이터 한 번만 로드
    const [soldiers, daySchedules] = await Promise.all([
        soldiersController.get(),
        soldierSchedulesController.getSoldierSchedules({ y, m, d }),
    ]);

    const dutyData = await getDayDutyData(y, m, d, soldiers, daySchedules);

    // 매크로 수집 (비동기 치환을 위해 먼저 수집)
    const macros = [];
    let match;
    const regex = new RegExp(MACRO_REGEX.source, 'g');
    while ((match = regex.exec(html)) !== null) {
        macros.push({
            full: match[0],
            type: match[1],
            index: parseInt(match[2], 10),
            fields: match[3],
            mode: 'preset',
            start: match.index,
        });
    }

    const dutyLabelRegex = new RegExp(DUTY_LABEL_MACRO_REGEX.source, 'g');
    while ((match = dutyLabelRegex.exec(html)) !== null) {
        macros.push({
            full: match[0],
            type: match[1].trim(),
            index: parseInt(match[2], 10),
            fields: match[3],
            mode: 'label',
            start: match.index,
        });
    }

    macros.sort((left, right) => left.start - right.start);

    // 불침번시간 매크로 타입은 별도 처리하므로 스킵
    const GUARD_TIME_TYPES = new Set(['불침번시간', '휴일불침번시간', '평일불침번시간']);

    // 각 매크로를 비동기로 치환
    const replacements = new Map();
    const dutyReplacements = await dutyReplacementController.get(y, m);
    for (const macro of macros) {
        if (replacements.has(macro.full)) continue;
        if (GUARD_TIME_TYPES.has(macro.type)) continue; // 불침번시간은 별도 처리

        const dutySoldiers = macro.mode === 'label'
            ? getSoldiersByDutyLabel(macro.type, soldiers, daySchedules, d, dutyReplacements)
            : (() => {
                const getter = DUTY_TYPE_MAP[macro.type];
                if (!getter) return null;
                return getter(dutyData);
            })();

        if (!dutySoldiers) {
            const errorLabel = macro.mode === 'label' ? '알수없는 근무 라벨' : '알수없는 근무타입';
            replacements.set(macro.full, `(${errorLabel}: ${macro.type})`);
            continue;
        }

        const soldier = dutySoldiers[macro.index - 1] || null;

        // 필드 목록 파싱 (공백 구분, 서명은 특수 처리)
        const fieldStr = macro.fields.trim();

        // 서명 필드 체크
        const sigMatch = fieldStr.match(SIGNATURE_REGEX);
        if (sigMatch) {
            const w = sigMatch[1] ? parseInt(sigMatch[1], 10) : null;
            const h = sigMatch[2] ? parseInt(sigMatch[2], 10) : null;
            const result = await resolveSignature(soldier, w, h);
            replacements.set(macro.full, result);
            continue;
        }

        // 일반 필드: 공백으로 구분된 여러 필드 키워드
        const fieldKeys = fieldStr.split(/\s+/);
        const values = [];
        for (const key of fieldKeys) {
            // 서명 필드가 일반 필드 목록에 섞여있을 수 있음
            const sigM = key.match(SIGNATURE_REGEX);
            if (sigM) {
                const w = sigM[1] ? parseInt(sigM[1], 10) : null;
                const h = sigM[2] ? parseInt(sigM[2], 10) : null;
                values.push(await resolveSignature(soldier, w, h));
            } else {
                values.push(await resolveField(soldier, key, refDate));
            }
        }
        replacements.set(macro.full, values.join(' '));
    }

    // 치환 적용
    let result = html;
    for (const [key, value] of replacements) {
        result = result.split(key).join(value);
    }

    // 불침번시간 매크로 처리
    const guardTimeRegex = new RegExp(GUARD_TIME_REGEX.source, 'g');
    const guardTimeMatches = [];
    let gtMatch;
    while ((gtMatch = guardTimeRegex.exec(result)) !== null) {
        guardTimeMatches.push({
            full: gtMatch[0],
            type: gtMatch[1],   // 불침번시간 | 휴일불침번시간 | 평일불침번시간
            index: parseInt(gtMatch[2], 10),  // n번째 (1-based)
            fieldTemplate: gtMatch[3],  // "시작 ~ 종료" 등의 템플릿
        });
    }

    if (guardTimeMatches.length > 0) {
        await sleepGuard.init();

        // $[불침번시간] 자동 판단을 위한 휴일 여부 계산 (내일 기준)
        let isAutoHoliday = null;
        if (guardTimeMatches.some(m => m.type === '불침번시간')) {
            // 다음날 계산
            const nextDay = new Date(y, m - 1, d + 1);
            const nextDayOfWeek = nextDay.getDay();
            const isNextDayWeekend = nextDayOfWeek === 0 || nextDayOfWeek === 6;

            // 근무일정표 dayType 체크: 내일이 명시적 '휴일'로 설정되어 있는지
            const nextY = nextDay.getFullYear();
            const nextM = nextDay.getMonth() + 1;
            const nextD = nextDay.getDate();
            let hasDayTypeHoliday = false;
            try {
                const dayTypeAssign = await DB.get(`dayTypeAssign_${nextY}_${nextM}`);
                if (dayTypeAssign) {
                    const nextDayLabels = dayTypeAssign[nextD] || [];
                    hasDayTypeHoliday = nextDayLabels.includes('휴일');
                }
            } catch (_) { /* ignore */ }

            isAutoHoliday = isNextDayWeekend || hasDayTypeHoliday;
        }

        const guardTimeReplacements = new Map();
        for (const gtm of guardTimeMatches) {
            if (guardTimeReplacements.has(gtm.full)) continue;

            let isHoliday;
            if (gtm.type === '휴일불침번시간') {
                isHoliday = true;
            } else if (gtm.type === '평일불침번시간') {
                isHoliday = false;
            } else {
                // 불침번시간 → 자동 판단
                isHoliday = isAutoHoliday;
            }

            const times = sleepGuard.getTimes(isHoliday);
            const timeSlot = times[gtm.index - 1];

            if (!timeSlot) {
                guardTimeReplacements.set(gtm.full, `(${gtm.index}번째 불침번시간 없음)`);
                continue;
            }

            // 템플릿에서 시작/종료 치환
            let output = gtm.fieldTemplate;
            output = output.replace(/시작/g, timeSlot.start);
            output = output.replace(/종료/g, timeSlot.end);
            guardTimeReplacements.set(gtm.full, output);
        }

        for (const [key, value] of guardTimeReplacements) {
            result = result.split(key).join(value);
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    result = result.replace(DATE_MACRO_REGEX, (_, type, pattern) => {
        if (type === '오늘날짜') return formatDateByPattern(today, pattern);
        return formatDateByPattern(refDate, pattern);
    });

    return result;
};

/**
 * 매크로 약어 도움말 텍스트 반환
 */
export const MACRO_HELP = [
    { example: '$[주간cctv:1:계급 이름]', desc: '주간 CCTV 근무 1번째 용사의 계급과 이름' },
    { example: '$[야간cctv:2:입대일 전역일]', desc: '야간 CCTV 근무 2번째 용사의 입대일과 전역일' },
    { example: '$[주간당직:1:계급 이름]', desc: '주간 당직 1번째 용사의 계급과 이름' },
    { example: '$[야간당직:1:총복무 현복무 남은일]', desc: '야간 당직 1번째 용사의 복무일 정보' },
    { example: '$[불침번:3:계급 이름]', desc: '불침번 3번째 용사의 계급과 이름' },
    { example: '$[근무:동반:1:계급 이름]', desc: '해당 날짜에 동반 라벨이 있는 1번째 용사의 계급과 이름' },
    { example: '$[근무:주:1:계급 이름]', desc: '해당 날짜에 주 라벨이 있는 1번째 용사의 계급과 이름' },
    { example: '$[주간cctv:1:서명(100x50)]', desc: '주간 CCTV 1번째 용사의 서명 이미지 (100x50)' },
    { example: '$[주간cctv:1:서명]', desc: '주간 CCTV 1번째 용사의 서명 이미지 (원본)' },
    { example: '$[불침번시간:1:시작 ~ 종료]', desc: '불침번 1번째 시간 (평일/휴일 자동 판단). 다음날이 토·일이거나 일정표에 휴일 설정 시 휴일불침번' },
    { example: '$[휴일불침번시간:2:시작 ~ 종료]', desc: '휴일불침번 2번째 시간. 시작→시작시간, 종료→종료시간으로 치환' },
    { example: '$[평일불침번시간:1:시작 ~ 종료]', desc: '평일불침번 1번째 시간. 시작→시작시간, 종료→종료시간으로 치환' },
    { example: '$[날짜]', desc: '문서 보기에서 선택된 날짜 (기본 형식: y-m-d)' },
    { example: '$[날짜:y/m]', desc: '선택 날짜를 원하는 포맷으로 출력 (토큰: y,m,M,d,D,K)' },
    { example: '$[날짜:m월 D일 (K)]', desc: '예: 2월 05일 (월) 형식으로 출력. K=요일(일,월,화,수,목,금,토)' },
    { example: '$[오늘날짜]', desc: '오늘 날짜 (기본 형식: y-m-d)' },
    { example: '$[오늘날짜:y.M.D]', desc: '오늘 날짜를 원하는 포맷으로 출력' },
];

export const MACRO_FIELDS = [
    '계급', '이름', '입대일', '전역일', '전입일',
    '총복무', '현복무', '남은일', '전입경과',
    '서명', '서명(WxH)',
    '날짜(패턴)', '오늘날짜(패턴)',
];

export const MACRO_DUTY_TYPES = [
    '주간cctv', '야간cctv', '주간당직', '야간당직', '불침번',
    '근무:라벨',
];
