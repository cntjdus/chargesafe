// DB 행을 보호자 대시보드(frontend)가 기대하는 형태로 변환한다.
// 화면 컴포넌트가 그대로 쓸 수 있도록 표시 문자열까지 서버에서 만들어 준다.

/** 배포된 최신 펌웨어 버전 — 기기 카드의 "업데이트 필요" 판단 기준 */
const LATEST_FIRMWARE = process.env.LATEST_FIRMWARE_VERSION || '1.0.0';

/** 12V 계열 배터리 전압 기반 충전량 추정 (11.8V=0%, 12.75V=100%).
 *  화면에 표시되는 기준(전압 14.5V 미만)과 같은 12V 계열을 전제로 한다. */
const SOC_MIN_V = Number(process.env.SOC_MIN_VOLT) || 11.8;
const SOC_MAX_V = Number(process.env.SOC_MAX_VOLT) || 12.75;

function estimateSoc(voltage) {
  if (voltage === null || voltage === undefined) return null;
  const v = Number(voltage);
  if (!Number.isFinite(v)) return null;
  return Math.round(Math.max(0, Math.min(100, ((v - SOC_MIN_V) / (SOC_MAX_V - SOC_MIN_V)) * 100)));
}

function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** "지금" / "5분 전" / "2시간 전" / "어제" / "3일 전" */
function relTime(iso) {
  if (!iso) return '연결 기록 없음';
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return '지금';
  if (sec < 3600) return `${Math.floor(sec / 60)}분 전`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}시간 전`;
  const days = Math.floor(sec / 86400);
  return days === 1 ? '어제' : `${days}일 전`;
}

/** 알림·이력 묶음 라벨: "오늘" / "어제" / "7/22" */
function dateGroup(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, today)) return '오늘';
  if (same(d, yesterday)) return '어제';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** "2024년 7월 24일" */
function fullDate(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** "22:02" */
function hhmm(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "7/22" — 주간 그래프의 X축 라벨 */
function monthDay(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** 분 → "4시간 18분" */
function durationText(minutes) {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m}분`;
  return `${Math.floor(m / 60)}시간 ${m % 60}분`;
}

/** 기기 연결 상태 — 프론트의 charging | standby | connected | offline */
function deviceStatus(row) {
  const seen = row.last_seen_at ? Date.now() - new Date(row.last_seen_at).getTime() : Infinity;
  if (seen > 10 * 60 * 1000) return 'offline';
  if (row.is_charging) return 'charging';
  if (seen < 60 * 1000) return 'connected';
  return 'standby';
}

/** 대시보드 센서 카드 한 칸 — { value, unit, status, progress } */
function sensorBlock(value, unit, { max, warn, danger, decimals = 1 }) {
  const v = num(value);
  if (v === null) return { value: null, unit, status: '수신 대기', progress: 0 };
  return {
    value: Number(v.toFixed(decimals)),
    unit,
    status: v >= danger ? '위험' : v >= warn ? '주의' : '정상',
    progress: Math.round(Math.max(0, Math.min(100, (v / max) * 100))),
  };
}

/** 기기 목록 한 행 — DeviceRow 가 쓰는 필드 그대로.
 *  센서 원본값(온도·전류·전압·가스·연기)은 이 목록에서 쓰지 않으므로 넣지 않는다.
 *  필요하면 /api/devices/:id/status 또는 /dashboard 로 조회한다. */
function toDevice(row) {
  return {
    id: row.serial_number,          // 화면에 표시되는 기기 코드
    deviceId: String(row.id),       // API 호출용 내부 id
    name: row.name || row.serial_number,
    location: row.location || '미지정',
    lastConnected: relTime(row.last_seen_at),
    battery: estimateSoc(row.voltage_v) ?? 0,
    status: deviceStatus(row),
    firmware: row.firmware_version === LATEST_FIRMWARE ? '최신' : '업데이트 필요',
    needsUpdate: row.firmware_version !== LATEST_FIRMWARE,
    isFavorite: Boolean(row.is_favorite),
    // 설정 화면에서 기기별로 저장하는 값들
    targetPercent: row.target_percent ?? 85,
    cutoffTemperature: row.cutoff_temperature ?? 50,
    automaticCutoff: row.auto_cutoff_enabled !== false,
    coolingFan: row.cooling_fan_enabled !== false,
    longChargeWarningHours: row.long_charge_warning_hours ?? 12,
    // 설정 화면의 스위치는 boolean 이므로 켜짐 여부도 함께 내려준다 (0 = 사용 안 함)
    longChargeWarning: (row.long_charge_warning_hours ?? 12) > 0,
    // 펌웨어 — 업데이트를 요청해 둔 상태면 기기가 다음 통신에서 받아 간다
    firmwareVersion: row.firmware_version || null,
    firmwareUpdating: Boolean(row.firmware_update_requested),
  };
}

