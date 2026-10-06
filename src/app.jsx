import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import './@css/index.css'
import Soldiers from './Soldiers';
import Home from './Home';
import SoldierSchedules from './SoldierSchedules';
import BattalionSchedules from './BattalionSchedules';
import useEffectEvent from './Soldiers/@hooks/useEffectEvent';
import Manage from './Manage';
import React from 'preact/compat';
import { authController, SESSION_TIMEOUT_MS } from './@controllers/authController';
import ModalPopup from './@components/ModalPopup';
import LoginPopup from './Home/LoginPopup';
import AccountSettingsPopup from './Home/AccountSettingsPopup';
import { ReactActivity } from './@components/ReactActivity';
import CompanySchedules from './CompanySchedules';
import { AutoSavedTopHeaderLabel } from './autoSave';
import BorderOps from './BorderOps';
import PhysicalTraining from './PhysicalTraining';
import HomeAccessGate from './HomeAccessGate';
import VacationPlans from './VacationPlans';
import CombatLeave from './CombatLeave';


const tabs = [
  { id: 'flex', flex: 1, },

  {
    id: 'home',
    name: '홈',
    component: <Home />
  },
  { id: 'px', px: 30, },
  {
    id: 'soldiers',
    name: '용사목록',
    component: <Soldiers />
  },
  {
    id: 'vacationPlans',
    name: '휴가계획',
    component: <VacationPlans />
  },
  { id: 'px', px: 30, },
  {
    id: 'soldierSchedules',
    name: '근무일정표',
    component: <SoldierSchedules />
  },
  {
    id: 'combatLeave',
    name: '전투휴무',
    component: <CombatLeave />
  },
  {
    id: 'borderOps',
    name: '경계작전명령서',
    component: <BorderOps />
  },
  { id: 'px', px: 30, },
  {
    id: 'battalionSchedules',
    name: '대대 일정',
    component: <BattalionSchedules />
  },
  {
    id: 'companySchedules',
    name: '중대 일정',
    component: <CompanySchedules />
  },

  { id: 'px', px: 30, },
  {
    id: 'fitness',
    name: '체력단련',
    component: <PhysicalTraining />
  },
  { id: 'px', px: 30, },
  {
    id: 'manage',
    name: '관리',
    component: null, // rendered dynamically with props
  },

  { id: 'flex', flex: 1, },
];

