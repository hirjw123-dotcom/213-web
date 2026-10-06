import DB from '../@modules/db.js';

const _applyDefaults = (data, list) => {
    // 1. 이름 자동 생성 및 공백 제거
    let name = data.name ? String(data.name).replace(/\s/g, '') : '';
    if (!name) {
        let i = 1;
        while (true) {
            const tempName = `신입${i}`;
            if (!list.some(s => s.name === tempName)) {
                name = tempName;
                break;
            }
            i++;
        }
    }

    // 2. 입대일 (오늘)
    const today = new Date();
    const startDate = data.startDate || [today.getFullYear(), today.getMonth() + 1, today.getDate()];

    // 3. 전역일 계산 (18개월 후, 일은 -1일)
    let exitDate = data.exitDate;
    if (!exitDate) {
        const targetMonthIdx = (startDate[1] - 1 + 18) % 12;
        const targetYear = startDate[0] + Math.floor((startDate[1] - 1 + 18) / 12);

        // 해당 월의 마지막 날짜 확인
        const lastDayOfTargetMonth = new Date(targetYear, targetMonthIdx + 1, 0).getDate();
        const day = Math.min(startDate[2] - 1, lastDayOfTargetMonth);

        const realDate = new Date(targetYear, targetMonthIdx, day);
        exitDate = [realDate.getFullYear(), realDate.getMonth() + 1, realDate.getDate()];
    }

    return {
        id: name + startDate.join(''),
        name,
        rank: data.rank || '이병',
        startDate,
        joinDate: data.joinDate || [...startDate],
        promotionDate: data.promotionDate || null,
        exitDate,
        unit: data.unit || 'u1',
        categories: data.categories || [],
        birthMonth: data.birthMonth || null,
        birthDay: data.birthDay || null,
        signatureImgId: data.signatureImgId || null,
        order: data.order ?? 9999,
    };
};

export const soldiersController = {
    get: async () => {
        return (await DB.get('soldiers')) || [];
    },

    exists: async (id) => {
        const list = await soldiersController.get();
        return list.some(s => s.id === id);
    },

    /**
     * @param {object} soldierData - 저장할 데이터
     * @param {string} [originalId] - 수정 전의 ID (ID가 변경될 경우 필요)
     */
    save: async (soldierData, originalId) => {
        const list = await soldiersController.get();

        // 기본값 및 공백 제거 적용
        const soldier = _applyDefaults(soldierData, list);

        // 찾을 ID 결정 (전달받은 originalId가 있으면 그것으로, 없으면 데이터 내의 ID로)
        const targetId = originalId || soldierData.id;
        const index = list.findIndex(s => s.id === targetId);

        if (index === -1) {
            // 신규 추가 케이스
            // 새로 생성된 ID가 이미 존재하는지 체크 (중복 방지)
            if (list.some(s => s.id === soldier.id)) {
                await alert('이미 존재하는 용사입니다. (ID 중복)');
                return false;
            }
            list.push(soldier);
        } else {
            // 수정 케이스
            // ID가 변경되는 경우 (이름이나 입대일이 바뀐 경우)
            if (soldier.id !== targetId) {
                // 변경하려는 새로운 ID가 다른 용사와 중복되는지 체크
                if (list.some((s, i) => i !== index && s.id === soldier.id)) {
                    await alert('변경하려는 정보(이름+입대일)가 다른 용사와 중복됩니다.');
                    return false;
                }
            }
            list[index] = soldier;
        }

        await DB.save('soldiers', list);
        return true;
    },

    add: async (data = {}) => {
        const list = await soldiersController.get();
        const newSoldier = _applyDefaults(data, list);

        // 중복 체크
        if (list.some(s => s.id === newSoldier.id)) {
            await alert('이미 존재하는 용사입니다. (ID 중복)');
            return null;
        }

        list.push(newSoldier);
        await DB.save('soldiers', list);
        return newSoldier;
    },

    createDraft: (data = {}) => {
        const draft = _applyDefaults({ ...data, name: '__draft__' }, []);
        return {
            ...draft,
            id: null,
            name: data.name || '',
        };
    },

    delete: async (id) => {
        const list = await soldiersController.get();
        const index = list.findIndex(s => s.id === id);
        if (index === -1) {
            return false;
        }
        list.splice(index, 1);
        await DB.save('soldiers', list);
        return true;
    }
};

