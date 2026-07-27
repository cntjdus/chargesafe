/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { THEME_MODES } from "../styles/appThemes";

const THEME_STORAGE_KEY = "chargesafe-theme-mode";

const AppThemeContext = createContext(undefined);

const isValidThemeMode = (themeMode) => {
  return Object.values(THEME_MODES).includes(themeMode);
};

const getInitialThemeMode = () => {
  if (typeof window === "undefined") {
    return THEME_MODES.LIGHT;
  }

  const savedThemeMode = window.localStorage.getItem(
    THEME_STORAGE_KEY
  );

  if (isValidThemeMode(savedThemeMode)) {
    return savedThemeMode;
  }

  return THEME_MODES.LIGHT;
};

const AppThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState(
    getInitialThemeMode
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      "data-app-theme",
      themeMode
    );

    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      themeMode
    );
  }, [themeMode]);

  const setThemeMode = (nextThemeMode) => {
    if (!isValidThemeMode(nextThemeMode)) {
      return;
    }

    setThemeModeState(nextThemeMode);
  };

  const contextValue = useMemo(
    () => ({
      themeMode,
      setThemeMode,
    }),
    [themeMode]
  );

  return (
    <AppThemeContext.Provider value={contextValue}>
      {children}
    </AppThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);

  if (context === undefined) {
    throw new Error(
      "useAppTheme은 AppThemeProvider 내부에서 사용해야 합니다."
    );
  }

  return context;
};

export default AppThemeProvider;