import { memo } from "preact/compat";


function PreventUpdate({
    children,
    updateKey,
}) {
    return children;
}

export default memo(PreventUpdate, (prevProps, nextProps) => {
    return prevProps.updateKey === nextProps.updateKey;
})