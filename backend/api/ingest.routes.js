const express = require('express');
const deviceAuth = require('./deviceAuth');
const { handleReading } = require('./ingest.service');

const router = express.Router();

// ESP32 → 센서 데이터 수신
// body: { charging, temperature, current_a, voltage_v, smoke }
router.post('/readings', deviceAuth, async (req, res) => {
  const result = await handleReading(req.device, req.body || {});
  res.json(result);
});

module.exports = router;
