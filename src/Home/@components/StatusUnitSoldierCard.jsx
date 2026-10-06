const getReasonChipLabel = (reason) => (typeof reason === 'string' ? reason : reason?.label);

const getReasonChipStyle = (scheduleTypeByLabel, reason) => {
    const reasonLabel = getReasonChipLabel(reason);
    const type = scheduleTypeByLabel?.[reasonLabel];
    if (!type) return null;

    const backgroundColor = type.bg || '#fff';
    const textColor = type.color || '#000';

    return {
        background: backgroundColor,
        color: textColor,
        borderColor: backgroundColor,
        fontWeight: type.bold ? 700 : 600,
        boxShadow: 'none',
        WebkitTextStroke: type.bold ? `0.35px ${textColor}` : 'initial',
        filter: reason?.isPendingCombatLeave ? 'grayscale(100%)' : undefined,
    };
};

export default function StatusUnitSoldierCard({ unitName, unitBg, soldiers, total, reasons, scheduleTypeByLabel, listMaxHeight = 240 }) {
    return (
        <div className="unit-soldier-card">
            <div className="unit-soldier-header" style={{ backgroundColor: unitBg }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{unitName}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                    {soldiers.length}
                    <span style={{ fontWeight: 400, color: 'var(--c4)' }}>/{total}</span>
                </span>
            </div>
            {soldiers.length > 0 ? (
                <div className="unit-soldier-list" style={{ maxHeight: listMaxHeight }}>
                    {soldiers.map((soldier, idx) => {
                        const soldierReasons = Array.isArray(reasons?.[soldier.id]) ? reasons[soldier.id] : [];

                        return (
                            <div key={soldier.id} className="unit-soldier-row f row aCenter">
                                <span className="us-idx">{idx + 1}</span>
                                <span className="us-rank">{soldier.rank}</span>
                                <span className="us-name">{soldier.name}</span>
                                {soldierReasons.length > 0 && (
                                    <div className="us-reasons">
                                        {soldierReasons.map((reason, reasonIndex) => {
                                            const chipStyle = getReasonChipStyle(scheduleTypeByLabel, reason);
                                            const reasonLabel = getReasonChipLabel(reason);

                                            return (
                                                <span key={`${soldier.id}_${reasonLabel}_${reasonIndex}`} className="us-reason-chip" style={chipStyle}>{reasonLabel}</span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ fontSize: 11, color: 'var(--c5)', padding: '4px 8px' }}>—</div>
            )}

        </div>
    );
}


