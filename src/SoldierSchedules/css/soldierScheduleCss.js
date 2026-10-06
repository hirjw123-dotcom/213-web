

export const soldierScheduleCss = `
                .soldier-schedules {
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    overflow: hidden;
                    background: #f5f5f5;
                    user-select: none;
                    font-size: 13px;
                }
                .ss-header {
                    display: flex;
                    align-items: center;
                    padding: 10px 14px;
                    background: #fff;
                    border-bottom: 1px solid #999;
                    flex-shrink: 0;
                    position: relative;
                }
                .ss-header-left {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                    flex-shrink: 0;
                }
                .ss-header-center {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                }
                .ss-header-right {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    flex-shrink: 0;
                }
                .ss-header .nav-btn {
                    padding: 6px 12px;
                    font-size: 13px;
                    background: #f0f0f0;
                    border: 1px solid #999;
                    cursor: pointer;
                }
                .ss-header .nav-btn:hover { background: #e0e0e0; }
                .ss-header .month-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #333;
                    min-width: 130px;
                    text-align: center;
                }
                .ss-header .undo-btn {
                    padding: 5px 10px;
                    font-size: 14px;
                    background: #f5f5f5;
                    border: 1px solid #bbb;
                    cursor: pointer;
                    color: #333;
                    min-width: 32px;
                    text-align: center;
                }
                .ss-header .undo-btn:hover:not(:disabled) { background: #e0e0e0; }
                .ss-header .undo-btn:disabled {
                    opacity: 0.35;
                    cursor: not-allowed;
                }
                .ss-header .excel-btn {
                    padding: 6px 14px;
                    font-size: 13px;
                    background: #4caf50;
                    color: #fff;
                    border: 1px solid #388e3c;
                    cursor: pointer;
                    font-weight: 600;
                }
                .ss-header .excel-btn:hover { background: #43a047; }
                .category-filter-btn {
                    padding: 5px 10px;
                    font-size: 12px;
                    background: #f5f5f5;
                    border: 1px solid #bbb;
                    cursor: pointer;
                    color: #333;
                    margin-left: 8px;
                    white-space: nowrap;
                }
                .category-filter-btn:hover { background: #e0e0e0; }
                .category-filter-btn.active { background: #1976d2; color: #fff; border-color: #1565c0; }
                .category-filter-popup {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    margin-top: 4px;
                    background: #fff;
                    border: 1px solid #999;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    min-width: 160px;
                    padding: 6px 0;
                    z-index: 2000;
                }
                .category-filter-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 5px 12px;
                    cursor: pointer;
                    font-size: 13px;
                }
                .category-filter-item:hover { background: #f0f0f0; }
                .category-filter-item input { margin: 0; }
                .category-filter-item .cat-dot {
                    width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;
                }
                .category-filter-divider { height: 1px; background: #ddd; margin: 4px 0; }
            `;

