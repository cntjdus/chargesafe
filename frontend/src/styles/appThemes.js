export const THEME_MODES = {
  LIGHT: "light",
  DARK: "dark",
  CUSTOM: "custom",
};

export const themeModeOptions = [
  {
    id: THEME_MODES.LIGHT,
    name: "라이트 모드",
    badge: "기본",
    description:
      "밝은 배경에 어두운 텍스트를 사용합니다. 일반적인 환경에서 가장 편안한 기본 설정입니다.",
  },
  {
    id: THEME_MODES.DARK,
    name: "다크 모드",
    badge: "야간 권장",
    description:
      "어두운 배경으로 눈의 피로를 줄입니다. 야간 사용이나 저조도 환경에 적합합니다.",
  },
  {
    id: THEME_MODES.CUSTOM,
    name: "사용자 설정 모드",
    badge: "접근성",
    description:
      "고대비 색상을 적용합니다. 시력이 약하거나 색 구분이 필요한 경우에 적합합니다.",
  },
];

export const getThemeModeLabel = (themeMode) => {
  switch (themeMode) {
    case THEME_MODES.DARK:
      return "다크 모드";

    case THEME_MODES.CUSTOM:
      return "사용자 설정";

    case THEME_MODES.LIGHT:
    default:
      return "라이트 모드";
  }
};