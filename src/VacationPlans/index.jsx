import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { soldiersController } from '../@controllers/soldiersController.js';
import { soldierVacationController } from '../@controllers/soldierVacationController.js';
import { scheduleTypesController } from '../@controllers/soldierScheduleTypesController.js';
import { battalionSchedulesController } from '../@controllers/battalionSchedulesController.js';
import { UNITS } from '../@modules/configs.js';
import { filterValidSoldiers } from '../SoldierSchedules/@modules/utils.js';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_MS = 24 * 60 * 60 * 1000;
const WORKDAY_INDICES = [1, 2, 3, 4, 5];
const LEAVE_LABELS = [
    '휴',
    '박',
    '출',
    '평출',
    '면회',
    '근무',
    '전휴',
    '외진',
    '입원',
    '파',
];
const DEFAULT_TITLE_BY_LABEL = {
    휴: '휴가',
    박: '외박',
    출: '외출',
    평출: '평출',
    면회: '면회',
    근무: '근무',
    전휴: '전휴',
    외진: '외진',
    입원: '입원',
    파: '파견',
};
const LEAVE_FILTER_TABS = [
    { key: 'all', label: '전체' },
    { key: '휴', label: '휴가' },
    { key: '출', label: '외출' },
    { key: '박', label: '외박' },
    { key: '평출', label: '평출' },
    { key: '면회', label: '면회' },
    { key: '근무', label: '근무' },
    { key: '전휴', label: '전휴' },
    { key: '외진', label: '외진' },
    { key: '입원', label: '입원' },
    { key: '파', label: '파견' },
];
let vp_selected_soldier_id = '';
const vacationPlansCss = `
    .vp-shell {
        height: 100%;
        min-height: 0;
        display: grid;
        grid-template-columns: 240px minmax(0, 1fr) 240px;
        gap: 12px;
        padding: 12px;
        box-sizing: border-box;
        background: #fff;
        color: #000;
        overflow: hidden;
    }

    .vp-panel {
        min-height: 0;
        border: 1px solid #000;
        background: #fff;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .vp-panel-header {
        padding: 10px 12px;
        border-bottom: 1px solid #000;
        font-size: 14px;
        font-weight: 800;
        color: #000;
        background: #f3f3f3;
    }

    .vp-soldier-list {
        flex: 1;
        min-height: 0;
        overflow: auto;
        padding: 0;
    }

    .vp-soldier-table {
        display: grid;
        grid-template-columns: 40px minmax(0, 1fr) 48px;
        border-top: 1px solid #000;
        border-left: 1px solid #000;
        background: #fff;
    }

    .vp-soldier-head,
    .vp-soldier-index,
    .vp-soldier-count,
    .vp-soldier-btn {
        height: 26px;
        border-right: 1px solid #000;
        border-bottom: 1px solid #000;
    }

    .vp-soldier-head {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px 6px;
        background: #f3f3f3;
        font-size: 12px;
        font-weight: 800;
        color: #000;
    }

    .vp-soldier-head.name {
        justify-content: flex-start;
    }

    .vp-soldier-head.count {
        font-size: 11px;
    }

    .vp-soldier-index {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        font-size: 12px;
        color: #000;
        font-variant-numeric: tabular-nums;
    }

    .vp-soldier-count {
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
    }

    .vp-soldier-count-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border: 1px solid #000;
        border-radius: 999px;
        background: #fffdf6;
        color: #8b5f00;
        font-size: 11px;
        font-weight: 800;
        line-height: 1;
        font-variant-numeric: tabular-nums;
    }

    .vp-soldier-btn {
        width: 100%;
        border-top: none;
        border-left: none;
        text-align: left;
        cursor: pointer;
        font-size: 12px;
        font-weight: 700;
        color: #000;
        line-height: 1.2;
        padding: 0 10px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-sizing: border-box;
    }

    .vp-soldier-btn:hover {
        filter: brightness(0.985);
    }

    .vp-soldier-btn.active {
        box-shadow: inset 4px 0 0 #000;
        font-weight: 800;
    }

    .vp-main {
        min-width: 0;
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow: hidden;
    }

    .vp-toolbar {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        padding: 10px 12px;
        border: 1px solid #000;
        background: linear-gradient(180deg, #fffdf8 0%, #fff 100%);
    }

    .vp-toolbar-right {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .vp-toolbar button,
    .vp-action-menu button,
    .vp-summary-delete {
        border: 1px solid #000;
        background: #fff;
        color: #000;
        padding: 6px 10px;
        font-size: 12px;
        cursor: pointer;
    }

    .vp-month-label {
        min-width: 124px;
        text-align: center;
        font-size: 28px;
        font-weight: 800;
        line-height: 1;
        color: #8dbc7c;
    }

    .vp-annual-scroll {
        flex: 1;
        min-height: 0;
        overflow: auto;
        border: 1px solid #000;
        background: linear-gradient(180deg, #fffdfa 0%, #fff 100%);
        
        padding-bottom:250px;
    }

    .vp-annual-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        padding: 12px;
        background: linear-gradient(180deg, #fffdfa 0%, #fff 100%);
    }

    .vp-month-card {
        border: 1px solid #d9cfba;
        background: linear-gradient(180deg, #fffefb 0%, #fff 100%);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        box-sizing: border-box;
        transition: opacity 120ms ease;
        box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
    }

    .vp-month-card.after-discharge-month {
        opacity: 0.4;
    }

    .vp-month-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 2px;
    }

    .vp-month-card-title {
        font-size: 16px;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.03em;
        color: #4f4f4f;
    }

    .vp-month-card-count {
        font-size: 12px;
        color: #75654d;
        white-space: nowrap;
        font-weight: 700;
    }

    .vp-month-calendar {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        background: #fff;
    }

    .vp-month-calendar th {
        text-align: center;
        font-size: 12px;
        color: #4f4f4f;
        font-weight: 700;
        padding: 8px 4px;
        border: 1px solid #c9d3df;
        background: #dfe8f2;
    }

    .vp-month-calendar th.sun {
        color: #de5a5a;
    }

    .vp-month-calendar th.sat {
        color: #396da8;
    }

    .vp-week-summary-head {
        width: 90px;
    }

    .vp-week-summary-cell {
        width: 90px;
        vertical-align: top;
        padding: 8px 9px;
        border: 1px solid #d3d8de;
        background: #f7f2ea;
    }

    .vp-week-summary-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        color: #7a5222;
        font-size: 12px;
        font-weight: 800;
    }

    .vp-week-summary-range {
        margin-top: 6px;
        font-size: 11px;
        font-weight: 700;
        color: #816e57;
    }

    .vp-week-summary-text {
        margin-top: 8px;
        font-size: 12px;
        line-height: 1.35;
        color: #5f4e39;
        font-weight: 700;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .vp-week-summary-empty {
        margin-top: 8px;
        font-size: 11px;
        color: #9a8f82;
    }

    .vp-day-cell {
        height:56px;
        border: 1px solid #d3d8de;
        background: #fff;
        position: relative;
        vertical-align: top;
    }

    .vp-day-cell.empty {
        background: #f9f9f9;
    }

    .vp-day-cell.after-discharge {
        opacity: 0.42;
    }

    .vp-day-cell.discharge {
        background: #161616;
    }

    .vp-day-button {
        width: 100%;
        height: 100%;
        border: none;
        background: transparent;
        padding: 0;
        position: relative;
        cursor: pointer;
        text-align: left;
        vertical-align: top;
        display: flex;
  align-items: flex-start;
  justify-content: flex-start; 
    }

    .vp-day-button:disabled {
        cursor: default;
    }

    .vp-day-button.selected {
        background: #89b8ff;
    }

    .vp-day-button.sun .vp-day-number {
        color: #c93d3d;
    }

    .vp-day-button.sat .vp-day-number {
        color: #2f66a8;
    }

    .vp-day-button.holiday-marked .vp-day-number {
        color: #c00000;
        font-weight: 800;
    }

    .vp-day-button.discharge .vp-day-number {
        color: #fff;
    }

    .vp-day-number {
        font-size: 14px;
        font-weight: 700;
    }

    .vp-day-button.today .vp-day-number {
        background: #d7ebcb;
        width:35px;
        color: #17441d;
        font-weight: 800;
        border-radius: 999px;
    }

    .vp-discharge-label {
        position: absolute;
        top: 7px;
        right: 6px;
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
        color: #ffd84d;
        pointer-events: none;
    }

    .vp-holiday-badge {
        position: absolute;
        top: 8px;
        right: 6px;
        font-size: 9px;
        font-weight: 800;
        color: #c62828;
    }

    .vp-day-leave-fill {
        position: absolute;
        inset: 0;
        opacity: 0.16;
        pointer-events: none;
    }

    .vp-day-leave-bar {
        pointer-events: none;
        position: absolute;
        left: -1px;
        right: auto;
        bottom: 5px;
        height: 20px;
        border: 1px solid #000;
        font-size: 11px;
        font-weight: 700;
        line-height: 18px;
        padding: 0 6px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        z-index: 1;
        display: flex;
        align-items: center;
        box-sizing: border-box;
    }

    .vp-day-leave-bar.single-day {
        justify-content: center;
        padding: 0 2px;
        font-size: 10px;
    }

    .vp-day-leave-bar.multi-day {
        justify-content: flex-start;
    }

    .vp-day-leave-bar.range-start {
        border-radius: 10px 0 0 10px;
        left: 3px;
    }

    .vp-day-leave-bar.range-end {
        border-radius: 0 10px 10px 0;
    }

    .vp-day-leave-bar.no-left-edge {
        border-left: none;
    }

    .vp-day-leave-bar.no-right-edge {
        border-right: none;
    }

    .vp-day-leave-bar.range-start.range-end {
        border-radius: 10px;
    }

    .vp-day-button.discharge .vp-day-leave-bar {
        border-color: #ffe16a;
        color: #ffe16a !important;
        background: rgba(255, 216, 77, 0.18) !important;
    }

    .vp-summary {
        min-height: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
        overflow: hidden;
        background: #fff;
    }

    .vp-summary-table {
        display: grid;
        grid-template-columns: 132px minmax(0, 1fr);
        border-top: 1px solid #000;
        border-left: 1px solid #000;
        margin: 10px;
        margin-bottom: 12px;
    }

    .vp-summary-cell {
        min-height: 32px;
        border-right: 1px solid #000;
        border-bottom: 1px solid #000;
        padding: 6px 8px;
        display: flex;
        align-items: center;
        background: #fff;
        box-sizing: border-box;
    }

    .vp-summary-cell.label {
        background: #f3f3f3;
        font-size: 12px;
        font-weight: 800;
        color: #000;
    }

    .vp-summary-cell.value {
        justify-content: flex-end;
        font-size: 18px;
        font-weight: 800;
        color: #000;
        font-variant-numeric: tabular-nums;
    }

    .vp-summary-cell input,
    .vp-summary-item input {
        width: 100%;
        border: 1px solid #000;
        background: #fff;
        padding: 5px 8px;
        font-size: 13px;
        text-align: right;
        font-variant-numeric: tabular-nums;
    }

    .vp-summary-cell.value.input {
        justify-content: stretch;
    }

    .vp-summary-list {
        flex: 1;
        min-height: 0;
        overflow: auto;
        display: flex;
        flex-direction: column;
        gap: 0;
        border-top: 1px solid #000;
        background: #fff;
    }

    .vp-summary-group {
        position: relative;
    }

    .vp-summary-group.hover-linked {
        z-index: 1;
    }

    .vp-summary-group.hover-linked .vp-summary-item,
    .vp-summary-group.hover-linked .vp-summary-edit-row {
        background: #eef4ff;
    }

    .vp-summary-group.hover-linked .vp-summary-item {
        box-shadow: inset 4px 0 0 #17441d;
    }

    .vp-summary-tabs {
        display: flex;
        flex-wrap: nowrap;
        gap: 0;
        padding: 10px 10px 0;
        background: #fff;
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: thin;
    }

    .vp-summary-tab {
        flex: 0 0 auto;
        min-width: 64px;
        min-height: 30px;
        border: 1px solid #000;
        border-right: none;
        background: #f3f3f3;
        color: #555;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
    }

    .vp-summary-tab:last-child {
        border-right: 1px solid #000;
    }

    .vp-summary-tab.active {
        background: #121212;
        color: #fff;
    }

    .vp-summary-item {
        border-bottom: 1px solid #000;
        background: #fff;
        padding: 0;
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) 52px;
        align-items: stretch;
        min-height: 34px;
    }

    .vp-summary-title-wrap {
        display: flex;
        align-items: center;
        min-width: 0;
        padding: 6px 8px;
        border-right: 1px solid #000;
    }

    .vp-summary-badge {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        padding: 0 4px;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid #000;
        box-sizing: border-box;
    }

    .vp-summary-range {
        display: flex;
        align-items: center;
        min-width: 0;
        padding: 6px 8px;
        font-size: 11px;
        font-weight: 700;
        color: #000;
        line-height: 1.35;
        border-right: 1px solid #000;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .vp-summary-delete {
        color: #c00000;
        background: #fff;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px 4px;
        font-size: 12px;
        font-weight: 700;
    }

    .vp-summary-edit-row {
        display: grid;
        grid-template-columns: 56px minmax(0, 1fr) 52px;
        border-bottom: 1px solid #000;
        background: #fff;
    }

    .vp-summary-edit-spacer,
    .vp-summary-edit-field,
    .vp-summary-edit-save {
        min-height: 30px;
        border-right: 1px solid #000;
        display: flex;
        align-items: center;
        padding: 4px 8px;
        box-sizing: border-box;
    }

    .vp-summary-edit-row > :last-child {
        border-right: none;
    }

    .vp-summary-edit-save {
        justify-content: center;
        font-size: 11px;
        color: #000;
        background: #f3f3f3;
    }

    .vp-summary-edit-field {
        padding: 3px 6px;
    }

    .vp-summary-edit-field input {
        text-align: left;
        font-size: 12px;
    }

    .vp-month-empty {
        font-size: 12px;
        color: #000;
        padding: 12px 8px;
        background: #fff;
        border: 1px dashed #000;
        margin: 10px;
    }

    .vp-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 280px;
        font-size: 14px;
        color: #000;
    }

    .vp-action-menu {
        position: fixed;
        z-index: 12000;
        width: 168px;
        border: 1px solid #000;
        background: #fff;
        box-shadow: none;
        box-sizing: border-box;
    }

    .vp-action-menu-header {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 7px 8px;
        background: #f3f3f3;
        border-bottom: 1px solid #000;
        font-size: 10px;
        color: #000;
        line-height: 1.35;
    }

    .vp-action-menu-header strong {
        font-size: 11px;
        color: #000;
    }

    .vp-action-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px;
        padding: 6px;
    }

    .vp-action-grid button,
    .vp-action-clear {
        width: 100%;
        min-width: 0;
        padding: 7px 6px;
        text-align: center;
        font-size: 11px;
        font-weight: 700;
        border: 1px solid #000;
    }

    .vp-action-clear {
        display: block;
        width: calc(100% - 12px);
        margin: 0 6px 6px;
        color: #c00000;
        background: #fff;
    }

`;

