export const cctvOrderPanelCss = `
    .cctv-order-panel {
        display: flex; flex-direction: column; height: 100%;
        background: #fafafa; font-size: 13px;
    }
    .cctv-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 12px; background: #263238; color: #fff;
        font-weight: 700; font-size: 14px; flex-shrink: 0;
    }
    .cctv-header-close {
        background: none; border: none; color: #aaa; font-size: 18px;
        cursor: pointer; padding: 0 4px; line-height: 1;
    }
    .cctv-header-close:hover { color: #fff; }
    .cctv-subtitle {
        padding: 6px 12px; background: #eceff1; color: #546e7a;
        font-size: 13px; border-bottom: 1px solid #cfd8dc; flex-shrink: 0;
        display: flex; align-items: center; justify-content: space-between;
    }
    .cctv-reset-btn {
        background: #455a64; color: #fff; border: none;
        padding: 2px 8px; border-radius: 3px; font-size: 12px;
        font-weight: 600; cursor: pointer;
    }
    .cctv-reset-btn:hover { background: #37474f; }
    .cctv-list {
        flex: 1; overflow-y: auto; padding: 4px 0;
    }
    .cctv-item {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 8px; margin: 1px 4px;
        background: #fff; 
        border-bottom: 1px solid #e0e0e0;
        cursor: grab;
        user-select: none; position: relative;
        flex-wrap: wrap;
    }
    .cctv-item:active { cursor: grabbing; }
    .cctv-item:hover {
        border-color: #90a4ae;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    .cctv-item.dragging {
        opacity: 0.4;
    }
    .cctv-item.drag-over-top {
        border-top: 2.5px solid #1976d2;
    }
    .cctv-item.drag-over-bottom {
        border-bottom: 2.5px solid #1976d2;
    }
    .cctv-rank-num {
        min-width: 18px; height: 18px;
        display: flex; align-items: center; justify-content: center;
        background: #37474f; color: #fff;
        border-radius: 3px; font-weight: 700; font-size: 12px;
        flex-shrink: 0;
    }
    .cctv-rank-badge {
        display: inline-block; padding: 0px 4px;
        border-radius: 3px; font-size: 13px; font-weight: 600;
        flex-shrink: 0; line-height: 18px;
    }
    .cctv-name {
        flex: 1; font-weight: bold; font-size: 13px;
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .cctv-remaining {
        font-size: 13px; color: #78909c;
        flex-shrink: 0; min-width: 36px; text-align: right;
    }
    .cctv-drag-handle {
        color: #bbb; font-size: 12px; flex-shrink: 0;
        cursor: grab; user-select: none;
    }
    .cctv-drag-handle:hover { color: #666; }
    .cctv-categories {
        width: 100%; display: flex; gap: 3px;
        padding: 0 0; flex-wrap: wrap;
        flex-direction: row;
        justify-content: flex-end;
    }
    .cctv-cat-tag {
        font-size: 13px; padding: 0px 4px; border-radius: 2px;
        font-weight: 600; line-height: 15px;
    }
    .cctv-empty {
        padding: 30px 16px; text-align: center;
        color: #999; font-size: 13px;
    }
`;
