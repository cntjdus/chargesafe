# ChargeSafe Backend

전동휠체어 스마트 충전 도킹스테이션 **ChargeSafe**의 백엔드 서버 + 보호자 대시보드입니다.
ESP32가 보내는 센서 데이터를 수신·저장하고, 위험 단계를 판단해 위험 이벤트를 기록하며, 보호자용 웹 대시보드를 제공합니다.

## 기술 스택

- Node.js + Express 5
- PostgreSQL (로컬 또는 Supabase)
- JWT 인증 (보호자 계정), API 키 인증 (기기)
- 보호자 대시보드는 `../frontend` 의 React + Vite 앱이며, 빌드 결과(`frontend/dist`)를
  이 서버가 정적 파일로 함께 서빙합니다. 프론트엔드는 담당 분리로 `.gitignore` 처리되어
  이 저장소에는 포함되지 않으므로, 없으면 API 서버로만 동작합니다.

## 시작하기

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
cp .env.example .env
# .env 열어서 DATABASE_URL, JWT_SECRET 수정

# 3. DB 스키마 생성 (PostgreSQL이 실행 중이어야 함)
npm run migrate

# 4. 대시보드 빌드 (frontend/ 가 있는 경우)
npm run build:frontend

# 5. 개발 서버 실행
npm run dev
```

`http://localhost:3000` 에 접속하면 보호자 대시보드가 열립니다.
(`/health` 가 `{"status":"ok"}` 를 반환하면 서버 정상. 대시보드를 빌드하지 않았다면
루트 경로는 API 안내 JSON을 반환합니다.)

대시보드를 수정하며 개발할 때는 Vite 개발 서버를 함께 쓰면 편합니다
(`/api` 요청은 자동으로 3000번 백엔드로 전달됩니다):

```bash
cd ../frontend && npm run dev
```

시연·프론트엔드 개발용 샘플 충전 세션이 필요하면:

```bash
node database/seed-demo.js 1   # 1 = device_id
```

## 프로젝트 구조

루트 README의 `backend/api · database · notification` 구조를 따릅니다.

```
server.js                     서버 실행 진입점
app.js                        Express 앱 (미들웨어 + 라우트 등록)

api/                          API 엔드포인트 + 인증·처리 로직
  auth.routes.js              회원가입 / 로그인
  devices.routes.js           기기 등록·목록·상태·이력·이벤트
  sessions.routes.js          세션별 센서 기록 (그래프용)
  ingest.routes.js            ESP32 데이터 수신
  push.routes.js              FCM 푸시 토큰 등록/해제
  notifications.routes.js     알림 목록·읽음 처리
  me.routes.js                프로필·보호자·대표 기기
  presenters.js               DB 행 → 화면용 형태 변환 (날짜·상태 문자열 포함)
  userAuth.js                 보호자 JWT 인증 미들웨어
  deviceAuth.js               ESP32 API 키 인증 미들웨어
  ingest.service.js           수신 처리 (세션 관리 + 상태 갱신)
  risk.service.js             위험 단계 판단 (정상/주의/경고/위험)

database/                     데이터베이스
  db.js                       PostgreSQL 커넥션 풀
  migrate.js                  마이그레이션 실행기
  seed-demo.js                시연용 샘플 충전 세션 생성
  migrations/                 SQL 마이그레이션 (번호 순서대로 적용)
    001_init.sql              사용자·기기·세션·센서·위험이벤트·알림 스키마
    002_push_tokens.sql       FCM 푸시 토큰 테이블
    003_frontend_fields.sql   아이디 로그인·즐겨찾기·펌웨어·목표충전량·알림 읽음
    004_notification_types.sql 알림 유형(위험/주의/완료/정보)·보호자 관계

notification/                 보호자 알림
  notification.service.js     FCM 발송 + notifications 테이블 기록
  firebase.js                 Firebase Admin(FCM) 초기화

render.yaml / DEPLOY.md        배포 설정 및 가이드
.env.example                   환경 변수 예시
```

대시보드(`../frontend`)는 루트 README의 `frontend/src · frontend/public` 구조를 따릅니다.

