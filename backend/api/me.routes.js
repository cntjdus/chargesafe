const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../database/db');
const userAuth = require('./userAuth');
const present = require('./presenters');

const router = express.Router();
router.use(userAuth);

/** 화면에 보여줄 역할 이름 */
const ROLE_LABELS = { user: '사용자', guardian: '보호자', admin: '관리자' };

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
      role: ROLE_LABELS[me.role] || me.role,
      userId: me.username,
      email: me.email,
      phoneNumber: me.phone,
    },
    guardian: guardian
      ? { name: guardian.name, relation: guardian.relation, phoneNumber: guardian.phone }
      : null,
  });
});

// 프로필 수정 — 이름·전화번호·이메일.
//
// 전화번호는 아이디 찾기·비밀번호 재설정의 유일한 본인 확인 수단이므로
// (auth.routes.js 참고) 가입 후 반드시 채워 두는 것이 좋다.
// 빈 문자열을 보내면 지운다.
router.patch('/', async (req, res) => {
  const body = req.body || {};
  const has = (key) => Object.prototype.hasOwnProperty.call(body, key);

  const name = has('name') ? String(body.name ?? '').trim() : null;
  const phone = has('phoneNumber') ? String(body.phoneNumber ?? '').trim()
    : has('phone') ? String(body.phone ?? '').trim() : null;
  const email = has('email') ? String(body.email ?? '').trim() : null;

  if (name !== null && !name) {
    return res.status(400).json({ error: '이름은 비워 둘 수 없습니다.' });
  }
  // 이메일은 UNIQUE NOT NULL 이라 지울 수 없다
  if (email !== null && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: '이메일 형식이 올바르지 않습니다.' });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE users SET
         name  = COALESCE($2, name),
         phone = CASE WHEN $3::text IS NULL THEN phone ELSE NULLIF($3::text, '') END,
         email = COALESCE($4, email)
       WHERE id = $1
       RETURNING username, email, name, phone, role`,
      [req.user.id, name, phone, email]
    );
    const me = rows[0];
    res.json({
      user: {
        name: me.name,
        role: ROLE_LABELS[me.role] || me.role,
        userId: me.username,
        email: me.email,
        phoneNumber: me.phone,
      },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: '이미 사용 중인 이메일입니다.' });
    }
    throw err;
  }
});

// 비밀번호 변경 — 로그인한 상태에서 현재 비밀번호를 확인하고 바꾼다.
// (비밀번호를 잊어버린 경우는 POST /api/auth/reset-password 쪽을 쓴다)
router.patch('/password', async (req, res) => {
  const body = req.body || {};
  const current = body.currentPassword || '';
  const next = body.newPassword || body.password || '';

  if (!current || !next) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (String(next).length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!rows.length || !(await bcrypt.compare(current, rows[0].password_hash))) {
    return res.status(401).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
  }

  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1',
    [req.user.id, await bcrypt.hash(next, 10)]);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────
// 설정 화면 (SettingsPage) — 계정 단위 설정
//
// 설정 화면에는 기기 선택이 없고 값 하나를 계정 전체에 적용하는 형태다.
// 그래서 계정 단위 값은 user_settings 에 저장하고,
// 기기 단위 값(충전 모드·냉각팬·자동 차단·온도 기준·장시간 경고)은
//   - 조회할 때: 대표 기기(즐겨찾기 우선, 없으면 먼저 등록한 기기) 값을 보여주고
//   - 저장할 때: 내 기기 전체에 같은 값을 적용한다.
// 기기마다 다르게 두려면 PATCH /api/devices/:deviceId 를 쓴다.
// ─────────────────────────────────────────────────────────────

/** user_settings 행이 아직 없는 계정의 기본값 (007_user_settings.sql 의 DEFAULT 와 같게 유지) */
const DEFAULT_USER_SETTINGS = {
  pushNotifications: true,
  guardianNotifications: false,
  notificationSound: false,
  voiceGuide: true,
  largeText: false,
  themeMode: 'light',
};

/** 충전 모드 ↔ 목표 충전량 — 프론트 data/settingsData.js 의 chargeModes 와 같은 값 */
const CHARGE_MODE_PERCENT = {
  batteryProtection: 85,
  eco: 80,
  normal: 90,
  full: 100,
};

const THEME_MODES = ['light', 'dark', 'custom'];

/** 목표 충전량 → 충전 모드 id. 어느 모드와도 맞지 않으면 null (프론트가 기본 모드로 표시한다) */
function chargeModeOf(percent) {
  const p = Number(percent);
  return Object.keys(CHARGE_MODE_PERCENT).find((id) => CHARGE_MODE_PERCENT[id] === p) || null;
}

/** 계정 설정 + 대표 기기 설정을 SettingsPage 의 settings 객체 형태로 합친다 */
function settingsResponse(s, device) {
  const d = device || {};
  return {
    // 기기 설정
    coolingFan: d.cooling_fan_enabled !== false,
    chargeMode: chargeModeOf(d.target_percent ?? 85),
    targetPercent: d.target_percent ?? 85,
    // 알림 설정
    pushNotifications: s ? s.push_notifications : DEFAULT_USER_SETTINGS.pushNotifications,
    guardianNotifications: s ? s.guardian_notifications : DEFAULT_USER_SETTINGS.guardianNotifications,
    notificationSound: s ? s.notification_sound : DEFAULT_USER_SETTINGS.notificationSound,
    // 안전 설정
    automaticCutoff: d.auto_cutoff_enabled !== false,
    cutoffTemperature: d.cutoff_temperature ?? 50,
    longChargeWarning: (d.long_charge_warning_hours ?? 12) > 0,
    longChargeWarningHours: d.long_charge_warning_hours ?? 12,
    // 접근성
    voiceGuide: s ? s.voice_guide : DEFAULT_USER_SETTINGS.voiceGuide,
    largeText: s ? s.large_text : DEFAULT_USER_SETTINGS.largeText,
    themeMode: s ? s.theme_mode : DEFAULT_USER_SETTINGS.themeMode,
    // 기기가 하나도 없으면 기기 설정 값은 기본값이며 저장해도 반영되지 않는다
    hasDevice: Boolean(device),
  };
}

/** 대표 기기의 설정 값 — 즐겨찾기한 기기를 우선하고, 없으면 먼저 등록한 기기 */
async function primaryDeviceSettings(userId) {
  const { rows } = await pool.query(
    `SELECT d.target_percent, d.cutoff_temperature, d.auto_cutoff_enabled,
            d.cooling_fan_enabled, d.long_charge_warning_hours
     FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     WHERE ud.user_id = $1
     ORDER BY ud.is_favorite DESC, d.id
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

router.get('/settings', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM user_settings WHERE user_id = $1',
    [req.user.id]
  );
  res.json(settingsResponse(rows[0], await primaryDeviceSettings(req.user.id)));
});

