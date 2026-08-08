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

  --app-background: #0b1018;
  --app-header-background: #0c0c0d;
  --app-sidebar-background: #10141b;

  --app-surface: #1a1f27;
  --app-surface-hover: #202630;
  --app-surface-soft: #202633;

  --app-text-primary: #f5f7fb;
  --app-text-secondary: #c7cfdd;
  --app-text-muted: #8f9bb0;

  --app-border: #2b313b;
  --app-divider: #2a3039;

  --app-primary: #536cff;
  --app-primary-hover: #667cff;

  --app-success: #78d082;
  --app-warning: #e4b04e;
  --app-danger: #ef5a66;

  --app-shadow:
    0 1px 2px rgba(0, 0, 0, 0.25),
    0 6px 18px rgba(0, 0, 0, 0.14);

  --app-shadow-hover:
    0 10px 24px rgba(0, 0, 0, 0.3);
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