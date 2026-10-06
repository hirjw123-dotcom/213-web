import { useState } from 'preact/hooks';
import { soldiersController } from '../@controllers/soldiersController.js';
import { __controllers } from '../@controllers/__controllers.js';


const RANKS = ['이병', '일병', '상병', '병장'];

// 날짜 문자열 파싱 (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD 등)
const parseDate = (str) => {
    if (!str) return null;
    const match = str.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
    if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    return null;
};

// "계급 이름" 형태에서 계급과 이름 분리
const splitRankName = (text) => {
    if (!text) return { rank: '', name: '' };
    const trimmed = text.trim();
    for (const r of RANKS) {
        if (trimmed.startsWith(r + ' ') || trimmed.startsWith(r + '\u00a0')) {
            return { rank: r, name: trimmed.slice(r.length).trim() };
        }
    }
    // 계급 없이 이름만 있는 경우
    return { rank: '', name: trimmed };
};

// 엑셀 HTML 파싱 함수 - 두 가지 형태 모두 지원
// 형태1: 순번 | 계급/이름 | 입대일 | 전역일  (계급+이름 합쳐진 열)
// 형태2: 순번 | 계급 | 이름 | 입대일 | 전역일  (계급/이름 분리된 열)
const parseExcelHtml = (html) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('tr');
    const result = [];

    let headerRow = null;
    let headerIndices = { rank: -1, name: -1, rankName: -1, startDate: -1, exitDate: -1 };

    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td, th');
        const texts = Array.from(cells).map(c => c.textContent.trim());

        // 헤더 행 감지
        const hasRankOrName = texts.some(t =>
            t === '계급' || t === '이름' || t === '계급/이름' || t === '계급 이름'
            || t === '성명' || t === '계급/성명' || t === '계급 성명'
        );
        const hasDate = texts.some(t => t === '입대일' || t === '전역일');

        if (hasRankOrName || hasDate) {
            headerRow = i;
            texts.forEach((t, idx) => {
                if (t === '계급') headerIndices.rank = idx;
                if (t === '이름' || t === '성명') headerIndices.name = idx;
                if (t === '계급/이름' || t === '계급 이름' || t === '계급/성명' || t === '계급 성명')
                    headerIndices.rankName = idx;
                if (t === '입대일') headerIndices.startDate = idx;
                if (t === '전역일') headerIndices.exitDate = idx;
            });
            continue;
        }

        // 헤더 이후 데이터 행 처리
        if (headerRow !== null && i > headerRow) {
            let name = '', rank = '';

            if (headerIndices.rankName >= 0) {
                // 형태1: "계급/이름" 합쳐진 컬럼
                const combined = cells[headerIndices.rankName]?.textContent.trim() || '';
                const split = splitRankName(combined);
                rank = split.rank;
                name = split.name;
            } else {
                // 형태2: 계급/이름 분리된 컬럼
                name = headerIndices.name >= 0 ? (cells[headerIndices.name]?.textContent.trim() || '') : '';
                rank = headerIndices.rank >= 0 ? (cells[headerIndices.rank]?.textContent.trim() || '') : '';
            }

            const startDateStr = headerIndices.startDate >= 0 ? cells[headerIndices.startDate]?.textContent.trim() : '';
            const exitDateStr = headerIndices.exitDate >= 0 ? cells[headerIndices.exitDate]?.textContent.trim() : '';

            const cleanName = name.replace(/\s/g, '');
            if (cleanName.length > 0) {
                result.push({
                    name: cleanName,
                    rank: rank || '이병',
                    startDate: parseDate(startDateStr),
                    exitDate: parseDate(exitDateStr),
                });
            }
        }
    }

    return result;
};

// 날짜를 보기 좋게 포맷
const formatDate = (arr) => {
    if (!arr || arr.length !== 3) return '-';
    return `${arr[0]}.${String(arr[1]).padStart(2, '0')}.${String(arr[2]).padStart(2, '0')}`;
};


