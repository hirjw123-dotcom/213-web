import { useCallback, useEffect, useState } from 'preact/hooks';
import { authController } from '../../@controllers/authController';

export default function useTabMembersData() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [signupMode, setSignupMode] = useState('auto');
    const [isMaster, setIsMaster] = useState(false);
    const [permTypes, setPermTypes] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);
        const [loadedUsers, mode, master, permissionTypes] = await Promise.all([
            authController.getUsers(),
            authController.getSignupMode(),
            authController.isMaster(),
            authController.getPermissionTypes(),
        ]);

        setUsers(loadedUsers);
        setSignupMode(mode);
        setIsMaster(master);
        setPermTypes(permissionTypes);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return {
        users,
        loading,
        signupMode,
        isMaster,
        permTypes,
        reload: load,
    };
}