const addDays = (date, amount) => {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    next.setHours(0, 0, 0, 0);
    return next;
};

const stripTime = (date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
};

const formatDateKey = (date) => battalionSchedulesController.utils.formatDate(date);

const parseDateKey = (dateKey) => {
    const [year, month, day] = String(dateKey || '').split('-').map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
};

const parseDateArray = (value) => {
    if (!Array.isArray(value) || value.length < 3) return null;
    const [year, month, day] = value.map(Number);
    if (!year || !month || !day) return null;
    return stripTime(new Date(year, month - 1, day));
};

const getDateRangeKeys = (startKey, endKey) => {
    if (!startKey || !endKey) return [];
    let startDate = stripTime(parseDateKey(startKey));
    let endDate = stripTime(parseDateKey(endKey));
    if (startDate > endDate) {
        const temp = startDate;
        startDate = endDate;
        endDate = temp;
    }

    const keys = [];
    for (let cursor = new Date(startDate); cursor <= endDate; cursor = addDays(cursor, 1)) {
        keys.push(formatDateKey(cursor));
    }
    return keys;
};

const buildMonthMatrix = (year, month) => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const cells = [];

    for (let index = 0; index < firstDay.getDay(); index++) {
        cells.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month - 1, day);
        cells.push({
            date,
            dateKey: formatDateKey(date),
            day,
        });
    }

    while (cells.length % 7 !== 0) {
        cells.push(null);
    }

    const weeks = [];
    for (let index = 0; index < cells.length; index += 7) {
        weeks.push(cells.slice(index, index + 7));
    }

    return weeks;
};

