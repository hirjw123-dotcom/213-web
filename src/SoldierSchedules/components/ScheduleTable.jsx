import { useState, useEffect, useCallback, useRef, useMemo } from 'preact/hooks';
import { createPortal } from 'preact/compat';
import { soldiersController } from '../../@controllers/soldiersController.js';
import { soldierSchedulesController, 열외Conditions } from '../../@controllers/soldierSchedulesController.js';
import { scheduleTypesController, dayTypesController } from '../../@controllers/soldierScheduleTypesController.js';
import { battalionSchedulesController } from '../../@controllers/battalionSchedulesController.js';
import { soldierCategoriesController } from '../../@controllers/soldierCategoriesController.js';
import { scheduleHistoryController } from '../../@controllers/scheduleHistoryController.js';
import { authController } from '../../@controllers/authController.js';
import { dutyCompositionController } from '../../@controllers/dutyCompositionController.js';
import { areDutyReplacementDataEqual, dutyReplacementController, normalizeDutyReplacementData } from '../../@controllers/dutyReplacementController.js';
import { colorSettingsController } from '../../@controllers/colorSettingsController.js';
import { combatLeaveController } from '../../@controllers/combatLeaveController.js';
import { UNITS } from '../../@modules/configs.js';
import DB from '../../@modules/db.js';
import ModalPopup from '../../@components/ModalPopup.jsx';
import { RegisterPopup } from '../../CombatLeave/CombatLeavePopups.jsx';

import { _arrEq, filterValidSoldiers, getDaysInMonth, getDayOfWeek } from '../@modules/utils.js';
import { buildDutyDistribution } from '../@modules/dutyDistribution.js';
import { scheduleTableCss } from '../css/soldierScheduleCss.js';

import DutyCompositionPanel from './DutyCompositionPanel.jsx';
import CctvOrderPanel from './CctvOrderPanel.jsx';
import SchedulePopup from './SchedulePopup.jsx';
import TypeEditorModal from './TypeEditorModal.jsx';
import SoldierHistoryModal from './SoldierHistoryModal.jsx';
import DayHistoryModal from './DayHistoryModal.jsx';
import ScheduleSidePanel from './ScheduleSidePanel.jsx';
import ScheduleMiniBoard from './ScheduleMiniBoard.jsx';
import DayTypeMenu from './DayTypeMenu.jsx';
import ScheduleDayTooltip from './ScheduleDayTooltip.jsx';
import ScheduleMainTable from './ScheduleMainTable.jsx';
import CellContextMenu from './CellContextMenu.jsx';
import PreventUpdate from '../../@components/PreventUpdate.jsx';
import useEffectEvent from '../../Soldiers/@hooks/useEffectEvent.jsx';
import { EditSoldier } from '../../Soldiers/EditSoldier/index.jsx';
import MonthlyDutyCalendar from '../../Home/@components/MonthlyDutyCalendar.jsx';
import { ApprovalPopup, ApprovalViewPopup } from '../../CombatLeave/CombatLeavePopups.jsx';

const normalizeDayTypeAssignments = (assignments) => {
    const normalized = {};
    const source = assignments || {};
    for (const [day, value] of Object.entries(source)) {
        const labels = Array.isArray(value)
            ? value
            : (typeof value === 'string' && value ? [value] : []);
        const unique = [...new Set(labels.filter(Boolean))];
        if (unique.length > 0) normalized[day] = unique;
    }
    return normalized;
};

const formatDateText = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const MANAGED_COMBAT_LEAVE_LABELS = new Set(['전휴', '반투']);

const getDigitHotkeyNumber = (event) => {
    const code = String(event?.code || '');
    if (code.startsWith('Digit') || code.startsWith('Numpad')) {
        const parsed = Number(code.replace('Digit', '').replace('Numpad', ''));
        if (Number.isInteger(parsed)) return parsed;
    }

    const key = String(event?.key || '').trim();
    if (/^[1-9]$/.test(key)) return Number(key);
    return null;
};

const getZoomAdjustedPointerPosition = (anchorElement, pointer) => {
    const fallback = {
        left: (pointer?.x || 0) + 14,
        top: (pointer?.y || 0) + 14,
    };

    if (!anchorElement || typeof window === 'undefined') return fallback;

    const zoomRoot = anchorElement.closest?.('.soldier-schedules');
    if (!zoomRoot) return fallback;

    const rect = zoomRoot.getBoundingClientRect();
    const computedZoom = Number.parseFloat(window.getComputedStyle(zoomRoot).zoom || '1');
    const zoom = Number.isFinite(computedZoom) && computedZoom > 0 ? computedZoom : 1;

    return {
        left: rect.left + (((pointer?.x || 0) - rect.left) / zoom) + 14,
        top: rect.top + (((pointer?.y || 0) - rect.top) / zoom) + 14,
    };
};

const clampFloatingPosition = (position, width, height, padding = 10) => {
    const source = position || { x: 0, y: 0 };
    if (typeof window === 'undefined') return { x: source.x || 0, y: source.y || 0 };

    let x = source.x || 0;
    let y = source.y || 0;

    if (x + width > window.innerWidth - padding) x = window.innerWidth - width - padding;
    if (y + height > window.innerHeight - padding) y = window.innerHeight - height - padding;
    if (x < padding) x = padding;
    if (y < padding) y = padding;

    return { x, y };
};

const getInitialLeftTab = () => {
    const saved = localStorage.getItem('scheduleSideTab');
    if (saved === 'schedule-mini-board' || saved === 'composition' || saved === 'types') return saved;
    return 'schedule-mini-board';
};

const getInitialRightTab = () => {
    const saved = localStorage.getItem('scheduleRightTab');
    if (saved === 'news' || saved === 'sug' || saved === 'cctv') return saved;
    return 'cctv';
};

