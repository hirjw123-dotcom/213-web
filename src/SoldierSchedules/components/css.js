
export const css =`
    .type-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
    .type-modal { background: #fff; width: 320px; border: 2px solid #333; }
    .type-modal-header { padding: 12px 14px; background: #e0e0e0; border-bottom: 1px solid #999; font-weight: 600; font-size: 15px; }
    .type-modal-body { padding: 14px; }
    .form-row { margin-bottom: 12px; }
    .form-row label { display: block; font-size: 12px; color: #333; margin-bottom: 4px; font-weight: 500; }
    .form-row input[type="text"] { width: 100%; padding: 6px 8px; border: 1px solid #999; font-size: 13px; }
    .form-row input[type="color"] { width: 100%; height: 34px; padding: 2px; cursor: pointer; border: 1px solid #999; }
    .form-row-inline { display: flex; gap: 12px; }
    .form-row-inline > div { flex: 1; }
    .form-row input[type="checkbox"] { width: 16px; height: 16px; margin-right: 6px; vertical-align: middle; }
    .type-preview { display: inline-flex; padding: 6px 14px; border: 1px solid #666; font-size: 15px; margin-top: 4px; }
    .type-modal-actions { display: flex; gap: 8px; justify-content: space-between; padding: 12px 14px; border-top: 1px solid #ccc; }
    .type-modal-actions button { padding: 6px 14px; font-size: 13px; cursor: pointer; }
    .type-modal-actions .btn-delete { background: #d32f2f; color: #fff; border: 1px solid #b71c1c; }
    .type-modal-actions .btn-save { background: #1976d2; color: #fff; border: 1px solid #1565c0; }
`;