const formatRangeLabel = (startKey, endKey) => {
    const startDate = parseDateKey(startKey);
    const endDate = parseDateKey(endKey);
    const startLabel = `${startDate.getFullYear()}/${String(startDate.getMonth() + 1).padStart(2, '0')}/${String(startDate.getDate()).padStart(2, '0')}(${DAY_KO[startDate.getDay()]})`;
    if (startKey === endKey) return startLabel;
    const endLabel = `${endDate.getFullYear()}/${String(endDate.getMonth() + 1).padStart(2, '0')}/${String(endDate.getDate()).padStart(2, '0')}(${DAY_KO[endDate.getDay()]})`;
    return `${startLabel}~${endLabel}`;
};

const normalizeTitle = (value, label) => String(value || '').trim() || DEFAULT_TITLE_BY_LABEL[label] || '휴가';
const toNullableNumber = (value) => (value === '' || value == null ? null : Number.isFinite(Number(value)) ? Number(value) : null);
const truncateText = (value, maxLength) => {
    const text = String(value || '').trim();
    if (!text || text.length <= maxLength) return text;
    return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
};
const normalizeScheduleText = (value) => String(value || '').trim();

const getLabelMeta = (label, scheduleTypeMap) => {
    const item = scheduleTypeMap[label] || {};
    return {
        label,
        text: item.desc || DEFAULT_TITLE_BY_LABEL[label] || label,
        bg: item.bg || '#f3f4f6',
        color: item.color || '#111827',
    };
};

const getGroupId = (group) => `${group.label}_${group.startKey}_${group.endKey}`;
const getTitleMap = (titlesByLabel, label) => titlesByLabel?.[label] || {};
const filterSelectableDateKeys = (dateKeys, exitDateKey) => {
    if (!exitDateKey) return dateKeys;
    return dateKeys.filter((dateKey) => dateKey <= exitDateKey);
};
const getWeekScheduleKey = (date) => {
    const { year, weekNum } = battalionSchedulesController.utils.getWeekNumber(date);
    return battalionSchedulesController.utils.getWeekKey(year, weekNum);
};
const getWeekScheduleText = (date, weeklySchedules) => normalizeScheduleText(weeklySchedules?.[getWeekScheduleKey(date)]?.text);
const getWeekRangeLabel = (week) => {
    const workdayCells = WORKDAY_INDICES.map((index) => week[index]).filter(Boolean);
    const targetCells = workdayCells.length > 0 ? workdayCells : week.filter(Boolean);
    if (targetCells.length === 0) return '';

    const start = targetCells[0].date;
    const end = targetCells[targetCells.length - 1].date;
    return `(${start.getMonth() + 1}/${start.getDate()}-${end.getMonth() + 1}/${end.getDate()})`;
};
const buildMonthWeekSummaries = (matrix, weeklySchedules) => matrix.map((week) => {
    const referenceCell = week[1] || week.find(Boolean) || null;
    if (!referenceCell) {
        return { weekNum: '', rangeText: '', text: '' };
    }

    const { weekNum } = battalionSchedulesController.utils.getWeekNumber(referenceCell.date);
    return {
        weekNum,
        rangeText: getWeekRangeLabel(week),
        text: getWeekScheduleText(referenceCell.date, weeklySchedules),
    };
});

const countGroupDaysInRange = (group, startDate, endDate) => group.dateKeys.reduce((count, dateKey) => {
    const date = parseDateKey(dateKey);
    return date >= startDate && date <= endDate ? count + 1 : count;
}, 0);

const buildLeaveEntries = (leaveDateMap, titlesByLabel) => {
    const entries = [];
    for (const label of LEAVE_LABELS) {
        const titleMap = getTitleMap(titlesByLabel, label);
        for (const dateKey of leaveDateMap[label] || []) {
            entries.push({
                label,
                dateKey,
                title: normalizeTitle(titleMap[dateKey], label),
            });
        }
    }
    return entries.sort((left, right) => left.dateKey.localeCompare(right.dateKey) || LEAVE_LABELS.indexOf(left.label) - LEAVE_LABELS.indexOf(right.label));
};

const buildGroupedLeaves = (leaveEntries) => {
    const groups = [];
    let current = null;

    for (const entry of leaveEntries) {
        if (!current) {
            current = { label: entry.label, startKey: entry.dateKey, endKey: entry.dateKey, dateKeys: [entry.dateKey], titles: [entry.title] };
            continue;
        }

        const prevDate = parseDateKey(current.endKey);
        const nextDate = parseDateKey(entry.dateKey);
        const diff = Math.round((stripTime(nextDate).getTime() - stripTime(prevDate).getTime()) / DAY_MS);
        if (entry.label === current.label && diff === 1) {
            current.endKey = entry.dateKey;
            current.dateKeys.push(entry.dateKey);
            current.titles.push(entry.title);
        } else {
            groups.push(current);
            current = { label: entry.label, startKey: entry.dateKey, endKey: entry.dateKey, dateKeys: [entry.dateKey], titles: [entry.title] };
        }
    }

    if (current) groups.push(current);

    return groups.map((group) => ({
        ...group,
        id: getGroupId(group),
        dayCount: group.dateKeys.length,
        title: [...new Set(group.titles)].join(', '),
    }));
};