export const scheduleTableCss = `
    .ss-body { flex: 1; display: flex; overflow: hidden; }
    .ss-table-wrap { flex: 1; overflow: auto; background: #fff; --ss-day-cell-width: 30px; }
    .ss-table { border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: 14px; }
    .ss-table th, .ss-table td { border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 0; background-clip: padding-box; }
    .ss-table thead { position: sticky; top: 0; z-index: 100; }
    .ss-table thead tr:first-child th { border-top: 1px solid #000; }

    .ss-table thead th { background: #e0e0e0; font-weight: 600; height: 20px; font-size: 14px; cursor: pointer; }
    

    .ss-table thead th.col-num { width: 35px !important; min-width: 35px !important; position: sticky; left: 0; z-index: 110; background: #ccc; cursor: default; }
    .ss-table thead th.col-name { width: 95px !important; min-width: 95px !important; position: sticky; left: 35px; z-index: 110; background: #ccc; cursor: default; }
    .ss-table th.col-pay-grade,
    .ss-table td.col-pay-grade { width: 42px !important; min-width: 42px !important; max-width: 42px !important; position: sticky; left: 130px; z-index: 10; padding: 0; text-align: center; background: #f2f2f2; font-size: 12px; }
    .ss-table thead th.col-pay-grade { z-index: 110; background: #d6d6d6; cursor: default; }
    .ss-table thead th.col-cat { width: 80px !important; min-width: 80px !important; background: #ddd; cursor: default; }
    .col-name { text-align:center !important; font-weight:bold !important; }

    .ss-table thead th.col-day { min-width: var(--ss-day-cell-width) !important; width: var(--ss-day-cell-width) !important; }
    .ss-table td.schedule-cell { height: 20px; min-width: var(--ss-day-cell-width); width: var(--ss-day-cell-width); cursor: pointer; position: relative; background: #fff; }

.schedule-content {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 14px;
        padding: 2px;
        line-height: 1.1;
        font-weight: bold !important;
        gap: 1px;
        overflow: hidden;
        white-space: nowrap;
        overflow:hidden;
        max-width: calc(var(--ss-day-cell-width) - 3px);
        margin:0 auto;
    }

    .ss-table tbody tr:hover td,
    .ss-table tbody tr.hover-row td,
    .ss-table td.schedule-cell.col-hover,
    .ss-table td.summary-cell.col-hover,
    .ss-table thead th.col-day.col-hover,
    .ss-table tbody td.col-cat.col-hover {
        filter: brightness(0.9);
    }
    .ss-table tbody tr.focus-dim td { filter: brightness(0.7); }
    .ss-table tbody tr.focus-active td { filter: brightness(1); }

    .ss-table thead th.col-day.day-drag-active { outline: 2px solid #1976d2; outline-offset: -2px; }
    .ss-table thead th.today { background: #fff59d; }
    .ss-table thead th.saturday { /*background: #bbdefb;*/ color: #0d47a1 !important; }
    .ss-table thead th.sunday { /*background: #ffcdd2;*/ color: #b71c1c !important; }
    .ss-table .sunday-col { border-right: #000 3px solid !important; }

    .ss-table .daily-row td { background: #f4f7f9; height: 24px; font-size: 12px; color: #455a64; }
    .ss-table .daily-row td.sticky-cell { position: sticky; background: #e3e8eb; z-index: 10; }
    .ss-table .daily-row .daily-schedule-cell { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ss-table .daily-row .daily-schedule-cell.has-items { background: #eef6ff; color: #1565c0; font-weight: 700; cursor: help; }
    .ss-table .week-row td { background: #f5f5f5; height: 28px; font-size: 12px; color: #555; }
    .ss-table .week-row td.sticky-cell { position: sticky; background: #ddd; z-index: 10; }
    .ss-table .week-row .week-content { background: #eef5fb; color: #1565c0; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .newUnit td { border-top: 2px solid #666; }

    .ss-daily-tooltip {
        position: fixed;
        z-index: 1200;
        min-width: 220px;
        max-width: 260px;
        padding: 10px 12px;
        border: 1px solid #90a4ae;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        pointer-events: none;
    }
    .ss-daily-tooltip-title {
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #1565c0;
    }
    .ss-daily-tooltip-item {
        font-size: 12px;
        line-height: 1.45;
        color: #263238;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .ss-daily-tooltip-item + .ss-daily-tooltip-item { margin-top: 4px; }

    .ss-table tbody td.sticky-cell { position: sticky; z-index: 10; }
    .ss-table tbody td.col-num { left: 0; background: #f5f5f5; font-size: 12px; color: #666; width: 35px; }
    .ss-table tbody td.col-name { left: 35px; text-align: left; padding: 0 6px; font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 95px; }
    .ss-table tbody td.col-cat {
        min-width: 100px;
        width: 100px;
        font-size: 11px;
        text-align: left;
        padding: 0 3px;
        overflow: hidden;
        cursor: pointer;
        background: #fafafa;
        height: 20px;
        max-height: 20px;
    }
    .soldier-cat-cell {
        display: flex;
        align-items: center;
        gap: 2px;
        height: 20px;
        max-height: 20px;
        overflow: hidden;
        white-space: nowrap;
    }
    .soldier-cat-chip {
        display: inline-block;
        font-size: 12px;
        line-height: 1;
        height: 14px;
        padding: 1px 3px;
        border: 1px solid #999;
        border-radius: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100px;
        box-sizing: border-box;
    }
    .ss-table thead th.col-service-info{
        min-width: 80px;
        width: 80px;
    }
    .ss-table thead th.col-service-info,
    .ss-table tbody td.col-service-info {
        background: #eef2f7;
        font-size: 12px;
        font-weight: 600;
        color: #334155;
    }
    .ss-table tbody td.col-service-info {
        background: #f8fafc;
    }
    .ss-table tbody td.col-service-rate {
        padding: 0 4px;
    }

    .ss-table td.schedule-cell.drag-target { outline: 3px dashed #4caf50 !important; outline-offset: -3px; background: rgba(76, 175, 80, 0.15) !important; }
    .ss-table td.schedule-cell.drag-source { opacity: 0.5; }
    
    .ss-table td.schedule-cell:hover { filter: brightness(0.96); }
    .ss-table td.schedule-cell.selected { outline: 2px solid #1976d2; outline-offset: -2px; z-index: 5; }
    
    .schedule-content span { display: inline-block;
    }
    .incoming-replacement-bars {
        position: absolute;
        left: 0px;
        bottom: 0px;
        display: flex;
        align-items: flex-end;
        gap: 0px;
        pointer-events: none;
    }
    .incoming-replacement-bar {
        width: 12px;
        height: 5px;
        border-radius: 999px;
        box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
    }
    .service-rate-chip {
        display: flex;
        align-items: center;
        width: 100%;
        height: 20px;
        padding: 0 1px;
        box-sizing: border-box;
    }
    .service-rate-bar-track {
        position: relative;
        width: 100%;
        height: 12px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
        box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.45);
    }
    .service-rate-bar-fill {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        border-radius: 999px;
        border: 1px solid transparent;
        box-sizing: border-box;
        min-width: 0;
    }
    .service-rate-bar-label {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: #0f172a;
        letter-spacing: -0.02em;
        pointer-events: none;
        text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
    }
    .memo-indicator { position: absolute; right: 0; bottom: 0; border-left: 9px solid transparent; border-bottom: 9px solid #ff0000; }

    /* 사이드 패널 */
    .ss-side-panel { background: #fff; border-left: 1px solid #999; display: flex; flex-direction: column; overflow: hidden; position: relative; flex-shrink: 0; }
    .ss-resize-handle { position: absolute; left: -6px; top: 0; bottom: 0; width: 12px; cursor: col-resize; z-index: 120; background: transparent; transition: background 0.15s; }
    .ss-resize-handle:hover, .ss-resize-handle:active { background: rgba(25, 118, 210, 0.25); }
    .ss-resize-handle::after { content: ''; position: absolute; left: 2px; top: 50%; transform: translateY(-50%); width: 2px; height: 32px; background: #bbb; border-radius: 2px; transition: background 0.15s, height 0.15s; }
    .ss-resize-handle:hover::after, .ss-resize-handle:active::after { background: #1976d2; height: 48px; }
    .ss-right-panel { background: #fff; border-left: 1px solid #999; display: flex; flex-direction: column; overflow: hidden; position: relative; flex-shrink: 0; }
    .ss-right-resize-handle { position: absolute; left: -6px; top: 0; bottom: 0; width: 12px; cursor: col-resize; z-index: 120; background: transparent; transition: background 0.15s; }
    .ss-right-resize-handle:hover, .ss-right-resize-handle:active { background: rgba(25, 118, 210, 0.25); }
    .ss-right-resize-handle::after { content: ''; position: absolute; left: 2px; top: 50%; transform: translateY(-50%); width: 2px; height: 32px; background: #bbb; border-radius: 2px; transition: background 0.15s, height 0.15s; }
    .ss-right-resize-handle:hover::after, .ss-right-resize-handle:active::after { background: #1976d2; height: 48px; }
    .side-panel-tabs { display: flex; border-bottom: 1px solid #999; background: #e0e0e0; flex-shrink: 0; }
    .side-tab { flex: 1; padding: 8px 4px; font-size: 12px; font-weight: 600; cursor: pointer; border: none; background: #d0d0d0; border-right: 1px solid #bbb; color: #666; }
    .side-tab:last-child { border-right: none; }
    .side-tab.active { background: #fff; color: #333; border-bottom: 2px solid #1976d2; }
    .side-tab:hover:not(.active) { background: #ddd; }
    .side-panel-header { padding: 8px 10px; background: #f5f5f5; border-bottom: 1px solid #ddd; font-weight: 600; font-size: 13px; display: flex; justify-content: space-between; align-items: center; }
    .side-panel-header button { padding: 2px 8px; font-size: 11px; cursor: pointer; }
    .side-panel-body { flex: 1; overflow-y: auto; }
    .mini-board {
        --mini-board-cell-width: 96px;
        --mini-board-row-height: 68px;
        min-height: 100%;
        background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.10), transparent 32%),
            linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
    }
    .mini-board-toolbar {
        position: sticky;
        top: 0;
        z-index: 20;
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 12px;
        border-bottom: 1px solid #cfd9e8;
        background: rgba(248, 251, 255, 0.95);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    }
    .mini-board-toolbar-main {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
    }
    .mini-board-selection-chip {
        min-width: 62px;
        padding: 7px 10px;
        border: 1px solid #93c5fd;
        border-radius: 10px;
        background: #dbeafe;
        color: #1d4ed8;
        font-size: 12px;
        font-weight: 700;
        text-align: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
    }
    .mini-board-toolbar-field {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        border: 1px solid #d6deea;
        border-radius: 10px;
        background: #fff;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
    }
    .mini-board-toolbar-field-wide { min-width: 156px; }
    .mini-board-toolbar-field-compact { min-width: 88px; }
    .mini-board-toolbar-field select,
    .mini-board-toolbar-field input {
        border: none;
        background: transparent;
        outline: none;
        color: #0f172a;
        font-size: 12px;
        width: 100%;
    }
    .mini-board-tool-button,
    .mini-board-action-button {
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #334155;
        cursor: pointer;
        transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
    }
    .mini-board-tool-button {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        font-size: 13px;
        font-weight: 800;
    }
    .mini-board-tool-button.active {
        background: #dbeafe;
        color: #1d4ed8;
        border-color: #60a5fa;
    }
    .mini-board-tool-button:disabled,
    .mini-board-action-button:disabled,
    .mini-board-toolbar-field select:disabled,
    .mini-board-toolbar-field input:disabled,
    .mini-board-toolbar-color input:disabled {
        opacity: 0.45;
        cursor: not-allowed;
    }
    .mini-board-tool-button:hover:not(:disabled),
    .mini-board-action-button:hover:not(:disabled) {
        transform: translateY(-1px);
        border-color: #60a5fa;
    }
    .mini-board-align-group {
        display: inline-flex;
        gap: 6px;
        padding: 4px;
        border: 1px solid #d6deea;
        border-radius: 12px;
        background: #fff;
    }
    .mini-board-toolbar-color {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        border: 1px solid #d6deea;
        border-radius: 10px;
        background: #fff;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
    }
    .mini-board-toolbar-color input {
        width: 26px;
        height: 26px;
        padding: 0;
        border: none;
        background: transparent;
        cursor: pointer;
    }
    .mini-board-toolbar-actions {
        display: flex;
        gap: 8px;
    }
    .mini-board-toolbar-hint {
        font-size: 11px;
        font-weight: 600;
        color: #64748b;
    }
    .mini-board-action-button {
        padding: 8px 12px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        background: linear-gradient(180deg, #ffffff 0%, #eef4ff 100%);
    }
    .mini-board-grid-wrap {
        padding: 12px;
    }
    .mini-board-grid {
        display: grid;
        grid-template-columns: 42px repeat(var(--mini-board-columns), minmax(var(--mini-board-cell-width), 1fr));
        min-width: fit-content;
        border: 1px solid #cbd5e1;
        border-radius: 16px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.78);
        box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
    }
    .mini-board-corner,
    .mini-board-column-header,
    .mini-board-row-header {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        background: #f8fafc;
    }
    .mini-board-corner,
    .mini-board-column-header {
        min-height: 34px;
        border-bottom: 1px solid #d9e2ec;
    }
    .mini-board-column-header:not(:last-child) {
        border-right: 1px solid #e2e8f0;
    }
    .mini-board-row-header {
        min-height: var(--mini-board-row-height);
        border-right: 1px solid #d9e2ec;
        border-bottom: 1px solid #e2e8f0;
        background: linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%);
    }
    .mini-board-cell {
        position: relative;
        min-height: var(--mini-board-row-height);
        padding: 6px;
        border-right: 1px solid;
        border-bottom: 1px solid;
        cursor: cell;
        transition: box-shadow 0.16s ease, transform 0.16s ease;
    }
    .mini-board-cell:hover {
        box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.35);
    }
    .mini-board-cell.selected {
        z-index: 2;
        box-shadow: inset 0 0 0 2px #2563eb, 0 0 0 1px rgba(255, 255, 255, 0.7);
    }
    .mini-board-cell.editing {
        box-shadow: inset 0 0 0 2px #0f172a;
    }
    .mini-board-cell-text {
        position: absolute;
        top: 8px;
        left: 8px;
        min-height: calc(var(--mini-board-row-height) - 16px);
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
        overflow: visible;
        pointer-events: none;
        z-index: 1;
    }
    .mini-board-editor {
        position: absolute;
        inset: 4px;
        width: calc(100% - 8px);
        height: calc(100% - 8px);
        resize: none;
        border: none;
        outline: none;
        background: rgba(255, 255, 255, 0.96);
        color: #0f172a;
        font: inherit;
        line-height: 1.45;
        padding: 6px;
        box-sizing: border-box;
    }
    @media (max-width: 900px) {
        .mini-board-toolbar-actions {
            width: 100%;
        }
        .mini-board-action-button {
            flex: 1;
        }
        .mini-board {
            --mini-board-cell-width: 84px;
            --mini-board-row-height: 60px;
        }
    }
    .type-item { display: flex; align-items: center; gap: 8px; padding: 4px 8px; border-bottom: 1px solid #ddd; font-size: 12px; }
    .type-item:hover { background: #f5f5f5; }
    .type-item.active-hotkey { background: #e3f2fd; box-shadow: inset 3px 0 0 #1565c0; }
    .type-filter-label { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .type-filter-check-input { margin: 0; flex-shrink: 0; }
    .type-item .type-box { min-width: 30px; height: 20px; border: 1px solid #666; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; padding: 0 4px; }
    .type-item .type-desc { flex: 1; color: #444; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .type-item-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
    .type-item-action-btn { height: 24px; padding: 0 8px; border: 1px solid #bbb; background: #fff; color: #333; font-size: 11px; cursor: pointer; }
    .type-item-action-btn:hover { background: #f0f0f0; }
    .type-item-action-btn.drag-handle { cursor: grab; }
    .type-item-action-btn.drag-handle:active { cursor: grabbing; }
    .type-filter-footer { padding: 8px; border-top: 1px solid #ddd; background: #fafafa; }
    .type-filter-footer button { width: 100%; padding: 6px 8px; border: 1px solid #bbb; background: #fff; cursor: pointer; }
    .type-filter-footer button:hover { background: #f0f0f0; }

    .schedule-filter-clear-fab {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        z-index: 2100;
        padding: 10px 16px;
        border: 1px solid #c62828;
        border-radius: 999px;
        background: #fff5f5;
        color: #b71c1c;
        font-size: 13px;
        font-weight: 700;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.14);
        cursor: pointer;
    }
    .schedule-filter-clear-fab:hover { background: #ffeaea; }

    .schedule-hotkey-floating-type {
        position: fixed;
        z-index: 2200;
        pointer-events: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        padding: 4px 10px;
        border-radius: 8px;
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
        white-space: nowrap;
    }
    .schedule-hotkey-floating-type-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.7);
        color: inherit;
        font-size: 11px;
        font-weight: 700;
    }

    /* 근무 목록표 */
    .duty-roster { margin-top: 16px; }
    .duty-roster thead th { background: #e0e0e0; height: 30px; font-size: 13px; }
    .duty-roster thead th.col-num { background: #ccc; }
    .duty-roster thead th.col-name { background: #ccc; }
    .duty-section-start td { border-top: 2px solid #666 !important; }

    .duty-roster th, .duty-roster td { padding:4px !important; }

    .duty-section-header {
        background: #e8e8e8 !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        color: #333;
        vertical-align: middle;
        width:55px  !important;
        min-width:55px !important;
    }
    .duty-row-label {
        width:95px !important;
        min-width:95px !important;
        background: #f0f0f0 !important;
        font-weight: 600 !important;
        font-size: 12px !important;
        color: #444;
        text-align: center !important;
        padding: 0 4px !important;
        white-space: nowrap;
    }
    .duty-cell {
        min-width: 50px;
        width: 50px;
        background: #fff;
        vertical-align: top;
        padding: 2px 1px !important;
    }
    .duty-cell .duty-name {
        font-size: 12px;
        line-height: 1.8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .ss-table .summary-row td {
        height: 24px;
        font-size: 12px;
        font-weight: 600;
    }
    .ss-table .summary-row .summary-label {
        position: sticky;
        left: 0;
        z-index: 11;
        text-align: right !important;
        padding-right: 8px;
        background: #f3f3f3;
        color: #222;
        min-width: 130px;
        white-space: nowrap;
    }
    .ss-table .summary-row .summary-cell {
        min-width: var(--ss-day-cell-width);
        width: var(--ss-day-cell-width);
    }
    .ss-table .summary-row-sticky td {
        background-clip: padding-box;
        box-shadow: inset 0 1px 0 rgba(0, 0, 0, 0.14);
    }
    .ss-table .summary-row-sticky-first td {
        border-top: 3px solid #111;
    }

    /* 날짜 타입 선택 메뉴 */
    .day-type-menu {
        position: fixed; z-index: 2000;
        background: #fff; border: 1px solid #999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        min-width: 200px; padding: 4px 0;
    }
    .day-type-menu-item {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 12px; cursor: pointer; font-size: 13px;
    }
    .day-type-menu-item:hover { background: #f0f0f0; }
    .day-type-menu-item .dt-swatch {
        width: 16px; height: 16px; border: 1px solid #999; flex-shrink: 0;
    }
    .day-type-menu-item .day-type-check {
        margin-left: auto;
        width: 14px;
        text-align: center;
        font-weight: 700;
        color: #1976d2;
    }
    .day-type-menu-divider { height: 1px; background: #ddd; margin: 4px 0; }

    .schedule-cell-context-menu {
        position: fixed;
        z-index: 2000;
        width: 236px;
        background: #fff;
        border: 1px solid #8f98ab;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
        overflow: hidden;
    }
    .schedule-cell-context-menu-header {
        padding: 8px 10px;
        background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
        border-bottom: 1px solid #d5dbe5;
        font-size: 12px;
        font-weight: 700;
        color: #1f2937;
        word-break: keep-all;
        line-height: 1.35;
        cursor: move;
    }
    .schedule-cell-context-menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        border: none;
        background: #fff;
        text-align: left;
        cursor: pointer;
        transition: background 0.16s ease;
    }
    .schedule-cell-context-menu-item:hover {
        background: #f8fafc;
    }
    .schedule-cell-context-menu-item.danger:hover {
        background: #fff;
    }
    .schedule-cell-context-menu-swatch {
        min-width: 34px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #b0b8c8;
        background: #fff;
        color: #111827;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
    }
    .schedule-cell-context-menu-swatch-edit {
        background: #e0f2fe;
        border-color: #7dd3fc;
        color: #075985;
    }
    .schedule-cell-context-menu-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .schedule-cell-context-menu-label {
        font-size: 12px;
        font-weight: 700;
        color: #1f2937;
        line-height: 1.25;
    }
    .schedule-cell-context-menu-description {
        font-size: 10px;
        color: #6b7280;
        line-height: 1.2;
    }
    .schedule-cell-context-menu-subcopy {
        font-size: 10px;
        color: #6b7280;
        line-height: 1.2;
    }
    .schedule-cell-context-menu-divider {
        height: 1px;
        background: #e5e7eb;
        margin: 1px 0;
    }
    .schedule-cell-context-menu-empty {
        padding: 10px;
        font-size: 11px;
        color: #6b7280;
        text-align: center;
    }

    /* 근무 횟수 컬럼 */
    .ss-table th.col-duty-count,
    .ss-table td.col-duty-count {
        width: 30px !important;
        min-width: 30px !important;
        font-size: 12px;
        text-align: center;
        padding: 0;
    }
    .ss-table thead th.col-duty-count {
        font-weight: 700;
        font-size: 13px;
        cursor: default;
    }
    .ss-table th.col-duty-target,
    .ss-table td.col-duty-target {
        width: 36px !important;
        min-width: 36px !important;
        max-width: 36px !important;
        text-align: center;
        padding: 0;
        background: #fff;
        position: relative;
    }
    .duty-target-input {
        position: absolute;
        top:0; left:0;
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        text-align: center;
        background: transparent;
        font-size: 13px;
        font-weight: 700;
        color: #000;
        padding: 0;
        box-sizing: border-box;
    }
    .duty-target-input[readonly] {
        cursor: default;
    }
    .ss-table th.col-duty-toggle,
    .ss-table td.col-duty-toggle {
        width: 18px !important;
        min-width: 18px !important;
        max-width: 18px !important;
        font-size: 10px;
        cursor: pointer;
        background: #e8e8e8;
        color: #666;
        padding: 0;
        border-right: none;
    }
    .ss-table thead th.col-duty-toggle:hover {
        background: #d0d0d0;
    }
    .ss-table td.col-duty-toggle {
        cursor: default;
        background: #f5f5f5;
    }
`;


