# ChargeSafe Backend

전동휠체어 스마트 충전 도킹스테이션 **ChargeSafe**의 백엔드 서버 + 보호자 대시보드입니다.
ESP32가 보내는 센서 데이터를 수신·저장하고, 위험 단계를 판단해 위험 이벤트를 기록하며, 보호자용 웹 대시보드를 제공합니다.

## 기술 스택

- Node.js + Express 5
- PostgreSQL (로컬 또는 Supabase)
- JWT 인증 (보호자 계정), API 키 인증 (기기)
- 프론트엔드: 순수 HTML/CSS/JS (`public/` — 백엔드 서버가 함께 서빙, 빌드 불필요)
  - 디자인은 `Figma/` 폴더의 Figma Make 시안(모바일 앱 스타일, 5탭 구조)을 기반으로 구현
  - 반응형: 모바일(하단 탭) / 태블릿 768px~(2열 배치) / 노트북 1024px~(왼쪽 사이드바 + 이력 2패널)

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 열어서 DATABASE_URL, JWT_SECRET 수정

# 3. DB 스키마 생성 (PostgreSQL이 실행 중이어야 함)
npm run migrate

# 4. 개발 서버 실행
npm run dev
```

`http://localhost:3000` 에 접속하면 보호자 대시보드가 열립니다.
(`/health` 가 `{"status":"ok"}` 를 반환하면 서버 정상)

시연·프론트엔드 개발용 샘플 충전 세션이 필요하면:

```bash
node scripts/seed-demo.js 1   # 1 = device_id
```

## 프로젝트 구조

```
migrations/          SQL 마이그레이션 (번호 순서대로 적용)
scripts/migrate.js   마이그레이션 실행기
scripts/seed-demo.js 시연용 샘플 충전 세션 생성
public/              보호자 대시보드 (정적 파일, Figma 시안 기반)
  index.html         로그인 + 5탭 화면 (홈/모니터링/이력/알림/설정)
  css/styles.css     Figma 디자인 토큰 기반 스타일
  js/api.js          API 호출 래퍼 (JWT 처리)
  js/icons.js        인라인 SVG 아이콘 세트
  js/chart.js        원형 게이지, 실시간 영역차트, 세션 상세 차트
  js/app.js          탭 전환, 3초 폴링, 기기 등록, CSV 보고서
Figma/               팀에서 만든 Figma Make 디자인 시안 (React, 참고용)
src/
  app.js           Express 앱 (라우트 등록)
  server.js        서버 실행 진입점
  config/db.js     PostgreSQL 커넥션 풀
  middleware/
    userAuth.js    보호자 JWT 인증
    deviceAuth.js  ESP32 API 키 인증
  routes/
    auth.routes.js     회원가입 / 로그인
    devices.routes.js  기기 등록·목록·상태·이력·이벤트
    sessions.routes.js 세션별 센서 기록 (그래프용)
    ingest.routes.js   ESP32 데이터 수신
  services/
    ingest.service.js       수신 처리 (세션 관리 + 상태 갱신)
    risk.service.js         위험 단계 판단 (정상/주의/경고/위험)
    notification.service.js 보호자 알림 (현재 DB 기록 + 콘솔, FCM 연동 예정)
```

## API 요약

### 보호자용 (JWT — `Authorization: Bearer <token>`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 `{ email, password, name, phone? }` |
| POST | `/api/auth/login` | 로그인 → `{ token, user }` |
| GET | `/api/devices` | 내 기기 목록 + 현재 상태 |
| POST | `/api/devices` | 기기 등록 `{ serial_number, name?, location? }` → API 키 1회 발급 |
| GET | `/api/devices/:id/status` | 기기 현재 상태 |
| GET | `/api/devices/:id/sessions` | 충전 이력 (`?limit=20`) |
| GET | `/api/devices/:id/events` | 위험 이벤트 이력 |
| GET | `/api/sessions/:id/readings` | 세션의 센서 기록 (그래프용) |

### 기기용 (API 키 — `X-API-Key: csk_...`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/ingest/readings` | 센서 데이터 전송 |

ESP32 전송 예시:

```bash
curl -X POST http://localhost:3000/api/ingest/readings \
  -H "X-API-Key: csk_발급받은키" \
  -H "Content-Type: application/json" \
  -d '{"charging": true, "temperature": 36.5, "current_a": 2.1, "voltage_v": 24.2, "gas_ppm": 12, "smoke": false}'
```

응답의 `level`(`normal | caution | warning | danger`)을 보고 펌웨어가 냉각팬·차단 동작을 결정할 수 있습니다.

## 동작 방식

1. ESP32가 주기적으로 `/api/ingest/readings` 로 센서값을 전송합니다.
2. `charging: true` 인데 열린 세션이 없으면 충전 세션을 자동 생성하고, `charging: false` 가 오면 세션을 닫으면서 최고 온도·최대 전류를 집계합니다.
3. 매 수신마다 위험 단계를 판단해 `sensor_readings` 에 저장하고 `device_status` 를 갱신합니다.
4. 단계가 경고 이상으로 올라가는 순간 `risk_events` 에 기록하고 보호자에게 알림을 생성합니다 (같은 단계가 반복돼도 중복 알림은 발생하지 않습니다).

위험 판단 임계값은 `.env` 에서 조정할 수 있습니다 (`TEMP_DANGER`, `GAS_DANGER_PPM` 등 — `.env.example` 참고).

## 푸시 알림 설정 (FCM)

코드는 이미 연동되어 있고, Firebase 프로젝트의 키 3가지만 넣으면 동작합니다.
설정하지 않으면 알림은 DB에만 기록됩니다 (앱 알림 탭에서는 계속 보임).

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 (이름 예: `chargesafe`)
2. **웹 앱 설정 붙여넣기** — 프로젝트 설정 → 일반 → "내 앱" → 웹 앱(`</>`) 추가 →
   표시되는 `firebaseConfig` 객체를 [public/js/firebase-config.js](public/js/firebase-config.js)의 `FIREBASE_CONFIG`에 붙여넣기
3. **VAPID 키 붙여넣기** — 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 → "키 쌍 생성" →
   키 문자열을 같은 파일의 `FIREBASE_VAPID_KEY`에 붙여넣기
4. **서비스 계정 키 저장** — 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" →
   내려받은 JSON 파일을 프로젝트 루트에 `firebase-service-account.json`으로 저장하고
   `.env`에 `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json` 추가 (이 파일은 절대 깃에 올리지 말 것 — .gitignore에 등록됨)
5. 서버 재시작 후, 대시보드 **설정 → 위험 알림 푸시 → 알림 켜기**를 누르면 해당 브라우저가 알림을 받기 시작합니다.

동작 방식: 경고/위험 단계 진입 시 서버가 보호자의 등록된 모든 브라우저로 푸시를 발송하고,
결과(sent/failed/pending)를 `notifications` 테이블에 기록합니다. 만료된 토큰은 자동 삭제됩니다.
탭이 백그라운드이거나 닫혀 있어도 [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js) 서비스 워커가 알림을 표시합니다.

## TODO

- [ ] 대시보드 실시간 갱신 (Supabase Realtime 또는 WebSocket)
- [ ] 센서 데이터 다운샘플링 / 보존 정책
