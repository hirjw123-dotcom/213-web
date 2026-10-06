import { useState, useEffect, useRef } from 'preact/hooks';
import { authController, DEFAULT_FEATURE_MAP } from '../@controllers/authController';
import { tabPermissionsCss } from './css/tabPermissionsCss';
import AutoPermissionGC from './AutoPermissionGC';

export default function TabPermissions({ canEdit = false }) {
    const [isMaster, setIsMaster] = useState(false);

    useEffect(() => {
        authController.isMaster().then(setIsMaster);
    }, []);
    const viewRefs = useRef({ reload: () => { }, }).current;

    return (
        <div className="f" style={{ gap: 0 }}>
            <style>{tabPermissionsCss}</style>

            <div className="tp-layout">
                {/* 좌측: 기능별 권한 설정 */}
                <div className="tp-left">
                    <FeaturePermissionsView isMaster={isMaster} canEdit={canEdit} viewRefs={viewRefs} />
                </div>
                {/* 우측: 권한 목록 관리 */}
                <div className="tp-right">
                    <PermissionTypesView isMaster={isMaster} canEdit={canEdit} viewRefs={viewRefs} />
                </div>
            </div>
        </div>
    );
}

// ─── 권한 목록 관리 ─────────────────────────
function PermissionTypesView({ isMaster, canEdit, viewRefs }) {
    const [types, setTypes] = useState([]);
    const [newLabel, setNewLabel] = useState('');
    const [error, setError] = useState('');

    const removeDeletedPermissionFromFeatureMap = (featureMap, deletedPermissionId) => {
        const updated = JSON.parse(JSON.stringify(featureMap));
        let changed = false;

        Object.values(updated).forEach(page => {
            Object.values(page.features || {}).forEach(feature => {
                const currentPermissions = Array.isArray(feature.permissions) ? feature.permissions : [];
                if (!currentPermissions.includes(deletedPermissionId)) return;

                const nextPermissions = currentPermissions.filter(permissionId => permissionId !== deletedPermissionId);
                const hasCustomPermissions = nextPermissions.some(permissionId => permissionId !== 'loginRequired');
                feature.permissions = hasCustomPermissions
                    ? [...new Set(nextPermissions)]
                    : nextPermissions.filter(permissionId => permissionId !== 'loginRequired');
                changed = true;
            });
        });

        return { updated, changed };
    };

    const removeDeletedPermissionFromScheduleRestrictions = (restrictions, deletedPermissionId) => {
        const source = restrictions || {};
        const editablePeriodExceptionPermissions = Array.isArray(source.editablePeriodExceptionPermissions)
            ? source.editablePeriodExceptionPermissions.filter(permissionId => permissionId !== deletedPermissionId)
            : [];
        const pastDayLockExceptionPermissions = Array.isArray(source.pastDayLockExceptionPermissions)
            ? source.pastDayLockExceptionPermissions.filter(permissionId => permissionId !== deletedPermissionId)
            : [];

        const changed =
            editablePeriodExceptionPermissions.length !== (source.editablePeriodExceptionPermissions || []).length ||
            pastDayLockExceptionPermissions.length !== (source.pastDayLockExceptionPermissions || []).length;

        return {
            updated: {
                ...source,
                editablePeriodExceptionPermissions,
                pastDayLockExceptionPermissions,
            },
            changed,
        };
    };

    const load = async () => {
        const t = await authController.getPermissionTypes();
        setTypes(t);
        viewRefs.reload();
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async () => {
        if (!canEdit) return;
        let newId = Math.random() + '';
        setError('');
        if (!newId.trim() || !newLabel.trim()) {
            setError('ID와 이름을 모두 입력해주세요.');
            return;
        }
        const result = await authController.addPermissionType({
            id: newId.trim(),
            label: newLabel.trim(),
        });
        if (!result.success) { setError(result.message); return; }
        setNewLabel('');
        load();
    };

    const handleDelete = async (id) => {
        if (!canEdit) return;
        let name = types.find(t => t.id === id).label;
        if (!await confirm(`'${name}' 권한을 삭제하시겠습니까?`)) return;

        const [featureMap, users] = await Promise.all([
            authController.getFeaturePermissions(),
            authController.getUsers(),
        ]);
        const scheduleRestrictions = await authController.getScheduleRestrictions();

        const { updated: cleanedFeatureMap, changed: featureMapChanged } = removeDeletedPermissionFromFeatureMap(featureMap, id);
        if (featureMapChanged) {
            await authController.setFeaturePermissions(cleanedFeatureMap);
        }

        const { updated: cleanedScheduleRestrictions, changed: scheduleRestrictionsChanged } = removeDeletedPermissionFromScheduleRestrictions(scheduleRestrictions, id);
        if (scheduleRestrictionsChanged) {
            await authController.setScheduleRestrictions(cleanedScheduleRestrictions);
        }

        const byMilitaryId = authController.getSession()?.militaryId || null;
        const usersToUpdate = users.filter(user => (user.permissions || []).includes(id));
        await Promise.all(usersToUpdate.map(user => {
            const nextPermissions = (user.permissions || []).filter(permissionId => permissionId !== id);
            return authController.setPermissions(user.militaryId, nextPermissions, byMilitaryId);
        }));

        await authController.deletePermissionType(id);
        load();
    };

    return (
        <div>
            <AutoPermissionGC />
            <div className="tp-section-title">🔑 권한 목록 관리</div>
            {!isMaster && (
                <div className="tp-readonly-msg">⚠ 마스터 권한이 있어야 편집할 수 있습니다.</div>
            )}

            <div className="tp-perm-list">
                {types.map(t => (
                    <div key={t.id} className={`tp-perm-item ${t.builtIn ? 'builtin' : ''}`}>
                        <div>
                            <span style={{ fontWeight: 600 }}>{t.builtIn ? '👑 ' : ''}{t.label}</span>
                        </div>
                        {isMaster && canEdit && !t.builtIn && (
                            <button style={{ fontSize: 11, padding: '2px 8px', color: 'var(--err)', borderColor: 'var(--err)' }}
                                onClick={() => handleDelete(t.id)}>삭제</button>
                        )}
                    </div>
                ))}
            </div>

            {isMaster && canEdit && (
                <div className="tp-add-row">
                    <div className="f" style={{ gap: 2 }}>
                        <label style={{ fontSize: 11, color: 'var(--c4)' }}>권한 이름</label>
                        <input className="tp-add-input" value={newLabel}
                            onInput={e => setNewLabel(e.target.value)}
                            placeholder="예: 일정 편집"
                            onKeyDown={e => e.key === 'Enter' && handleAdd()} />
                    </div>
                    <button onClick={handleAdd}
                        style={{ padding: '6px 14px', fontSize: 12, background: 'var(--c1)', color: '#fff', border: '1px solid var(--c1)' }}>
                        추가
                    </button>
                </div>
            )}

            {error && <div style={{ fontSize: 12, color: 'var(--err)', marginTop: 8 }}>{error}</div>}
        </div>
    );
}

// ─── 기능별 권한 설정 ─────────────────────────
function FeaturePermissionsView({ isMaster, canEdit, viewRefs }) {
    const [featureMap, setFeatureMap] = useState(null);
    const [permTypes, setPermTypes] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const [fm, pt] = await Promise.all([
            authController.getFeaturePermissions(),
            authController.getPermissionTypes(),
        ]);
        setFeatureMap(fm);
        setPermTypes(pt);
    };
    viewRefs.reload = load;

    useEffect(() => { load(); }, []);

    if (!featureMap) {
        return <div style={{ padding: 20, color: 'var(--c4)' }}>로딩 중...</div>;
    }

    const togglePermission = async (pageId, featureId, permId) => {
        if (!isMaster || !canEdit) return;
        if (pageId === 'home' && featureId === 'viewHome' && permId === 'master') return;

        const updated = JSON.parse(JSON.stringify(featureMap));
        const perms = updated[pageId].features[featureId].permissions;
        const idx = perms.indexOf(permId);
        if (idx >= 0) {
            perms.splice(idx, 1);
        } else {
            perms.push(permId);
        }

        const hasAnyExceptLoginRequired = perms.some(p => p !== 'loginRequired');
        if (hasAnyExceptLoginRequired && !perms.includes('loginRequired')) {
            perms.push('loginRequired');
        }

        updated[pageId].features[featureId].permissions = [...new Set(perms)];
        setFeatureMap(updated);

        setSaving(true);
        await authController.setFeaturePermissions(updated);
        setSaving(false);
    };

    return (
        <div>
            <div className="tp-section-title">📋 기능별 권한 설정</div>
            {!isMaster && (
                <div className="tp-readonly-msg">⚠ 마스터 권한이 있어야 편집할 수 있습니다.</div>
            )}

            <table className="tp-feature-table">
                <thead>
                    <tr>
                        <th style={{ width: 120 }}>페이지</th>
                        <th style={{ width: 140 }}>기능</th>
                        {permTypes.map(pt => (
                            <th key={pt.id} style={{ minWidth: 60 }}>{pt.label}</th>
                        ))}
                        <th>&nbsp;</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(featureMap).map(([pageId, page]) => {
                        const featureEntries = Object.entries(page.features);
                        return featureEntries.map(([featureId, feature], fIdx) => (
                            <tr key={`${pageId}-${featureId}`}>
                                {fIdx === 0 && (
                                    <td rowSpan={featureEntries.length}
                                        style={{ fontWeight: 700, background: 'var(--c8)', verticalAlign: 'top' }}>
                                        {page.label}
                                    </td>
                                )}
                                <td style={{ fontWeight: 500 }}>{feature.label}</td>
                                {permTypes.map(pt => {
                                    const checked = feature.permissions.includes(pt.id);
                                    const isLoginRequiredAndDisabled = pt.id === 'loginRequired' && feature.permissions.some(p => p !== 'loginRequired');
                                    const isHomeViewMaster = pageId === 'home' && featureId === 'viewHome' && pt.id === 'master';
                                    return (
                                        <td key={pt.id} style={{ width: 60 }}>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => togglePermission(pageId, featureId, pt.id)}
                                                disabled={!isMaster || !canEdit || isLoginRequiredAndDisabled || isHomeViewMaster}
                                                style={{ cursor: (isMaster && canEdit && !isLoginRequiredAndDisabled && !isHomeViewMaster) ? 'pointer' : 'default' }}
                                            />
                                        </td>
                                    );
                                })}
                                <td>&nbsp;</td>
                            </tr>
                        ));
                    })}
                </tbody>
            </table>

            <div style={{ fontSize: 11, color: 'var(--c4)', marginTop: 12 }}>
                체크된 권한이 없으면 모든 사용자가 해당 기능을 사용할 수 있습니다.
                <br />체크된 권한이 있으면 해당 권한을 가진 사용자만 사용할 수 있습니다.
            </div>

            {/* 근무일정표 달력 편집 상세 권한 */}
            <ScheduleRestrictionsSection isMaster={isMaster} canEdit={canEdit} permTypes={permTypes} />
        </div>
    );
}

