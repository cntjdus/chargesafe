export const initialNotifications = [
  {
    id: 1,
    type: "danger",
    title: "배터리 온도 초과",
    message:
      "배터리 온도가 안전 한계(50°C)를 초과했습니다. 즉시 충전기를 분리하세요.",
    dateGroup: "오늘",
    time: "02:14",
    isRead: false,
  },
  {
    id: 2,
    type: "warning",
    title: "충전량 부족 예상",
    message:
      "다음 외출 시간(오전 8:00) 기준 현재 충전량이 부족할 수 있습니다.",
    dateGroup: "오늘",
    time: "23:20",
    isRead: false,
  },
  {
    id: 3,
    type: "warning",
    title: "충전 시간 초과",
    message:
      "예상 충전 완료 시간을 30분 초과했습니다. 충전 상태를 확인해 주세요.",
    dateGroup: "어제",
    time: "03:45",
    isRead: true,
  },
  {
    id: 4,
    type: "success",
    title: "충전 완료",
    message:
      "목표 충전량 85%에 도달하여 충전이 성공적으로 완료되었습니다.",
    dateGroup: "어제",
    time: "02:20",
    isRead: true,
  },
  {
    id: 5,
    type: "success",
    title: "충전 완료",
    message:
      "목표 충전량 82%에 도달하여 충전이 정상 종료되었습니다.",
    dateGroup: "7/23",
    time: "01:15",
    isRead: true,
  },
  {
    id: 6,
    type: "info",
    title: "기기 연결됨",
    message:
      "전동휠체어 배터리 충전기가 정상적으로 연결되었습니다.",
    dateGroup: "7/23",
    time: "22:03",
    isRead: true,
  },
  {
    id: 7,
    type: "info",
    title: "스마트 충전 모드 활성화",
    message:
      "AI 분석 기반 배터리 보호 모드(목표 85%)가 자동 적용되었습니다.",
    dateGroup: "7/22",
    time: "21:58",
    isRead: true,
  },
  {
    id: 8,
    type: "warning",
    title: "배터리 건강도 저하",
    message:
      "배터리 건강도가 80% 미만으로 감소했습니다. 점검을 권장합니다.",
    dateGroup: "7/21",
    time: "11:30",
    isRead: true,
  },
  {
    id: 9,
    type: "info",
    title: "소프트웨어 업데이트",
    message:
      "ChargeSafe v2.4.1 업데이트가 완료되었습니다. 새로운 안전 알고리즘이 적용됩니다.",
    dateGroup: "7/20",
    time: "09:00",
    isRead: true,
  },
];

export const notificationTypeGuides = [
  {
    id: "danger",
    type: "danger",
    title: "위험 (빨간색)",
    condition:
      "배터리 또는 기기에 즉각적인 위험이 감지된 경우 발송됩니다. 충전이 자동으로 차단되며 즉시 조치가 필요합니다.",
    examples: [
      "배터리 온도가 50°C를 초과한 경우",
      "충전기 과전류 감지 (4A 초과)",
      "배터리 전압 이상 (14.5V 초과)",
      "연기·화재 위험 감지",
    ],
    action:
      "즉시 충전기를 분리하고 보호자에게 알리세요.",
  },
  {
    id: "warning",
    type: "warning",
    title: "주의 (노란색)",
    condition:
      "즉각적인 위험은 아니지만 사용자의 주의가 필요한 상황에서 발송됩니다. 방치하면 위험으로 이어질 수 있습니다.",
    examples: [
      "충전량이 다음 외출 예상 사용량에 부족한 경우",
      "예상 충전 완료 시간을 30분 이상 초과한 경우",
      "배터리 건강도가 80% 미만으로 저하된 경우",
      "12시간 이상 장시간 충전이 지속되는 경우",
    ],
    action:
      "알림 내용을 확인하고 필요한 경우 충전 상태를 점검하세요.",
  },
  {
    id: "success",
    type: "success",
    title: "완료 (초록색)",
    condition:
      "충전이 정상적으로 완료되거나 설정한 목표가 달성된 경우 발송됩니다. 별도 조치가 필요하지 않습니다.",
    examples: [
      "목표 충전량(예: 85%)에 도달하여 자동 종료된 경우",
      "충전이 예정 시간 내에 정상 완료된 경우",
      "펌웨어 업데이트가 성공적으로 완료된 경우",
      "보호자 알림 전송이 성공한 경우",
    ],
    action:
      "충전기를 안전하게 분리하고 사용을 시작하세요.",
  },
  {
    id: "info",
    type: "info",
    title: "정보 (파란색)",
    condition:
      "위험이나 경고가 아닌 일반적인 시스템 상태 변화나 알림을 전달합니다. 참고용으로 확인하면 됩니다.",
    examples: [
      "기기가 새롭게 연결되거나 연결이 해제된 경우",
      "AI 스마트 충전 모드가 자동으로 활성화된 경우",
      "소프트웨어 또는 펌웨어 업데이트가 진행되는 경우",
      "보호자 계정이 새롭게 연동된 경우",
    ],
    action: "별도 조치 없이 내용을 확인하세요.",
  },
];