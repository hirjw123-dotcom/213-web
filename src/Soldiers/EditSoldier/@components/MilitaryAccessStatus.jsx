export default function MilitaryAccessStatus({ digits, error, cred, setAtFormatted }) {
    return (
        <div className="mil-pin-area">
            <div className="mil-pin-title">국인체 간편 접속</div>
            <div className="mil-pin-subtitle">핀번호 4자리를 입력하세요</div>

            <div className="mil-pin-boxes">
                {digits.map((digit, idx) => (
                    <div key={idx} className={`mil-pin-box ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}>
                        {digit ? '●' : ''}
                    </div>
                ))}
            </div>

            {error && <div className="mil-pin-error">{error}</div>}

            {cred ? (
                <div className="mil-pin-info">
                    최근 설정: <strong>{cred.setBy}</strong> · {setAtFormatted}
                </div>
            ) : (
                <div className="mil-pin-info" style={{ color: 'var(--err)' }}>
                    설정된 정보가 없습니다. 설정하기 탭에서 먼저 등록해주세요.
                </div>
            )}
        </div>
    );
}
