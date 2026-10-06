import { useEffect } from "preact/hooks";
import DB from "../@modules/db.js";
import { authController } from "../@controllers/authController";

const USERS_DB_KEY = 'users';

const normalizePermissions = (permissions, validPermissionIds) => {
    const source = Array.isArray(permissions) ? permissions : [];
    return [...new Set(source.filter(permissionId => validPermissionIds.has(permissionId)))];
};

const isSameArray = (left, right) => {
    if (left.length !== right.length) return false;
    return left.every((value, index) => value === right[index]);
};

export default function AutoPermissionGC() {
    useEffect(() => {
        let disposed = false;
        let running = false;

        const runCleanup = async () => {
            if (disposed || running) return;

            running = true;
            try {
                const isMaster = await authController.isMaster();
                if (!isMaster || disposed) return;

                const [permissionTypes, featureMap, users] = await Promise.all([
                    authController.getPermissionTypes(),
                    authController.getFeaturePermissions(),
                    authController.getUsers(),
                ]);
                if (disposed) return;

                const validPermissionIds = new Set(permissionTypes.map(type => type.id));

                let featureMapChanged = false;
                const nextFeatureMap = JSON.parse(JSON.stringify(featureMap));

                Object.values(nextFeatureMap).forEach(page => {
                    Object.values(page?.features || {}).forEach(feature => {
                        const currentPermissions = Array.isArray(feature?.permissions) ? feature.permissions : [];
                        const cleanedPermissions = normalizePermissions(currentPermissions, validPermissionIds);

                        if (!isSameArray(currentPermissions, cleanedPermissions)) {
                            feature.permissions = cleanedPermissions;
                            featureMapChanged = true;
                        }
                    });
                });

                if (featureMapChanged) {
                    await authController.setFeaturePermissions(nextFeatureMap);
                }

                let usersChanged = false;
                const nextUsers = users.map(user => {
                    const currentPermissions = Array.isArray(user?.permissions) ? user.permissions : [];
                    const cleanedPermissions = normalizePermissions(currentPermissions, validPermissionIds);

                    if (isSameArray(currentPermissions, cleanedPermissions)) {
                        return user;
                    }

                    usersChanged = true;
                    return {
                        ...user,
                        permissions: cleanedPermissions,
                    };
                });

                if (usersChanged && !disposed) {
                    await DB.save(USERS_DB_KEY, nextUsers);
                }
            } catch (error) {
                console.error('AutoPermissionGC cleanup failed:', error);
            } finally {
                running = false;
            }
        };

        runCleanup();
        const intervalId = setInterval(runCleanup, 1000);

        return () => {
            disposed = true;
            clearInterval(intervalId);
        };
    }, []);

    return null;
}