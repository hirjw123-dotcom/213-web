import { useState, useEffect, useRef } from 'preact/hooks';
import { borderOpsController } from './borderOpsController';
import { resolveMacros } from './macroResolver';
import { plugins } from '../@modules/plugins';
import DocViewerDateNav from './@components/DocViewerDateNav';
import DocViewerSidebar from './@components/DocViewerSidebar';

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const getToday = () => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
};

const addDays = (date, n) => {
    const d = new Date(date.y, date.m - 1, date.d + n);
    return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
};

const formatDate = (date) => {
    const d = new Date(date.y, date.m - 1, date.d);
    const dayName = DAY_NAMES[d.getDay()];
    return `${date.y}/${String(date.m).padStart(2, '0')}/${String(date.d).padStart(2, '0')} (${dayName})`;
};

const isToday = (date) => {
    const today = getToday();
    return date.y === today.y && date.m === today.m && date.d === today.d;
};

const normalizeMargin = (margin) => {
    const base = borderOpsController.getDefaultPageMargin();
    const toNumber = (v, fallback) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return fallback;
        return Math.max(0, Math.min(60, Math.round(n)));
    };
    return {
        top: toNumber(margin?.top, base.top),
        right: toNumber(margin?.right, base.right),
        bottom: toNumber(margin?.bottom, base.bottom),
        left: toNumber(margin?.left, base.left),
    };
};

const sanitizeViewerHtml = (html) => {
    if (!html) return '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = html;

    wrapper.querySelectorAll('.bo-draggable-image').forEach((box) => {
        box.classList.remove('active');
        box.querySelectorAll('.bo-image-resize-handle').forEach((handle) => handle.remove());
    });

    wrapper.querySelectorAll('table').forEach((table) => {
        table.classList.remove('bo-table-active');
        table.querySelectorAll('.bo-table-drag-handle, .bo-table-resize-handle, .bo-table-delete-btn').forEach((el) => el.remove());

        table.classList.add('bo-copyable-table');

        const tablePos = (table.style.position || '').trim().toLowerCase();
        const isAbsoluteTable = tablePos === 'absolute';
        const originalLeft = table.style.left;
        const originalTop = table.style.top;
        const originalWidth = table.style.width;
        const originalZ = table.style.zIndex;

        const wrap = document.createElement('div');
        wrap.className = 'bo-copyable-table-wrap';

        if (isAbsoluteTable) {
            wrap.style.position = 'absolute';
            wrap.style.left = originalLeft || '0px';
            wrap.style.top = originalTop || '0px';
            if (originalWidth) wrap.style.width = originalWidth;
            if (originalZ) wrap.style.zIndex = originalZ;

            table.style.position = 'relative';
            table.style.left = '0px';
            table.style.top = '0px';
            table.style.margin = '0';
            table.style.zIndex = '';
        }

        table.parentNode?.insertBefore(wrap, table);
        wrap.appendChild(table);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bo-copy-table-btn';
        btn.textContent = '테이블 복사';
        btn.setAttribute('aria-label', '테이블 복사');
        wrap.appendChild(btn);
    });

    wrapper.querySelectorAll('td, th').forEach((cell) => {
        cell.classList.add('bo-copyable-td');
    });

    wrapper.querySelectorAll('img').forEach((img) => {
        const src = (img.getAttribute('src') || '').trim();
        if (!src) return;
        if (/^file:\/\//i.test(src)) {
            const marker = document.createElement('span');
            marker.textContent = '[로컬 이미지]';
            img.replaceWith(marker);
        }
    });
    return wrapper.innerHTML;
};

const copyText = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.top = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch {
            ok = false;
        }
        document.body.removeChild(ta);
        return ok;
    }
};

const copyTableObject = async (table) => {
    if (!table) return false;

    const cloned = table.cloneNode(true);
    cloned.querySelectorAll('.bo-table-drag-handle, .bo-table-resize-handle, .bo-copy-table-btn').forEach((el) => el.remove());

    const html = cloned.outerHTML;
    const plain = (cloned.innerText || cloned.textContent || '').trim();

    try {
        if (window.ClipboardItem && navigator.clipboard?.write) {
            const item = new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([plain || html], { type: 'text/plain' }),
            });
            await navigator.clipboard.write([item]);
            return true;
        }
    } catch {
    }

    return copyText(plain || html);
};

const buildCopyableDocumentFragment = (root) => {
    if (!root) return null;

    const cloned = root.cloneNode(true);

    cloned.querySelectorAll('.bo-copy-table-btn').forEach((el) => el.remove());
    cloned.querySelectorAll('.bo-copyable-table-wrap').forEach((wrap) => {
        const table = wrap.querySelector('table');
        if (!table || !wrap.parentNode) return;

        const wrapStyle = wrap.style;
        if ((wrapStyle.position || '').trim().toLowerCase() === 'absolute') {
            table.style.position = 'absolute';
            table.style.left = wrapStyle.left || table.style.left || '0px';
            table.style.top = wrapStyle.top || table.style.top || '0px';
            table.style.zIndex = wrapStyle.zIndex || table.style.zIndex;
            if (wrapStyle.width) table.style.width = wrapStyle.width;
        }

        wrap.parentNode.insertBefore(table, wrap);
        wrap.remove();
    });

    return cloned;
};

