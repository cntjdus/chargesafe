const express = require('express');
const deviceAuth = require('./deviceAuth');
const { handleReading } = require('./ingest.service');

const router = express.Router();

// ESP32 → 센서 데이터 수신
// body: { charging, temperature, current_a, voltage_v, smoke, firmware_version? }
//   firmware_version 을 함께 보내면 기기 카드의 펌웨어 표시가 갱신되고,
//   응답의 firmware.update 로 업데이트 지시를 받을 수 있다.
router.post('/readings', deviceAuth, async (req, res) => {
  const result = await handleReading(req.device, req.body || {});
  res.json(result);
});

module.exports = router;
