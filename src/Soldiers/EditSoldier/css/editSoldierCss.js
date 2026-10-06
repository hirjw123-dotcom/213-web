export const editSoldierCss = `
    .edit-soldier-modal {
        background: var(--c9);
        width: 800px;
        max-width: 90vw;
        height: 85vh;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--c2);
        box-shadow: 0 5px 15px rgba(0,0,0,0.2) !important;
        transition: width 0.22s ease;
    }

    .edit-soldier-modal.vacation-wide {
        width: 1350px;
    }

    .esm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--c8);
        color: var(--c2);
        font-weight: 700;
        font-size: 14px;
        border-bottom: 1px solid var(--c5);
    }
    .esm-header .close-btn {
        width: 24px;
        height: 24px;
        background: transparent;
        border: none;
        color: var(--c3);
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
    }
    .esm-header .close-btn:hover { color: var(--c1); background: #ddd; }

    .esm-body {
        display: flex;
        flex: 1;
        overflow: hidden;
        background: var(--c9);
    }

    .esm-tabs {
        width: 120px;
        background: var(--c8);
        border-right: 1px solid var(--c5);
        flex-shrink: 0;
        padding-top: 10px;
    }
    .esm-tab {
        padding: 10px;
        font-size: 13px;
        cursor: pointer;
        border-bottom: 1px solid var(--c6);
        text-align: left;
        color: var(--c3);
    }
    .esm-tab:hover { background: var(--c7); color: var(--c2); }
    .esm-tab.active {
        background: var(--c9);
        font-weight: 700;
        color: var(--c1);
        border-right: 1px solid var(--c9);
        margin-right: -1px;
        position: relative;
    }

    .esm-content {
        height: 100%;
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        background: var(--c9);
    }

    .esm-form-group {
        margin-bottom: 14px;
    }
    .esm-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: var(--c2);
        margin-bottom: 4px;
    }
    .esm-input {
        width: 100%;
        padding: 6px 8px;
        font-size: 13px;
        border: 1px solid var(--c5);
        background: #fff;
        box-shadow: none;
        border-radius: 0;
    }
    .esm-input:focus {
        outline: 2px solid var(--accent);
        outline-offset: -1px;
    }

    .esm-dates-row {
        display: flex;
        gap: 16px;
    }
    .esm-dates-row .esm-form-group {
        flex: 1;
    }
    .esm-date-input {
        width: 100%;
        padding: 6px 8px;
        font-size: 13px;
        border: 1px solid var(--c5);
        background: #fff;
        border-radius: 0;
    }

    .esm-birth-row {
        display: flex;
        gap: 6px;
        align-items: center;
    }
    .esm-birth-input {
        width: 70px;
        padding: 6px 4px;
        font-size: 13px;
        border: 1px solid var(--c5);
        text-align: center;
        border-radius: 0;
    }
    .esm-birth-sep {
        color: var(--c4);
        font-size: 12px;
        font-weight: 600;
    }

    .esm-categories {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
    }
    .esm-cat-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid var(--c5);
        cursor: pointer;
        font-size: 12px;
        background: var(--c9);
    }
    .esm-cat-item:hover { background: var(--c8); }
    .esm-cat-item.checked {
        border-color: var(--accent);
        background: var(--highlight);
        font-weight: 600;
        color: var(--accent);
    }
    .esm-cat-item input { margin: 0; }

    .esm-footer {
        padding: 10px 14px;
        background: var(--c8);
        border-top: 1px solid var(--c5);
        display: flex;
        justify-content: space-between;
        gap: 8px;
    }
    .esm-footer .left-btns {
        display: flex;
        gap: 8px;
    }
    .esm-footer .right-btns {
        display: flex;
        gap: 8px;
    }
    .esm-footer .btn-delete {
        background: #fff;
        color: var(--err);
        border: 1px solid var(--err);
    }
    .esm-footer .btn-delete:hover {
        background: var(--err);
        color: #fff;
    }

    .esm-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--c4);
        font-size: 14px;
        font-weight: 500;
        border: 1px dashed var(--c5);
        background: var(--c9);
    }
`;
