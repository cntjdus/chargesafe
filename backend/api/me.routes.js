const express = require('express');
const { pool } = require('../database/db');
const userAuth = require('./userAuth');
const present = require('./presenters');

const router = express.Router();
router.use(userAuth);

// 화면 상단·설정 카드에서 공통으로 쓰는 정보
// (MainPage 의 user / guardian / deviceId / chargePercent / chargingStatus 형태)
router.get('/', async (req, res) => {
  const { rows: users } = await pool.query(
    'SELECT id, username, email, name, phone, role FROM users WHERE id = $1',
    [req.user.id]
  );
  const me = users[0];
  if (!me) return res.status(404).json({ error: 'User not found' });

  // 대표 기기: 즐겨찾기한 기기를 우선하고, 없으면 먼저 등록한 기기
  const { rows: devices } = await pool.query(
    `SELECT d.serial_number, d.firmware_version, s.is_charging, s.voltage_v
     FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     LEFT JOIN device_status s ON s.device_id = d.id
     WHERE ud.user_id = $1
     ORDER BY ud.is_favorite DESC, d.id
     LIMIT 1`,
    [req.user.id]
  );
  const device = devices[0] || null;

  // 같은 기기를 함께 보는 다른 보호자 (설정 화면의 "보호자 연결됨 · 김보호 (딸)")
  const { rows: guardians } = await pool.query(
    `SELECT u.name, u.phone, ud.relation
     FROM user_devices ud
     JOIN users u ON u.id = ud.user_id
     WHERE ud.device_id = (
       SELECT d.id FROM devices d
       JOIN user_devices x ON x.device_id = d.id
       WHERE x.user_id = $1
       ORDER BY x.is_favorite DESC, d.id LIMIT 1
     ) AND ud.user_id <> $1
     ORDER BY u.id LIMIT 1`,
    [req.user.id]
  );
  const guardian = guardians[0] || null;

  res.json({
    deviceId: device ? device.serial_number : null,
    chargePercent: device ? (present.estimateSoc(device.voltage_v) ?? 0) : 0,
    chargingStatus: device && device.is_charging ? '충전 중' : '대기 중',
    firmware: device
      ? (device.firmware_version === present.LATEST_FIRMWARE ? '최신' : '업데이트 필요')
      : null,
    user: {
      name: me.name,
      role: me.role === 'guardian' ? '보호자' : me.role === 'admin' ? '관리자' : me.role,
      userId: me.username,
      email: me.email,
      phoneNumber: me.phone,
    },
    guardian: guardian
      ? { name: guardian.name, relation: guardian.relation, phoneNumber: guardian.phone }
      : null,
  });
});

module.exports = router;