const buildDateToGroupIdMap = (groupedLeaves) => {
    const next = {};
    groupedLeaves.forEach((group) => {
        group.dateKeys.forEach((dateKey) => {
            next[dateKey] = group.id;
        });
    });
    return next;
};

const createEmptyLeaveDateMap = () => Object.fromEntries(LEAVE_LABELS.map((label) => [label, []]));

const cloneLeaveDateMap = (leaveDateMap) => Object.fromEntries(
    LEAVE_LABELS.map((label) => [label, [...(leaveDateMap?.[label] || [])]])
);

const cloneTitlesByLabel = (titlesByLabel) => Object.fromEntries(
    LEAVE_LABELS.map((label) => [label, { ...(titlesByLabel?.[label] || {}) }])
);

const buildSnapshot = (leaveDateMap, titlesByLabel) => ({
    leaveDateMap: cloneLeaveDateMap(leaveDateMap),
    titlesByLabel: cloneTitlesByLabel(titlesByLabel),
});

const buildTitleInputsFromSnapshot = (snapshot) => {
    const groupedLeaves = buildGroupedLeaves(buildLeaveEntries(snapshot.leaveDateMap, snapshot.titlesByLabel));
    return Object.fromEntries(groupedLeaves.map((group) => [group.id, group.title]));
};

const buildMonthLeaveBars = (matrix, groupedLeaves, displayTitles, scheduleTypeMap) => {
    const byDate = {};

    groupedLeaves.forEach((group) => {
        const dateKeySet = new Set(group.dateKeys);
        const meta = getLabelMeta(group.label, scheduleTypeMap);
        const displayTitle = displayTitles[group.id] || group.title;

        matrix.forEach((week) => {
            const cols = [];
            week.forEach((cell, colIndex) => {
                if (cell?.dateKey && dateKeySet.has(cell.dateKey)) cols.push(colIndex);
            });
            if (!cols.length) return;

            const firstCol = cols[0];
            const lastCol = cols[cols.length - 1];
            const firstDateKey = week[firstCol]?.dateKey;
            const lastDateKey = week[lastCol]?.dateKey;
            const continuesFromPrev = firstDateKey ? dateKeySet.has(formatDateKey(addDays(parseDateKey(firstDateKey), -1))) : false;
            const continuesToNext = lastDateKey ? dateKeySet.has(formatDateKey(addDays(parseDateKey(lastDateKey), 1))) : false;
            const visibleSpan = lastCol - firstCol + 1;
            const isSingleDaySpan = visibleSpan === 1;
            const displayText = isSingleDaySpan ? truncateText(displayTitle, 4) : displayTitle;

            cols.forEach((col) => {
                const cell = week[col];
                if (!cell) return;
                byDate[cell.dateKey] = {
                    label: group.label,
                    title: displayTitle,
                    bg: meta.bg,
                    color: meta.color,
                    renderBar: col === firstCol,
                    spanDays: visibleSpan,
                    isSingleDaySpan,
                    isRangeStart: col === firstCol && !continuesFromPrev,
                    isRangeEnd: col === firstCol && !continuesToNext,
                    continuesFromPrev,
                    continuesToNext,
                    displayLabel: col === firstCol ? displayText : '',
                };
            });
        });
    });

    return byDate;
};

const getUnitInfo = (unitValue) => UNITS.find((unit) => unit.id === unitValue || unit.name === unitValue) || { id: unitValue, name: unitValue || '미지정', bg: '#eef2f7' };

const sortSoldiers = (soldiers) => [...soldiers].sort((left, right) => {
    const leftUnitIndex = UNITS.findIndex((unit) => unit.id === left.unit || unit.name === left.unit);
    const rightUnitIndex = UNITS.findIndex((unit) => unit.id === right.unit || unit.name === right.unit);
    if (leftUnitIndex !== rightUnitIndex) return leftUnitIndex - rightUnitIndex;
    if ((left.order ?? 9999) !== (right.order ?? 9999)) return (left.order ?? 9999) - (right.order ?? 9999);
    return String(left.name || '').localeCompare(String(right.name || ''), 'ko');
});

