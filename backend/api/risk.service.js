function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// 기준값은 대시보드 화면(displayLimits)과 펌웨어 자체 차단 기준에 같은 값을 쓴다.
// 12V 계열 배터리를 전제로 한다. 저전압 시연(12V 팬)에서는 Render 에 CURRENT_MAX_A=0.5 를 준다.
const THRESHOLDS = {
  tempDanger: num(process.env.TEMP_DANGER, 50),
  tempWarning: num(process.env.TEMP_WARNING, 45),
  tempCaution: num(process.env.TEMP_CAUTION, 40),
  tempRisePerMin: num(process.env.TEMP_RISE_PER_MIN, 2),
  currentMax: num(process.env.CURRENT_MAX_A, 4),
  voltageMax: num(process.env.VOLTAGE_MAX_V, 14.5),
};

const LEVELS = ['normal', 'caution', 'warning', 'danger'];

function severity(level) {
  return LEVELS.indexOf(level);
}

// 판단 규칙:
//   위험: 연기 감지 · 고온 · 과전류 / 경고: 온도+전압 이상 패턴 / 주의: 온도 상승 속도 또는 고온 근접
// 과전류는 펌웨어가 그 자리에서 릴레이를 끊는 조건이므로 서버도 위험으로 본다.
// (주의로 두면 차단 뒤 전류가 0 이 되면서 세션이 "충전 완료"로 닫힌다)
// overrides 로 기기별 설정(설정 화면의 "온도 차단 기준")을 덮어쓸 수 있다.
function assess(reading, prevReading, overrides = {}) {
  const t = { ...THRESHOLDS, ...overrides };
  const { temperature, current_a, voltage_v, smoke } = reading;

  if (smoke) return { level: 'danger', cause: 'smoke' };
  if (temperature != null && temperature >= t.tempDanger) return { level: 'danger', cause: 'overheat' };
  if (current_a != null && current_a >= t.currentMax) return { level: 'danger', cause: 'overcurrent' };

  const voltageAnomaly = voltage_v != null && voltage_v >= t.voltageMax;
  if (temperature != null && temperature >= t.tempWarning && voltageAnomaly) {
    return { level: 'warning', cause: 'temp_voltage_anomaly' };
  }

  if (prevReading && temperature != null && prevReading.temperature != null) {
    const minutes =
      (Date.now() - new Date(prevReading.recorded_at).getTime()) / 60000;
    if (minutes > 0) {
      const risePerMin = (temperature - Number(prevReading.temperature)) / minutes;
      if (risePerMin >= t.tempRisePerMin) return { level: 'caution', cause: 'temp_rise' };
    }
  }
  if (temperature != null && temperature >= t.tempCaution) {
    return { level: 'caution', cause: 'temp_high' };
  }

  return { level: 'normal', cause: null };
}

// 대시보드·모니터링 카드의 기준 — assess 와 같은 값을 써야 화면의 "위험"과 실제 차단이 일치한다.
// danger 는 위험 판단 기준, warn 은 카드에 "주의"를 띄우는 선이다.
function displayLimits(cutoffTemperature) {
  const tempDanger = cutoffTemperature ? Number(cutoffTemperature) : THRESHOLDS.tempDanger;
  return {
    temperature: { danger: tempDanger, warn: Math.min(THRESHOLDS.tempCaution, tempDanger - 5) },
    current: { danger: THRESHOLDS.currentMax, warn: Number((THRESHOLDS.currentMax * 0.85).toFixed(3)) },
    voltage: { danger: THRESHOLDS.voltageMax, warn: 13.8 },
  };
}

module.exports = { assess, severity, displayLimits, THRESHOLDS };
