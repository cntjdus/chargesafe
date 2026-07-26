require('dotenv').config();
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());
// 보호자 대시보드(frontend/)를 정적 파일로 서빙 — 웹 루트 = frontend/
// 저장소에는 포함되지 않으므로(담당 분리), 배포 환경에서는 폴더가 없어 API 서버로만 동작한다
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 대시보드가 없는 환경(배포 서버)에서 루트로 접속했을 때의 안내.
// frontend/ 가 있으면 위의 정적 서빙이 index.html 을 먼저 반환하므로 여기까지 오지 않는다.
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

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