// ─── 근무일정표 달력 편집 상세 권한 ─────────────────────────
function ScheduleRestrictionsSection({ isMaster, canEdit, permTypes }) {
    const [restrictions, setRestrictions] = useState(null);
    const [saving, setSaving] = useState(false);
    const saveTimerRef = useRef(null);

    const exceptionPermTypes = permTypes.filter(permissionType => permissionType.id !== 'loginRequired');

    useEffect(() => {
        authController.getScheduleRestrictions().then(setRestrictions);
    }, []);

    useEffect(() => () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    }, []);

    if (!restrictions) return null;

    const save = (updated) => {
        setRestrictions(updated);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
            setSaving(true);
            await authController.setScheduleRestrictions(updated);
            setSaving(false);
        }, 500);
    };

    const update = (key, val) => {
        const updated = { ...restrictions, [key]: val };
        save(updated);
    };

    const toggleExceptionPermission = (key, permissionId) => {
        const currentPermissions = Array.isArray(restrictions[key]) ? restrictions[key] : [];
        const hasPermission = currentPermissions.includes(permissionId);
        const nextPermissions = hasPermission
            ? currentPermissions.filter(currentPermissionId => currentPermissionId !== permissionId)
            : [...currentPermissions, permissionId];
        update(key, nextPermissions);
    };

    const disabled = !isMaster || !canEdit;

    return (
        <div className="tp-schedule-restrictions">
            <div className="tp-sr-title">📅 근무일정표 달력 편집 상세 권한</div>

            {/* 1. 편집가능 기간 설정 */}
            <div className="tp-sr-card">
                <div className="tp-sr-card-header">
                    <div className="tp-sr-card-label">
                        <span className="tp-sr-num">1</span>
                        근무일정표 활성화
                    </div>
                    <div className="tp-sr-toggle-wrap">
                        <button
                            className={`tp-sr-toggle-btn ${restrictions.editablePeriodEnabled ? 'active' : ''}`}
                            disabled={disabled}
                            onClick={() => update('editablePeriodEnabled', true)}
                        >설정</button>
                        <button
                            className={`tp-sr-toggle-btn ${!restrictions.editablePeriodEnabled ? 'active' : ''}`}
                            disabled={disabled}
                            onClick={() => update('editablePeriodEnabled', false)}
                        >설정안함</button>
                    </div>
                </div>

                {restrictions.editablePeriodEnabled && (
                    <div className="tp-sr-card-body">
                        <div className="tp-sr-desc">
                            어떤 날짜 범위의 근무표를 수정할 수 있게 할지 설정합니다.<br />
                            시작일과 종료일 사이의 날짜만 수정할 수 있습니다.
                        </div>
                        <div className="tp-sr-period-inputs">
                            <div className="tp-sr-period-group">
                                <input type="date" className="tp-sr-ym-input"
                                    value={restrictions.editablePeriodStart || ''}
                                    disabled={disabled}
                                    onInput={e => update('editablePeriodStart', e.target.value)} />
                            </div>
                            <span className="tp-sr-period-sep">~</span>
                            <div className="tp-sr-period-group">
                                <input type="date" className="tp-sr-ym-input"
                                    value={restrictions.editablePeriodEnd || ''}
                                    disabled={disabled}
                                    onInput={e => update('editablePeriodEnd', e.target.value)} />
                            </div>
                        </div>
                        <div className="tp-sr-exception-box">
                            <div className="tp-sr-exception-title">예외 권한</div>
                            <div className="tp-sr-exception-desc">체크된 권한을 가진 사용자는 이 설정을 무시합니다.</div>
                            <div className="tp-sr-exception-list">
                                {exceptionPermTypes.map(permissionType => (
                                    <label key={permissionType.id} className={`tp-sr-exception-item ${disabled ? 'disabled' : ''}`}>
                                        <input
                                            type="checkbox"
                                            checked={(restrictions.editablePeriodExceptionPermissions || []).includes(permissionType.id)}
                                            disabled={disabled}
                                            onChange={() => toggleExceptionPermission('editablePeriodExceptionPermissions', permissionType.id)}
                                        />
                                        <span>{permissionType.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 2. 지난 날 편집 잠금 */}
            <div className="tp-sr-card">
                <div className="tp-sr-card-header">
                    <div className="tp-sr-card-label">
                        <span className="tp-sr-num">2</span>
                        오늘을 포함하여 지난 날의 일정을 편집할 수 없게 합니다.
                    </div>
                    <div className="tp-sr-toggle-wrap">
                        <button
                            className={`tp-sr-toggle-btn ${restrictions.pastDayLockEnabled ? 'active' : ''}`}
                            disabled={disabled}
                            onClick={() => update('pastDayLockEnabled', true)}
                        >설정</button>
                        <button
                            className={`tp-sr-toggle-btn ${!restrictions.pastDayLockEnabled ? 'active' : ''}`}
                            disabled={disabled}
                            onClick={() => update('pastDayLockEnabled', false)}
                        >설정안함</button>
                    </div>
                </div>
                <div className="tp-sr-card-body">
                    <div className="tp-sr-exception-box tp-sr-exception-box-compact">
                        <div className="tp-sr-exception-title">예외 권한</div>
                        <div className="tp-sr-exception-desc">체크된 권한을 가진 사용자는 이 설정을 무시합니다.</div>
                        <div className="tp-sr-exception-list">
                            {exceptionPermTypes.map(permissionType => (
                                <label key={permissionType.id} className={`tp-sr-exception-item ${disabled ? 'disabled' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={(restrictions.pastDayLockExceptionPermissions || []).includes(permissionType.id)}
                                        disabled={disabled}
                                        onChange={() => toggleExceptionPermission('pastDayLockExceptionPermissions', permissionType.id)}
                                    />
                                    <span>{permissionType.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {saving && <div className="tp-sr-saving">저장 중...</div>}
        </div>
    );
}