```
frontend/
  index.html                  진입점 (Vite)
  src/
    app/App.tsx               로그인·회원가입 + 6개 화면
                              (대시보드 / 실시간 모니터링 / 충전 이력 / 알림 센터 / 기기 관리 / 설정)
    lib/api.ts                백엔드 API 클라이언트 (JWT 처리·응답 정규화)
    lib/hooks.ts              폴링 기반 조회 훅 (기기·세션·센서·이벤트)
    lib/DeviceContext.tsx     선택된 기기를 화면 간 공유
    lib/format.ts             날짜·단위·위험단계 표시 변환
    lib/push.ts               FCM 웹 푸시 켜기/끄기
    app/components/ui/        shadcn UI 컴포넌트
  public/                     로고·아이콘 등 정적 파일
    logo.svg, favicon.svg     ChargeSafe 로고·파비콘
    firebase-config.js        FCM 웹 설정 (공개 값)
    firebase-messaging-sw.js  백그라운드 알림 서비스워커
  dist/                       빌드 결과 — 백엔드가 이 폴더를 서빙
```

> 프론트엔드(`frontend/`)와 비밀값(`.env`, `firebase-service-account.json`)은
> `.gitignore`로 저장소에서 제외됩니다. 로컬 개발용으로만 존재합니다.

## API 요약

### 보호자용 (JWT — `Authorization: Bearer <token>`)

| 메서드 | 경로 | 설명 |
|---|---|---|
> `:id` 는 내부 숫자 id 와 시리얼 번호(화면에 보이는 기기 코드) 둘 다 사용할 수 있습니다.

| POST | `/api/auth/register` | 회원가입 `{ userId, password, name, email?, phone? }` |
| POST | `/api/auth/login` | 로그인 `{ userId, password }` → `{ token, user }` (아이디·이메일 모두 허용) |
| GET | `/api/me` | 프로필·보호자·대표 기기 (상단바/설정 화면 공통 정보) |
| GET | `/api/devices` | 내 기기 목록 (화면용 형태: `battery`, `status`, `firmware`, `isFavorite` 등) |
| POST | `/api/devices` | 기기 등록 `{ serial_number, name?, location? }` → API 키 1회 발급 |
| PATCH | `/api/devices/:id` | 기기 설정 수정 `{ name?, location?, isFavorite?, targetPercent? }` |
| DELETE | `/api/devices/:id` | 기기 등록 해제 (이력은 보존, 같은 시리얼로 재등록 가능) |
| GET | `/api/devices/:id/dashboard` | 대시보드 한 번에 조회 (충전량·완료 예정·센서 3종·미확인 알림) |
| GET | `/api/devices/:id/history` | 충전 이력 + 요약 통계 (`{ items, summary }`) |
| GET | `/api/notifications` | 알림 목록 (`?unread=true`, `?deviceId=`) |
| PATCH | `/api/notifications/:id/read` | 알림 하나 읽음 처리 |
| POST | `/api/notifications/read-all` | 전체 읽음 처리 |
| GET | `/api/devices/:id/status` | 기기 현재 상태 (원본 값) |
| GET | `/api/devices/:id/sessions` | 충전 이력 (`?limit=20`) |
| GET | `/api/devices/:id/events` | 위험 이벤트 이력 |
| GET | `/api/devices/:id/readings` | 기간별 센서 기록 (`?minutes=60`, 모니터링 그래프용) |
| GET | `/api/sessions/:id/readings` | 세션의 센서 기록 (그래프용) |
| GET | `/api/push/status` | 서버의 FCM 설정 여부 |
| POST | `/api/push/register` | FCM 푸시 토큰 등록 `{ token }` |
| POST | `/api/push/unregister` | FCM 푸시 토큰 해제 `{ token }` |

### 기기용 (API 키 — `X-API-Key: csk_...`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/ingest/readings` | 센서 데이터 전송 |

ESP32 전송 예시:

```bash
curl -X POST http://localhost:3000/api/ingest/readings \
  -H "X-API-Key: csk_발급받은키" \
  -H "Content-Type: application/json" \
  -d '{"charging": true, "temperature": 32.0, "current_a": 1.2, "voltage_v": 12.4, "smoke": false}'
```

응답의 `level`(`normal | caution | warning | danger`)을 보고 펌웨어가 냉각팬·차단 동작을 결정할 수 있습니다.

