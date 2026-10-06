const EXCEL_FILE_MIME = 'application/vnd.ms-excel;charset=utf-8;';

const sanitizeTableClone = (table) => {
    const cloned = table.cloneNode(true);
    cloned.querySelectorAll('button, input, textarea, select').forEach((element) => element.remove());
    return cloned;
};

const sanitizeFileName = (fileName) => {
    const normalized = String(fileName || 'export')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
        .trim();

    if (!normalized) return 'export.xls';
    return normalized.toLowerCase().endsWith('.xls') ? normalized : `${normalized}.xls`;
};

const buildExcelDocument = (tableHtml, title) => {
    const safeTitle = String(title || 'Export');
    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>${safeTitle}</title>
    <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #888; }
    </style>
</head>
<body>
${tableHtml}
</body>
</html>`;
};

const triggerDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 0);
};

export const downloadTableAsExcelFile = async (table, { fileName, title } = {}) => {
    if (!table) {
        return { success: false, message: '내보낼 표를 찾지 못했습니다.' };
    }

    const cloned = sanitizeTableClone(table);
    const normalizedFileName = sanitizeFileName(fileName || 'export.xls');
    const htmlDocument = buildExcelDocument(cloned.outerHTML, title || normalizedFileName);
    const blob = new Blob(['\ufeff', htmlDocument], { type: EXCEL_FILE_MIME });

    triggerDownload(blob, normalizedFileName);
    return { success: true, message: `${normalizedFileName} 파일을 다운로드했습니다.` };
};