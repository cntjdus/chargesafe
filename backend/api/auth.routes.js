const express = require('express');
const bcrypt = require('bcryptjs');
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

// 회원가입 — 프론트의 아이디(userId)는 username 으로 저장한다.
// 이메일만 있어도, 아이디만 있어도 가입할 수 있게 둘 중 하나만 필수로 한다.
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const username = (body.userId || body.username || '').trim() || null;
  const email = (body.email || '').trim() || null;
  const { password, name, phone } = body;

  if (!password || !name) {
    return res.status(400).json({ error: 'password and name are required' });
  }
  if (!username && !email) {
    return res.status(400).json({ error: 'userId or email is required' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, username, password_hash, name, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, name, phone, role`,
      // 이메일은 UNIQUE NOT NULL 이므로 아이디만 가입한 경우 내부용 값을 만들어 넣는다
      [email || `${username}@local.chargesafe`, username, passwordHash, name, phone || null]
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

module.exports = router;
