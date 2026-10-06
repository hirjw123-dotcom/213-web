export const tabMilitaryCss = `
    .tab-military {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    .mil-tabs {
        display: flex;
        gap: 0;
        border-bottom: 1px solid var(--c5);
        margin-bottom: 16px;
    }
    .mil-tab {
        padding: 8px 16px;
        font-size: 13px;
        cursor: pointer;
        color: var(--c4);
        border-bottom: 2px solid transparent;
        transition: all 0.15s;
    }
    .mil-tab:hover { color: var(--c2); }
    .mil-tab.active {
        color: var(--accent);
        font-weight: 700;
        border-bottom-color: var(--accent);
    }

    .mil-body {
        flex: 1;
    }

    .mil-setup {
        max-width: 360px;
    }
    .mil-form-group {
        margin-bottom: 14px;
    }
    .mil-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--c2);
        margin-bottom: 4px;
    }
    .mil-warning {
        padding: 8px 12px;
        background: #fff3cd;
        color: #856404;
        border: 1px solid #ffc107;
        font-size: 12px;
        margin-bottom: 14px;
    }
    .mil-save-btn {
        margin-top: 8px;
        padding: 8px 24px;
        font-size: 13px;
        font-weight: 600;
    }

    .mil-access {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 350px;
    }
    .mil-pin-area {
        text-align: center;
    }
    .mil-pin-title {
        font-size: 18px;
        font-weight: 700;
        color: var(--c1);
        margin-bottom: 4px;
    }
    .mil-pin-subtitle {
        font-size: 13px;
        color: var(--c4);
        margin-bottom: 24px;
    }

    .mil-pin-boxes {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-bottom: 16px;
    }
    .mil-pin-box {
        width: 52px;
        height: 60px;
        border: 2px solid var(--c5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        color: var(--c1);
        background: var(--c9);
        transition: all 0.15s;
    }
    .mil-pin-box.filled {
        border-color: var(--accent);
        background: var(--highlight);
    }
    .mil-pin-box.error {
        border-color: var(--err);
        background: #fff0f0;
        animation: mil-shake 0.3s;
    }

    @keyframes mil-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-4px); }
        40% { transform: translateX(4px); }
        60% { transform: translateX(-4px); }
        80% { transform: translateX(4px); }
    }

    .mil-pin-error {
        color: var(--err);
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 12px;
    }
    .mil-pin-info {
        font-size: 12px;
        color: var(--c4);
        margin-top: 8px;
    }
`;
