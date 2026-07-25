function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const THRESHOLDS = {
  tempDanger: num(process.env.TEMP_DANGER, 60),
  tempWarning: num(process.env.TEMP_WARNING, 50),
  tempCaution: num(process.env.TEMP_CAUTION, 45),
  tempRisePerMin: num(process.env.TEMP_RISE_PER_MIN, 2),
  gasDanger: num(process.env.GAS_DANGER_PPM, 300),
  currentMax: num(process.env.CURRENT_MAX_A, 5),
  voltageMax: num(process.env.VOLTAGE_MAX_V, 29.4),
};

const LEVELS = ['normal', 'caution', 'warning', 'danger'];

function severity(level) {
  return LEVELS.indexOf(level);
}

// README의 판단 규칙:
//   위험: 연기·가스·고온 / 경고: 온도+전류·전압 이상 패턴 / 주의: 온도 상승 속도 또는 전류 변화
function assess(reading, prevReading) {
  const t = THRESHOLDS;
  const { temperature, current_a, voltage_v, gas_ppm, smoke } = reading;

  if (smoke) return { level: 'danger', cause: 'smoke' };
  if (gas_ppm != null && gas_ppm >= t.gasDanger) return { level: 'danger', cause: 'gas' };
  if (temperature != null && temperature >= t.tempDanger) return { level: 'danger', cause: 'overheat' };

  const currentAnomaly = current_a != null && current_a >= t.currentMax;
  const voltageAnomaly = voltage_v != null && voltage_v >= t.voltageMax;
  if (temperature != null && temperature >= t.tempWarning && (currentAnomaly || voltageAnomaly)) {
    return {
      level: 'warning',
      cause: currentAnomaly ? 'temp_current_anomaly' : 'temp_voltage_anomaly',
    };
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
  if (currentAnomaly) return { level: 'caution', cause: 'current_change' };

  return { level: 'normal', cause: null };
}

module.exports = { assess, severity, THRESHOLDS };
