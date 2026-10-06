export const companySchedulesCss = `
/* ======== CompanySchedules 루트 ======== */
.company-schedules {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    overflow: hidden;
    --cs-main-bg: var(--c8);
    --cs-wrap-bg: #fff;
    --cs-wrap-padding: 20px;
    --cs-wrap-radius: 16px;
    --cs-wrap-shadow: none;
    --cs-table-border: 2px solid #000;
    --cs-table-radius: 8px;
    --cs-table-shadow: 0 1px 3px rgba(0,0,0,0.12);
    --cs-weekday-bg: #000;
    --cs-weekday-color: #fff;
    --cs-sunday-color: #ffb8b8;
    --cs-saturday-color: #a8d4ff;
    --cs-day-bg: var(--c9);
    --cs-day-border: 2px solid var(--c1);
    --cs-other-month-bg: #f7f7f7;
    --cs-title-color: var(--c2);
    --cs-week-summary-bg: #f5f7fa;
    --cs-week-summary-border: 2px solid var(--c1);
    --cs-week-summary-title: #111827;
    --cs-week-summary-text: #334155;
    --cs-week-summary-muted: #64748b;
}

.company-schedules.cs-theme-theme1,
.cs-calendar-wrap-theme1 {
    --cs-main-bg: var(--c8);
    --cs-wrap-bg: #fff;
    --cs-wrap-padding: 20px;
    --cs-wrap-radius: 16px;
    --cs-wrap-shadow: none;
    --cs-table-border: 2px solid #000;
    --cs-table-radius: 8px;
    --cs-table-shadow: 0 1px 3px rgba(0,0,0,0.12);
    --cs-weekday-bg: #000;
    --cs-weekday-color: #fff;
    --cs-sunday-color: #ffb8b8;
    --cs-saturday-color: #a8d4ff;
    --cs-day-bg: var(--c9);
    --cs-day-border: 2px solid var(--c1);
    --cs-other-month-bg: #f7f7f7;
    --cs-title-color: var(--c2);
    --cs-week-summary-bg: #f5f7fa;
    --cs-week-summary-border: 2px solid var(--c1);
    --cs-week-summary-title: #111827;
    --cs-week-summary-text: #334155;
    --cs-week-summary-muted: #64748b;
}

.company-schedules.cs-theme-theme2,
.cs-calendar-wrap-theme2 {
    --cs-main-bg: #eef3f7;
    --cs-wrap-bg: #fffdfa;
    --cs-wrap-padding: 18px;
    --cs-wrap-radius: 12px;
    --cs-wrap-shadow: 0 8px 24px rgba(52, 84, 104, 0.08);
    --cs-table-border: 1px solid #8ea3b7;
    --cs-table-radius: 10px;
    --cs-table-shadow: none;
    --cs-weekday-bg: #dde6ee;
    --cs-weekday-color: #22313f;
    --cs-sunday-color: #9f2f2f;
    --cs-saturday-color: #2c5f8f;
    --cs-day-bg: #fffefa;
    --cs-day-border: 1px solid #8ea3b7;
    --cs-other-month-bg: #f5f3ef;
    --cs-title-color: #22313f;
    --cs-week-summary-bg: #f2ede4;
    --cs-week-summary-border: 1px solid #8ea3b7;
    --cs-week-summary-title: #433422;
    --cs-week-summary-text: #5f4b37;
    --cs-week-summary-muted: #8c745e;
}

.company-schedules.cs-theme-theme3,
.cs-calendar-wrap-theme3 {
    --cs-main-bg: #edf1f3;
    --cs-wrap-bg: #fff;
    --cs-wrap-padding: 22px 24px;
    --cs-wrap-radius: 6px;
    --cs-wrap-shadow: none;
    --cs-table-border: 1px solid #6b7280;
    --cs-table-radius: 0;
    --cs-table-shadow: none;
    --cs-weekday-bg: #f3f4f6;
    --cs-weekday-color: #111827;
    --cs-sunday-color: #9b1c1c;
    --cs-saturday-color: #1d4f91;
    --cs-day-bg: #fff;
    --cs-day-border: 1px solid #9ca3af;
    --cs-other-month-bg: #f7f7f7;
    --cs-title-color: #111827;
    --cs-week-summary-bg: #f6f6f6;
    --cs-week-summary-border: 1px solid #9ca3af;
    --cs-week-summary-title: #111827;
    --cs-week-summary-text: #374151;
    --cs-week-summary-muted: #6b7280;
}

/* 헤더 */
.cs-header {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 20px;
    background: var(--c9);
    border-bottom: 1px solid var(--c6);
    flex-shrink: 0;
}
.cs-header .cs-unit-btns {
    display: flex;
    gap: 3px;
}
.cs-header .cs-unit-btn {
    padding: 5px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--c6);
    background: var(--c9);
    color: var(--c3);
    transition: all .12s;
}
.cs-header .cs-unit-btn:hover { background: var(--c8); }
.cs-header .cs-unit-btn.active {
    background: var(--c1);
    color: #fff;
    border-color: var(--c1);
}
.cs-header .cs-theme-btns {
    display: flex;
    gap: 4px;
}
.cs-header .cs-theme-btn {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid var(--c6);
    background: var(--c9);
    color: var(--c3);
    transition: all .12s;
}
.cs-header .cs-theme-btn:hover { background: var(--c8); }
.cs-header .cs-theme-btn.active {
    background: var(--c2);
    color: #fff;
    border-color: var(--c2);
}
.cs-header .cs-sep {
    width: 1px;
    height: 24px;
    background: var(--c6);
    margin: 0 6px;
}
.cs-header .cs-nav-btn {
    width: 30px; height: 30px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px;
    background: var(--c9);
    border: 1px solid var(--c6);
    cursor: pointer; color: var(--c3); padding: 0;
}
.cs-header .cs-nav-btn:hover { background: var(--c8); }
.cs-header .cs-month-title {
    font-size: 16px; font-weight: 700; color: var(--c2);
    min-width: 120px; text-align: center;
}
.cs-header .cs-today-btn {
    padding: 5px 12px; font-size: 12px; font-weight: 600;
    background: var(--c9); border: 1px solid var(--c6);
    cursor: pointer; color: var(--c3);
}
.cs-header .cs-today-btn:hover { background: var(--c8); }
.cs-header .cs-print-btn {
    padding: 5px 12px; font-size: 12px; font-weight: 600;
    background: var(--c9); border: 1px solid var(--c6);
    cursor: pointer; color: var(--c3); margin-left: 4px;
}
.cs-header .cs-print-btn:hover { background: var(--c8); }

/* 본문 레이아웃: 좌(달력) + 우(옵션) */
.cs-body {
    flex: 1;
    display: flex;
    overflow: hidden;
}
.cs-main {
    flex: 1;
    overflow: auto;
    padding: 16px 20px 32px;
    background: var(--cs-main-bg);
}
.cs-sidebar {
    width: 300px;
    min-width: 300px;
    border-left: 1px solid var(--c6);
    background: var(--c9);
    overflow-y: auto;
}

/* ======== MonthCalendar ======== */
.cs-calendar-wrap {
    max-width: 1100px;
    margin: 0 auto;
    background: var(--cs-wrap-bg);
    padding: var(--cs-wrap-padding);
    border-radius: var(--cs-wrap-radius) !important;
    box-shadow: var(--cs-wrap-shadow);
}
.cs-calendar {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    overflow: hidden;
    border: var(--cs-table-border) !important;
    border-radius: var(--cs-table-radius) !important;
    box-shadow: var(--cs-table-shadow);
}
.cs-calendar-title {
margin-top:-12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 16px;
    font-weight: 700;
    color: var(--cs-title-color);
    padding: 0px 0 14px;
}
.cs-calendar-title-unit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    padding: 4px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(148, 163, 184, 0.45);
    color: var(--cs-title-color);
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
}
.cs-calendar-title-text {
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.03em;
}
.cs-calendar th {
    background: var(--cs-weekday-bg);
    padding: 7px 4px;
    font-weight: 600; font-size: 13px;
    text-align: center; color: var(--cs-weekday-color); letter-spacing: 1px;
}
.cs-calendar th.sunday {
color: var(--cs-sunday-color);
}
.cs-calendar th.saturday { color: var(--cs-saturday-color); }
.cs-week-summary-head {
    width: 100px;
}

/* 날짜 셀 */
.cs-day-cell {
    border: var(--cs-day-border);
    vertical-align: top;
    min-height: 80px; height: 80px;
    position: relative;
    background: var(--cs-day-bg);
    padding: 0;
}
.cs-day-cell.other-month { background: var(--cs-other-month-bg); opacity:.5 }
.cs-day-cell.other-month * { opacity: 1; }
.cs-day-cell.saturday { /*background: #f6f9ff; */ }
.cs-day-cell.sunday,
.cs-day-cell.holiday { /*background: #fff6f6;  */ }
.cs-day-cell.today.deletedcss {
    outline: 2px solid var(--accent) !important;
    outline-offset: -2px; z-index: 1;
}
.cs-day-num {
    font-size: 14px; font-weight: 700; color: var(--c3);
    padding:4px;
    line-height: 1; display: inline-block;
}
.cs-day-num.has-month {
    font-size: 12px;
}
.cs-day-cell.sunday .cs-day-num { color: #c62828; }
.cs-day-cell.saturday .cs-day-num { color: #1565c0; }
.cs-day-cell.holiday .cs-day-num { color: #c62828; }
.cs-day-cell.today.deletedcss .cs-day-num {
    background: var(--accent); color: #fff;
    padding: 2px 5px; font-size: 11px;
}
.cs-holiday-badge {
    position: absolute; top: 3px; right: 4px;
    font-size: 9px; color: #c62828; font-weight: 700;
}
.cs-week-summary-cell {
    border: var(--cs-week-summary-border);
    background: var(--cs-week-summary-bg);
    vertical-align: top;
    padding: 8px 10px;
}
.cs-week-summary-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 56px;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255,255,255,0.7);
    color: var(--cs-week-summary-title);
    font-size: 12px;
    font-weight: 700;
}
.cs-week-summary-range {
    margin-top: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--cs-week-summary-muted);
}
.cs-week-summary-content {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.cs-week-summary-line {
    font-size: 12px;
    line-height: 1.35;
    color: var(--cs-week-summary-text);
    font-weight: 700;
    word-break: keep-all;
    overflow: hidden;
    text-overflow: ellipsis;
}
.cs-week-summary-empty {
    margin-top: 10px;
    font-size: 11px;
    color: var(--cs-week-summary-muted);
}
/* 일간 일정: 날짜 숫자 우측 ~ 셀 끝 */
.cs-daily-text {
    position: absolute;
    top: 5px; left: 28px; right: 4px;
    font-size: 11px; line-height: 1.3; color: var(--c2);
    font-weight: 600; word-break: break-all;
    max-height: 48px; overflow: hidden;
    pointer-events: none;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.cs-event-tag {
    display: inline-block;
    font-size: 10px; padding: 1px 4px; margin-top: 1px;
    background: #e8f5e9; color: #2e7d32; font-weight: 600;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 100%;
}

/* 출타 바 - 셀 내부 하단 영역 */
.cs-leave-area {
    position: relative; width: 100%;
    margin-top: 2px;
}
.cs-leave-bar {
    position: absolute;
    left: 0px; right: 0px;
    height: 18px;
    display: flex; align-items: center;
    font-size: 12px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    z-index: 1;
    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
}
.cs-leave-bar.is-range-start { left: 6px; border-radius: 6px 0 0 6px; }
.cs-leave-bar.is-range-end { right: 6px; border-radius: 0 6px 6px 0; }
.cs-leave-bar.is-range-start.is-range-end { border-radius: 6px; }
.cs-leave-bar.is-range-start .cs-leave-label { padding-left: 4px; }
.cs-leave-label {
    overflow: hidden; text-overflow: ellipsis;
}
/* 주간 일정 바 */
.cs-leave-bar.is-weekly {
    font-size: 12px;
    border-top: 1px solid #b8d4ec !important;
    border-bottom: 1px solid #b8d4ec !important;
    box-shadow: 0 1px 2px rgba(25,118,210,0.12);
}
.cs-leave-bar.is-weekly.is-start { border-left: 1px solid #b8d4ec !important; }
.cs-leave-bar.is-weekly.is-end { border-right: 1px solid #b8d4ec !important; }
.cs-leave-bar.is-company-outing {
    box-shadow: 0 1px 2px rgba(120, 53, 15, 0.18);
}

/* 근무자 영역 */
.cs-duty-sep {
    border-top: 1px dashed #cbd5e1;
    margin: 2px 0 1px;
}
.cs-duty-area {
    display: flex; flex-direction: column; gap: 1px;
}
.cs-duty-box {
    display: flex; flex-wrap: wrap; gap: 1px 3px;
    padding: 1px 3px;
    font-size: 12px; font-weight: 700;
    line-height: 1.3;
}
.cs-duty-day {
    background: #eff6ff; color: #1d4ed8;
    }
    .cs-duty-night {
        background: #fef2f2; color: #000;
}

/* 열외자 영역 */
.cs-excl-sep {
    border-top: 1px dashed #e2e8f0;
    margin: 2px 0 1px;
}
.cs-excl-area {
    display: flex; flex-direction: column; gap: 1px;
}
.cs-excl-box {
    display: flex; flex-wrap: wrap; gap: 1px 3px;
    padding: 1px 3px;
    background: #fffcf0;
    font-size: 12px; font-weight: 700;
    line-height: 1.3;
}
.cs-excl-reason {
    color: #92400e;
}
.cs-excl-name {
    color: #451a03;
}

/* 생일 */
.cs-birthday {
    display: flex; flex-wrap: wrap; gap: 1px 3px;
    padding: 1px 3px;
    font-size: 10px; font-weight: 700;
    line-height: 1.3;
    background: #fef3c7;
    color: #92400e;
}
.cs-birthday-icon {
    font-size: 11px;
}
.cs-birthday-name {
    color: #78350f;
}

/* ======== OptionManage ======== */
.cs-option-manage { padding: 12px; }
.cs-opt-title {
    font-size: 14px; font-weight: 700; margin: 0 0 10px;
    padding-bottom: 8px; border-bottom: 1px solid var(--c6);
}
.cs-opt-form {
    padding: 10px; margin-bottom: 12px;
    border: 1px solid var(--c7); background: var(--c8);
}
.cs-opt-row {
    display: flex; align-items: center; gap: 6px;
    margin-bottom: 6px; font-size: 12px;
}
.cs-opt-row label {
    min-width: 36px; font-weight: 600; color: var(--c3); font-size: 12px;
}
.cs-opt-row select, .cs-opt-row input {
    font-size: 12px; padding: 3px 6px;
    border: 1px solid var(--c6); background: var(--c9);
}
.cs-date-inputs {
    display: flex; align-items: center; gap: 2px; font-size: 12px;
}
.cs-opt-list { display: flex; flex-direction: column; gap: 4px; }
.cs-opt-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 8px; border: 1px solid var(--c7);
    background: var(--c9); font-size: 12px;
}
.cs-opt-item-info { display: flex; flex-direction: column; gap: 1px; }
.cs-opt-item-label { font-weight: 600; color: var(--c2); }
.cs-opt-item-date { font-size: 11px; color: var(--c4); }
.cs-opt-del-btn {
    width: 22px; height: 22px;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; background: none; border: 1px solid var(--c7);
    cursor: pointer; color: var(--c4); padding: 0;
}
.cs-opt-del-btn:hover { background: #fee; color: var(--err); border-color: var(--err); }

/* 편집 가능한 이벤트 아이템 */
.cs-opt-item-edit {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
}
.cs-opt-item-edit .cs-opt-del-btn {
    align-self: flex-end;
    margin-top: -22px;
}
.cs-opt-item-fields {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
}
.cs-opt-item-label-input {
    width: 100%;
    font-size: 12px;
    font-weight: 600;
    padding: 3px 6px;
    border: 1px solid var(--c6);
    background: var(--c9);
    box-sizing: border-box;
}
.cs-opt-item-dates {
    display: flex;
    align-items: center;
    gap: 1px;
    font-size: 11px;
    color: var(--c4);
}
.cs-opt-item-dates input {
    font-size: 11px;
    padding: 2px;
    border: 1px solid var(--c7);
    background: var(--c9);
    text-align: center;
}

/* 이벤트 바 (달력용) */
.cs-event-bar {
    position: absolute;
    left: 0px; right: 0px;
    height: 18px;
    display: flex; align-items: center;
    font-size: 12px; font-weight: 700;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    z-index: 1;
    background: #e8f5e9;
    color: #2e7d32;
    box-shadow: 0 1px 2px rgba(0,0,0,0.12);
}
.cs-event-bar.is-range-start { left: 6px; border-radius: 6px 0 0 6px; }
.cs-event-bar.is-range-end { right: 6px; border-radius: 0 6px 6px 0; }
.cs-event-bar.is-range-start.is-range-end { border-radius: 6px; }
.cs-event-bar.is-range-start .cs-event-label { padding-left: 4px; }
.cs-event-label {
    overflow: hidden; text-overflow: ellipsis;
}

.cs-calendar-theme2 .cs-leave-bar,
.cs-calendar-theme2 .cs-event-bar {
    box-shadow: none;
}

.cs-calendar-theme3 .cs-daily-text {
    font-weight: 500;
    color: #4b5563;
}

.cs-calendar-theme3 .cs-leave-bar,
.cs-calendar-theme3 .cs-event-bar,
.cs-calendar-theme3 .cs-duty-box,
.cs-calendar-theme3 .cs-excl-box,
.cs-calendar-theme3 .cs-birthday {
    box-shadow: none;
    border-radius: 0 !important;
}

/* ======== FilterPanel ======== */
.cs-filter-panel {
    padding: 12px;
    border-top: 1px solid var(--c6);
}
.cs-filter-presets {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 10px;
}
.cs-filter-preset-btn {
    width: 100%;
    padding: 7px 10px;
    border: 1px solid var(--c6);
    background: var(--c8);
    color: var(--c2);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    text-align: left;
}
.cs-filter-preset-btn:hover {
    background: var(--c7);
}
.cs-filter-title {
    font-size: 14px; font-weight: 700; margin: 0 0 10px;
    padding-bottom: 8px; border-bottom: 1px solid var(--c6);
}
.cs-filter-all {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; font-weight: 600; color: var(--c3);
    padding: 4px 0; margin-bottom: 4px;
    border-bottom: 1px solid var(--c7);
    cursor: pointer; user-select: none;
}
.cs-filter-item {
    display: flex; align-items: center; gap: 6px;
    font-size: 12px; color: var(--c2);
    padding: 3px 0;
    cursor: pointer; user-select: none;
}
.cs-filter-item input, .cs-filter-all input {
    margin: 0; cursor: pointer;
}

.cs-ctx-overlay {
    position: fixed;
    inset: 0;
    z-index: 9998;
}

.cs-ctx-menu {
    position: fixed;
    min-width: 200px;
    padding: 8px;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.14);
    border-radius: 10px;
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
    z-index: 9999;
}

.cs-ctx-header {
    padding: 6px 8px 10px;
    font-size: 12px;
    font-weight: 700;
    color: var(--c2);
    border-bottom: 1px solid var(--c7);
    margin-bottom: 6px;
}

.cs-ctx-item {
    width: 100%;
    display: block;
    text-align: left;
    padding: 8px 10px;
    border: 0;
    background: transparent;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--c2);
    cursor: pointer;
}

.cs-ctx-item:hover {
    background: #f8fafc;
}

.cs-ctx-item.active {
    color: #92400e;
    background: #fffbeb;
}

.cs-ctx-item.disabled,
.cs-ctx-item:disabled {
    color: #94a3b8;
    cursor: not-allowed;
    background: transparent;
}

/* ======== WeekPanel ======== */
.cs-week-panel {
    padding: 12px;
    border-top: 1px solid var(--c6);
}
.cs-week-title {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--c6);
}
.cs-week-actions {
    display: flex;
    gap: 6px;
    margin-bottom: 10px;
}
.cs-week-action-btn {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--c6);
    background: var(--c8);
    color: var(--c2);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}
.cs-week-action-btn:hover {
    background: var(--c7);
}
.cs-week-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
}
.cs-week-item {
    display: grid;
    grid-template-columns: 16px 58px 1fr;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    border: 1px solid var(--c7);
    background: var(--c9);
    font-size: 12px;
    color: var(--c2);
    cursor: pointer;
}
.cs-week-item input {
    margin: 0;
    cursor: pointer;
}
.cs-week-item-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--c8);
    color: var(--c3);
    font-weight: 700;
}
.cs-week-item-badge.is-current-month {
    background: #eff6ff;
    color: #1d4ed8;
}
.cs-week-item-range {
    color: var(--c4);
    font-weight: 600;
}
.cs-calendar-empty {
    max-width: 1100px;
    margin: 0 auto;
    padding: 32px 20px;
    text-align: center;
    color: var(--c4);
    background: var(--cs-wrap-bg);
    border-radius: var(--cs-wrap-radius);
}

`;
