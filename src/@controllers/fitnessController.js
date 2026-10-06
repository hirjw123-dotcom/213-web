import DB from '../@modules/db.js';

const DB_KEY_TABS = 'fitness-tabs-1';
const DB_KEY_HEALTH = 'fitness-health-1';

// 기본 셀 정의
const DEFAULT_CELLS = [
    {
        id: 'run3km',
        text: '3km 뜀걸음', type: 'i:s', useGrade: true,
        grades: [
            { name: '특', value: 0, under: '12:30', color: '#000000', bold: true },
            { name: '1', value: 1, under: '13:32', color: '#000000' },
            { name: '2', value: 2, under: '14:34', color: '#444444' },
            { name: '3', value: 3, under: '15:36', color: '#444444' },
            { name: '불', value: 4, color: '#ff0000' },
        ]
    },
    {
        id: 'pushup',
        text: '팔굽', type: 'count', useGrade: true,
        grades: [
            { name: '특', value: 0, over: 72, color: '#000000', bold: true },
            { name: '1', value: 1, over: 64, color: '#000000' },
            { name: '2', value: 2, over: 56, color: '#444444' },
            { name: '3', value: 3, over: 48, color: '#444444' },
            { name: '불', value: 4, over: 0, color: '#ff0000' },
        ]
    },
    {
        id: 'situp',
        text: '윗몸', type: 'count', useGrade: true,
        grades: [
            { name: '특', value: 0, over: 86, color: '#000000', bold: true },
            { name: '1', value: 1, over: 78, color: '#000000' },
            { name: '2', value: 2, over: 70, color: '#444444' },
            { name: '3', value: 3, over: 62, color: '#444444' },
            { name: '불', value: 4, over: 0, color: '#ff0000' },
        ]
    },
];

export { DEFAULT_CELLS };

const makeDefaultSection = () => ({
    id: 'sec_' + Date.now(),
    name: [
        // 뒷 두글자
        new Date().getFullYear().toString().slice(-2),
        new Date().getMonth() + 1,
        new Date().getDate(),
    ].join('.'),
    idx: 1,
});

function getAllCellIds(cells = []) {
    return cells.map(cell => cell.id);
}

function normalizeSection(section = {}, cells = []) {
    const allCellIds = getAllCellIds(cells);
    const requestedIds = Array.isArray(section.enabledCellIds)
        ? section.enabledCellIds.filter(id => allCellIds.includes(id))
        : allCellIds;

    return {
        ...section,
        enabledCellIds: requestedIds,
    };
}

function normalizeTab(tab = {}) {
    const cells = tab.cells || [];
    return {
        ...tab,
        sections: (tab.sections || []).map(section => normalizeSection(section, cells)),
    };
}

const DEFAULT_TAB = {
    id: 'default',
    text: '체단기록',
    cells: DEFAULT_CELLS,
    hidden: false,
    sections: [],
};

// 셀 타입별 너비 (px)
export const CELL_TYPE_WIDTHS = {
    'i:s': 58,
    'h:i:s': 72,
    'count': 48,
};

export const GRADE_COL_WIDTH = 30;

export function getCellWidth(type) {
    return CELL_TYPE_WIDTHS[type] || 56;
}

export function getSectionEnabledCellIds(section, cells = []) {
    const normalized = normalizeSection(section, cells);
    return normalized.enabledCellIds;
}

export function isSectionCellEnabled(section, cellId, cells = []) {
    return getSectionEnabledCellIds(section, cells).includes(cellId);
}

