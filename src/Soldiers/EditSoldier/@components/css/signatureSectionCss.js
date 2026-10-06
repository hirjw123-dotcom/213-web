export const signatureSectionCss = `
    .esm-sig-container {
        border: 1px solid var(--c5);
        background: var(--c9);
        padding: 10px;
    }
    .esm-sig-preview {
        position: relative;
        display: inline-block;
        margin-bottom: 8px;
    }
    .esm-sig-img {
        max-width: 200px;
        max-height: 100px;
        border: 1px solid var(--c5);
        background: #fff;
        display: block;
    }
    .esm-sig-del {
        position: absolute;
        top: -6px;
        right: -6px;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        border: 1px solid var(--err);
        background: #fff;
        color: var(--err);
        font-size: 11px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        line-height: 1;
    }
    .esm-sig-del:hover {
        background: var(--err);
        color: #fff;
    }
    .esm-sig-empty {
        padding: 20px;
        text-align: center;
        color: var(--c4);
        font-size: 12px;
        border: 1px dashed var(--c5);
        cursor: pointer;
        margin-bottom: 8px;
    }
    .esm-sig-empty:hover {
        background: var(--c8);
        color: var(--c3);
    }
    .esm-sig-actions {
        display: flex;
        gap: 6px;
    }
    .esm-sig-actions button {
        font-size: 12px;
        padding: 4px 10px;
    }
`;
