import { render } from 'preact'
import { App } from './app.jsx'
import { useState, useEffect } from 'preact/hooks';
import DB from './@modules/db.js';
import Popup from './@components/Popup.jsx';
import {
    useRef, useMemo, useCallback,
    useLayoutEffect,
} from 'preact/hooks';
import AlertConfirm from './alertConfirm.jsx';
import './autoSave.jsx';

if (false) {
    console.log(useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect);
}

function InitApp() {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        DB.init().then(() => setReady(true));
        window.addEventListener('keydown', (e) => {
            // ctrl s 방지
            if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
            }
        });
    }, []);
    return <>
        {ready ? <App /> : <div className='wh100p ajCenter'>Loading DB...</div>}
        <Popup />
        <AlertConfirm />
        <HoveredInfo />
    </>;
}


window.hoveredController = {
    setShow: (show) => { },
    setTransXY: (x, y) => { },
};

function HoveredInfo() {
    const ref = useRef(null);
    const [show, setShow] = useState(null);
    const showRef = useRef(show);
    const pointerRef = useRef({ x: 0, y: 0 });

    const applyTooltipPosition = (x, y) => {
        const node = ref.current;
        if (!node) return;
        node.style.top = `${Math.floor(y / 21) * 21 + 45}px`;
        node.style.left = `${x - 50}px`;
    };

    useEffect(() => {
        showRef.current = show;
    }, [show]);

    useEffect(() => {
        applyTooltipPosition(pointerRef.current.x, pointerRef.current.y);
    }, [show]);

    useEffect(() => {
        window.hoveredController.setShow = (newShow) => {
            if (newShow === showRef.current) return;
            showRef.current = newShow;
            setShow(newShow);
        };

        window.hoveredController.setTransXY = (x, y) => {
            pointerRef.current = { x, y };
            applyTooltipPosition(x, y);
        };

        return () => {
            window.hoveredController.setShow = () => { };
            window.hoveredController.setTransXY = () => { };
        };
    }, []);

    return (
        <div
            ref={ref}
            style={{
                position: 'fixed',
                left: 0,
                top: 0,

                pointerEvents: 'none',

                zIndex: 10001,

                padding: '4px 8px',
                borderRadius: 20,
                background: 'rgba(0, 0, 0, 0.75)',
                color: '#fff',
                fontSize: 12,
                whiteSpace: 'nowrap',
                opacity: show ? 0.9 : 0,
            }}
        >
            {show || ''}
        </div>
    );
}

render(<InitApp />, document.getElementById('app'))
