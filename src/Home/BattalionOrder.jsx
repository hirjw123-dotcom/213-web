import { useState, useEffect } from 'preact/hooks';
import DB from '../@modules/db';

const DB_KEY = 'battalionOrder';

/**
 * 대대순번 컴포넌트
 * 대대 내 순번 관련 메모/정보를 기록하는 공간
 */
export default function BattalionOrder() {
    const [content, setContent] = useState('');
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');

    useEffect(() => {
        (async () => {
            const data = await DB.get(DB_KEY);
            if (data) setContent(data);
        })();
    }, []);

    const startEdit = () => {
        setDraft(content);
        setEditing(true);
    };

    const save = async () => {
        await DB.save(DB_KEY, draft);
        setContent(draft);
        setEditing(false);
    };

    const cancel = () => {
        setEditing(false);
        setDraft('');
    };

    return (
        <div className="battalion-order f" style={{ height: '100%' }}>
            <div className="f row aCenter jBetween" style={{
                padding: '8px 12px',
                borderBottom: '1px solid var(--c7)',
                background: 'var(--c8)',
            }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>대대순번</span>
                {!editing ? (
                    <button onClick={startEdit} style={{ fontSize: 11, padding: '2px 8px' }}>편집</button>
                ) : (
                    <div className="f row" style={{ gap: 4 }}>
                        <button onClick={save} style={{ fontSize: 11, padding: '2px 8px' }}>저장</button>
                        <button onClick={cancel} className="secondary" style={{ fontSize: 11, padding: '2px 8px' }}>취소</button>
                    </div>
                )}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
                {editing ? (
                    <textarea
                        value={draft}
                        onInput={e => setDraft(e.target.value)}
                        style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            outline: 'none',
                            resize: 'none',
                            padding: '8px 12px',
                            fontSize: 13,
                            fontFamily: 'inherit',
                            lineHeight: 1.6,
                            background: '#fffff5',
                        }}
                        autoFocus
                    />
                ) : (
                    <div style={{
                        padding: '8px 12px',
                        fontSize: 13,
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        color: content ? 'var(--c2)' : 'var(--c5)',
                        minHeight: 60,
                    }}>
                        {content || '클릭하여 대대순번 정보를 입력하세요.'}
                    </div>
                )}
            </div>
        </div>
    );
}
