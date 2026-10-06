import DB from '../@modules/db.js';

// CCTV 합격 순서 관리 컨트롤러
// 키: cctvOrder
// 값: { [soldierId]: number (order) }

const DB_KEY = 'cctvOrder';

export const cctvOrderController = {
    get: async () => {
        return (await DB.get(DB_KEY)) || {};
    },

    // 전체 저장 (순서 맵)
    save: async (orderMap) => {
        await DB.save(DB_KEY, orderMap);
    },

    // 개별 용사 순서 저장
    setSoldierOrder: async (soldierId, order) => {
        const data = await cctvOrderController.get();
        data[soldierId] = order;
        await DB.save(DB_KEY, data);
    },

    // 용사 순서 삭제
    removeSoldier: async (soldierId) => {
        const data = await cctvOrderController.get();
        delete data[soldierId];
        await DB.save(DB_KEY, data);
    },
};
