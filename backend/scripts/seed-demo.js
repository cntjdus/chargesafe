// 시연·개발용 가짜 기기 만들기
//
//   node scripts/seed-demo.js <아이디>            기기 1대 + 데이터 생성
//   node scripts/seed-demo.js <아이디> --clean    이 스크립트가 만든 기기 삭제
//
// 실제 ESP32 없이 대시보드·모니터링·충전 이력·알림 화면을 확인하기 위한 것이다.
// 시리얼 번호가 DEMO- 로 시작하는 기기만 다루므로 진짜 기기는 건드리지 않는다.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../database/db');

const USERNAME = process.argv[2];
const CLEAN = process.argv.includes('--clean');

// 펌웨어 "업데이트 필요" 버튼을 보려면 최신 버전과 다른 값을 넣는다
const LATEST = process.env.LATEST_FIRMWARE_VERSION || '1.0.0';
const OLD_FIRMWARE = LATEST === '0.9.0' ? '0.8.0' : '0.9.0';

/** 전압 → 대략적인 충전량 (프론트 표시용 근사치) */
const socToVoltage = (percent) => 11.0 + (14.2 - 11.0) * (percent / 100);

async function findUser() {
  const { rows } = await pool.query(
    'SELECT id, name FROM users WHERE username = $1',
    [USERNAME]
  );
  return rows[0] || null;
}

async function clean(userId) {
  const { rows } = await pool.query(
    `SELECT d.id FROM devices d
     JOIN user_devices ud ON ud.device_id = d.id
     WHERE ud.user_id = $1 AND d.serial_number LIKE 'DEMO-%'`,
    [userId]
  );
  if (!rows.length) {
    console.log('삭제할 시연용 기기가 없습니다.');
    return;
  }
  const ids = rows.map((r) => r.id);
  await pool.query('DELETE FROM notifications WHERE device_id = ANY($1)', [ids]);
  await pool.query(
    `DELETE FROM risk_events WHERE session_id IN
       (SELECT id FROM charging_sessions WHERE device_id = ANY($1))`, [ids]);
  await pool.query(
    `DELETE FROM sensor_readings WHERE session_id IN
       (SELECT id FROM charging_sessions WHERE device_id = ANY($1))`, [ids]);
  await pool.query('DELETE FROM charging_sessions WHERE device_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM device_status WHERE device_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM device_invites WHERE device_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM user_devices WHERE device_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM devices WHERE id = ANY($1)', [ids]);
  console.log(`시연용 기기 ${ids.length}대와 관련 데이터를 삭제했습니다.`);
}

