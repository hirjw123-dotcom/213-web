import { useRef } from "preact/hooks";
import { __controllers } from "../@controllers/__controllers";
import useForceUpdate from "../@hooks/useForceUpdate";
import React from "preact/compat";



export default function Popup({
    controllerKey = 'popup',
    zIndex = 10000,
}) {
    const viewRefs = useRef({
        views: [],
    }).current;

    const forceUpdate = useForceUpdate();

    __controllers[controllerKey].push = (view) => {
        viewRefs.views.push({
            view,
            id: Math.random(),
        });
        forceUpdate();
    };
    __controllers[controllerKey].pop = () => {
        const lastView = viewRefs.views.pop();
        forceUpdate();
        return lastView.id;
    };

    if (viewRefs.views.length > 0) {
        return (
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: zIndex,
            }}>
                {viewRefs.views.map((view, index) => {
                    return (<React.Fragment key={view.id}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            zIndex: 1 + index,
                        }}>
                            {view.view}
                        </div>
                    </React.Fragment>);
                })}
            </div>
        );
    }
}