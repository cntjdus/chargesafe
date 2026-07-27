const fs = require('fs');
const path = require('path');
// 실행 위치(cwd)와 무관하게 backend/.env 를 읽는다
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');

const app = express();
app.use(express.json());

// 보호자 대시보드는 React(Vite) 앱이므로 빌드 결과(frontend/dist)를 서빙한다.
// frontend/ 는 담당 분리로 저장소에 포함되지 않으므로, 배포 환경에 dist 가 없으면
// 정적 서빙은 아무것도 반환하지 않고 아래 안내 JSON 이 응답한다 (API 서버로만 동작).
const DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist');
const DIST_INDEX = path.join(DIST_DIR, 'index.html');
app.use(express.static(DIST_DIR));

// 루트 접속 안내 — dist 가 있으면 위의 정적 서빙이 index.html 을 먼저 반환한다.
app.get('/', (req, res) => res.json({
  service: 'ChargeSafe API',
  message: 'ChargeSafe 백엔드 API 서버입니다. 보호자 대시보드는 별도로 배포됩니다.',
  health: '/health',
  endpoints: ['/api/auth', '/api/devices', '/api/sessions', '/api/ingest', '/api/push'],
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', require('./api/auth.routes'));
app.use('/api/devices', require('./api/devices.routes'));
app.use('/api/sessions', require('./api/sessions.routes'));
app.use('/api/ingest', require('./api/ingest.routes'));
app.use('/api/push', require('./api/push.routes'));

// SPA 폴백 — API 가 아닌 GET 요청은 대시보드로 넘겨 새로고침·딥링크가 깨지지 않게 한다
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (!fs.existsSync(DIST_INDEX)) return next();
  res.sendFile(DIST_INDEX);
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