// 타입 변환 유틸
export const fitnessUtils = {
    // "12:30" -> 750 (초)
    timeToSeconds(str, type) {
        if (str === '' || str === null || str === undefined) return null;
        if (typeof str === 'number') return str;
        const s = String(str);
        if (type === 'i:s') {
            const parts = s.split(':');
            if (parts.length !== 2) return null;
            const m = parseInt(parts[0]) || 0;
            const sec = parseInt(parts[1]) || 0;
            return m * 60 + sec;
        }
        if (type === 'h:i:s') {
            const parts = s.split(':');
            if (parts.length !== 3) return null;
            const h = parseInt(parts[0]) || 0;
            const m = parseInt(parts[1]) || 0;
            const sec = parseInt(parts[2]) || 0;
            return h * 3600 + m * 60 + sec;
        }
        return parseInt(s) || null;
    },

    // 750 -> "12:30"
    secondsToDisplay(val, type) {
        if (val === null || val === undefined || val === '') return '';
        if (val === '소견서' || val === '열외') return val;
        const v = Number(val);
        if (isNaN(v)) return '';
        if (type === 'i:s') {
            const m = Math.floor(v / 60);
            const s = v % 60;
            return `${m}:${String(s).padStart(2, '0')}`;
        }
        if (type === 'h:i:s') {
            const h = Math.floor(v / 3600);
            const m = Math.floor((v % 3600) / 60);
            const s = v % 60;
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        return String(v);
    },

    displayToStored(text, type) {
        if (text === '' || text === null || text === undefined) return null;
        if (text === '소견서' || text === '열외') return text;
        if (type === 'count') {
            const v = parseInt(text);
            return isNaN(v) ? null : v;
        }
        return fitnessUtils.timeToSeconds(text, type);
    },

    calcGrade(value, cell) {
        if (value === null || value === undefined) return null;
        if (value === '소견서' || value === '열외') return { name: value, value: 2, bg: '#eeeeee', color: '#444444' };
        if (!cell.useGrade || !cell.grades) return null;
        const v = Number(value);
        if (isNaN(v)) return null;
        const type = cell.type;
        for (const grade of cell.grades) {
            if (grade.under !== undefined) {
                const threshold = fitnessUtils.timeToSeconds(grade.under, type) ?? grade.under;
                if (v <= threshold) return grade;
            }
            if (grade.over !== undefined) {
                const threshold = typeof grade.over === 'string'
                    ? fitnessUtils.timeToSeconds(grade.over, type)
                    : grade.over;
                if (v >= threshold) return grade;
            }
        }
        const lastGrade = cell.grades[cell.grades.length - 1];
        return lastGrade || null;
    },

    gradeText(value, cell) {
        const g = fitnessUtils.calcGrade(value, cell);
        return g ? g.name : '';
    },

    gradeStyle(value, cell) {
        const g = fitnessUtils.calcGrade(value, cell);
        if (!g) return {};
        return {
            color: g.color || '#000',
            fontWeight: g.bold ? 'bold' : 'normal',
            background: g.bg || undefined,
        };
    },
};


export const fitnessController = {
    getTabs: async () => {
        const saved = await DB.get(DB_KEY_TABS);
        if (saved && saved.length > 0) {
            // 회차 없으면 기본 회차 하나 추가 (DB에는 저장안함, fallback)
            return saved.map(tab => {
                const normalizedTab = normalizeTab(tab);
                if (!tab.sections || tab.sections.length === 0) {
                    return { ...normalizedTab, sections: [] };
                }
                return normalizedTab;
            });
        }
        return [{ ...DEFAULT_TAB, cells: DEFAULT_TAB.cells.map(c => ({ ...c, grades: c.grades?.map(g => ({ ...g })) })), sections: [] }];
    },

    saveTabs: async (tabs) => {
        await DB.save(DB_KEY_TABS, (tabs || []).map(normalizeTab));
    },

    addTab: async (text, cells) => {
        const tabs = await fitnessController.getTabs();
        const newTab = {
            id: 'tab_' + Date.now(),
            text: text || '새 탭',
            cells: cells || DEFAULT_CELLS.map(c => ({ ...c, id: c.id + '_' + Date.now(), grades: c.grades?.map(g => ({ ...g })) })),
            hidden: false,
            sections: [normalizeSection(makeDefaultSection(), cells || DEFAULT_CELLS)],
        };
        tabs.push(newTab);
        await fitnessController.saveTabs(tabs);
        return tabs;
    },

    updateTab: async (tabId, data) => {
        const tabs = await fitnessController.getTabs();
        const idx = tabs.findIndex(t => t.id === tabId);
        if (idx === -1) return tabs;
        tabs[idx] = normalizeTab({ ...tabs[idx], ...data });
        await fitnessController.saveTabs(tabs);
        return tabs;
    },

    reorderTabs: async (orderedTabIds) => {
        const tabs = await fitnessController.getTabs();
        if (!Array.isArray(orderedTabIds)) return tabs;

        const tabMap = new Map(tabs.map(tab => [tab.id, normalizeTab(tab)]));
        const reordered = orderedTabIds
            .map(tabId => tabMap.get(tabId))
            .filter(Boolean);
        const remaining = tabs.filter(tab => !orderedTabIds.includes(tab.id));
        const nextTabs = [...reordered, ...remaining].map(normalizeTab);

        await fitnessController.saveTabs(nextTabs);
        return nextTabs;
    },

    hideTab: async (tabId) => fitnessController.updateTab(tabId, { hidden: true }),
    showTab: async (tabId) => fitnessController.updateTab(tabId, { hidden: false }),

    deleteTab: async (tabId) => {
        const tabs = await fitnessController.getTabs();
        const filtered = tabs.filter(t => t.id !== tabId);
        await fitnessController.saveTabs(filtered.length > 0 ? filtered : [{ ...DEFAULT_TAB, sections: [makeDefaultSection()] }]);
        return await fitnessController.getTabs();
    },

    getAllHealth: async () => {
        return (await DB.get(DB_KEY_HEALTH)) || {};
    },

    saveAllHealth: async (health) => {
        await DB.save(DB_KEY_HEALTH, health);
    },

    getSoldierHealth: (allHealth, soldierId) => allHealth[soldierId] || {},

    getCellValue: (allHealth, soldierId, tabId, sectionId, cellId) =>
        allHealth?.[soldierId]?.[tabId]?.[sectionId]?.[cellId] ?? null,

    setCellValue: (allHealth, soldierId, tabId, sectionId, cellId, value) => {
        if (!allHealth[soldierId]) allHealth[soldierId] = {};
        if (!allHealth[soldierId][tabId]) allHealth[soldierId][tabId] = {};
        if (!allHealth[soldierId][tabId][sectionId]) allHealth[soldierId][tabId][sectionId] = {};
        allHealth[soldierId][tabId][sectionId][cellId] = value;
        return allHealth;
    },

    addSection: async (tabId, name) => {
        const tabs = await fitnessController.getTabs();
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) return tabs;
        if (!tab.sections) tab.sections = [];
        let D = new Date();
        tab.sections.unshift(normalizeSection({
            id: 'sec_' + Date.now(),
            name: name || [
                // 뒷 두글자
                D.getFullYear().toString().slice(-2),
                D.getMonth() + 1,
                D.getDate(),
            ].join('.'),
            idx: tab.sections.length + 1,
        }, tab.cells));
        await fitnessController.saveTabs(tabs);
        return tabs;
    },

    updateSection: async (tabId, sectionId, data) => {
        const tabs = await fitnessController.getTabs();
        const tab = tabs.find(t => t.id === tabId);
        if (!tab?.sections) return tabs;
        const sec = tab.sections.find(s => s.id === sectionId);
        if (sec) Object.assign(sec, normalizeSection({ ...sec, ...data }, tab.cells));
        await fitnessController.saveTabs(tabs);
        return tabs;
    },

    reorderSections: async (tabId, orderedSectionIds) => {
        const tabs = await fitnessController.getTabs();
        const tab = tabs.find(t => t.id === tabId);
        if (!tab?.sections || !Array.isArray(orderedSectionIds)) return tabs;

        const sectionMap = new Map(tab.sections.map(section => [section.id, section]));
        const reordered = orderedSectionIds
            .map(sectionId => sectionMap.get(sectionId))
            .filter(Boolean);
        const remaining = tab.sections.filter(section => !orderedSectionIds.includes(section.id));

        tab.sections = [...reordered, ...remaining].map(section => normalizeSection(section, tab.cells));
        await fitnessController.saveTabs(tabs);
        return tabs;
    },

    deleteSection: async (tabId, sectionId) => {
        const tabs = await fitnessController.getTabs();
        const tab = tabs.find(t => t.id === tabId);
        if (!tab?.sections) return tabs;
        tab.sections = tab.sections.filter(s => s.id !== sectionId);
        await fitnessController.saveTabs(tabs);
        return tabs;
    },
};
