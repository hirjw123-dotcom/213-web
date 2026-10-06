export default function StatusBulchimCard({ bulchim }) {
    const total = bulchim.filter((item) => item.soldier).length;

    return (
        <div className="duty-card" style={{ borderTopColor: '#9C27B0' }}>
            <div className="f row aCenter jBetween" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c3)' }}>불침번</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#9C27B0' }}>{total}명</span>
            </div>
            <div className="duty-card-list">
                {bulchim.map((item, idx) => (
                    <div key={idx} className="duty-soldier-row f row aCenter">
                        <span className="duty-idx" style={{ width: 42, fontSize: 12, color: 'var(--c4)' }}>{item.label}</span>
                        {item.soldier ? (
                            <>
                                <span className="duty-rank">{item.soldier.rank}</span>
                                <span className="duty-name">{item.soldier.name}</span>
                            </>
                        ) : (
                            <span style={{ fontSize: 12, color: 'var(--c5)' }}>—</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
