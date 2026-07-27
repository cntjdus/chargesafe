import { useEffect, useState } from "react";
import styled, {
  css,
  keyframes,
} from "styled-components";

import AppThemeProvider from "./contexts/AppThemeContext";
import AppGlobalStyle from "./styles/AppGlobalStyle";

import LoginPage from "./pages/LoginPage";
import MainPage from "./pages/MainPage";
import SplashPage from "./pages/SplashPage";

const SPLASH_DURATION = 6000;
const FADE_DURATION = 500;

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setIsFading(true);
    }, SPLASH_DURATION - FADE_DURATION);

    const splashTimer = window.setTimeout(() => {
      setShowSplash(false);
    }, SPLASH_DURATION);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(splashTimer);
    };
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    window.localStorage.removeItem("accessToken");
    setIsLoggedIn(false);
  };

  const renderContent = () => {
    if (showSplash) {
      return (
        <SplashWrapper $isFading={isFading}>
          <SplashPage />
        </SplashWrapper>
      );
    }

    if (!isLoggedIn) {
      return (
        <PageWrapper>
          <LoginPage
            onLoginSuccess={handleLoginSuccess}
          />
        </PageWrapper>
      );
    }

    return (
      <PageWrapper>
        <MainPage onLogout={handleLogout} />
      </PageWrapper>
    );
  };

  return (
    <AppThemeProvider>
      <AppGlobalStyle />
      {renderContent()}
    </AppThemeProvider>
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
      animation: ${fadeOut} ${FADE_DURATION}ms ease
        forwards;
    `}
`;

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  animation: ${fadeIn} ${FADE_DURATION}ms ease forwards;
`;