export const tabMembersCss = `
    .tm-subtabs {
        display: flex;
        gap: 0;
        border-bottom: 2px solid var(--c6);
        margin-bottom: 16px;
        flex-wrap: wrap;
    }
    .tm-subtab {
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        color: var(--c3);
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        user-select: none;
    }
    .tm-subtab:hover { color: var(--c2); }
    .tm-subtab.active {
        color: var(--c1);
        font-weight: 700;
        border-bottom-color: var(--c1);
    }
    .tm-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        font-size: 11px;
        font-weight: 700;
        color: #fff;
        background: var(--err);
        padding: 0 5px;
        border-radius: 9px;
    }
    .tm-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        border: 1px solid var(--c6);
    }
    .tm-table th {
        padding: 8px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 12px;
        color: var(--c3);
        background: var(--c8);
        border: 1px solid var(--c6);
    }
    .tm-table td {
        padding: 7px 12px;
        border: 1px solid var(--c7);
        vertical-align: middle;
    }
    .tm-table tbody tr:hover { background: var(--highlight); }
    .tm-suspended td {
        text-decoration: line-through;
        color: var(--c4) !important;
    }
    .tm-status-badge {
        display: inline-block;
        padding: 2px 8px;
        font-size: 11px;
        font-weight: 600;
    }
    .tm-status-approved { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .tm-status-pending { background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; }
    .tm-status-suspended { background: #fbe9e7; color: #c62828; border: 1px solid #ef9a9a; }
    .tm-status-deleted { background: #fdecec; color: #a61d24; border: 1px solid #efb7bb; }
    .tm-btn-sm { padding: 3px 10px; font-size: 11px; cursor: pointer; }
    .tm-btn-danger { border: 1px solid #d96b72; background: #fff1f1; color: #a61d24; }
    .tm-btn-restore { border: 1px solid #c86a6f; background: #b63b45; color: #fff; }
    .tm-action-row { display: flex; gap: 6px; flex-wrap: wrap; }
    .tm-perm-cell {
        display: flex;
        flex-wrap: wrap;
        gap: 3px;
        cursor: pointer;
    }
    .tm-perm-chip {
        display: inline-block;
        padding: 1px 6px;
        font-size: 10px;
        border: 1px solid var(--c5);
        background: var(--c8);
    }
    .tm-perm-chip.master {
        background: #fff3e0;
        border-color: #ff9800;
        color: #e65100;
        font-weight: 700;
    }
    .tm-radio-group { display: flex; flex-direction: column; gap: 12px; padding: 8px 0; }
    .tm-radio-item {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 14px 16px;
        border: 1px solid var(--c6);
        cursor: pointer;
        background: var(--c9);
    }
    .tm-radio-item:hover { background: var(--c8); }
    .tm-radio-item.selected { border-color: var(--accent); background: var(--highlight); }
    .tm-radio-title { font-size: 14px; font-weight: 600; color: var(--c2); }
    .tm-radio-desc { font-size: 12px; color: var(--c4); margin-top: 2px; }
    .tm-admin-wrap { display: flex; gap: 16px; }
    .tm-admin-panel {
        width: 300px;
        flex-shrink: 0;
        border: 1px solid var(--c6);
        display: flex;
        flex-direction: column;
    }
    .tm-admin-panel-header {
        padding: 10px 14px;
        background: var(--c8);
        font-size: 13px;
        font-weight: 700;
        border-bottom: 1px solid var(--c6);
    }
    .tm-admin-panel-body {
        flex: 1;
        overflow-y: auto;
        max-height: 400px;
        padding: 8px 0;
    }
    .tm-admin-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        font-size: 13px;
    }
    .tm-admin-item:hover { background: var(--highlight); }
    .tm-log-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        font-size: 12px;
        border-bottom: 1px solid var(--c7);
    }
    .tm-log-item:last-child { border-bottom: none; }
    .tm-log-action {
        display: inline-block;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 700;
    }
    .tm-log-grant { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .tm-log-revoke { background: #fbe9e7; color: #c62828; border: 1px solid #ef9a9a; }
    .tm-log-time { font-size: 11px; color: var(--c4); white-space: nowrap; }
    .tm-deleted-wrap {
        border: 1px solid #efc7cb;
        background: linear-gradient(180deg, #fff7f7 0%, #fff1f1 100%);
        padding: 14px;
    }
    .tm-deleted-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .tm-deleted-title { font-size: 18px; font-weight: 700; color: #8f1d25; }
    .tm-deleted-note { font-size: 12px; color: #a14b52; }
    .tm-table-deleted { border-color: #efc7cb; }
    .tm-table-deleted th { background: #fff0f0; color: #8f1d25; border-color: #efc7cb; }
    .tm-table-deleted td { border-color: #f3d7d9; }
    .tm-table-deleted tbody tr:hover { background: #fff8f8; }
    .perm-edit-popup {
        background: var(--c9);
        width: 350px;
        max-width: 95vw;
        border: 1px solid var(--c2);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    }
    .pep-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 18px;
        background: var(--c8);
        border-bottom: 1px solid var(--c5);
        font-weight: 700;
        font-size: 14px;
    }
    .pep-close {
        width: 24px; height: 24px;
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 18px;
        color: var(--c3);
        padding: 0;
    }
    .pep-close:hover { color: var(--c1); background: #ddd; }
    .pep-body { padding: 16px 18px; }
    .pep-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid var(--c7);
        font-size: 13px;
    }
    .pep-item:last-child { border-bottom: none; }
    .pep-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 18px;
        border-top: 1px solid var(--c6);
    }
`;
