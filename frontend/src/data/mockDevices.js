export const initialDevices = [
  {
    id: "CS-0042",
    name: "거실 전동휠체어",
    location: "거실",
    lastConnected: "지금",
    battery: 63,
    status: "charging",
    needsUpdate: false,
  },
  {
    id: "CS-0017",
    name: "보조 휠체어",
    location: "안방",
    lastConnected: "2시간 전",
    battery: 91,
    status: "standby",
    needsUpdate: false,
  },
  {
    id: "CS-0085",
    name: "외출용 휠체어",
    location: "현관",
    lastConnected: "5분 전",
    battery: 38,
    status: "connected",
    needsUpdate: true,
  },
  {
    id: "CS-0103",
    name: "병원 방문용",
    location: "창고",
    lastConnected: "3일 전",
    battery: 12,
    status: "offline",
    needsUpdate: false,
  },
  {
    id: "CS-0056",
    name: "재활치료 의자",
    location: "운동실",
    lastConnected: "어제",
    battery: 77,
    status: "standby",
    needsUpdate: false,
  },
];

export const discoverableDevices = [
  {
    id: "CS-0201",
    name: "새 전동휠체어 A",
    signal: "신호 강함",
  },
  {
    id: "CS-0202",
    name: "새 전동휠체어 B",
    signal: "신호 보통",
  },
];