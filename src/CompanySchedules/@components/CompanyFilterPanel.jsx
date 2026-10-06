import { FILTER_ITEMS } from '../@hooks/useCompanySchedulesState';

const FILTER_PRESETS = [
    {
        label: '[출타] 보기',
        enabledKeys: ['weeklySchedule', 'dailySchedule', 'leave'],
    },
    {
        label: '[근무 + 열외] 보기',
        enabledKeys: ['weeklySchedule', 'dailySchedule', 'duty', 'excluded'],
    },
];

export default function CompanyFilterPanel({ filters, setFilters }) {
    const allChecked = FILTER_ITEMS.every((item) => filters[item.key]);
    const noneChecked = FILTER_ITEMS.every((item) => !filters[item.key]);
    const isMixed = !allChecked && !noneChecked;

    const toggleAll = () => {
        const newVal = !allChecked;
        const nextFilters = {};
        FILTER_ITEMS.forEach((item) => {
            nextFilters[item.key] = newVal;
        });
        setFilters(nextFilters);
    };

    const toggle = (key) => {
        setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const applyPreset = (enabledKeys) => {
        const enabledSet = new Set(enabledKeys);
        const nextFilters = {};
        FILTER_ITEMS.forEach((item) => {
            nextFilters[item.key] = enabledSet.has(item.key);
        });
        setFilters(nextFilters);
    };

    return (
        <div className="cs-filter-panel">
            <h3 className="cs-filter-title">필터</h3>

            <div className="cs-filter-presets f row">
                {FILTER_PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        type="button"
                        className="cs-filter-preset-btn f1"
                        onClick={() => applyPreset(preset.enabledKeys)}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            <label
                className="cs-filter-all"
                onContextMenu={(e) => {
                    e.preventDefault();
                    toggleAll();
                }}
            >
                <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => { if (el) el.indeterminate = isMixed; }}
                    onChange={toggleAll}
                />
                전체 선택
            </label>
            {FILTER_ITEMS.map((item) => (
                <label
                    key={item.key}
                    className="cs-filter-item"
                    onContextMenu={(e) => {
                        e.preventDefault();
                        const nextFilters = {};
                        for (const key in filters) {
                            if (allChecked || !filters[item.key]) {
                                nextFilters[key] = false;
                            } else {
                                nextFilters[key] = true;
                            }
                        }
                        nextFilters[item.key] = true;
                        setFilters(nextFilters);
                    }}
                >
                    <input
                        type="checkbox"
                        checked={!!filters[item.key]}
                        onChange={() => toggle(item.key)}
                    />
                    {item.label}
                </label>
            ))}
        </div>
    );
}
