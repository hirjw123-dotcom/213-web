export default function RotationResultsByGroup({ groups, displayValue }) {
    return (
        <div style={{ flex: 1, overflow: 'auto' }}>
            {Object.entries(groups).map(([groupName, groupResults]) => (
                <div key={groupName}>
                    <div
                        style={{
                            padding: '5px 12px',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--c4)',
                            background: 'var(--c8)',
                            borderBottom: '1px solid var(--c7)',
                        }}
                    >
                        {groupName}
                    </div>
                    {groupResults.map((result) => (
                        <div
                            key={result.item.key}
                            className="f row aCenter jBetween"
                            style={{
                                padding: '6px 16px',
                                borderBottom: '1px solid var(--c7)',
                                background: '#fff',
                            }}
                        >
                            <span style={{ fontSize: 13, color: 'var(--c3)' }}>
                                {result.item.name}
                            </span>
                            <span
                                style={{
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: 'var(--c1)',
                                }}
                            >
                                {displayValue(result)}
                            </span>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}
