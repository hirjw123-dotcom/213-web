import { useEffect, useRef } from "preact/hooks";
import Popup from "./@components/Popup";
import { __controllers } from "./@controllers/__controllers";


// ── 공통 스타일 ──────────────────────────────────────────────
const overlayStyle = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    animation: 'ac-fadeIn 120ms ease-out',
};

const dialogStyle = {
    backgroundColor: 'var(--c9)',
    border: '1px solid var(--c2)',
    minWidth: 320,
    maxWidth: 480,
    width: '90%',
    animation: 'ac-slideIn 120ms ease-out',
};

const headerStyle = {
    padding: '10px 14px',
    backgroundColor: 'var(--c8)',
    borderBottom: '1px solid var(--c6)',
    fontSize: 'var(--fs-base)',
    fontWeight: 700,
    color: 'var(--c2)',
    userSelect: 'none',
};

const bodyStyle = {
    padding: '20px 14px',
    fontSize: 'var(--fs-base)',
    lineHeight: 1.6,
    color: 'var(--c2)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
};

const footerStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 6,
    padding: '8px 14px',
    borderTop: '1px solid var(--c6)',
    backgroundColor: 'var(--c8)',
};

const btnBase = {
    padding: '6px 20px',
    fontSize: 'var(--fs-base)',
    fontWeight: 600,
    border: '1px solid var(--c5)',
    cursor: 'pointer',
    outline: 'none',
    transition: 'background 80ms, border-color 80ms',
};

const btnPrimary = {
    ...btnBase,
    backgroundColor: 'var(--c1)',
    color: 'var(--c9)',
    borderColor: 'var(--c1)',
};

const btnSecondary = {
    ...btnBase,
    backgroundColor: 'var(--c9)',
    color: 'var(--c2)',
};


// ── 키보드 훅 ────────────────────────────────────────────────
function useDialogKeyboard(btnRefs, { onEnter, onEscape }) {
    const focusIdx = useRef(-1);

    useEffect(() => {
        const buttons = btnRefs.current.filter(Boolean);
        // 첫 번째 primary 버튼(마지막)에 자동 포커스
        const primary = buttons[buttons.length - 1];
        if (primary) {
            primary.focus();
            focusIdx.current = buttons.length - 1;
        }

        const moveFocus = (dir) => {
            if (!buttons.length) return;
            focusIdx.current = (focusIdx.current + dir + buttons.length) % buttons.length;
            buttons[focusIdx.current]?.focus();
        };

        const handler = (e) => {
            switch (e.key) {
                case 'Escape':
                    e.preventDefault();
                    e.stopPropagation();
                    onEscape();
                    break;
                case 'Enter':
                    e.preventDefault();
                    e.stopPropagation();
                    // 포커스된 버튼이 있으면 그 버튼 클릭, 없으면 기본(확인)
                    if (document.activeElement && buttons.includes(document.activeElement)) {
                        document.activeElement.click();
                    } else {
                        onEnter();
                    }
                    break;
                case 'Tab':
                    e.preventDefault();
                    moveFocus(e.shiftKey ? -1 : 1);
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    moveFocus(-1);
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    moveFocus(1);
                    break;
            }
        };

        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, []);
}


// ── Alert 컴포넌트 ───────────────────────────────────────────
function Alert({ msg, resolve }) {
    const btnRefs = useRef([]);

    const close = () => {
        __controllers.alertConfirm.pop();
        resolve();
    };

    useDialogKeyboard(btnRefs, {
        onEnter: close,
        onEscape: close,
    });

    return (
        <div style={overlayStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div style={dialogStyle}>
                <div style={headerStyle}>알림</div>
                <div style={bodyStyle}>{msg}</div>
                <div style={footerStyle}>
                    <button
                        ref={el => btnRefs.current[0] = el}
                        style={btnPrimary}
                        onClick={close}
                        onMouseEnter={e => { e.target.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.target.style.opacity = '1'; }}
                        onFocus={e => { e.target.style.outline = '2px solid var(--accent)'; e.target.style.outlineOffset = '-1px'; }}
                        onBlur={e => { e.target.style.outline = 'none'; }}
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}


// ── Confirm 컴포넌트 ─────────────────────────────────────────
function Confirm({ msg, resolve }) {
    const btnRefs = useRef([]);

    const accept = () => {
        __controllers.alertConfirm.pop();
        resolve(true);
    };

    const cancel = () => {
        __controllers.alertConfirm.pop();
        resolve(false);
    };

    useDialogKeyboard(btnRefs, {
        onEnter: accept,
        onEscape: cancel,
    });

    return (
        <div style={overlayStyle} onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}>
            <div style={dialogStyle}>
                <div style={headerStyle}>확인</div>
                <div style={bodyStyle}>{msg}</div>
                <div style={footerStyle}>
                    <button
                        ref={el => btnRefs.current[0] = el}
                        style={btnSecondary}
                        onClick={cancel}
                        onMouseEnter={e => { e.target.style.backgroundColor = 'var(--c7)'; }}
                        onMouseLeave={e => { e.target.style.backgroundColor = 'var(--c9)'; }}
                        onFocus={e => { e.target.style.outline = '2px solid var(--accent)'; e.target.style.outlineOffset = '-1px'; }}
                        onBlur={e => { e.target.style.outline = 'none'; }}
                    >
                        취소
                    </button>
                    <button
                        ref={el => btnRefs.current[1] = el}
                        style={btnPrimary}
                        onClick={accept}
                        onMouseEnter={e => { e.target.style.opacity = '0.85'; }}
                        onMouseLeave={e => { e.target.style.opacity = '1'; }}
                        onFocus={e => { e.target.style.outline = '2px solid var(--accent)'; e.target.style.outlineOffset = '-1px'; }}
                        onBlur={e => { e.target.style.outline = 'none'; }}
                    >
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
}


// ── 애니메이션 CSS 주입 ──────────────────────────────────────
const styleId = '__ac_anim';
if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        @keyframes ac-fadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes ac-slideIn {
            from { opacity: 0; transform: translateY(-12px); }
            to   { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(style);
}


// ── 메인 컴포넌트 ────────────────────────────────────────────
export default function AlertConfirm() {
    if(!window.originalAlert) {
        window.originalAlert = window.alert;
    }
    window.alert = (msg) => new Promise(resolve => {
        __controllers.alertConfirm.push(<Alert msg={msg} resolve={resolve} />);
    });

    window.confirm = (msg) => new Promise(resolve => {
        __controllers.alertConfirm.push(<Confirm msg={msg} resolve={resolve} />);
    });

    return (<>
        <Popup controllerKey="alertConfirm" zIndex={11000} />
    </>);
}

