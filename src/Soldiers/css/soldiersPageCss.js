export const soldiersPageCss = `
    .soldiers-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: var(--bg);
    }

    .soldiers-toolbar {
        padding: 8px;
        background: var(--c8);
        display: flex;
        gap: 8px;
        align-items: center;
        flex-shrink: 0;
    }
    .soldiers-toolbar .spacer { flex: 1; }
    .soldiers-toolbar .total-count {
        font-size: 13px;
        font-weight: 500;
        color: var(--c3);
    }

    .soldiers-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .soldiers-main {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border-right: 1px solid var(--c5);
        zoom:0.9;
    }

    .soldiers-scroll {
        flex: 1;
        overflow: auto;
        position: relative;
    }

    .sol-table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 13px;
        min-width: 100%;
        border: none;
    }

    .sol-table thead {
        position: sticky;
        top: 0;
        z-index: 300;
    }

    .sol-table th {
        background: var(--c8);
        color: var(--c2);
        font-weight: 700;
        padding: 6px 4px;
        text-align: center;
        white-space: nowrap;
        font-size: 12px;
    }

    .sol-table td {
        padding: 0px 4px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--c2);
    }

    .sol-table th.sticky,
    .sol-table td.sticky {
        position: sticky;
        z-index: 10;
    }

    .sol-table thead th {
        padding: 8px 4px;
        text-align: center;
        font-weight: 700;
        border-top: 1px solid var(--c5);
        border-bottom: 1px solid var(--c5);
        color: var(--c3);
        font-size: 12px;
    }

    .sol-table thead th.sticky {
        z-index: 35;
    }

    .sol-table .c-num { left: 0; width: 30px; min-width: 30px; }
    .sol-table .c-rank { left: 30px; width: 50px; min-width: 50px; }
    .sol-table .c-name { left: 80px; width: 80px; min-width: 80px; font-weight: 700; text-align: left; }

    .sol-table td.sticky {
        background: inherit;
    }
    .sol-table td.sticky.c-name {
        border-right: 2px solid var(--c1);
    }
    .sol-table th.c-name {
        border-right: 2px solid var(--c1);
    }

    .sol-table th.c-num,
    .sol-table th.c-rank {
        background: var(--c8);
    }
    .sol-table th.c-name {
        background: var(--c8);
    }

    .sol-table .c-date { width: 80px; min-width: 80px; }

    .sol-table .c-days.chdqhran { border-left: 2px solid var(--c5); }
    .sol-table .c-days.skadmsdlf { border-right: 2px solid var(--c1); font-weight: 700; }

    .sol-table .c-days { width: 50px; min-width: 50px; }
    .sol-table .c-prog { width: 100px; min-width: 100px; padding: 2px 4px; }
    .sol-table .c-cat { min-width: 100px; text-align: left; padding-left: 8px !important; }
    .sol-table .c-join { width: 80px; min-width: 80px; border-left: 2px solid var(--c5); }
    .sol-table .c-join-days { width: 60px; min-width: 60px; border-right: 2px solid var(--c1); }

    .sol-table .unit-row td {
        background: var(--c8);
        color: var(--c2);
        font-weight: 700;
        font-size: 13px;
        padding: 6px 12px;
        text-align: left;
        border-bottom: 1px solid var(--c5);
    }
    .sol-table .unit-row .unit-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .sol-table .unit-row .unit-avg {
        font-size: 12px;
        color: var(--c3);
        font-weight: 500;
    }
    .sol-table .unit-row .unit-cnt {
        font-size: 12px;
        color: var(--c4);
    }
    .sol-table .unit-row .btn-add-soldier {
        padding: 2px 8px;
        font-size: 11px;
        background: var(--c9);
        border: 1px solid var(--c4);
        color: var(--c2);
        cursor: pointer;
        box-shadow: none;
    }
    .sol-table .unit-row .btn-add-soldier:hover {
        background: var(--c6);
        transform: none;
    }

    .sol-table .soldier-row {
        cursor: pointer;
    }
    .sol-table .soldier-row td {
        background: var(--unit-bg, var(--c9));
    }
    .sol-table .soldier-row:hover td,
    .sol-table .soldier-row:hover td.sticky {
        filter: brightness(.9);
    }
    .sol-table .soldier-row td.sticky {
        background: var(--unit-bg, var(--c9));
    }

    .sol-table .empty-row td {
        padding: 16px;
        text-align: center;
        color: #aaa;
        font-weight: 700;
        font-size: 14px;
        background: var(--unit-bg, var(--c9));
        height:100px;
        box-shadow:
            inset 0 -1px 0 var(--c6),
            inset 1px 0 0 var(--c6);
    }

    .prog-bar {
        margin: 0 2px;
        position: relative;
        height: 16px;
        background: var(--c7);
        border: 1px solid var(--c5);
    }
    .prog-fill {
        height: 100%;
        box-shadow: none;
    }
    .prog-txt {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 10px;
        font-weight: 600;
        color: #000;
        text-shadow: 1px 1px 0 #fff;
    }

    .cat-badges { display: flex; flex-wrap: wrap; gap: 2px; }
    .cat-badge {
        display: inline-block;
        padding: 1px 4px;
        font-size: 11px;
        border: 1px solid var(--c5);
    }

    .cat-panel {
        width: 220px;
        min-width: 180px;
        background: var(--c9);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .cat-panel-hd {
        padding: 12px 14px;
        background: var(--c1);
        color: var(--accent);
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 3px solid var(--accent);
    }
    .cat-panel-body { flex: 1; overflow-y: auto; }
    .cat-item-wrap { border-bottom: 1px solid var(--c6); }
    .cat-item {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 8px;
        cursor: pointer;
        font-size: 11px;
    }
    .cat-item:hover { background: var(--c8); }
    .cat-item.active { background: var(--highlight); border-left: 3px solid var(--accent); padding-left: 9px; }
    .cat-item input[type="checkbox"] { margin: 0; width: 14px; height: 14px; }
    .cat-color {
        width: 12px;
        height: 12px;
        border: 1px solid var(--c5);
        flex-shrink: 0;
    }
    .cat-lbl {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--c2);
    }

    .btn-icon {
        width: 20px;
        height: 20px;
        padding: 0;
        font-size: 14px;
        line-height: 1;
        background: var(--c9);
        border: 1px solid var(--c5);
        color: var(--c3);
        cursor: pointer;
    }
    .btn-icon:hover { background: var(--c7); color: var(--c2); }

    .btn-icon-xs {
        width: 16px;
        height: 16px;
        padding: 0;
        font-size: 11px;
        line-height: 1;
        background: transparent;
        border: none;
        color: var(--c4);
        cursor: pointer;
        opacity: 0.5;
    }
    .cat-item:hover .btn-icon-xs { opacity: 1; }
    .btn-icon-xs:hover { color: var(--c2); background: #eee; }
    .btn-icon-xs.del:hover { color: var(--err); background: #fee; }
    .cat-show-in-cell {
        font-size: 10px;
        color: var(--c1);
        opacity: 0.9;
        margin-right: 2px;
        line-height: 1;
    }

    .cat-edit-box {
        padding: 8px;
        background: var(--c8);
        border-top: 1px solid var(--c5);
    }
    .cat-edit-row {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-bottom: 6px;
        font-size: 11px;
    }
    .cat-edit-row label { color: var(--c3); min-width: 28px; }
    .cat-edit-row input[type="text"] {
        flex: 1;
        padding: 3px 5px;
        font-size: 11px;
        border: 1px solid var(--c5);
    }
    .cat-edit-row input[type="color"] {
        width: 24px;
        height: 20px;
        padding: 0;
        border: 1px solid var(--c5);
        cursor: pointer;
    }
    .cat-edit-actions {
        display: flex;
        gap: 6px;
        justify-content: flex-end;
    }
    .btn-sm {
        padding: 2px 6px;
        font-size: 11px;
        border: 1px solid var(--c5);
        background: var(--c8);
        color: var(--c2);
    }
    .btn-sm.secondary {
        background: var(--c9);
    }

    .empty-state-mini {
        text-align: center;
        padding: 40px 20px;
        color: var(--c4);
    }
    .empty-state-mini .icon { font-size: 32px; margin-bottom: 8px; }
    .empty-state-mini .text { font-size: 13px; margin-bottom: 12px; }

    .date-selector {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        font-weight: 700;
        color: var(--c2);
    }
    .date-selector button {
        padding: 2px 8px;
        font-size: 14px;
        background: var(--c9);
        border: 1px solid var(--c5);
        color: var(--c2);
        cursor: pointer;
        line-height: 1;
    }
    .date-selector button:hover { background: var(--c7); }
    .date-selector .date-label {
        min-width: 100px;
        text-align: center;
        cursor: pointer;
    }
    .date-selector .date-label:hover { color: var(--accent); }

    .discharged-toggle {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--c3);
        cursor: pointer;
        user-select: none;
    }
    .discharged-toggle input { margin: 0; }

    .soldier-row.discharged td {
        opacity: 0.45;
    }

    .soldier-ctx-menu {
        position: fixed;
        z-index: 4000;
        width: 210px;
        max-height: 55vh;
        overflow-y: auto;
        background: var(--c9);
        border: 1px solid var(--c5);
        box-shadow: 0 4px 14px rgba(0,0,0,0.2);
        padding: 4px 0;
    }
    .soldier-ctx-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        font-size: 12px;
        border: none;
        background: transparent;
        color: var(--c2);
        text-align: left;
        cursor: pointer;
    }
    .soldier-ctx-item:hover:not(:disabled) { background: var(--c8); }
    .soldier-ctx-item:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
    .soldier-ctx-divider {
        height: 1px;
        background: var(--c6);
        margin: 4px 0;
    }
    .soldier-ctx-check {
        width: 12px;
        color: var(--c1);
        font-weight: 700;
        text-align: center;
        flex-shrink: 0;
    }
    .soldier-ctx-color {
        width: 10px;
        height: 10px;
        border: 1px solid var(--c5);
        flex-shrink: 0;
    }
    .soldier-ctx-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;
