require('dotenv').config();
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());
// 보호자 대시보드(frontend/)를 정적 파일로 서빙 — 웹 루트 = frontend/
// 저장소에는 포함되지 않으므로(담당 분리), 배포 환경에서는 폴더가 없어 API 서버로만 동작한다
app.use(express.static(path.join(__dirname, '..', 'frontend')));

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