export default function FromExcel({ onComplete, existingSoldiers }) {
    const [parsed, setParsed] = useState([]);
    const [duplicateCount, setDuplicateCount] = useState(0);
    const [pasteArea, setPasteArea] = useState(null);

    const handlePaste = (e) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain');

        // 입력창에 원본 표시
        if (e.currentTarget) {
            e.currentTarget.innerText = e.clipboardData.getData('text/plain') || '(붙여넣기 완료)';
            setPasteArea(e.currentTarget);
        }

        const soldiers = parseExcelHtml(html);

        // 중복 체크
        const existingIds = new Set(existingSoldiers.map(s => s.id));
        let dupCount = 0;

        const processedSoldiers = soldiers.map(s => {
            const id = s.name + (s.startDate ? s.startDate.join('') : '');
            const existingSoldier = existingSoldiers.find(es => es.id === id);
            const isDuplicate = existingIds.has(id);

            if (isDuplicate) {
                dupCount++;
                return { ...s, id, status: 'duplicate', existing: existingSoldier };
            }

            return { ...s, id, status: 'new' };
        });

        // 파싱 결과 내 중복 제거
        const seen = new Set();
        const uniqueSoldiers = processedSoldiers.filter(s => {
            if (seen.has(s.id)) {
                dupCount++;
                return false;
            }
            seen.add(s.id);
            return true;
        });

        setDuplicateCount(dupCount);
        setParsed(uniqueSoldiers);
    };

    const handleClear = () => {
        setParsed([]);
        setDuplicateCount(0);
        if (pasteArea) pasteArea.innerText = '';
    };

    const handleConfirm = async () => {
        const toAdd = parsed.filter(s => s.status === 'new');
        for (const soldier of toAdd) {
            await soldiersController.add(soldier);
        }
        __controllers.popup.pop();
        onComplete?.();
    };

    const actionable = parsed.filter(s => s.status !== 'duplicate');
    const newCount = actionable.length;

    return (
        <div className="modal" style={{
            width: '90%',
            maxWidth: '640px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}>
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
                {/* 안내 */}
                <div style={{
                    padding: '8px 10px',
                    background: 'var(--c8)',
                    border: '1px solid var(--c6)',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: 'var(--c3)',
                    lineHeight: '1.6',
                }}>
                    <span style={{ fontWeight: 700, color: 'var(--c2)' }}>사용법:</span> 엑셀에서 표를 선택 → 복사(Ctrl+C) → 아래 영역 클릭 후 붙여넣기(Ctrl+V)
                    <br />
                    <span style={{ color: 'var(--c4)', fontSize: '11px' }}>
                        지원 형태: [계급, 이름] 분리형 / [계급/이름] 합쳐진 형태 모두 지원
                    </span>
                </div>

                {/* 붙여넣기 영역 */}
                <div style={{ position: 'relative' }}>
                    <div
                        contentEditable
                        onPaste={handlePaste}
                        style={{
                            minHeight: parsed.length > 0 ? '48px' : '100px',
                            maxHeight: '160px',
                            overflow: 'auto',
                            border: '2px dashed var(--c5)',
                            padding: '12px',
                            background: 'var(--c9)',
                            fontSize: '12px',
                            color: 'var(--c3)',
                            transition: 'border-color 0.15s',
                            cursor: 'text',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--c5)'}
                    />
                    {parsed.length === 0 && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            color: 'var(--c5)',
                            fontSize: '13px',
                            pointerEvents: 'none',
                            textAlign: 'center',
                            whiteSpace: 'nowrap',
                        }}>
                            Ctrl+V 로 붙여넣기
                        </div>
                    )}
                </div>

                {/* 파싱 결과 */}
                {parsed.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                        {/* 요약 */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '8px',
                            flexWrap: 'wrap',
                        }}>
                            <span style={{ fontWeight: 700, fontSize: '13px', marginRight: '4px' }}>
                                파싱결과
                            </span>
                            {newCount > 0 && (
                                <span style={{
                                    display: 'inline-block',
                                    padding: '1px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'var(--c1)',
                                    color: '#fff',
                                    border: '1px solid var(--c1)',
                                }}>신규 {newCount}</span>
                            )}
                            {duplicateCount > 0 && (
                                <span style={{
                                    display: 'inline-block',
                                    padding: '1px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    background: 'var(--c8)',
                                    color: 'var(--c4)',
                                    border: '1px solid var(--c6)',
                                }}>중복 {duplicateCount} (무시)</span>
                            )}
                            <span style={{ flex: 1 }} />
                            <button
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '11px',
                                    background: 'var(--c8)',
                                    border: '1px solid var(--c5)',
                                    cursor: 'pointer',
                                    color: 'var(--c3)',
                                }}
                                onClick={handleClear}
                            >초기화</button>
                        </div>

                        {/* 테이블 */}
                        <div style={{
                            maxHeight: '240px',
                            overflow: 'auto',
                            border: '1px solid var(--c5)',
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '12px',
                                tableLayout: 'fixed',
                            }}>
                                <thead>
                                    <tr style={{ background: 'var(--c8)', position: 'sticky', top: 0 }}>
                                        <th style={{ ...thStyle, width: '50px' }}>상태</th>
                                        <th style={{ ...thStyle, width: '50px' }}>계급</th>
                                        <th style={{ ...thStyle, width: '70px' }}>이름</th>
                                        <th style={thStyle}>입대일</th>
                                        <th style={thStyle}>전역일</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {actionable.map((s, i) => (
                                        <tr key={i} style={{
                                            background: i % 2 === 0 ? 'var(--c9)' : 'var(--c8)',
                                        }}>
                                            <td style={tdStyle}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '0 5px',
                                                    fontSize: '10px',
                                                    fontWeight: 700,
                                                    background: 'var(--c1)',
                                                    color: '#fff',
                                                    lineHeight: '18px',
                                                }}>
                                                    신규
                                                </span>
                                            </td>
                                            <td style={tdStyle}>{s.rank}</td>
                                            <td style={{ ...tdStyle, fontWeight: 700 }}>{s.name}</td>
                                            <td style={tdStyle}>{formatDate(s.startDate)}</td>
                                            <td style={tdStyle}>{formatDate(s.exitDate)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
            <div className="modal-footer" style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                padding: '10px 16px',
                borderTop: '1px solid var(--c6)',
            }}>
                <button className="secondary" onClick={() => __controllers.popup.pop()}>취소</button>
                <button onClick={handleConfirm} disabled={actionable.length === 0}>
                    가져오기 ({actionable.length}명)
                </button>
            </div>
        </div>
    );
}

const thStyle = {
    padding: '6px 8px',
    textAlign: 'center',
    fontWeight: 700,
    borderBottom: '2px solid var(--c5)',
    whiteSpace: 'nowrap',
    fontSize: '11px',
    color: 'var(--c2)',
};

const tdStyle = {
    padding: '5px 8px',
    textAlign: 'center',
    borderBottom: '1px solid var(--c6)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
};