export function App() {
  // window.location.hash — supports "tabId" or "tabId,subTabId"
  const parseHash = (hash) => {
    const raw = hash.replace('#', '');
    const [mainId, subId] = raw.split(',');
    return { mainId: mainId || 'home', subId: subId || '' };
  };

  const { mainId: defaultMainId, subId: defaultSubId } = parseHash(window.location.hash);

  const [tabId, setTabId] = useState(defaultMainId);
  const [subTabId, setSubTabId] = useState(defaultSubId);

  let selectedTab = tabs.find(tab => tab.id === tabId) || tabs[0];

  let onHashChange = useEffectEvent(() => {
    const { mainId, subId } = parseHash(window.location.hash);
    if (tabs.find(tab => tab.id === mainId) && tabId !== mainId) {
      setTabId(mainId);
      setSubTabId(subId);
    } else if (mainId === tabId && subId !== subTabId) {
      setSubTabId(subId);
    }
  });

  useEffect(() => {
    const hash = subTabId ? `${tabId},${subTabId}` : tabId;
    window.location.hash = hash;
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
    };
  }, [tabId, subTabId]);
  // ctrl + tab, ctrl + shift + tab to navigate tabs

  const handleKeyDown = useEffectEvent((e) => {
    // input 제외
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return;
    }

    console.log(e.key, e.ctrlKey);
    // arrow right
    if (e.ctrlKey && e.key == 'ArrowRight') {
      // Ctrl + Tab
      e.preventDefault();
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      let nextIndex = (currentIndex + 1) % tabs.length;
      while (tabs[nextIndex].id === 'flex' || tabs[nextIndex].id === 'px') {
        nextIndex = (nextIndex + 1) % tabs.length;
      }
      setTabId(tabs[nextIndex].id);
      setSubTabId('');
    } else if (e.ctrlKey && e.key === 'ArrowLeft') {
      // Ctrl + Shift + Tab
      e.preventDefault();
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      let prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      while (tabs[prevIndex].id === 'flex' || tabs[prevIndex].id === 'px') {
        prevIndex = (prevIndex - 1 + tabs.length) % tabs.length;
      }
      setTabId(tabs[prevIndex].id);
      setSubTabId('');
    }
  });
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const [session, setSession] = useState(authController.getSession());
  const [homeAccess, setHomeAccess] = useState({ loading: true, allowed: true });

  useEffect(() => {
    let alive = true;

    const checkHomeAccess = async () => {
      if (alive) setHomeAccess({ loading: true, allowed: false });
      const result = await authController.checkFeaturePermission('home', 'viewHome');
      if (!alive) return;
      setHomeAccess({ loading: false, allowed: !!result?.allowed });
    };

    checkHomeAccess();
    return () => { alive = false; };
  }, [session]);

  if (homeAccess.loading) {
    return (
      <div className="f ajCenter wh100p" style={{ color: 'var(--c4)', fontSize: 14 }}>권한 확인 중...</div>
    );
  }

  if (!homeAccess.allowed) {
    return <HomeAccessGate session={session} setSession={setSession} />;
  }


  return (
    <>
      <div className='f wh100p'>
        <AutoSavedTopHeaderLabel />
        <div className='f row tab-container relative'>
          {tabs.map((tab, index) => {
            if (tab.id === 'flex') {
              return <div key={index} style={{ flex: tab.flex }} />;
            }
            if (tab.id === 'px') {
              return <div key={index} style={{ width: tab.px }} />;
            }
            let active = tab.id === tabId;
            return (
              <div
                key={index}
                className={`tab-item pointer ${active ? 'active' : ''}`}
                onClick={() => { setTabId(tab.id); setSubTabId(''); }}
              >
                {tab.name}
              </div>
            );
          })}
          {/* Auth area */}
          <LoginArea
            session={session} setSession={setSession}
          />
          <TimerArea
            session={session}
            setSession={setSession}
          />
        </div>
        <div className='f1 content-area'>
          {/* {tabs.map((tab, idx) => {
            return (<React.Fragment key={idx}>
              <ReactActivity
                key={session}
                visible={selectedTab.id === tab.id}
              >
                {tab.id == 'manage' ? <>
                  <Manage subTabId={subTabId} setSubTabId={setSubTabId} />
                </> : <>
                  {tab.component}
                </>}
              </ReactActivity>
            </React.Fragment>);
          })} */}
          {selectedTab.id == 'manage' ? <>
            <Manage subTabId={subTabId} setSubTabId={setSubTabId} />
          </> : <>
            {selectedTab.component}
          </>}


        </div>
      </div>

    </>
  )
}


const LoginArea = ({
  session,
  setSession,
}) => {

  const openLogin = () => {
    ModalPopup.push(
      <LoginPopup onSuccess={(user) => setSession(user || authController.getSession())} />
    );
  };

  const openAccountSettings = () => {
    ModalPopup.push(<AccountSettingsPopup militaryId={session.militaryId} />);
  };

  const handleLogout = () => { authController.logout(); setSession(null); };

  return (<>
    <div className="f row aCenter" style={{
      marginRight: 12, gap: 6, alignSelf: 'center',
      position: 'absolute',
      right: 0, top: 0, bottom: 0
    }}>
      {session ? (
        <>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c3)' }}>{session.name}</span>
          <span className="pointer" onClick={openAccountSettings}
            title="설정" style={{ fontSize: 18, lineHeight: 1, color: 'var(--c4)' }}>⚙</span>
          <button onClick={handleLogout}
            style={{ fontSize: 12, padding: '2px 6px' }}>로그아웃</button>
        </>
      ) : (
        <button onClick={openLogin}
          style={{ fontSize: 12, padding: '2px 8px' }}>로그인</button>
      )}
    </div>
  </>);
}


