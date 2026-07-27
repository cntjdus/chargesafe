const { pool } = require('../database/db');
const { getMessaging } = require('./firebase');

const MESSAGES = {
  warning:
    '전동휠체어 충전 중 이상 패턴이 감지되었습니다. 상태를 확인해 주세요.',
  danger:
    '전동휠체어 충전 중 이상 상태가 감지되었습니다. 안전을 위해 충전이 자동으로 차단되었습니다. 즉시 상태를 확인해 주세요.',
};

const TITLES = {
  warning: 'ChargeSafe 경고',
  danger: 'ChargeSafe 위험 알림',
};

/** 위험 원인 코드 → 알림 제목 (알림 센터에 그대로 표시된다) */
const CAUSE_TITLES = {
  smoke: '연기 감지',
  overheat: '배터리 온도 초과',
  temp_current_anomaly: '온도·전류 이상 감지',
  temp_voltage_anomaly: '온도·전압 이상 감지',
  temp_rise: '온도 급상승 감지',
  temp_high: '배터리 온도 상승',
  current_change: '충전 전류 이상',
};

/**
 * 위험이 아닌 일반 알림(충전 완료·기기 연결 등)을 보호자 모두에게 남긴다.
 * 푸시는 보내지 않고 알림 센터에만 표시한다.
 */
async function createNotice(deviceId, kind, title, message) {
  const { rows: guardians } = await pool.query(
    'SELECT user_id FROM user_devices WHERE device_id = $1',
    [deviceId]
  );
  for (const { user_id } of guardians) {
    await pool.query(
      `INSERT INTO notifications (user_id, device_id, kind, title, message, channel, status)
       VALUES ($1, $2, $3, $4, $5, 'app', 'sent')`,
      [user_id, deviceId, kind, title, message]
    );
  }
}

async function notifyGuardians(eventId, deviceId, level, cause) {
  const message = MESSAGES[level] || MESSAGES.warning;
  const title = CAUSE_TITLES[cause] || '충전 이상 감지';

  const { rows: guardians } = await pool.query(
    'SELECT user_id FROM user_devices WHERE device_id = $1 AND notify',
    [deviceId]
  );
  if (!guardians.length) return;

  // 1) 알림 이력을 먼저 DB에 기록 (FCM 실패와 무관하게 앱에서 확인 가능)
  const notifRows = [];
  for (const { user_id } of guardians) {
    const { rows } = await pool.query(
      `INSERT INTO notifications (event_id, user_id, device_id, kind, title, channel, message, status)
       VALUES ($1, $2, $3, $4, $5, 'push', $6, 'pending') RETURNING id, user_id`,
      [eventId, user_id, deviceId, level === 'danger' ? 'danger' : 'warning', title, message]
    );
    notifRows.push(rows[0]);
  }

  // 2) FCM 설정이 없으면 여기서 종료 (개발 환경)
  const messaging = getMessaging();
  if (!messaging) {
    console.log(`[notify] FCM 미설정 — DB 기록만 저장 (device=${deviceId}, level=${level}, 대상 ${guardians.length}명)`);
    return;
  }

  // 3) 보호자들의 푸시 토큰으로 발송
  const userIds = guardians.map((g) => g.user_id);
  const { rows: tokenRows } = await pool.query(
    'SELECT user_id, token FROM push_tokens WHERE user_id = ANY($1)',
    [userIds]
  );

  const successUsers = new Set();
  const invalidTokens = [];

  if (tokenRows.length) {
    // 데이터 전용 메시지: 표시는 서비스워커(백그라운드)·페이지(포그라운드)에서 직접 처리한다.
    // notification 페이로드의 브라우저별 자동표시 편차를 피하기 위함.
    const res = await messaging.sendEachForMulticast({
      tokens: tokenRows.map((t) => t.token),
      data: {
        title: TITLES[level] || TITLES.warning,
        body: message,
        level: String(level),
        device_id: String(deviceId),
        event_id: String(eventId),
      },
      webpush: {
        headers: { Urgency: 'high', TTL: '600' },
        fcmOptions: { link: '/' },
      },
    });

    res.responses.forEach((r, i) => {
      const { user_id, token } = tokenRows[i];
      if (r.success) {
        successUsers.add(user_id);
      } else {
        const code = r.error && r.error.code;
        if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-argument') {
          invalidTokens.push(token);
        }
        console.warn(`[notify] FCM 발송 실패 (user=${user_id}):`, code || r.error);
      }
    });
  }

  // 4) 발송 결과를 알림 이력에 반영
  for (const n of notifRows) {
    const hasToken = tokenRows.some((t) => t.user_id === n.user_id);
    const status = successUsers.has(n.user_id) ? 'sent' : hasToken ? 'failed' : 'pending';
    await pool.query(
      `UPDATE notifications SET status = $2::text, sent_at = CASE WHEN $2::text = 'sent' THEN now() END WHERE id = $1`,
      [n.id, status]
    );
  }

  // 5) 만료된 토큰 정리
  if (invalidTokens.length) {
    await pool.query('DELETE FROM push_tokens WHERE token = ANY($1)', [invalidTokens]);
  }

  console.log(`[notify] device=${deviceId} level=${level} → 푸시 성공 ${successUsers.size}명 / 대상 ${guardians.length}명`);
}

module.exports = { notifyGuardians, createNotice };
