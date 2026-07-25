const { pool } = require('../database/db');
const { assess, severity } = require('./risk.service');
const { notifyGuardians } = require('../notification/notification.service');

function toNum(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function getOpenSession(deviceId) {
  const { rows } = await pool.query(
    'SELECT id, auto_cutoff FROM charging_sessions WHERE device_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
    [deviceId]
  );
  return rows[0] || null;
}

async function openSession(deviceId) {
  const { rows } = await pool.query(
    'INSERT INTO charging_sessions (device_id) VALUES ($1) RETURNING id, auto_cutoff',
    [deviceId]
  );
  return rows[0];
}

async function closeSession(sessionId) {
  await pool.query(
    `UPDATE charging_sessions SET
       ended_at   = now(),
       end_reason = CASE WHEN auto_cutoff THEN 'auto_cutoff' ELSE 'completed' END,
       max_temp    = (SELECT MAX(temperature) FROM sensor_readings WHERE session_id = $1),
       max_current = (SELECT MAX(current_a)   FROM sensor_readings WHERE session_id = $1)
     WHERE id = $1`,
    [sessionId]
  );
}

// 온도 상승 속도 계산용: 30초 이상 지난 가장 최근 기록과 비교
async function getPreviousReading(sessionId) {
  const { rows } = await pool.query(
    `SELECT temperature, recorded_at FROM sensor_readings
     WHERE session_id = $1 AND recorded_at <= now() - interval '30 seconds'
     ORDER BY recorded_at DESC LIMIT 1`,
    [sessionId]
  );
  return rows[0] || null;
}

async function getCurrentLevel(deviceId) {
  const { rows } = await pool.query(
    'SELECT level FROM device_status WHERE device_id = $1',
    [deviceId]
  );
  return rows.length ? rows[0].level : 'normal';
}

async function upsertStatus(deviceId, status) {
  await pool.query(
    `INSERT INTO device_status
       (device_id, is_charging, level, temperature, current_a, voltage_v, gas_ppm, smoke, last_seen_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (device_id) DO UPDATE SET
       is_charging = EXCLUDED.is_charging,
       level = EXCLUDED.level,
       temperature = EXCLUDED.temperature,
       current_a = EXCLUDED.current_a,
       voltage_v = EXCLUDED.voltage_v,
       gas_ppm = EXCLUDED.gas_ppm,
       smoke = EXCLUDED.smoke,
       last_seen_at = now()`,
    [
      deviceId,
      status.is_charging,
      status.level,
      status.temperature,
      status.current_a,
      status.voltage_v,
      status.gas_ppm,
      status.smoke,
    ]
  );
}

async function handleReading(device, body) {
  const charging = Boolean(body.charging);
  const reading = {
    temperature: toNum(body.temperature),
    current_a: toNum(body.current_a),
    voltage_v: toNum(body.voltage_v),
    gas_ppm: toNum(body.gas_ppm),
    smoke: Boolean(body.smoke),
  };

  let session = await getOpenSession(device.id);

  if (!charging) {
    if (session) await closeSession(session.id);
    await upsertStatus(device.id, { ...reading, level: 'normal', is_charging: false });
    return { level: 'normal', charging: false };
  }

  if (!session) session = await openSession(device.id);

  const prev = await getPreviousReading(session.id);
  const { level, cause } = assess(reading, prev);

  await pool.query(
    `INSERT INTO sensor_readings
       (session_id, temperature, current_a, voltage_v, gas_ppm, smoke, level)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      session.id,
      reading.temperature,
      reading.current_a,
      reading.voltage_v,
      reading.gas_ppm,
      reading.smoke,
      level,
    ]
  );

  const prevLevel = await getCurrentLevel(device.id);
  await upsertStatus(device.id, { ...reading, level, is_charging: true });

  // 단계가 경고 이상으로 "올라간" 순간에만 이벤트·알림 발생 (같은 단계 반복 시 중복 알림 방지)
  if (severity(level) > severity(prevLevel) && severity(level) >= severity('warning')) {
    const { rows } = await pool.query(
      `INSERT INTO risk_events (session_id, level, cause, detail)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [session.id, level, cause, JSON.stringify(reading)]
    );
    // 알림 발송 실패가 센서 수신(안전 기능)까지 막지 않도록 격리
    try {
      await notifyGuardians(rows[0].id, device.id, level);
    } catch (err) {
      console.error('[notify] 알림 처리 실패:', err.message);
    }
  }

  if (level === 'danger') {
    await pool.query(
      `UPDATE charging_sessions
       SET auto_cutoff = true, cutoff_cause = COALESCE(cutoff_cause, $2)
       WHERE id = $1`,
      [session.id, cause]
    );
  }

  // 펌웨어는 이 응답의 level을 보고 차단·냉각팬 동작을 결정할 수 있다
  return { level, cause, session_id: session.id };
}

module.exports = { handleReading };