function TimerArea({ setSession, session }) {
  const INITIAL_TIME = SESSION_TIMEOUT_MS / 1000;
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const expiresAtRef = useRef(null);
  const logoutStartedRef = useRef(false);

  // 로그아웃 로직
  const handleLogout = useCallback(async () => {
    if (!session || logoutStartedRef.current) return;

    logoutStartedRef.current = true;
    setTimeLeft(0);
    setSession(null);
    await alert("세션이 만료되어 로그아웃되었습니다.");
    authController.logout();
  }, [setSession, session]);

  const syncRemainingTime = useCallback(() => {
    if (!session) return;

    const expiresAt = authController.getSessionExpiresAt();
    expiresAtRef.current = expiresAt;
    const nextTimeLeft = expiresAt
      ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      : 0;

    setTimeLeft(nextTimeLeft);
    if (nextTimeLeft <= 0) handleLogout();
  }, [handleLogout, session]);

  const extendSession = useCallback((force = false) => {
    if (!session || logoutStartedRef.current) return;

    const now = Date.now();
    if (!force && expiresAtRef.current && expiresAtRef.current - now > SESSION_TIMEOUT_MS - 1000) {
      return;
    }

    const nextExpiresAt = authController.extendSession();
    if (!nextExpiresAt) {
      handleLogout();
      return;
    }

    expiresAtRef.current = nextExpiresAt;
    setTimeLeft(Math.ceil((nextExpiresAt - now) / 1000));
  }, [handleLogout, session]);

  useEffect(() => {
    if (!session) return undefined;

    const activityHandler = () => extendSession(false);

    window.addEventListener('mousemove', activityHandler);
    window.addEventListener('keydown', activityHandler);
    return () => {
      window.removeEventListener('mousemove', activityHandler);
      window.removeEventListener('keydown', activityHandler);
    };
  }, [extendSession, session]);

  useEffect(() => {
    if (!session) {
      expiresAtRef.current = null;
      logoutStartedRef.current = false;
      setTimeLeft(INITIAL_TIME);
      return undefined;
    }

    logoutStartedRef.current = false;
    syncRemainingTime();

    const timer = setInterval(syncRemainingTime, 1000);
    const syncOnVisible = () => {
      if (!document.hidden) syncRemainingTime();
    };

    document.addEventListener('visibilitychange', syncOnVisible);
    window.addEventListener('focus', syncRemainingTime);
    window.addEventListener('pageshow', syncRemainingTime);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', syncOnVisible);
      window.removeEventListener('focus', syncRemainingTime);
      window.removeEventListener('pageshow', syncRemainingTime);
    };
  }, [session, syncRemainingTime]);

  // mm:ss 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  if (!session) return null;
  return (
    <div
      className="f row aCenter"
      style={{
        position: 'absolute',
        left: 12, top: 0, bottom: 0,
        gap: 8,
        fontSize: '13px',
        color: timeLeft < 60 ? '#ff4d4f' : '#333', // 1분 미만일 때 붉은색 강조
        fontWeight: '500'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        ⏱ {formatTime(timeLeft)}
      </span>

      <button
        onClick={() => extendSession(true)}
        style={{
          padding: '2px 8px',
          fontSize: '11px',
          cursor: 'pointer',
          borderRadius: '4px',
          border: '1px solid #d9d9d9',
          backgroundColor: '#fff'
        }}
      >
        연장
      </button>
      <Brightness />
    </div>
  );
}

function Brightness() {
  const [val, setVal] = useState(+localStorage.getItem('brightness') || 1.0);

  useEffect(() => {
    document.body.style.filter = `brightness(${val})`;
    return () => { document.body.style.filter = ''; };
  }, [val]);

  return (
    <input
      type="range"
      min="0.5"
      max="1.0"
      step="0.05"
      value={val}
      onInput={e => {
        setVal(e.target.value);
        localStorage.setItem('brightness', e.target.value);
      }}
      style={{ width: 60, height: 4, marginLeft: 8, cursor: 'pointer', outline: 'none' }}
      title="밝기 조절"
    />
  );
}
