// 프론트엔드가 다른 주소(예: Vite 개발 서버 http://localhost:5173)에서
// 이 API를 직접 호출하므로 CORS 허용이 필요하다.
//
// 허용 주소는 CORS_ORIGINS 환경변수(쉼표 구분)로 지정한다.
// 미설정이면 로컬 개발용 주소만 허용한다 (배포 시 실제 도메인을 넣을 것).
const DEFAULT_ORIGINS = [
  'http://localhost:5173',   // Vite 개발 서버
  'http://localhost:4173',   // Vite 프리뷰
  'http://localhost:3000',   // 백엔드가 대시보드를 함께 서빙할 때
  'http://localhost:8000',
];

const allowed = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ORIGINS = allowed.length ? allowed : DEFAULT_ORIGINS;

function cors(req, res, next) {
  const origin = req.header('Origin');

  // 같은 출처에서 온 요청(브라우저가 Origin 을 안 붙임)이나 ESP32 같은
  // 비브라우저 클라이언트는 CORS 대상이 아니므로 그대로 통과시킨다.
  if (origin && (ORIGINS.includes('*') || ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');           // 캐시가 출처별로 나뉘도록
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // 사전 요청(preflight)은 본문 없이 바로 끝낸다
  if (req.method === 'OPTIONS') return res.sendStatus(204);

  next();
}

module.exports = { cors, ORIGINS };
