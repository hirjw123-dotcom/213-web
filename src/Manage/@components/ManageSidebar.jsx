export default function ManageSidebar({ menuGroups, currentId, onSelect, onOpenBackup, isBackupActive, canOpenBackup }) {
    return (
        <div className="manage-sidebar f">
            {menuGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="manage-sidebar-group">
                    <div className="manage-sidebar-group-label">{group.label}</div>
                    {group.items.map((item) => {
                        const active = item.id === currentId;
                        return (
                            <div
                                key={item.id}
                                className={`manage-sidebar-item pointer ${active ? 'active' : ''}`}
                                onClick={() => onSelect(item.id)}
                            >
                                {item.label}
                            </div>
                        );
                    })}
                </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{
                padding: 10,
                fontSize: 14,
                color: canOpenBackup ? '#1d4488' : '#8e99ad',
                fontWeight: 'bold',
                textAlign: 'center',
                cursor: canOpenBackup ? 'pointer' : 'not-allowed',
                borderTop: '1px solid rgba(29, 68, 136, 0.15)',
                background: isBackupActive ? 'rgba(29, 68, 136, 0.08)' : 'transparent',
            }} onClick={onOpenBackup}>
                DB 백업
            </div>
        </div>
    );
}
