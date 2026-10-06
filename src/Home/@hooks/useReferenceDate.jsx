import { useState } from 'preact/hooks';

export default function useReferenceDate() {
    const [refDate, setRefDate] = useState(null);

    const getRefDate = () => refDate || new Date();

    const formatRefDate = () => {
        const date = getRefDate();
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };

    const shiftRefDate = (days) => {
        const date = new Date(getRefDate());
        date.setDate(date.getDate() + days);
        date.setHours(0, 0, 0, 0);
        setRefDate(date);
    };

    const resetRefDate = () => {
        setRefDate(null);
    };

    return {
        refDate,
        getRefDate,
        formatRefDate,
        shiftRefDate,
        resetRefDate,
    };
}
