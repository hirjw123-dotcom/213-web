import { useState } from 'preact/hooks';

export default function useBorderOpsTab(initialTab = 'view') {
    const [tab, setTab] = useState(initialTab);

    return {
        tab,
        setTab,
    };
}
