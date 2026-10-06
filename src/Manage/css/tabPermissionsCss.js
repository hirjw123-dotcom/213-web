export const tabPermissionsCss = `
    .tp-layout {
        display: flex;
        gap: 0;
        height: 100%;
    }
    .tp-left {
        flex: 1;
        min-width: 0;
        overflow-y: auto;
        padding-right: 16px;
    }
    .tp-right {
        width: 300px;
        min-width: 300px;
        border-left: 1px solid var(--c6);
        padding-left: 16px;
        overflow-y: auto;
    }
    .tp-section-title {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 12px;
        color: var(--c1);
    }
    .tp-perm-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .tp-perm-item {
        display: flex;
        flex-direction: row;
        gap:10px;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        border: 1px solid var(--c6);
        background: var(--c9);
        font-size: 13px;
    }
    .tp-perm-item.builtin {
        background: #fff3e0;
        border-color: #ffcc80;
    }
    .tp-perm-id {
        font-size: 11px;
        color: var(--c4);
        font-family: monospace;
    }
    .tp-add-row {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        align-items: flex-end;
    }
    .tp-add-input {
        padding: 6px 10px;
        font-size: 13px;
        border: 1px solid var(--c5);
        font-family: inherit;
    }
    .tp-add-input:focus {
        outline: none;
        border-color: var(--accent);
    }
    .tp-feature-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
        border: 1px solid var(--c6);
    }
    .tp-feature-table th {
        padding: 6px 8px;
        background: var(--c8);
        border: 1px solid var(--c6);
        font-weight: 600;
        font-size: 11px;
        text-align: center;
        white-space: nowrap;
    }
    .tp-feature-table td {
        padding: 5px 8px;
        border: 1px solid var(--c7);
        text-align: center;
        vertical-align: middle;
    }
    .tp-page-header td {
        background: var(--c8);
        font-weight: 700;
        font-size: 12px;
        color: var(--c2);
    }
    .tp-readonly-msg {
        font-size: 12px;
        color: var(--c4);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* ─── 근무일정표 달력 편집 상세 권한 ─── */
    .tp-schedule-restrictions {
        margin-top: 28px;
        max-width: 640px;
    }
    .tp-sr-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--c1);
        margin-bottom: 14px;
        padding-bottom: 8px;
        border-bottom: 2px solid var(--c6);
    }
    .tp-sr-card {
        border: 1px solid var(--c6);
        border-radius: 6px;
        margin-bottom: 12px;
        background: var(--c9, #fafafa);
        overflow: hidden;
    }
    .tp-sr-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        gap: 12px;
    }
    .tp-sr-card-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--c2);
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        line-height: 1.4;
    }
    .tp-sr-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        min-width: 22px;
        border-radius: 50%;
        background: var(--c1, #333);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
    }
    .tp-sr-toggle-wrap {
        display: flex;
        gap: 0;
        border: 1px solid var(--c5);
        border-radius: 4px;
        overflow: hidden;
        flex-shrink: 0;
    }
    .tp-sr-toggle-btn {
        padding: 5px 14px;
        font-size: 12px;
        border: none;
        background: var(--c8, #f0f0f0);
        color: var(--c3);
        cursor: pointer;
        font-weight: 500;
        transition: all 0.15s;
        font-family: inherit;
    }
    .tp-sr-toggle-btn:not(:last-child) {
        border-right: 1px solid var(--c5);
    }
    .tp-sr-toggle-btn.active {
        background: var(--c1, #333);
        color: #fff;
        font-weight: 700;
    }
    .tp-sr-toggle-btn:disabled {
        cursor: default;
        opacity: 0.5;
    }
    .tp-sr-card-body {
        padding: 0 16px 14px;
        border-top: 1px solid var(--c7);
    }
    .tp-sr-desc {
        font-size: 12px;
        color: var(--c4);
        line-height: 1.6;
        padding: 10px 0 12px;
    }
    .tp-sr-period-inputs {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .tp-sr-period-group {
        display: flex;
        align-items: center;
        gap: 2px;
        background: var(--c8, #f5f5f5);
        border: 1px solid var(--c6);
        border-radius: 4px;
        padding: 2px 6px;
    }
    .tp-sr-ym-input {
        border: none;
        background: transparent;
        font-family: monospace;
        font-size: 13px;
        text-align: center;
        outline: none;
        color: var(--c1);
        font-weight: 600;
    }
    .tp-sr-ym-input::-webkit-inner-spin-button,
    .tp-sr-ym-input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }
    .tp-sr-ym-input[type=number] {
        -moz-appearance: textfield;
    }
    .tp-sr-ym-year {
        width: 50px;
    }
    .tp-sr-ym-month {
        width: 30px;
    }
    .tp-sr-ym-dot {
        font-weight: 700;
        color: var(--c4);
        font-size: 14px;
    }
    .tp-sr-period-sep {
        font-size: 16px;
        font-weight: 700;
        color: var(--c4);
    }
    .tp-sr-exception-box {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px dashed var(--c6);
    }
    .tp-sr-exception-box-compact {
        margin-top: 0;
        padding-top: 0;
        border-top: none;
    }
    .tp-sr-exception-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--c2);
    }
    .tp-sr-exception-desc {
        margin-top: 4px;
        font-size: 11px;
        color: var(--c4);
        line-height: 1.5;
    }
    .tp-sr-exception-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 8px;
        margin-top: 10px;
    }
    .tp-sr-exception-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border: 1px solid var(--c6);
        border-radius: 6px;
        background: #fff;
        font-size: 12px;
        color: var(--c2);
        cursor: pointer;
    }
    .tp-sr-exception-item.disabled {
        cursor: default;
        opacity: 0.65;
    }
    .tp-sr-exception-item input {
        margin: 0;
    }
    .tp-sr-saving {
        font-size: 11px;
        color: var(--c4);
        margin-top: 6px;
        text-align: right;
    }
`;
