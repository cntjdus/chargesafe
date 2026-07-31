const crypto = require('crypto');
const { pool } = require('../database/db');

async function deviceAuth(req, res, next) {
  const apiKey = req.header('X-API-Key');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  // 위험 판단에 기기별 설정(온도 차단 기준·자동 차단 여부 등)이 필요하므로 함께 읽는다
  const { rows } = await pool.query(
    `SELECT id, serial_number, is_active,
            cutoff_temperature, auto_cutoff_enabled, cooling_fan_enabled,
            long_charge_warning_hours
     FROM devices WHERE api_key_hash = $1`,
    [hash]
  );
  if (!rows.length || !rows[0].is_active) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.device = rows[0];
  next();
}

module.exports = deviceAuth;