export default function VacationPlans() {
    const today = useMemo(() => stripTime(new Date()), []);
    const todayKey = useMemo(() => formatDateKey(today), [today]);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const [loading, setLoading] = useState(true);
    const [allSoldiers, setAllSoldiers] = useState([]);
    const [selectedSoldierId, setSelectedSoldierId] = useState(vp_selected_soldier_id || '');
    const [annualYear, setAnnualYear] = useState(currentYear);
    const [scheduleTypeMap, setScheduleTypeMap] = useState({});
    const [battalionScheduleData, setBattalionScheduleData] = useState({ holidays: {}, weeklySchedules: {} });
    const [vacationDayCountBySoldier, setVacationDayCountBySoldier] = useState({});
    const [leaveDateMap, setLeaveDateMap] = useState(createEmptyLeaveDateMap);
    const [titlesByLabel, setTitlesByLabel] = useState({});
    const [statsForm, setStatsForm] = useState({ totalAllowance: '', confirmedDays: '', upcomingAllowance: '' });
    const [titleInputs, setTitleInputs] = useState({});
    const [selectionKeys, setSelectionKeys] = useState([]);
    const [dragState, setDragState] = useState({ isDragging: false, startKey: null, x: 0, y: 0 });
    const [actionMenu, setActionMenu] = useState(null);
    const [leaveFilter, setLeaveFilter] = useState('all');
    const undoStackRef = useRef([]);
    const redoStackRef = useRef([]);
    const currentSnapshotRef = useRef(buildSnapshot(createEmptyLeaveDateMap(), {}));
    const dragMovedRef = useRef(false);
    const suppressNextClickRef = useRef(false);
    const summaryListRef = useRef(null);
    const summaryGroupNodeMapRef = useRef(new Map());
    const activeHoverGroupIdRef = useRef('');

    const clearSelection = () => setSelectionKeys([]);
    const closeActionMenu = () => {
        setActionMenu(null);
        clearSelection();
    };

    const visibleSoldiers = useMemo(() => sortSoldiers(filterValidSoldiers(allSoldiers, currentYear, currentMonth)), [allSoldiers, currentYear, currentMonth]);
    const selectedSoldier = useMemo(() => visibleSoldiers.find((soldier) => soldier.id === selectedSoldierId) || visibleSoldiers[0] || null, [visibleSoldiers, selectedSoldierId]);
    const selectedSoldierExitDate = useMemo(() => parseDateArray(selectedSoldier?.exitDate), [selectedSoldier]);
    const selectedSoldierExitKey = useMemo(() => (selectedSoldierExitDate ? formatDateKey(selectedSoldierExitDate) : ''), [selectedSoldierExitDate]);
    const selectedSoldierExitYear = selectedSoldierExitDate?.getFullYear() || null;
    const selectedSoldierExitMonth = selectedSoldierExitDate?.getMonth() + 1 || null;

    useEffect(() => {
        if (!visibleSoldiers.length) {
            setVacationDayCountBySoldier({});
            return undefined;
        }

        let cancelled = false;
        (async () => {
            const entries = await Promise.all(visibleSoldiers.map(async (soldier) => {
                const vacationDateKeys = await soldierVacationController.getVacationDateKeys(soldier.id);
                return [soldier.id, vacationDateKeys.length];
            }));
            if (cancelled) return;
            setVacationDayCountBySoldier(Object.fromEntries(entries));
        })();

        return () => {
            cancelled = true;
        };
    }, [visibleSoldiers]);

    useEffect(() => {
        if (!selectedSoldier?.id) return;
        setVacationDayCountBySoldier((prev) => ({
            ...prev,
            [selectedSoldier.id]: leaveDateMap.휴?.length || 0,
        }));
    }, [leaveDateMap.휴]);

    useEffect(() => {
        currentSnapshotRef.current = buildSnapshot(leaveDateMap, titlesByLabel);
    }, [leaveDateMap, titlesByLabel]);

    useEffect(() => {
        undoStackRef.current = [];
        redoStackRef.current = [];
        currentSnapshotRef.current = buildSnapshot(createEmptyLeaveDateMap(), {});
        setTitleInputs({});
    }, [selectedSoldier?.id]);

    const pushUndoSnapshot = () => {
        undoStackRef.current.push(buildSnapshot(currentSnapshotRef.current.leaveDateMap, currentSnapshotRef.current.titlesByLabel));
        redoStackRef.current = [];
    };

    const applySnapshotToState = (snapshot) => {
        setLeaveDateMap(snapshot.leaveDateMap);
        setTitlesByLabel(snapshot.titlesByLabel);
        setTitleInputs(buildTitleInputsFromSnapshot(snapshot));
        currentSnapshotRef.current = buildSnapshot(snapshot.leaveDateMap, snapshot.titlesByLabel);
    };

    const persistSnapshot = async (snapshot) => {
        if (!selectedSoldier?.id) return;

        const currentSnapshot = currentSnapshotRef.current;
        const allDateKeys = [...new Set([
            ...LEAVE_LABELS.flatMap((label) => currentSnapshot.leaveDateMap?.[label] || []),
            ...LEAVE_LABELS.flatMap((label) => snapshot.leaveDateMap?.[label] || []),
        ])].sort();

        if (allDateKeys.length > 0) {
            await soldierVacationController.setLeaveTypeDates({
                soldierId: selectedSoldier.id,
                dateKeys: allDateKeys,
                label: null,
            });
        }

        for (const label of LEAVE_LABELS) {
            const nextDateKeys = snapshot.leaveDateMap?.[label] || [];
            if (nextDateKeys.length > 0) {
                await soldierVacationController.setLeaveTypeDates({
                    soldierId: selectedSoldier.id,
                    dateKeys: nextDateKeys,
                    label,
                });
            }

            const titleMap = snapshot.titlesByLabel?.[label] || {};
            for (const [dateKey, title] of Object.entries(titleMap)) {
                await soldierVacationController.setTitle({
                    soldierId: selectedSoldier.id,
                    label,
                    dateKey,
                    title,
                });
            }
        }
    };

    const undoLeaveChange = async () => {
        if (!selectedSoldier?.id || undoStackRef.current.length === 0) return;
        const previousSnapshot = undoStackRef.current.pop();
        redoStackRef.current.push(buildSnapshot(currentSnapshotRef.current.leaveDateMap, currentSnapshotRef.current.titlesByLabel));
        await persistSnapshot(previousSnapshot);
        applySnapshotToState(previousSnapshot);
        closeActionMenu();
    };

    const redoLeaveChange = async () => {
        if (!selectedSoldier?.id || redoStackRef.current.length === 0) return;
        const nextSnapshot = redoStackRef.current.pop();
        undoStackRef.current.push(buildSnapshot(currentSnapshotRef.current.leaveDateMap, currentSnapshotRef.current.titlesByLabel));
        await persistSnapshot(nextSnapshot);
        applySnapshotToState(nextSnapshot);
        closeActionMenu();
    };

    useEffect(() => {
        const handleKeyDown = (event) => {
            const target = event.target;
            const isEditableTarget = target instanceof HTMLElement && (
                target.tagName === 'INPUT'
                || target.tagName === 'TEXTAREA'
                || target.tagName === 'SELECT'
                || target.isContentEditable
            );

            if (isEditableTarget || !(event.ctrlKey || event.metaKey) || event.altKey) return;

            if (event.key.toLowerCase() === 'z' && event.shiftKey) {
                event.preventDefault();
                redoLeaveChange();
                return;
            }

            if (event.key.toLowerCase() === 'z') {
                event.preventDefault();
                undoLeaveChange();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedSoldier?.id]);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            setLoading(true);
            const [soldiers, scheduleTypes, battalionSchedules] = await Promise.all([
                soldiersController.get(),
                scheduleTypesController.get(),
                battalionSchedulesController.getAll(),
            ]);

            if (cancelled) return;

            const filtered = sortSoldiers(filterValidSoldiers(soldiers || [], currentYear, currentMonth));
            setAllSoldiers(soldiers || []);
            setScheduleTypeMap(Object.fromEntries((scheduleTypes || []).map((item) => [item.label, item])));
            setBattalionScheduleData({
                holidays: battalionSchedules?.holidays || {},
                weeklySchedules: battalionSchedules?.weeklySchedules || {},
            });
            setSelectedSoldierId((prev) => prev || filtered[0]?.id || '');
            setLoading(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [currentMonth, currentYear]);

    useEffect(() => {
        if (!selectedSoldier?.id) {
            setLeaveDateMap(createEmptyLeaveDateMap());
            setTitlesByLabel({});
            setStatsForm({ totalAllowance: '', confirmedDays: '', upcomingAllowance: '' });
            setTitleInputs({});
            return;
        }

        let cancelled = false;
        (async () => {
            const [meta, leaveMap] = await Promise.all([
                soldierVacationController.getMeta(selectedSoldier.id),
                soldierVacationController.getLeaveDateMap(selectedSoldier.id, LEAVE_LABELS),
            ]);
            if (cancelled) return;
            const stats = meta?.stats || {};
            setLeaveDateMap(Object.fromEntries(LEAVE_LABELS.map((label) => [label, leaveMap?.[label] || []])));
            setTitlesByLabel(meta?.titlesByLabel || {});
            setStatsForm({
                totalAllowance: stats.totalAllowance ?? '',
                confirmedDays: stats.confirmedDays ?? '',
                upcomingAllowance: stats.upcomingAllowance ?? '',
            });
            setSelectionKeys([]);
            setActionMenu(null);
            setAnnualYear(currentYear);
        })();

        return () => {
            cancelled = true;
        };
    }, [selectedSoldier?.id]);

    useEffect(() => {
        const handleMouseUp = () => {
            setDragState((prev) => {
                if (!prev.isDragging) return prev;
                setSelectionKeys((current) => {
                    const nextSelection = current.length > 0
                        ? current
                        : (prev.startKey ? [prev.startKey] : []);
                    if (nextSelection.length > 0 && dragMovedRef.current) {
                        suppressNextClickRef.current = true;
                        setActionMenu({
                            x: Math.min(prev.x + 8, window.innerWidth - 188),
                            y: Math.min(prev.y + 8, window.innerHeight - 192),
                            dateKeys: nextSelection,
                        });
                    }
                    return nextSelection;
                });
                dragMovedRef.current = false;
                return { isDragging: false, startKey: null, x: 0, y: 0 };
            });
        };

        const handleMouseDown = (event) => {
            if (event.target.closest('.vp-action-menu') || event.target.closest('.vp-day-button')) {
                return;
            }
            if (!event.target.closest('.vp-action-menu')) {
                closeActionMenu();
            }
        };

        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('mousedown', handleMouseDown);
        return () => {
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('mousedown', handleMouseDown);
        };
    }, []);

    useEffect(() => {
        if (!actionMenu) return undefined;
        const handleEscape = (event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            closeActionMenu();
        };
        document.addEventListener('keydown', handleEscape, true);
        return () => document.removeEventListener('keydown', handleEscape, true);
    }, [actionMenu]);

    const leaveEntries = useMemo(() => buildLeaveEntries(leaveDateMap, titlesByLabel), [leaveDateMap, titlesByLabel]);
    const groupedLeaves = useMemo(() => buildGroupedLeaves(leaveEntries), [leaveEntries]);
    const groupIdByDateKey = useMemo(() => buildDateToGroupIdMap(groupedLeaves), [groupedLeaves]);
    const filteredGroupedLeaves = useMemo(() => (
        leaveFilter === 'all'
            ? groupedLeaves
            : groupedLeaves.filter((group) => group.label === leaveFilter)
    ), [groupedLeaves, leaveFilter]);
    const leaveEntryByDate = useMemo(() => Object.fromEntries(leaveEntries.map((entry) => [entry.dateKey, entry])), [leaveEntries]);

    const clearHoveredSummaryGroup = () => {
        const activeGroupId = activeHoverGroupIdRef.current;
        if (!activeGroupId) return;
        const activeNode = summaryGroupNodeMapRef.current.get(activeGroupId);
        activeNode?.classList.remove('hover-linked');
        activeHoverGroupIdRef.current = '';
    };

    const activateHoveredSummaryGroup = (groupId) => {
        if (!groupId) {
            clearHoveredSummaryGroup();
            return;
        }

        if (activeHoverGroupIdRef.current === groupId) return;

        clearHoveredSummaryGroup();

        const summaryListNode = summaryListRef.current;
        const targetNode = summaryGroupNodeMapRef.current.get(groupId);
        if (!summaryListNode || !targetNode) return;

        targetNode.classList.add('hover-linked');
        activeHoverGroupIdRef.current = groupId;

        const listRect = summaryListNode.getBoundingClientRect();
        const itemRect = targetNode.getBoundingClientRect();
        if (itemRect.top < listRect.top || itemRect.bottom > listRect.bottom) {
            targetNode.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    };

    useEffect(() => {
        setTitleInputs((prev) => {
            const next = {};
            groupedLeaves.forEach((group) => {
                next[group.id] = prev[group.id] ?? group.title;
            });
            return next;
        });
    }, [groupedLeaves]);

    useEffect(() => {
        clearHoveredSummaryGroup();
    }, [selectedSoldier?.id, leaveFilter, groupedLeaves]);

    const displayTitles = useMemo(() => Object.fromEntries(groupedLeaves.map((group) => [group.id, normalizeTitle(titleInputs[group.id] ?? group.title, group.label)])), [groupedLeaves, titleInputs]);

    const yearlyMonthCards = useMemo(() => Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const monthStart = new Date(annualYear, month - 1, 1);
        const monthEnd = new Date(annualYear, month, 0);
        const groups = groupedLeaves.filter((group) => {
            const startDate = parseDateKey(group.startKey);
            const endDate = parseDateKey(group.endKey);
            return endDate >= monthStart && startDate <= monthEnd;
        });
        const vacationDayCount = groups
            .filter((group) => group.label === '휴')
            .reduce((sum, group) => sum + countGroupDaysInRange(group, monthStart, monthEnd), 0);
        const matrix = buildMonthMatrix(annualYear, month);
        return {
            month,
            groups,
            vacationDayCount,
            matrix,
            weekSummaries: buildMonthWeekSummaries(matrix, battalionScheduleData.weeklySchedules || {}),
            holidayMap: battalionScheduleData.holidays || {},
            barMap: buildMonthLeaveBars(matrix, groups, displayTitles, scheduleTypeMap),
        };
    }), [annualYear, battalionScheduleData.holidays, battalionScheduleData.weeklySchedules, displayTitles, groupedLeaves, scheduleTypeMap]);

    const enteredVacationDays = leaveDateMap.휴?.length || 0;

    const persistStats = async (nextForm) => {
        if (!selectedSoldier?.id) return;
        await soldierVacationController.setStats(selectedSoldier.id, {
            totalAllowance: toNullableNumber(nextForm.totalAllowance),
            confirmedDays: toNullableNumber(nextForm.confirmedDays),
            upcomingAllowance: toNullableNumber(nextForm.upcomingAllowance),
        });
    };

    const handleCellMouseDown = (dateKey, event) => {
        if (event.button !== 0 || !selectedSoldier?.id) return;
        if (selectedSoldierExitKey && dateKey > selectedSoldierExitKey) {
            closeActionMenu();
            setDragState({ isDragging: false, startKey: null, x: 0, y: 0 });
            return;
        }
        event.preventDefault();
        dragMovedRef.current = false;
        suppressNextClickRef.current = false;
        setActionMenu(null);
        setSelectionKeys([dateKey]);
        setDragState({ isDragging: true, startKey: dateKey, x: event.clientX, y: event.clientY });
    };

    const handleCellMouseEnter = (dateKey, event) => {
        handleCellHoverStart(dateKey);
        setDragState((prev) => {
            if (!prev.isDragging) return prev;
            if (dateKey !== prev.startKey) {
                dragMovedRef.current = true;
            }
            setSelectionKeys(filterSelectableDateKeys(getDateRangeKeys(prev.startKey, dateKey), selectedSoldierExitKey));
            return { ...prev, x: event.clientX, y: event.clientY };
        });
    };

    const handleCellClick = (dateKey, event) => {
        if (!selectedSoldier?.id) return;
        if (selectedSoldierExitKey && dateKey > selectedSoldierExitKey) return;
        if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
        }
        if (dragMovedRef.current) {
            dragMovedRef.current = false;
            return;
        }

        setSelectionKeys([dateKey]);
        setActionMenu({
            x: Math.min(event.clientX + 8, window.innerWidth - 188),
            y: Math.min(event.clientY + 8, window.innerHeight - 192),
            dateKeys: [dateKey],
        });
    };

    const handleCellHoverStart = (dateKey) => {
        activateHoveredSummaryGroup(groupIdByDateKey[dateKey] || '');
    };

    const handleCellHoverEnd = () => {
        clearHoveredSummaryGroup();
    };

    const setRangeType = async (label) => {
        const targetKeys = filterSelectableDateKeys(actionMenu?.dateKeys || selectionKeys, selectedSoldierExitKey);
        if (!selectedSoldier?.id || !targetKeys?.length) return;

        pushUndoSnapshot();

        await soldierVacationController.setLeaveTypeDates({ soldierId: selectedSoldier.id, dateKeys: targetKeys, label });
        if (label) {
            await soldierVacationController.setTitles({ soldierId: selectedSoldier.id, label, dateKeys: targetKeys, title: DEFAULT_TITLE_BY_LABEL[label] });
        }

        setLeaveDateMap((prev) => {
            const next = {};
            LEAVE_LABELS.forEach((leaveLabel) => {
                next[leaveLabel] = (prev[leaveLabel] || []).filter((dateKey) => !targetKeys.includes(dateKey));
            });
            if (label) next[label] = [...new Set([...(next[label] || []), ...targetKeys])].sort();
            return next;
        });

        setTitlesByLabel((prev) => {
            const next = Object.fromEntries(LEAVE_LABELS.map((leaveLabel) => [leaveLabel, { ...(prev[leaveLabel] || {}) }]));
            LEAVE_LABELS.forEach((leaveLabel) => {
                targetKeys.forEach((dateKey) => {
                    delete next[leaveLabel][dateKey];
                });
            });
            if (label) {
                targetKeys.forEach((dateKey) => {
                    next[label][dateKey] = DEFAULT_TITLE_BY_LABEL[label];
                });
            }
            return next;
        });

        closeActionMenu();
    };

    const handleGroupDelete = async (group) => {
        if (!selectedSoldier?.id) return;
        if (!await confirm('정말 삭제하시겠습니까?')) return;
        pushUndoSnapshot();
        await soldierVacationController.removeLeaveRange({ soldierId: selectedSoldier.id, label: group.label, dateKeys: group.dateKeys });
        setLeaveDateMap((prev) => ({
            ...prev,
            [group.label]: (prev[group.label] || []).filter((dateKey) => !group.dateKeys.includes(dateKey)),
        }));
        setTitlesByLabel((prev) => {
            const next = { ...prev, [group.label]: { ...(prev[group.label] || {}) } };
            group.dateKeys.forEach((dateKey) => delete next[group.label][dateKey]);
            return next;
        });
        setTitleInputs((prev) => {
            const next = { ...prev };
            delete next[group.id];
            return next;
        });
    };

    const handleGroupTitleSave = async (group) => {
        if (!selectedSoldier?.id) return;
        const nextTitle = normalizeTitle(titleInputs[group.id], group.label);
        if (nextTitle === group.title) return;
        pushUndoSnapshot();
        await soldierVacationController.setTitles({ soldierId: selectedSoldier.id, label: group.label, dateKeys: group.dateKeys, title: nextTitle });
        setTitlesByLabel((prev) => {
            const next = { ...prev, [group.label]: { ...(prev[group.label] || {}) } };
            group.dateKeys.forEach((dateKey) => {
                next[group.label][dateKey] = nextTitle;
            });
            return next;
        });
        setTitleInputs((prev) => ({ ...prev, [group.id]: nextTitle }));
    };

    if (loading) {
        return <div className="vp-empty"><style>{vacationPlansCss}</style>휴가계획 화면을 불러오는 중...</div>;
    }

    return (
        <div className="vp-shell">
            <style>{vacationPlansCss}</style>

            <div className="vp-panel">
                <div className="vp-soldier-list">
                    <div className="vp-soldier-table">
                        <div className="vp-soldier-head">#</div>
                        <div className="vp-soldier-head name">계급/이름</div>
                        <div className="vp-soldier-head count">휴</div>
                        {visibleSoldiers.map((soldier, index) => (
                            [
                                <div key={`${soldier.id}_index`} className="vp-soldier-index"
                                    style={{

                                        opacity: selectedSoldier?.id === soldier.id ? 1 : 0.3,
                                    }}
                                >{index + 1}</div>,
                                <button
                                    type="button"
                                    key={soldier.id}
                                    className={`vp-soldier-btn ${selectedSoldier?.id === soldier.id ? 'active' : ''}`}
                                    style={{
                                        background: getUnitInfo(soldier.unit).bg,
                                        opacity: selectedSoldier?.id === soldier.id ? 1 : 0.3,

                                    }}
                                    onClick={() => {
                                        vp_selected_soldier_id = soldier.id;
                                        setSelectedSoldierId(soldier.id);
                                    }}
                                >
                                    {`${soldier.rank} ${soldier.name}`}
                                </button>,
                                (vacationDayCountBySoldier[soldier.id] || 0) > 0 ? (
                                    <div key={`${soldier.id}_count`} className="vp-soldier-count pointer" style={{
                                        opacity: selectedSoldier?.id === soldier.id ? 1 : 0.3,
                                    }}
                                        onClick={() => {
                                            vp_selected_soldier_id = soldier.id;
                                            setSelectedSoldierId(soldier.id);
                                        }}>
                                        <span className="vp-soldier-count-badge">{vacationDayCountBySoldier[soldier.id] || 0}</span>
                                    </div>
                                ) : <div key={`${soldier.id}_count`} className="vp-soldier-count pointer" style={{
                                    opacity: selectedSoldier?.id === soldier.id ? 1 : 0.3,
                                }}
                                    onClick={() => {
                                        vp_selected_soldier_id = soldier.id;
                                        setSelectedSoldierId(soldier.id);
                                    }}>

                                </div>,
                            ]
                        ))}
                    </div>
                </div>
            </div>

            <div className="vp-main">

                {!selectedSoldier ? (
                    <div className="vp-panel vp-empty">표시 가능한 용사가 없습니다.</div>
                ) : (
                    <div className="vp-annual-scroll">
                        <div
                            style={{
                                fontSize: 12,
                                padding: 12,
                                color: '#444',
                                paddingBottom: 0,
                            }}
                        >이 화면은 본인의 군 생활을 설계해 볼 수 있는 시뮬레이션 화면입니다. 실제 일정에는 반영되지 않으므로, 설계용으로 자유롭게 사용하시면 됩니다.</div>
                        <div className="vp-annual-grid">
                            {yearlyMonthCards.map(({ month, groups, vacationDayCount, matrix, weekSummaries, barMap, holidayMap }) => (
                                <div
                                    className={[
                                        'vp-month-card',
                                        selectedSoldierExitDate && annualYear > selectedSoldierExitYear ? 'after-discharge-month' : '',
                                        selectedSoldierExitDate && annualYear === selectedSoldierExitYear && month > selectedSoldierExitMonth ? 'after-discharge-month' : '',
                                    ].filter(Boolean).join(' ')}
                                    key={month}
                                >
                                    <div className="vp-month-card-top">
                                        <div className="vp-month-card-title">{month == 1 ? annualYear + '년 ' + month + '월 / ' + `${selectedSoldier?.rank} ${selectedSoldier?.name}` : month + '월'}</div>
                                        <div className="vp-month-card-count">휴가 {vacationDayCount}일</div>
                                    </div>

                                    <table className="vp-month-calendar">
                                        <thead>
                                            <tr>
                                                <th className="vp-week-summary-head">주차</th>
                                                {DAY_NAMES.map((dayName, index) => (
                                                    <th key={`${month}_${dayName}`} className={`${index === 0 ? 'sun' : ''} ${index === 6 ? 'sat' : ''}`.trim()}>{dayName}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matrix.map((week, weekIndex) => {
                                                const weekSummary = weekSummaries[weekIndex] || { weekNum: '', rangeText: '', text: '' };
                                                return (
                                                    <tr key={`${month}_week_${weekIndex}`}>
                                                        <td className="vp-week-summary-cell">
                                                            {weekSummary.weekNum ? <div className="vp-week-summary-badge">{weekSummary.weekNum}주차</div> : null}
                                                            {weekSummary.text ? (
                                                                <div className="vp-week-summary-text">{weekSummary.text}</div>
                                                            ) : (
                                                                <div className="vp-week-summary-empty">일정 없음</div>
                                                            )}
                                                        </td>
                                                        {week.map((cell, cellIndex) => {
                                                            if (!cell) {
                                                                return <td key={`${month}_empty_${weekIndex}_${cellIndex}`} className="vp-day-cell empty" />;
                                                            }

                                                            const entry = leaveEntryByDate[cell.dateKey];
                                                            const bar = barMap[cell.dateKey];
                                                            const dayOfWeek = cell.date.getDay();
                                                            const isToday = cell.dateKey === todayKey;
                                                            const isSelected = selectionKeys.includes(cell.dateKey);
                                                            const isDischargeDate = !!selectedSoldierExitKey && cell.dateKey === selectedSoldierExitKey;
                                                            const isAfterDischarge = !!selectedSoldierExitDate && stripTime(cell.date) > selectedSoldierExitDate;
                                                            const isHoliday = !!holidayMap?.[cell.dateKey];
                                                            const titleParts = [];

                                                            if (entry) {
                                                                titleParts.push(`${getLabelMeta(entry.label, scheduleTypeMap).text}: ${entry.title}`);
                                                            }
                                                            if (weekSummary.text) {
                                                                titleParts.push(`주간일정: ${weekSummary.text}`);
                                                            }
                                                            if (isHoliday) {
                                                                titleParts.push('공휴일');
                                                            }
                                                            if (isDischargeDate) {
                                                                titleParts.push('전역일');
                                                            }

                                                            return (
                                                                <td
                                                                    key={cell.dateKey}
                                                                    className={[
                                                                        'vp-day-cell',
                                                                        isDischargeDate ? 'discharge' : '',
                                                                        isAfterDischarge ? 'after-discharge' : '',
                                                                    ].filter(Boolean).join(' ')}
                                                                >
                                                                    <button
                                                                        type="button"
                                                                        className={[
                                                                            'vp-day-button',
                                                                            dayOfWeek === 0 ? 'sun' : '',
                                                                            dayOfWeek === 6 ? 'sat' : '',
                                                                            isHoliday ? 'holiday-marked' : '',
                                                                            isToday ? 'today' : '',
                                                                            isSelected ? 'selected' : '',
                                                                            isDischargeDate ? 'discharge' : '',
                                                                        ].filter(Boolean).join(' ')}
                                                                        disabled={isAfterDischarge}
                                                                        onMouseDown={(event) => handleCellMouseDown(cell.dateKey, event)}
                                                                        onMouseEnter={(event) => handleCellMouseEnter(cell.dateKey, event)}
                                                                        onMouseLeave={handleCellHoverEnd}
                                                                        onClick={(event) => handleCellClick(cell.dateKey, event)}
                                                                        title={titleParts.length ? titleParts.join(' / ') : undefined}
                                                                    >
                                                                        {bar && <span className="vp-day-leave-fill" style={{ background: bar.bg }} />}
                                                                        <span className="vp-day-number">{cell.day}</span>
                                                                        {/* {isHoliday && <span className="vp-holiday-badge">휴일</span>} */}
                                                                        {isDischargeDate && <span className="vp-discharge-label">전역</span>}
                                                                        {bar?.renderBar && (
                                                                            <span
                                                                                className={[
                                                                                    'vp-day-leave-bar',
                                                                                    bar.isSingleDaySpan ? 'single-day' : 'multi-day',
                                                                                    bar.isRangeStart ? 'range-start' : '',
                                                                                    bar.isRangeEnd ? 'range-end' : '',
                                                                                    bar.continuesFromPrev ? 'no-left-edge' : '',
                                                                                    bar.continuesToNext ? 'no-right-edge' : '',
                                                                                ].filter(Boolean).join(' ')}
                                                                                style={{
                                                                                    background: bar.bg,
                                                                                    color: bar.color,
                                                                                    width: bar.spanDays > 1 ? `calc(${bar.spanDays * 100}% + ${bar.spanDays + 1}px)` : 'calc(100% - 6px)',
                                                                                }}
                                                                            >
                                                                                {bar.displayLabel}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="vp-panel vp-summary">

                <div className='f row ajCenter vp-panel-header'>
                    <button onClick={() => setAnnualYear((prev) => prev - 1)}>◀</button>
                    <div className="vp-month-label">{annualYear}년</div>
                    <button onClick={() => setAnnualYear((prev) => prev + 1)}>▶</button>
                </div>

                <div className="vp-panel-header">{selectedSoldier?.rank} {selectedSoldier?.name} / 휴가 현황</div>
                <div className="vp-summary-table">
                    <div className="vp-summary-cell label">총 휴가 수</div>
                    <div className="vp-summary-cell value input">
                        <input
                            type="number"
                            min="0"
                            value={statsForm.totalAllowance}
                            onInput={(event) => setStatsForm((prev) => ({ ...prev, totalAllowance: event.target.value }))}
                            onBlur={() => persistStats(statsForm)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') event.currentTarget.blur();
                            }}
                        />
                    </div>
                    <div className="vp-summary-cell label">입력된 휴가</div>
                    <div className="vp-summary-cell value">{enteredVacationDays}</div>
                </div>

                <div className="vp-summary-tabs">
                    {LEAVE_FILTER_TABS.map((tab) => (
                        <button
                            type="button"
                            key={tab.key}
                            className={`vp-summary-tab ${leaveFilter === tab.key ? 'active' : ''}`}
                            onClick={() => setLeaveFilter(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
                <div className="vp-summary-list" ref={summaryListRef}>
                    {filteredGroupedLeaves.length === 0 ? (
                        <div className="vp-month-empty">표시할 출타 항목이 없습니다.</div>
                    ) : filteredGroupedLeaves.map((group) => {
                        const meta = getLabelMeta(group.label, scheduleTypeMap);
                        return (
                            <div
                                key={group.id}
                                className="vp-summary-group"
                                data-group-id={group.id}
                                ref={(node) => {
                                    if (node) {
                                        summaryGroupNodeMapRef.current.set(group.id, node);
                                    } else {
                                        summaryGroupNodeMapRef.current.delete(group.id);
                                    }
                                }}
                            >
                                <div className="vp-summary-item">
                                    <div className="vp-summary-title-wrap">
                                        <span className="vp-summary-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                                    </div>
                                    <div className="vp-summary-range">{formatRangeLabel(group.startKey, group.endKey)}</div>
                                    <button className="vp-summary-delete" onClick={() => handleGroupDelete(group)}>삭제</button>
                                </div>
                                <div className="vp-summary-edit-row">
                                    <div className="vp-summary-edit-spacer" />
                                    <div className="vp-summary-edit-field">
                                        <input
                                            value={titleInputs[group.id] ?? group.title}
                                            onInput={(event) => setTitleInputs((prev) => ({ ...prev, [group.id]: event.target.value }))}
                                            onBlur={() => handleGroupTitleSave(group)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') event.currentTarget.blur();
                                            }}
                                            placeholder={meta.text}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                            }}
                                        />
                                    </div>
                                    <div className="vp-summary-edit-save">{group.dayCount}일</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {actionMenu && (
                <div className="vp-action-menu" style={{ left: actionMenu.x, top: actionMenu.y }} onMouseDown={(event) => event.stopPropagation()}>
                    <div className="vp-action-menu-header">
                        <strong>{actionMenu.dateKeys.length}일 선택</strong>
                        <span>{formatRangeLabel(actionMenu.dateKeys[0], actionMenu.dateKeys[actionMenu.dateKeys.length - 1])}</span>
                    </div>
                    <div className="vp-action-grid">
                        {LEAVE_LABELS.map((label) => {
                            const meta = getLabelMeta(label, scheduleTypeMap);
                            return <button key={label} onClick={() => setRangeType(label)} style={{ background: meta.bg, color: meta.color }}>{meta.label}</button>;
                        })}
                    </div>
                    <button className="vp-action-clear" onClick={() => setRangeType(null)}>출타 해제</button>
                </div>
            )}
        </div>
    );
}