import DB from '../@modules/db.js';

const DB_KEY_TEMPLATES = 'borderOps_templates';
const DB_KEY_ACTIVE = 'borderOps_activeTemplate';

const DEFAULT_PAGE_MARGIN = {
    top: 15,
    right: 15,
    bottom: 15,
    left: 15,
};

const normalizeMargin = (margin) => {
    const src = margin || {};
    return {
        top: Number.isFinite(Number(src.top)) ? Number(src.top) : DEFAULT_PAGE_MARGIN.top,
        right: Number.isFinite(Number(src.right)) ? Number(src.right) : DEFAULT_PAGE_MARGIN.right,
        bottom: Number.isFinite(Number(src.bottom)) ? Number(src.bottom) : DEFAULT_PAGE_MARGIN.bottom,
        left: Number.isFinite(Number(src.left)) ? Number(src.left) : DEFAULT_PAGE_MARGIN.left,
    };
};

const normalizeTemplate = (tpl) => ({
    ...tpl,
    pageMargin: normalizeMargin(tpl?.pageMargin),
});

const moveTemplateInList = (list, sourceId, targetId, position = 'before') => {
    const nextList = [...list];
    const sourceIdx = nextList.findIndex((tpl) => tpl.id === sourceId);
    const targetIdx = nextList.findIndex((tpl) => tpl.id === targetId);
    if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return nextList;

    const [source] = nextList.splice(sourceIdx, 1);
    let insertIdx = nextList.findIndex((tpl) => tpl.id === targetId);
    if (insertIdx === -1) {
        nextList.push(source);
        return nextList;
    }

    if (position === 'after') insertIdx += 1;
    nextList.splice(insertIdx, 0, source);
    return nextList;
};

/**
 * 경계작전명령서 양식 관리 컨트롤러
 */
export const borderOpsController = {
    // ========================================
    // 양식 목록 조회
    // ========================================
    getTemplates: async () => {
        const list = (await DB.get(DB_KEY_TEMPLATES)) || [];
        return list.map(normalizeTemplate);
    },

    // ========================================
    // 양식 조회 (ID)
    // ========================================
    getTemplate: async (id) => {
        const list = await borderOpsController.getTemplates();
        return list.find(t => t.id === id) || null;
    },

    // ========================================
    // 양식 추가
    // ========================================
    addTemplate: async (name) => {
        const list = await borderOpsController.getTemplates();
        const id = 'tpl_' + Date.now();
        const tpl = {
            id,
            name: name || '새 양식',
            html: '<p>여기에 양식 내용을 입력하세요.</p>',
            pageMargin: { ...DEFAULT_PAGE_MARGIN },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        list.push(tpl);
        await DB.save(DB_KEY_TEMPLATES, list);
        return tpl;
    },

    duplicateTemplate: async (id, name) => {
        const list = await borderOpsController.getTemplates();
        const idx = list.findIndex(t => t.id === id);
        if (idx === -1) return null;

        const src = list[idx];
        const newTpl = {
            ...src,
            id: 'tpl_' + Date.now(),
            name: name || (src.name + ' 복사'),
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        list.push(newTpl);
        await DB.save(DB_KEY_TEMPLATES, list);
        return newTpl;
    },

    // ========================================
    // 양식 수정 (html만)
    // ========================================
    saveTemplateHtml: async (id, html) => {
        const list = await borderOpsController.getTemplates();
        const idx = list.findIndex(t => t.id === id);
        if (idx === -1) return false;
        list[idx].html = html;
        list[idx].updatedAt = Date.now();
        await DB.save(DB_KEY_TEMPLATES, list);
        return true;
    },

    // ========================================
    // 양식 여백 설정
    // ========================================
    setTemplatePageMargin: async (id, pageMargin) => {
        const list = await borderOpsController.getTemplates();
        const idx = list.findIndex(t => t.id === id);
        if (idx === -1) return false;
        list[idx].pageMargin = normalizeMargin(pageMargin);
        list[idx].updatedAt = Date.now();
        await DB.save(DB_KEY_TEMPLATES, list);
        return true;
    },

    getDefaultPageMargin: () => ({ ...DEFAULT_PAGE_MARGIN }),

    // ========================================
    // 양식 이름 수정
    // ========================================
    renameTemplate: async (id, name) => {
        const list = await borderOpsController.getTemplates();
        const idx = list.findIndex(t => t.id === id);
        if (idx === -1) return false;
        list[idx].name = name;
        list[idx].updatedAt = Date.now();
        await DB.save(DB_KEY_TEMPLATES, list);
        return true;
    },

    // ========================================
    // 양식 삭제
    // ========================================
    deleteTemplate: async (id) => {
        let list = await borderOpsController.getTemplates();
        list = list.filter(t => t.id !== id);
        await DB.save(DB_KEY_TEMPLATES, list);

        // 활성 양식이 삭제된 양식이면 초기화
        const active = await borderOpsController.getActiveTemplateId();
        if (active === id) {
            await DB.save(DB_KEY_ACTIVE, null);
        }
        return true;
    },

    reorderTemplates: async (sourceId, targetId, position = 'before') => {
        const list = await borderOpsController.getTemplates();
        const nextList = moveTemplateInList(list, sourceId, targetId, position);
        await DB.save(DB_KEY_TEMPLATES, nextList);
        return nextList;
    },

    // ========================================
    // 활성 양식 ID 조회/설정
    // ========================================
    getActiveTemplateId: async () => {
        return await DB.get(DB_KEY_ACTIVE);
    },

    setActiveTemplateId: async (id) => {
        await DB.save(DB_KEY_ACTIVE, id);
    },
};
