import { useEffect, useState } from 'preact/hooks';
import { authController } from '../../@controllers/authController';

const MANAGE_FEATURES = [
    'dayTypes',
    'geunchwiConditions',
    'yeolwaeConditions',
    'battalionRotation',
    'sleepGuard',
    'board',
    'members',
];

export default function useManageFeaturePermissions() {
    const [allowedFeatures, setAllowedFeatures] = useState({});

    useEffect(() => {
        const checkPermissions = async () => {
            const results = await Promise.all(
                MANAGE_FEATURES.map((featureId) => authController.checkFeaturePermission('manage', featureId)),
            );

            const nextAllowedFeatures = {};
            MANAGE_FEATURES.forEach((featureId, idx) => {
                nextAllowedFeatures[featureId] = results[idx].allowed;
            });
            setAllowedFeatures(nextAllowedFeatures);
        };

        checkPermissions();
    }, []);

    return allowedFeatures;
}