## 동작 방식

1. ESP32가 주기적으로 `/api/ingest/readings` 로 센서값을 전송합니다.
2. `charging: true` 인데 열린 세션이 없으면 충전 세션을 자동 생성하고, `charging: false` 가 오면 세션을 닫으면서 최고 온도·최대 전류를 집계합니다.
3. 매 수신마다 위험 단계를 판단해 `sensor_readings` 에 저장하고 `device_status` 를 갱신합니다.
4. 단계가 경고 이상으로 올라가는 순간 `risk_events` 에 기록하고 보호자에게 알림을 생성합니다 (같은 단계가 반복돼도 중복 알림은 발생하지 않습니다).
5. 충전이 정상 종료되면 "충전 완료", 오랫동안 끊겼던 기기가 다시 데이터를 보내면 "기기 연결됨" 알림을 남깁니다.

### 기준값 (12V 계열 배터리)

화면에 표시되는 기준과 같은 값을 씁니다. `.env` 에서 조정할 수 있습니다 (`.env.example` 참고).

| 항목 | 주의 | 경고 | 위험(자동 차단) |
|---|---|---|---|
| 온도 | 40℃ | 45℃ | 50℃ |
| 전류 | 4A 이상 | — | — |
| 전압 | — | 14.5V 이상 | — |
| 연기 | — | — | 감지 즉시 |

충전량(%)은 전압으로 추정합니다 (11.8V = 0%, 12.75V = 100%).

> 가스(MQ-2 가스 농도)는 화면에서 사용하지 않아 위험 판단과 API 응답에서 제외했습니다.
> 연기 감지는 그대로 유지되며, `sensor_readings.gas_ppm` 컬럼은 하드웨어 데이터 보존을 위해 남아 있습니다.

### 추정 지표 (참고용)

대시보드의 아래 두 값은 전용 계측이 아니라 최근 충전 이력에서 계산한 근사치입니다.
산출식은 [api/presenters.js](api/presenters.js) 주석에 있습니다.

- **배터리 건강도** — 목표 충전량 대비 실제 도달률에서, 고온(45℃ 이상) 노출 세션 비율만큼 감점
- **추천 신뢰도** — 분석에 사용한 완료 세션 수 (5회 이상이면 최대 95%)

## 푸시 알림 설정 (FCM)

코드는 이미 연동되어 있고, Firebase 프로젝트의 키 3가지만 넣으면 동작합니다.
설정하지 않으면 알림은 DB에만 기록됩니다 (앱 알림 탭에서는 계속 보임).

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 (이름 예: `chargesafe`)
2. **웹 앱 설정 붙여넣기** — 프로젝트 설정 → 일반 → "내 앱" → 웹 앱(`</>`) 추가 →
   표시되는 `firebaseConfig` 객체를 `../frontend/public/firebase-config.js`의 `FIREBASE_CONFIG`에 붙여넣기
3. **VAPID 키 붙여넣기** — 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 → "키 쌍 생성" →
   키 문자열을 같은 파일의 `FIREBASE_VAPID_KEY`에 붙여넣기
4. **서비스 계정 키 저장** — 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" →
   내려받은 JSON 파일을 `backend/` 폴더에 `firebase-service-account.json`으로 저장하고
   `backend/.env`에 `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json` 추가 (이 파일은 절대 깃에 올리지 말 것 — .gitignore에 등록됨)
5. 서버 재시작 후, 대시보드 **설정 → 위험 알림 푸시 → 알림 켜기**를 누르면 해당 브라우저가 알림을 받기 시작합니다.

동작 방식: 경고/위험 단계 진입 시 서버가 보호자의 등록된 모든 브라우저로 푸시를 발송하고,
결과(sent/failed/pending)를 `notifications` 테이블에 기록합니다. 만료된 토큰은 자동 삭제됩니다.
탭이 백그라운드이거나 닫혀 있어도 `../frontend/public/firebase-messaging-sw.js` 서비스 워커가 알림을 표시합니다.

## TODO

- [ ] 대시보드 실시간 갱신 (Supabase Realtime 또는 WebSocket)
- [ ] 센서 데이터 다운샘플링 / 보존 정책
