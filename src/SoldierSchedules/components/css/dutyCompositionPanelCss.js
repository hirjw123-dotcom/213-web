export const dutyCompositionPanelCss = `
    .unit-separator{
        border-top: 2px solid #000 !important;
    }
    .left-line{
        border-left: 2px solid #000 !important;
    }
    .bottom-line{
        border-bottom: 2px solid #000 !important;
    }
    .duty-comp-panel { padding: 6px;
        font-size: 12px; }
    .duty-comp-panel table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    .duty-comp-panel th, .duty-comp-panel td { border: 1px solid #bbb; 
    padding: 0px 2px; text-align: center;
        font-size: 12px;
    height: 24px; }
    .duty-comp-panel th { background: #e0e0e0; font-weight: 600;
        font-size: 12px; white-space: nowrap; }
    .duty-comp-section-title { background: #333; color: #fff; font-weight: 700;
        font-size: 12px; padding: 5px 8px; margin-top: 8px; margin-bottom: 0; }
    .duty-comp-section-title:first-child { margin-top: 0; }
    .duty-comp-panel td.mismatch { background: #ffcdd2 !important; }
    .duty-comp-panel td.match-green { background: #c8e6c9 !important; }
    .duty-comp-panel td.editable-cell { background: #fafafa; cursor: pointer; position: relative; }
    .duty-comp-panel td.editable-cell:hover { background: #e3f2fd !important; }
    .duty-comp-panel td.editable-cell::after { content: ''; position: absolute; right: 2px; bottom: 1px; border-left: 4px solid transparent; border-bottom: 4px solid #bbb; }
    .duty-comp-panel td.editable-cell:hover::after { border-bottom-color: #1976d2; }
    .duty-comp-panel .soldier-name { text-align: left; padding: 0px 4px;
        font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;
        cursor: pointer;
    }
    .duty-comp-panel .soldier-name.active-focus {
        outline: 2px solid #1976d2;
        outline-offset: -2px;
    }
    .duty-comp-panel .soldier-rank-order {
    margin-left:6px;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: 700;
        color: #000;
        vertical-align: middle;
    }
    .cctv-toggle-btn {
        align-self: center;
        margin-left:auto;
        display: flex; align-items: center; gap: 5px;
        padding: 7px 10px; margin-bottom: 4px;
        background: #263238; color: #eceff1; border: none;
        border-radius: 4px; cursor: pointer;
        font-size: 12px; font-weight: 600;
    }
    .cctv-toggle-btn:hover { background: #37474f; }
    .cctv-toggle-btn.active { background: #1565c0; color: #fff; }
    .cctv-toggle-btn span.cctv-icon { font-size: 14px; }
    .load-comp-btn {
        align-self: center;
        display: flex; align-items: center; gap: 5px;
        padding: 7px 10px; margin-bottom: 4px;
        background: #37474f; color: #eceff1; border: none;
        border-radius: 4px; cursor: pointer;
        font-size: 12px; font-weight: 600;
    }
    .load-comp-btn:hover { background: #546e7a; }
    .load-popup-overlay {
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
    }
    .load-popup {
        background: #fff; border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.25);
        min-width: 340; max-width: 520px; width: 90%;
        max-height: 70vh; display: flex; flex-direction: column;
    }
    .load-popup-header {
        padding: 12px 16px; font-size: 15px; font-weight: 700;
        border-bottom: 1px solid #ddd; background: #f5f5f5;
        border-radius: 8px 8px 0 0;
        display: flex; justify-content: space-between; align-items: center;
    }
    .load-popup-body {
        padding: 12px 16px; overflow-y: auto;
        display: flex; flex-wrap: wrap; gap: 8px;
    }
    .load-month-card {
        border: 1px solid #ccc; border-radius: 6px;
        padding: 10px 14px; cursor: pointer;
        min-width: 130px; text-align: center;
        background: #fafafa; transition: all 0.15s;
    }
    .load-month-card:hover {
        border-color: #1976d2; background: #e3f2fd;
        box-shadow: 0 2px 8px rgba(25,118,210,0.15);
    }
    .load-month-card .month-label {
        font-size: 14px; font-weight: 700; color: #333;
    }
    .load-month-card .month-detail {
        font-size: 11px; color: #888; margin-top: 4px;
    }
    .load-popup-footer {
        padding: 10px 16px; border-top: 1px solid #ddd;
        text-align: right;
    }
`;
