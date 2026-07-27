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
    min-height: 100%;
  }

  body {
    font-family:
      Pretendard,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    color: #1f2937;
    background-color: #ffffff;
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