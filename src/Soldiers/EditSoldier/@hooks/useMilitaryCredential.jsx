import { useEffect, useState } from 'preact/hooks';
import DB from '../../../@modules/db.js';

const DB_KEY_PREFIX = 'mil_cred_';

export default function useMilitaryCredential(soldierId) {
    const [cred, setCred] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subTab, setSubTab] = useState(null);

    useEffect(() => {
        (async () => {
            const data = await DB.get(DB_KEY_PREFIX + soldierId);
            setCred(data);
            setSubTab(data ? 'access' : 'setup');
            setLoading(false);
        })();
    }, [soldierId]);

    return {
        cred,
        setCred,
        loading,
        subTab,
        setSubTab,
    };
}
