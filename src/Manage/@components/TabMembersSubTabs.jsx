export default function TabMembersSubTabs({ subTabs, activeSubTab, onChange }) {
    return (
        <div className="tm-subtabs">
            {subTabs.map((tab) => (
                <div
                    key={tab.id}
                    className={`tm-subtab ${activeSubTab === tab.id ? 'active' : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                    {tab.badge > 0 && <span className="tm-badge">{tab.badge}</span>}
                </div>
            ))}
        </div>
    );
}