const copyDocumentObject = async (root) => {
    const cloned = buildCopyableDocumentFragment(root);
    if (!cloned) return false;

    const html = cloned.innerHTML;
    const plain = (cloned.innerText || cloned.textContent || '').trim();

    try {
        if (window.ClipboardItem && navigator.clipboard?.write) {
            const item = new ClipboardItem({
                'text/html': new Blob([html], { type: 'text/html' }),
                'text/plain': new Blob([plain || html], { type: 'text/plain' }),
            });
            await navigator.clipboard.write([item]);
            return true;
        }
    } catch {
    }

    return copyText(plain || html);
};

const getEditableTextNodeFromPoint = (event, scopeEl) => {
    if (!scopeEl) return null;

    const x = event.clientX;
    const y = event.clientY;
    let node = null;

    if (document.caretPositionFromPoint) {
        const caret = document.caretPositionFromPoint(x, y);
        node = caret?.offsetNode || null;
    } else if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(x, y);
        node = range?.startContainer || null;
    }

    if (node?.nodeType === Node.TEXT_NODE && scopeEl.contains(node.parentNode)) {
        return node;
    }

    const target = event.target instanceof Element ? event.target : null;
    if (!target || !scopeEl.contains(target)) return null;

    if (target.childNodes.length === 1 && target.firstChild?.nodeType === Node.TEXT_NODE) {
        return target.firstChild;
    }

    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
        acceptNode(textNode) {
            return textNode.textContent?.trim()
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_SKIP;
        },
    });

    return walker.nextNode();
};

const getEditableElementFallback = (target, cell) => {
    if (!(target instanceof Element) || !cell?.contains(target)) return null;

    const stopTags = new Set(['TD', 'TH']);
    let current = target;

    while (current && current !== cell) {
        if (!stopTags.has(current.tagName) && current.childNodes.length === 1 && current.firstChild?.nodeType === Node.TEXT_NODE) {
            return current;
        }
        current = current.parentElement;
    }

    return null;
};

