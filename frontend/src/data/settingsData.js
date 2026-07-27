import {
  BatteryCharging,
  Bell,
  Clock3,
  Fan,
  Heart,
  Phone,
  Shield,
  Thermometer,
  UserRound,
  Volume2,
  Zap,
} from "lucide-react";

export const chargeModes = [
  {
    id: "batteryProtection",
    name: "배터리 보호",
    targetPercent: 85,
    badge: "추천",
    description:
      "배터리 수명을 최대로 보호합니다. 85%까지만 충전하고 자동으로 종료합니다.",
    icon: Shield,
    iconColor: "#5972f6",
    iconBackground: "#eef3ff",
    badgeColor: "#5269ef",
    badgeBackground: "#e8eeff",
  },
  {
    id: "eco",
    name: "절전 충전",
    targetPercent: 80,
    badge: "건강",
    description:
      "배터리 건강을 최우선으로 합니다. 80%에서 충전을 종료합니다.",
    icon: Heart,
    iconColor: "#51ae61",
    iconBackground: "#eef9f0",
    badgeColor: "#4d9856",
    badgeBackground: "#e6f6e9",
  },
  {
    id: "normal",
    name: "일반 충전",
    targetPercent: 90,
    badge: null,
    description:
      "일상 사용에 적합한 충전 모드입니다. 90%까지 충전합니다.",
    icon: BatteryCharging,
    iconColor: "#596ff4",
    iconBackground: "#eef2ff",
  },
  {
    id: "full",
    name: "완전 충전",
    targetPercent: 100,
    badge: "주의",
    description:
      "장거리 이동 전날 사용하세요. 100%까지 완전히 충전합니다. 자주 사용하면 배터리 수명이 단축될 수 있습니다.",
    icon: Zap,
    iconColor: "#dc8d00",
    iconBackground: "#fff6e6",
    badgeColor: "#cc8400",
    badgeBackground: "#fff2cf",
  },
];

export const temperatureOptions = [
  {
    value: 45,
    riskLabel: "위험도 낮음",
    titleColor: "#4c9d58",
    background: "#f1fcf4",
    border: "#ccefd4",
    description:
      "매우 엄격한 기준입니다. 민감한 배터리에 적합합니다.",
  },
  {
    value: 50,
    riskLabel: "위험도 표준",
    titleColor: "#4e68f2",
    background: "#eef4ff",
    border: "#c5d6ff",
    description:
      "권장 기준입니다. 대부분의 환경에서 안전합니다.",
  },
  {
    value: 55,
    riskLabel: "위험도 보통",
    titleColor: "#ce7c00",
    background: "#fff9e8",
    border: "#f1d46c",
    description:
      "완화된 기준입니다. 여름철 고온 환경에 적합합니다.",
  },
  {
    value: 60,
    riskLabel: "위험도 높음",
    titleColor: "#d9282d",
    background: "#fff3f2",
    border: "#f2b9b7",
    description:
      "느슨한 기준입니다. 배터리 손상 위험이 높아질 수 있습니다.",
  },
];

export const defaultSettings = {
  coolingFan: true,
  chargeMode: "batteryProtection",

  pushNotifications: true,
  guardianNotifications: false,
  notificationSound: false,

  automaticCutoff: true,
  cutoffTemperature: 50,
  longChargeWarning: false,

  voiceGuide: true,
  largeText: false,
  highContrast: false,
};

export const settingSectionData = {
  device: {
    title: "기기 설정",
    items: [
      {
        id: "coolingFan",
        title: "쿨링 팬 자동 작동",
        description: "충전 중 자동으로 팬을 작동합니다",
        type: "toggle",
        icon: Fan,
        iconColor: "#27a694",
        iconBackground: "#effaf8",
      },
      {
        id: "chargeMode",
        title: "충전 모드",
        description: "배터리 보호 모드 (85%)",
        type: "detail",
        icon: BatteryCharging,
        iconColor: "#5a6ef4",
        iconBackground: "#eef1ff",
      },
    ],
  },

  notification: {
    title: "알림 설정",
    items: [
      {
        id: "pushNotifications",
        title: "푸시 알림",
        description: "충전 상태 변화 시 알림을 받습니다",
        type: "toggle",
        icon: Bell,
        iconColor: "#ed4b53",
        iconBackground: "#fff1f1",
      },
      {
        id: "guardianNotifications",
        title: "보호자 자동 알림",
        description: "위험 감지 시 보호자에게 즉시 전송",
        type: "toggle",
        icon: Phone,
        iconColor: "#4bad62",
        iconBackground: "#effaf1",
      },
      {
        id: "notificationSound",
        title: "알림음",
        description: "알림 수신 시 소리를 재생합니다",
        type: "toggle",
        icon: Volume2,
        iconColor: "#d98b00",
        iconBackground: "#fff7e7",
      },
    ],
  },

  safety: {
    title: "안전 설정",
    items: [
      {
        id: "automaticCutoff",
        title: "자동 차단",
        description: "위험 감지 시 충전을 즉시 중단합니다",
        type: "toggle",
        icon: Shield,
        iconColor: "#e84161",
        iconBackground: "#fff0f3",
      },
      {
        id: "cutoffTemperature",
        title: "온도 차단 기준",
        description: "배터리 온도 초과 임계값",
        type: "temperature",
        icon: Thermometer,
        iconColor: "#db6900",
        iconBackground: "#fff6e9",
      },
      {
        id: "longChargeWarning",
        title: "장시간 충전 경고",
        description: "12시간 초과 충전 시 경고를 표시합니다",
        type: "toggle",
        icon: Clock3,
        iconColor: "#64728a",
        iconBackground: "#f3f5f8",
      },
    ],
  },

  accessibility: {
    title: "접근성",
    items: [
      {
        id: "voiceGuide",
        title: "음성 안내",
        description: "충전 상태를 음성으로 알려줍니다",
        type: "toggle",
        icon: Heart,
        iconColor: "#e93780",
        iconBackground: "#fff0f7",
      },
      {
        id: "largeText",
        title: "큰 글씨 모드",
        description: "텍스트 크기를 크게 표시합니다",
        type: "toggle",
        icon: UserRound,
        iconColor: "#8154ee",
        iconBackground: "#f6f0ff",
      },
      {
        id: "highContrast",
        title: "고대비 화면",
        description: "색상 대비를 높여 가독성을 향상합니다",
        type: "toggle",
        icon: Zap,
        iconColor: "#46546a",
        iconBackground: "#f3f5f8",
      },
    ],
  },
};