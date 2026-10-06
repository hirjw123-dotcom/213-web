export const tabBackupDbCss = `
    .bk-root {
        display: flex;
        flex-direction: column;
        gap: 0;
        max-width: 980px;
        border: 1px solid #d6dbe3;
        background: #fff;
    }

    /* ── 섹션 헤더 ── */
    .bk-section-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 16px;
        height: 36px;
        background: #f5f6f8;
        color: #2d3b52;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
        border-bottom: 1px solid #d6dbe3;
    }
    .bk-section-header.danger {
        background: #f5f6f8;
        border-bottom-color: #d6dbe3;
    }
    .bk-section-header.log {
        background: #f5f6f8;
        border-bottom-color: #d6dbe3;
    }
    .bk-section-header .bk-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        background: #edf1f6;
        border: 1px solid #cdd5e1;
        font-size: 11px;
        font-weight: 700;
        color: #34445f;
    }

    /* ── 경고 카드 (권한 없음 / 백업DB 모드) ── */
    .bk-warning-card {
        padding: 24px 20px;
        border-bottom: 1px solid #d6dbe3;
    }
    .bk-section-title {
        font-size: 15px;
        font-weight: 700;
        color: #22314a;
        margin-bottom: 6px;
    }
    .bk-desc {
        font-size: 13px;
        color: #5c6675;
        line-height: 1.6;
    }
    .bk-current-user {
        margin-top: 10px;
        display: inline-block;
        padding: 4px 10px;
        background: #fafbfc;
        border: 1px solid #d6dbe3;
        font-size: 13px;
        font-weight: 600;
        color: #31415d;
    }

    /* ── 피드백 바 ── */
    .bk-feedback {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px;
        border-bottom: 1px solid #d6dbe3;
        background: #fafbfc;
        color: #31415d;
        font-size: 13px;
        font-weight: 600;
    }
    .bk-feedback::before {
        content: '●';
        font-size: 8px;
        color: #50627f;
        flex-shrink: 0;
    }

    /* ── 그리드 (백업 / 복원) ── */
    .bk-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }
    .bk-card {
        display: flex;
        flex-direction: column;
        gap: 0;
        border-right: 1px solid #d6dbe3;
        border-bottom: 1px solid #d6dbe3;
    }
    .bk-card:last-child {
        border-right: none;
    }
    .bk-card-body {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 16px;
    }

    /* ── 입력 행 ── */
    .bk-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .bk-field > span {
        font-size: 11px;
        font-weight: 700;
        color: #556171;
        letter-spacing: 0.03em;
        text-transform: uppercase;
    }
    .bk-field input {
        height: 34px;
        padding: 0 10px;
        border: 1px solid #cfd5dd;
        background: #fff;
        font-size: 13px;
        color: #253246;
        outline: none;
        width: 100%;
        box-sizing: border-box;
    }
    .bk-field input[type="file"] {
        height: auto;
        padding: 6px 8px;
        cursor: pointer;
    }
    .bk-field input:focus {
        border-color: #7e8ca3;
        background: #fff;
        box-shadow: inset 0 0 0 1px #7e8ca3;
    }
    .bk-file-name {
        font-size: 11px;
        color: #7a8391;
        padding: 2px 0;
        min-height: 16px;
    }

    /* ── 버튼 ── */
    .bk-primary-btn,
    .bk-danger-btn {
        height: 36px;
        border: 1px solid #35465f;
        font-size: 13px;
        font-weight: 700;
        color: #fff;
        cursor: pointer;
        letter-spacing: 0.04em;
        margin-top: 4px;
    }
    .bk-primary-btn {
        background: #3a495f;
    }
    .bk-primary-btn:hover:not(:disabled) {
        background: #44566f;
    }
    .bk-danger-btn {
        background: #3a495f;
    }
    .bk-danger-btn:hover:not(:disabled) {
        background: #44566f;
    }
    .bk-primary-btn:disabled,
    .bk-danger-btn:disabled {
        opacity: 0.5;
        cursor: default;
    }

    /* ── 복원 기록 테이블 ── */
    .bk-log-card {
        border-bottom: 1px solid #d6dbe3;
    }
    .bk-log-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }
    .bk-log-table thead tr {
        background: #f7f8fa;
        border-bottom: 1px solid #d6dbe3;
    }
    .bk-log-table thead th {
        padding: 8px 12px;
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        color: #576273;
        letter-spacing: 0.04em;
        white-space: nowrap;
    }
    .bk-log-table tbody tr {
        border-bottom: 1px solid #e3e7ed;
    }
    .bk-log-table tbody tr:last-child {
        border-bottom: none;
    }
    .bk-log-table tbody tr:nth-child(odd) {
        background: #fcfcfd;
    }
    .bk-log-table tbody tr:nth-child(even) {
        background: #fff;
    }
    .bk-log-table td {
        padding: 9px 12px;
        color: #29364a;
        vertical-align: middle;
    }
    .bk-log-name {
        font-weight: 700;
        color: #2f3d54;
        white-space: nowrap;
    }
    .bk-log-id {
        font-size: 11px;
        color: #7a8391;
        margin-top: 1px;
    }
    .bk-log-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 22px;
        padding: 0 8px;
        background: #edf1f6;
        border: 1px solid #cdd5e1;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        color: #33445d;
    }
    .bk-empty {
        padding: 32px 16px;
        text-align: center;
        color: #7a8391;
        font-size: 13px;
        border-top: 1px solid #e3e7ed;
    }
    .bk-loading {
        padding: 48px 16px;
        text-align: center;
        color: #7a8391;
        font-size: 13px;
        border: 1px solid #d6dbe3;
        background: #fff;
    }

    @media (max-width: 680px) {
        .bk-grid {
            grid-template-columns: 1fr;
        }
        .bk-card {
            border-right: none;
        }
        .bk-log-table thead th:nth-child(3),
        .bk-log-table tbody td:nth-child(3) {
            display: none;
        }
    }
`;
