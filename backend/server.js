const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.warn('경고: JWT_SECRET이 설정되지 않았습니다. .env 파일을 확인하세요.');
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`ChargeSafe backend listening on http://localhost:${port}`);
});
