import DocViewer from './DocViewer';
import DocEditor from './DocEditor';
import BorderOpsTabBar from './@components/BorderOpsTabBar';
import useBorderOpsTab from './@hooks/useBorderOpsTab';

export default function BorderOps() {
    const { tab, setTab } = useBorderOpsTab();

    return (
        <div className="f wh100p bo-root">
            <BorderOpsTabBar tab={tab} onChange={setTab} />

            <div className="f1 bo-content">
                {tab === 'view' && <DocViewer />}
                {tab === 'edit' && <DocEditor />}
            </div>
        </div>
    );
}
