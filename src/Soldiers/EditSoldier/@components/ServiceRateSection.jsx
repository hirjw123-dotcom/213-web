import { useEffect, useRef, useState } from 'preact/hooks';
import { serviceRateController } from '../../../@controllers/serviceRateController.js';
import { serviceRateSectionCss } from './css/serviceRateSectionCss.js';

export default function ServiceRateSection({ startDate, exitDate }) {
    const [data, setData] = useState(null);
    const barRef = useRef(null);
    const glowRef = useRef(null);

    useEffect(() => {
        serviceRateController.start(startDate, exitDate);
        const unsub = serviceRateController.subscribe(setData);
        return () => {
            unsub();
            serviceRateController.stop();
        };
    }, [startDate, exitDate]);

    if (!data || !data.valid) {
        return (
            <div className="esm-form-group">
                <label className="esm-label">복무율</label>
                <div className="sr-empty">입대일과 전역일을 입력하면 복무율이 표시됩니다.</div>
            </div>
        );
    }

    const rate = data.rate;
    const rateStr = data.rateStr;
    const isDone = rate >= 100;

    const [intPart, decPart] = rateStr.split('.');

    return (
        <div className="esm-form-group">
            <div className="sr-container">
                <div className="sr-rate-display">
                    <span className="sr-rate-int">{intPart}</span>
                    <span className="sr-rate-dot">.</span>
                    <span className="sr-rate-dec">{decPart}</span>
                    <span className="sr-rate-pct">%</span>
                </div>

                <div className="sr-bar-track">
                    <div
                        ref={barRef}
                        className={`sr-bar-fill ${isDone ? 'done' : ''}`}
                        style={{ width: `${Math.min(rate, 100)}%` }}
                    >
                        <div className="sr-bar-pulse"></div>
                    </div>
                    <div className="sr-bar-ticks">
                        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((tick) => (
                            <div key={tick} className={`sr-tick ${rate >= tick ? 'passed' : ''}`} style={{ left: `${tick}%` }}>
                                <span className="sr-tick-label">{tick}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="sr-step-info">
                    {isDone ? (
                        <span className="sr-done-text">🎉 전역을 축하드립니다</span>
                    ) : (
                        <>
                            <span className="sr-next-label">{data.nextStep}%</span>
                            <span className="sr-next-text">까지&nbsp;</span>
                            <span className="sr-next-days">{data.daysToNext}일</span>
                            <span className="sr-next-text">&nbsp;남았습니다</span>
                            <span className="sr-divider">│</span>
                            <span className="sr-remaining">전역까지 <strong>{data.daysRemaining}일</strong></span>
                        </>
                    )}
                </div>

                <div className="sr-time-ticker">
                    <div className="sr-ticker-inner"></div>
                </div>
            </div>

            <style>{serviceRateSectionCss}</style>
        </div>
    );
}