async function seed(user) {
  const serial = 'DEMO-' + String(Date.now()).slice(-6);

  // ── 기기 ──
  const { rows: dev } = await pool.query(
    `INSERT INTO devices
       (serial_number, api_key_hash, name, location, firmware_version, target_percent)
     VALUES ($1, 'seed-no-login', '거실 충전기', '거실 콘센트 옆', $2, 85)
     RETURNING id`,
    [serial, OLD_FIRMWARE]
  );
  const deviceId = dev[0].id;

  await pool.query(
    `INSERT INTO user_devices (user_id, device_id, is_favorite, relation)
     VALUES ($1, $2, true, NULL)`,
    [user.id, deviceId]
  );

  // ── 지난 충전 이력 3건 (완료 2건 + 자동 차단 1건) ──
  // 완료 세션이 2건 이상이어야 배터리 건강도가 계산된다
  const past = [
    { daysAgo: 3, startSoc: 22, endSoc: 85, maxTemp: 34.2, blocked: false },
    { daysAgo: 2, startSoc: 31, endSoc: 85, maxTemp: 36.8, blocked: false },
    { daysAgo: 1, startSoc: 18, endSoc: 47, maxTemp: 52.4, blocked: true },
  ];

  for (const p of past) {
    const { rows: s } = await pool.query(
      `INSERT INTO charging_sessions
         (device_id, started_at, ended_at, end_reason, max_temp, max_current, auto_cutoff, cutoff_cause)
       VALUES ($1,
               now() - make_interval(days => $2, hours => 3),
               now() - make_interval(days => $2),
               $3, $4, 1.85, $5, $6)
       RETURNING id`,
      [deviceId, p.daysAgo, p.blocked ? 'cutoff' : 'completed',
        p.maxTemp, p.blocked, p.blocked ? 'overheat' : null]
    );
    const sessionId = s[0].id;

    // 시작·종료 전압만 넣으면 이력 화면의 시작·종료 배터리(%)가 채워진다
    await pool.query(
      `INSERT INTO sensor_readings (session_id, recorded_at, temperature, current_a, voltage_v)
       VALUES ($1, now() - make_interval(days => $2, hours => 3), 28.5, 1.9, $3),
              ($1, now() - make_interval(days => $2), $4, 0.4, $5)`,
      [sessionId, p.daysAgo, socToVoltage(p.startSoc), p.maxTemp, socToVoltage(p.endSoc)]
    );
  }

  // ── 지금 진행 중인 충전 ──
  // 이력 화면에서 status='charging' ("충전 중" 파란 배지) 을 확인할 수 있다
  const { rows: live } = await pool.query(
    `INSERT INTO charging_sessions (device_id, started_at, max_temp, max_current)
     VALUES ($1, now() - interval '95 minutes', 35.1, 2.1)
     RETURNING id`,
    [deviceId]
  );
  const liveSession = live[0].id;

  // 최근 95분간 1분 간격 측정값 — 모니터링 그래프(실시간·1시간·오늘)가 채워진다
  const readings = [];
  for (let minutesAgo = 95; minutesAgo >= 0; minutesAgo -= 1) {
    const progress = (95 - minutesAgo) / 95;
    const soc = 41 + progress * 32;                       // 41% → 73%
    const wave = Math.sin(minutesAgo / 7) * 0.8;
    readings.push({
      minutesAgo,
      temperature: (29.5 + progress * 5.4 + wave).toFixed(2),
      current: (2.1 - progress * 0.7 + wave * 0.06).toFixed(3),
      voltage: socToVoltage(soc).toFixed(2),
    });
  }

  const values = readings
    .map((_, i) => `($1, now() - make_interval(mins => $${i * 4 + 2}), $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`)
    .join(', ');
  const params = [liveSession];
  readings.forEach((r) => params.push(r.minutesAgo, r.temperature, r.current, r.voltage));

  await pool.query(
    `INSERT INTO sensor_readings (session_id, recorded_at, temperature, current_a, voltage_v)
     VALUES ${values}`,
    params
  );

  const last = readings[readings.length - 1];
  await pool.query(
    `INSERT INTO device_status
       (device_id, is_charging, level, temperature, current_a, voltage_v, last_seen_at)
     VALUES ($1, true, 'normal', $2, $3, $4, now())
     ON CONFLICT (device_id) DO UPDATE SET
       is_charging = true, temperature = $2, current_a = $3,
       voltage_v = $4, last_seen_at = now()`,
    [deviceId, last.temperature, last.current, last.voltage]
  );

  // ── 알림 4종 (알림 센터 필터 확인용) ──
  const notes = [
    ['danger', '배터리 온도 초과', '배터리 온도가 52.4°C에 도달해 충전을 자동으로 차단했습니다.', 26, false],
    ['warning', '온도 상승 감지', '충전 중 배터리 온도가 평소보다 빠르게 오르고 있습니다.', 20, false],
    ['success', '충전 완료', '목표 충전량 85%에 도달해 충전을 종료했습니다.', 48, true],
    ['info', '펌웨어 안내', '새 펌웨어가 준비되었습니다. 기기 관리에서 업데이트할 수 있습니다.', 72, true],
  ];

  for (const [kind, title, message, hoursAgo, read] of notes) {
    await pool.query(
      `INSERT INTO notifications
         (user_id, device_id, kind, title, message, channel, status, occurred_at, read_at)
       VALUES ($1, $2, $3, $4, $5, 'push', 'sent',
               now() - make_interval(hours => $6),
               CASE WHEN $7 THEN now() - make_interval(hours => $6) ELSE NULL END)`,
      [user.id, deviceId, kind, title, message, hoursAgo, read]
    );
  }

  console.log(`
시연용 기기를 만들었습니다.

  사용자      ${user.name} (${USERNAME})
  기기 코드   ${serial}
  기기 이름   거실 충전기 · 거실 콘센트 옆
  펌웨어      ${OLD_FIRMWARE}  ("업데이트 필요" 로 표시됩니다)

  충전 이력   3건 (정상 완료 2 · 자동 차단 1) + 진행 중 1건
  측정값      최근 95분간 96건
  알림        4건 (위험·주의·완료·정보 / 2건 미확인)

브라우저를 새로고침하면 모든 화면에 데이터가 표시됩니다.
지우려면:  node scripts/seed-demo.js ${USERNAME} --clean
`);
}

(async () => {
  try {
    if (!USERNAME) {
      console.error('사용법: node scripts/seed-demo.js <아이디> [--clean]');
      process.exitCode = 1;
      return;
    }

    const user = await findUser();
    if (!user) {
      console.error(`'${USERNAME}' 계정을 찾을 수 없습니다. 먼저 회원가입을 해주세요.`);
      process.exitCode = 1;
      return;
    }

    if (CLEAN) {
      await clean(user.id);
    } else {
      await seed(user);
    }
  } catch (err) {
    console.error('실패:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
