export const serviceRateSectionCss = `
    .sr-rate-display {
        display: flex;
        align-items: baseline;
        gap: 0;
        margin-bottom: 10px;
        font-family: 'Consolas', 'Courier New', monospace;
        letter-spacing: -0.5px;
    }
    .sr-rate-int {
        font-size: 32px;
        font-weight: 800;
        color: var(--c1);
        line-height: 1;
    }
    .sr-rate-dot {
        font-size: 28px;
        font-weight: 700;
        color: var(--c3);
    }
    .sr-rate-dec {
        font-size: 16px;
        font-weight: 500;
        color: var(--c4);
        letter-spacing: 0.5px;
        animation: sr-dec-flicker 0.1s infinite alternate;
    }
    .sr-rate-pct {
        font-size: 18px;
        font-weight: 700;
        color: var(--accent);
        margin-left: 2px;
    }

    @keyframes sr-dec-flicker {
        0% { opacity: 0.85; }
        100% { opacity: 1; }
    }

    .sr-bar-track {
        position: relative;
        height: 22px;
        background: var(--c7);
        border: 1px solid var(--c5);
        margin-bottom: 10px;
    }

    .sr-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #2e7d32, #43a047, #66bb6a);
        position: relative;
        transition: width 0.1s linear;
        overflow: hidden;
    }
    .sr-bar-fill.done {
        background: linear-gradient(90deg, #1976d2, #42a5f5);
    }

    .sr-bar-pulse {
        position: absolute;
        top: 0;
        right: 0;
        width: 30px;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4));
        animation: sr-pulse 1s ease-in-out infinite;
    }
    @keyframes sr-pulse {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }

    .sr-bar-ticks {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    .sr-tick {
        position: absolute;
        top: 0;
        width: 1px;
        height: 100%;
        background: rgba(0,0,0,0.15);
    }
    .sr-tick.passed {
        background: rgba(0,0,0,0.08);
    }
    .sr-tick-label {
        position: absolute;
        bottom: -16px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 9px;
        color: var(--c4);
        font-weight: 500;
    }

    .sr-step-info {
        display: flex;
        align-items: center;
        gap: 0;
        font-size: 12px;
        color: var(--c3);
        margin-top: 25px;
        padding: 6px 8px;
        background: var(--c8);
        border: 1px solid var(--c6);
    }
    .sr-next-label {
        font-weight: 800;
        color: var(--accent);
        font-size: 13px;
    }
    .sr-next-days {
        font-weight: 800;
        color: var(--c1);
        font-size: 13px;
    }
    .sr-next-text {
        color: var(--c3);
    }
    .sr-divider {
        margin: 0 8px;
        color: var(--c6);
    }
    .sr-remaining {
        color: var(--c4);
        font-size: 11px;
    }
    .sr-done-text {
        font-weight: 700;
        color: var(--accent);
        font-size: 14px;
    }

    .sr-time-ticker {
        margin-top: 8px;
        height: 2px;
        background: var(--c7);
        overflow: hidden;
        position: relative;
    }
    .sr-ticker-inner {
        position: absolute;
        top: 0;
        left: -40%;
        width: 40%;
        height: 100%;
        background: linear-gradient(90deg, transparent, var(--accent), transparent);
        animation: sr-ticker-move 2s linear infinite;
    }
    @keyframes sr-ticker-move {
        0% { left: -40%; }
        100% { left: 100%; }
    }

    .sr-empty {
        font-size: 12px;
        color: var(--c4);
        padding: 10px;
        border: 1px dashed var(--c5);
        text-align: center;
    }
`;
