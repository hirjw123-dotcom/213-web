import { useEffect, useState } from 'react';
import ModalPopup from '../@components/ModalPopup';
import RotationSettingsPopup from './RotationSettingsPopup';
import RotationResultsByGroup from './@components/RotationResultsByGroup';
import useRotationResults from './@hooks/useRotationResults';

const MEAL_SCRIPT_STORAGE_KEY = 'home_meal_board_script_v1';
const MEAL_POSTS_CACHE_STORAGE_KEY = 'home_meal_board_posts_cache_v1';
const DEFAULT_MEAL_SCRIPT = "async function getList(){ return [{title:'abcd',link:'http://naver.com'}, {title:'test',link:'http://daum.net'}] }";

export default function RightPanel() {
    const {
        date,
        groups,
        isToday,
        displayValue,
        changeDate,
        goToday,
        setDate,
        loadRotation,
        fmtDateStr,
    } = useRotationResults();

    const [mealScript, setMealScript] = useState(DEFAULT_MEAL_SCRIPT);
    const [mealPosts, setMealPosts] = useState([]);
    const [mealLoading, setMealLoading] = useState(false);
    const [mealError, setMealError] = useState('');
    const [showScriptEditor, setShowScriptEditor] = useState(false);

    const openRotationSettings = () => {
        ModalPopup.push(
            <RotationSettingsPopup onUpdate={() => loadRotation()} />
        );
    };

    const runMealScript = async (scriptText) => {
        setMealLoading(true);
        setMealError('');

        try {
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const fn = new AsyncFunction(`${scriptText}\nif (typeof getList !== 'function') throw new Error('getList 함수를 찾을 수 없습니다.');\nreturn await getList();`);
            const result = await fn();

            if (!Array.isArray(result)) {
                throw new Error('getList는 배열을 반환해야 합니다.');
            }

            const normalized = result
                .map((item, idx) => ({
                    title: String(item?.title ?? `게시글 ${idx + 1}`),
                    link: String(item?.link ?? ''),
                }))
                .filter(item => item.title);

            setMealPosts(normalized);
            localStorage.setItem(MEAL_POSTS_CACHE_STORAGE_KEY, JSON.stringify(normalized));
        } catch (err) {
            setMealError(err?.message || '식단 스크립트 실행 중 오류가 발생했습니다.');
        } finally {
            setMealLoading(false);
        }
    };

    const saveMealScript = async () => {
        localStorage.setItem(MEAL_SCRIPT_STORAGE_KEY, mealScript);
        await runMealScript(mealScript);
    };

    useEffect(() => {
        const savedScript = localStorage.getItem(MEAL_SCRIPT_STORAGE_KEY);
        const initialScript = savedScript || DEFAULT_MEAL_SCRIPT;
        const cachedPostsText = localStorage.getItem(MEAL_POSTS_CACHE_STORAGE_KEY);

        if (cachedPostsText) {
            try {
                const parsed = JSON.parse(cachedPostsText);
                if (Array.isArray(parsed)) {
                    const cachedNormalized = parsed
                        .map((item, idx) => ({
                            title: String(item?.title ?? `게시글 ${idx + 1}`),
                            link: String(item?.link ?? ''),
                        }))
                        .filter(item => item.title);
                    setMealPosts(cachedNormalized);
                }
            } catch {
                localStorage.removeItem(MEAL_POSTS_CACHE_STORAGE_KEY);
            }
        }

        setMealScript(initialScript);
        runMealScript(initialScript);
    }, []);

    return (
        <div className="home-right f">
            {/* 헤더: 대대순번 + 날짜 네비 */}
            <div style={{
                padding: '6px 10px',
                borderBottom: '1px solid var(--c6)',
                background: 'var(--c8)',
            }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>대대순번</span>
                <div className="f row aCenter jBetween">
                    <div className="f row aCenter" style={{ gap: 4 }}>
                        <button onClick={() => changeDate(-1)} style={{ fontSize: 10, padding: '1px 5px' }}>◀</button>
                        <input type="date" value={fmtDateStr(date)}
                            onInput={e => {
                                const d = new Date(e.target.value);
                                if (!isNaN(d.getTime())) setDate(d);
                            }}
                            style={{ fontSize: 11, padding: '1px 3px', border: '1px solid var(--c6)', width: 110 }}
                        />
                        <button onClick={() => changeDate(1)} style={{ fontSize: 10, padding: '1px 5px' }}>▶</button>
                        {!isToday && <button onClick={goToday} style={{ fontSize: 10, padding: '1px 5px' }}>오늘</button>}
                        <button onClick={openRotationSettings} style={{ fontSize: 12, padding: '1px 5px' }}>⚙ 설정</button>
                    </div>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <RotationResultsByGroup groups={groups} displayValue={displayValue} />
            </div>

            <div style={{
                height: 400,
                borderTop: '1px solid var(--c6)',
                background: 'var(--c8)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}>
                <div className="f row aCenter jBetween" style={{
                    padding: '6px 8px 6px 10px',
                    borderBottom: '1px solid var(--c6)',
                    background: 'linear-gradient(180deg, var(--c8) 0%, var(--c9) 100%)',
                }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c3)' }}>식단표</span>
                    <button
                        onClick={() => setShowScriptEditor(v => !v)}
                        style={{
                            fontSize: 11,
                            padding: '3px 9px',
                            border: '1px solid var(--c6)',
                            background: showScriptEditor ? 'var(--c7)' : '#fff',
                            borderRadius: 4,
                            cursor: 'pointer',
                        }}
                    >
                        {showScriptEditor ? '코드입력 닫기' : '코드입력'}
                    </button>
                </div>

                {showScriptEditor && (
                    <div style={{
                        borderBottom: '1px solid var(--c6)',
                        padding: 8,
                        background: '#fbfdff',
                        boxShadow: 'inset 0 -1px 0 rgba(0, 0, 0, 0.03)',
                    }}>
                        <textarea
                            value={mealScript}
                            onChange={e => setMealScript(e.target.value)}
                            spellCheck={false}
                            style={{
                                width: '100%',
                                height: 112,
                                resize: 'vertical',
                                border: '1px solid var(--c6)',
                                borderRadius: 6,
                                fontSize: 11,
                                lineHeight: 1.45,
                                fontFamily: 'Consolas, Monaco, monospace',
                                padding: 8,
                                boxSizing: 'border-box',
                                background: '#fff',
                                outline: 'none',
                            }}
                        />
                        <div className="f row aCenter jBetween" style={{ marginTop: 8, gap: 8 }}>
                            <div style={{ fontSize: 11, color: mealError ? '#b42318' : 'var(--c4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {mealError || '스크립트를 저장하면 식단 게시글을 즉시 갱신합니다.'}
                            </div>
                            <button
                                onClick={saveMealScript}
                                style={{
                                    fontSize: 11,
                                    padding: '4px 10px',
                                    border: '1px solid var(--c6)',
                                    borderRadius: 4,
                                    background: '#fff',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                스크립트 저장
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--c9)' }}>
                    {mealLoading && (
                        <div style={{ fontSize: 11, padding: '6px 10px', color: 'var(--c4)', borderBottom: '1px solid var(--c7)', background: '#f6f9fc' }}>
                            최신 식단표 동기화 중...
                        </div>
                    )}
                    {mealPosts.length === 0 && !mealLoading && !mealError && (
                        <div style={{ fontSize: 12, padding: '8px 10px', color: 'var(--c3)' }}>표시할 게시글이 없습니다.</div>
                    )}
                    {mealPosts.map((item, idx) => (
                        <a
                            key={`${item.title}_${idx}`}
                            href={item.link || '#'}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                                display: 'block',
                                borderBottom: '1px solid var(--c7)',
                                padding: '9px 10px',
                                fontSize: 12,
                                lineHeight: 1.45,
                                color: 'var(--c2)',
                                textDecoration: 'none',
                                background: '#fff',
                            }}
                            title={item.title}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                {item.title}
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
