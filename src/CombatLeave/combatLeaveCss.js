
export const combatLeaveCss = `
    .combat-leave {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        background: #f5f5f5;
        user-select: none;
        font-size: 13px;
    }
    .cl-header {
        display: flex;
        align-items: center;
        padding: 10px 14px;
        background: #fff;
        border-bottom: 1px solid #999;
        flex-shrink: 0;
        position: relative;
    }
    .cl-header-center {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
    }
    .cl-header .nav-btn {
        padding: 6px 12px;
        font-size: 13px;
        background: #f0f0f0;
        border: 1px solid #999;
        cursor: pointer;
    }
    .cl-header .nav-btn:hover { background: #e0e0e0; }
    .cl-header .month-title {
        font-size: 17px;
        font-weight: 700;
        color: #333;
        min-width: 130px;
        text-align: center;
    }
`;

export const combatLeaveTableCss = `
    .cl-body { flex: 1; display: flex; overflow: hidden; }
    .cl-table-wrap { flex: 1; overflow: auto; background: #fff; --cl-day-cell-width: 32px; }
    .cl-table { border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: 14px; }
    .cl-table th, .cl-table td { border-right: 1px solid #000; border-bottom: 1px solid #000; text-align: center; padding: 0; background-clip: padding-box; }
    .cl-table thead { position: sticky; top: 0; z-index: 100; }
    .cl-table thead tr:first-child th { border-top: 1px solid #000; }
    .cl-table thead th { background: #e0e0e0; font-weight: 600; height: 20px; font-size: 14px; cursor: default; }

    .cl-table thead th.col-num { width: 35px !important; min-width: 35px !important; position: sticky; left: 0; z-index: 110; background: #ccc; }
    .cl-table thead th.col-name { width: 95px !important; min-width: 95px !important; position: sticky; left: 35px; z-index: 110; background: #ccc; }
    .col-name { text-align:center !important; font-weight:bold !important; }

    .cl-table thead th.col-day { min-width: var(--cl-day-cell-width); max-width: var(--cl-day-cell-width) !important; width: var(--cl-day-cell-width) !important; }
    .cl-table td.cl-cell { height: 20px; min-width: var(--cl-day-cell-width); max-width: var(--cl-day-cell-width); width: var(--cl-day-cell-width); cursor: pointer; position: relative; background: #fff; }

    .cl-table thead th.today { background: #fff59d; }
    .cl-table thead th.saturday { color: #0d47a1 !important; }
    .cl-table thead th.sunday { color: #b71c1c !important; }
    .cl-table .sunday-col { border-right: #000 3px solid !important; }

    .cl-table tbody td.sticky-cell { position: sticky; z-index: 10; }
    .cl-table tbody td.col-num { left: 0; background: #f5f5f5; font-size: 13px; color: #666; width: 35px; }
    .cl-table tbody td.col-name { left: 35px; text-align: left; padding: 0 6px; font-weight: 500; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 95px; }

    .cl-cell-content {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 13px;
        font-weight: bold;
        overflow: hidden;
        white-space: nowrap;
    }
    .cl-cell-content.pending{
        color: #777 !important;
    }
    .cl-cell-content.pending {
        outline: 1px dashed #777;
        outline-offset: -2px;
    }

    .newUnit td { border-top: 2px solid #666; }

    /* 주간일정 행 */
    .cl-table thead tr.daily-row td {
        background: #f4f7f9;
        height: 18px;
        font-size: 12px;
        color: #455a64;
        border-bottom: 1px solid #b0bec5;
    }
    .cl-table thead tr.daily-row td.daily-schedule-cell {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .cl-table thead tr.daily-row td.daily-schedule-cell.has-items {
        cursor: help;
        font-weight: 700;
        color: #1565c0;
        background: #eef6ff;
    }
    .cl-table thead tr.week-row td {
        background: #f0f0f0;
        height: 18px;
        font-size: 12px;
        color: #555;
        border-bottom: 2px solid #999;
    }
    .cl-table thead tr.week-row td.week-content {
        font-size: 12px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        max-width: 100px;
        color: #333;
    }

    .cl-daily-tooltip {
        position: fixed;
        z-index: 1200;
        min-width: 220px;
        max-width: 260px;
        padding: 10px 12px;
        border: 1px solid #90a4ae;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.98);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.16);
        pointer-events: none;
    }
    .cl-daily-tooltip-title {
        margin-bottom: 6px;
        font-size: 12px;
        font-weight: 700;
        color: #1565c0;
    }
    .cl-daily-tooltip-item {
        font-size: 12px;
        line-height: 1.45;
        color: #263238;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .cl-daily-tooltip-item + .cl-daily-tooltip-item {
        margin-top: 4px;
    }

    /* 합계 행 */
    .cl-totals-row td { border-top: 2px solid #666; }

    /* 우측 요약 컬럼 */
    .cl-table th.col-summary,
    .cl-table td.col-summary {
        width: 30px !important;
        min-width: 30px !important;
        font-size: 13px;
        text-align: center;
        padding: 0;
    }
    .cl-table thead th.col-summary {
        font-weight: 700;
        font-size: 13px;
        cursor: default;
    }

    /* 일자별 토,일,휴일 배경 표시 */
    .cl-table thead th.col-day.holiday-col { color: #c00 !important; }

    /* ==================== 우측 패널 ==================== */
    .cl-right-panel {
        width: 800px;
        min-width: 300px;
        background: #fff;
        border-left: 2px solid #999;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
    }

    /* 리사이즈 핸들 */
    .cl-resize-handle {
        position: absolute;
        left: -4px;
        top: 0;
        bottom: 0;
        width: 8px;
        cursor: col-resize;
        z-index: 200;
    }
    .cl-resize-handle:hover,
    .cl-resize-handle.active {
        background: rgba(25, 118, 210, 0.3);
    }

    /* 모드 탭 (일일/월간) */
    .cl-mode-tabs {
        display: flex;
        flex-shrink: 0;
        border-bottom: 2px solid #333;
    }
    .cl-mode-tab {
        flex: 1;
        padding: 10px 4px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        background: #e0e0e0;
        color: #888;
        border-right: 1px solid #ccc;
    }
    .cl-mode-tab:last-child { border-right: none; }
    .cl-mode-tab.active {
        background: #fff;
        color: #1565c0;
        border-bottom: 3px solid #1565c0;
    }
    .cl-mode-tab:hover:not(.active) { background: #eee; color: #555; }

    /* 달력 래퍼 */
    .cl-calendar-wrap {
        border-bottom: 2px solid #ddd;
        flex-shrink: 0;
        padding: 10px;
        background: #f7f7f7;
    }
    .cl-calendar-wrap .mini-date-calendar { width: 100%; }
    .cl-calendar-wrap .mini-date-calendar__header { justify-content: center; gap: 12px; }

    .cl-mini-cal {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 13px;
        background: #fff;
        border: 1px solid #d9d9d9;
    }
    .cl-mini-cal__head {
        padding: 8px 0;
        font-weight: 700;
        font-size: 12px;
        text-align: center;
        color: #555;
        background: #fff;
        border-bottom: 1px solid #d9d9d9;
    }
    .cl-mini-cal__head.sunday { color: #c62828; }
    .cl-mini-cal__head.saturday { color: #1565c0; }
    .cl-mini-cal__cell {
        padding: 0;
        height: 68px;
        vertical-align: top;
        border-right: 1px solid #e3e3e3;
        border-bottom: 1px solid #e3e3e3;
        cursor: pointer;
        background: #fff;
    }
    .cl-mini-cal tr .cl-mini-cal__cell:last-child { border-right: none; }
    .cl-mini-cal tbody tr:last-child .cl-mini-cal__cell { border-bottom: none; }
    .cl-mini-cal__cell.empty {
        background: #fafafa;
        cursor: default;
    }
    .cl-mini-cal__day {
        width: 100%;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 6px 5px 4px;
        background: transparent;
    }
    .cl-mini-cal__day-labels {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
    }
    .cl-mini-cal__day-number {
        font-size: 13px;
        font-weight: 700;
        line-height: 1;
        color: #333;
    }
    .cl-mini-cal__today-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 6px;
        border-radius: 999px;
        background: #ff7043;
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        line-height: 1;
    }
    .cl-mini-cal__cell.selected {
        background: #1976d2;
    }
    .cl-mini-cal__cell.today:not(.selected) {
        background: #fff8e1;
    }
    .cl-mini-cal__cell.selected .cl-mini-cal__day-number {
        color: #fff;
    }
    .cl-mini-cal__cell.selected .cl-mini-cal__today-badge {
        background: #fff;
        color: #d84315;
    }
    .cl-mini-cal__cell.holiday .cl-mini-cal__day-number { color: #c62828; }
    .cl-mini-cal__cell.sunday .cl-mini-cal__day-number { color: #c62828; }
    .cl-mini-cal__cell.saturday .cl-mini-cal__day-number { color: #1565c0; }
    .cl-mini-cal__cell.selected.sunday .cl-mini-cal__day-number,
    .cl-mini-cal__cell.selected.holiday .cl-mini-cal__day-number,
    .cl-mini-cal__cell.selected.saturday .cl-mini-cal__day-number {
        color: #fff;
    }
    .cl-mini-cal__badge {
        min-width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 5px;
        border-radius: 999px;
        background: #d32f2f;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
    }
    .cl-mini-cal__cell.selected .cl-mini-cal__badge {
        background: #fff;
        color: #d32f2f;
    }
    .cl-mini-cal__summary {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0 5px 5px;
    }
    .cl-mini-cal__summary-item {
        display: block;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border-radius: 4px;
        padding: 1px 4px;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
        box-sizing: border-box;
    }
    .cl-mini-cal__summary-item.half-day {
        background: #e3f2fd;
        color: #1565c0;
    }
    .cl-mini-cal__summary-item.full-day {
        background: #ffebee;
        color: #c62828;
    }
    .cl-mini-cal__cell.selected .cl-mini-cal__summary-item.half-day {
        background: rgba(255, 255, 255, 0.18);
        color: #e3f2fd;
    }
    .cl-mini-cal__cell.selected .cl-mini-cal__summary-item.full-day {
        background: rgba(255, 255, 255, 0.22);
        color: #ffebee;
    }

    /* 승인/대기 탭 */
    .cl-right-tabs {
        display: flex;
        border-bottom: 2px solid #ddd;
        background: #f5f5f5;
        flex-shrink: 0;
    }
    .cl-right-tab {
        flex: 1;
        padding: 9px 4px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        background: #e8e8e8;
        border-right: 1px solid #ccc;
        color: #777;
    }
    .cl-right-tab:last-child { border-right: none; }
    .cl-right-tab.active { background: #fff; color: #333; border-bottom: 2px solid #1976d2; }
    .cl-right-tab:hover:not(.active) { background: #eee; }

    .cl-right-body {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        position: relative;
    }
    .cl-right-panels {
        display: flex;
        width: 200%;
        height: 100%;
        will-change: transform;
    }
    .cl-right-panel-page {
        flex: 0 0 50%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        background: #fff;
    }
    .cl-right-page-scroll {
        flex: 1;
        overflow-y: auto;
    }

    /* 리스트 테이블 */
    .cl-right-list-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
        border:0;
        margin-top: 10px;
        table-layout: fixed;
    }
    .cl-right-list-table thead {
        position: sticky;
        top: 0;
        z-index: 10;
    }
    .cl-right-list-table th {
        background: #e0e0e0;
        padding: 7px 6px;
        border-bottom: 2px solid #999;
        font-weight: 700;
        font-size: 13px;
        white-space: nowrap;
        color: #333;
    }
    .cl-right-list-table th:last-child { border-right: none; }
    .cl-right-list-table td {
        padding: 6px 5px;
        border-bottom: 1px solid #ddd;
        border-right: 1px solid #eee;
        text-align: center;
        vertical-align: middle;
    }
    .cl-right-list-table th.cl-col-reason,
    .cl-right-list-table td.cl-col-reason {
        text-align: left;
    }
    .cl-right-list-table td.cl-col-reason {
        max-width: 1px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #444;
    }
    .cl-right-list-table th.cl-col-leave,
    .cl-right-list-table td.cl-col-leave {
        background: #fce4ec;
        width: 44px;
    }
    .cl-right-list-table td:last-child { border-right: none; }
    .cl-right-list-table tbody tr:hover {
        background: #f0f4ff;
    }
    .cl-right-list-table tbody tr:hover .cl-col-leave {
        background: #fce4ec;
    }

    .cl-approve-btn {
        padding: 4px 12px;
        font-size: 13px;
        font-weight: 600;
        background: #1976d2;
        color: #fff;
        border: 1px solid #1565c0;
        cursor: pointer;
        border-radius: 3px;
    }
    .cl-approve-btn:hover { background: #1565c0; }
    .cl-approve-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .cl-empty-message {
        padding: 30px 10px;
        text-align: center;
        color: #999;
        font-size: 14px;
    }
    .cl-right-summary {
        display: flex;
        gap: 8px;
        padding: 10px 12px 12px;
        border-top: 1px solid #e6e6e6;
        background: #fafafa;
        flex-wrap: wrap;
        flex-shrink: 0;
    }
    .cl-right-summary__item {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        line-height: 1.4;
    }
    .cl-right-summary__item.half-day {
        background: #e3f2fd;
        color: #1565c0;
    }
    .cl-right-summary__item.full-day {
        background: #ffebee;
        color: #c62828;
    }

    /* ==================== 컨텍스트 메뉴 ==================== */
    .cl-context-menu {
        position: fixed;
        z-index: 2000;
        min-width: 200px;
        background: #fff;
        border: 1px solid #8f98ab;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
        overflow: hidden;
    }
    .cl-context-menu-header {
        padding: 8px 10px;
        background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
        border-bottom: 1px solid #d5dbe5;
        font-size: 14px;
        font-weight: 700;
        color: #1f2937;
    }
    .cl-context-menu-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 12px;
        border: none;
        background: #fff;
        text-align: left;
        cursor: pointer;
        font-size: 13px;
    }
    .cl-context-menu-item:hover:not(:disabled) { background: #f0f4ff; }
    .cl-context-menu-item:disabled { opacity: 0.4; cursor: not-allowed; }
    .cl-context-menu-item.danger { color: #c62828; background: #fff; }
    .cl-context-menu-item.danger:hover:not(:disabled) { background: #ffebee; }
    .cl-context-menu-divider { height: 1px; background: #e5e7eb; margin: 1px 0; }

    /* ==================== 승인 팝업 ==================== */
    .cl-approval-popup {
        width: 860px;
        max-width: calc(100vw - 48px);
        background: #fff;
        border: 2px solid #333;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
    }
    .cl-approval-popup-title {
        text-align: center;
        font-size: 20px;
        font-weight: 900;
        padding: 18px 0 12px;
        letter-spacing: 8px;
        border-bottom: 3px double #333;
        color: #111;
    }
    .cl-approval-popup-body { padding: 16px 20px; }
    .cl-approval-popup-body.cl-approval-popup-body-split {
        display: flex;
        gap: 16px;
        align-items: stretch;
    }
    .cl-approval-panel {
        flex: 1;
        min-width: 0;
        border: 1px solid #d7d7d7;
        padding: 12px 14px;
        background: #fff;
    }
    .cl-approval-history-panel {
    }
    .cl-approval-field {
        display: flex;
        border-bottom: 1px solid #ccc;
        padding: 8px 0;
    }
    .cl-approval-field-label {
        width: 70px;
        font-weight: 700;
        font-size: 13px;
        color: #333;
        flex-shrink: 0;
    }
    .cl-approval-field-value { flex: 1; font-size: 13px; color: #111; }
    .cl-link-button {
        padding: 0;
        border: none;
        background: transparent !important;
        font: inherit;
        font-weight: 700;
        color: inherit;
        cursor: pointer;
    }
    .cl-link-button:hover { text-decoration: underline; }
    .cl-approval-stamp { display: flex; justify-content: center; padding: 16px 0 8px; }
    .cl-approval-stamp-circle {
        width: 70px; height: 70px;
        border: 3px solid #c62828; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        color: #c62828; font-weight: 900; font-size: 16px;
        transform: rotate(-15deg); letter-spacing: 2px;
    }
    .cl-approval-actions {
        display: flex; gap: 8px; padding: 12px 20px 16px; justify-content: center; border-top: 1px solid #eee;
    }
    .cl-approval-actions button {
        padding: 8px 24px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid #999; border-radius: 0;
    }
    .cl-approval-actions .approve-btn { background: #c62828; color: #fff; border-color: #c62828; }
    .cl-approval-actions .approve-btn:hover { background: #b71c1c; }
    .cl-approval-actions .approve-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .cl-approval-actions .cancel-btn { background: #f5f5f5; color: #333; }
    .cl-approval-history-title {
        margin-bottom: 10px;
        font-size: 15px;
        font-weight: 800;
        color: #1f2937;
    }
    .cl-history-month-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 480px;
        overflow: auto;
        padding-right: 2px;
    }
    .cl-history-month-card {
        border-radius: 10px;
    }
    .cl-history-month-card.is-current-month {
        padding: 4px;
        border: 2px solid #6f8fb3;
        background: #eef5fc;
        box-shadow: 0 0 0 3px rgba(111, 143, 179, 0.12);
    }
    .cl-history-month-card.is-current-month .cl-history-summary-table {
        border-color: #8ba7c5;
    }
    .cl-history-summary-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        background: #fff;
        border: 1px solid #d9dee6;
    }
    .cl-history-summary-table th,
    .cl-history-summary-table td {
        border: 1px solid #d9dee6;
        padding: 8px 6px;
        text-align: center;
    }
    .cl-history-summary-table__month {
        width: 120px;
        background: #eef3f8;
        color: #0f172a;
        font-size: 12px;
        font-weight: 800;
        line-height: 1.4;
    }
    .cl-history-current-month-badge {
        display: block;
        width: fit-content;
        margin: 5px auto 0;
        padding: 2px 7px;
        border-radius: 999px;
        background: #dbeafe;
        color: #315f91;
        font-size: 10px;
        font-weight: 800;
        line-height: 1.3;
    }
    .cl-history-summary-table__group {
        background: #f4f6f8;
        color: #334155;
        font-size: 11px;
        font-weight: 800;
    }
    .cl-history-summary-table__metric {
        background: #fff;
        color: #111827;
    }
    .cl-history-summary-table__metric strong {
        display: block;
        margin-top: 4px;
        font-size: 14px;
        font-weight: 800;
        color: #111827;
    }
    .cl-history-summary-table__metric strong.danger {
        color: #c62828;
    }
    .cl-history-summary-table__label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
    }
    .cl-history-entry-list {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: #f1f1f1;
        padding: 4px;
    }
    .cl-history-entry-item {
        padding: 4px 4px;
        font-size: 12px;
        border-top: 1px solid #d7dce3;
    }
    .cl-history-entry-item:first-child {
        border-top: none;
    }
    .cl-history-entry-item.is-approved {
    }
    .cl-history-entry-item.is-pending {
    }
    .cl-history-entry-head {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        color: #1f2937;
        font-weight: 700;
    }
    .cl-history-entry-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        line-height: 1.2;
    }
    .cl-history-entry-status.is-approved {
        background: #e8f3ec;
        color: #25663a;
    }
    .cl-history-entry-status.is-pending {
        background: #eceff3;
        color: #596579;
    }
    .cl-history-entry-reason {
        color: #526070;
        line-height: 1.4;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .cl-history-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 120px;
        font-size: 13px;
        color: #64748b;
        text-align: center;
        background: #fff;
        border: 1px dashed #d7dce3;
    }
    .cl-history-empty.small {
        min-height: 48px;
        border-style: solid;
        font-size: 12px;
        background: #fcfcfd;
    }
    .cl-history-popup {
        width: 720px;
        max-width: calc(100vw - 48px);
        background: #fff;
        border: 2px solid #333;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        font-family: 'Pretendard', 'Noto Sans KR', sans-serif;
    }
    .cl-history-popup-title {
        padding: 16px 20px 12px;
        border-bottom: 1px solid #d7dce3;
        font-size: 18px;
        font-weight: 800;
        color: #111827;
        text-align: center;
    }
    .cl-history-popup-body {
        padding: 16px 20px;
        background: #fafbfc;
    }

    /* ==================== 등록 팝업 ==================== */
    .cl-register-popup {
        width: 360px; background: #fff; border: 1px solid #999;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3); padding: 20px;
    }
    .cl-register-popup-title { font-size: 16px; font-weight: 700; margin-bottom: 16px; color: #333; }
    .cl-register-popup-info {
        font-size: 13px; color: #555; margin-bottom: 12px;
        padding: 8px 10px; background: #f8f8f8; border: 1px solid #e0e0e0;
    }
    .cl-register-popup textarea {
        width: 100%; min-height: 60px; padding: 8px; border: 1px solid #bbb;
        font-size: 13px; resize: vertical; box-sizing: border-box; margin-bottom: 12px;
    }
    .cl-register-popup-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .cl-register-popup-actions button { padding: 7px 18px; font-size: 13px; cursor: pointer; border: 1px solid #999; }
    .cl-register-popup-actions .submit-btn {
        background: #1976d2; color: #fff; border-color: #1565c0; font-weight: 600;
    }
    .cl-register-popup-actions .submit-btn:hover { background: #1565c0; }
`;
