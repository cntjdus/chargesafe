const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.warn('경고: JWT_SECRET이 설정되지 않았습니다. .env 파일을 확인하세요.');
}

// 기본 8000 — 프론트엔드(monitoringApi.js)의 기본 API 주소와 맞춘 값.
// 배포 환경(Render 등)에서는 플랫폼이 PORT 를 주입하므로 그 값이 우선한다.
const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`ChargeSafe backend listening on http://localhost:${port}`);
});
