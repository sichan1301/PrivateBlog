import { Outlet, useLocation, useNavigate } from "react-router-dom"
import styled from "styled-components"
import { useEffect, useMemo, useState } from "react";
import SideNavigationBar from "../components/snb/sideNavigationBar";
import GlobalHeader from "../components/gnb/globalHeader";
import { loadAccessToken, useAuthStore } from "../store/useAuth";

// localStorage 키 상수
const SIDEBAR_STATE_KEY = 'sidebar_open_state';

const HEADER_HEIGHT = 76;

const Root = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, onLogout } = useAuthStore();
  
  // localStorage에서 사이드바 상태를 복원하거나 기본값 false 사용
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      const savedState = localStorage.getItem(SIDEBAR_STATE_KEY);
      return savedState ? JSON.parse(savedState) : false;
    } catch{
      console.log('fail to load sidebar state');
      return false;
    }
  });
  
  
  // 사이드바 상태가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(isSidebarOpen));
    } catch {
      console.log('Failed to save sideBar')
    }
  }, [isSidebarOpen]);
  
  const sidebarWidth =  useMemo<number>(()=>isSidebarOpen ? 216 : 0,[isSidebarOpen]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
  
      const isTypingElement =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  
      if (isTypingElement) return; 
  
      if (e.key === ']' || e.code === 'BracketRight') {
        setIsSidebarOpen((prev: boolean) => !prev);
      }
    };
  
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 로그인 안돼있을 시 로그인 페이지로.
  useEffect(() => {
    const token = loadAccessToken();
    const isLoginRoute = location.pathname === '/login';
    if (!token && !isLoginRoute) {
      // 로그아웃 시 사이드바 상태 초기화
      setIsSidebarOpen(false);
      navigate('/login', { replace: true });
      return;
    }
    if (token && isLoginRoute) {
      navigate('/dashboard', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      const { sessionExpiresAt, onLogout } = useAuthStore.getState();
      if (sessionExpiresAt && Date.now() > sessionExpiresAt) {
        // 세션 만료 시 사이드바 상태 초기화
        setIsSidebarOpen(false);
        onLogout();
        navigate('/login', { replace: true });
      }
    }, 1000 * 10); 
  
    return () => clearInterval(interval);
  }, [navigate]);

  return(
    <Container>

      <HeaderWrapper 
        $isSidebarOpen={isSidebarOpen} 
        $sidebarWidth={sidebarWidth}
        $isLoginPage={location.pathname === '/login'}
      >
        <GlobalHeader 
          isSidebarOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((prev: boolean) => !prev)}/>
      </HeaderWrapper>

      {location.pathname !== '/login' && (
        <SideNavigationBar
          isOpen={isSidebarOpen}
        />
      )}

      <OutLetWrapper style={{ marginLeft: location.pathname === '/login' ? '0px' : `${sidebarWidth}px` }}>
        <Outlet />
      </OutLetWrapper>

    </Container>
  )
}

const Container = styled.div`
  width:100%;
  height:100%;
  display: flex;
  flex-direction: column;
`

const HeaderWrapper = styled.div<{$isSidebarOpen:boolean; $sidebarWidth:number; $isLoginPage:boolean;}>`
  width: ${props=> props.$isLoginPage ? '100%' : (props.$isSidebarOpen ? `calc(100% - ${props.$sidebarWidth})` : '100%')};
  height:${HEADER_HEIGHT}px;
  position: fixed;
  top:0px;
  right:0;
  left:${props=>props.$isLoginPage ? '0px' : (props.$isSidebarOpen ? props.$sidebarWidth : 0)}px;
  z-index:1000;
`

const OutLetWrapper = styled.div`
  padding-top: ${HEADER_HEIGHT}px;
  min-height: 100vh;
  height:100%;
  transition: margin-left 0.2s ease-in-out;
`

export default Root