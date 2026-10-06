import DB from '../@modules/db.js';

const DB_KEY = 'zzamColors';

// 기본 복무율 색상 설정
const DEFAULT_ZZAM_COLORS = [
    { label: '95~100', percentOver: 95, bg: '#05006b', color: '#fff', border: false },
    { label: '90~95', percentOver: 90, bg: '#7C3AED', color: false, border: false },
    { label: '80~90', percentOver: 80, bg: '#2563EB', color: false, border: false },
    { label: '70~80', percentOver: 70, bg: '#0EA5E9', color: false, border: false },
    { label: '60~70', percentOver: 60, bg: '#16A34A', color: false, border: false },
    { label: '50~60', percentOver: 50, bg: '#65A30D', color: false, border: false },
    { label: '40~50', percentOver: 40, bg: '#EAB308', color: false, border: false },
    { label: '30~40', percentOver: 30, bg: '#F97316', color: false, border: false },
    { label: '0~30', percentOver: 0, bg: '#EF4444', color: false, border: false },
];

// 카테고리별 색상 기본값 (soldierCategories의 ID를 키로 사용)
// { [categoryId]: { bg, color, border } }
const DB_CAT_KEY = 'categoryColorOverrides';

export const colorSettingsController = {
    /**
     * 복무율 색상을 기본값으로 초기화
     */
    reset: async () => {
        await DB.save(DB_KEY, [...DEFAULT_ZZAM_COLORS]);
        return [...DEFAULT_ZZAM_COLORS];
    },

    /**
     * 복무율 색상 목록 조회
     */
    get: async () => {
        const list = await DB.get(DB_KEY);
        if (list && list.length > 0) return list;
        // await DB.save(DB_KEY, DEFAULT_ZZAM_COLORS);
        return [...DEFAULT_ZZAM_COLORS];
    },

    /**
     * 복무율 색상 전체 저장
     */
    saveAll: async (list) => {
        await DB.save(DB_KEY, list);
        return true;
    },

    /**
     * 복무율 색상 항목 수정
     */
    update: async (index, data) => {
        const list = await colorSettingsController.get();
        if (index < 0 || index >= list.length) return false;
        list[index] = { ...list[index], ...data };
        await DB.save(DB_KEY, list);
        return true;
    },

    /**
     * 복무율 색상 항목 삭제
     */
    delete: async (index) => {
        const list = await colorSettingsController.get();
        if (index < 0 || index >= list.length) return false;
        list.splice(index, 1);
        await DB.save(DB_KEY, list);
        return true;
    },

    /**
     * 복무율 색상 항목 추가
     */
    add: async (data) => {
        const list = await colorSettingsController.get();
        list.push({
            label: data.label || '새 구간',
            percentOver: data.percentOver ?? 0,
            bg: data.bg || '#888',
            color: data.color || false,
            border: data.border || false,
        });
        // percentOver 기준 내림차순 정렬
        list.sort((a, b) => b.percentOver - a.percentOver);
        await DB.save(DB_KEY, list);
        return true;
    },

    /**
     * 복무율에 맞는 색상 반환 (개별 속성별 후순위 폴백)
     * 상위 구간에 bg/color/border가 false이면 하위 구간에서 가져옴
     */
    getColorForPercent: (list, percent) => {
        const result = { bg: false, color: false, border: false };
        let matched = false;
        for (const item of list) {
            if (percent >= item.percentOver) {
                if (!matched) matched = true;
                if (!result.bg && item.bg) result.bg = item.bg;
                if (!result.color && item.color) result.color = item.color;
                if (!result.border && item.border) result.border = item.border;
                // 모든 속성이 채워지면 더 이상 탐색 불필요
                if (result.bg && result.color && result.border) break;
            }
        }
        return matched ? result : null;
    },

    // === 카테고리별 색상 오버라이드 ===

    /**
     * 카테고리 색상 오버라이드 전체 조회
     */
    getCategoryColors: async () => {
        return (await DB.get(DB_CAT_KEY)) || {};
    },

    /**
     * 카테고리 색상 오버라이드 저장
     */
    saveCategoryColor: async (categoryId, data) => {
        const map = await colorSettingsController.getCategoryColors();
        map[categoryId] = { bg: data.bg || false, color: data.color || false, border: data.border || false };
        await DB.save(DB_CAT_KEY, map);
        return true;
    },

    /**
     * 카테고리 색상 오버라이드 삭제
     */
    deleteCategoryColor: async (categoryId) => {
        const map = await colorSettingsController.getCategoryColors();
        delete map[categoryId];
        await DB.save(DB_CAT_KEY, map);
        return true;
    },

    /**
     * 용사에게 적용할 최종 색상 계산
     * 1순위: 카테고리 색상 오버라이드
     * 2순위: 복무율 색상 (복무율 기반)
     * @param {object} soldier - 용사 데이터
     * @param {number} percentage - 복무율
     * @param {Array} zzamColors - 복무율 색상 목록
     * @param {object} categoryColorMap - 카테고리별 색상 맵
     */
    getSoldierColor: (soldier, percentage, zzamColors, categoryColorMap) => {
        // 2순위(기본): 복무율 색상
        const zzam = colorSettingsController.getColorForPercent(zzamColors, percentage) || {};
        const result = { bg: zzam.bg || false, color: zzam.color || false, border: zzam.border || false };

        // 1순위: 카테고리 색상 (설정된 속성만 오버라이드, 미설정 속성은 복무율 색상 유지)
        if (soldier.categories && soldier.categories.length > 0) {
            for (const catId of soldier.categories) {
                const override = categoryColorMap[catId];
                if (override && (override.bg || override.color || override.border)) {
                    if (override.bg) result.bg = override.bg;
                    if (override.color) result.color = override.color;
                    if (override.border) result.border = override.border;
                    break; // 첫 번째 매칭 카테고리만 적용
                }
            }
        }

        return result;
    },
};
