const express = require('express');
const deviceAuth = require('./deviceAuth');
const { handleReading } = require('./ingest.service');

const router = express.Router();

// ESP32 → 센서 데이터 수신
// body: { charging, temperature, charger_temperature?, current_a, voltage_v, smoke, firmware_version? }
//   temperature 는 배터리(함) 온도, charger_temperature 는 충전기 표면 온도 (센서가 하나면 생략)
//   firmware_version 을 함께 보내면 기기 카드의 펌웨어 표시가 갱신되고,
//   응답의 firmware.update 로 업데이트 지시를 받을 수 있다.
router.post('/readings', deviceAuth, async (req, res) => {
  const result = await handleReading(req.device, req.body || {});
  res.json(result);
});

module.exports = router;