/** 등록 대기 중인 기기 한 대 — AddDeviceModal 의 discoverableDevices 형태.
 *  신호 세기는 실제 전파 세기가 아니라 마지막 수신이 얼마나 최근인지로 표시한다
 *  (서버는 전파 세기를 알 수 없다). */
function toDiscoverable(row) {
  const seen = row.last_seen_at ? Date.now() - new Date(row.last_seen_at).getTime() : Infinity;
  return {
    id: row.serial_number,
    name: row.name || row.serial_number,
    location: row.location || '미지정',
    signal: seen < 60 * 1000 ? '신호 강함' : seen < 5 * 60 * 1000 ? '신호 보통' : '신호 약함',
    battery: estimateSoc(row.voltage_v) ?? 100,
    firmware: row.firmware_version === LATEST_FIRMWARE ? '최신' : '업데이트 필요',
    // 이 시각이 지나면 목록에서 사라진다 (기기를 다시 켜야 한다)
    pairingUntil: row.pairing_until,
  };
}

/** 충전 이력 한 행 — ChargingHistoryRow 가 쓰는 필드 그대로 */
function toHistoryItem(session, startBattery, endBattery) {
  const ongoing = !session.ended_at;
  const minutes = ((ongoing ? Date.now() : new Date(session.ended_at).getTime())
    - new Date(session.started_at).getTime()) / 60000;
  return {
    id: Number(session.id),
    date: fullDate(session.started_at),
    dateLabel: dateGroup(session.started_at),
    startTime: hhmm(session.started_at),
    endTime: ongoing ? '진행 중' : hhmm(session.ended_at),
    chargingDuration: durationText(minutes),
    startBattery: startBattery ?? 0,
    endBattery: endBattery ?? 0,
    maxTemperature: num(session.max_temp) === null ? 0 : Math.round(num(session.max_temp)),
    maxCurrent: num(session.max_current),
    status: session.auto_cutoff ? 'blocked' : ongoing ? 'charging' : 'completed',
    blockedReason: session.cutoff_cause ? CAUSE_LABELS[session.cutoff_cause] || session.cutoff_cause : null,
  };
}

const CAUSE_LABELS = {
  smoke: '연기 감지',
  overheat: '배터리 과열',
  temp_current_anomaly: '온도·전류 이상',
  temp_voltage_anomaly: '온도·전압 이상',
  temp_rise: '온도 급상승',
  temp_high: '고온',
  current_change: '전류 이상',
};

/** 알림 한 건 — NotificationItem 이 쓰는 필드 그대로 */
function toNotification(row) {
  return {
    id: Number(row.id),
    type: row.kind || 'info',           // danger | warning | success | info
    title: row.title || '충전 알림',
    message: row.message,
    dateGroup: dateGroup(row.occurred_at),
    time: hhmm(row.occurred_at),
    isRead: Boolean(row.read_at),
    deviceId: row.device_serial || null,
    deviceName: row.device_name || null,
  };
}

/**
 * 배터리 건강도 추정 (%) — 전용 계측 없이 충전 이력으로 계산한 근사치.
 *   - 목표 충전량 대비 실제 도달률 (충전이 잘 안 되면 노화 신호)
 *   - 고온(45℃ 이상) 노출 세션 비율만큼 감점
 * 정확한 SoH 측정(쿨롱 카운팅·임피던스)이 아니므로 참고용 지표다.
 */
function estimateBatteryHealth(sessions, targetPercent) {
  const done = sessions.filter((s) => s.endBattery > 0);
  if (done.length < 2) return null;

  const reachRatio = done.reduce(
    (acc, s) => acc + Math.min(1, s.endBattery / Math.max(targetPercent, 1)), 0) / done.length;
  const hotRatio = done.filter((s) => s.maxTemperature >= 45).length / done.length;
  const health = reachRatio * 100 - hotRatio * 15;
  return Math.max(0, Math.min(100, Math.round(health)));
}

/**
 * 충전 추천 신뢰도 (%) — 분석에 사용한 완료 세션 수가 많을수록 높아진다.
 * 5회 이상이면 최대치(95%)에 도달한다.
 */
function recommendationConfidence(sampleCount) {
  if (!sampleCount) return null;
  return Math.min(95, 50 + sampleCount * 9);
}

module.exports = {
  LATEST_FIRMWARE,
  CAUSE_LABELS,
  estimateSoc,
  relTime,
  dateGroup,
  fullDate,
  hhmm,
  monthDay,
  durationText,
  deviceStatus,
  sensorBlock,
  toDevice,
  toDiscoverable,
  toHistoryItem,
  toNotification,
  estimateBatteryHealth,
  recommendationConfidence,
};
