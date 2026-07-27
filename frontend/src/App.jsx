import { useEffect, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import LoginPage from "./pages/LoginPage";
import SplashPage from "./pages/SplashPage";
import DashboardPage from "./pages/DashboardPage";

const SPLASH_DURATION = 6000;
const FADE_DURATION = 500;

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, SPLASH_DURATION - FADE_DURATION);

    const splashTimer = setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(splashTimer);
    };
  }, []);

  const handleLoginSuccess = () => {
    console.log("App에서 로그인 성공 처리");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (showSplash) {
    return (
      <SplashWrapper $isFading={isFading}>
        <SplashPage />
      </SplashWrapper>
    );
  }

  if (isLoggedIn) {
    return (
      <PageWrapper>
        <DashboardPage onLogout={handleLogout} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <LoginPage onLoginSuccess={handleLoginSuccess} />
    </PageWrapper>
  );
}

export default App;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

const SplashWrapper = styled.div`
  width: 100%;
  min-height: 100vh;

  ${({ $isFading }) =>
    $isFading &&
    css`
      animation: ${fadeOut} ${FADE_DURATION}ms ease forwards;
    `}
`;

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  animation: ${fadeIn} ${FADE_DURATION}ms ease forwards;
`;