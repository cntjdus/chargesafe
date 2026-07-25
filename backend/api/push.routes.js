const express = require('express');
const { pool } = require('../database/db');
const userAuth = require('./userAuth');
const { getMessaging } = require('../notification/firebase');

const router = express.Router();
router.use(userAuth);

// 서버에 FCM이 설정돼 있는지 (프론트에서 안내 문구 분기용)
router.get('/status', (req, res) => {
  res.json({ configured: getMessaging() !== null });
});

// 브라우저에서 발급받은 FCM 토큰 등록
router.post('/register', async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || token.length > 4096) {
    return res.status(400).json({ error: 'token is required' });
  }
  await pool.query(
    `INSERT INTO push_tokens (user_id, token, user_agent, last_used_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, last_used_at = now()`,
    [req.user.id, token, (req.header('user-agent') || '').slice(0, 255) || null]
  );
  res.status(201).json({ ok: true });
});

// 알림 끄기 (토큰 삭제)
router.post('/unregister', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'token is required' });
  await pool.query('DELETE FROM push_tokens WHERE token = $1 AND user_id = $2', [token, req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
