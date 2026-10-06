export default function StatusSectionHeader({ title, count, total, color, extraContent, collapsible, collapsed, onToggle }) {
    return (
        <div className="f row aCenter" style={{
            marginTop: 14, marginBottom: 6, gap: 8,
            borderBottom: `2px solid ${color}`, paddingBottom: 4,
        }}>
            <span style={{ fontSize: 14, fontWeight: 700, color }}>{title}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
                {count}명
                <span style={{ color: 'var(--c4)', fontWeight: 400 }}> / {total}명</span>
            </span>
            {extraContent && (
                <div style={{ marginLeft: 'auto' }}>
                    {extraContent}
                </div>
            )}
            {collapsible && (
                <button
                    onClick={onToggle}
                    style={{ marginLeft: extraContent ? 0 : 'auto', fontSize: 11, padding: '2px 8px', height: 22 }}
                    title={collapsed ? '펼치기' : '접기'}
                >
                    {collapsed ? '▶' : '▼'}
                </button>
            )}
        </div>
    );
}
