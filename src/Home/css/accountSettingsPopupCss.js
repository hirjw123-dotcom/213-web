export const accountSettingsPopupCss = `
    .acct-settings-modal {
        background: var(--c9);
        width: 600px;
        max-width: 95vw;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--c2);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    }
    .asm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 18px;
        background: var(--c8);
        border-bottom: 1px solid var(--c5);
        font-weight: 700;
        font-size: 14px;
        color: var(--c2);
    }
    .asm-close {
        width: 24px; height: 24px;
        background: transparent;
        border: none;
        color: var(--c3);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }
    .asm-close:hover { color: var(--c1); background: #ddd; }
    .asm-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }
    .asm-tabs {
        width: 140px;
        background: var(--c8);
        border-right: 1px solid var(--c5);
        flex-shrink: 0;
        padding-top: 8px;
    }
    .asm-tab {
        padding: 10px 14px;
        font-size: 13px;
        cursor: pointer;
        border-bottom: 1px solid var(--c6);
        color: var(--c3);
    }
    .asm-tab:hover { background: var(--c7); color: var(--c2); }
    .asm-tab.active {
        background: var(--c9);
        font-weight: 700;
        color: var(--c1);
        border-right: 1px solid var(--c9);
        margin-right: -1px;
        position: relative;
    }
    .asm-content {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        min-height: 300px;
    }
    .asm-form-group { margin-bottom: 16px; }
    .asm-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--c2);
        margin-bottom: 5px;
    }
    .asm-input {
        width: 100%;
        padding: 8px 10px;
        font-size: 13px;
        border: 1px solid var(--c5);
        background: #fff;
        font-family: inherit;
    }
    .asm-input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(25,118,210,0.12);
    }
    .asm-error { color: var(--err); font-size: 12px; margin-bottom: 8px; white-space: pre-line; }
    .asm-success { color: #2e7d32; font-size: 12px; margin-bottom: 8px; }
    .asm-btn {
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        font-weight: 600;
    }
    .asm-btn-primary {
        background: var(--c1);
        color: #fff;
        border: 1px solid var(--c1);
    }
    .asm-btn-primary:hover { background: #3d4e3f; }
    .asm-perm-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .asm-perm-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: var(--c8);
        border: 1px solid var(--c6);
        font-size: 13px;
        font-weight: 500;
    }
    .asm-perm-badge.master {
        background: #fff3e0;
        border-color: #ff9800;
        color: #e65100;
        font-weight: 700;
    }
    .asm-empty {
        color: var(--c4);
        font-size: 13px;
        padding: 20px 0;
    }
`;
