// 시연·프론트엔드 개발용 샘플 충전 세션을 생성한다.
// 사용법: node scripts/seed-demo.js <device_id>
const { pool } = require('./db');

async function seed() {
  const deviceId = Number(process.argv[2]) || 1;

  const start = new Date(Date.now() - 20 * 60 * 60 * 1000); // 어제 시작
  const stepMin = 2;
  const points = 46; // 90분

  const { rows } = await pool.query(
    `INSERT INTO charging_sessions (device_id, started_at) VALUES ($1, $2) RETURNING id`,
    [deviceId, start]
  );
  const sessionId = rows[0].id;

  for (let i = 0; i < points; i++) {
    const t = i * stepMin; // 경과 분
    const recordedAt = new Date(start.getTime() + t * 60000);
    // 온도: 28°C에서 시작해 43°C 부근으로 포화
    const temperature = +(28 + 15.5 * (1 - Math.exp(-t / 35)) + (Math.random() - 0.5)).toFixed(2);
    // 전류: 정전류 2.5A 유지 후 60분부터 감소 (CC-CV 곡선 흉내)
    const current = +(t < 60 ? 2.5 + (Math.random() - 0.5) * 0.1 : Math.max(0.4, 2.5 - (t - 60) * 0.07) + (Math.random() - 0.5) * 0.05).toFixed(3);
    // 전압: 23.8V → 25.2V 완만 상승
    const voltage = +(23.8 + 1.4 * (t / 90) + (Math.random() - 0.5) * 0.05).toFixed(2);
    const gas = +(8 + Math.random() * 6).toFixed(2);

    await pool.query(
      `INSERT INTO sensor_readings (session_id, recorded_at, temperature, current_a, voltage_v, gas_ppm, smoke, level)
       VALUES ($1, $2, $3, $4, $5, $6, false, 'normal')`,
      [sessionId, recordedAt, temperature, current, voltage, gas]
    );
  }

  const endedAt = new Date(start.getTime() + (points - 1) * stepMin * 60000);
  await pool.query(
    `UPDATE charging_sessions SET
       ended_at = $2, end_reason = 'completed',
       max_temp    = (SELECT MAX(temperature) FROM sensor_readings WHERE session_id = $1),
       max_current = (SELECT MAX(current_a)   FROM sensor_readings WHERE session_id = $1)
     WHERE id = $1`,
    [sessionId, endedAt]
  );

  console.log(`seeded: device=${deviceId} session=${sessionId} readings=${points}`);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
