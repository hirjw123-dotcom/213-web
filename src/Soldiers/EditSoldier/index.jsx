import { useState, useEffect } from 'preact/hooks';
import { soldiersController } from '../../@controllers/soldiersController.js';
import { soldierCategoriesController } from '../../@controllers/soldierCategoriesController.js';
import { __controllers } from '../../@controllers/__controllers.js';
import { TabInfo } from './TabInfo.jsx';
import { TabFitness } from './TabFitness.jsx';
import { TabMilitary } from './TabMilitary.jsx';
import { editSoldierCss } from './css/editSoldierCss.js';

// 날짜 배열 [y,m,d] -> "YYYY-MM-DD" 문자열
const arrToDateStr = (arr) => {
    if (!arr || arr.length < 3) return '';
    return `${arr[0]}-${String(arr[1]).padStart(2, '0')}-${String(arr[2]).padStart(2, '0')}`;
};

// "YYYY-MM-DD" 문자열 -> 날짜 배열 [y,m,d]
const dateStrToArr = (str) => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length < 3) return null;
    return [parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2])];
};

const maxDateStr = (...dates) => dates.filter(Boolean).sort().at(-1) || '';

export const EditSoldier = ({ soldier, onSave, initialTab = 'info', isNew = false }) => {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState({
        rank: soldier.rank || '이병',
        name: soldier.name || '',
        startDate: arrToDateStr(soldier.startDate),
        joinDate: arrToDateStr(soldier.joinDate),
        promotionDate: arrToDateStr(soldier.promotionDate),
        exitDate: arrToDateStr(soldier.exitDate),
        birthMonth: soldier.birthMonth ?? '',
        birthDay: soldier.birthDay ?? '',
        categories: soldier.categories || [],
        signatureImgId: soldier.signatureImgId || null,
    });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        const cats = await soldierCategoriesController.get();
        setCategories(cats.sort((a, b) => a.order - b.order));
    };

    const close = () => __controllers.popup.pop();

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const toggleCategory = (catId) => {
        setForm(prev => {
            const cats = prev.categories.includes(catId)
                ? prev.categories.filter(id => id !== catId)
                : [...prev.categories, catId];
            return { ...prev, categories: cats };
        });
    };

    const handleSave = async () => {
        const cleanName = form.name.replace(/\s/g, '');
        if (!cleanName) {
            await alert('이름을 입력해주세요.');
            return;
        }

        const restoreDateFields = () => setForm(prev => ({
            ...prev,
            startDate: arrToDateStr(soldier.startDate),
            joinDate: arrToDateStr(soldier.joinDate),
            exitDate: arrToDateStr(soldier.exitDate),
        }));

        if (form.startDate && form.joinDate && form.joinDate < form.startDate) {
            restoreDateFields();
            await alert('전입일은 입대일보다 빠를 수 없습니다. 날짜를 원래 값으로 복원했습니다.');
            return;
        }

        if (form.joinDate && form.exitDate && form.joinDate > form.exitDate) {
            restoreDateFields();
            await alert('전입일은 전역일보다 늦을 수 없습니다. 날짜를 원래 값으로 복원했습니다.');
            return;
        }

        const exitDateMin = maxDateStr(form.startDate, form.joinDate);
        if (form.exitDate && exitDateMin && form.exitDate < exitDateMin) {
            restoreDateFields();
            await alert('전역일은 입대일과 전입일보다 빠를 수 없습니다. 날짜를 원래 값으로 복원했습니다.');
            return;
        }

        const updatedSoldier = {
            ...soldier,
            rank: form.rank,
            name: cleanName,
            startDate: dateStrToArr(form.startDate) || soldier.startDate,
            joinDate: dateStrToArr(form.joinDate) || dateStrToArr(form.startDate) || soldier.joinDate,
            promotionDate: dateStrToArr(form.promotionDate),
            exitDate: dateStrToArr(form.exitDate) || soldier.exitDate,
            birthMonth: form.birthMonth || null,
            birthDay: form.birthDay || null,
            categories: form.categories,
            signatureImgId: form.signatureImgId || null,
        };

        const result = await soldiersController.save(updatedSoldier, isNew ? undefined : soldier.id);
        if (result) {
            onSave?.();
            close();
        }
    };

    const handleDelete = async () => {
        if (!await confirm(`정말 "${soldier.name}" 용사를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }
        const result = await soldiersController.delete(soldier.id);
        if (result) {
            onSave?.();
            close();
        }
    };

    // 탭 정의
    const tabs = [
        {
            id: 'info',
            label: '기본정보',
            component: <TabInfo form={form} categories={categories} handleChange={handleChange} toggleCategory={toggleCategory} setForm={setForm} />,
            showSaveButton: true,
        },
        {
            id: 'military',
            label: '국인체 간편접속',
            component: <TabMilitary soldier={soldier} />,
            showSaveButton: false,
            hidden: isNew,
        },
        {
            id: 'fitness',
            label: '체력단련',
            component: <TabFitness soldier={soldier} />,
            showSaveButton: false,
            hidden: isNew,
        },
    ].filter(a => !a.hidden);

    const activeTabData = tabs.find(t => t.id === activeTab);

    return (
        <div className="edit-soldier-modal">
            <style>{editSoldierCss}</style>

            {/* 헤더 */}
            <div className="esm-header">
                <span>{isNew ? '새 용사 추가' : `${soldier.name} ${soldier.joinDate?.join?.('-') || ''}`}</span>
                <button className="close-btn" onClick={close}>×</button>
            </div>

            {/* 본문 */}
            <div className="esm-body">
                {/* 좌측 탭 */}
                <div className="esm-tabs">
                    {tabs.map(tab => (
                        <div
                            key={tab.id}
                            className={`esm-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>

                {/* 우측 컨텐츠 */}
                <div className="esm-content">
                    {activeTabData?.component}
                </div>
            </div>

            {/* 푸터 */}
            <div className="esm-footer">
                <div className="left-btns">
                    {!isNew && <button className="btn-delete" onClick={handleDelete}>🗑️ 용사 삭제</button>}
                </div>
                <div className="right-btns">
                    <button className="secondary" onClick={close}>취소</button>
                    {activeTabData?.showSaveButton && (
                        <button onClick={handleSave}>저장하기</button>
                    )}
                </div>
            </div>
        </div>
    );
};
