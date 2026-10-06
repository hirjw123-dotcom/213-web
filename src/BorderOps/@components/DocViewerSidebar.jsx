import { DragDropZone, DragItem } from '../../@components/DragItem.jsx';

export default function DocViewerSidebar({ templates, activeId, onSelectTemplate, onReorderTemplates }) {
    return (
        <div className="f bo-sidebar">
            <div className="f row aCenter jBetween" style={{ padding: '8px 10px', borderBottom: '1px solid var(--c6)', background: 'var(--c8)' }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>문서 양식 목록</span>
            </div>

            <div className="f1" style={{ overflow: 'auto' }}>
                {templates.length === 0 && (
                    <div style={{ padding: 12, color: 'var(--c4)', fontSize: 12 }}>
                        양식이 없습니다. 문서편집에서 양식을 먼저 추가하세요.
                    </div>
                )}
                <DragDropZone
                    groupKey="borderops-viewer-templates"
                    containerId="viewer-templates"
                    onDrop={(draggedItem, targetItem, position) => {
                        if (!draggedItem || !targetItem) return;
                        onReorderTemplates?.(draggedItem.id, targetItem.id, position);
                    }}
                >
                    {templates.map((template, index) => (
                        <DragItem
                            key={template.id}
                            groupKey="borderops-viewer-templates"
                            containerId="viewer-templates"
                            item={template}
                            index={index}
                            onDrop={(draggedItem, targetItem, position) => {
                                if (!draggedItem || !targetItem) return;
                                onReorderTemplates?.(draggedItem.id, targetItem.id, position);
                            }}
                        >
                            <div
                                className={`bo-tpl-item ${template.id === activeId ? 'active' : ''}`}
                                onClick={() => onSelectTemplate(template.id)}
                            >
                                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                    {template.name}
                                </span>
                            </div>
                        </DragItem>
                    ))}
                </DragDropZone>
            </div>
            <div style={{ padding: 12 }}>
                <div style={{ color: 'var(--c4)', fontSize: 12 }}>인쇄 시 주의</div>
                <div style={{ color: 'var(--c4)', fontSize: 12 }}>여백없음으로 출력할 것</div>
            </div>
        </div>
    );
}
