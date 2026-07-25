const crypto = require('crypto');
const { pool } = require('../config/db');

async function deviceAuth(req, res, next) {
  const apiKey = req.header('X-API-Key');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });

  const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const { rows } = await pool.query(
    'SELECT id, serial_number, is_active FROM devices WHERE api_key_hash = $1',
    [hash]
  );
  if (!rows.length || !rows[0].is_active) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  req.device = rows[0];
  next();
}

module.exports = deviceAuth;
