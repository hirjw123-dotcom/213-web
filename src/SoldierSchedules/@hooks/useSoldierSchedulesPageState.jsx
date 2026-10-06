import { useEffect, useRef, useState } from 'preact/hooks';
import { soldierCategoriesController } from '../../@controllers/soldierCategoriesController.js';
import { authController } from '../../@controllers/authController.js';

const CELL_WIDTH_MODE_STORAGE_KEY = 'soldierSchedules.cellWidthMode';
const PAY_GRADE_VISIBILITY_STORAGE_KEY = 'soldierSchedules.showPayGrade';

const CELL_WIDTH_MODES = ['50', '40', '30'];

const getInitialCellWidthMode = () => {
    try {
        const savedMode = localStorage.getItem(CELL_WIDTH_MODE_STORAGE_KEY);
        return CELL_WIDTH_MODES.includes(savedMode) ? savedMode : '30';
    } catch {
        return '30';
    }
};

const getInitialPeriod = () => {
    const today = new Date();
    try {
        const savedYear = Number(localStorage.getItem('soldierSchedules.lastYear'));
        const savedMonth = Number(localStorage.getItem('soldierSchedules.lastMonth'));
        if (Number.isInteger(savedYear) && savedYear > 0 && Number.isInteger(savedMonth) && savedMonth >= 1 && savedMonth <= 12) {
            return { year: savedYear, month: savedMonth };
        }
    } catch {
    }
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
};

const getInitialPayGradeVisibility = () => {
    try {
        return localStorage.getItem(PAY_GRADE_VISIBILITY_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
};

const initialPeriod = getInitialPeriod();
let lastYear = initialPeriod.year;
let lastMonth = initialPeriod.month;

export default function useSoldierSchedulesPageState() {
    const today = new Date();
    const [year, setYear] = useState(lastYear);
    const [month, setMonth] = useState(lastMonth);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [showCategoryFilter, setShowCategoryFilter] = useState(false);
    const categoryFilterRef = useRef(null);

    const [featurePermissions, setFeaturePermissions] = useState({
        manageDuty: false,
        manageDutyComposition: false,
        manageServiceRate: false,
        manageScheduleTypes: false,
    });

    const undoRef = useRef(null);
    const redoRef = useRef(null);

    const [scheduleRestrictions, setScheduleRestrictions] = useState(null);
    const [cellWidthMode, setCellWidthMode] = useState(getInitialCellWidthMode);
    const [showPayGrade, setShowPayGrade] = useState(getInitialPayGradeVisibility);

    useEffect(() => {
        soldierCategoriesController.get().then(setCategories);
        Promise.all([
            authController.checkFeaturePermission('soldierSchedules', 'manageDuty'),
            authController.checkFeaturePermission('soldierSchedules', 'manageDutyComposition'),
            authController.checkFeaturePermission('soldierSchedules', 'manageServiceRate'),
            authController.checkFeaturePermission('soldierSchedules', 'manageScheduleTypes'),
        ]).then(([duty, composition, serviceRate, scheduleTypes]) => {
            setFeaturePermissions({
                manageDuty: duty.allowed,
                manageDutyComposition: composition.allowed,
                manageServiceRate: serviceRate.allowed,
                manageScheduleTypes: scheduleTypes.allowed,
            });
        });
        authController.getScheduleRestrictions().then(setScheduleRestrictions);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(CELL_WIDTH_MODE_STORAGE_KEY, cellWidthMode);
        } catch {
        }
    }, [cellWidthMode]);

    useEffect(() => {
        try {
            localStorage.setItem(PAY_GRADE_VISIBILITY_STORAGE_KEY, String(showPayGrade));
        } catch {
        }
    }, [showPayGrade]);

    const changePeriod = (nextYear, nextMonth) => {
        setYear(nextYear);
        setMonth(nextMonth);
        lastYear = nextYear;
        lastMonth = nextMonth;
        setUndoStack([]);
        setRedoStack([]);
        localStorage.setItem('soldierSchedules.lastYear', nextYear);
        localStorage.setItem('soldierSchedules.lastMonth', nextMonth);
    };

    const prevMonth = () => {
        if (month === 1) changePeriod(year - 1, 12);
        else changePeriod(year, month - 1);
    };

    const nowMonth = () => {
        if (year === today.getFullYear() && month === today.getMonth() + 1) return;
        setYear(today.getFullYear());
        setMonth(today.getMonth() + 1);
        lastYear = today.getFullYear();
        lastMonth = today.getMonth() + 1;
        setUndoStack([]);
        setRedoStack([]);
        localStorage.setItem('soldierSchedules.lastYear', today.getFullYear());
        localStorage.setItem('soldierSchedules.lastMonth', today.getMonth() + 1);
    };

    const nextMonth = () => {
        if (month === 12) changePeriod(year + 1, 1);
        else changePeriod(year, month + 1);
    };

    const goToToday = () => {
        if (year === today.getFullYear() && month === today.getMonth() + 1) return;

        setYear(today.getFullYear());
        setMonth(today.getMonth() + 1);
        lastYear = today.getFullYear();
        lastMonth = today.getMonth() + 1;
        setUndoStack([]);
        setRedoStack([]);
        localStorage.setItem('soldierSchedules.lastYear', today.getFullYear());
        localStorage.setItem('soldierSchedules.lastMonth', today.getMonth() + 1);
    };

    const handleUndo = () => {
        if (undoRef.current) undoRef.current();
    };

    const handleRedo = () => {
        if (redoRef.current) redoRef.current();
    };

    const closeCategoryFilterIfOutside = (target) => {
        if (
            showCategoryFilter &&
            categoryFilterRef.current &&
            !categoryFilterRef.current.contains(target)
        ) {
            setShowCategoryFilter(false);
        }
    };

    return {
        year,
        month,
        showExcelModal,
        showFullHistory,
        reloadKey,
        undoStack,
        redoStack,
        categories,
        selectedCategories,
        showCategoryFilter,
        categoryFilterRef,
        featurePermissions,
        scheduleRestrictions,
        cellWidthMode,
        showPayGrade,
        undoRef,
        redoRef,
        setShowExcelModal,
        setShowFullHistory,
        setReloadKey,
        setUndoStack,
        setRedoStack,
        setSelectedCategories,
        setShowCategoryFilter,
        setCellWidthMode,
        setShowPayGrade,
        prevMonth,
        nowMonth,
        nextMonth,
        handleUndo,
        handleRedo,
        closeCategoryFilterIfOutside,
    };
}
