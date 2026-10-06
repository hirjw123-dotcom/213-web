export const fitnessPageCss = `
    .fitness-page {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        overflow: hidden;
        background: var(--bg);
    }

    /* ─── 탭 바 ─── */
    .fit-tab-bar {
        display: flex;
        align-items: flex-end;
        gap: 2px;
        padding: 4px 10px 0;
        background: var(--c8);
        border-bottom: 2px solid var(--c5);
        flex-shrink: 0;
        flex-wrap: wrap;
    }
    .fit-tab-drag-wrap {
        display: flex;
    }
    .fit-tab-item {
        padding: 5px 14px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        background: var(--c7);
        border: 1px solid var(--c5);
        border-bottom: none;
        color: var(--c3);
        user-select: none;
        margin-bottom: -2px;
    }
    .fit-tab-item:hover { background: var(--c9); }
    .fit-tab-item.active {
        background: var(--c9);
        font-weight: 700;
        color: var(--c1);
        border-top: 2px solid var(--c1);
        z-index: 1;
    }
    .fit-tab-add {
        padding: 3px 10px;
        font-size: 15px;
        background: transparent;
        border: 1px dashed var(--c5);
        color: var(--c4);
        cursor: pointer;
        margin-bottom: -2px;
        line-height: 1;
    }
    .fit-tab-add:hover { background: var(--c8); color: var(--c2); }
    .fit-hidden-tabs {
        display: flex;
        gap: 4px;
        margin-left: 12px;
        align-items: center;
    }
    .fit-hidden-tab-btn {
        font-size: 10px;
        padding: 2px 6px;
        background: var(--c8);
        border: 1px solid var(--c6);
        color: var(--c4);
        cursor: pointer;
    }
    .fit-hidden-tab-btn:hover { background: var(--c7); color: var(--c2); }

    /* ─── 팝업 ─── */
    .fit-popup-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 5000;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .fit-popup {
        background: var(--c9);
        border: 1px solid var(--c2);
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        width: 320px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
    }
    .fit-popup-wide {
        width: 620px;
        max-width: 92vw;
    }
    .fit-popup-header {
        padding: 8px 14px;
        background: var(--c8);
        border-bottom: 1px solid var(--c5);
        font-weight: 700;
        font-size: 14px;
        flex-shrink: 0;
    }
    .fit-popup-body {
        padding: 12px 14px;
        overflow-y: auto;
        flex: 1;
    }
    .fit-popup-input {
        width: 100%;
        padding: 5px 8px;
        font-size: 13px;
        border: 1px solid var(--c5);
    }
    .fit-popup-footer {
        padding: 8px 14px;
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        border-top: 1px solid var(--c6);
        flex-shrink: 0;
    }

    /* ─── 탭편집 팝업 상세 ─── */
    .ftp-row { margin-bottom: 10px; }
    .ftp-label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 3px; color: var(--c2); }
    .ftp-input { width: 100%; padding: 5px 8px; font-size: 13px; border: 1px solid var(--c5); background: #fff; }
    .ftp-section-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--c2);
        padding: 6px 0 4px;
        border-bottom: 1px solid var(--c6);
        margin-bottom: 6px;
    }
    .ftp-cells { display: flex; flex-direction: column; gap: 6px; }
    .ftp-cell-card {
        border: 1px solid var(--c6);
        padding: 6px 8px;
        background: var(--c8);
    }
    .ftp-cell-top {
        display: flex;
        gap: 6px;
        align-items: center;
    }
    .ftp-cell-name {
        flex: 1;
        padding: 3px 6px;
        font-size: 12px;
        border: 1px solid var(--c5);
    }
    .ftp-cell-type {
        padding: 3px 4px;
        font-size: 11px;
        border: 1px solid var(--c5);
    }
    .ftp-cell-check {
        font-size: 11px;
        display: flex;
        align-items: center;
        gap: 3px;
        white-space: nowrap;
        cursor: pointer;
    }
    .ftp-cell-check input { margin: 0; }
    .ftp-cell-del {
        background: transparent;
        border: none;
        color: var(--c4);
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
        line-height: 1;
    }
    .ftp-cell-del:hover { color: #d32f2f; background: transparent; }
    .ftp-add-cell {
        font-size: 11px;
        padding: 4px 8px;
        background: var(--c9);
        border: 1px dashed var(--c5);
        color: var(--c3);
        cursor: pointer;
    }
    .ftp-add-cell:hover { background: var(--c8); }

    /* 등급 */
    .ftp-grades {
        margin-top: 4px;
        padding: 4px 0 4px 12px;
        border-top: 1px dashed var(--c6);
    }
    .ftp-grades-header {
        display: grid;
        grid-template-columns: 25px 50px 70px 60px 32px 30px 22px;
        gap: 3px;
        font-size: 10px;
        font-weight: 600;
        color: var(--c4);
        margin-bottom: 2px;
    }
    .ftp-grade-row {
        display: grid;
        grid-template-columns: 25px 50px 70px 60px 32px 30px 22px;
        gap: 3px;
        align-items: center;
        margin-bottom: 2px;
    }
    .ftp-grade-idx { font-size: 10px; color: var(--c4); text-align: center; }
    .ftp-grade-name { padding: 2px 4px; font-size: 11px; border: 1px solid var(--c6); width: 100%; }
    .ftp-grade-cond { padding: 2px 2px; font-size: 10px; border: 1px solid var(--c6); width: 100%; }
    .ftp-grade-val { padding: 2px 4px; font-size: 11px; border: 1px solid var(--c6); width: 100%; }
    .ftp-grade-color { width: 100%; height: 22px; padding: 0; border: 1px solid var(--c6); cursor: pointer; }
    .ftp-grade-del {
        background: transparent;
        border: none;
        color: var(--c5);
        cursor: pointer;
        font-size: 14px;
        padding: 0;
        line-height: 1;
    }
    .ftp-grade-del:hover { color: #d32f2f; background: transparent; }
    .ftp-grade-add {
        font-size: 10px;
        padding: 2px 8px;
        background: transparent;
        border: 1px dashed var(--c6);
        color: var(--c4);
        cursor: pointer;
        margin-top: 3px;
    }
    .ftp-grade-add:hover { color: var(--c2); }

    /* ─── 본문 ─── */
    .fit-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    /* ─── 테이블 영역 ─── */
    .fit-table-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
    }
    .fit-table-toolbar {
        display: flex;
        gap: 6px;
        padding: 4px 10px;
        background: var(--c8);
        border-bottom: 1px solid var(--c6);
        flex-shrink: 0;
        align-items: center;
    }
    .fit-table-toolbar button {
        font-size: 11px;
        padding: 2px 8px;
    }
    .fit-section-order-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        min-width: 0;
    }
    .fit-section-order-label {
        font-size: 11px;
        font-weight: 700;
        color: var(--c3);
        margin-left: 4px;
    }
    .fit-section-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: var(--c9);
        border: 1px solid var(--c6);
        border-radius: 999px;
        cursor: grab;
        user-select: none;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .fit-section-chip-name {
        font-size: 11px;
        font-weight: 700;
        color: var(--c2);
    }
    .fit-section-chip-meta {
        font-size: 10px;
        color: var(--c4);
    }
    .fit-hide-tab-btn { margin-left: auto; }
    .fit-table-scroll {
        flex: 1;
        overflow: auto;
        position: relative;
    }

    /* ─── 테이블 핵심 ─── */
    .fit-table {
        border-collapse: separate;
        border-spacing: 0;
        font-size: 12px;
        /* 자동 너비: 100% 아님 */
    }
    .fit-table thead {
        position: sticky;
        top: 0;
        z-index: 100;
    }
    .fit-table th {
        background: var(--c8);
        border: 1px solid #000;
        padding: 3px 4px;
        font-size: 11px;
        font-weight: 700;
        color: var(--c2);
        text-align: center;
        white-space: nowrap;
    }
    .fit-table td {
        border: 1px solid #000;
        padding: 0;
        text-align: center;
        white-space: nowrap;
    }
    /* 겹침 보더 제거 */
    .fit-table th + th,
    .fit-table td + td {
        border-left: none;
    }
    .fit-table tr + tr th,
    .fit-table tr + tr td {
        border-top: none;
    }

    /* sticky 열 */
    .fit-sticky-col {
        position: sticky;
        z-index: 50;
    }
    .fit-section-header-row th {
        color:#000 !important;

}
    .fit-col-num {
        left: 0;
        width: 28px;
        min-width: 28px;
        max-width: 28px;
        text-align: center;
        font-size: 11px;
        }
    .fit-col-name {
        left: 28px;
        width: 82px;
        min-width: 82px;
        max-width: 82px;
        text-align: left !important;
        padding-left: 5px !important;
        font-weight: 600;
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .fit-table td.fit-sticky-col { background: inherit; }
    .fit-table thead th.fit-sticky-col { z-index: 110; background: var(--c8); }

    /* 타입별 셀 너비 */
    .fit-col-cell { box-sizing: border-box; }
    .fit-type-is   { width: 72px; min-width: 72px; max-width: 72px; }
    .fit-type-his  { width: 72px; min-width: 72px; max-width: 72px; }
    .fit-type-count { width: 48px; min-width: 48px; max-width: 48px; }
    .fit-col-grade {
    background: #eee;
        width: 30px; min-width: 30px; max-width: 30px;
        font-weight: 700;
        font-size: 11px;
        padding: 0 2px !important;
    }

    /* 섹션(회차) 구분 두꺼운 우측선 */
    .fit-section-last {
        border-right: 3px solid var(--c3) !important;
    }

    /* 인풋 */
    .fit-cell-input {
        width: 100%;
        border: none;
        background: transparent;
        text-align: center;
        font-size: 11px;
        padding: 3px 1px;
        color: var(--c2);
        outline: none;
        font-family: inherit;
        box-sizing: border-box;
    }
    .fit-cell-input:focus {
        outline: 2px solid var(--accent);
        outline-offset: -1px;
    }
    .fit-cell-input::placeholder {
        color: var(--c6);
        font-size: 9px;
    }

    /* 회차 헤더 */
    .fit-section-header-row th {
        background: #E6EEF7;
        color: #000;
        font-size: 11px;
        padding: 2px 6px;
    }
    .fit-section-header { position: relative; }
    .fit-section-name-wrap {
        display: flex;
        align-items: center;
        gap: 3px;
        justify-content: center;
        position: relative;
    }
    .fit-section-name-input {
        background: transparent;
        border: none;
        color: #000;
        font-size: 11px;
        font-weight: 700;
        text-align: center;
        width: 50%;
        min-width: 150px;
        padding: 0 3px;
        font-family: inherit;
    }
    .fit-section-name-input:focus {
    }
    .fit-section-active-count {
        font-size: 10px;
        color: #355070;
        font-weight: 700;
        white-space: nowrap;
    }
    .fit-section-action-group {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .fit-section-action-btn {
        border: 1px solid #8aa4c0;
        background: rgba(255,255,255,0.78);
        color: #214261;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        cursor: pointer;
        white-space: nowrap;
    }
    .fit-section-action-btn.active,
    .fit-section-action-btn:hover {
        background: #214261;
        color: #fff;
    }
    .fit-section-cell-menu {
        position: absolute;
        top: calc(100% + 6px);
        right: 28px;
        width: 180px;
        max-height: 240px;
        overflow: auto;
        padding: 8px;
        background: #fff;
        border: 1px solid var(--c5);
        box-shadow: 0 10px 24px rgba(0,0,0,0.14);
        border-radius: 10px;
        z-index: 140;
    }
    .fit-section-cell-menu-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--c2);
        margin-bottom: 6px;
        text-align: left;
    }
    .fit-section-cell-option {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        padding: 4px 2px;
        cursor: pointer;
        color: var(--c2);
    }
    .fit-section-cell-option input { margin: 0; }
    .fit-section-cell-option.checked { font-weight: 700; }
    .fit-section-cell-color {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        flex-shrink: 0;
    }
    .fit-section-del {
        background: transparent;
        border: none;
        color: #000;
        cursor: pointer;
        font-size: 13px;
        padding: 0 3px;
        line-height: 1;
    }
    .fit-section-del:hover { color: #ff6b6b; background: transparent; }

    /* 중대 행 */
    .fit-unit-row td {

        background: var(--c8);
        font-weight: 700;
        font-size: 11px;
        padding: 3px 10px;
        text-align: left;
        border-bottom: 1px solid var(--c5);
    }
    .fit-unit-name { 
    
        position: sticky;
        left: 0;
        z-index: 100;
    font-size: 11px; }
    .fit-unit-count {
        font-size: 10px;
        color: var(--c4);
        margin-left: 6px;
        font-weight: 500;
    }

    /* 용사 행 */
    .fit-soldier-row td { height: 22px; }
    .fit-soldier-row:hover td, .fit-soldier-row:hover input:not(:focus) { filter: brightness(0.9) !important; }

    /* ─── 우측 패널 (필터, 요약, 차트) ─── */
    .fit-right-panel {
        width: 800px;
        position: relative;
        display: flex;
        flex-direction: column;
        border-left: 2px solid var(--c5);
        background: var(--c8);
        overflow: hidden;
    }
    .fit-resizer {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 6px;
        cursor: col-resize;
        z-index: 50;
    }
    .fit-resizer:hover {
        background: var(--c5);
    }
    .fit-filter-area {
        padding: 8px 10px;
        background: var(--c9);
        border-bottom: 2px solid var(--c6);
        flex-shrink: 0;
    }
    .fit-filter-top {
        margin-bottom: 8px;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding-bottom: 8px;
        border-bottom: 1px dashed var(--c6);
    }
    .fit-filter-cat-label {
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 3px;
        background: var(--c8);
        padding: 2px 6px;
        border: 1px solid var(--c6);
        border-radius: 2px;
    }
    .fit-filter-bottom {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }
    .fit-filter-unit-label {
        font-size: 11px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 3px;
        font-weight: 500;
    }

    .fit-right-content {
        display: flex;
        flex-direction: row;
        flex: 1;
        overflow: hidden;
    }
    .fit-summary-col {
        width: 350px;
        min-width:350px;
        display: flex;
        flex-direction: column;
        background: var(--c9);
        border-right: 1px solid var(--c6);
    }
    .fit-chart-col {
        flex:1;
        display: flex;
        flex-direction: column;
        background: var(--c9);
    }
    .fit-summary-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .fit-chart-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 10px;
        align-content: flex-start;
    }
    .fit-chart-card {
        border: 1px solid var(--c6);
        padding: 6px;
        background: var(--c9);
    }
    .fit-chart-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 180px;
        color: var(--c4);
        font-size: 12px;
        text-align: center;
        padding: 16px;
    }

    /* 요약 테이블 */
    .fit-summary-card {
        border: 1px solid var(--c6);
        padding: 8px;
        background: var(--c9);
    }
    .fit-summary-empty {
        font-size: 11px;
        color: var(--c4);
        padding: 6px 2px;
    }
    .fit-summary-title {
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 6px;
        color: var(--c2);
    }
    .fit-summary-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
    }
    .fit-summary-table th, .fit-summary-table td {
        padding: 3px 6px;
        border: 1px solid var(--c6);
        text-align: center;
    }
    .fit-summary-table th { background: var(--c8); font-weight: 700; }
    .fit-summary-event { text-align: left !important; font-weight: 600; }

    .fit-grade-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        padding: 4px 2px 0;
        justify-content: center;
    }
    .fit-grade-chip {
        font-size: 9px;
        padding: 1px 5px;
        border: 1px solid var(--c6);
        background: var(--c9);
    }
    .fit-popup-chart {
        width: min(1180px, 96vw);
        height: min(88vh, 900px);
    }
    .fit-popup-header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
    .fit-popup-subtitle {
        font-size: 11px;
        font-weight: 500;
        color: var(--c4);
        margin-top: 2px;
    }
    .fit-popup-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
    }
    .fit-popup-tab-btn {
        border: 1px solid var(--c5);
        background: var(--c9);
        color: var(--c3);
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
    }
    .fit-popup-tab-btn.active {
        background: var(--c1);
        color: #fff;
        border-color: var(--c1);
    }
    .fit-popup-chart-body {
        background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(245,248,252,0.95));
    }
    .fit-popup-chart-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 14px;
        align-items: start;
    }
    .fit-popup-chart-card {
        border: 1px solid var(--c6);
        background: #fff;
        padding: 10px;
        border-radius: 12px;
        box-shadow: 0 8px 18px rgba(0,0,0,0.06);
    }
    .fit-popup-chart-card-wide {
        grid-column: span 2;
    }
    .fit-popup-chart-title {
        font-size: 12px;
        font-weight: 800;
        color: var(--c2);
        margin-bottom: 8px;
    }
    .fit-popup-chart-frame {
        height: 280px;
        background: #fff;
        border: 1px solid var(--c6);
        padding: 4px;
    }

    @media (max-width: 900px) {
        .fit-popup-chart-card-wide {
            grid-column: span 1;
        }
        .fit-section-name-wrap {
            flex-wrap: wrap;
            justify-content: flex-start;
        }
    }
`;
