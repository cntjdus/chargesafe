const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/db');

const router = express.Router();

/** 로그인 응답에 담는 사용자 정보 (비밀번호 해시는 절대 포함하지 않는다) */
function publicUser(row) {
  return {
    id: String(row.id),
    userId: row.username,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
  };
}

// 가입 화면(SignupTypeSelector)이 고르는 유형.
// admin 은 여기에 없다 — 스스로 관리자로 가입하는 권한 상승을 막기 위함이다.
const SIGNUP_ROLES = ['user', 'guardian'];

// 회원가입 — 프론트의 아이디(userId)는 username 으로 저장한다.
// 이메일만 있어도, 아이디만 있어도 가입할 수 있게 둘 중 하나만 필수로 한다.
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const username = (body.userId || body.username || '').trim() || null;
  const email = (body.email || '').trim() || null;
  const { password, name, phone } = body;
  // 프론트는 signupType 으로 보내지만 role 이라는 이름도 함께 받는다.
  // 목록에 없는 값(admin 포함)은 조용히 기본값으로 떨어뜨린다.
  const requested = body.signupType || body.role;
  const role = SIGNUP_ROLES.includes(requested) ? requested : 'guardian';

  if (!password || !name) {
    return res.status(400).json({ error: 'password and name are required' });
  }
  if (!username && !email) {
    return res.status(400).json({ error: 'userId or email is required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash, name, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, username, name, phone, role`,
      // 이메일은 UNIQUE NOT NULL 이므로 아이디만 가입한 경우 내부용 값을 만들어 넣는다
      [email || `${username}@local.chargesafe`, username, passwordHash, name, phone || null, role]
    );
    res.status(201).json(publicUser(rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'userId or email already registered' });
    }
    throw err;
  }
});

// 로그인 — 프론트는 { userId, password } 를 보내지만 이메일로도 로그인할 수 있게 한다
router.post('/login', async (req, res) => {
  const body = req.body || {};
  const identifier = (body.userId || body.email || body.username || '').trim();
  const { password } = body;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'userId and password are required' });
  }

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE username = $1 OR email = $1',
    [identifier]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid userId or password' });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.json({ token, user: publicUser(user) });
});

// ─────────────────────────────────────────────────────────────
// 계정 복구 — 로그인 화면의 "아이디 찾기 / 비밀번호 재설정"
//
// ⚠️ 메일·문자 발송 수단이 없어서 본인 확인을 이름 + 연락처로만 한다.
//    이름과 전화번호를 아는 사람이면 남의 비밀번호를 바꿀 수 있다는 뜻이다.
//    실제 서비스로 쓰려면 재설정 토큰을 응답에서 빼고 메일이나 문자로 보내야 한다
//    (그 외 코드는 그대로 두어도 된다).
//
// 또한 지금 가입 화면은 전화번호를 받지 않는다. 연락처가 비어 있는 계정은
// 아래 두 기능으로 찾을 수 없으므로, PATCH /api/me 로 전화번호를 먼저 채워야 한다.
// ─────────────────────────────────────────────────────────────

/** 계정 복구 시도 제한 — 이름·연락처를 반복해서 넣어보는 것을 늦춘다.
 *  서버 메모리에만 두므로 재시작하면 초기화된다 (단일 인스턴스 배포 기준). */
const RECOVERY_MAX_ATTEMPTS = 5;
const RECOVERY_WINDOW_MS = 10 * 60 * 1000;
const recoveryAttempts = new Map();

