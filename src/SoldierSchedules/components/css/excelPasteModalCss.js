export const excelPasteModalCss = `
    .excel-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.45);
        display: flex; align-items: center; justify-content: center; z-index: 2000;
    }
    .excel-modal {
        background: #fff; width: 820px; max-width: 94vw; max-height: 88vh;
        display: flex; flex-direction: column; border-radius: 8px;
        box-shadow: 0 12px 40px rgba(0,0,0,0.3); overflow: hidden;
    }
    .excel-modal-header {
        padding: 14px 20px; background: #2e7d32; color: #fff;
        font-weight: 700; font-size: 15px;
        display: flex; align-items: center; justify-content: space-between;
    }
    .excel-modal-header .close-btn {
        background: none; border: none; color: rgba(255,255,255,0.8);
        font-size: 22px; cursor: pointer; padding: 0; line-height: 1;
        transition: color .15s;
    }
    .excel-modal-header .close-btn:hover { color: #fff; }
    .excel-modal-body {
        padding: 20px; flex: 1; overflow-y: auto;
        display: flex; flex-direction: column; gap: 16px;
    }

    .excel-info-box {
        display: flex; align-items: flex-start; gap: 10px;
        font-size: 13px; color: #444; line-height: 1.7;
        background: #f1f8e9; padding: 12px 14px; border-radius: 6px;
        border: 1px solid #c5e1a5;
    }
    .excel-info-box .info-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }

    .excel-paste-area {
        width: 100%; min-height: 160px; max-height: 300px; overflow-y: auto;
        border: 2px dashed #bbb; border-radius: 6px; padding: 16px;
        font-size: 13px; font-family: 'Consolas', 'D2Coding', monospace;
        white-space: pre-wrap; word-break: break-all;
        color: #333; background: #fafafa; outline: none; cursor: text;
        line-height: 1.6; transition: border-color .2s, background .2s;
    }
    .excel-paste-area:focus { border-color: #4caf50; background: #fff; }
    .excel-paste-area:empty::before {
        content: '엑셀에서 일정표를 복사(Ctrl+C)한 후\\A이곳을 클릭하고 Ctrl+V로 붙여넣기 하세요';
        white-space: pre-wrap; color: #aaa; font-style: italic; font-family: inherit;
        pointer-events: none;
    }

    .excel-summary {
        display: flex; gap: 10px; flex-wrap: wrap;
    }
    .excel-badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600;
    }
    .excel-badge.matched { background: #e8f5e9; color: #2e7d32; border: 1px solid #a5d6a7; }
    .excel-badge.manual { background: #fff3e0; color: #ef6c00; border: 1px solid #ffcc80; }
    .excel-badge.unmatched { background: #fbe9e7; color: #c62828; border: 1px solid #ef9a9a; }
    .excel-badge.days { background: #e3f2fd; color: #1565c0; border: 1px solid #90caf9; }
    .excel-badge.sync { background: #ede7f6; color: #5e35b1; border: 1px solid #b39ddb; }

    .excel-match-section { margin-top: 4px; }
    .excel-match-title {
        font-size: 13px; font-weight: 700; color: #333;
        margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
    }
    .excel-match-title .dot {
        width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .excel-match-table {
        width: 100%; border-collapse: collapse; font-size: 12px;
        border: 1px solid #ddd; border-radius: 4px; overflow: hidden;
    }
    .excel-match-table th {
        background: #f5f5f5; padding: 7px 8px; text-align: center;
        font-weight: 600; color: #555; border-bottom: 2px solid #ddd;
        font-size: 11px; white-space: nowrap; position: sticky; top: 0;
    }
    .excel-match-table td {
        padding: 5px 8px; border-bottom: 1px solid #eee;
        text-align: center; vertical-align: middle;
    }
    .excel-match-table tbody tr:hover { background: #f9fbe7; }
    .excel-match-table .col-num { width: 30px; color: #999; font-size: 11px; }
    .excel-match-table .col-status { width: 28px; }
    .excel-match-table .col-name { text-align: left; padding-left: 10px; white-space: nowrap; font-weight: 500; }
    .excel-match-table .col-select { width: 260px; }
    .excel-match-table .col-sched {
        text-align: left; padding-left: 6px;
    }
    .manual-match-row { background: #fffaf0; }
    .excel-soldier-select {
        width: 100%; min-width: 220px; padding: 6px 8px;
        border: 1px solid #d7ccc8; border-radius: 4px;
        background: #fff; color: #333; font-size: 12px;
    }
    .excel-soldier-select:focus {
        outline: none; border-color: #fb8c00;
        box-shadow: 0 0 0 2px rgba(251,140,0,0.15);
    }
    .match-status-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 20px; height: 20px; border-radius: 50%; font-size: 11px; font-weight: 700;
    }
    .match-status-icon.ok { background: #4caf50; color: #fff; }
    .match-status-icon.fail { background: #ef5350; color: #fff; }
    .sched-chip {
        display: inline-flex; align-items: center; justify-content: center;
        padding: 1px 6px; border-radius: 3px; font-size: 11px; font-weight: 600;
        margin: 1px 2px; line-height: 1.4; white-space: nowrap;
        border: 1px solid rgba(0,0,0,0.08);
    }
    .sched-day-label {
        display: inline-block; font-size: 10px; color: #888;
        min-width: 20px; text-align: right; margin-right: 2px;
        font-weight: 400;
    }
    .match-table-wrap {
        max-height: 260px; overflow-y: auto; border: 1px solid #ddd;
        border-radius: 4px;
    }
    .match-table-wrap .excel-match-table { border: none; }

    .excel-modal-actions {
        display: flex; gap: 10px; justify-content: space-between;
        align-items: center; padding: 14px 20px; border-top: 1px solid #e0e0e0;
        background: #fafafa;
    }
    .excel-modal-actions button {
        padding: 8px 22px; font-size: 13px; cursor: pointer;
        font-weight: 600; border-radius: 4px; transition: all .15s;
    }
    .btn-sync {
        background: #2e7d32; color: #fff; border: none;
        box-shadow: 0 2px 4px rgba(46,125,50,0.3);
    }
    .btn-sync:hover:not(:disabled) { background: #1b5e20; }
    .btn-sync:disabled { background: #bbb; color: #fff; cursor: not-allowed; box-shadow: none; }
    .btn-cancel { background: #fff; border: 1px solid #ccc; color: #555; }
    .btn-cancel:hover { background: #f5f5f5; }
    .btn-reset-paste { background: #fff; border: 1px solid #ef9a9a; color: #c62828; }
    .btn-reset-paste:hover { background: #ffebee; }
`;
