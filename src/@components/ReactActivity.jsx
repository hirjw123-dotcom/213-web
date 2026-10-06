
export const ReactActivity = ({ visible, children }) => {
    const isHidden = !visible;

    return (
        <div
            style={{
                display: isHidden ? 'none' : 'block',
                height: '100%',
                // 'hidden' 속성을 사용하여 접근성 트리에서도 숨김 처리 가능
            }}
            hidden={isHidden}
        >
            {children}
        </div>
    );
};