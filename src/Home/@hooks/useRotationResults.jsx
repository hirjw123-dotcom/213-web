import { useCallback, useEffect, useState } from 'preact/hooks';
import { battalionRotationController } from '../../@controllers/battalionRotationController';

function formatDateString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function useRotationResults() {
    const [date, setDate] = useState(() => new Date());
    const [results, setResults] = useState([]);

    const loadRotation = useCallback(async () => {
        const loadedResults = await battalionRotationController.calcAll(date);
        setResults(loadedResults);
    }, [date]);

    useEffect(() => {
        loadRotation();
    }, [loadRotation]);

    const changeDate = (delta) => {
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + delta);
        setDate(nextDate);
    };

    const goToday = () => {
        setDate(new Date());
    };

    const now = new Date();
    const isToday = date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate();

    const groups = {};
    for (const result of results) {
        const groupName = result.item.group;
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(result);
    }

    const displayValue = (result) => {
        if (result.value == null) return '-';
        return result.value;
    };

    return {
        date,
        groups,
        isToday,
        displayValue,
        changeDate,
        goToday,
        setDate,
        loadRotation,
        fmtDateStr: formatDateString,
    };
}
