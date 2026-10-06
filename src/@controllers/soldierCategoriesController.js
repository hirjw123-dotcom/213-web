import DB from '../@modules/db.js';

// 기본 카테고리 목록
const DEFAULT_CATEGORIES = [
    { id: 'special', label: '특급전사', bold: true, order: 1, bg: '#fff3cd', color: '#856404', show_in_cell: true },
    { id: 'cctv-need', label: 'CCTV 시험', bold: true, order: 2, bg: '#d4edda', color: '#155724', show_in_cell: true },
    { id: 'cctv-exempt', label: 'CCTV 면제', bold: true, order: 3, bg: '#d1ecf1', color: '#0c5460', show_in_cell: true },
    { id: 'officer', label: '간부', bold: true, order: 4, bg: '#e2e3e5', color: '#383d41' },
    { id: 'captain', label: '분대장', bold: true, order: 5, bg: '#f8d7da', color: '#721c24', show_in_cell: true },
    // 또래상담병
    { id: 'peer-counselor', label: '또래상담병', bold: true, order: 6, bg: '#d6d8d9', color: '#1b1e21', show_in_cell: true },
];

export const DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORIES.map((category) => category.id);

const DB_KEY = 'soldierCategories-2';

// 용사 카테고리 관리 컨트롤러
export const soldierCategoriesController = {
    /**
     * 카테고리 목록 조회
     * @returns {Promise<Array>} 카테고리 배열
     */
    get: async () => {
        const list = await DB.get(DB_KEY);
        if (list && list.length > 0) {
            const normalized = list.map((category) => ({
                ...category,
                show_in_cell: category.show_in_cell ?? (category.id === 'officer' ? false : true),
            }));
            // await DB.save(DB_KEY, normalized);
            return normalized;
        }
        // await DB.save(DB_KEY, DEFAULT_CATEGORIES);
        return [...DEFAULT_CATEGORIES];
    },

    /**
     * 카테고리 수정
     * @param {string} id - 카테고리 ID
     * @param {object} data - 수정할 데이터
     * @returns {Promise<boolean>} 성공 여부
     */
    update: async (id, data) => {
        const list = await soldierCategoriesController.get();
        const index = list.findIndex(c => c.id === id);
        if (index === -1) return false;
        list[index] = { ...list[index], ...data, id }; // id는 변경 불가
        await DB.save(DB_KEY, list);
        return true;
    },

    /**
     * 카테고리 삭제
     * @param {string} id - 카테고리 ID
     * @returns {Promise<boolean>} 성공 여부
     */
    delete: async (id) => {
        if (DEFAULT_CATEGORY_IDS.includes(id)) return false;
        const list = await soldierCategoriesController.get();
        const index = list.findIndex(c => c.id === id);
        if (index === -1) return false;
        list.splice(index, 1);
        await DB.save(DB_KEY, list);
        return true;
    },

    /**
     * 카테고리 추가
     * @param {object} data - 카테고리 데이터
     * @returns {Promise<object>} 생성된 카테고리
     */
    add: async (data) => {
        const list = await soldierCategoriesController.get();

        // 고유 ID 생성
        const id = data.id || `cat_${Date.now()}`;

        // 중복 ID 체크
        if (list.some(c => c.id === id)) {
            return null;
        }

        // 최대 order 값 구하기
        const maxOrder = list.reduce((max, c) => Math.max(max, c.order || 0), 0);

        const newCategory = {
            id,
            label: data.label || '새 카테고리',
            bold: data.bold ?? false,
            order: data.order ?? (maxOrder + 1),
            bg: data.bg || '#fff',
            color: data.color || '#000',
            show_in_cell: data.show_in_cell ?? true,
        };

        list.push(newCategory);
        await DB.save(DB_KEY, list);
        return newCategory;
    },

    /**
     * ID로 카테고리 조회
     * @param {string} id - 카테고리 ID
     * @returns {Promise<object|null>} 카테고리 객체
     */
    getById: async (id) => {
        const list = await soldierCategoriesController.get();
        return list.find(c => c.id === id) || null;
    },

    /**
     * 카테고리 순서 변경
     * @param {string[]} orderedIds - 정렬된 ID 배열
     * @returns {Promise<boolean>} 성공 여부
     */
    reorder: async (orderedIds) => {
        const list = await soldierCategoriesController.get();

        orderedIds.forEach((id, idx) => {
            const cat = list.find(c => c.id === id);
            if (cat) cat.order = idx + 1;
        });

        list.sort((a, b) => a.order - b.order);
        await DB.save(DB_KEY, list);
        return true;
    },

    /**
     * 기본값으로 초기화
     * @returns {Promise<Array>} 초기화된 카테고리 배열
     */
    reset: async () => {
        await DB.save(DB_KEY, DEFAULT_CATEGORIES);
        return [...DEFAULT_CATEGORIES];
    },
};