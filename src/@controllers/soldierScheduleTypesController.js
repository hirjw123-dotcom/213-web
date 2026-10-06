import DB from '../@modules/db.js';

// 기본 스케줄 타입 정의
const DEFAULT_SCHEDULE_TYPES = [
    { label: '주', regExp: '*주', bg: '#ff9800', color: '#000', bold: false, desc: '주말 근무', order: 0 },
    { label: '평', regExp: '*평', bg: '#2196f3', color: '#fff', bold: false, desc: '평일 근무', order: 1 },
    { label: '불', regExp: '*불*', bg: '#9c27b0', color: '#fff', bold: false, desc: '불침번', order: 2 },
    { label: '출', regExp: '*출*', bg: '#4caf50', color: '#fff', bold: false, desc: '외출', order: 3 },
    { label: '평출', regExp: '*평출*', bg: '#c8e6c9', color: '#1b5e20', bold: false, desc: '평일 출타', order: 3.5 },
    { label: '박', regExp: '*박*', bg: '#e91e63', color: '#fff', bold: false, desc: '외박', order: 4 },
    { label: '휴', regExp: '*휴*', bg: '#ffeb3b', color: '#000', bold: false, desc: '휴가', order: 5 },
    { label: '전휴', regExp: '*전휴*', bg: '#fff', color: '#ff4444', bold: true, desc: '전투휴무', order: 5.5 },
    { label: '반투', regExp: '*반투*', bg: '#fff', color: '#ff4444', bold: false, desc: '반투', order: 5.6 },
    { label: '주당', regExp: '*주당*', bg: '#bdbdbd', color: '#000', bold: false, desc: '주간 당직', order: 6 },
    { label: '야당', regExp: '*야당*', bg: '#9e9e9e', color: '#000', bold: true, desc: '야간 당직', order: 7 },
    { label: '식', regExp: '*식*', bg: '#e0e0e0', color: '#000', bold: false, desc: '식사 도우미', order: 8 },
    { label: '훈', regExp: '*훈*', bg: '#388e3c', color: '#fff', bold: false, desc: '훈련 근무', order: 9 },
    { label: '오', regExp: '*오*', bg: '#fff', color: '#000', bold: false, desc: '오대기', order: 10 },
    { label: '파', regExp: '*파*', bg: '#03a9f4', color: '#fff', bold: false, desc: '파견(TF 등)', order: 11 },
    { label: '동', regExp: '*동*', bg: '#212121', color: '#fff', bold: false, desc: '동원', order: 12 },
    { label: '외진', regExp: '*외진*', bg: '#fff', color: '#000', bold: false, desc: '수도병원', order: 13 },
    { label: '검진', regExp: '*검진*,*상검*,*병검*', bg: '#eeeeee', color: '#000', bold: false, desc: '사단 검진', order: 14 },
    { label: '진측', regExp: '*진측*,*측*', bg: '#c8e6c9', color: '#000', bold: false, desc: '진급 측정', order: 15 },
    { label: '야평', regExp: '*야평*', bg: '#fff', color: '#1565c0', bold: true, desc: '평일 야간 근무', order: 16 },
    { label: '주평', regExp: '*주평*', bg: '#fff', color: '#1565c0', bold: true, desc: '평일 주간 근무', order: 17 },
    { label: '야주', regExp: '*야주*', bg: '#fff', color: '#e65100', bold: true, desc: '주말 야간 근무', order: 18 },
    { label: '주주', regExp: '*주주*', bg: '#fff', color: '#e65100', bold: true, desc: '주말 주간 근무', order: 19 },
    { label: '전월야평', regExp: '*월*야평*', bg: '#fff', color: '#f44336', bold: true, desc: '전월 야간 근무, 실제 근무는 서지 않지만 전 월 추가근무로 인해 이번 달 근무 숫자에 더하는 용도', order: 20 },
    { label: '전월주평', regExp: '*월*주평*', bg: '#fff', color: '#f44336', bold: true, desc: '전월 주간 근무, 실제 근무는 서지 않지만 전 월 추가근무로 인해 이번 달 근무 숫자에 더하는 용도', order: 21 },
    { label: '전월야주', regExp: '*월*야주*', bg: '#fff', color: '#f44336', bold: true, desc: '전월 야간 근무, 실제 근무는 서지 않지만 전 월 추가근무로 인해 이번 달 근무 숫자에 더하는 용도', order: 22 },
    { label: '전월주주', regExp: '*월*주주*', bg: '#fff', color: '#f44336', bold: true, desc: '전월 주간 근무, 실제 근무는 서지 않지만 전 월 추가근무로 인해 이번 달 근무 숫자에 더하는 용도', order: 23 },
];

