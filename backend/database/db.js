const path = require('path');
// 실행 위치(cwd)와 무관하게 backend/.env 를 읽는다
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
