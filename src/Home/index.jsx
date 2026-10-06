import SoldierListPanel from './SoldierListPanel';
import StatusPanel from './StatusPanel';
import RightPanel from './RightPanel';

export default function Home() {
    return (
        <div className="home-root f row wh100p">
            <SoldierListPanel />
            <StatusPanel />
            <RightPanel />
        </div>
    );
}