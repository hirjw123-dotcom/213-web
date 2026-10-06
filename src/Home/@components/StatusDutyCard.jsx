export default function StatusDutyCard({ title, color, sections }) {
    const total = sections.reduce((sum, section) => sum + section.list.length, 0);

    return (
        <div className="duty-card" style={{ borderTopColor: color }}>
            <div className="f row aCenter jBetween" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c3)' }}>{title}</span>
                <span style={{ fontSize: 18, fontWeight: 700, color }}>{total}명</span>
            </div>
            {sections.map((section) => (
                <div key={section.label}>
                    <div style={{ fontSize: 12, color: 'var(--c4)', fontWeight: 600, padding: '3px 0 1px', borderBottom: '1px solid var(--c7)' }}>
                        {section.label}
                    </div>
                    {section.list.length > 0 ? (
                        <div className="duty-card-list">
                            {section.list.map((soldier, idx) => (
                                <div key={soldier.id} className="duty-soldier-row f row aCenter">
                                    <span className="duty-idx">{idx + 1}</span>
                                    <span className="duty-rank">{soldier.rank}</span>
                                    <span className="duty-name">{soldier.name}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--c5)', padding: '3px 0' }}>—</div>
                    )}
                </div>
            ))}
        </div>
    );
}
