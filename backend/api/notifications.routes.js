const express = require('express');
const { pool } = require('../database/db');
const userAuth = require('./userAuth');
const present = require('./presenters');

const router = express.Router();
router.use(userAuth);

/** 알림 한 건을 화면 형태로 만들기 위해 필요한 컬럼.
 *  위험 이벤트 알림과 일반 알림(충전 완료·기기 연결)을 함께 다룬다. */
const NOTIFICATION_QUERY = `
  SELECT n.id, n.message, n.read_at, n.kind, n.title, n.occurred_at,
         d.serial_number AS device_serial,
         COALESCE(d.name, d.serial_number) AS device_name
  FROM notifications n
  LEFT JOIN devices d ON d.id = n.device_id
  WHERE n.user_id = $1`;

// 알림 목록 — NotificationItem 이 그대로 쓰는 형태
// ?unread=true 로 미확인만, ?deviceId= 로 특정 기기만 조회할 수 있다
router.get('/', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const conditions = [];
  const params = [req.user.id];

  if (req.query.unread === 'true') conditions.push('n.read_at IS NULL');
  if (req.query.deviceId) {
    params.push(String(req.query.deviceId));
    conditions.push(`(d.serial_number = $${params.length} OR d.id::text = $${params.length})`);
  }
  params.push(limit);

  const { rows } = await pool.query(
    `${NOTIFICATION_QUERY}
     ${conditions.length ? 'AND ' + conditions.join(' AND ') : ''}
     ORDER BY n.occurred_at DESC
     LIMIT $${params.length}`,
    params
  );

  res.json({
    items: rows.map(present.toNotification),
    unreadCount: rows.filter((r) => !r.read_at).length,
  });
});

// 알림 하나 읽음 처리
router.patch('/:id/read', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Notification not found' });

  const { rowCount } = await pool.query(
    'UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL',
    [id, req.user.id]
  );
  if (!rowCount) {
    // 이미 읽었거나 내 알림이 아닌 경우를 구분한다
    const { rowCount: exists } = await pool.query(
      'SELECT 1 FROM notifications WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!exists) return res.status(404).json({ error: 'Notification not found' });
  }
  res.json({ ok: true });
});

// 전체 읽음 처리
router.post('/read-all', async (req, res) => {
  const { rowCount } = await pool.query(
    'UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL',
    [req.user.id]
  );
  res.json({ ok: true, updated: rowCount });
});

module.exports = router;
