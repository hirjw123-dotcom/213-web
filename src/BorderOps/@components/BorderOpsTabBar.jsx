const TABS = [
    { id: 'view', name: '문서보기' },
    { id: 'edit', name: '문서편집' },
];

export default function BorderOpsTabBar({ tab, onChange }) {
    return (
        <div className="f row aCenter bo-tab-bar">
            {TABS.map((tabItem) => (
                <button
                    key={tabItem.id}
                    className={`bo-tab-btn ${tab === tabItem.id ? 'active' : ''}`}
                    onClick={() => onChange(tabItem.id)}
                >
                    {tabItem.name}
                </button>
            ))}
        </div>
    );
}