function tooManyAttempts(req) {
  const now = Date.now();

  // 오래된 기록은 쌓이지 않게 가끔 비운다
  if (recoveryAttempts.size > 500) {
    for (const [key, value] of recoveryAttempts) {
      if (now - value.since > RECOVERY_WINDOW_MS) recoveryAttempts.delete(key);
    }
  }

  const ip = req.ip || 'unknown';
  const hit = recoveryAttempts.get(ip);
  if (!hit || now - hit.since > RECOVERY_WINDOW_MS) {
    recoveryAttempts.set(ip, { since: now, count: 1 });
    return false;
  }
  hit.count += 1;
  return hit.count > RECOVERY_MAX_ATTEMPTS;
}

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/** 아이디는 일부만 보여준다 — 이름·연락처만 알면 조회되기 때문이다 */
function maskUserId(userId) {
  if (!userId) return null;
  if (userId.length <= 3) return userId[0] + '*'.repeat(userId.length - 1);
  return userId.slice(0, 3) + '*'.repeat(userId.length - 3);
}

// 아이디 찾기 — body: { name, phone } 또는 { name, email }
router.post('/find-id', async (req, res) => {
  if (tooManyAttempts(req)) {
    return res.status(429).json({ error: '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
  }

  const body = req.body || {};
  const name = (body.name || '').trim();
  const contact = (body.phone || body.email || '').trim();
  if (!name || !contact) {
    return res.status(400).json({ error: 'name and phone (or email) are required' });
  }

  const { rows } = await pool.query(
    `SELECT username, created_at FROM users
     WHERE name = $1 AND (phone = $2 OR email = $2) AND username IS NOT NULL
     ORDER BY id LIMIT 1`,
    [name, contact]
  );
  if (!rows.length) {
    return res.status(404).json({ error: '일치하는 계정을 찾을 수 없습니다.' });
  }
  res.json({ userId: maskUserId(rows[0].username), joinedAt: rows[0].created_at });
});

/** 재설정 토큰 유효 시간 (분) */
const RESET_TTL_MIN = 30;

// 비밀번호 재설정 ① 본인 확인 — body: { userId, name, phone } (phone 대신 email 도 가능)
router.post('/reset-password/request', async (req, res) => {
  if (tooManyAttempts(req)) {
    return res.status(429).json({ error: '시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.' });
  }

  const body = req.body || {};
  const identifier = (body.userId || body.email || body.username || '').trim();
  const name = (body.name || '').trim();
  const contact = (body.phone || body.email || '').trim();
  if (!identifier || !name || !contact) {
    return res.status(400).json({ error: 'userId, name and phone (or email) are required' });
  }

  const { rows } = await pool.query(
    `SELECT id FROM users
     WHERE (username = $1 OR email = $1) AND name = $2 AND (phone = $3 OR email = $3)
     LIMIT 1`,
    [identifier, name, contact]
  );
  if (!rows.length) {
    return res.status(404).json({ error: '일치하는 계정을 찾을 수 없습니다.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  await pool.query(
    `INSERT INTO password_resets (token_hash, user_id, expires_at)
     VALUES ($1, $2, now() + make_interval(mins => $3))`,
    [sha256(token), rows[0].id, RESET_TTL_MIN]
  );
  // 메일·문자 수단이 생기면 이 토큰을 응답에서 빼고 그쪽으로 보낸다
  res.json({ resetToken: token, expiresInMinutes: RESET_TTL_MIN });
});

// 비밀번호 재설정 ② 새 비밀번호 저장 — body: { resetToken, password }
router.post('/reset-password', async (req, res) => {
  const body = req.body || {};
  const token = (body.resetToken || '').trim();
  const password = body.password || body.newPassword || '';

  if (!token || !password) {
    return res.status(400).json({ error: 'resetToken and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT user_id FROM password_resets
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       FOR UPDATE`,
      [sha256(token)]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: '만료되었거나 이미 사용된 재설정 요청입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await client.query('UPDATE users SET password_hash = $2 WHERE id = $1',
      [rows[0].user_id, passwordHash]);
    // 이 계정에 남아 있는 다른 재설정 요청도 함께 무효화한다
    await client.query(
      'UPDATE password_resets SET used_at = now() WHERE user_id = $1 AND used_at IS NULL',
      [rows[0].user_id]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

module.exports = router;