let lastDate = JSON.parse(localStorage.getItem('docViewer.lastDate.2') || JSON.stringify(getToday()));
export default function DocViewer() {
    const [date, setDate] = useState(lastDate ?? getToday());
    const [templates, setTemplates] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [viewerHtml, setViewerHtml] = useState('');
    const [activeMargin, setActiveMargin] = useState(borderOpsController.getDefaultPageMargin());
    const [loading, setLoading] = useState(true);
    const [copyToast, setCopyToast] = useState('');
    const printRef = useRef(null);
    const toastTimerRef = useRef(null);

    // 양식 목록 로드
    useEffect(() => {
        (async () => {
            const list = await borderOpsController.getTemplates();
            setTemplates(list);
            const savedId = await borderOpsController.getActiveTemplateId();
            if (savedId && list.some(t => t.id === savedId)) {
                setActiveId(savedId);
                const tpl = list.find(t => t.id === savedId);
                if (tpl) setActiveMargin(normalizeMargin(tpl.pageMargin));
            } else if (list.length > 0) {
                setActiveId(list[0].id);
                setActiveMargin(normalizeMargin(list[0].pageMargin));
            }
            setLoading(false);
        })();
    }, []);

    // 매크로 치환
    useEffect(() => {
        if (!activeId) {
            setViewerHtml('');
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            const tpl = templates.find(t => t.id === activeId);
            if (!tpl) { setViewerHtml(''); setLoading(false); return; }
            try {
                const html = await resolveMacros(tpl.html, date);
                if (!cancelled) setViewerHtml(sanitizeViewerHtml(html));
            } catch (e) {
                console.error('매크로 치환 오류:', e);
                if (!cancelled) setViewerHtml(sanitizeViewerHtml(tpl.html));
            }
            if (!cancelled) setLoading(false);
        })();
        return () => { cancelled = true; };
    }, [activeId, date, templates]);

    // 날짜 이동
    const goPrev = () => setDate(d => {
        let rs = addDays(d, -1);
        lastDate = rs;
        localStorage.setItem('docViewer.lastDate.2', JSON.stringify(rs));
        return rs;
    });
    const goNext = () => setDate(d => {
        let rs = addDays(d, 1);
        lastDate = rs;
        localStorage.setItem('docViewer.lastDate.2', JSON.stringify(rs));
        return rs;
    });
    const goToday = () => setDate(() => {
        let rs = getToday();
        lastDate = rs;
        localStorage.setItem('docViewer.lastDate.2', JSON.stringify(rs));
        return rs;
    });

    const dateValue = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    const handleDateChange = (value) => {
        if (!value) return;
        const [yStr, mStr, dStr] = String(value).split('-');
        const y = Number(yStr);
        const m = Number(mStr);
        const d = Number(dStr);
        if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return;

        const nextDate = new Date(y, m - 1, d);
        if (
            nextDate.getFullYear() !== y
            || nextDate.getMonth() + 1 !== m
            || nextDate.getDate() !== d
        ) {
            return;
        }
        setDate({ y, m, d });
    };

    // 양식 선택
    const handleSelectTemplate = (id) => {
        setActiveId(id);
        const tpl = templates.find(t => t.id === id);
        if (tpl) setActiveMargin(normalizeMargin(tpl.pageMargin));
        borderOpsController.setActiveTemplateId(id);
    };

    const handleReorderTemplates = async (sourceId, targetId, position) => {
        const nextList = await borderOpsController.reorderTemplates(sourceId, targetId, position);
        setTemplates(nextList);
    };

    // 인쇄
    const handlePrint = () => {
        if (!printRef.current) return;
        plugins.print(printRef.current, {
            pageSize: 'A4',
            landscape: false,
        });
    };

    const handleCopyAll = async () => {
        const ok = await copyDocumentObject(printRef.current);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setCopyToast(ok ? '전체 복사됨' : '복사 실패');
        toastTimerRef.current = setTimeout(() => {
            setCopyToast('');
        }, 2000);
    };

    const handleViewerClick = async (e) => {
        const tableBtn = e.target?.closest?.('.bo-copy-table-btn');
        if (tableBtn) {
            e.preventDefault();
            e.stopPropagation();
            const wrap = tableBtn.closest('.bo-copyable-table-wrap');
            const table = wrap?.querySelector('table.bo-copyable-table');
            const ok = await copyTableObject(table);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
            setCopyToast(ok ? '복사됨' : '복사 실패');
            toastTimerRef.current = setTimeout(() => {
                setCopyToast('');
            }, 2000);
            return;
        }

        const td = e.target?.closest?.('td.bo-copyable-td');
        if (!td || !printRef.current?.contains(td)) return;

        const text = (td.innerText || td.textContent || '').trim();
        if (!text) return;

        const ok = await copyText(text);

        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setCopyToast(ok ? '복사됨' : '복사 실패');
        toastTimerRef.current = setTimeout(() => {
            setCopyToast('');
        }, 2000);
    };

    const handleViewerContextMenu = (e) => {
        const cell = e.target?.closest?.('td.bo-copyable-td, th.bo-copyable-td');
        if (!cell || !printRef.current?.contains(cell)) return;

        const textNode = getEditableTextNodeFromPoint(e, cell);
        const fallbackElement = textNode ? null : getEditableElementFallback(e.target, cell);
        const currentText = textNode?.textContent ?? fallbackElement?.textContent ?? '';

        if (!currentText.trim()) return;

        e.preventDefault();
        e.stopPropagation();

        const nextText = window.prompt('내용을 수정하세요.', currentText);
        if (nextText == null || nextText === currentText) return;

        if (textNode) {
            textNode.textContent = nextText;
        } else if (fallbackElement) {
            fallbackElement.textContent = nextText;
        } else {
            cell.textContent = nextText;
        }

        setViewerHtml(printRef.current?.innerHTML || '');
    };

    useEffect(() => () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }, []);

    if (loading && templates.length === 0) {
        return <div className="f wh100p ajCenter" style={{ color: 'var(--c4)' }}>로딩 중...</div>;
    }

    const pageStyle = {
        minHeight: 1123,
        pointerEvents: 'auto',
        userSelect: 'text',
        '--bo-margin-top': `${activeMargin.top}mm`,
        '--bo-margin-right': `${activeMargin.right}mm`,
        '--bo-margin-bottom': `${activeMargin.bottom}mm`,
        '--bo-margin-left': `${activeMargin.left}mm`,
    };

    return (
        <div className="f row wh100p">
            <div className="f1 f" style={{ minWidth: 0 }}>
                <DocViewerDateNav
                    dateText={formatDate(date)}
                    dateValue={dateValue}
                    isToday={isToday(date)}
                    onPrev={goPrev}
                    onNext={goNext}
                    onToday={goToday}
                    onDateChange={handleDateChange}
                    showPrint={!!activeId}
                    onCopyAll={handleCopyAll}
                    onPrint={handlePrint}
                />

                {/* 중앙: A4 문서 뷰 */}
                <div className="f1 f aCenter" style={{ overflow: 'auto', background: 'var(--c7)', padding: '20px 0' }}>
                    {activeId ? (
                        <div
                            ref={printRef}
                            className="bo-a4-page"
                            dangerouslySetInnerHTML={{ __html: viewerHtml }}
                            onClick={handleViewerClick}
                            onContextMenu={handleViewerContextMenu}
                            style={pageStyle}
                        />
                    ) : (
                        <div className="f ajCenter" style={{ color: 'var(--c4)', flex: 1 }}>
                            {templates.length === 0
                                ? '등록된 양식이 없습니다. 문서편집 탭에서 양식을 추가하세요.'
                                : '양식을 선택하세요.'
                            }
                        </div>
                    )}
                </div>
            </div>

            <DocViewerSidebar
                templates={templates}
                activeId={activeId}
                onSelectTemplate={handleSelectTemplate}
                onReorderTemplates={handleReorderTemplates}
            />

            {copyToast && <div className="bo-copy-toast">{copyToast}</div>}
        </div>
    );
}