// 설정 저장 — 보낸 항목만 바꾼다 (보내지 않은 항목은 그대로 둔다)
router.patch('/settings', async (req, res) => {
  const body = req.body || {};
  const bool = (v) => (v === undefined ? null : Boolean(v));

  // ── 계정 단위 ──
  const push = bool(body.pushNotifications);
  const guardianNoti = bool(body.guardianNotifications);
  const sound = bool(body.notificationSound);
  const voice = bool(body.voiceGuide);
  const large = bool(body.largeText);
  const theme = body.themeMode === undefined ? null : String(body.themeMode);

  if (theme !== null && !THEME_MODES.includes(theme)) {
    return res.status(400).json({ error: `themeMode must be one of ${THEME_MODES.join(', ')}` });
  }

  // ── 기기 단위 ──
  // chargeMode 는 모드 id 로도, targetPercent 숫자로도 받는다
  let target = body.targetPercent === undefined ? null : Number(body.targetPercent);
  if (body.chargeMode !== undefined) {
    if (!(body.chargeMode in CHARGE_MODE_PERCENT)) {
      return res.status(400).json({
        error: `chargeMode must be one of ${Object.keys(CHARGE_MODE_PERCENT).join(', ')}`,
      });
    }
    target = CHARGE_MODE_PERCENT[body.chargeMode];
  }
  const cutoffTemp = body.cutoffTemperature === undefined ? null : Number(body.cutoffTemperature);
  const autoCutoff = bool(body.automaticCutoff);
  const coolingFan = bool(body.coolingFan);
  // 프론트는 켜기/끄기 스위치이므로 boolean 을, 시간을 직접 지정할 때는 숫자를 받는다
  const longWarnHours = body.longChargeWarningHours === undefined
    ? null : Number(body.longChargeWarningHours);
  const longWarn = bool(body.longChargeWarning);

  if (target !== null && (!Number.isFinite(target) || target < 50 || target > 100)) {
    return res.status(400).json({ error: 'targetPercent must be between 50 and 100' });
  }
  if (cutoffTemp !== null && (!Number.isFinite(cutoffTemp) || cutoffTemp < 40 || cutoffTemp > 65)) {
    return res.status(400).json({ error: 'cutoffTemperature must be between 40 and 65' });
  }
  if (longWarnHours !== null && (!Number.isFinite(longWarnHours) || longWarnHours < 0 || longWarnHours > 48)) {
    return res.status(400).json({ error: 'longChargeWarningHours must be between 0 and 48' });
  }

  const hasUserChange = [push, guardianNoti, sound, voice, large, theme].some((v) => v !== null);
  const hasDeviceChange = [target, cutoffTemp, autoCutoff, coolingFan, longWarnHours, longWarn]
    .some((v) => v !== null);

  let saved = null;
  if (hasUserChange) {
    const { rows } = await pool.query(
      `INSERT INTO user_settings (user_id, push_notifications, guardian_notifications,
                                  notification_sound, voice_guide, large_text, theme_mode)
       VALUES ($1, COALESCE($2::boolean, true), COALESCE($3::boolean, false),
               COALESCE($4::boolean, false), COALESCE($5::boolean, true),
               COALESCE($6::boolean, false), COALESCE($7::text, 'light'))
       ON CONFLICT (user_id) DO UPDATE SET
         push_notifications     = COALESCE($2::boolean, user_settings.push_notifications),
         guardian_notifications = COALESCE($3::boolean, user_settings.guardian_notifications),
         notification_sound     = COALESCE($4::boolean, user_settings.notification_sound),
         voice_guide            = COALESCE($5::boolean, user_settings.voice_guide),
         large_text             = COALESCE($6::boolean, user_settings.large_text),
         theme_mode             = COALESCE($7::text, user_settings.theme_mode),
         updated_at             = now()
       RETURNING *`,
      [req.user.id, push, guardianNoti, sound, voice, large, theme]
    );
    saved = rows[0];
  }

  if (hasDeviceChange) {
    // 설정 화면에는 기기 선택이 없으므로 내 기기 전체에 같은 값을 적용한다
    await pool.query(
      `UPDATE devices d SET
         target_percent      = COALESCE($2::smallint, d.target_percent),
         cutoff_temperature  = COALESCE($3::smallint, d.cutoff_temperature),
         auto_cutoff_enabled = COALESCE($4::boolean, d.auto_cutoff_enabled),
         cooling_fan_enabled = COALESCE($5::boolean, d.cooling_fan_enabled),
         long_charge_warning_hours = CASE
           WHEN $6::smallint IS NOT NULL THEN $6::smallint
           WHEN $7::boolean IS TRUE THEN
             CASE WHEN d.long_charge_warning_hours > 0 THEN d.long_charge_warning_hours ELSE 12 END
           WHEN $7::boolean IS FALSE THEN 0
           ELSE d.long_charge_warning_hours END
       FROM user_devices ud
       WHERE ud.device_id = d.id AND ud.user_id = $1`,
      [req.user.id, target, cutoffTemp, autoCutoff, coolingFan, longWarnHours, longWarn]
    );
  }

  if (!saved) {
    const { rows } = await pool.query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [req.user.id]
    );
    saved = rows[0];
  }
  res.json(settingsResponse(saved, await primaryDeviceSettings(req.user.id)));
});

module.exports = router;
