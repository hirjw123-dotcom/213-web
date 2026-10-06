export const battalionSchedulesCss = `
    .battalion-schedules {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: var(--c8);
    }

    .bs-header {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 14px 20px;
        background: var(--c9);
        border-bottom: 1px solid var(--c6);
        flex-shrink: 0;
    }
    .bs-header .nav-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        background: var(--c9);
        border: 1px solid var(--c6);
        cursor: pointer;
        color: var(--c3);
        transition: all 0.15s;
        padding: 0;
    }
    .bs-header .nav-btn:hover {
        background: var(--c8);
        border-color: var(--c5);
        color: var(--c2);
    }
    .bs-header .month-title {
        font-size: 17px;
        font-weight: 700;
        color: var(--c2);
        min-width: 130px;
        text-align: center;
        letter-spacing: 0.5px;
    }
    .bs-header .today-btn {
        margin-left: 6px;
        padding: 5px 12px;
        font-size: 12px;
        font-weight: 600;
        background: var(--c9);
        border: 1px solid var(--c6);
        cursor: pointer;
        color: var(--c3);
        transition: all 0.15s;
    }
    .bs-header .today-btn:hover {
        background: var(--c8);
        border-color: var(--c5);
        color: var(--c2);
    }
    .bs-header .today-btn.is-current {
        background: var(--c1);
        color: #fff;
        border-color: var(--c1);
    }
    .bs-header .legend {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-left: 20px;
        font-size: 12px;
        color: var(--c4);
    }
    .bs-header .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .bs-header .legend-box {
        width: 12px;
        height: 12px;
        border: 1px solid var(--c6);
    }
    .bs-header .legend-box.daily {
        background: #fffde7;
    }
    .bs-header .legend-box.weekly {
        background: #dceefa;
    }

    .bs-body {
        flex: 1;
        overflow: auto;
        padding: 20px 24px 32px;
    }
    .bs-body-inner {
        margin:0 auto;
        width: 100%;
        max-width: 1080px;
        border-radius: 8px !important;
        padding:20px;
        background: #fff;
        border: 1px solid #cdd6e0;
    }

    .bs-calendar {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
        border-radius: 0 !important;
        overflow: hidden;
        background: #aeb8c2;
        padding: 1px;
    }

    .bs-calendar th {
        background: #eef3f7;
        padding: 10px 4px;
        font-weight: 600;
        font-size: 13px;
        text-align: center;
        color: #2f3d4d;
        letter-spacing: 0;
        border-bottom: 1px solid #aeb8c2;
    }
    .bs-calendar th.sunday {
        color: #ffb8b8;
    }
    .bs-calendar th.saturday {
        color: #a8d4ff;
    }

    .bs-calendar .day-cell {
        border-right: 1px solid #aeb8c2;
        border-bottom: 1px dashed #b1c1d1;
        vertical-align: top;
        min-height: 86px;
        background: #fff;
        transition: background 0.12s;
    }
    .bs-calendar .day-cell.other-month {
        background: #fafafa;
    }
    .bs-calendar .day-cell.other-month .day-num,
    .bs-calendar .day-cell.other-month .day-input {
        opacity: 0.35;
    }
    .bs-calendar .day-cell.saturday {
        background: #fff;
    }
    .bs-calendar .day-cell.sunday {
        background: #fff;
    }
    .bs-calendar .day-cell.holiday {
        background: #fff;
    }
    .bs-calendar .day-cell.today {
        background: #fffef6;
    }

    .day-cell-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 8px 8px 0;
        min-height: 24px;
        pointer-events: none;
    }

    .day-num {
        font-size: 12px;
        font-weight: 700;
        color: var(--c3);
        z-index: 1;
        line-height: 1;
    }
    .day-cell.sunday .day-num {
        color: #c62828;
    }
    .day-cell.saturday .day-num {
        color: #1565c0;
    }
    .day-cell.holiday .day-num {
        color: #c62828;
    }
    .day-cell.today .day-num {
        color: #c77f00;
    }

    .day-input-wrap {
        padding: 2px 6px 6px;
    }

    .day-input {
        display: block;
        width: 100%;
        min-height: 50px;
        padding: 0;
        border: 1px solid transparent;
        background: transparent;
        border-radius: 0;
        font-size: 12px;
        resize: none;
        overflow: hidden;
        box-sizing: border-box;
        font-family: inherit;
        line-height: 1.45;
        color: var(--c2);
        font-weight: 500;
        transition: background 0.12s, border-color 0.12s;
    }
    .day-input::placeholder {
        color: #a1acb8;
        font-weight: 400;
    }
    .day-input:hover {
        background: #fafbfd;
        border-color: #d7dee6;
    }
    .day-input:focus {
        background: #fff;
        border-color: #8eb7dc;
        outline: none;
    }

    .bs-calendar .week-schedule-row td {
        background: #fff;
        padding: 0;
        border-right: 1px solid #aeb8c2;
        border-bottom: 4px solid #738ba3;
    }

    .bs-calendar .week-schedule-row .week-summary-cell {
        padding: 0;
        background: #eaf1f8;
    }

    .week-panel {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 42px;
        padding: 6px 10px 6px 12px;
        border: 0;
        border-radius: 0;
        background: transparent;
    }

    .week-panel-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 210px;
        flex-wrap: wrap;
        color: #627284;
    }

    .week-label-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: auto;
        height: 22px;
        padding: 0 10px;
        border-radius: 11px;
        background: #4a7faa;
        color: #fff;
        border: 0;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.3px;
    }

    .week-range-text {
        font-size: 12px;
        color: #8493a3;
        font-weight: 500;
    }

    .week-panel-title {
        display: flex;
        align-items: center;
        font-size: 12px;
        color: #445568;
        font-weight: 600;
        letter-spacing: 0;
    }
    .week-panel-title::before {
        content: '↑';
        display: inline-block;
        margin-right: 4px;
        color: #5b93c7;
        font-weight: 800;
        font-size: 14px;
    }

    .week-input-shell {
        flex: 1;
        min-width: 0;
    }

    .week-input {
        width: 100%;
        height: 34px;
        border: 1px solid #ccd6df;
        background: #fff;
        padding: 0 10px;
        font-size: 12px;
        font-weight: 500;
        font-family: inherit;
        color: #334155;
        text-align: left;
        border-radius: 4px;
        transition: background 0.12s, border-color 0.12s;
    }
    .week-input::placeholder {
        color: #9ca8b5;
        font-weight: 400;
    }
    .week-input:hover {
        border-color: #bcc8d4;
        background: #fcfdff;
    }
    .week-input:focus {
        background: #fff;
        border-color: #8eb7dc;
        outline: none;
    }

    .holiday-badge {
        font-size: 9px;
        color: #c62828;
        font-weight: 600;
        z-index: 1;
        letter-spacing: 0;
        background: transparent;
        border: 0;
        border-radius: 0;
        padding: 0;
    }

    .bs-calendar tr > *:last-child {
        border-right: 0;
    }

`;
