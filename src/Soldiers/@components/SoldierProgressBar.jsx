export default function SoldierProgressBar({ percent }) {
    const pct = +percent.toFixed(2);
    const color = pct >= 80 ? '#2e7d32' : pct >= 50 ? '#ef6c00' : pct >= 25 ? '#1565c0' : '#c62828';

    return (
        <div className="prog-bar">
            <div className="prog-fill" style={{ width: `${pct}%`, background: color }} />
            <span className="prog-txt">{pct}%</span>
        </div>
    );
}
