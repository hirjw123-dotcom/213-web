export default function DocEditorCanvas({
    activeId,
    editorRef,
    handleEditorInput,
    handlePaste,
    handleDrop,
    handleDragOverEditor,
    handlePointerDownEditor,
    handleKeyDownEditor,
    pageStyle,
}) {
    return (
        <div className="f1 f aCenter" style={{ overflow: 'auto', background: 'var(--c7)', padding: '20px 0' }}>
            {activeId ? (
                <div
                    ref={editorRef}
                    className="bo-a4-page"
                    contentEditable
                    onInput={handleEditorInput}
                    onPaste={handlePaste}
                    onDrop={handleDrop}
                    onDragOver={handleDragOverEditor}
                    onPointerDown={handlePointerDownEditor}
                    onKeyDown={handleKeyDownEditor}
                    style={pageStyle}
                />
            ) : (
                <div className="f ajCenter" style={{ color: 'var(--c4)', flex: 1 }}>
                    우측에서 양식을 선택하거나 추가하세요.
                </div>
            )}
        </div>
    );
}
