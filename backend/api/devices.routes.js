const express = require('express');
const crypto = require('crypto');
const { pool } = require('../database/db');
const userAuth = require('./userAuth');
const present = require('./presenters');

const router = express.Router();
router.use(userAuth);

/** 기기 목록·상세 조회에 공통으로 쓰는 SELECT */
const DEVICE_COLUMNS = `
  d.id, d.serial_number, d.name, d.location, d.is_active,
  d.firmware_version, d.target_percent, ud.is_favorite,
  d.cutoff_temperature, d.auto_cutoff_enabled, d.cooling_fan_enabled,
  d.long_charge_warning_hours,
  s.is_charging, s.level, s.temperature, s.current_a, s.voltage_v,
  s.smoke, s.last_seen_at`;

// 내 기기 목록 — 프론트 DeviceRow 가 그대로 쓰는 형태로 반환한다
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${DEVICE_COLUMNS}
     FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     LEFT JOIN device_status s ON s.device_id = d.id
     WHERE ud.user_id = $1
     ORDER BY ud.is_favorite DESC, d.id`,
    [req.user.id]
  );
  res.json(rows.map(present.toDevice));
});

// 기기 등록: API 키는 이 응답에서 딱 한 번만 내려준다 (DB에는 해시만 저장)
router.post('/', async (req, res) => {
  const { serial_number, name, location } = req.body || {};
  if (!serial_number) {
    return res.status(400).json({ error: 'serial_number is required' });
  }

  const apiKey = 'csk_' + crypto.randomBytes(24).toString('hex');
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 이전에 등록 해제되어 보호자가 아무도 없는 기기라면, 이력을 유지한 채 다시 활성화한다
    const { rows: existing } = await client.query(
      `SELECT d.id FROM devices d
       WHERE d.serial_number = $1
         AND d.is_active = false
         AND NOT EXISTS (SELECT 1 FROM user_devices ud WHERE ud.device_id = d.id)`,
      [serial_number]
    );

    let device;
    if (existing.length) {
      const { rows } = await client.query(
        `UPDATE devices SET api_key_hash = $2, name = $3, location = $4, is_active = true
         WHERE id = $1
         RETURNING id, serial_number, name, location`,
        [existing[0].id, apiKeyHash, name || null, location || null]
      );
      device = rows[0];
    } else {
      const { rows } = await client.query(
        `INSERT INTO devices (serial_number, api_key_hash, name, location)
         VALUES ($1, $2, $3, $4)
         RETURNING id, serial_number, name, location`,
        [serial_number, apiKeyHash, name || null, location || null]
      );
      device = rows[0];
    }

    await client.query(
      'INSERT INTO user_devices (user_id, device_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, device.id]
    );
    await client.query('COMMIT');
    res.status(201).json({ ...device, api_key: apiKey });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ error: 'serial_number already registered' });
    }
    throw err;
  } finally {
    client.release();
  }
});

// :deviceId 는 내부 숫자 id 와 시리얼 번호(화면에 보이는 기기 코드) 둘 다 허용한다.
// 프론트는 기기 코드(CS-0042 형태)를 id 로 쓰기 때문이다.
async function requireDeviceAccess(req, res, next) {
  const raw = String(req.params.deviceId);
  const asNumber = /^\d+$/.test(raw) ? Number(raw) : null;

  const { rows } = await pool.query(
    `SELECT d.id, d.serial_number FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     WHERE ud.user_id = $1 AND (d.serial_number = $2 OR ($3::bigint IS NOT NULL AND d.id = $3::bigint))
     LIMIT 1`,
    [req.user.id, raw, asNumber]
  );
  if (!rows.length) return res.status(404).json({ error: 'Device not found' });
  req.deviceId = rows[0].id;
  req.deviceSerial = rows[0].serial_number;   // 응답에 기기 코드로 돌려줄 때 사용
  next();
}

// 기기 설정 수정 — DeviceSettingsModal 의 이름·즐겨찾기, 그리고 위치·목표 충전량
router.patch('/:deviceId', requireDeviceAccess, async (req, res) => {
  const body = req.body || {};
  const name = body.name === undefined ? undefined : String(body.name).trim() || null;
  const location = body.location === undefined ? undefined : String(body.location).trim() || null;
  const target = body.targetPercent === undefined ? undefined : Number(body.targetPercent);
  const favorite = body.isFavorite === undefined ? undefined : Boolean(body.isFavorite);
  // 설정 화면의 안전 설정
  const cutoffTemp = body.cutoffTemperature === undefined ? undefined : Number(body.cutoffTemperature);
  const autoCutoff = body.automaticCutoff === undefined ? undefined : Boolean(body.automaticCutoff);
  const coolingFan = body.coolingFan === undefined ? undefined : Boolean(body.coolingFan);
  const longWarn = body.longChargeWarningHours === undefined
    ? undefined : Number(body.longChargeWarningHours);

  if (target !== undefined && (!Number.isFinite(target) || target < 50 || target > 100)) {
    return res.status(400).json({ error: 'targetPercent must be between 50 and 100' });
  }
  if (cutoffTemp !== undefined && (!Number.isFinite(cutoffTemp) || cutoffTemp < 40 || cutoffTemp > 65)) {
    return res.status(400).json({ error: 'cutoffTemperature must be between 40 and 65' });
  }
  if (longWarn !== undefined && (!Number.isFinite(longWarn) || longWarn < 0 || longWarn > 48)) {
    return res.status(400).json({ error: 'longChargeWarningHours must be between 0 and 48' });
  }

  const hasDeviceChange = [name, location, target, cutoffTemp, autoCutoff, coolingFan, longWarn]
    .some((v) => v !== undefined);
  if (hasDeviceChange) {
    await pool.query(
      `UPDATE devices SET
         name = COALESCE($2, name),
         location = COALESCE($3, location),
         target_percent = COALESCE($4, target_percent),
         cutoff_temperature = COALESCE($5, cutoff_temperature),
         auto_cutoff_enabled = COALESCE($6, auto_cutoff_enabled),
         cooling_fan_enabled = COALESCE($7, cooling_fan_enabled),
         long_charge_warning_hours = COALESCE($8, long_charge_warning_hours)
       WHERE id = $1`,
      [req.deviceId, name ?? null, location ?? null, target ?? null,
        cutoffTemp ?? null, autoCutoff ?? null, coolingFan ?? null, longWarn ?? null]
    );
  }
  if (favorite !== undefined) {
    await pool.query(
      'UPDATE user_devices SET is_favorite = $3 WHERE user_id = $1 AND device_id = $2',
      [req.user.id, req.deviceId, favorite]
    );
  }

  const { rows } = await pool.query(
    `SELECT ${DEVICE_COLUMNS}
     FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     LEFT JOIN device_status s ON s.device_id = d.id
     WHERE d.id = $1 AND ud.user_id = $2`,
    [req.deviceId, req.user.id]
  );
  res.json(present.toDevice(rows[0]));
});

// 기기 등록 해제 — 내 목록에서 제거한다.
// 마지막 보호자였다면 기기를 비활성화해 더 이상 데이터를 받지 않게 하고, 충전 이력은 보존한다.
router.delete('/:deviceId', requireDeviceAccess, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM user_devices WHERE user_id = $1 AND device_id = $2',
      [req.user.id, req.deviceId]
    );
    const { rowCount } = await client.query(
      'SELECT 1 FROM user_devices WHERE device_id = $1 LIMIT 1',
      [req.deviceId]
    );
    if (!rowCount) {
      await client.query('UPDATE devices SET is_active = false WHERE id = $1', [req.deviceId]);
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

router.get('/:deviceId/status', requireDeviceAccess, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM device_status WHERE device_id = $1',
    [req.deviceId]
  );
  res.json(rows[0] || { device_id: req.deviceId, is_charging: false, level: 'normal' });
});

// 모니터링 화면의 구간 설정 — 프론트 TimeRangeTabs 의 id 와 같은 이름을 쓴다.
// bucketSec 만큼 평균을 내어 points 개수에 맞춰 내려준다 (그래프 점 개수 고정).
const MONITORING_RANGES = {
  realtime: { windowSec: 24 * 15, bucketSec: 15, points: 24, label: 'time' },
  hour: { windowSec: 30 * 120, bucketSec: 120, points: 30, label: 'time' },
  today: { windowSec: null, bucketSec: 3600, points: 24, label: 'time' }, // 오늘 0시부터
  week: { windowSec: 28 * 6 * 3600, bucketSec: 6 * 3600, points: 28, label: 'day' },
};

// 모니터링 그래프 — MonitoringPage(api/monitoringApi.js) 가 부르는 엔드포인트
router.get('/:deviceId/monitoring', requireDeviceAccess, async (req, res) => {
  const range = String(req.query.range || 'realtime');
  const cfg = MONITORING_RANGES[range];
  if (!cfg) {
    return res.status(400).json({ error: 'range must be realtime, hour, today or week' });
  }

  // 시간 버킷별 평균 — 구간이 길어도 점 개수가 일정하게 유지된다
  const since = cfg.windowSec === null
    ? "date_trunc('day', now())"
    : `now() - make_interval(secs => ${cfg.bucketSec * cfg.points})`;

  const { rows } = await pool.query(
    `SELECT
       to_timestamp(floor(extract(epoch FROM r.recorded_at) / $2) * $2) AS bucket,
       avg(r.temperature) AS temperature,
       avg(r.current_a)   AS current,
       avg(r.voltage_v)   AS voltage
     FROM sensor_readings r
     JOIN charging_sessions s ON s.id = r.session_id
     WHERE s.device_id = $1 AND r.recorded_at >= ${since}
     GROUP BY bucket
     ORDER BY bucket DESC
     LIMIT $3`,
    [req.deviceId, cfg.bucketSec, cfg.points]
  );

  // 최신순으로 잘라온 뒤 그래프용으로 시간순으로 뒤집는다
  const measurements = rows.reverse().map((r) => ({
    timestamp: new Date(r.bucket).toISOString(),
    label: cfg.label === 'day' ? present.monthDay(r.bucket) : present.hhmm(r.bucket),
    temperature: r.temperature === null ? null : Number(Number(r.temperature).toFixed(1)),
    current: r.current === null ? null : Number(Number(r.current).toFixed(2)),
    voltage: r.voltage === null ? null : Number(Number(r.voltage).toFixed(2)),
  }));

  res.json({
    deviceId: req.deviceSerial,
    range,
    updatedAt: new Date().toISOString(),
    measurements,
  });
});

// 대시보드 — DashboardPage 가 기대하는 형태 그대로 조립해서 내려준다.
// batteryHealth·aiConfidence 는 전용 계측이 아니라 충전 이력에서 추정한 참고 지표다.
router.get('/:deviceId/dashboard', requireDeviceAccess, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ${DEVICE_COLUMNS}
     FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     LEFT JOIN device_status s ON s.device_id = d.id
     WHERE d.id = $1 AND ud.user_id = $2`,
    [req.deviceId, req.user.id]
  );
  const device = rows[0];
  const targetPercent = device.target_percent ?? 85;
  const chargePercent = present.estimateSoc(device.voltage_v) ?? 0;

  // 진행 중인 세션의 최근 충전 속도로 완료 예정 시각을 추정한다
  const { rows: openRows } = await pool.query(
    `SELECT id, started_at FROM charging_sessions
     WHERE device_id = $1 AND ended_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [req.deviceId]
  );
  let completionTime = null, completionPeriod = null, remainingTime = null;
  if (device.is_charging && openRows.length && chargePercent < targetPercent) {
    const { rows: pace } = await pool.query(
      `SELECT voltage_v, recorded_at FROM sensor_readings
       WHERE session_id = $1 AND voltage_v IS NOT NULL
       ORDER BY recorded_at DESC LIMIT 60`,
      [openRows[0].id]
    );
    if (pace.length >= 2) {
      const newest = pace[0], oldest = pace[pace.length - 1];
      const socDelta = (present.estimateSoc(newest.voltage_v) ?? 0) - (present.estimateSoc(oldest.voltage_v) ?? 0);
      const minutes = (new Date(newest.recorded_at) - new Date(oldest.recorded_at)) / 60000;
      const rate = minutes > 0 ? socDelta / minutes : 0; // %/분
      if (rate > 0) {
        const remainMin = Math.round((targetPercent - chargePercent) / rate);
        const done = new Date(Date.now() + remainMin * 60000);
        const h = done.getHours();
        completionTime = `${String(h % 12 === 0 ? 12 : h % 12)}:${String(done.getMinutes()).padStart(2, '0')}`;
        completionPeriod = h < 12 ? '오전' : '오후';
        remainingTime = `${Math.floor(remainMin / 60)}:${String(remainMin % 60).padStart(2, '0')}`;
      }
    }
  }

  // 미확인 위험·경고 알림
  const { rows: alertRows } = await pool.query(
    `SELECT id, kind, title, occurred_at
     FROM notifications
     WHERE user_id = $1 AND device_id = $2 AND read_at IS NULL
       AND kind IN ('danger', 'warning')
     ORDER BY occurred_at DESC`,
    [req.user.id, req.deviceId]
  );
  const newest = alertRows[0];

  // 배터리 건강도·추천 신뢰도 — 최근 완료된 충전 이력에서 추정한다 (전용 계측 아님)
  const { rows: recent } = await pool.query(
    `SELECT s.max_temp,
       (SELECT r.voltage_v FROM sensor_readings r
         WHERE r.session_id = s.id AND r.voltage_v IS NOT NULL
         ORDER BY r.recorded_at DESC LIMIT 1) AS end_voltage
     FROM charging_sessions s
     WHERE s.device_id = $1 AND s.ended_at IS NOT NULL AND s.auto_cutoff = false
     ORDER BY s.started_at DESC LIMIT 10`,
    [req.deviceId]
  );
  const samples = recent.map((s) => ({
    endBattery: present.estimateSoc(s.end_voltage) ?? 0,
    maxTemperature: s.max_temp === null ? 0 : Number(s.max_temp),
  }));
  const batteryHealth = present.estimateBatteryHealth(samples, targetPercent);
  const aiConfidence = present.recommendationConfidence(samples.length);

  res.json({
    chargingStatus: device.is_charging ? '충전 중' : '대기 중',
    chargePercent,
    targetPercent,
    completionTime,
    completionPeriod,
    remainingTime,
    // 충전 이력 기반 추정치 — 전용 계측이 아니므로 참고용 (근거는 presenters.js 주석 참고)
    batteryHealth,
    aiConfidence,
    temperature: present.sensorBlock(device.temperature, '°C', { max: 50, warn: 40, danger: 50 }),
    current: present.sensorBlock(device.current_a, 'A', { max: 4, warn: 3.4, danger: 4, decimals: 2 }),
    voltage: present.sensorBlock(device.voltage_v, 'V', { max: 14.5, warn: 13.8, danger: 14.5, decimals: 2 }),
    aiRecommendation: {
      recommendedPercent: targetPercent,
      message: `배터리 보호를 위해 ${targetPercent}%에서 충전을 자동 종료합니다.`,
    },
    emergencyAlert: {
      exists: alertRows.length > 0,
      count: alertRows.length,
      title: newest ? newest.title : null,
      time: newest ? present.hhmm(newest.occurred_at) : null,
      level: newest ? (newest.kind === 'danger' ? '위험' : '주의') : null,
    },
  });
});

// 충전 이력 — ChargingHistoryTable + HistoryStatsSection 형태
router.get('/:deviceId/history', requireDeviceAccess, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);
  const { rows } = await pool.query(
    `SELECT s.*,
       (SELECT r.voltage_v FROM sensor_readings r
         WHERE r.session_id = s.id AND r.voltage_v IS NOT NULL
         ORDER BY r.recorded_at ASC LIMIT 1) AS start_voltage,
       (SELECT r.voltage_v FROM sensor_readings r
         WHERE r.session_id = s.id AND r.voltage_v IS NOT NULL
         ORDER BY r.recorded_at DESC LIMIT 1) AS end_voltage
     FROM charging_sessions s
     WHERE s.device_id = $1
     ORDER BY s.started_at DESC
     LIMIT $2`,
    [req.deviceId, limit]
  );

  const items = rows.map((s) =>
    present.toHistoryItem(s, present.estimateSoc(s.start_voltage), present.estimateSoc(s.end_voltage))
  );

  const finished = rows.filter((s) => s.ended_at);
  const totalMinutes = finished.reduce(
    (acc, s) => acc + (new Date(s.ended_at) - new Date(s.started_at)) / 60000, 0);
  const endBatteries = items.filter((i) => i.status === 'completed').map((i) => i.endBattery);

  res.json({
    items,
    summary: {
      totalChargingTime: `${Math.floor(totalMinutes / 60)}h ${Math.round(totalMinutes % 60)}m`,
      completedCount: items.filter((i) => i.status === 'completed').length,
      blockedCount: items.filter((i) => i.status === 'blocked').length,
      averageTargetBattery: endBatteries.length
        ? Math.round(endBatteries.reduce((a, b) => a + b, 0) / endBatteries.length)
        : 0,
    },
  });
});

router.get('/:deviceId/sessions', requireDeviceAccess, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT id, started_at, ended_at, end_reason, max_temp, max_current,
            auto_cutoff, cutoff_cause
     FROM charging_sessions
     WHERE device_id = $1
     ORDER BY started_at DESC
     LIMIT $2`,
    [req.deviceId, limit]
  );
  res.json(rows);
});

// 기간별 센서 기록 (모니터링 화면용) — ?minutes=60
router.get('/:deviceId/readings', requireDeviceAccess, async (req, res) => {
  const minutes = Math.min(Math.max(Number(req.query.minutes) || 60, 1), 60 * 24 * 7);
  const { rows } = await pool.query(
    `SELECT r.recorded_at, r.temperature, r.current_a, r.voltage_v, r.smoke, r.level
     FROM sensor_readings r
     JOIN charging_sessions s ON s.id = r.session_id
     WHERE s.device_id = $1 AND r.recorded_at >= now() - make_interval(mins => $2)
     ORDER BY r.recorded_at
     LIMIT 3000`,
    [req.deviceId, minutes]
  );
  res.json(rows);
});

router.get('/:deviceId/events', requireDeviceAccess, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `SELECT e.id, e.session_id, e.level, e.cause, e.detail, e.occurred_at
     FROM risk_events e
     JOIN charging_sessions s ON s.id = e.session_id
     WHERE s.device_id = $1
     ORDER BY e.occurred_at DESC
     LIMIT $2`,
    [req.deviceId, limit]
  );
  res.json(rows);
});

module.exports = router;
