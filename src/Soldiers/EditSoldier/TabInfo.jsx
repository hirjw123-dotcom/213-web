import ServiceRateSection from './@components/ServiceRateSection.jsx';
import SignatureSection from './@components/SignatureSection.jsx';

// 정보 변경 탭
export const TabInfo = ({ form, categories, handleChange, toggleCategory, setForm }) => {
    return (
        <>
            <ServiceRateSection startDate={form.startDate} exitDate={form.exitDate} />

            {/* 계급 */}
            <div className="esm-form-group">
                <label className="esm-label">계급</label>
                <input
                    type="text"
                    className="esm-input"
                    value={form.rank}
                    onInput={e => handleChange('rank', e.target.value)}
                    placeholder="계급 입력"
                />
            </div>

            {/* 이름 */}
            <div className="esm-form-group">
                <label className="esm-label">이름</label>
                <input
                    type="text"
                    className="esm-input"
                    value={form.name}
                    onInput={e => handleChange('name', e.target.value)}
                    placeholder="이름 입력"
                />
            </div>

            {/* 생일 */}
            <div className="esm-form-group">
                <label className="esm-label">생일</label>
                <div className="esm-birth-row">
                    <input
                        type="number"
                        className="esm-birth-input"
                        value={form.birthMonth}
                        onInput={e => handleChange('birthMonth', parseInt(e.target.value) || '')}
                        min="1"
                        max="12"
                        placeholder="월"
                    />
                    <span className="esm-birth-sep">월</span>
                    <input
                        type="number"
                        className="esm-birth-input"
                        value={form.birthDay}
                        onInput={e => handleChange('birthDay', parseInt(e.target.value) || '')}
                        min="1"
                        max="31"
                        placeholder="일"
                    />
                    <span className="esm-birth-sep">일</span>
                </div>
            </div>

            {/* 입대일, 전입일, 전역일 (가로 배치) */}
            <div className="esm-dates-row">
                <div className="esm-form-group">
                    <label className="esm-label">입대일</label>
                    <input
                        type="date"
                        className="esm-date-input"
                        value={form.startDate}
                        onInput={e => handleChange('startDate', e.target.value)}
                    />
                </div>
                <div className="esm-form-group">
                    <label className="esm-label">전역일</label>
                    <input
                        type="date"
                        className="esm-date-input"
                        value={form.exitDate}
                        onInput={e => handleChange('exitDate', e.target.value)}
                    />
                </div>
            </div>
            <div className="esm-dates-row">
                <div className="esm-form-group">
                    <label className="esm-label">전입일</label>
                    <input
                        type="date"
                        className="esm-date-input"
                        value={form.joinDate}
                        onInput={e => handleChange('joinDate', e.target.value)}
                    />
                </div>
                <div className="esm-form-group">
                    <label className="esm-label">최근 진급일</label>
                    <input
                        type="date"
                        className="esm-date-input"
                        value={form.promotionDate}
                        onInput={e => handleChange('promotionDate', e.target.value)}
                    />
                </div>
            </div>

            {/* 분류 */}
            <div className="esm-form-group">
                <label className="esm-label">분류</label>
                <div className="esm-categories">
                    {categories.map(cat => (
                        <div
                            key={cat.id}
                            className={`esm-cat-item ${form.categories.includes(cat.id) ? 'checked' : ''}`}
                            onClick={() => toggleCategory(cat.id)}
                            style={{ borderColor: form.categories.includes(cat.id) ? cat.color : undefined }}
                        >
                            <input
                                type="checkbox"
                                checked={form.categories.includes(cat.id)}
                                readOnly
                            />
                            <span style={{ color: cat.color }}>{cat.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 서명 이미지 */}
            <SignatureSection
                signatureImgId={form.signatureImgId}
                onChange={(id) => setForm(prev => ({ ...prev, signatureImgId: id }))}
            />
        </>
    );
};
