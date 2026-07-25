require('dotenv').config();
const path = require('path');
const express = require('express');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
