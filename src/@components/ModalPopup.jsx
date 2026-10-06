import { useRef, useEffect } from "preact/hooks";
import { __controllers } from "../@controllers/__controllers";
import useForceUpdate from "../@hooks/useForceUpdate";
import React from "preact/compat";



export default function ModalPopup({
    children,
}) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') __controllers.popup.pop();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    return (<>

        <div style={{
            position: 'relative',
            zIndex: 10,
        }} className="f ajCenter wh100p">

            <div style={{
                position: 'absolute',
                zIndex: -1,
                inset: 0,
                background: 'rgba(0,0,0,0.5)',
            }} onClick={() => {
                __controllers.popup.pop();
            }}
            />

            {children}
        </div>
    </>);
}
ModalPopup.push = (view) => {
    __controllers.popup.push(<ModalPopup>
        {view}
    </ModalPopup>);
}