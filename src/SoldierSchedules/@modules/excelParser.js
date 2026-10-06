// ========================================
// 엑셀 HTML 테이블 파싱
// ========================================
export function parseExcelTable(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;

    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) return null;

    const getExpandedRowCells = (row, keepCoveredCell = true) => {
        const sourceCells = Array.from(row.querySelectorAll('td, th'));
        const expanded = [];
        for (const cell of sourceCells) {
            const span = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
            expanded.push(cell);
            for (let i = 1; i < span; i++) expanded.push(keepCoveredCell ? cell : null);
        }
        return expanded;
    };

    // 헤더 행에서 날짜 숫자 추출 (colspan 반영)
    const headerCells = getExpandedRowCells(rows[0]);
    const dayColumns = [];

    // 첫 2열(계급/이름, 월) 이후부터 날짜 파싱
    for (let i = 2; i < headerCells.length; i++) {
        const text = headerCells[i].textContent.trim();
        const num = parseInt(text);
        if (!isNaN(num) && num >= 1 && num <= 31) {
            dayColumns.push({ colIndex: i, day: num });
        }
    }

    if (dayColumns.length === 0) return null;

    // 한국 군 계급 목록
    const RANKS = ['이병', '일병', '상병', '병장', '하사', '중사', '상사', '원사', '준위', '소위', '중위', '대위', '소령', '중령', '대령'];

    // 용사 행 파싱
    const soldiers = [];
    for (let r = 1; r < rows.length; r++) {
        const rowCells = Array.from(rows[r].querySelectorAll('td, th'));
        if (rowCells.length < 3) continue;
        const cells = getExpandedRowCells(rows[r], false);
        if (cells.length < 3) continue;

        // 첫 번째 셀에서 모든 공백/nbsp 제거 후 계급+이름 분리
        const rawText = rowCells[0].textContent.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        if (!rawText) continue;

        let rank = '';
        let name = '';

        // 계급 목록에서 매칭 시도
        for (const r of RANKS) {
            if (rawText.startsWith(r)) {
                rank = r;
                // 계급 이후 글자에서 모든 공백 제거 → 이름
                name = rawText.slice(r.length).replace(/\s+/g, '');
                break;
            }
        }

        // 계급 매칭 실패 시 첫 단어를 계급으로 간주
        if (!rank) {
            const parts = rawText.split(/\s+/);
            if (parts.length < 2) continue;
            rank = parts[0];
            name = parts.slice(1).join(''); // 나머지 모든 공백 제거
        }

        if (!name) continue;

        soldiers.push({ rank, name, rawSchedules: {}, colIndices: dayColumns.map(dc => ({ ...dc })), cells });
    }

    return { days: dayColumns.map(d => d.day), soldiers };
}

/**
 * 셀 텍스트를 일정 분류의 regExp 패턴으로 파싱하여 매칭되는 라벨 배열을 반환
 * - regExp: "*전휴*,*검진*" 형태 → 반점으로 분리 후 각 패턴 시도
 * - 글로브 패턴의 와일드카드를 제거하여 핵심 키워드 추출
 * - 긴 키워드부터 먼저 매칭하여 소비 (그리디)
 * - 예: "전휴휴" → 전휴(*전휴* 매칭) + 휴(*휴* 매칭) = ['전휴', '휴']
 */
export function parseCellTextToLabels(cellText, scheduleTypes) {
    if (!cellText) return [];

    // 각 스케줄 타입에서 키워드 목록 추출 (regExp 패턴에서 와일드카드 제거)
    // { label, keyword, kwLen } 형태의 flat 배열로 만든 뒤 키워드 길이 역순 정렬
    const matchEntries = [];

    for (const type of scheduleTypes) {
        const patterns = type.regExp
            ? type.regExp.split(',').map(p => p.trim()).filter(Boolean)
            : [`*${type.label}*`];

        for (const pat of patterns) {
            const keyword = pat.replace(/\*/g, '').trim();
            if (!keyword) continue;
            matchEntries.push({ label: type.label, keyword, kwLen: keyword.length });
        }
    }

    // 긴 키워드 우선 정렬
    matchEntries.sort((a, b) => b.kwLen - a.kwLen);

    const result = [];
    let remaining = cellText;

    while (remaining.length > 0) {
        let matched = false;

        for (const entry of matchEntries) {
            if (remaining.startsWith(entry.keyword)) {
                result.push(entry.label);
                remaining = remaining.slice(entry.kwLen);
                matched = true;
                break;
            }
        }

        if (!matched) {
            // 매칭 안 되면 한 글자씩 소비 (알 수 없는 문자 스킵)
            remaining = remaining.slice(1);
        }
    }

    return result;
}
