import { createGlobalStyle } from "styled-components";

const AppGlobalStyle = createGlobalStyle`
  :root {
    --app-background: #f3f6fb;
    --app-header-background: #ffffff;
    --app-sidebar-background: #121827;

    --app-surface: #ffffff;
    --app-surface-hover: #f8fafc;
    --app-surface-soft: #f7f9fc;

    --app-text-primary: #182236;
    --app-text-secondary: #647087;
    --app-text-muted: #98a4b7;

    --app-border: #e1e6ee;
    --app-divider: #edf0f4;

    --app-primary: #4d63f5;
    --app-primary-hover: #4055e8;

    --app-shadow: 0 2px 5px rgba(29, 42, 72, 0.05);
    --app-shadow-hover: 0 9px 22px rgba(37, 52, 86, 0.1);
  }

  html[data-app-theme="dark"] {
    color-scheme: dark;

    --app-background: #0b101a;
    --app-header-background: #4D63F5;
    --app-sidebar-background: #0a0e15;

    /*
      첨부 이미지처럼 다크 모드에서도
      설정 카드 내부는 밝게 유지
    */
    --app-surface: #ffffff;
    --app-surface-hover: #f5f7fa;
    --app-surface-soft: #f2f5f9;

    --app-text-primary: #182236;
    --app-text-secondary: #647087;
    --app-text-muted: #98a4b7;

    --app-border: #dce2eb;
    --app-divider: #edf0f4;

    --app-primary: #5877f6;
    --app-primary-hover: #4868eb;

    --app-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
    --app-shadow-hover: 0 12px 28px rgba(0, 0, 0, 0.3);
  }

  html[data-app-theme="custom"] {
    color-scheme: light;

    --app-background: #eeeeec;
    --app-header-background: #ffffff;
    --app-sidebar-background: #000000;

    --app-surface: #ffffff;
    --app-surface-hover: #f0f3f8;
    --app-surface-soft: #f5f6f8;

    --app-text-primary: #0f1728;
    --app-text-secondary: #3c485e;
    --app-text-muted: #69768c;

    --app-border: #cfd5df;
    --app-divider: #dde2e9;

    --app-primary: #405ceb;
    --app-primary-hover: #304bdd;

    --app-shadow: 0 2px 7px rgba(16, 24, 40, 0.1);
    --app-shadow-hover: 0 10px 24px rgba(16, 24, 40, 0.16);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    color: var(--app-text-primary);
    background: var(--app-background);
    transition:
      color 0.25s ease,
      background 0.25s ease;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button {
    border: 0;
  }

  ::selection {
    color: #ffffff;
    background: var(--app-primary);
  }
`;

export default AppGlobalStyle;