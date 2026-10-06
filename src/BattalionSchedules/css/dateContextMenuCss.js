export const dateContextMenuCss = `
    .date-ctx-overlay {
        position: fixed;
        inset: 0;
        z-index: 9998;
    }
    .date-ctx-menu {
        position: fixed;
        z-index: 9999;
        background: var(--c9);
        border: 1px solid var(--c5);
        min-width: 160px;
        font-size: 13px;
    }
    .date-ctx-menu .ctx-header {
        padding: 8px 12px;
        background: var(--c8);
        font-weight: 600;
        border-bottom: 1px solid var(--c6);
        color: var(--c2);
    }
    .date-ctx-menu .ctx-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--c2);
    }
    .date-ctx-menu .ctx-item:hover {
        background: var(--highlight);
    }
    .date-ctx-menu .ctx-item .icon {
        width: 16px;
        text-align: center;
    }
    .date-ctx-menu .ctx-item.holiday {
        color: var(--err);
    }
    .date-ctx-menu .ctx-item.disabled {
        color: var(--c4);
        cursor: not-allowed;
    }
    .date-ctx-menu .ctx-item.disabled:hover {
        background: transparent;
    }
`;
