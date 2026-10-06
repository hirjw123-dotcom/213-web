export default function MilitarySubTabs({ subTab, onChange }) {
    return (
        <div className="mil-tabs">
            <div
                className={`mil-tab ${subTab === 'access' ? 'active' : ''}`}
                onClick={() => onChange('access')}
            >국인체 접속</div>
            <div
                className={`mil-tab ${subTab === 'setup' ? 'active' : ''}`}
                onClick={() => onChange('setup')}
            >설정하기</div>
        </div>
    );
}
