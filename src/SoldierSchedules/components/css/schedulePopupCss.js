export const schedulePopupCss = `
    .schedule-popup-shell { position: fixed; display: flex; align-items: flex-start; gap: 10px; z-index: 1000; }
    .schedule-popup { width: 340px; background: #fff; border: 2px solid #333; box-shadow: 0 4px 16px rgba(0,0,0,0.25); max-height: 85vh; overflow-y: auto; }
    .schedule-popup-sidecars { width: 230px; display: flex; flex-direction: column; gap: 10px; }
    .schedule-popup-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: #e0e0e0; border-bottom: 1px solid #999; font-weight: 600; font-size: 13px; cursor: move; user-select: none; }
    .schedule-popup-title { flex: 1; font-size:14px; min-width: 0; padding-right: 8px; word-break: keep-all; }
    .schedule-popup-header .close-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: #333; padding: 0; line-height: 1; }
    .schedule-popup-body { padding: 12px; }
    .popup-section { margin-bottom: 12px; }
    .popup-section-title { font-size: 13px; color: #555; margin-bottom: 6px; font-weight: 600; }
    .popup-input { width: 100%; padding: 8px 10px; border: 1px solid #999; font-size: 14px; }
    .popup-input:focus { outline: 2px solid #1976d2; }
    .schedule-type-grid { display: flex; flex-wrap: wrap; gap: 5px; }
    .schedule-type-btn { position: relative; display: flex; align-items: center; justify-content: center; min-width: 34px; height: 26px; padding: 0 6px; cursor: pointer; font-size: 14px; font-weight: 600; }
    .schedule-type-btn:hover { filter: brightness(0.9); }
    .schedule-type-btn .state-badge { position: absolute; top: -4px; right: -4px; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; border-radius: 2px; }
    .schedule-type-btn .state-badge.checked { background: #1976d2; color: #fff; }
    .schedule-type-btn .state-badge.mixed { background: #ff9800; color: #fff; }
    .popup-memo { width: 100%; height: 50px; padding: 8px 10px; border: 1px solid #999; font-size: 13px; resize: none; font-family: inherit; }
    .popup-actions { display: flex; gap: 8px; justify-content: space-between; margin-top: 12px; }
    .popup-actions button { padding: 6px 14px; font-size: 13px; cursor: pointer; }
    .popup-actions .btn-reset { background: #f44336; color: #fff; border: 1px solid #d32f2f; }
    .popup-actions .btn-lock { color: #fff; border: 1px solid #111; }
    .popup-actions .btn-lock.locked { background: #555; }
    .popup-actions .btn-lock.unlocked { background: #333; }
    .popup-actions .btn-save { background: #1976d2; color: #fff; border: 1px solid #1565c0; }
    .schedule-popup-sidecar { width: 230px; background: #fff; border: 2px solid #333; box-shadow: 0 4px 16px rgba(0,0,0,0.22); transition: opacity 0.18s ease; }
    .schedule-popup-sidecar.inactive { opacity: 0.52; }
    .schedule-popup-sidecar.active { opacity: 1; }
    .schedule-popup-sidecar.incoming { border-color: #1f5f4a; box-shadow: 0 4px 16px rgba(18, 83, 63, 0.2); }
    .schedule-popup-sidecar.own-duty { border-color: #3d4f7a; box-shadow: 0 4px 16px rgba(44, 67, 112, 0.18); }
    .schedule-popup-sidecar-title { padding: 10px 8px; background: #e0e0e0; border-bottom: 1px solid #999; font-size: 13px; font-weight: 700; text-align: center; }
    .schedule-popup-sidecar-body { padding: 8px; display: flex; flex-direction: column; gap: 6px; max-height: calc(85vh - 42px); overflow-y: auto; }
    .schedule-popup-sidecar-empty { min-height: 86px; display: flex; align-items: center; justify-content: center; text-align: center; color: #777; font-size: 12px; line-height: 1.5; }
    .duty-replacement-row { display: flex; flex-direction: row; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid #ccc; background: #fafafa; transition: opacity 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
    .duty-replacement-row.inactive { opacity: 0.45; }
    .duty-replacement-row.active { opacity: 1; border-color: #c62828; box-shadow: 0 0 0 1px rgba(198,40,40,0.18); background: #fff5f5; }
    .duty-replacement-label { flex-shrink: 0; min-width: 36px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; border-radius: 3px; padding: 0 6px; }
    .duty-replacement-select { flex: 1; min-width: 0; padding: 6px 8px; border: 1px solid #aaa; background: #fff; font-size: 13px; cursor: pointer; }
    .duty-replacement-select:focus { outline: 2px solid #d32f2f; outline-offset: 0; }
    .incoming-duty-row { display: flex; flex-direction: column; gap: 6px; padding: 8px; border: 1px solid #8ab7a6; background: #f2fbf7; }
    .incoming-duty-header { display: flex; align-items: center; gap: 8px; }
    .incoming-duty-text { min-width: 0; font-size: 13px; font-weight: 700; color: #1f2f2a; word-break: keep-all; }
    .incoming-duty-subtext { font-size: 12px; color: #4a675d; line-height: 1.4; }
    .own-duty-row { display: flex; flex-direction: column; gap: 8px; padding: 8px; border: 1px solid #9ba8c7; background: #f5f7fd; }
    .own-duty-coworkers { display: flex; flex-direction: column; gap: 4px; }
    .own-duty-coworker { font-size: 14px; font-weight: 600; color: #27314f; line-height: 1.4; }
`;
