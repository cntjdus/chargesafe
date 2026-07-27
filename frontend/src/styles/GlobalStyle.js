import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    width: 100%;
    min-width: 320px;
    min-height: 100%;
  }

  body {
    margin: 0;
    color: #182033;
    background: #f3f6fb;
    font-family:
      Pretendard,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }

  #root {
    max-width: none;
    margin: 0;
    padding: 0;
    text-align: initial;
  }

  button,
  input {
    font: inherit;
  }

  button {
    border: none;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`;

export default GlobalStyle;