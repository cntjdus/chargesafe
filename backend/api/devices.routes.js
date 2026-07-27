const express = require('express');
const crypto = require('crypto');
const { pool } = require('../database/db');
const userAuth = require('./userAuth');

const router = express.Router();
router.use(userAuth);

// 내 기기 목록 + 현재 상태
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT d.id, d.serial_number, d.name, d.location, d.is_active,
            s.is_charging, s.level, s.temperature, s.current_a, s.voltage_v,
            s.gas_ppm, s.smoke, s.last_seen_at
     FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     LEFT JOIN device_status s ON s.device_id = d.id
     WHERE ud.user_id = $1
     ORDER BY d.id`,
    [req.user.id]
  );
  res.json(rows);
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

async function requireDeviceAccess(req, res, next) {
  const deviceId = Number(req.params.deviceId);
  if (!Number.isInteger(deviceId)) {
    return res.status(404).json({ error: 'Device not found' });
  }
  const { rowCount } = await pool.query(
    'SELECT 1 FROM user_devices WHERE user_id = $1 AND device_id = $2',
    [req.user.id, deviceId]
  );
  if (!rowCount) return res.status(404).json({ error: 'Device not found' });
  req.deviceId = deviceId;
  next();
}

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
    `SELECT r.recorded_at, r.temperature, r.current_a, r.voltage_v, r.gas_ppm, r.smoke, r.level
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