// ========================================
// 일정표 컴포넌트
// ========================================
const cachedTooltips = {};
export default function ScheduleTable({ year, month, undoStack, setUndoStack, redoStack, setRedoStack, undoRef, redoRef, selectedCategories, featurePermissions = {}, scheduleRestrictions = null, cellWidthMode = 'narrow', showPayGrade = false }) {

    const canEditComposition = !!featurePermissions.manageDutyComposition;
    const canEditServiceRate = !!featurePermissions.manageServiceRate;
    const canEditScheduleTypes = !!featurePermissions.manageScheduleTypes;
    const canEditDuty = !!featurePermissions.manageDuty;

    // 근무일정표 달력 편집 상세 권한 체크
    const [isMasterUser, setIsMasterUser] = useState(false);
    const [userPermissions, setUserPermissions] = useState([]);
    useEffect(() => {
        const session = authController.getSession();
        if (!session?.militaryId) {
            setIsMasterUser(false);
            setUserPermissions([]);
            return;
        }

        authController.isMaster().then(setIsMasterUser);
        authController.getUserPermissions(session.militaryId).then(setUserPermissions);
    }, []);

    const blockedEditAlertRef = useRef({ key: '', timestamp: 0 });

    const hasRestrictionExceptionPermission = useCallback((permissionIds) => {
        if (isMasterUser) return true;
        if (!Array.isArray(permissionIds) || permissionIds.length === 0) return false;
        return permissionIds.some(permissionId => userPermissions.includes(permissionId));
    }, [isMasterUser, userPermissions]);

    // 일 단위 편집 가능 여부
    const getDayEditRestrictionInfo = useCallback((day) => {
        if (isMasterUser) return null;
        if (scheduleRestrictions?.editablePeriodEnabled && !hasRestrictionExceptionPermission(scheduleRestrictions.editablePeriodExceptionPermissions)) {
            const start = scheduleRestrictions.editablePeriodStart;
            const end = scheduleRestrictions.editablePeriodEnd;
            if (start && end) {
                const cellDate = new Date(year, month - 1, day);
                const startDate = new Date(start);
                const endDate = new Date(end);
                cellDate.setHours(0, 0, 0, 0);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                if (cellDate < startDate || cellDate > endDate) {
                    return {
                        code: 'editable-period',
                        message:
                            `이 셀은 편집할 수 없습니다.\n\n` +
                            `원인\n` +
                            `- '📅 근무일정표 달력 편집 상세 권한'에서 ${start} ~ ${end}의 근무만 편집할 수 있도록 제한되어 있습니다.\n` +
                            `- 선택한 날짜: ${formatDateText(cellDate)}`
                    };
                }
            }
        }
        if (!scheduleRestrictions || !scheduleRestrictions.pastDayLockEnabled) return null;
        if (hasRestrictionExceptionPermission(scheduleRestrictions.pastDayLockExceptionPermissions)) return null;
        const todayDate = new Date();
        const cellDate = new Date(year, month - 1, day);
        // 오늘 포함 과거 → 편집 불가
        todayDate.setHours(0, 0, 0, 0);
        cellDate.setHours(0, 0, 0, 0);
        if (cellDate > todayDate) return null;
        return {
            code: 'past-day-lock',
            message:
                `이 셀은 편집할 수 없습니다.\n\n` +
                `원인\n` +
                `- '📅 근무일정표 달력 편집 상세 권한'에서 '오늘을 포함하여 지난 날의 일정을 편집할 수 없게 합니다'가 활성화되어 있습니다.\n` +
                `- 선택한 날짜: ${formatDateText(cellDate)}\n` +
                `- 오늘 날짜: ${formatDateText(todayDate)}\n\n`
        };
    }, [hasRestrictionExceptionPermission, isMasterUser, month, scheduleRestrictions, year]);

    const isDayEditable = useCallback((day) => !getDayEditRestrictionInfo(day), [getDayEditRestrictionInfo]);

    const getDutyEditBlockInfo = useCallback((day) => {
        // 로그인 안됐을경우
        if (!canEditDuty) {
            if (!authController.getSession()) {
                return {
                    code: 'not-logged-in',
                    message:
                        `이 셀은 편집할 수 없습니다.\n\n` +
                        `로그인이 필요합니다.\n`
                }
            }
            return {
                code: 'no-permission',
                message:
                    `이 셀은 편집할 수 없습니다.\n\n` +
                    `원인\n` +
                    `- 현재 계정에 근무일정표 달력 편집 권한이 없습니다.\n\n`
            };
        }
        return getDayEditRestrictionInfo(day);
    }, [canEditDuty, getDayEditRestrictionInfo]);

    const showDutyEditBlockedAlert = useCallback(async (day) => {
        const info = getDutyEditBlockInfo(day);
        if (!info) return false;

        const key = `${info.code}_${year}_${month}_${day}`;
        const now = Date.now();
        if (blockedEditAlertRef.current.key === key && now - blockedEditAlertRef.current.timestamp < 800) {
            return true;
        }

        blockedEditAlertRef.current = { key, timestamp: now };
        await alert(info.message);
        return true;
    }, [getDutyEditBlockInfo, month, year]);
    const [selection, setSelection] = useState({ cells: [], isSelecting: false, startCell: null });

    const ensureCellsEditable = useCallback(async (targetCells = selection.cells) => {
        const cells = Array.isArray(targetCells) ? targetCells : [];
        const blockedCell = cells.find((cell) => cell?.day && getDutyEditBlockInfo(cell.day));

        if (blockedCell) {
            await showDutyEditBlockedAlert(blockedCell.day);
            return false;
        }

        if (cells.length === 0) {
            const fallbackDay = selection.cells?.[0]?.day || 1;
            if (getDutyEditBlockInfo(fallbackDay)) {
                await showDutyEditBlockedAlert(fallbackDay);
                return false;
            }
        }

        return true;
    }, [getDutyEditBlockInfo, selection.cells, showDutyEditBlockedAlert]);


    const today = new Date();
    const [loading, setLoading] = useState(true);


    const [soldiers, setSoldiers] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [scheduleTypes, setScheduleTypes] = useState([]);
    const [weeklySchedules, setWeeklySchedules] = useState({});
    const [dailySchedules, setDailySchedules] = useState({});
    const [holidays, setHolidays] = useState({});
    const [memos, setMemos] = useState({});
    const [dayTypes, setDayTypes] = useState([]); // 날짜 타입 정의 목록
    const [dayTypeAssignments, setDayTypeAssignments] = useState({}); // { day: string[] }
    const [lockedCells, setLockedCells] = useState({}); // { "soldierId_day": true }
    const [dutyReplacements, setDutyReplacements] = useState({}); // { "soldierId_day": { label: replacementSoldierId } }
    const [combatLeaveData, setCombatLeaveData] = useState({});
    const [showInCellCategoryMap, setShowInCellCategoryMap] = useState({});
    const [allCategories, setAllCategories] = useState([]);
    const [zzamColors, setZzamColors] = useState([]);
    const [categoryColorMap, setCategoryColorMap] = useState({});
    const [dutyComposition, setDutyComposition] = useState({ total: {}, soldiers: {} });

    const [hoveredSoldierId, setHoveredSoldierId] = useState(null);
    const [focusedSoldierId, setFocusedSoldierId] = useState(null);

    const [showPopup, setShowPopup] = useState(false);
    const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
    const [contextMenu, setContextMenu] = useState(null); // { kind, x, y, ... }
    const [showTypeEditor, setShowTypeEditor] = useState(false);
    const [editingType, setEditingType] = useState(null);

    // 우클릭 드래그용 상태
    const [dragSource, setDragSource] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragTarget, setDragTarget] = useState(null);

    // 날짜 헤더 드래그 상태
    const [dayDragState, setDayDragState] = useState({ isDragging: false, startDay: null, currentDay: null });

    // 용사 히스토리 모달
    const [showSoldierHistory, setShowSoldierHistory] = useState(null); // soldier object or null
    // 날짜별 히스토리 모달
    const [showDayHistory, setShowDayHistory] = useState(null); // { day, soldierId? } or null
    const [showMonthlyDutyCalendar, setShowMonthlyDutyCalendar] = useState(null); // { searchQuery? } or null

    // 날짜 호버 툴팁
    const [tooltipDay, setTooltipDay] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [tooltipExcludedSoldiers, setTooltipExcludedSoldiers] = useState([]);

    const tableRef = useRef(null);
    const lastMousePos = useRef({ x: 0, y: 0 });
    const selectionStateRef = useRef({ cells: [], isSelecting: false, startCell: null });
    const selectionHoverTargetRef = useRef(null);
    const selectionFrameRef = useRef(null);
    const hoveredSoldierIdRef = useRef(null);
    const hoveredDayDomRef = useRef(null);
    const hoveredSoldierNumDomRef = useRef(null);
    const hoveredDayHeaderDomRef = useRef(null);
    const suppressContextMenuRef = useRef(false);
    const suppressPopupOpenOnSimpleClickRef = useRef(false);

    // 사이드 패널 탭 상태
    const [sideTab, setSideTab] = useState(getInitialLeftTab); // 'schedule-mini-board' | 'composition' | 'types'
    const [rightTab, setRightTab] = useState(getInitialRightTab); // 'news' | 'cctv'
    const [showDutyCount, setShowDutyCount] = useState(true);
    const [boardCounts, setBoardCounts] = useState({ news: 0, sug: 0 });

    useEffect(() => {
        let isActive = true;

        const loadBoardCounts = async () => {
            const [newsItems, sugItems, newsMemos, suggestionMemos, newsPosts, suggestionPosts] = await Promise.all([
                DB.get('schedules_mini_items_news'),
                DB.get('schedules_mini_items_sug'),
                DB.get('schedules_mini_news'),
                DB.get('schedules_mini_sug'),
                DB.get('schedules_mini_posts_news'),
                DB.get('schedules_mini_posts_sug'),
            ]);

            if (!isActive) return;

            setBoardCounts({
                news: Array.isArray(newsItems)
                    ? newsItems.length
                    : (Array.isArray(newsMemos) ? newsMemos.length : 0) + (Array.isArray(newsPosts) ? newsPosts.length : 0),
                sug: Array.isArray(sugItems)
                    ? sugItems.length
                    : (Array.isArray(suggestionMemos) ? suggestionMemos.length : 0) + (Array.isArray(suggestionPosts) ? suggestionPosts.length : 0),
            });
        };

        loadBoardCounts();

        return () => {
            isActive = false;
        };
    }, []);

    const handleBoardCountChange = useCallback((boardId, count) => {
        setBoardCounts((prev) => {
            if (prev[boardId] === count) return prev;
            return { ...prev, [boardId]: count };
        });
    }, []);

    // 사이드 패널 리사이즈
    const [sidePanelWidth, setSidePanelWidth] = useState(+localStorage.getItem('sidePanelWidth') || 440);
    const [rightPanelWidth, setRightPanelWidth] = useState(+localStorage.getItem('scheduleRightPanelWidth') || 320);
    const isResizingPanel = useRef(null);
    const resizeStartX = useRef(0);
    const resizeStartWidth = useRef(450);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!isResizingPanel.current) return;
            if (isResizingPanel.current === 'left') {
                const delta = resizeStartX.current - e.clientX;
                const newWidth = Math.min(700, Math.max(240, resizeStartWidth.current + delta));
                localStorage.setItem('sidePanelWidth', newWidth);
                setSidePanelWidth(newWidth);
                return;
            }

            if (isResizingPanel.current === 'right') {
                const delta = resizeStartX.current - e.clientX;
                const newWidth = Math.min(700, Math.max(240, resizeStartWidth.current + delta));
                localStorage.setItem('scheduleRightPanelWidth', newWidth);
                setRightPanelWidth(newWidth);
            }
        };
        const onMouseUp = () => {
            if (isResizingPanel.current) {
                isResizingPanel.current = null;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, []);

    const startPanelResize = (e) => {
        e.preventDefault();
        isResizingPanel.current = 'left';
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = sidePanelWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    const startRightPanelResize = (e) => {
        e.preventDefault();
        isResizingPanel.current = 'right';
        resizeStartX.current = e.clientX;
        resizeStartWidth.current = rightPanelWidth;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    // 날짜 헤더 드래그: 선택한 날짜 범위에 dayType 지정
    const [showDayTypeMenu, setShowDayTypeMenu] = useState(false);
    const [dayTypeMenuPos, setDayTypeMenuPos] = useState({ x: 0, y: 0 });
    const [dayTypeSelectedDays, setDayTypeSelectedDays] = useState([]);
    const [visibleScheduleTypeLabels, setVisibleScheduleTypeLabels] = useState([]);
    const [activeHotkeyScheduleType, setActiveHotkeyScheduleType] = useState(null);
    const activeHotkeyScheduleTypeRef = useRef(null);
    const hotkeyFloatingRef = useRef(null);

    const positionHotkeyFloating = useCallback((pointer = lastMousePos.current) => {
        if (!activeHotkeyScheduleTypeRef.current || !hotkeyFloatingRef.current) return;

        const nextPosition = getZoomAdjustedPointerPosition(tableRef.current, pointer);
        hotkeyFloatingRef.current.style.left = `${nextPosition.left}px`;
        hotkeyFloatingRef.current.style.top = `${nextPosition.top}px`;
    }, []);

    const clearActiveHotkeyScheduleType = useCallback(() => {
        setActiveHotkeyScheduleType((prev) => (prev ? null : prev));
    }, []);

    const toggleVisibleScheduleType = useCallback((label) => {
        setVisibleScheduleTypeLabels((prev) => (
            prev.includes(label)
                ? prev.filter((item) => item !== label)
                : [...prev, label]
        ));
    }, []);

    const clearScheduleTypeFilter = useCallback(() => {
        setVisibleScheduleTypeLabels([]);
    }, []);


    const orderedScheduleTypes = useMemo(() => {
        return [...scheduleTypes].sort((a, b) => {
            const leftOrder = a?.order ?? 9999;
            const rightOrder = b?.order ?? 9999;
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return String(a?.label || '').localeCompare(String(b?.label || ''), 'ko');
        });
    }, [scheduleTypes]);
    // ESC 키로 팝업 닫기 + Ctrl+Z/Y + 숫자 토글 단축키
    useEffect(() => {
        const handleKeyDown = async (e) => {
            // 입력 필드 편집 중일 때는 단축키 무시
            // 체크박스나 라디오 버튼은 제외 (선택 상태 변경을 위해 단축키 허용)
            if (
                (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) &&
                    !['checkbox', 'radio'].includes(document.activeElement?.type))
                ||
                document.activeElement?.getAttribute('contenteditable')
            ) return;
            console.log('adw',)

            if (e.key === 'Escape') {
                if (showPopup || contextMenu) clearSelection();
                if (isDragging) { setIsDragging(false); setDragSource(null); setDragTarget(null); }
                if (dayDragState.isDragging) setDayDragState({ isDragging: false, startDay: null, currentDay: null });
                if (showDayTypeMenu) { setShowDayTypeMenu(false); setDayTypeSelectedDays([]); }
                clearActiveHotkeyScheduleType();
            }

            // 숫자키(1~9): 누르고 있는 동안 해당 일정 배치 모드 활성화
            if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && canEditDuty) {
                const num = getDigitHotkeyNumber(e);
                if (Number.isInteger(num) && num >= 1 && num <= 9 && document.hasFocus()) {
                    const targetType = orderedScheduleTypes[num - 1];
                    if (targetType?.label) {
                        // console.log(`Hotkey pressed: ${num} → ${targetType.label}`);
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveHotkeyScheduleType({
                            number: num,
                            label: targetType.label,
                            bg: targetType.bg,
                            color: targetType.color,
                            bold: !!targetType.bold,
                        });
                        return;
                    }
                }
            }

            // Ctrl+Z = undo, Ctrl+Y or Ctrl+Shift+Z = redo
            if ((e.ctrlKey || e.metaKey) && !e.altKey) {
                if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (undoRef.current) undoRef.current(); }
                if (e.key === 'y' || (e.key === 'z' && e.shiftKey) || (e.key === 'Z' && e.shiftKey)) { e.preventDefault(); if (redoRef.current) redoRef.current(); }
            }
        };
        // 전역 클릭 시 day-type-menu 외부 → 닫기
        const handleGlobalClick = (e) => {
            if (showDayTypeMenu && !dayTypeMenuJustOpened.current && !e.target.closest('.day-type-menu')) {
                setShowDayTypeMenu(false);
                setDayTypeSelectedDays([]);
            }
        };
        const handleKeyUp = (e) => {
            const num = getDigitHotkeyNumber(e);
            if (!Number.isInteger(num)) return;
            if (activeHotkeyScheduleTypeRef.current?.number === num) {
                clearActiveHotkeyScheduleType();
            }
        };
        const handleWindowBlur = () => {
            clearActiveHotkeyScheduleType();
        };
        const handleVisibilityChange = () => {
            if (document.hidden) clearActiveHotkeyScheduleType();
        };
        const handleMouseMove = (e) => {
            if (!activeHotkeyScheduleTypeRef.current) return;
            lastMousePos.current = { x: e.clientX, y: e.clientY };
            positionHotkeyFloating(lastMousePos.current);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleGlobalClick);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleGlobalClick);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [showPopup, contextMenu, isDragging, dayDragState.isDragging, showDayTypeMenu, canEditDuty, orderedScheduleTypes, clearActiveHotkeyScheduleType, positionHotkeyFloating]);

    // 데이터 로드
    const loadData = useCallback(async () => {
        setLoading(true);
        const [soldierList, scheduleData, types, battalionData, memoData, dtypes, dtAssign, lockData, categoryList, compositionData, colors, catColors, clData] = await Promise.all([
            soldiersController.get(),
            soldierSchedulesController.getSoldierSchedules({ y: year, m: month }),
            scheduleTypesController.get(),
            battalionSchedulesController.getAll(),
            DB.get(`scheduleMemos_${year}_${month}`),
            dayTypesController.get(),
            DB.get(`dayTypeAssign_${year}_${month}`),
            DB.get(`lockedCells_${year}_${month}`),
            soldierCategoriesController.get(),
            dutyCompositionController.get(year, month),
            colorSettingsController.get(),
            colorSettingsController.getCategoryColors(),
            combatLeaveController.getAll(year, month),
        ]);

        const validSoldiers = filterValidSoldiers(soldierList, year, month);
        // 중대별 정렬 후 순서별 정렬
        const unitOrder = Object.fromEntries(UNITS.map((u, i) => [u.id, i]));
        validSoldiers.sort((a, b) => {
            const unitA = unitOrder[a.unit] ?? 9999;
            const unitB = unitOrder[b.unit] ?? 9999;
            if (unitA !== unitB) return unitA - unitB;
            return (a.order ?? 9999) - (b.order ?? 9999);
        });

        const showInCellCategories = (categoryList || []).filter((category) => !!category.show_in_cell);
        const categoryById = Object.fromEntries(showInCellCategories.map((category) => [category.id, category]));
        const showInCellMap = {};
        for (const soldier of validSoldiers) {
            const cellCategories = (soldier.categories || [])
                .map((categoryId) => categoryById[categoryId])
                .filter(Boolean);
            showInCellMap[soldier.id] = cellCategories;
        }

        const replacementData = await dutyReplacementController.get(year, month, {
            validSoldierIds: validSoldiers.map((soldier) => soldier.id),
            monthSchedules: scheduleData || {},
        });

        setSoldiers(validSoldiers);
        setSchedules(scheduleData || {});
        setScheduleTypes(types);
        setWeeklySchedules(battalionData.weeklySchedules || {});
        setDailySchedules(battalionData.dailySchedules || {});
        setHolidays(battalionData.holidays || {});
        setMemos(memoData || {});
        setDayTypes(dtypes || []);
        setDayTypeAssignments(normalizeDayTypeAssignments(dtAssign));
        setLockedCells(lockData || {});
        setDutyReplacements(replacementData || {});
        setCombatLeaveData(clData || {});
        setShowInCellCategoryMap(showInCellMap);
        setAllCategories(categoryList || []);
        setDutyComposition(compositionData || { total: {}, soldiers: {} });
        setZzamColors(colors || []);
        setCategoryColorMap(catColors || {});
        setLoading(false);
    }, [year, month]);

    const reloadTypes = async () => {
        const types = await scheduleTypesController.get();
        setScheduleTypes(types);
    };

    const reloadSchedules = async () => {
        const scheduleData = await soldierSchedulesController.getSoldierSchedules({ y: year, m: month });
        setSchedules(scheduleData || {});

        const replacementData = normalizeDutyReplacementData(dutyReplacements, {
            validSoldierIds,
            monthSchedules: scheduleData || {},
        });
        if (!areDutyReplacementDataEqual(replacementData, dutyReplacements)) {
            setDutyReplacements(replacementData);
            await dutyReplacementController.save(year, month, replacementData);
        }
    };

    const reloadCombatLeaveData = useCallback(async () => {
        const nextCombatLeaveData = await combatLeaveController.getAll(year, month);
        setCombatLeaveData(nextCombatLeaveData || {});
    }, [year, month]);

    const reloadDayTypeAssignments = async () => {
        const dtAssign = await DB.get(`dayTypeAssign_${year}_${month}`);
        setDayTypeAssignments(normalizeDayTypeAssignments(dtAssign));
    };

    // undo/redo 액션 패턴:
    // action = { type: 'schedule'|'dayType', apply: async () => {...}, revert: async () => {...} }
    const pushUndoAction = (action) => {
        setUndoStack(prev => [...prev, action]);
        setRedoStack([]); // 새 액션 시 redo 스택 비우기
    };

    const performUndo = useCallback(async () => {
        if (undoStack.length === 0) return;
        const action = undoStack[undoStack.length - 1];
        setUndoStack(prev => prev.slice(0, -1));
        await action.revert();
        setRedoStack(prev => [...prev, action]);

        // undo 시 원래 기록했던 히스토리 항목을 제거 (무효화)
        if (action.historyChanges && action.historyChanges.length > 0) {
            await scheduleHistoryController.removeLast(year, month);
        }

        const needsScheduleReload = action.requiresScheduleReload ?? true;
        const needsDayTypeReload = action.requiresDayTypeReload ?? true;
        if (needsScheduleReload) await reloadSchedules();
        if (needsDayTypeReload) await reloadDayTypeAssignments();
    }, [undoStack, year, month]);

    const performRedo = useCallback(async () => {
        if (redoStack.length === 0) return;
        const action = redoStack[redoStack.length - 1];
        setRedoStack(prev => prev.slice(0, -1));
        await action.apply();
        setUndoStack(prev => [...prev, action]);

        // redo 시 히스토리에 원래 변경 다시 기록
        if (action.historyChanges && action.historyChanges.length > 0) {
            const session = authController.getSession();
            await scheduleHistoryController.add(year, month, {
                type: 'schedule',
                user: session?.name || '\uC54C \uC218 \uC5C6\uC74C',
                changes: action.historyChanges,
            });
        }

        const needsScheduleReload = action.requiresScheduleReload ?? true;
        const needsDayTypeReload = action.requiresDayTypeReload ?? true;
        if (needsScheduleReload) await reloadSchedules();
        if (needsDayTypeReload) await reloadDayTypeAssignments();
    }, [redoStack, year, month]);

    // undoRef/redoRef에 현재 함수 연결
    useEffect(() => {
        undoRef.current = performUndo;
        redoRef.current = performRedo;
    }, [performUndo, performRedo]);

    useEffect(() => { loadData(); }, [loadData]);


    const days = getDaysInMonth(year, month);
    const isToday = (day) => year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();
    const isSaturday = (day) => getDayOfWeek(year, month, day) === 6;
    const isSunday = (day) => getDayOfWeek(year, month, day) === 0;

    const scrollSoldierRowIntoView = (soldierId) => {
        if (!soldierId || !tableRef.current) return;
        const wrap = tableRef.current;
        const row = wrap.querySelector(`tr[data-soldier-id="${soldierId}"]`);
        if (!row) return;

        const stickyTop = 48;
        const wrapRect = wrap.getBoundingClientRect();
        const rowRect = row.getBoundingClientRect();
        const visibleTop = wrapRect.top + stickyTop;
        const visibleBottom = wrapRect.bottom;

        if (rowRect.top >= visibleTop && rowRect.bottom <= visibleBottom) return;

        const nextScrollTop = row.offsetTop - stickyTop;
        wrap.scrollTo({ top: Math.max(0, nextScrollTop), behavior: 'smooth' });
    };

    const clearHoveredSoldierNumBoxShadow = useCallback(() => {
        if (!hoveredSoldierNumDomRef.current) return;
        hoveredSoldierNumDomRef.current.style.boxShadow = '';
        hoveredSoldierNumDomRef.current = null;
    }, []);

    const setHoveredSoldierSafely = useCallback((soldierId) => {
        if (hoveredSoldierIdRef.current === soldierId) return;

        clearHoveredSoldierNumBoxShadow();

        hoveredSoldierIdRef.current = soldierId;

        if (soldierId && tableRef.current) {
            const nextNumCell = tableRef.current.querySelector(`tbody tr[data-soldier-id="${soldierId}"] td.col-num`);
            if (nextNumCell) {
                nextNumCell.style.boxShadow = '0 0 10px 0px #000 inset';
                hoveredSoldierNumDomRef.current = nextNumCell;
            }
        }

        setHoveredSoldierId(soldierId);
    }, [clearHoveredSoldierNumBoxShadow]);

    const handleHoverSoldier = useCallback((soldierId) => {
        setHoveredSoldierSafely(soldierId);
    }, [setHoveredSoldierSafely]);

    const handleHoverSoldierWithScroll = useCallback((soldierId) => {
        setHoveredSoldierSafely(soldierId);
        if (soldierId) scrollSoldierRowIntoView(soldierId);
    }, [setHoveredSoldierSafely]);

    const clearHoveredDayHeaderBoxShadow = useCallback(() => {
        if (!hoveredDayHeaderDomRef.current) return;
        hoveredDayHeaderDomRef.current.style.boxShadow = '';
        hoveredDayHeaderDomRef.current = null;
    }, []);

    const clearHoveredDayClass = useCallback(() => {
        if (!tableRef.current || hoveredDayDomRef.current === null) return;
        tableRef.current.querySelectorAll(`[data-day="${hoveredDayDomRef.current}"]`).forEach((node) => {
            node.classList.remove('col-hover');
        });
        clearHoveredDayHeaderBoxShadow();
        hoveredDayDomRef.current = null;
    }, [clearHoveredDayHeaderBoxShadow]);

    const handleHoverDay = useCallback((day) => {
        if (!tableRef.current || hoveredDayDomRef.current === day) return;
        if (hoveredDayDomRef.current !== null) {
            tableRef.current.querySelectorAll(`[data-day="${hoveredDayDomRef.current}"]`).forEach((node) => {
                node.classList.remove('col-hover');
            });
        }
        clearHoveredDayHeaderBoxShadow();
        tableRef.current.querySelectorAll(`[data-day="${day}"]`).forEach((node) => {
            node.classList.add('col-hover');
        });
        const nextDayHeader = tableRef.current.querySelector(`thead th.col-day[data-day="${day}"]`);
        if (nextDayHeader) {
            nextDayHeader.style.boxShadow = '0 0 10px 0px #000 inset';
            hoveredDayHeaderDomRef.current = nextDayHeader;
        }
        hoveredDayDomRef.current = day;
    }, [clearHoveredDayHeaderBoxShadow]);

    const handleFocusSoldier = (soldierId) => {
        setFocusedSoldierId((prev) => (prev === soldierId ? null : soldierId));
        if (soldierId) scrollSoldierRowIntoView(soldierId);
    };

    // 주간 일정: 해당 주의 평일만 합침 (startDay부터 연속 평일 개수)
    const getWeekdayColspan = (startDay) => {
        let colspan = 0;
        for (let d = startDay; d <= days.length; d++) {
            const dow = getDayOfWeek(year, month, d);
            if (dow >= 1 && dow <= 5) {
                colspan++;
            } else {
                break; // 토/일 만나면 중단
            }
        }
        return colspan;
    };

    // 카테고리 필터 적용
    const filteredSoldiers = useMemo(() => (
        selectedCategories.length > 0
            ? soldiers.filter(s => s.categories?.some(catId => selectedCategories.includes(catId)))
            : soldiers
    ), [soldiers, selectedCategories]);

    const validSoldierIds = useMemo(
        () => soldiers.map((soldier) => String(soldier.id)),
        [soldiers]
    );

    const filteredSoldierIndexMap = useMemo(() => {
        const indexMap = {};
        filteredSoldiers.forEach((soldier, index) => {
            indexMap[soldier.id] = index;
        });
        return indexMap;
    }, [filteredSoldiers]);

    const filteredSoldierIds = useMemo(
        () => filteredSoldiers.map((soldier) => soldier.id),
        [filteredSoldiers]
    );

    const selectedCellKeySet = useMemo(
        () => new Set(selection.cells.map((cell) => `${cell.soldierId}_${cell.day}`)),
        [selection.cells]
    );


    const isScheduleTypeFilterActive = visibleScheduleTypeLabels.length > 0;

    const scheduleTypeByLabel = useMemo(() => {
        const labelMap = {};
        for (const type of scheduleTypes) labelMap[type.label] = type;
        return labelMap;
    }, [scheduleTypes]);

    const dayTypeByLabel = useMemo(() => {
        const labelMap = {};
        for (const type of dayTypes) labelMap[type.label] = type;
        return labelMap;
    }, [dayTypes]);

    const activeScheduleCellContext = contextMenu?.kind === 'schedule-cell' ? contextMenu : null;

    const contextMenuLabels = useMemo(() => {
        if (!activeScheduleCellContext) return [];

        const cellLabels = (() => {
            const registered = schedules[activeScheduleCellContext.soldierId]?.[activeScheduleCellContext.day] || [];
            const combatLeaveEntry = combatLeaveData?.[activeScheduleCellContext.soldierId]?.[activeScheduleCellContext.day];
            if (!combatLeaveEntry?.type || registered.includes(combatLeaveEntry.type)) return registered;
            return [combatLeaveEntry.type, ...registered];
        })();
        return [...new Set(cellLabels)].sort((left, right) => {
            const leftOrder = scheduleTypeByLabel[left]?.order ?? 9999;
            const rightOrder = scheduleTypeByLabel[right]?.order ?? 9999;
            if (leftOrder !== rightOrder) return leftOrder - rightOrder;
            return left.localeCompare(right, 'ko');
        });
    }, [activeScheduleCellContext, combatLeaveData, scheduleTypeByLabel, schedules]);

    const contextMenuTitle = useMemo(() => {
        if (!contextMenu) return '';

        if (contextMenu.kind === 'soldier' || contextMenu.kind === 'category') {
            const soldier = soldiers.find((item) => String(item.id) === String(contextMenu.soldierId));
            if (!soldier) return '알 수 없는 용사';
            return `${soldier.rank} ${soldier.name}`.trim();
        }

        if (contextMenu.kind !== 'schedule-cell') return '';

        const soldier = soldiers.find((item) => String(item.id) === String(contextMenu.soldierId));
        const soldierText = soldier ? `${soldier.rank} ${soldier.name}`.trim() : '알 수 없는 용사';
        const date = new Date(year, month - 1, contextMenu.day);
        const dayName = DAY_NAMES[date.getDay()] || '';
        const dayText = String(contextMenu.day).padStart(2, '0');

        return `${soldierText} ${year}/${String(month).padStart(2, '0')}/${dayText}(${dayName})`;
    }, [contextMenu, month, soldiers, year]);

    const findScheduleCellRect = useCallback((cell) => {
        if (!cell?.soldierId || !cell?.day) return null;
        const dayCells = tableRef.current?.querySelectorAll(`td.schedule-cell[data-day="${Number(cell.day)}"]`) || [];
        const element = [...dayCells].find((candidate) => String(candidate.dataset.soldierId) === String(cell.soldierId));
        return element?.getBoundingClientRect?.() || null;
    }, []);

    const buildContextMenuPosition = useCallback((anchor, width, height) => {
        const rect = anchor?.rect || null;
        if (rect) {
            const gap = 8;
            let x = rect.right + gap;
            if (x + width > window.innerWidth - gap) x = rect.left - width - gap;
            return clampFloatingPosition({ x, y: rect.top }, width, height, gap);
        }

        return clampFloatingPosition({
            x: (anchor?.x || 0) + 8,
            y: (anchor?.y || 0) + 8,
        }, width, height, 8);
    }, []);

    useEffect(() => {
        if (focusedSoldierId && !filteredSoldiers.some((soldier) => soldier.id === focusedSoldierId)) {
            setFocusedSoldierId(null);
        }
        if (hoveredSoldierId && !filteredSoldiers.some((soldier) => soldier.id === hoveredSoldierId)) {
            setHoveredSoldierId(null);
        }
    }, [filteredSoldiers, focusedSoldierId, hoveredSoldierId]);

    useEffect(() => {
        selectionStateRef.current = selection;
    }, [selection]);

    useEffect(() => {
        hoveredSoldierIdRef.current = hoveredSoldierId;
    }, [hoveredSoldierId]);

    useEffect(() => {
        activeHotkeyScheduleTypeRef.current = activeHotkeyScheduleType;
    }, [activeHotkeyScheduleType]);

    useEffect(() => {
        if (!activeHotkeyScheduleType) return;
        positionHotkeyFloating(lastMousePos.current);
    }, [activeHotkeyScheduleType, positionHotkeyFloating]);

    useEffect(() => {
        setVisibleScheduleTypeLabels((prev) => prev.filter((label) => scheduleTypeByLabel[label]));
        setActiveHotkeyScheduleType((prev) => {
            if (!prev?.label || scheduleTypeByLabel[prev.label]) return prev;
            return null;
        });
    }, [scheduleTypeByLabel]);

    useEffect(() => {
        return () => {
            if (selectionFrameRef.current !== null) {
                cancelAnimationFrame(selectionFrameRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const handleNativeContextMenu = (e) => {
            if (!suppressContextMenuRef.current) return;
            e.preventDefault();
            e.stopPropagation();
            suppressContextMenuRef.current = false;
        };

        window.addEventListener('contextmenu', handleNativeContextMenu, true);
        return () => {
            window.removeEventListener('contextmenu', handleNativeContextMenu, true);
        };
    }, []);

    // 툴팁 날짜 변경 시 열외자 비동기 계산 (병렬 처리로 성능 개선)
    const tooltipSeqRef = useRef(0);
    useEffect(() => {
        if (tooltipDay === null) {
            setTooltipExcludedSoldiers([]);
            return;
        }
        const seq = ++tooltipSeqRef.current;
        const excludeLabels = new Set(['주', '평', '야주', '야평', '주주', '주평', '훈', '출', '박', '휴']);

        const cacheKey = `${year}-${month}-${tooltipDay}-${filteredSoldierIds.join(',')}-${JSON.stringify(dutyReplacements || {})}`;
        setTooltipExcludedSoldiers(cachedTooltips[cacheKey] || []);

        (async () => {
            // 모든 용사에 대해 병렬로 열외 사유 조회
            const reasonsResults = await Promise.all(
                filteredSoldiers.map(soldier =>
                    열외Conditions.get열외Reasons(soldier.id, year, month, tooltipDay)
                        .then(reasons => ({ soldier, reasons }))
                )
            );
            if (seq !== tooltipSeqRef.current) return;

            const results = [];
            for (const { soldier, reasons } of reasonsResults) {
                const filtered = reasons.filter(r => !excludeLabels.has(r));
                if (filtered.length > 0) results.push({ soldier, reasons: filtered });
            }
            setTooltipExcludedSoldiers(results);
            cachedTooltips[cacheKey] = results;
        })();
    }, [tooltipDay, year, month, filteredSoldiers, filteredSoldierIds, dutyReplacements]);

    const openPopupForCells = useCallback((cells, anchor = lastMousePos.current) => {
        if (!Array.isArray(cells) || cells.length === 0) return;

        const popupWidth = cells.length === 1 ? 580 : 340;
        const popupHeight = 450;
        const anchorCell = cells[cells.length - 1];
        const nextPosition = buildContextMenuPosition({
            ...anchor,
            rect: findScheduleCellRect(anchorCell),
        }, popupWidth, popupHeight);

        setContextMenu(null);
        setSelection({ cells, isSelecting: false, startCell: cells[0] || null });
        setPopupPosition(nextPosition);
        setShowPopup(true);
        popupJustOpened.current = true;
        requestAnimationFrame(() => {
            popupJustOpened.current = false;
        });
    }, [buildContextMenuPosition, findScheduleCellRect]);

    const openCellContextMenu = useCallback((cell, anchor = lastMousePos.current) => {
        if (!cell?.soldierId || !cell?.day) return;

        const menuWidth = 236;
        const rowCount = Math.max(2, (schedules[cell.soldierId]?.[cell.day] || []).length + 2);
        const menuHeight = 20 + (rowCount * 34);
        const nextPosition = buildContextMenuPosition({
            ...anchor,
            rect: findScheduleCellRect(cell),
        }, menuWidth, menuHeight);

        setShowPopup(false);
        setSelection({ cells: [cell], isSelecting: false, startCell: cell });
        setContextMenu({ kind: 'schedule-cell', soldierId: cell.soldierId, day: cell.day, ...nextPosition });
        cellContextMenuJustOpened.current = true;
        requestAnimationFrame(() => {
            cellContextMenuJustOpened.current = false;
        });
    }, [buildContextMenuPosition, findScheduleCellRect, schedules]);

    const openSoldierContextMenu = useCallback((soldier, anchor = lastMousePos.current) => {
        if (!soldier?.id) return;

        const nextPosition = buildContextMenuPosition(anchor, 236, 150);
        setShowPopup(false);
        setSelection({ cells: [], isSelecting: false, startCell: null });
        setContextMenu({ kind: 'soldier', soldierId: soldier.id, ...nextPosition });
        cellContextMenuJustOpened.current = true;
        requestAnimationFrame(() => {
            cellContextMenuJustOpened.current = false;
        });
    }, [buildContextMenuPosition]);

    const openCategoryContextMenu = useCallback((soldier, anchor = lastMousePos.current) => {
        if (!soldier?.id) return;

        const rowCount = Math.max(1, allCategories.filter((category) => category.id !== 'officer').length);
        const nextPosition = buildContextMenuPosition(anchor, 260, 44 + (rowCount * 34));
        setShowPopup(false);
        setSelection({ cells: [], isSelecting: false, startCell: null });
        setContextMenu({ kind: 'category', soldierId: soldier.id, ...nextPosition });
        cellContextMenuJustOpened.current = true;
        requestAnimationFrame(() => {
            cellContextMenuJustOpened.current = false;
        });
    }, [allCategories, buildContextMenuPosition]);

    // 셀 선택 시작 (좌클릭)
    const handleMouseDown = async (e, soldierId, day) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        const activeHotkey = activeHotkeyScheduleTypeRef.current;

        if (e.button === 0 && isScheduleTypeFilterActive) {
            if (activeHotkey?.number) {
                if (!visibleScheduleTypeLabels.includes(activeHotkey.label)) {
                    e.preventDefault();
                    e.stopPropagation();

                    await alert('근무 필터를 먼저 해제해주세요');
                    return;
                }
            }
        }
        if (e.button === 0 && activeHotkey?.label) {
            e.preventDefault();
            e.stopPropagation();
            if (!isDayEditable(day)) {
                clearActiveHotkeyScheduleType();
                return;
            }
            const lockKey = `${soldierId}_${day}`;
            if (lockedCells[lockKey]) return;
            const currentLabels = schedules[soldierId]?.[day] || [];
            if (MANAGED_COMBAT_LEAVE_LABELS.has(activeHotkey.label) && !currentLabels.includes(activeHotkey.label)) {
                return;
            }
            const action = currentLabels.includes(activeHotkey.label) ? 'remove' : 'add';
            await saveSchedules({ [activeHotkey.label]: action }, undefined, undefined, [{ soldierId, day }]);
            return;
        }
        const hasFloatingOverlay = showPopup || !!contextMenu;
        const shouldStartMove = e.button === 2;
        if (shouldStartMove) {
            // 우클릭 또는 이동 모드 좌클릭: 드래그 이동 시작
            e.preventDefault();
            e.stopPropagation();
            suppressContextMenuRef.current = true;
            if (hasFloatingOverlay) closeFloatingOverlays();
            const cellsToMove = selection.cells.length > 0 && isCellSelected(soldierId, day)
                ? selection.cells
                : [{ soldierId, day }];
            setDragSource({ cells: cellsToMove, startCell: { soldierId, day } });
            setIsDragging(true);
            setDragTarget({ soldierId, day });
            return;
        }
        if (e.button !== 0) return;
        e.preventDefault();
        if (hasFloatingOverlay) {
            clearSelection();
            suppressPopupOpenOnSimpleClickRef.current = true;
        }
        else setContextMenu(null);
        setSelection({
            cells: [{ soldierId, day }],
            isSelecting: true,
            startCell: { soldierId, day },
        });
    };

    // 셀 이동 로직
    const moveCells = async (source, target) => {
        if (!source || !target || source.cells.length === 0) return;

        // 권한 확인 (canEdit prop 사용)
        if (!canEditDuty) {
            await showDutyEditBlockedAlert(target.day);
            return;
        }

        // 시작 셀과 타겟 셀의 오프셋 계산
        const startSoldierIdx = filteredSoldierIndexMap[source.startCell.soldierId];
        const targetSoldierIdx = filteredSoldierIndexMap[target.soldierId];
        if (startSoldierIdx === undefined || targetSoldierIdx === undefined) return;
        const soldierOffset = targetSoldierIdx - startSoldierIdx;
        const dayOffset = target.day - source.startCell.day;

        // 이동할 데이터 수집 + before 상태 기록
        const moves = [];
        for (const cell of source.cells) {
            const srcSoldierIdx = filteredSoldierIndexMap[cell.soldierId];
            if (srcSoldierIdx === undefined) continue;
            const destSoldierIdx = srcSoldierIdx + soldierOffset;
            const destDay = cell.day + dayOffset;

            if (destSoldierIdx < 0 || destSoldierIdx >= filteredSoldiers.length) continue;
            if (destDay < 1 || destDay > days.length) continue;

            const destSoldierId = filteredSoldiers[destSoldierIdx].id;
            const srcSchedules = schedules[cell.soldierId]?.[cell.day] || [];
            const destSchedulesBefore = schedules[destSoldierId]?.[destDay] || [];

            moves.push({
                src: { soldierId: cell.soldierId, day: cell.day, before: [...srcSchedules] },
                dest: { soldierId: destSoldierId, day: destDay, before: [...destSchedulesBefore] },
            });
        }

        const blockedMove = moves.find((move) => getDayEditRestrictionInfo(move.src.day) || getDayEditRestrictionInfo(move.dest.day));
        if (blockedMove) {
            const blockedDay = getDayEditRestrictionInfo(blockedMove.dest.day)
                ? blockedMove.dest.day
                : blockedMove.src.day;
            await showDutyEditBlockedAlert(blockedDay);
            return;
        }

        const memoStateBefore = { ...memos };
        const memoStateAfter = { ...memoStateBefore };
        for (const move of moves) {
            const srcKey = `${move.src.soldierId}_${move.src.day}`;
            const destKey = `${move.dest.soldierId}_${move.dest.day}`;
            const srcMemo = memoStateBefore[srcKey] || '';

            delete memoStateAfter[srcKey];
            if (srcMemo) memoStateAfter[destKey] = srcMemo;
            else delete memoStateAfter[destKey];
        }

        const persistMemos = async (nextMemos) => {
            setMemos(nextMemos);
            await DB.save(`scheduleMemos_${year}_${month}`, nextMemos);
        };

        // apply: 이동 실행
        const applyMove = async () => {
            for (const move of moves) {
                // 목적지 기존 일정 삭제
                const destCurrent = await soldierSchedulesController.getSoldierSchedules({ soldierId: move.dest.soldierId, y: year, m: month, d: move.dest.day }) || [];
                for (const label of (Array.isArray(destCurrent) ? destCurrent : [])) {
                    await soldierSchedulesController.remove({ soldierId: move.dest.soldierId, y: year, m: month, d: move.dest.day, scheduleLabel: label });
                }
                // 출발지 → 목적지 복사
                for (const label of move.src.before) {
                    await soldierSchedulesController.add({ soldierId: move.dest.soldierId, y: year, m: month, d: move.dest.day, scheduleLabel: label });
                }
                // 출발지 삭제
                const srcCurrent = await soldierSchedulesController.getSoldierSchedules({ soldierId: move.src.soldierId, y: year, m: month, d: move.src.day }) || [];
                for (const label of (Array.isArray(srcCurrent) ? srcCurrent : [])) {
                    await soldierSchedulesController.remove({ soldierId: move.src.soldierId, y: year, m: month, d: move.src.day, scheduleLabel: label });
                }
            }

            if (JSON.stringify(memoStateBefore) !== JSON.stringify(memoStateAfter)) {
                await persistMemos(memoStateAfter);
            }
        };

        // revert: 원래대로 복원
        const revertMove = async () => {
            for (const move of moves) {
                // 출발지 복원
                const srcCur = await soldierSchedulesController.getSoldierSchedules({ soldierId: move.src.soldierId, y: year, m: month, d: move.src.day }) || [];
                for (const label of (Array.isArray(srcCur) ? srcCur : [])) {
                    await soldierSchedulesController.remove({ soldierId: move.src.soldierId, y: year, m: month, d: move.src.day, scheduleLabel: label });
                }
                for (const label of move.src.before) {
                    await soldierSchedulesController.add({ soldierId: move.src.soldierId, y: year, m: month, d: move.src.day, scheduleLabel: label });
                }
                // 목적지 복원
                const destCur = await soldierSchedulesController.getSoldierSchedules({ soldierId: move.dest.soldierId, y: year, m: month, d: move.dest.day }) || [];
                for (const label of (Array.isArray(destCur) ? destCur : [])) {
                    await soldierSchedulesController.remove({ soldierId: move.dest.soldierId, y: year, m: month, d: move.dest.day, scheduleLabel: label });
                }
                for (const label of move.dest.before) {
                    await soldierSchedulesController.add({ soldierId: move.dest.soldierId, y: year, m: month, d: move.dest.day, scheduleLabel: label });
                }
            }

            if (JSON.stringify(memoStateBefore) !== JSON.stringify(memoStateAfter)) {
                await persistMemos(memoStateBefore);
            }
        };

        await applyMove();

        // 히스토리 기록 (변경사항이 있는 것만)
        const session = authController.getSession();
        const changes = moves.flatMap(m => [
            { soldierId: m.src.soldierId, day: m.src.day, before: m.src.before, after: [] },
            { soldierId: m.dest.soldierId, day: m.dest.day, before: m.dest.before, after: [...m.src.before] },
        ]).filter(c => !_arrEq(c.before, c.after));

        pushUndoAction({ type: 'schedule', apply: applyMove, revert: revertMove, historyChanges: changes });

        if (changes.length > 0) {
            await scheduleHistoryController.add(year, month, { type: 'schedule', user: session?.name || '\uC54C \uC218 \uC5C6\uC74C', changes });
        }

        await reloadSchedules();
        clearSelection();
    };

    // 컨텍스트 메뉴 방지
    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (suppressContextMenuRef.current) {
            suppressContextMenuRef.current = false;
        }
    };

    const applySelectionByTarget = useCallback((soldierId, day) => {
        const currentSelection = selectionStateRef.current;
        if (!currentSelection.isSelecting || !currentSelection.startCell) return;

        const startIdx = filteredSoldierIndexMap[currentSelection.startCell.soldierId];
        const endIdx = filteredSoldierIndexMap[soldierId];
        if (startIdx === undefined || endIdx === undefined) return;

        const minIdx = Math.min(startIdx, endIdx);
        const maxIdx = Math.max(startIdx, endIdx);
        const minDay = Math.min(currentSelection.startCell.day, day);
        const maxDay = Math.max(currentSelection.startCell.day, day);

        const newCells = [];
        for (let i = minIdx; i <= maxIdx; i++) {
            const nextSoldierId = filteredSoldiers[i]?.id;
            if (!nextSoldierId) continue;
            for (let d = minDay; d <= maxDay; d++) {
                newCells.push({ soldierId: nextSoldierId, day: d });
            }
        }

        setSelection((prev) => {
            if (!prev.isSelecting || !prev.startCell) return prev;
            return { ...prev, cells: newCells };
        });
    }, [filteredSoldiers, filteredSoldierIndexMap]);

    const handleMouseEnter = (e, soldierId, day) => {
        lastMousePos.current = { x: e.clientX, y: e.clientY };

        // 우클릭 드래그 중
        if (isDragging && dragSource) {
            setDragTarget({ soldierId, day });
            return;
        }

        if (!selection.isSelecting || !selection.startCell) return;

        const prevTarget = selectionHoverTargetRef.current;
        if (prevTarget && prevTarget.soldierId === soldierId && prevTarget.day === day) return;

        selectionHoverTargetRef.current = { soldierId, day };
        if (selectionFrameRef.current !== null) return;

        selectionFrameRef.current = requestAnimationFrame(() => {
            selectionFrameRef.current = null;
            const latestTarget = selectionHoverTargetRef.current;
            if (!latestTarget) return;
            applySelectionByTarget(latestTarget.soldierId, latestTarget.day);
        });
    };

    // 우클릭 드래그 종료 - 셀 이동 실행
    const handleMouseUp = async (e) => {
        // 우클릭 드래그 완료
        if (isDragging && dragSource && dragTarget) {
            if (e?.button === 2) {
                e.preventDefault();
                e.stopPropagation();
                suppressContextMenuRef.current = true;
            }
            const isSameCell = dragSource.startCell?.soldierId === dragTarget.soldierId
                && dragSource.startCell?.day === dragTarget.day;

            if (isSameCell) {
                openCellContextMenu(dragSource.startCell, {
                    x: e?.clientX || lastMousePos.current.x,
                    y: e?.clientY || lastMousePos.current.y,
                });
            } else {
                await moveCells(dragSource, dragTarget);
            }
            setIsDragging(false);
            setDragSource(null);
            setDragTarget(null);
            requestAnimationFrame(() => {
                suppressContextMenuRef.current = false;
            });
            return;
        }

        // 좌클릭 선택 완료
        handleLeftMouseUp();
    };


    // 팝업이 방금 열렸는지 추적 (click 이벤트 무시용)
    const popupJustOpened = useRef(false);
    const cellContextMenuJustOpened = useRef(false);
    const dayTypeMenuJustOpened = useRef(false);

    const handleReorderScheduleType = async (fromIdx, toIdx) => {
        if (fromIdx === toIdx) return;
        const newTypes = [...scheduleTypes];
        const [movedType] = newTypes.splice(fromIdx, 1);
        newTypes.splice(toIdx, 0, movedType);
        newTypes.forEach((type, index) => {
            type.order = index;
        });
        for (const type of newTypes) {
            await scheduleTypesController.update(type.label, { order: type.order });
        }
        reloadTypes();
    };

    // 좌클릭 드래그/클릭 종료 시 팝업 표시
    const handleLeftMouseUp = () => {
        if (!selection.isSelecting) return;

        const cells = selection.cells;
        const isSimpleClick = cells.length === 1
            && selection.startCell
            && cells[0].soldierId === selection.startCell.soldierId
            && cells[0].day === selection.startCell.day;
        const shouldSuppressPopup = suppressPopupOpenOnSimpleClickRef.current && isSimpleClick;

        suppressPopupOpenOnSimpleClickRef.current = false;

        if (shouldSuppressPopup) {
            clearSelection();
            return;
        }

        if (cells.length > 0) {
            openPopupForCells(cells, lastMousePos.current);
            return;
        }

        setSelection((prev) => ({ ...prev, isSelecting: false }));
    };

    // 바깥 클릭으로 팝업 닫기
    const handleBodyClick = (e) => {
        // 팝업이 방금 열렸으면 무시
        if (popupJustOpened.current || cellContextMenuJustOpened.current) return;
        if (showPopup && !e.target.closest('.schedule-popup')) {
            clearSelection();
            return;
        }
        if (contextMenu && !e.target.closest('.schedule-cell-context-menu')) {
            clearSelection();
        }
    };

    const isCellSelected = useCallback((soldierId, day) => {
        return selectedCellKeySet.has(`${soldierId}_${day}`);
    }, [selectedCellKeySet]);

    const patchSchedulesWithSnapshots = (prevSchedules, snapshots, keyName) => {
        const next = { ...prevSchedules };
        for (const snap of snapshots) {
            const soldierId = snap.soldierId;
            const day = snap.day;
            const labels = Array.isArray(snap[keyName]) ? [...new Set(snap[keyName])] : [];

            const soldierMap = { ...(next[soldierId] || {}) };
            if (labels.length > 0) soldierMap[day] = labels;
            else delete soldierMap[day];

            if (Object.keys(soldierMap).length > 0) next[soldierId] = soldierMap;
            else delete next[soldierId];
        }
        return next;
    };

    const parseReplacementCellKey = (cellKey) => {
        if (typeof cellKey !== 'string') return null;
        const separatorIndex = cellKey.lastIndexOf('_');
        if (separatorIndex <= 0) return null;

        const soldierId = cellKey.slice(0, separatorIndex).trim();
        const day = Number(cellKey.slice(separatorIndex + 1));
        if (!soldierId || !Number.isInteger(day) || day < 1) return null;

        return { soldierId, day };
    };

    const setCellSchedules = (prevSchedules, soldierId, day, labels) => {
        const nextSchedules = { ...prevSchedules };
        const nextSoldierSchedules = { ...(nextSchedules[soldierId] || {}) };
        const normalizedLabels = [...new Set((labels || []).filter(Boolean))];

        if (normalizedLabels.length > 0) nextSoldierSchedules[day] = normalizedLabels;
        else delete nextSoldierSchedules[day];

        if (Object.keys(nextSoldierSchedules).length > 0) nextSchedules[soldierId] = nextSoldierSchedules;
        else delete nextSchedules[soldierId];

        return nextSchedules;
    };

    const moveScheduleLabelBetweenCells = (prevSchedules, sourceSoldierId, day, targetSoldierId, label) => {
        const sourceLabels = [...(prevSchedules?.[sourceSoldierId]?.[day] || [])];
        if (!sourceLabels.includes(label)) return prevSchedules;

        const nextSourceLabels = sourceLabels.filter((item) => item !== label);
        const targetLabels = [...(prevSchedules?.[targetSoldierId]?.[day] || [])];
        const nextTargetLabels = targetLabels.includes(label)
            ? targetLabels
            : [...targetLabels, label];

        let nextSchedules = setCellSchedules(prevSchedules, sourceSoldierId, day, nextSourceLabels);
        nextSchedules = setCellSchedules(nextSchedules, targetSoldierId, day, nextTargetLabels);
        return nextSchedules;
    };

    const buildChangedSnapshotsFromSchedules = (prevSchedules, nextSchedules, cells) => {
        const uniqueCells = Object.values(
            (cells || []).reduce((acc, cell) => {
                if (!cell?.soldierId || !cell?.day) return acc;
                acc[`${cell.soldierId}_${cell.day}`] = {
                    soldierId: cell.soldierId,
                    day: cell.day,
                };
                return acc;
            }, {})
        );

        return uniqueCells.map((cell) => ({
            soldierId: cell.soldierId,
            day: cell.day,
            before: [...(prevSchedules?.[cell.soldierId]?.[cell.day] || [])],
            after: [...(nextSchedules?.[cell.soldierId]?.[cell.day] || [])],
        })).filter((snapshot) => !_arrEq(snapshot.before, snapshot.after));
    };

    const resolveReciprocalDutyReplacements = ({
        currentCell,
        nextSchedules,
        nextDutyReplacements,
    }) => {
        if (!currentCell || !nextDutyReplacements) {
            return {
                schedules: nextSchedules,
                dutyReplacements: nextDutyReplacements,
                affectedCells: [],
            };
        }

        const sourceSoldierId = String(currentCell.soldierId);
        const currentCellKey = `${sourceSoldierId}_${Number(currentCell.day)}`;
        const currentReplacementMap = nextDutyReplacements[currentCellKey] || {};
        const updatedDutyReplacements = { ...nextDutyReplacements };
        let updatedSchedules = nextSchedules;
        const affectedCells = {};

        const markAffectedCell = (soldierId, day) => {
            affectedCells[`${soldierId}_${day}`] = { soldierId, day };
        };

        for (const [label, replacementSoldierIdValue] of Object.entries(currentReplacementMap)) {
            const replacementSoldierId = String(replacementSoldierIdValue || '').trim();
            if (!replacementSoldierId || replacementSoldierId === sourceSoldierId) continue;

            const reciprocalEntry = Object.entries(updatedDutyReplacements).find(([cellKey, replacementMap]) => {
                if (cellKey === currentCellKey) return false;

                const parsed = parseReplacementCellKey(cellKey);
                if (!parsed || parsed.soldierId !== replacementSoldierId) return false;

                return String(replacementMap?.[label] || '').trim() === sourceSoldierId;
            });

            if (!reciprocalEntry) continue;

            const [reciprocalCellKey] = reciprocalEntry;
            const reciprocalCell = parseReplacementCellKey(reciprocalCellKey);
            if (!reciprocalCell) continue;

            updatedSchedules = moveScheduleLabelBetweenCells(
                updatedSchedules,
                sourceSoldierId,
                Number(currentCell.day),
                replacementSoldierId,
                label
            );
            updatedSchedules = moveScheduleLabelBetweenCells(
                updatedSchedules,
                replacementSoldierId,
                reciprocalCell.day,
                sourceSoldierId,
                label
            );

            const nextCurrentMap = { ...(updatedDutyReplacements[currentCellKey] || {}) };
            delete nextCurrentMap[label];
            if (Object.keys(nextCurrentMap).length > 0) updatedDutyReplacements[currentCellKey] = nextCurrentMap;
            else delete updatedDutyReplacements[currentCellKey];

            const nextReciprocalMap = { ...(updatedDutyReplacements[reciprocalCellKey] || {}) };
            delete nextReciprocalMap[label];
            if (Object.keys(nextReciprocalMap).length > 0) updatedDutyReplacements[reciprocalCellKey] = nextReciprocalMap;
            else delete updatedDutyReplacements[reciprocalCellKey];

            markAffectedCell(sourceSoldierId, Number(currentCell.day));
            markAffectedCell(replacementSoldierId, Number(currentCell.day));
            markAffectedCell(replacementSoldierId, reciprocalCell.day);
            markAffectedCell(sourceSoldierId, reciprocalCell.day);
        }

        return {
            schedules: updatedSchedules,
            dutyReplacements: updatedDutyReplacements,
            affectedCells: Object.values(affectedCells),
        };
    };

    const saveDutyReplacements = useCallback(async (nextDutyReplacements, nextSchedules = schedules) => {
        const normalized = normalizeDutyReplacementData(nextDutyReplacements, {
            validSoldierIds,
            monthSchedules: nextSchedules,
        });

        if (!areDutyReplacementDataEqual(normalized, dutyReplacements)) {
            setDutyReplacements(normalized);
            await dutyReplacementController.save(year, month, normalized);
        }

        return normalized;
    }, [dutyReplacements, schedules, validSoldierIds, year, month]);

    const applyScheduleSnapshots = async (snapshots, keyName) => {
        if (!Array.isArray(snapshots) || snapshots.length === 0) return;
        const nextSchedules = patchSchedulesWithSnapshots(schedules, snapshots, keyName);

        setSchedules(nextSchedules);
        await saveDutyReplacements(dutyReplacements, nextSchedules);

        await soldierSchedulesController.setCells({
            y: year,
            m: month,
            cells: snapshots.map((snap) => ({
                soldierId: snap.soldierId,
                d: snap.day,
                labels: snap[keyName],
            })),
        });
    };

    const commitScheduleSnapshots = async (changedSnapshots) => {
        if (!Array.isArray(changedSnapshots) || changedSnapshots.length === 0) return false;

        const applySave = async () => {
            await applyScheduleSnapshots(changedSnapshots, 'after');
        };

        const revertSave = async () => {
            await applyScheduleSnapshots(changedSnapshots, 'before');
        };

        await applySave();

        const session = authController.getSession();
        const historyChanges = changedSnapshots.map((snapshot) => ({
            soldierId: snapshot.soldierId,
            day: snapshot.day,
            before: snapshot.before,
            after: snapshot.after,
        }));

        pushUndoAction({
            type: 'schedule',
            apply: applySave,
            revert: revertSave,
            historyChanges,
            requiresScheduleReload: false,
            requiresDayTypeReload: false,
        });

        await scheduleHistoryController.add(year, month, {
            type: 'schedule',
            user: session?.name || '\uC54C \uC218 \uC5C6\uC74C',
            changes: historyChanges,
        });

        return true;
    };

    // 스케줄 저장 (undo/redo 지원)
    const saveSchedules = async (changes, memo, nextCellDutyReplacements, targetCells = selection.cells) => {
        if (!await ensureCellsEditable(targetCells)) {
            return;
        }

        if (!targetCells || targetCells.length === 0) return;

        const uniqueCells = Object.values(
            targetCells.reduce((acc, cell) => {
                if (!cell?.soldierId || !cell?.day) return acc;
                acc[`${cell.soldierId}_${cell.day}`] = { soldierId: cell.soldierId, day: cell.day };
                return acc;
            }, {})
        );

        if (uniqueCells.length === 0) return;

        const managedChanges = Object.fromEntries(
            Object.entries(changes || {}).filter(([label]) => MANAGED_COMBAT_LEAVE_LABELS.has(label))
        );

        const sanitizedChanges = Object.fromEntries(
            Object.entries(changes || {}).filter(([label]) => !MANAGED_COMBAT_LEAVE_LABELS.has(label))
        );

        let legacyManagedScheduleChanges = {};

        if (uniqueCells.length === 1 && Object.keys(managedChanges).length > 0) {
            const cell = uniqueCells[0];
            const soldier = soldiers.find((item) => String(item.id) === String(cell.soldierId));
            const existingEntry = combatLeaveData?.[cell.soldierId]?.[cell.day] || null;

            for (const [label, action] of Object.entries(managedChanges)) {
                if (action === 'add') {
                    if (existingEntry?.status === 'approved' && existingEntry.type !== label) {
                        await alert('승인된 전투휴무는 덮어쓸 수 없습니다.');
                        return;
                    }
                    if (!soldier) return;

                    ModalPopup.push(
                        <RegisterPopup
                            type={label}
                            soldier={soldier}
                            year={year}
                            month={month}
                            day={cell.day}
                            onRegistered={reloadCombatLeaveData}
                        />
                    );

                    if (memo !== undefined) {
                        const key = `${cell.soldierId}_${cell.day}`;
                        const newMemos = { ...memos };
                        if (memo) newMemos[key] = memo;
                        else delete newMemos[key];
                        setMemos(newMemos);
                        await DB.save(`scheduleMemos_${year}_${month}`, newMemos);
                    }
                    return;
                }

                if (action === 'remove' && existingEntry?.type === label) {
                    if (!soldier) return;

                    ModalPopup.push(existingEntry.status === 'approved'
                        ? (
                            <ApprovalViewPopup
                                entry={{ ...existingEntry, soldierId: cell.soldierId, day: cell.day }}
                                soldier={soldier}
                                year={year}
                                month={month}
                                onApproved={reloadCombatLeaveData}
                            />
                        )
                        : (
                            <ApprovalPopup
                                entry={{ ...existingEntry, soldierId: cell.soldierId, day: cell.day }}
                                soldier={soldier}
                                year={year}
                                month={month}
                                onApproved={reloadCombatLeaveData}
                            />
                        ));
                    return;
                }

                if (action === 'remove' && existingEntry?.type !== label) {
                    legacyManagedScheduleChanges[label] = 'remove';
                }
            }
        }

        const effectiveSanitizedChanges = {
            ...sanitizedChanges,
            ...legacyManagedScheduleChanges,
        };

        const nextSchedulesFromDirectChanges = uniqueCells.reduce((acc, cell) => {
            const before = [...(acc[cell.soldierId]?.[cell.day] || [])];
            let after = [...before];
            for (const [label, action] of Object.entries(effectiveSanitizedChanges)) {
                if (action === 'add' && !after.includes(label)) after.push(label);
                else if (action === 'remove') after = after.filter((l) => l !== label);
            }
            if (_arrEq(before, after)) return acc;
            return setCellSchedules(acc, cell.soldierId, cell.day, after);
        }, schedules);

        let finalSchedules = nextSchedulesFromDirectChanges;
        let finalDutyReplacements = dutyReplacements;
        let reciprocalAffectedCells = [];

        if (uniqueCells.length === 1 && nextCellDutyReplacements !== undefined) {
            const cell = uniqueCells[0];
            const cellKey = `${cell.soldierId}_${cell.day}`;
            const nextReplacementState = { ...dutyReplacements };

            if (nextCellDutyReplacements && Object.keys(nextCellDutyReplacements).length > 0) {
                nextReplacementState[cellKey] = nextCellDutyReplacements;
            } else {
                delete nextReplacementState[cellKey];
            }

            const resolved = resolveReciprocalDutyReplacements({
                currentCell: cell,
                nextSchedules: nextSchedulesFromDirectChanges,
                nextDutyReplacements: nextReplacementState,
            });

            finalSchedules = resolved.schedules;
            finalDutyReplacements = resolved.dutyReplacements;
            reciprocalAffectedCells = resolved.affectedCells;
        }

        const changedSnapshots = buildChangedSnapshotsFromSchedules(
            schedules,
            finalSchedules,
            [...uniqueCells, ...reciprocalAffectedCells]
        );

        await commitScheduleSnapshots(changedSnapshots);

        if (uniqueCells.length === 1 && memo !== undefined) {
            const cell = uniqueCells[0];
            const key = `${cell.soldierId}_${cell.day}`;
            const newMemos = { ...memos };
            if (memo) newMemos[key] = memo;
            else delete newMemos[key];
            setMemos(newMemos);
            await DB.save(`scheduleMemos_${year}_${month}`, newMemos);
        }

        if (uniqueCells.length === 1 && nextCellDutyReplacements !== undefined) {
            await saveDutyReplacements(finalDutyReplacements, finalSchedules);
        }
    };

    // 잠금/잠금해제 토글
    const handleToggleLock = async (cells) => {
        const prevLocked = { ...lockedCells };
        const newLocked = { ...lockedCells };
        // 선택된 셀 중 하나라도 잠금 안 된 게 있으면 전부 잠금, 전부 잠겨있으면 해제
        const allLocked = cells.every(c => newLocked[`${c.soldierId}_${c.day}`]);
        for (const c of cells) {
            const key = `${c.soldierId}_${c.day}`;
            if (allLocked) delete newLocked[key];
            else newLocked[key] = true;
        }
        setLockedCells(newLocked);
        await DB.save(`lockedCells_${year}_${month}`, newLocked);

        // undo/redo 등록 (히스토리에는 기록하지 않음)
        pushUndoAction({
            type: 'lock',
            apply: async () => {
                setLockedCells(newLocked);
                await DB.save(`lockedCells_${year}_${month}`, newLocked);
            },
            revert: async () => {
                setLockedCells(prevLocked);
                await DB.save(`lockedCells_${year}_${month}`, prevLocked);
            },
            requiresScheduleReload: false,
            requiresDayTypeReload: false,
        });
        clearSelection();
    };

    // 초기화는 팝업 내부에서 처리함 (SchedulePopup에서 로컬 상태 리셋)

    const closeFloatingOverlays = () => {
        suppressPopupOpenOnSimpleClickRef.current = false;
        setShowPopup(false);
        setContextMenu(null);
    };

    const clearSelection = () => {
        selectionHoverTargetRef.current = null;
        if (selectionFrameRef.current !== null) {
            cancelAnimationFrame(selectionFrameRef.current);
            selectionFrameRef.current = null;
        }
        clearHoveredDayClass();
        setSelection({ cells: [], isSelecting: false, startCell: null });
        closeFloatingOverlays();
    };

    const handleContextMenuEdit = () => {
        if (!activeScheduleCellContext) return;

        const cell = { soldierId: activeScheduleCellContext.soldierId, day: activeScheduleCellContext.day };
        openPopupForCells([cell], { x: activeScheduleCellContext.x, y: activeScheduleCellContext.y });
    };

    const handleContextMenuRemoveLabel = async (label) => {
        if (!activeScheduleCellContext || !label) return;

        const cell = { soldierId: activeScheduleCellContext.soldierId, day: activeScheduleCellContext.day };
        setContextMenu(null);
        await saveSchedules({ [label]: 'remove' }, undefined, undefined, [cell]);
    };

    const handleContextMenuOpenHistory = useCallback(() => {
        if (!activeScheduleCellContext) return;
        setContextMenu(null);
        setShowDayHistory({ day: activeScheduleCellContext.day, soldierId: activeScheduleCellContext.soldierId });
    }, [activeScheduleCellContext]);

    const handleOpenSoldierDetail = useCallback(() => {
        if (contextMenu?.kind !== 'soldier') return;
        const soldier = soldiers.find((item) => String(item.id) === String(contextMenu.soldierId));
        if (!soldier) return;
        setContextMenu(null);
        ModalPopup.push(<EditSoldier soldier={soldier} onSave={loadData} />);
    }, [contextMenu, loadData, soldiers]);

    const handleOpenSoldierHistory = useCallback(() => {
        if (contextMenu?.kind !== 'soldier') return;
        const soldier = soldiers.find((item) => String(item.id) === String(contextMenu.soldierId));
        if (!soldier) return;
        setContextMenu(null);
        setShowSoldierHistory(soldier);
    }, [contextMenu, soldiers]);

    const handleOpenMonthlyDutyCalendar = useCallback(() => {
        if (contextMenu?.kind !== 'soldier') return;
        const soldier = soldiers.find((item) => String(item.id) === String(contextMenu.soldierId));
        if (!soldier) return;
        setContextMenu(null);
        setShowMonthlyDutyCalendar({
            soldierId: String(soldier.id),
        });
    }, [contextMenu, soldiers]);

    const handleToggleSoldierCategory = useCallback(async (soldierId, categoryId) => {
        const soldier = soldiers.find((item) => String(item.id) === String(soldierId));
        if (!soldier) return;

        const nextCategories = soldier.categories?.includes(categoryId)
            ? soldier.categories.filter((id) => id !== categoryId)
            : [...(soldier.categories || []), categoryId];

        const saved = await soldiersController.save({
            ...soldier,
            categories: nextCategories,
        }, soldier.id);

        if (!saved) return;

        const updatedSoldier = { ...soldier, categories: nextCategories };
        setSoldiers((prev) => prev.map((item) => String(item.id) === String(soldierId) ? updatedSoldier : item));
        setShowInCellCategoryMap((prev) => ({
            ...prev,
            [soldierId]: (allCategories || [])
                .filter((category) => category.show_in_cell)
                .filter((category) => nextCategories.includes(category.id)),
        }));
        setContextMenu(null);
    }, [allCategories, soldiers]);

    const contextMenuItems = useMemo(() => {
        if (!contextMenu) return [];

        if (contextMenu.kind === 'soldier') {
            return [
                {
                    key: 'open-soldier',
                    swatch: '열기',
                    swatchClass: 'schedule-cell-context-menu-swatch-edit',
                    label: '열기',
                    description: '용사정보 팝업',
                    onClick: handleOpenSoldierDetail,
                },
                {
                    key: 'open-history',
                    swatch: '📋',
                    label: '히스토리',
                    description: '변경내역 팝업',
                    onClick: handleOpenSoldierHistory,
                },
                {
                    key: 'open-monthly-duty-calendar',
                    swatch: '월간',
                    swatchClass: 'schedule-cell-context-menu-swatch-edit',
                    label: '월간 근무표 보기',
                    description: '근무달력 팝업',
                    onClick: handleOpenMonthlyDutyCalendar,
                },
            ];
        }

        if (contextMenu.kind === 'category') {
            const soldier = soldiers.find((item) => String(item.id) === String(contextMenu.soldierId));
            const selectedSet = new Set(soldier?.categories || []);
            return allCategories
                .filter((category) => category.id !== 'officer')
                .sort((left, right) => (left.order ?? 9999) - (right.order ?? 9999))
                .map((category) => ({
                    key: category.id,
                    swatch: selectedSet.has(category.id) ? '✓' : '',
                    swatchStyle: {
                        background: category.bg || '#f8fafc',
                        color: category.color || '#111827',
                        fontWeight: category.bold ? 700 : 500,
                        border: `1px solid ${category.color || '#cbd5e1'}`,
                    },
                    label: category.label,
                    description: selectedSet.has(category.id) ? '분류 해제' : '분류 추가',
                    onClick: () => handleToggleSoldierCategory(contextMenu.soldierId, category.id),
                }));
        }

        const removalItems = contextMenuLabels.flatMap((label) => {
            const type = scheduleTypeByLabel[label];
            const entry = activeScheduleCellContext
                ? combatLeaveData?.[activeScheduleCellContext.soldierId]?.[activeScheduleCellContext.day] || null
                : null;

            if (MANAGED_COMBAT_LEAVE_LABELS.has(label) && entry?.type === label && entry.status === 'approved') {
                return [];
            }

            return [{
                key: `remove_${label}`,
                swatch: label,
                swatchStyle: type ? {
                    background: type.bg,
                    color: type.color,
                    fontWeight: type.bold ? 'bold' : 'normal',
                } : undefined,
                label: '제거',
                description: `${label} 일정 삭제`,
                onClick: () => handleContextMenuRemoveLabel(label),
            }];
        });

        return [
            {
                key: 'edit',
                swatch: '편집',
                swatchClass: 'schedule-cell-context-menu-swatch-edit',
                label: '일정 편집',
                description: '선택 셀 편집기 열기',
                onClick: handleContextMenuEdit,
            },
            {
                key: 'history',
                swatch: '📋',
                label: '히스토리 보기',
                description: '해당 날짜 변경기록',
                onClick: handleContextMenuOpenHistory,
            },
            ...(removalItems.length > 0 ? [{ key: 'divider_remove', divider: true }, ...removalItems] : []),
        ];
    }, [activeScheduleCellContext, allCategories, combatLeaveData, contextMenu, contextMenuLabels, handleContextMenuEdit, handleContextMenuOpenHistory, handleContextMenuRemoveLabel, handleOpenMonthlyDutyCalendar, handleOpenSoldierDetail, handleOpenSoldierHistory, handleToggleSoldierCategory, scheduleTypeByLabel, soldiers]);

    const handleCompositionChange = async (soldierId, field, value) => {
        if (!canEditComposition || !soldierId || !field) return;

        const isFixedField = ['fixedWeekday', 'fixedWeekend', 'fixedGuard'].includes(field);
        const parsedNumber = Math.floor(Number(value));
        const nextValue = isFixedField
            ? (value === '-' || value === '' || !Number.isFinite(parsedNumber) || parsedNumber < 0 ? '-' : parsedNumber)
            : (value === '' ? 0 : Math.max(0, Number(value) || 0));
        const currentValues = dutyComposition?.soldiers?.[soldierId] || {
            weekday: 0,
            weekend: 0,
            guard: 0,
            fixedWeekday: '-',
            fixedWeekend: '-',
            fixedGuard: '-',
        };
        const nextValues = { ...currentValues, [field]: nextValue };

        setDutyComposition((prev) => ({
            ...(prev || { total: {}, soldiers: {} }),
            soldiers: {
                ...(prev?.soldiers || {}),
                [soldierId]: nextValues,
            },
        }));

        await dutyCompositionController.saveSoldier(year, month, soldierId, nextValues);
    };

    const handleTotalCompositionChange = async (field, value) => {
        if (!canEditComposition || !field) return;
        const nextValue = value === '' ? 0 : Math.max(0, Number(value) || 0);
        const nextTotal = {
            ...(dutyComposition?.total || { weekday: 0, weekend: 0, guard: 0 }),
            [field]: nextValue,
        };

        setDutyComposition((prev) => ({
            ...(prev || { total: {}, soldiers: {} }),
            total: nextTotal,
        }));

        await dutyCompositionController.saveTotal(year, month, nextTotal);
    };

    const handleReplaceDutyComposition = async (nextComposition) => {
        if (!canEditComposition) return;
        setDutyComposition(nextComposition);
        await dutyCompositionController.save(year, month, nextComposition);
    };

    const handleAutoDistributeDuty = async (targetSoldiers) => {
        if (!canEditDuty) {
            await showDutyEditBlockedAlert(1);
            return;
        }

        if (!Array.isArray(targetSoldiers) || targetSoldiers.length === 0) {
            await alert('근무를 분배할 용사가 없습니다.');
            return;
        }

        const { changedSnapshots, unresolvedLines, stats } = buildDutyDistribution({
            targetSoldiers,
            schedules,
            dayTypeAssignments,
            compositionBySoldier: dutyComposition?.soldiers || {},
            days,
        });

        if (changedSnapshots.length === 0) {
            if (unresolvedLines.length > 0) {
                await alert(`배치 가능한 칸이 부족해 일부 근무를 넣지 못했습니다.\n\n${unresolvedLines.join('\n')}`);
                return;
            }
            await alert('변경된 근무가 없습니다.');
            return;
        }

        await commitScheduleSnapshots(changedSnapshots);

        if (unresolvedLines.length > 0) {
            await alert(`근무 분배를 적용했습니다.\n추가로 배치하지 못한 항목이 있습니다.\n\n${unresolvedLines.join('\n')}`);
            return;
        }

        if (stats.added > 0 || stats.removed > 0) {
            await alert(`근무 분배를 적용했습니다.\n추가 ${stats.added}건 / 제거 ${stats.removed}건`);
        }
    };

    const getScheduleStyle = (labels, day) => {
        const getOrderedDayTypes = (targetDay, applyAllOnly = false) => {
            const dtLabels = dayTypeAssignments[targetDay] || [];
            return dtLabels
                .map((label) => dayTypeByLabel[label])
                .filter((type) => !!type)
                .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999))
                .filter((type) => (applyAllOnly ? !!type.applyAll : true));
        };

        const pickDayTypeStyle = (orderedTypes) => {
            const style = {};

            const bgType = orderedTypes.find((type) => type.bg !== false && type.bg !== null && type.bg !== undefined && type.bg !== '');
            const colorType = orderedTypes.find((type) => type.color !== false && type.color !== null && type.color !== undefined && type.color !== '');

            if (bgType) style.background = bgType.bg;
            if (colorType) style.color = colorType.color;

            return Object.keys(style).length > 0 ? style : null;
        };

        if (!labels || labels.length === 0) {
            const orderedApplyAllTypes = getOrderedDayTypes(day, true);
            return pickDayTypeStyle(orderedApplyAllTypes);
        }
        const type = labels.map((label) => scheduleTypeByLabel[label]).find(Boolean);
        if (type) return {
            background: type.bg, color: type.color, fontWeight: type.bold ? 'bold' : 'normal',
            '-webkit-text-stroke': type.bold ? `0.5px ${type.color}` : 'none',
        };
        return null;
    };

    // 날짜 헤더 스타일 (dayType에 따라)
    const getDayHeaderStyle = (day) => {
        const dtLabels = dayTypeAssignments[day] || [];
        if (dtLabels.length === 0) return null;

        const orderedTypes = dtLabels
            .map((label) => dayTypeByLabel[label])
            .filter((type) => !!type)
            .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

        if (orderedTypes.length === 0) return null;

        const bgType = orderedTypes.find((type) => type.bg !== false && type.bg !== null && type.bg !== undefined && type.bg !== '');
        const colorType = orderedTypes.find((type) => type.color !== false && type.color !== null && type.color !== undefined && type.color !== '');

        const style = {};
        if (bgType) style.background = bgType.bg;
        if (colorType) style.color = colorType.color;
        return Object.keys(style).length > 0 ? style : null;
    };

    const getUnitInfo = (unitId) => UNITS.find(u => u.id === unitId) || { name: '-', bg: '#fff' };


    const handleDayHeaderMouseDown = (e, day) => {
        if (e.button !== 0) return;
        e.preventDefault();
        setTooltipDay(null); // 드래그 시작하면 툴팁 숨기기
        setDayDragState({ isDragging: true, startDay: day, currentDay: day });
    };

    const handleDayHeaderMouseEnter = (day) => {
        if (!dayDragState.isDragging) return;
        setDayDragState(prev => ({ ...prev, currentDay: day }));
    };

    const handleDayHeaderMouseUp = (e) => {
        if (!dayDragState.isDragging) return;
        const start = Math.min(dayDragState.startDay, dayDragState.currentDay);
        const end = Math.max(dayDragState.startDay, dayDragState.currentDay);
        const selectedDays = [];
        for (let d = start; d <= end; d++) selectedDays.push(d);

        const anchorDay = dayDragState.currentDay || end;
        const anchorEl = tableRef.current?.querySelector(`thead th.col-day[data-day="${anchorDay}"]`);
        const anchorRect = anchorEl?.getBoundingClientRect?.();

        const menuWidth = 220;
        const menuHeight = 300;
        let x = e.clientX;
        let y = e.clientY + 8;

        if (anchorRect) {
            x = anchorRect.right + 8;
            y = anchorRect.bottom + 8;
        }

        if (x + menuWidth > window.innerWidth - 8) x = window.innerWidth - menuWidth - 8;
        if (y + menuHeight > window.innerHeight - 8) y = window.innerHeight - menuHeight - 8;
        if (x < 8) x = 8;
        if (y < 8) y = 8;

        setDayTypeSelectedDays(selectedDays);
        setDayTypeMenuPos({ x, y });
        setShowDayTypeMenu(true);
        dayTypeMenuJustOpened.current = true;
        requestAnimationFrame(() => { dayTypeMenuJustOpened.current = false; });
        setDayDragState({ isDragging: false, startDay: null, currentDay: null });
    };

    const isDayInDragRange = (day) => {
        if (!dayDragState.isDragging) return false;
        const start = Math.min(dayDragState.startDay, dayDragState.currentDay);
        const end = Math.max(dayDragState.startDay, dayDragState.currentDay);
        return day >= start && day <= end;
    };

    const formatDateKey = (day) => {
        const y = String(year);
        const m = String(month).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const getIsDayTypeChecked = (label) => {
        if (dayTypeSelectedDays.length === 0) return false;
        return dayTypeSelectedDays.every((day) => (dayTypeAssignments[day] || []).includes(label));
    };

    const updateDayTypesForSelected = async ({ mode, label = null }) => {
        if (dayTypeSelectedDays.length === 0) return;

        const prevAssignments = normalizeDayTypeAssignments(dayTypeAssignments);
        const nextAssignments = normalizeDayTypeAssignments(dayTypeAssignments);

        const shouldAdd = mode === 'toggle' ? !getIsDayTypeChecked(label) : false;
        for (const day of dayTypeSelectedDays) {
            const current = [...(nextAssignments[day] || [])];
            let next = current;

            if (mode === 'clear') {
                next = [];
            } else if (mode === 'toggle') {
                if (shouldAdd) {
                    if (!next.includes(label)) next.push(label);
                } else {
                    next = next.filter((item) => item !== label);
                }
            }

            if (next.length > 0) nextAssignments[day] = next;
            else delete nextAssignments[day];
        }

        const prevHolidayPatch = {};
        const nextHolidayPatch = {};
        for (const day of dayTypeSelectedDays) {
            const dateKey = formatDateKey(day);
            const beforeHasHoliday = (prevAssignments[day] || []).includes('휴일');
            const afterHasHoliday = (nextAssignments[day] || []).includes('휴일');
            if (beforeHasHoliday !== afterHasHoliday) {
                prevHolidayPatch[dateKey] = beforeHasHoliday;
                nextHolidayPatch[dateKey] = afterHasHoliday;
            }
        }

        const assignKey = `dayTypeAssign_${year}_${month}`;
        const applyPatch = async (assignments, holidayPatch) => {
            const normalized = normalizeDayTypeAssignments(assignments);
            await DB.save(assignKey, normalized);

            for (const [dateKey, isHoliday] of Object.entries(holidayPatch)) {
                await battalionSchedulesController.holiday.set(dateKey, isHoliday);
            }

            if (Object.keys(holidayPatch).length > 0) {
                setHolidays((prev) => {
                    const merged = { ...prev };
                    for (const [dateKey, isHoliday] of Object.entries(holidayPatch)) {
                        if (isHoliday) merged[dateKey] = true;
                        else delete merged[dateKey];
                    }
                    return merged;
                });
            }
        };

        const applyAssign = async () => {
            await applyPatch(nextAssignments, nextHolidayPatch);
        };
        const revertAssign = async () => {
            await applyPatch(prevAssignments, prevHolidayPatch);
        };

        await applyAssign();
        setDayTypeAssignments(nextAssignments);
        pushUndoAction({ type: 'dayType', apply: applyAssign, revert: revertAssign });

        //닫기
        setShowDayTypeMenu(false);
    };

    const toggleDayType = async (label) => {
        await updateDayTypesForSelected({ mode: 'toggle', label });
    };

    const clearDayTypes = async () => {
        await updateDayTypesForSelected({ mode: 'clear' });
    };

    if (loading) return <div className="f ajCenter wh100p"><div className="spinner" /></div>;

    const dragTargetCellKeySet = useMemo(() => {
        if (!isDragging || !dragSource || !dragTarget) return new Set();

        const startSoldierIdx = filteredSoldierIndexMap[dragSource.startCell.soldierId];
        const targetSoldierIdx = filteredSoldierIndexMap[dragTarget.soldierId];
        if (startSoldierIdx === undefined || targetSoldierIdx === undefined) return new Set();

        const soldierOffset = targetSoldierIdx - startSoldierIdx;
        const dayOffset = dragTarget.day - dragSource.startCell.day;
        const keySet = new Set();

        for (const cell of dragSource.cells) {
            const srcSoldierIdx = filteredSoldierIndexMap[cell.soldierId];
            if (srcSoldierIdx === undefined) continue;

            const destSoldierIdx = srcSoldierIdx + soldierOffset;
            const destDay = cell.day + dayOffset;
            if (destSoldierIdx < 0 || destSoldierIdx >= filteredSoldiers.length) continue;
            if (destDay < 1 || destDay > days.length) continue;

            keySet.add(`${filteredSoldiers[destSoldierIdx].id}_${destDay}`);
        }

        return keySet;
    }, [isDragging, dragSource, dragTarget, filteredSoldierIndexMap, filteredSoldiers, days.length]);

    const isDragTarget = useCallback((soldierId, day) => {
        return dragTargetCellKeySet.has(`${soldierId}_${day}`);
    }, [dragTargetCellKeySet]);

    const scheduleMainTableUpdateKey = useMemo(() => ({
        days,
        year,
        month,
        weeklySchedules,
        filteredSoldiers,
        soldiers,
        schedules,
        scheduleTypeByLabel,
        dayTypeAssignments,
        lockedCells,
        memos,
        dayDragState,
        tooltipDay,
        dragSource,
        isDragging,
        hoveredSoldierId,
        focusedSoldierId,
        dutyReplacements,
        showInCellCategoryMap,
        selectedCellKeySet,
        dragTargetCellKeySet,
        showDutyCount,
        dutyComposition,
        cellWidthMode,
        showPayGrade,
        visibleScheduleTypeLabels,
        isScheduleTypeFilterActive,
    }), [
        days,
        year,
        month,
        weeklySchedules,
        filteredSoldiers,
        soldiers,
        schedules,
        scheduleTypeByLabel,
        dayTypeAssignments,
        lockedCells,
        memos,
        dayDragState,
        tooltipDay,
        dragSource,
        isDragging,
        hoveredSoldierId,
        focusedSoldierId,
        dutyReplacements,
        showInCellCategoryMap,
        selectedCellKeySet,
        dragTargetCellKeySet,
        showDutyCount,
        dutyComposition,
        cellWidthMode,
        showPayGrade,
        visibleScheduleTypeLabels,
        isScheduleTypeFilterActive,
    ]);

    return (<>
        <div className="ss-body"
            onMouseUp={(e) => {
                if (dayDragState.isDragging) handleDayHeaderMouseUp(e); else handleMouseUp(e);
            }} onMouseLeave={() => {
                if (selection.isSelecting) handleMouseUp();
                if (isDragging) {
                    setIsDragging(false);
                    setDragSource(null);
                    setDragTarget(null);

                } if (dayDragState.isDragging) setDayDragState({ isDragging: false, startDay: null, currentDay: null });
                clearActiveHotkeyScheduleType();
                handleHoverSoldier(null);
                clearHoveredDayClass();
            }} onClick={(e) => {
                handleBodyClick(e);
                if (showDayTypeMenu && !dayTypeMenuJustOpened.current && !e.target.closest('.day-type-menu')) {
                    setShowDayTypeMenu(false);
                    setDayTypeSelectedDays([]);
                }
            }} onContextMenu={handleContextMenu}>
            <style>{scheduleTableCss}</style>

            <PreventUpdate updateKey={scheduleMainTableUpdateKey}>
                <ScheduleMainTable
                    tableRef={tableRef}
                    days={days}
                    year={year}
                    month={month}
                    weeklySchedules={weeklySchedules}
                    dailySchedules={dailySchedules}
                    filteredSoldiers={filteredSoldiers}
                    soldiers={soldiers}
                    schedules={schedules}
                    combatLeaveData={combatLeaveData}
                    scheduleTypeByLabel={scheduleTypeByLabel}
                    dayTypeAssignments={dayTypeAssignments}
                    lockedCells={lockedCells}
                    memos={memos}
                    dutyReplacements={dutyReplacements}
                    dayDragState={dayDragState}
                    tooltipDay={tooltipDay}
                    dragSource={dragSource}
                    isDragging={isDragging}
                    isToday={isToday}
                    isSunday={isSunday}
                    isSaturday={isSaturday}
                    isDayInDragRange={isDayInDragRange}
                    getDayHeaderStyle={getDayHeaderStyle}
                    getWeekdayColspan={getWeekdayColspan}
                    getUnitInfo={getUnitInfo}
                    getScheduleStyle={getScheduleStyle}
                    isCellSelected={isCellSelected}
                    isDragTarget={isDragTarget}
                    handleDayHeaderMouseDown={handleDayHeaderMouseDown}
                    handleDayHeaderMouseEnter={handleDayHeaderMouseEnter}
                    handleMouseDown={handleMouseDown}
                    handleMouseEnter={handleMouseEnter}
                    setTooltipDay={setTooltipDay}
                    setTooltipPos={setTooltipPos}
                    setShowSoldierHistory={setShowSoldierHistory}
                    hoveredSoldierId={hoveredSoldierId}
                    focusedSoldierId={focusedSoldierId}
                    getSoldierCellCategories={(soldier) => showInCellCategoryMap[soldier.id] || []}
                    onHoverSoldier={handleHoverSoldier}
                    onDayHover={handleHoverDay}
                    onClearDayHover={clearHoveredDayClass}
                    onFocusSoldier={handleFocusSoldier}
                    onOpenSoldierMenu={openSoldierContextMenu}
                    onOpenCategoryMenu={openCategoryContextMenu}
                    showDutyCount={showDutyCount}
                    onToggleDutyCount={() => setShowDutyCount(v => !v)}
                    dutyCompositionBySoldier={dutyComposition?.soldiers || {}}
                    canEditComposition={canEditComposition}
                    onChangeComposition={handleCompositionChange}
                    cellWidthMode={cellWidthMode}
                    showPayGrade={showPayGrade}
                    zzamColors={zzamColors}
                    categoryColorMap={categoryColorMap}
                    visibleScheduleTypeLabels={visibleScheduleTypeLabels}
                    isScheduleTypeFilterActive={isScheduleTypeFilterActive}
                />
            </PreventUpdate>


            <ScheduleSidePanel
                sidePanelWidth={sidePanelWidth}
                onStartPanelResize={startPanelResize}
                sideTab={sideTab}
                onChangeSideTab={(v) => {
                    setSideTab(v);
                    localStorage.setItem('scheduleSideTab', v);
                }}
                year={year}
                month={month}
                filteredSoldiers={filteredSoldiers}
                schedules={schedules}
                dutyReplacements={dutyReplacements}
                scheduleTypes={scheduleTypes}
                canEditComposition={canEditComposition}
                canEditDuty={canEditDuty}
                canEditServiceRate={canEditServiceRate}
                canEditScheduleTypes={canEditScheduleTypes}
                dutyComposition={dutyComposition}
                onChangeComposition={handleCompositionChange}
                onChangeTotalComposition={handleTotalCompositionChange}
                onReplaceDutyComposition={handleReplaceDutyComposition}
                onAutoDistributeDuty={handleAutoDistributeDuty}
                onOpenAddType={() => {
                    setEditingType(null);
                    setShowTypeEditor(true);
                }}
                onReorderType={handleReorderScheduleType}
                onEditType={(type) => { setEditingType(type); setShowTypeEditor(true); }}
                onHoverSoldier={handleHoverSoldierWithScroll}
                onFocusSoldier={handleFocusSoldier}
                focusedSoldierId={focusedSoldierId}
                visibleScheduleTypeLabels={visibleScheduleTypeLabels}
                onToggleVisibleScheduleType={toggleVisibleScheduleType}
                onClearScheduleTypeFilter={clearScheduleTypeFilter}
                activeHotkeyScheduleType={activeHotkeyScheduleType}
            />

            <div className="ss-right-panel" style={{ width: rightPanelWidth }}>
                <div className="ss-right-resize-handle" onMouseDown={startRightPanelResize} />
                <div className="side-panel-tabs">
                    <button
                        className={`side-tab${rightTab === 'news' ? ' active' : ''}`}
                        onClick={() => {
                            setRightTab('news');
                            localStorage.setItem('scheduleRightTab', 'news');
                        }}
                    >공지사항 ({boardCounts.news})</button>
                    <button
                        className={`side-tab${rightTab === 'sug' ? ' active' : ''}`}
                        onClick={() => {
                            setRightTab('sug');
                            localStorage.setItem('scheduleRightTab', 'sug');
                        }}
                    >건의사항 ({boardCounts.sug})</button>
                    <button
                        className={`side-tab${rightTab === 'cctv' ? ' active' : ''}`}
                        onClick={() => {
                            setRightTab('cctv');
                            localStorage.setItem('scheduleRightTab', 'cctv');
                        }}
                    >CCTV 합격 순서</button>
                </div>
                <div className="side-panel-body">
                    {rightTab === 'news' && <ScheduleMiniBoard id="news" onCountChange={(count) => handleBoardCountChange('news', count)} />}
                    {rightTab === 'sug' && <ScheduleMiniBoard id="sug" onCountChange={(count) => handleBoardCountChange('sug', count)} />}
                    {rightTab === 'cctv' && (
                        <CctvOrderPanel
                            canEdit={canEditServiceRate}
                            soldiers={filteredSoldiers}
                        />
                    )}
                </div>
            </div>

            {showPopup && selection.cells.length > 0 && createPortal(
                <SchedulePopup
                    x={popupPosition.x}
                    y={popupPosition.y}
                    year={year}
                    month={month}
                    selection={selection}
                    schedules={schedules}
                    scheduleTypes={scheduleTypes}
                    memos={memos}
                    lockedCells={lockedCells}
                    soldiers={soldiers}
                    dutyReplacements={dutyReplacements}
                    combatLeaveData={combatLeaveData}
                    canEdit={selection.cells.every((cell) => !getDutyEditBlockInfo(cell.day))}
                    onSave={saveSchedules}
                    onBlockedEdit={() => ensureCellsEditable(selection.cells)}
                    onToggleLock={handleToggleLock}
                    onClose={clearSelection}
                />,
                document.body
            )}

            {contextMenu && createPortal(
                <CellContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    title={contextMenuTitle}
                    items={contextMenuItems}
                />,
                document.body
            )}

            {showTypeEditor && (
                <TypeEditorModal
                    type={editingType}
                    onSave={async (data) => {
                        if (editingType) await scheduleTypesController.update(editingType.label, data);
                        else await scheduleTypesController.add(data);
                        reloadTypes();
                        setShowTypeEditor(false);
                        setEditingType(null);
                    }}
                    onDelete={async () => {
                        if (editingType) await scheduleTypesController.delete(editingType.label);
                        reloadTypes();
                        setShowTypeEditor(false);
                        setEditingType(null);
                    }}
                    onClose={() => { setShowTypeEditor(false); setEditingType(null); }}
                />
            )}

            {showDayTypeMenu && createPortal(
                <DayTypeMenu
                    x={dayTypeMenuPos.x}
                    y={dayTypeMenuPos.y}
                    dayTypes={dayTypes}
                    dayTypeSelectedDays={dayTypeSelectedDays}
                    getIsChecked={getIsDayTypeChecked}
                    onToggleLabel={toggleDayType}
                    onClearAll={clearDayTypes}
                    onOpenDayHistory={() => {
                        setShowDayHistory({ day: dayTypeSelectedDays[0] });
                        setShowDayTypeMenu(false);
                        setDayTypeSelectedDays([]);
                    }}
                />,
                document.body
            )}

            {showSoldierHistory && createPortal(
                <SoldierHistoryModal
                    soldier={showSoldierHistory}
                    year={year} month={month}
                    soldiers={soldiers}
                    scheduleTypes={scheduleTypes}
                    onClose={() => setShowSoldierHistory(null)}
                />,
                document.body
            )}

            <ScheduleDayTooltip
                tooltipDay={tooltipDay}
                tooltipPos={tooltipPos}
                filteredSoldiers={filteredSoldiers}
                soldiers={soldiers}
                schedules={schedules}
                scheduleTypes={scheduleTypes}
                year={year}
                month={month}
                weeklySchedules={weeklySchedules}
                dailySchedules={dailySchedules}
                holidays={holidays}
                dutyReplacements={dutyReplacements}
                tooltipExcludedSoldiers={tooltipExcludedSoldiers}
            />

            {showDayHistory && createPortal(
                <DayHistoryModal
                    day={showDayHistory.day}
                    year={year} month={month}
                    soldiers={soldiers}
                    scheduleTypes={scheduleTypes}
                    soldierId={showDayHistory.soldierId}
                    onClose={() => setShowDayHistory(null)}
                />,
                document.body
            )}

            {showMonthlyDutyCalendar && (
                <MonthlyDutyCalendar
                    year={year}
                    month={month}
                    focusSoldierId={showMonthlyDutyCalendar.soldierId || null}
                    onClose={() => setShowMonthlyDutyCalendar(null)}
                />
            )}

            {isScheduleTypeFilterActive && (
                <button
                    type="button"
                    className="schedule-filter-clear-fab"
                    onClick={clearScheduleTypeFilter}
                >
                    필터 해제
                </button>
            )}

            {activeHotkeyScheduleType && (
                <div
                    ref={hotkeyFloatingRef}
                    className="schedule-hotkey-floating-type"
                    style={{
                        left: -9999,
                        top: -9999,
                        background: activeHotkeyScheduleType.bg || '#fff',
                        color: activeHotkeyScheduleType.color || '#333',
                        fontWeight: activeHotkeyScheduleType.bold ? 700 : 600,
                        border: (activeHotkeyScheduleType.bg === '#fff' || activeHotkeyScheduleType.bg === '#ffffff') ? '1px solid #333' : '1px solid rgba(0,0,0,0.15)',
                    }}
                >
                    <span className="schedule-hotkey-floating-type-num">{activeHotkeyScheduleType.number}</span>
                    <span>{activeHotkeyScheduleType.label}</span>
                </div>
            )}
        </div>

    </>);
}