// 기본 날짜 타입 정의
const DEFAULT_DAY_TYPES = [
    { label: '휴일', bg: false, color: '#c00', applyAll: true, order: 0 },
    { label: '훈련 근무', bg: '#e8f5e9', color: false, applyAll: true, order: 1 },
    { label: '주말 근무', bg: '#fff1e9', color: '#000', applyAll: true, order: 2 },
];

export const PROTECTED_DAY_TYPE_LABELS = DEFAULT_DAY_TYPES.map((item) => item.label);

/*
    - label: 타입 라벨 (고유값)
    - bg: 배경색 (문자열 or false)
    - color: 글자색 (문자열)
    - applyAll: true = 해당날짜에 해당하는 모든 병사의 셀에 스타일 적용, false = 해당 타입이 있는 날짜 셀에만 스타일 적용
    - order: 정렬 순서 (숫자, 작을수록 앞)
*/

// 근무 종류 관리 컨트롤러
const scheduleTypeKey = 'scheduleTypes-6';
export const scheduleTypesController = {
    get: async () => {
        const list = await DB.get(scheduleTypeKey);
        if (list && list.length > 0) {
            return list.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        }
        // DB에 없으면 기본값 저장 후 반환
        // await DB.save(scheduleTypeKey, DEFAULT_SCHEDULE_TYPES);
        return [...DEFAULT_SCHEDULE_TYPES];
    },

    update: async (label, data) => {
        const list = await scheduleTypesController.get();
        const index = list.findIndex(t => t.label === label);
        if (index === -1) return false;

        list[index] = { ...list[index], ...data };
        await DB.save(scheduleTypeKey, list);
        return true;
    },

    delete: async (label) => {
        const list = await scheduleTypesController.get();
        const index = list.findIndex(t => t.label === label);
        if (index === -1) return false;

        list.splice(index, 1);
        await DB.save(scheduleTypeKey, list);
        return true;
    },

    add: async (data) => {
        const list = await scheduleTypesController.get();

        // 라벨 중복 체크
        if (list.some(t => t.label === data.label)) {
            return null;
        }

        const newType = {
            label: data.label,
            regExp: data.regExp || `*${data.label}*`,
            bg: data.bg || '#fff',
            color: data.color || '#000',
            bold: data.bold ?? false,
            desc: data.desc || '',
            order: data.order ?? 9999,
        };

        list.push(newType);
        await DB.save(scheduleTypeKey, list);
        return newType;
    },
};

// 달력 날짜 타입 관리 컨트롤러
const dayTypesKey = 'dayTypes-6';
export const dayTypesController = {
    get: async () => {
        const list = await DB.get(dayTypesKey);
        if (list && list.length > 0) {
            return list.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
        }
        // DB에 없으면 기본값 저장 후 반환
        return [...DEFAULT_DAY_TYPES];
    },

    update: async (label, data) => {
        const list = await dayTypesController.get();
        const index = list.findIndex(t => t.label === label);
        if (index === -1) return false;

        list[index] = { ...list[index], ...data };
        await DB.save(dayTypesKey, list);
        return true;
    },

    delete: async (label) => {
        if (PROTECTED_DAY_TYPE_LABELS.includes(label)) return false;
        const list = await dayTypesController.get();
        const index = list.findIndex(t => t.label === label);
        if (index === -1) return false;

        list.splice(index, 1);
        await DB.save(dayTypesKey, list);
        return true;
    },

    add: async (data) => {
        const list = await dayTypesController.get();

        // 라벨 중복 체크
        if (list.some(t => t.label === data.label)) {
            return null;
        }

        const newType = {
            label: data.label,
            bg: data.bg || '#fff',
            color: data.color || '#000',
            applyAll: data.applyAll ?? true,
            order: data.order ?? 9999,
        };

        list.push(newType);
        await DB.save(dayTypesKey, list);
        return newType;
    },
};