export const HISTORY_STYLES = `
    .hist-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .hist-modal { background: #fff; width: 460px; max-width: 94vw; max-height: 85vh; display: flex; flex-direction: column; border-radius: 8px; box-shadow: 0 12px 40px rgba(0,0,0,0.3); overflow: hidden; }
    .hist-hdr { padding: 10px 16px; background: #37474f; color: #fff; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: space-between; cursor: grab; user-select: none; touch-action: none; }
    .hist-hdr .close-btn { background: none; border: none; color: rgba(255,255,255,0.7); font-size: 20px; cursor: pointer; padding: 0; line-height: 1; }
    .hist-hdr .close-btn:hover { color: #fff; }
    .hist-body { flex: 1; min-height: 0; display: flex; flex-direction: column; padding: 0; }

    .row-tag { flex-shrink: 0; display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 10px; font-weight: 700; color: #fff; line-height: 1.6; }
    .row-tag.add { background: #43a047; }
    .row-tag.del { background: #e53935; }

    .hist-chip { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 700; line-height: 1.6; margin: 1px 0; white-space: nowrap; }

    .hist-activity-scroll { flex: 1; overflow-y: auto; padding: 12px 14px 16px; background: #f8fafc; }
    .hist-session-group { border-top: 2px solid #a7b2bf; border-bottom: 2px solid #a7b2bf; border-radius: 10px; background: #fff; margin-bottom: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05); }
    .hist-activity-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 12px 14px; border-top: 1px solid #edf2f7; }
    .hist-session-group .hist-activity-row:first-child { border-top: none; }
    .hist-activity-main { min-width: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; color: #1f2937; }
    .hist-activity-soldier { font-weight: 700; color: #111827; }
    .hist-activity-meta { flex-shrink: 0; display: flex; align-items: center; gap: 10px; color: #6b7280; font-size: 13px; white-space: nowrap; }
    .hist-activity-timestamp { font-family: monospace; color: #4b5563; }
    .hist-activity-user { color: #000; }
    .hist-more { text-align: center; padding: 10px 0 4px; color: #7b8794; font-size: 12px; }

    @media (max-width: 720px) {
        .hist-activity-row { flex-direction: column; gap: 8px; }
        .hist-activity-meta { width: 100%; justify-content: space-between; }
    }

    .hist-empty { text-align: center; padding: 40px 16px; color: #999; font-size: 13px; }
`;
