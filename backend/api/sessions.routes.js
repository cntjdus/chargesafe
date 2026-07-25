const express = require('express');
const { pool } = require('../database/db');
const userAuth = require('./userAuth');

const router = express.Router();
router.use(userAuth);

// 세션의 센서 기록 (그래프용)
router.get('/:sessionId/readings', async (req, res) => {
  const sessionId = Number(req.params.sessionId);
  if (!Number.isInteger(sessionId)) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const { rowCount } = await pool.query(
    `SELECT 1 FROM charging_sessions s
     JOIN user_devices ud ON ud.device_id = s.device_id
     WHERE s.id = $1 AND ud.user_id = $2`,
    [sessionId, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Session not found' });

  const { rows } = await pool.query(
    `SELECT recorded_at, temperature, current_a, voltage_v, gas_ppm, smoke, level
     FROM sensor_readings
     WHERE session_id = $1
     ORDER BY recorded_at`,
    [sessionId]
  );
  res.json(rows);
});

module.exports = router;
