export const loginPopupCss = `
    .login-popup-modal {
        background: var(--c9);
        width: 420px;
        max-width: 95vw;
        border: 1px solid var(--c2);
        box-shadow: 0 8px 32px rgba(0,0,0,0.18);
        display: flex;
        flex-direction: column;
    }
    .lpm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        background: var(--c1);
        color: #fff;
    }
    .lpm-header-title {
        font-size: 16px;
        font-weight: 700;
        letter-spacing: 0.5px;
    }
    .lpm-close {
        background: none;
        border: none;
        color: #fff;
        font-size: 22px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        opacity: 0.7;
    }
    .lpm-close:hover { opacity: 1; background: transparent; border: none; }
    .lpm-body {
        padding: 28px 28px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .lpm-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
        position: relative;
    }
    .lpm-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--c2);
    }
    .lpm-input {
        padding: 10px 12px;
        font-size: 14px;
        border: 1px solid var(--c6);
        background: #fff;
        font-family: inherit;
        transition: border-color 0.15s;
    }
    .lpm-input:focus {
        border-color: var(--accent);
        outline: none;
        box-shadow: 0 0 0 2px rgba(25,118,210,0.12);
    }
    .lpm-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid var(--c5);
        border-top: none;
        max-height: 180px;
        overflow-y: auto;
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .lpm-suggestion-item {
        padding: 8px 12px;
        font-size: 13px;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--c7);
    }
    .lpm-suggestion-item:last-child { border-bottom: none; }
    .lpm-suggestion-item:hover,
    .lpm-suggestion-item.selected {
        background: var(--highlight);
    }
    .lpm-suggestion-item.selected {
        background: rgba(25,118,210,0.15);
        font-weight: 600;
    }
    .lpm-suggestion-name {
        font-size: 12px;
        color: var(--c4);
    }
    .lpm-error {
        font-size: 13px;
        color: var(--err);
        font-weight: 500;
        padding: 4px 0;
        white-space: pre-line;
    }
    .lpm-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 4px;
    }
    .lpm-btn-login {
        padding: 12px;
        background: var(--c1);
        color: #fff;
        border: 1px solid var(--c1);
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        letter-spacing: 0.5px;
        transition: background 0.15s;
    }
    .lpm-btn-login:hover { background: #3d4e3f; border-color: #3d4e3f; }
    .lpm-btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
    .lpm-footer {
        display: flex;
        justify-content: center;
        padding: 14px 28px 18px;
        border-top: 1px solid var(--c7);
        gap: 6px;
        font-size: 13px;
        color: var(--c4);
    }
    .lpm-link {
        color: var(--accent);
        cursor: pointer;
        font-weight: 600;
        text-decoration: none;
    }
    .lpm-link:hover { text-decoration: underline; }
`;
