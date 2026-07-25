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
    const { rows } = await client.query(
      `INSERT INTO devices (serial_number, api_key_hash, name, location)
       VALUES ($1, $2, $3, $4)
       RETURNING id, serial_number, name, location`,
      [serial_number, apiKeyHash, name || null, location || null]
    );
    await client.query(
      'INSERT INTO user_devices (user_id, device_id) VALUES ($1, $2)',
      [req.user.id, rows[0].id]
    );
    await client.query('COMMIT');
    res.status(201).json({ ...rows[0], api_key: apiKey });
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
