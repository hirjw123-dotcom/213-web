import { useState, useEffect, useRef } from 'preact/hooks';
import { companyEventsController, COMPANY_OUTING_EVENT_TYPE } from '../@controllers/companyEventsController';
import { soldiersController } from '../@controllers/soldiersController';

const EVENT_TYPES = ['평일외출', '면회', '전역', '기타'];

export default function OptionManage({ y, m, unit, onEventsChange }) {
    const [events, setEvents] = useState([]);
    const [soldiers, setSoldiers] = useState([]);
    const [loading, setLoading] = useState(true);

    // 입력폼
    const [formType, setFormType] = useState('기타');
    const [formSoldierId, setFormSoldierId] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [formStartDate, setFormStartDate] = useState([y, m, 1]);
    const [formEndDate, setFormEndDate] = useState([y, m, 1]);

    // 디바운스 타이머 (편집 시)
    const updateTimers = useRef({});

    const load = async () => {
        setLoading(true);
        const [ev, sol] = await Promise.all([
            companyEventsController.getByMonth(y, m, unit),
            soldiersController.get(),
        ]);
        setEvents(ev.filter((event) => event.type !== COMPANY_OUTING_EVENT_TYPE));
        setSoldiers(sol.filter(s => s.unit === unit));
        setLoading(false);
    };

    useEffect(() => { load(); }, [y, m, unit]);

    // 분류 또는 용사 변경 시 라벨 기본값 설정
    const handleTypeChange = (newType) => {
        setFormType(newType);
        // 기타가 아니고 용사가 선택되어 있으면 라벨 자동 설정
        if (newType !== '기타' && formSoldierId) {
            const soldier = soldiers.find(s => s.id === formSoldierId);
            if (soldier) setFormLabel(`${soldier.name} ${newType}`);
        } else if (newType === '기타') {
            setFormSoldierId('');
            setFormLabel('');
        }
    };

    const handleSoldierChange = (newSoldierId) => {
        setFormSoldierId(newSoldierId);
        // 용사가 선택되면 라벨 자동 설정
        if (newSoldierId && formType !== '기타') {
            const soldier = soldiers.find(s => s.id === newSoldierId);
            if (soldier) setFormLabel(`${soldier.name} ${formType}`);
        }
    };

    const handleAdd = async () => {
        const soldier = soldiers.find(s => s.id === formSoldierId);
        const label = formLabel || (soldier ? `${soldier.name} ${formType}` : formType);
        await companyEventsController.add({
            type: formType,
            soldierId: formSoldierId || null,
            soldierName: soldier?.name || '',
            label,
            startDate: [...formStartDate],
            endDate: [...formEndDate],
            unitId: unit,
        });
        setFormLabel('');
        setFormSoldierId('');
        await load();
        onEventsChange?.();
    };

    const handleDelete = async (id) => {
        // 타이머 정리
        if (updateTimers.current[id]) {
            clearTimeout(updateTimers.current[id]);
            delete updateTimers.current[id];
        }
        await companyEventsController.delete(id);
        await load();
        onEventsChange?.();
    };

    // 이벤트 필드 업데이트 (디바운스 적용)
    const handleEventFieldChange = (id, field, value) => {
        // 로컬 상태 즉시 업데이트
        setEvents(prev => prev.map(ev =>
            ev.id === id ? { ...ev, [field]: value } : ev
        ));

        // 디바운스된 서버 업데이트
        if (updateTimers.current[id]) clearTimeout(updateTimers.current[id]);
        updateTimers.current[id] = setTimeout(async () => {
            await companyEventsController.update(id, { [field]: value });
            onEventsChange?.();
            delete updateTimers.current[id];
        }, 500);
    };

    // 날짜 필드 업데이트
    const handleDateChange = (id, field, idx, value) => {
        const ev = events.find(e => e.id === id);
        if (!ev) return;
        const newDate = [...ev[field]];
        newDate[idx] = value;
        handleEventFieldChange(id, field, newDate);
    };

    return (
        <div className="cs-option-manage">
            <h3 className="cs-opt-title">이벤트 관리</h3>

            {/* 이벤트 추가 폼 */}
            <div className="cs-opt-form">
                <div className="cs-opt-row">
                    <label>분류</label>
                    <select value={formType} onChange={e => handleTypeChange(e.target.value)}>
                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                {formType !== '기타' && (
                    <div className="cs-opt-row">
                        <label>용사</label>
                        <select value={formSoldierId} onChange={e => handleSoldierChange(e.target.value)}>
                            <option value="">선택</option>
                            {soldiers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="cs-opt-row">
                    <label>라벨</label>
                    <input
                        type="text"
                        value={formLabel}
                        onChange={e => setFormLabel(e.target.value)}
                        placeholder="자동 생성"
                        style={{ width: '100%' }}
                    />
                </div>

                <div className="cs-opt-row">
                    <label>시작</label>
                    <div className="cs-date-inputs">
                        <input type="number" value={formStartDate[1]} min={1} max={12}
                            onChange={e => setFormStartDate([formStartDate[0], +e.target.value, formStartDate[2]])}
                            style={{ width: 44 }}
                        />월
                        <input type="number" value={formStartDate[2]} min={1} max={31}
                            onChange={e => setFormStartDate([formStartDate[0], formStartDate[1], +e.target.value])}
                            style={{ width: 44 }}
                        />일
                    </div>
                </div>

                <div className="cs-opt-row">
                    <label>종료</label>
                    <div className="cs-date-inputs">
                        <input type="number" value={formEndDate[1]} min={1} max={12}
                            onChange={e => setFormEndDate([formEndDate[0], +e.target.value, formEndDate[2]])}
                            style={{ width: 44 }}
                        />월
                        <input type="number" value={formEndDate[2]} min={1} max={31}
                            onChange={e => setFormEndDate([formEndDate[0], formEndDate[1], +e.target.value])}
                            style={{ width: 44 }}
                        />일
                    </div>
                </div>

                <button onClick={handleAdd} style={{ width: '100%', marginTop: 6 }}>+ 추가</button>
            </div>

            {/* 이벤트 목록 (편집 가능) */}
            <div className="cs-opt-list">
                {loading && <div className="spinner" style={{ margin: '20px auto' }} />}
                {!loading && events.length === 0 && (
                    <div style={{ color: 'var(--c4)', fontSize: 12, padding: 10, textAlign: 'center' }}>등록된 이벤트 없음</div>
                )}
                {events.map(ev => (
                    <div key={ev.id} className="cs-opt-item cs-opt-item-edit">
                        <div className="cs-opt-item-fields">
                            <input
                                type="text"
                                className="cs-opt-item-label-input"
                                value={ev.label}
                                onChange={e => handleEventFieldChange(ev.id, 'label', e.target.value)}
                                placeholder="라벨"
                            />
                            <div className="cs-opt-item-dates">
                                <input type="text" value={ev.startDate[1]} min={1} max={12}
                                    onChange={e => handleDateChange(ev.id, 'startDate', 1, +e.target.value)}
                                    style={{ width: 36 }}
                                />월
                                <input type="text" value={ev.startDate[2]} min={1} max={31}
                                    onChange={e => handleDateChange(ev.id, 'startDate', 2, +e.target.value)}
                                    style={{ width: 36 }}
                                />일
                                <span style={{ margin: '0 2px' }}>~</span>
                                <input type="text" value={ev.endDate[1]} min={1} max={12}
                                    onChange={e => handleDateChange(ev.id, 'endDate', 1, +e.target.value)}
                                    style={{ width: 36 }}
                                />월
                                <input type="text" value={ev.endDate[2]} min={1} max={31}
                                    onChange={e => handleDateChange(ev.id, 'endDate', 2, +e.target.value)}
                                    style={{ width: 36 }}
                                />일
                            </div>
                        </div>
                        <button className="cs-opt-del-btn" onClick={() => handleDelete(ev.id)} title="삭제">✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
