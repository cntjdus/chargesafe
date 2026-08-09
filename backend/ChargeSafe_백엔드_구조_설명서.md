# ChargeSafe 백엔드 구조 설명서

> 전동휠체어 스마트 충전 도킹스테이션 **ChargeSafe** 의 백엔드 전체 구조와 파일별 동작 설명서
> 작성일: 2026-07-28 · 대상 폴더: `바탕화면/Chargesafe_Backend`

---

## 1. 이 시스템이 하는 일

ESP32(도킹스테이션)가 보내는 센서 데이터를 받아서

1. **저장**하고 (충전 세션 단위로 묶어서)
2. **위험한지 판단**하고 (정상 → 주의 → 경고 → 위험)
3. 위험하면 **충전을 차단**하도록 응답하고, **보호자에게 알림**을 보내고
4. 보호자 웹 대시보드가 쓸 수 있게 **API로 제공**합니다.

핵심 흐름 한 줄 요약:

```
ESP32 → POST /api/ingest/readings → 위험 판단 → DB 저장 → (위험하면) 알림 발송
                                        ↓
                            보호자 대시보드가 API로 조회
```

---

## 2. 전체 폴더 구조

프로젝트 루트 README 의 `backend/api · database · notification` 구조를 그대로 따릅니다.

```
Chargesafe_Backend/
├── .gitignore                    (저장소 제외 목록)
├── README.md                     (팀 공용 프로젝트 개요 — 팀원이 작성)
├── frontend/                     (보호자 대시보드 — 다른 팀원 담당, 저장소 제외)
└── backend/                      ← 이 문서가 설명하는 부분
    ├── server.js                 서버 실행 진입점
    ├── app.js                    Express 앱 조립 (미들웨어·라우트 등록)
    ├── package.json              의존성·실행 스크립트
    ├── package-lock.json         의존성 버전 고정
    ├── render.yaml               Render 배포 설정
    ├── .env                      실제 비밀값 (저장소 제외)
    ├── .env.example              환경변수 작성 예시
    ├── README.md                 백엔드 사용 설명서
    ├── DEPLOY.md                 배포 가이드
    ├── ChargeSafe_프론트엔드_연동_가이드.md   프론트엔드 담당용 연동 절차
    ├── firebase-service-account.json  FCM 관리자 키 (저장소 제외)
    │
    ├── api/                      API 엔드포인트 + 인증 + 처리 로직
    │   ├── auth.routes.js            회원가입 / 로그인
    │   ├── me.routes.js              내 프로필 · 보호자 · 대표 기기
    │   ├── devices.routes.js         기기 등록·수정·삭제·대시보드·이력
    │   ├── sessions.routes.js        세션별 센서 기록
    │   ├── ingest.routes.js          ESP32 데이터 수신 창구
    │   ├── notifications.routes.js   알림 목록·읽음 처리
    │   ├── push.routes.js            FCM 푸시 토큰 등록/해제
    │   ├── userAuth.js               보호자 JWT 인증 미들웨어
    │   ├── deviceAuth.js             ESP32 API 키 인증 미들웨어
    │   ├── cors.js                   다른 주소의 프론트엔드 호출 허용
    │   ├── ingest.service.js         수신 처리 핵심 로직
    │   ├── risk.service.js           위험 단계 판단 로직
    │   └── presenters.js             DB 행 → 화면용 형태 변환
    │
    ├── database/                 데이터베이스
    │   ├── db.js                     PostgreSQL 연결 풀
    │   ├── migrate.js                마이그레이션 실행기
    │   ├── seed-demo.js              시연용 샘플 데이터 생성
    │   └── migrations/
    │       ├── 001_init.sql              기본 스키마 (8개 테이블)
    │       ├── 002_push_tokens.sql       FCM 토큰 테이블
    │       ├── 003_frontend_fields.sql   아이디·즐겨찾기·펌웨어·읽음
    │       ├── 004_notification_types.sql 알림 유형·보호자 관계
    │       ├── 005_device_settings.sql   기기별 안전 설정
    │       ├── 006_enable_rls.sql        전 테이블 RLS·anon 권한 회수
    │       └── 007_user_settings.sql     계정별 설정·가입 유형 제약
    │
    └── notification/             보호자 알림
        ├── notification.service.js   알림 생성 + FCM 발송
        └── firebase.js               Firebase Admin(FCM) 초기화
```

---

## 3. 요청이 처리되는 순서

### 3-1. ESP32가 센서값을 보낼 때

```
① ESP32
   POST /api/ingest/readings
   헤더: X-API-Key: csk_xxxxx
   본문: { charging, temperature, current_a, voltage_v, smoke }
        ↓
② app.js 가 /api/ingest 경로를 ingest.routes.js 로 넘김
        ↓
③ deviceAuth.js — API 키를 SHA-256 해시로 바꿔 DB의 기기와 대조
   (틀리면 401, 비활성 기기도 401)
        ↓
④ ingest.service.js  handleReading()
   ├─ 오래 끊겼다 다시 연결됐나? → "기기 연결됨" 알림(info)
   ├─ charging: false 면 → 세션 종료 + "충전 완료" 알림(success) 후 끝
   ├─ 열린 세션이 없으면 새 충전 세션 생성
   ├─ risk.service.js  assess() 로 위험 단계 판단
   ├─ sensor_readings 에 저장
   ├─ device_status 갱신 (대시보드가 읽는 현재 상태)
   ├─ 단계가 올라갔고 경고 이상이면
   │     → risk_events 기록
   │     → notification.service.js  notifyGuardians() 로 알림+푸시
   └─ 위험이면 세션에 auto_cutoff = true 표시
        ↓
⑤ 응답 { level, cause, session_id }
   → ESP32는 level 을 보고 냉각팬 작동/충전 차단을 결정
```

### 3-2. 보호자가 대시보드를 열 때

```
① 브라우저 → POST /api/auth/login { userId, password }
        ↓
② auth.routes.js — 비밀번호 대조 후 JWT 토큰 발급
        ↓
③ 이후 모든 요청에 Authorization: Bearer <토큰>
        ↓
④ userAuth.js 가 토큰을 검증하고 req.user 에 사용자 정보를 넣음
        ↓
⑤ 각 라우트가 DB 조회 → presenters.js 로 화면용 형태 변환 → 응답
```

---

## 4. 파일별 상세 설명

### 4-1. 진입점

#### `server.js` (10줄)
서버를 실제로 켜는 파일입니다. 하는 일은 두 가지뿐입니다.

- `app.js` 에서 조립된 Express 앱을 가져와 지정된 포트(기본 8000)로 실행
- `JWT_SECRET` 이 설정되지 않았으면 경고 메시지 출력

앱 구성과 실행을 분리해 둔 이유는, 테스트할 때 서버를 켜지 않고도 `app.js` 만 불러와 검사할 수 있게 하기 위해서입니다.

#### `app.js` (50줄)
Express 앱을 조립하는 파일입니다. **등록 순서가 곧 처리 순서**라 순서가 중요합니다.

| 순서 | 내용 | 설명 |
|---|---|---|
| 1 | `dotenv.config({ path: __dirname/.env })` | 실행 위치와 무관하게 `backend/.env` 를 읽음 |
| 1-2 | `cors` | 다른 주소의 프론트엔드가 호출할 수 있게 허용 (가장 먼저 적용) |
| 2 | `express.json()` | 요청 본문의 JSON을 파싱 |
| 3 | `express.static(../frontend/dist)` | 대시보드 빌드 결과를 정적 파일로 제공 |
| 4 | `GET /` | dist가 없을 때 나오는 API 안내 JSON |
| 5 | `GET /health` | 서버 생존 확인 (`{"status":"ok"}`) |
| 6 | `/api/*` 라우트 7개 등록 | auth, me, devices, sessions, ingest, notifications, push |
| 7 | SPA 폴백 | API가 아닌 GET은 대시보드로 넘겨 새로고침이 깨지지 않게 함 |
| 8 | 404 핸들러 | 위에서 아무것도 걸리지 않으면 `{"error":"Not found"}` |
| 9 | 에러 핸들러 | 예외 발생 시 로그를 남기고 500 응답 |

> **왜 dist가 없어도 되나?**
> 프론트엔드는 다른 팀원 담당이라 저장소에서 제외됩니다. 배포 서버에는 `frontend/dist` 가 없으므로
> 3번이 아무것도 반환하지 않고 4번의 안내 JSON이 나옵니다. 이 상태가 **정상**이며 API는 모두 동작합니다.

---

### 4-2. `api/` — API와 처리 로직

#### `userAuth.js` (16줄) — 보호자 인증 미들웨어
`Authorization: Bearer <토큰>` 헤더에서 JWT를 꺼내 검증합니다.

- 헤더가 없으면 → `401 Login required`
- 토큰이 위조·만료됐으면 → `401 Invalid or expired token`
- 통과하면 `req.user = { id, role }` 를 채워 다음 단계로 넘김

보호자용 라우트 파일들은 맨 위에서 `router.use(userAuth)` 로 이 미들웨어를 한 번에 적용합니다.

#### `deviceAuth.js` (21줄) — 기기 인증 미들웨어
ESP32 전용입니다. `X-API-Key` 헤더의 키를 **SHA-256 해시로 바꿔** DB의 `devices.api_key_hash` 와 대조합니다.

- DB에는 **해시만 저장**하므로, DB가 유출돼도 원본 키를 알 수 없습니다.
- `is_active = false` 인 기기(등록 해제된 기기)는 통과시키지 않습니다.
- 통과하면 `req.device` 에 기기 정보와 **기기별 안전 설정**(온도 차단 기준, 자동 차단·냉각팬 사용 여부,
  장시간 경고 기준)이 함께 담겨, 수신 처리에서 바로 쓸 수 있습니다.

#### `cors.js` (41줄) — 다른 주소의 호출 허용 (CORS)
프론트엔드는 Vite 개발 서버(`localhost:5173`)에서 실행되면서 API는 다른 주소(`localhost:8000`)로 부릅니다.
브라우저는 이런 **교차 출처 요청을 기본적으로 차단**하므로, 서버가 "이 주소는 허용한다"고 알려줘야 합니다.

- 허용 목록은 `CORS_ORIGINS` 환경변수(쉼표 구분)로 지정합니다.
  미설정 시 로컬 개발용 주소(`5173`, `4173`, `3000`, `8000`)만 허용합니다.
- **허용 목록에 없는 주소에는 허용 헤더를 주지 않습니다** (아무나 호출하지 못하게).
- 브라우저가 본 요청 전에 보내는 **사전 요청(OPTIONS)** 은 본문 없이 204로 바로 응답합니다.
- `Authorization`(로그인 토큰)과 `X-API-Key`(기기 키) 헤더를 허용 목록에 넣어,
  인증이 필요한 요청도 교차 출처에서 동작합니다.
- ESP32 같은 비브라우저 클라이언트는 `Origin` 헤더가 없어 이 검사와 무관하게 통과합니다.

#### `auth.routes.js` (78줄) — 회원가입 / 로그인

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |

- **아이디(userId)와 이메일 둘 다 로그인 가능**합니다. 프론트 로그인 폼이 "아이디"를 받기 때문에
  `SELECT * FROM users WHERE username = $1 OR email = $1` 로 한 번에 조회합니다.
- 비밀번호는 `bcrypt` 로 해시(cost 10)해서 저장하고, 로그인 시 `bcrypt.compare` 로 대조합니다.
  **평문 비밀번호는 어디에도 저장되지 않습니다.**
- 로그인 성공 시 7일짜리 JWT를 발급합니다.
- `publicUser()` 함수로 응답을 만들어 **비밀번호 해시가 절대 응답에 섞이지 않게** 합니다.
- 회원가입 시 아이디만 있고 이메일이 없으면, 내부용 이메일(`아이디@local.chargesafe`)을 자동 생성합니다.
  (이메일 컬럼이 `UNIQUE NOT NULL` 이기 때문)
- 가입 화면의 유형 선택(`signupType`)을 역할로 저장합니다. **`user` / `guardian` 만 받습니다.**
  `admin` 을 보내도 `guardian` 이 되므로 화면에서 관리자 계정을 만들 수 없습니다.
  DB에도 `CHECK (role IN ('user','guardian','admin'))` 제약이 걸려 있습니다.

#### `me.routes.js` — 내 정보와 설정

`GET /api/me` — 화면 상단바와 설정 카드가 공통으로 쓰는 정보를 한 번에 내려줍니다.

반환 내용:
- `user` — 이름, 역할, 아이디, 이메일, 전화번호
- `guardian` — 같은 기기를 함께 보는 다른 보호자 (이름, 관계, 전화번호). 없으면 `null`
- `deviceId` — 대표 기기의 시리얼 (즐겨찾기 기기 우선, 없으면 먼저 등록한 기기)
- `chargePercent`, `chargingStatus`, `firmware`

`GET · PATCH /api/me/settings` — 설정 화면(SettingsPage)이 쓰는 값 전체입니다.

설정 화면에는 **기기 선택 UI가 없어서** 값 하나를 계정 전체에 적용하는 형태입니다.
그래서 두 종류를 한 응답에 합쳐 놓았습니다.

| 종류 | 항목 | 저장 위치 |
|---|---|---|
| 계정 단위 | 푸시 알림·보호자 알림·알림음·음성 안내·큰 글씨·테마 | `user_settings` |
| 기기 단위 | 충전 모드·냉각팬·자동 차단·온도 기준·장시간 경고 | `devices` |

- **조회**는 대표 기기 값을 보여주고, **저장**은 내 기기 전체에 같은 값을 적용합니다.
  기기마다 다르게 두려면 `PATCH /api/devices/:id` 를 씁니다.
- 보낸 항목만 바꿉니다. 안 보낸 항목은 그대로 둡니다.
- 기기가 없으면 응답의 `hasDevice` 가 `false` 이고 기기 값은 저장되지 않습니다.
- `chargeMode`(`batteryProtection`/`eco`/`normal`/`full`)는 `targetPercent`(85/80/90/100)로 변환해
  저장합니다. 프론트가 모드 id 로 다루고 DB는 숫자로 다루기 때문입니다.
- 푸시 알림을 끈 계정은 FCM 발송 대상에서 제외되지만, **알림 센터 기록은 그대로 남습니다.**
  껐다고 이력까지 사라지면 안 되기 때문입니다.

#### `devices.routes.js` — 기기 관련 전부 (가장 큰 파일)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/devices` | 내 기기 목록 (화면용 형태) |
| POST | `/api/devices` | 기기 등록 → **API 키 1회 발급** |
| PATCH | `/api/devices/:id` | 이름·위치·즐겨찾기 + **안전/충전 설정** 수정 |
| DELETE | `/api/devices/:id` | 기기 등록 해제 |
| GET | `/api/devices/:id/status` | 현재 상태 (가공 없는 원본) |
| GET | `/api/devices/:id/monitoring` | **모니터링 그래프** (`?range=realtime\|hour\|today\|week`) |
| GET | `/api/devices/:id/dashboard` | **대시보드 화면 전체 데이터** |
| GET | `/api/devices/:id/history` | **충전 이력 + 요약 통계** |
| GET | `/api/devices/:id/sessions` | 충전 세션 목록 |
| GET | `/api/devices/:id/readings` | 기간별 센서 기록 (그래프용) |
| GET | `/api/devices/:id/events` | 위험 이벤트 이력 |

**핵심 동작 6가지**

1. **`requireDeviceAccess` 미들웨어**
   `:id` 자리에 **시리얼 번호(CS-0042)와 내부 숫자 id 둘 다** 쓸 수 있습니다.
   화면은 시리얼을 기기 코드로 쓰기 때문입니다. 동시에 "이 기기가 내 기기인지"도 검사해서,
   **남의 기기 데이터는 절대 조회되지 않습니다** (아니면 404).

2. **기기 등록 시 API 키 발급**
   `crypto.randomBytes(24)` 로 랜덤 키를 만들어 **응답에 딱 한 번만** 내려주고,
   DB에는 SHA-256 해시만 저장합니다. 트랜잭션으로 처리해 중간에 실패하면 전부 되돌립니다.
   이전에 등록 해제된 같은 시리얼이 있으면 **기존 기기를 되살려** 충전 이력을 잇습니다.

3. **대시보드 조립 (`/dashboard`)**
   화면이 필요로 하는 값을 서버가 전부 계산해서 한 번에 내려줍니다.
   - **완료 예정 시각**: 최근 60개 기록의 충전량 변화 속도(%/분)를 구해
     `(목표 - 현재) ÷ 속도` 로 남은 시간을 역산
   - **센서 3종**: `{ value, unit, status, progress }` 형태 (progress는 게이지 바 %)
   - **배터리 건강도 / 추천 신뢰도**: 최근 완료 세션 10건에서 추정 (아래 6-3 참고)
   - **긴급 알림**: 미확인 위험·경고 알림 개수와 최신 1건

4. **모니터링 그래프 (`/monitoring`)**
   프론트엔드의 `src/api/monitoringApi.js` 가 부르는 엔드포인트로, 응답 형태를 그쪽에 정확히 맞췄습니다.
   구간(`range`)에 따라 **시간 버킷 평균**을 내어 그래프의 점 개수를 일정하게 유지합니다.

   | range | 버킷 | 점 개수 | 라벨 |
   |---|---|---|---|
   | `realtime` | 15초 | 24 | `"01:57"` |
   | `hour` | 2분 | 30 | `"01:56"` |
   | `today` | 1시간 | 24 (0시부터) | `"01:00"` |
   | `week` | 6시간 | 28 | `"7/27"` |

   응답은 `{ deviceId, range, updatedAt, measurements: [...] }` 이고,
   각 점은 `{ timestamp, label, temperature, current, voltage }` 입니다.
   (필드 이름이 DB의 `current_a`·`voltage_v` 가 아니라 화면이 쓰는 `current`·`voltage` 입니다.)

5. **기기별 안전 설정 (`PATCH`)**
   설정 화면에서 바꾼 값을 기기마다 따로 저장합니다. 특히 **온도 차단 기준은 저장 즉시 위험 판단에 반영**됩니다.

   | 필드 | 범위 | 설명 |
   |---|---|---|
   | `targetPercent` | 50~100 | 충전 모드의 목표 충전량 |
   | `cutoffTemperature` | 40~65 | 온도 차단 기준 |
   | `automaticCutoff` | true/false | 끄면 위험이어도 강제 차단 안 함 |
   | `coolingFan` | true/false | 주의 단계 이상에서 냉각팬 작동 |
   | `longChargeWarningHours` | 0~48 | 장시간 충전 경고 기준 (0이면 사용 안 함) |

   범위를 벗어난 값은 400으로 거부합니다.

6. **기기 등록 해제 (`DELETE`)**
   기기를 **삭제하지 않고** 나와의 연결만 끊습니다. 마지막 보호자였다면 `is_active = false` 로 바꿔
   더 이상 데이터를 받지 않게 합니다. **충전 이력은 그대로 보존**되고, 같은 시리얼로 다시 등록하면 되살아납니다.

#### `sessions.routes.js` (33줄) — 세션별 센서 기록
`GET /api/sessions/:id/readings` — 특정 충전 세션의 센서 기록 전체를 시간순으로 반환합니다.
조회 전에 `user_devices` 조인으로 **내 기기의 세션인지 반드시 확인**합니다.

#### `ingest.routes.js` (14줄) — ESP32 수신 창구
`POST /api/ingest/readings` 하나뿐인 아주 얇은 파일입니다.
`deviceAuth` 로 기기를 인증한 뒤 실제 처리는 `ingest.service.js` 에 넘깁니다.

#### `ingest.service.js` (183줄) — 수신 처리 핵심
이 시스템에서 **가장 중요한 파일**입니다. `handleReading()` 하나가 전체 흐름을 담당합니다.

내부 보조 함수들:

| 함수 | 하는 일 |
|---|---|
| `getOpenSession` | 아직 안 끝난 충전 세션 찾기 |
| `openSession` | 새 충전 세션 시작 |
| `closeSession` | 세션 종료 + 최고 온도·최대 전류 집계 |
| `endBatteryPercent` | 종료 시점 충전량 (완료 알림 문구용) |
| `getPreviousReading` | 30초 이전 기록 (온도 상승 속도 계산용) |
| `getCurrentLevel` | 직전 위험 단계 (중복 알림 방지용) |
| `upsertStatus` | 현재 상태 갱신 (기기당 1행) |
| `wasOffline` | 10분 이상 끊겼었는지 (연결 알림용) |
| `checkLongCharge` | 기준 시간 초과 시 "충전 시간 초과" 경고 (세션당 1회) |

**ESP32 에 돌려주는 응답**

```json
{ "level": "danger", "cause": "overheat", "session_id": "20", "cutoff": true, "fan": false }
```

| 필드 | 펌웨어가 할 일 |
|---|---|
| `level` | 상태 표시 (정상/주의/경고/위험) |
| `cutoff` | `true` 면 충전 릴레이 차단 |
| `fan` | `true` 면 냉각팬 작동 |

`cutoff` 과 `fan` 은 **기기별 설정을 반영**합니다. 자동 차단을 꺼두면 위험이어도 `cutoff: false`,
냉각팬을 꺼두면 주의 단계여도 `fan: false` 가 됩니다.

**설계상 중요한 판단 5가지**

1. **세션 자동 관리** — ESP32는 `charging: true/false` 만 보내면 됩니다.
   서버가 알아서 세션을 열고 닫으므로 펌웨어가 단순해집니다.

2. **중복 알림 방지** — 위험 단계가 **올라간 순간에만** 알림을 냅니다.
   `severity(현재) > severity(직전)` 조건 덕분에, 위험 상태가 10초마다 반복돼도 알림은 한 번만 갑니다.

3. **알림 실패가 안전 기능을 막지 않음** — 알림 발송을 `try/catch` 로 감쌌습니다.
   FCM 서버 장애로 알림이 실패해도 **센서 저장과 차단 응답은 정상 동작**합니다.

4. **값이 없는 수신은 이전 값 유지** — `upsertStatus` 의 `COALESCE`.
   충전 종료 신호(`{charging:false}`)에는 센서값이 없는데, 그대로 덮으면 대시보드가 빈칸이 됩니다.
   그래서 값이 없으면 마지막으로 알던 값을 유지합니다.

5. **기기별 설정을 판단에 반영** — 설정 화면에서 정한 온도 차단 기준을 `assess()` 에 넘겨
   기기마다 다른 기준으로 판단합니다. 자동 차단·냉각팬 설정은 응답의 `cutoff`·`fan` 에 반영됩니다.

#### `risk.service.js` (57줄) — 위험 판단
센서값을 받아 `{ level, cause }` 를 돌려주는 순수 함수 `assess()` 입니다.
DB를 건드리지 않아 테스트하기 쉽습니다.

판단 순서 (위에서부터 먼저 확인):

| 순서 | 조건 | 결과 |
|---|---|---|
| 1 | 연기 감지 | **위험** (`smoke`) |
| 2 | 온도 ≥ 50℃ | **위험** (`overheat`) |
| 3 | 온도 ≥ 45℃ **그리고** (전류 ≥ 4A 또는 전압 ≥ 14.5V) | **경고** |
| 4 | 온도 상승 속도 ≥ 2℃/분 | **주의** (`temp_rise`) |
| 5 | 온도 ≥ 40℃ | **주의** (`temp_high`) |
| 6 | 전류 ≥ 4A | **주의** (`current_change`) |
| 7 | 그 외 | **정상** |

`severity()` 는 단계를 숫자로 바꿔 비교할 수 있게 합니다 (정상 0 → 위험 3).

임계값은 두 단계로 정해집니다.
1. `.env` 의 기본값 (`TEMP_DANGER` 등) — 서버 전체에 적용
2. **기기별 설정** — `assess(reading, prev, { tempDanger: 45 })` 처럼 덮어쓰기.
   설정 화면에서 "온도 차단 기준"을 45℃로 바꾸면 그 기기만 45℃에서 위험 판정합니다.

#### `presenters.js` (195줄) — 화면용 형태 변환
DB에서 꺼낸 값을 **화면이 그대로 쓸 수 있는 형태**로 바꿔주는 함수 모음입니다.
날짜 계산·단위 변환을 서버에서 처리해, 화면 코드가 단순해집니다.

| 함수 | 변환 예시 |
|---|---|
| `estimateSoc` | `12.4` → `63` (전압 → 충전량 %) |
| `relTime` | 3분 전 시각 → `"3분 전"` |
| `dateGroup` | 오늘 날짜 → `"오늘"`, 그 외 → `"7/22"` |
| `fullDate` | → `"2026년 7월 24일"` |
| `hhmm` | → `"22:02"` |
| `durationText` | `258` → `"4시간 18분"` |
| `deviceStatus` | 마지막 수신 시각 → `charging`/`connected`/`standby`/`offline` |
| `sensorBlock` | `32.5` → `{ value:32.5, unit:"°C", status:"정상", progress:65 }` |
| `toDevice` | 기기 행 → 기기 카드 형태 |
| `toHistoryItem` | 세션 행 → 이력 표 한 줄 |
| `toNotification` | 알림 행 → 알림 카드 형태 |
| `estimateBatteryHealth` | 최근 이력 → 배터리 건강도 % |
| `recommendationConfidence` | 세션 개수 → 추천 신뢰도 % |

> **`estimateSoc` 계산식**: `(전압 − 11.8) ÷ (12.75 − 11.8) × 100`
> 12V 계열 배터리 기준이며, 화면 표시 기준(전압 14.5V 미만)과 맞춰져 있습니다.
> `.env` 의 `SOC_MIN_VOLT` / `SOC_MAX_VOLT` 로 조정 가능합니다.

#### `notifications.routes.js` (76줄) — 알림 센터

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notifications` | 알림 목록 (`?unread=true`, `?deviceId=`, `?limit=`) |
| PATCH | `/api/notifications/:id/read` | 알림 하나 읽음 처리 |
| POST | `/api/notifications/read-all` | 전체 읽음 처리 |

위험 알림과 일반 알림(충전 완료·기기 연결)을 **함께** 조회합니다.
`LEFT JOIN devices` 라서 기기가 삭제돼도 알림은 남습니다.
필터 조건은 SQL을 문자열로 이어 붙이지 않고 **파라미터 번호로 안전하게 조립**합니다 (SQL 인젝션 방지).

#### `push.routes.js` (37줄) — FCM 푸시 토큰

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/push/status` | 서버에 FCM이 설정돼 있는지 |
| POST | `/api/push/register` | 브라우저에서 받은 푸시 토큰 등록 |
| POST | `/api/push/unregister` | 토큰 삭제 (알림 끄기) |

같은 토큰을 다시 등록하면 `ON CONFLICT` 로 갱신만 합니다(중복 저장 방지).
어느 브라우저인지 알 수 있게 `user-agent` 도 함께 저장합니다.

---

### 4-3. `database/` — 데이터베이스

#### `db.js` (10줄) — 연결 풀
PostgreSQL 연결 풀(`pg.Pool`)을 만들어 앱 전체에서 공유합니다.
풀을 쓰면 요청마다 새로 접속하지 않고 **연결을 재사용**해 훨씬 빠릅니다.
`.env` 경로를 `__dirname` 기준으로 읽어, 어느 위치에서 실행해도 동작합니다.

#### `migrate.js` (48줄) — 마이그레이션 실행기
`migrations/` 폴더의 `.sql` 파일을 **번호 순서대로** 실행합니다.

- `schema_migrations` 테이블에 **이미 적용한 파일 이름을 기록**해 두고, 다음 실행 때는 건너뜁니다(`skip`).
- 각 파일을 **트랜잭션**으로 실행해, 중간에 실패하면 그 파일의 변경을 전부 되돌립니다.
- 그래서 `npm run migrate` 를 몇 번 실행해도 안전합니다.

#### `seed-demo.js` (49줄) — 시연용 샘플 데이터
발표·개발용으로 **90분짜리 가짜 충전 세션**을 만듭니다.
`node database/seed-demo.js 1` (숫자는 기기 id)

실제 배터리 충전 곡선을 흉내 냅니다:
- 온도: 28℃에서 시작해 43℃ 부근으로 서서히 포화 (지수 함수)
- 전류: 1.2A 정전류 유지 후 60분부터 감소 (CC-CV 충전 곡선)
- 전압: 11.9V → 12.7V 완만 상승 (충전량 약 25% → 95%)

#### `migrations/001_init.sql` — 기본 스키마
`risk_level` ENUM 타입과 테이블 7개를 만듭니다.
`users`, `devices`, `user_devices`, `charging_sessions`, `sensor_readings`, `risk_events`, `notifications`, `device_status`

#### `migrations/002_push_tokens.sql` — 푸시 토큰
`push_tokens` 테이블. 한 사람이 여러 브라우저에서 알림을 받을 수 있습니다.

#### `migrations/003_frontend_fields.sql` — 화면용 필드
- `users.username` — 아이디 로그인용 (부분 유니크 인덱스)
- `user_devices.is_favorite` — 즐겨찾기 (보호자마다 다르므로 연결 테이블에)
- `devices.firmware_version`, `devices.target_percent` — 펌웨어 표시, 목표 충전량
- `notifications.read_at` — 읽음 상태

#### `migrations/004_notification_types.sql` — 알림 유형
알림을 위험 이벤트에서 **독립**시킵니다.
- `event_id` 를 NULL 허용으로 변경 (충전 완료·기기 연결 알림은 위험 이벤트가 없음)
- `kind`(danger/warning/success/info), `title`, `device_id`, `occurred_at` 추가
- 기존 알림들에 새 필드를 채워 넣는 `UPDATE` 포함
- `user_devices.relation` — 보호자 관계 ("딸", "아들" 등)

#### `migrations/005_device_settings.sql` — 기기별 안전 설정
설정 화면의 값을 기기마다 저장할 수 있게 `devices` 에 컬럼 4개를 추가합니다.
전에는 `.env` 전역값이라 기기별로 다르게 둘 수 없었습니다.

- `cutoff_temperature` — 온도 차단 기준 (40~65, 기본 50)
- `auto_cutoff_enabled` — 자동 차단 사용 여부 (기본 true)
- `cooling_fan_enabled` — 냉각팬 자동 작동 (기본 true)
- `long_charge_warning_hours` — 장시간 충전 경고 기준 (0~48, 기본 12)

각 컬럼에 `CHECK` 제약을 걸어 **DB 차원에서도 범위 밖 값이 들어가지 않게** 했습니다.

---

### 4-4. `notification/` — 보호자 알림

#### `firebase.js` (54줄) — FCM 초기화
Firebase Admin SDK를 초기화합니다. 서비스 계정 키를 두 가지 방법으로 읽습니다.

1. `FIREBASE_SERVICE_ACCOUNT` — JSON 문자열 또는 base64 (**배포 환경용**)
2. `FIREBASE_SERVICE_ACCOUNT_PATH` — 파일 경로 (**로컬 개발용**)

둘 다 없으면 `null` 을 반환하고, 알림은 DB에만 기록됩니다.
**설정이 없어도 서버가 죽지 않게** 만든 것이 핵심입니다.
초기화는 처음 필요할 때 한 번만 실행됩니다(지연 초기화).

#### `notification.service.js` (133줄) — 알림 생성·발송

**`createNotice(deviceId, kind, title, message)`**
위험이 아닌 일반 알림을 만듭니다. 푸시는 보내지 않고 알림 센터에만 표시합니다.
- 충전 정상 종료 → `success` "충전 완료"
- 10분 이상 끊겼다 재연결 → `info` "기기 연결됨"

**`notifyGuardians(eventId, deviceId, level, cause)`**
위험·경고 발생 시 5단계로 처리합니다.

1. **DB에 먼저 기록** — FCM이 실패해도 앱에서 알림을 볼 수 있게
2. FCM 미설정이면 여기서 종료 (개발 환경)
3. 보호자들의 푸시 토큰으로 발송
4. **발송 결과를 알림 이력에 반영** (`sent` / `failed` / `pending`)
5. **만료된 토큰 자동 삭제**

> **데이터 전용 메시지를 쓰는 이유**
> `notification` 페이로드 대신 `data` 페이로드로 보냅니다.
> 브라우저마다 자동 표시 동작이 달라서, 서비스워커와 페이지에서 **직접 표시**하는 편이 일관됩니다.

---

### 4-5. 설정·문서 파일

#### `package.json`
| 스크립트 | 명령 | 용도 |
|---|---|---|
| `npm start` | `node server.js` | 배포용 실행 |
| `npm run dev` | `nodemon server.js` | 개발용 (코드 수정 시 자동 재시작) |
| `npm run migrate` | `node database/migrate.js` | DB 스키마 적용 |
| `npm run build:frontend` | frontend 설치 + 빌드 | 대시보드 빌드 |

**의존성 6개**: `express`(웹 서버), `pg`(PostgreSQL), `bcryptjs`(비밀번호 해시),
`jsonwebtoken`(JWT), `dotenv`(환경변수), `firebase-admin`(FCM)
**개발 의존성**: `nodemon`

#### `package-lock.json`
의존성의 정확한 버전을 고정합니다. 팀원 모두 **똑같은 버전**을 설치하게 해줍니다. 직접 수정하지 않습니다.

#### `.env` / `.env.example`
`.env` 는 실제 비밀값이라 **저장소에 올라가지 않습니다**. `.env.example` 은 어떤 값이 필요한지 알려주는 견본입니다.

| 변수 | 용도 |
|---|---|
| `DATABASE_URL` | Supabase(PostgreSQL) 연결 문자열 |
| `JWT_SECRET` | 로그인 토큰 서명 키 |
| `PORT` | 서버 포트 (기본 8000 — 프론트엔드 기본 API 주소와 맞춤) |
| `CORS_ORIGINS` | 교차 출처 호출을 허용할 주소 (쉼표 구분) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | FCM 키 파일 경로 |
| `TEMP_DANGER` 등 | 위험 판단 임계값 |
| `SOC_MIN_VOLT` / `SOC_MAX_VOLT` | 충전량 추정 전압 범위 |
| `LATEST_FIRMWARE_VERSION` | 최신 펌웨어 버전 |

#### `firebase-service-account.json`
Firebase 관리자 권한 키입니다. **절대 저장소에 올리면 안 되며** `.gitignore` 에 등록되어 있습니다.

#### `render.yaml`
Render 배포 설정입니다. 저장소를 연결하면 이 파일을 읽어 서비스를 자동 구성합니다.
비밀값 3개는 `sync: false` 로 두어 **저장소에 저장되지 않고** 배포 시 직접 입력합니다.

#### `README.md` / `DEPLOY.md`
백엔드 사용 설명서와 배포 가이드입니다.

#### `ChargeSafe_프론트엔드_연동_가이드.md`
프론트엔드 담당이 보는 문서입니다. 목 데이터를 실제 API 호출로 바꾸는 절차를
화면별 응답 형태·코드 예시와 함께 정리했습니다. 새 API(기기 검색, 보호자 공유,
계정 복구, 펌웨어 업데이트)를 쓰는 방법도 여기 있습니다.

#### `.gitignore` (저장소 루트)
`node_modules/`, `.env`, `firebase-service-account.json`, `.claude/`, `frontend/` 를 제외합니다.

---

## 5. 데이터베이스 구조 (테이블 12개)

```
users (보호자 계정)
  └─ user_devices (누가 어느 기기를 보는지) ─┐
                                            │
devices (도킹스테이션) ─────────────────────┤
  ├─ device_status (현재 상태, 기기당 1행)   │
  ├─ device_invites (보호자 초대 코드)       │
  └─ charging_sessions (충전 1회 = 1행)      │
        ├─ sensor_readings (센서 기록, 계속 쌓임)
        └─ risk_events (위험 발생 기록)
              └─ notifications (보호자 알림) ─┘
users ─┘
  ├─ push_tokens (브라우저 푸시 토큰)
  ├─ password_resets (비밀번호 재설정 토큰)
  └─ user_settings (계정별 설정, 계정당 1행)
```

| 테이블 | 역할 | 주요 컬럼 |
|---|---|---|
| `users` | 보호자 계정 | email, **username**, password_hash, name, phone, role |
| `devices` | 도킹스테이션 | serial_number, api_key_hash, name, location, is_active, **firmware_version**, **firmware_update_requested**, **pairing_until**, **target_percent**, **cutoff_temperature**, **auto_cutoff_enabled**, **cooling_fan_enabled**, **long_charge_warning_hours** |
| `user_devices` | 보호자 ↔ 기기 연결 (N:M) | user_id, device_id, notify, **is_favorite**, **relation**, **created_at**(소유자 판별) |
| `device_status` | 현재 상태 (기기당 1행) | is_charging, level, temperature, current_a, voltage_v, smoke, last_seen_at |
| `charging_sessions` | 충전 1회 | started_at, ended_at, end_reason, max_temp, max_current, auto_cutoff, cutoff_cause |
| `sensor_readings` | 센서 기록 (고빈도) | recorded_at, temperature, current_a, voltage_v, smoke, level |
| `risk_events` | 위험 발생 기록 | level, cause, detail(JSONB), occurred_at |
| `notifications` | 보호자 알림 | **kind**, **title**, message, status, **read_at**, **occurred_at** |
| `push_tokens` | 푸시 토큰 | token, user_agent, last_used_at |
| `user_settings` | 계정별 설정 (계정당 1행) | push_notifications, guardian_notifications, notification_sound, voice_guide, large_text, theme_mode |
| `device_invites` | 보호자 초대 코드 | code(8자), device_id, relation, expires_at, used_by, used_at |
| `password_resets` | 비밀번호 재설정 토큰 | token_hash, user_id, expires_at, used_at |

**설계 포인트**

- **`sensor_readings` 와 `charging_sessions` 분리** — 센서 기록은 초 단위로 쌓이지만
  이력 화면은 세션 요약만 보면 되므로, 나눠 두면 조회가 가볍습니다.
- **`device_status` 별도 테이블** — 대시보드가 매번 수만 건의 센서 기록을 뒤지지 않고
  기기당 1행만 읽으면 됩니다.
- **`risk_events.detail` 은 JSONB** — 위험 판단 근거(당시 센서값)를 스키마 변경 없이 저장합니다.
- **모든 시각은 `TIMESTAMPTZ`** — UTC로 저장하고 화면에서 한국 시간으로 변환합니다.
- **`gas_ppm` 컬럼** — 화면에서 가스를 쓰지 않아 코드에서는 제외했지만,
  하드웨어(MQ-2) 데이터 보존을 위해 컬럼은 남겨 두었습니다.
- **토큰은 해시로만 저장** — `devices.api_key_hash`, `password_resets.token_hash` 모두
  원문을 저장하지 않습니다. DB가 통째로 유출돼도 그 값으로는 인증할 수 없습니다.
- **`user_devices.created_at` 이 소유자 기준** — 가장 먼저 참여한 보호자가 소유자이며,
  초대 코드 발급과 다른 보호자 내보내기 권한을 가집니다.

---

## 6. API 전체 목록

### 6-1. 보호자용 (JWT 필요 — `Authorization: Bearer <토큰>`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 (`signupType` = `user`/`guardian`) |
| POST | `/api/auth/login` | 로그인 → 토큰 발급 |
| POST | `/api/auth/find-id` | 아이디 찾기 (이름 + 전화번호) |
| POST | `/api/auth/reset-password/request` | 비밀번호 재설정 ① 본인 확인 → 토큰 |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 ② 새 비밀번호 저장 |
| GET | `/api/me` | 내 프로필·보호자·대표 기기 |
| PATCH | `/api/me` | 프로필 수정 (이름·전화번호·이메일) |
| PATCH | `/api/me/password` | 비밀번호 변경 (현재 비밀번호 확인) |
| GET | `/api/me/settings` | 설정 화면 값 전체 |
| PATCH | `/api/me/settings` | 설정 저장 (보낸 항목만 변경) |
| GET | `/api/devices` | 기기 목록 |
| GET | `/api/devices/discoverable` | 등록 대기 중인 기기 (주변 기기 검색) |
| POST | `/api/devices` | 기기 등록 / 미리 등록(`provisionOnly`) |
| PATCH | `/api/devices/:id` | 기기 설정 수정 |
| DELETE | `/api/devices/:id` | 기기 등록 해제 |
| GET | `/api/devices/:id/members` | 함께 보는 보호자 목록 |
| POST | `/api/devices/:id/invites` | 보호자 초대 코드 발급 (소유자만) |
| GET · DELETE | `/api/devices/:id/invites[/:code]` | 초대 코드 목록·취소 (소유자만) |
| POST | `/api/devices/invites/:code` | 초대 코드로 참여 |
| PATCH · DELETE | `/api/devices/:id/members/:userId` | 보호자 관계 수정·내보내기 |
| POST | `/api/devices/:id/firmware-update` | 펌웨어 업데이트 요청 |
| GET | `/api/devices/:id/dashboard` | 대시보드 전체 |
| GET | `/api/devices/:id/history` | 충전 이력 + 요약 |
| GET | `/api/devices/:id/monitoring` | 모니터링 그래프 (`?range=realtime\|hour\|today\|week`) |
| GET | `/api/devices/:id/status` | 현재 상태 (원본) |
| GET | `/api/devices/:id/sessions` | 충전 세션 목록 |
| GET | `/api/devices/:id/readings` | 기간별 센서 기록 |
| GET | `/api/devices/:id/events` | 위험 이벤트 이력 |
| GET | `/api/sessions/:id/readings` | 세션별 센서 기록 |
| GET | `/api/notifications` | 알림 목록 |
| PATCH | `/api/notifications/:id/read` | 알림 읽음 |
| POST | `/api/notifications/read-all` | 전체 읽음 |
| GET | `/api/push/status` | FCM 설정 여부 |
| POST | `/api/push/register` | 푸시 토큰 등록 |
| POST | `/api/push/unregister` | 푸시 토큰 해제 |

> `:id` 는 **시리얼 번호와 내부 숫자 id 둘 다** 사용 가능합니다.

### 6-2. 기기용 (API 키 필요 — `X-API-Key: csk_...`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/ingest/readings` | 센서 데이터 전송 |

전송 예시:
```bash
curl -X POST https://chargesafe-zc39.onrender.com/api/ingest/readings \
  -H "X-API-Key: csk_발급받은키" \
  -H "Content-Type: application/json" \
  -d '{"charging": true, "temperature": 32.0, "current_a": 1.2, "voltage_v": 12.4, "smoke": false}'
```

응답의 `level`(`normal`/`caution`/`warning`/`danger`)을 보고 펌웨어가 냉각팬·차단을 결정합니다.

### 6-3. 인증 불필요

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/health` | 서버 생존 확인 |
| GET | `/` | 대시보드 또는 API 안내 |

---

## 7. 기준값 (12V 계열 배터리)

화면에 표시되는 기준과 같은 값을 씁니다.

| 항목 | 주의 | 경고 | 위험 (자동 차단) |
|---|---|---|---|
| 온도 | 40℃ | 45℃ | **50℃** |
| 전류 | 4A 이상 | — | — |
| 전압 | — | 14.5V 이상 | — |
| 연기 | — | — | **감지 즉시** |

충전량(%)은 전압으로 추정합니다: **11.8V = 0%, 12.75V = 100%**

### 추정 지표 (참고용)

아래 두 값은 전용 계측기가 아니라 **최근 충전 이력에서 계산한 근사치**입니다.

- **배터리 건강도** = (목표 충전량 대비 실제 도달률 × 100) − (고온 45℃ 이상 노출 세션 비율 × 15)
  → 정확한 SoH 측정(쿨롱 카운팅·임피던스)이 아니므로 참고용입니다.
- **추천 신뢰도** = `min(95, 50 + 분석한 세션 수 × 9)`
  → 분석에 쓴 완료 세션이 많을수록 높아지고, 5회 이상이면 최대 95%입니다.

---

## 8. 실행 방법

### 처음 설정할 때

```bash
cd backend
npm install                 # 의존성 설치
cp .env.example .env        # 환경변수 파일 만들기
# .env 를 열어 DATABASE_URL, JWT_SECRET 입력
npm run migrate             # DB 스키마 생성
```

### 매번 실행할 때

```bash
cd backend
npm run dev                 # 개발 서버 (코드 수정 시 자동 재시작)
```

`http://localhost:8000/health` 가 `{"status":"ok"}` 를 반환하면 정상입니다.
서버를 끄려면 터미널에서 `Ctrl + C` 를 누릅니다.

### 시연용 데이터 만들기

```bash
node database/seed-demo.js 1     # 1 = 기기 id
```

---

## 9. 왜 이렇게 만들었나 (주요 설계 결정)

| 결정 | 이유 |
|---|---|
| 인증을 JWT와 API 키로 분리 | 사람(보호자)과 기계(ESP32)는 인증 방식이 달라야 합니다. 기기는 로그인 화면을 쓸 수 없습니다. |
| API 키를 해시로만 저장 | DB가 유출돼도 원본 키를 알 수 없습니다. 비밀번호와 같은 원리입니다. |
| 위험 판단을 서버에서도 수행 | 펌웨어도 자체 판단해 즉시 차단하지만, 서버가 한 번 더 판단해 기록과 알림을 담당합니다. 통신이 끊겨도 안전 기능이 동작합니다. |
| 세션 관리를 서버가 담당 | ESP32는 `charging` 값만 보내면 되므로 펌웨어가 단순해집니다. |
| 표시 문자열을 서버에서 생성 | "3분 전", "4시간 18분" 같은 변환을 서버가 처리해 화면 코드가 단순해지고, 여러 화면에서 표기가 일관됩니다. |
| 알림 실패를 격리 | 알림이 실패해도 센서 저장·차단 응답은 정상 동작해야 합니다. 안전이 우선입니다. |
| 기기 삭제 대신 연결 해제 | 실수로 지워도 충전 이력이 남아 있고, 같은 시리얼로 다시 등록하면 이어집니다. |
| 마이그레이션으로 스키마 관리 | 팀원 누구나 `npm run migrate` 한 번으로 같은 DB 구조를 만들 수 있고, 순서와 적용 여부가 기록됩니다. |
| 추정값을 임의로 만들지 않음 | 배터리 건강도 등은 계산 근거를 코드와 문서에 명시했습니다. 안전 관련 제품이라 근거 없는 숫자는 위험합니다. |

---

## 10. 현재 상태와 남은 작업

### 완료

- PostgreSQL(Supabase) 스키마 12개 테이블, 마이그레이션 8개
- 보호자 인증(JWT) / 기기 인증(API 키) / CORS
- 센서 수신 → 위험 판단 → 저장 → 차단 → 알림 전체 흐름
- 대시보드·모니터링·충전이력·알림센터·기기관리·설정 6개 화면용 API
- 기기별 안전·충전 설정 + 계정별 설정 저장, 위험 판단에 즉시 반영
- 기기 검색·페어링 / 보호자 공유(초대 코드) / 계정 복구 / 펌웨어 업데이트 지시
- Render 배포 (`https://chargesafe-zc39.onrender.com`)

### 남은 작업

- **배포 반영** — DB 마이그레이션은 Supabase에 적용을 마쳤지만, 새 코드(`/api/me/settings`,
  기기 검색·보호자 공유·계정 복구 등)는 아직 커밋·푸시 전입니다.
  Render에 올라간 서버는 이전 버전으로 동작합니다.
- **ESP32 펌웨어 연동** — 실제 센서에서 `POST /api/ingest/readings` 호출
  (현재는 테스트 데이터로만 검증된 상태). 응답의 `firmware.update` 처리와
  `firmware_version` 전송도 함께 구현해야 합니다.
- **계정 복구의 본인 확인 수단** — 메일·문자 발송 수단이 없어 이름 + 전화번호로만 확인하고
  재설정 토큰을 응답으로 바로 돌려줍니다. 실제 서비스로 쓰려면 메일·문자 발송으로 바꿔야 합니다.
- 센서 데이터 장기 보존 정책 (예: 30일 후 1분 평균으로 압축)
- **FCM 푸시 발송 중단 상태** — 프론트엔드에 토큰 발급 코드가 없어 `push_tokens` 가 비어 있습니다.
  백엔드 발송 코드는 그대로 있으며, 알림 센터 기록은 정상 동작합니다.

### 프론트엔드 쪽에서 해야 할 일

현재 프론트엔드는 **목 데이터로만 동작**합니다. 실제 fetch 는 `src/api/monitoringApi.js`
하나뿐이고 그마저 `USE_MOCK_DATA = true` 로 꺼져 있습니다. 순서대로 하면 됩니다.

> **작업 절차와 화면별 코드 예시는 `ChargeSafe_프론트엔드_연동_가이드.md` 에 따로 정리했습니다.**
> 프론트엔드 담당은 그 문서를 보면 되고, 여기서는 어느 화면이 어느 API 를 쓰는지만 정리합니다.

1. **로그인을 실제 호출로 교체하고 토큰 저장**
   `LoginForm.jsx` 는 입력값을 `console.log` 한 뒤 곧바로 화면을 넘길 뿐 서버를 부르지 않습니다.
   `App.jsx` 는 로그아웃에서 `localStorage.removeItem("accessToken")` 을 하지만 저장하는 곳이 없습니다.
2. **모든 요청에 `Authorization: Bearer <token>` 헤더 붙이기**
   기기 데이터는 로그인한 보호자만 볼 수 있어야 하므로(다른 사람 기기가 노출되면 안 됨)
   백엔드가 토큰을 요구합니다. 지금은 헤더가 없어 목 데이터를 끄면 전부 **401** 입니다.
3. **목 데이터 끄기** — `USE_MOCK_DATA` 를 `false` 로.
   API 기본 주소가 `http://localhost:8000` 이고 백엔드도 8000이라 로컬은 그대로 동작합니다.
   (분리 배포 시에는 프론트 `.env` 의 `VITE_API_BASE_URL` — 빌드 시점에 값이 박힙니다.)
4. **나머지 화면도 API 로 교체**
   백엔드 응답은 `data/mock*.js` 의 필드명에 맞춰 두었으므로 값을 바꿔 끼우는 수준입니다.

| 화면 | 엔드포인트 |
|---|---|
| 대시보드 | `GET /api/devices/:id/dashboard` |
| 모니터링 | `GET /api/devices/:id/monitoring?range=` |
| 충전 이력 | `GET /api/devices/:id/history` |
| 알림 센터 | `GET /api/notifications`, `PATCH /:id/read`, `POST /read-all` |
| 기기 관리 | `GET·POST /api/devices`, `PATCH·DELETE /api/devices/:id` |
| 기기 추가 (`AddDeviceModal`) | `GET /api/devices/discoverable` → `POST /api/devices { serial_number }` |
| 설정 | `GET·PATCH /api/me/settings` |
| 아이디 찾기·비밀번호 재설정 | `POST /api/auth/find-id`, `POST /api/auth/reset-password[/request]` |
| 공통(헤더·사이드바) | `GET /api/me` |

**백엔드 API 는 있으나 화면이 없는 것** — 프론트에 UI 를 만들면 바로 붙습니다

| 기능 | 엔드포인트 |
|---|---|
| 보호자 공유(초대 코드 발급·수락·구성원 관리) | `/api/devices/:id/invites`, `/api/devices/invites/:code`, `/api/devices/:id/members` |
| 펌웨어 업데이트 실행 | `POST /api/devices/:id/firmware-update` |
| 프로필 수정·비밀번호 변경 | `PATCH /api/me`, `PATCH /api/me/password` |

> **전화번호를 먼저 받아야 합니다.** 지금 가입 화면(1단계)은 이름·아이디·비밀번호만 받습니다.
> 아이디 찾기와 비밀번호 재설정은 전화번호로 본인을 확인하므로, 가입 2단계나 프로필 수정
> 화면에서 `PATCH /api/me` 로 전화번호를 채우기 전에는 두 기능이 동작하지 않습니다.

**백엔드가 필요 없는 것**

| 화면 | 상태 |
|---|---|
| 긴급 전화·대응 가이드 | `tel:` 링크로 충분. 보호자 번호는 `GET /api/me` 가 내려줌 |
| 알림음·음성 안내·큰 글씨 | 값은 `/api/me/settings` 에 저장되며, 실제 동작은 화면에서 처리 |

---

## 11. 변경 이력

### 2026-08-09 — 화면에는 있는데 백엔드에 없던 기능 4가지 추가

프론트엔드를 다시 훑어 대응 API 가 없는 항목을 찾아 채웠습니다. (마이그레이션 008)

| # | 기능 | 설계 |
|---|---|---|
| ① | **기기 검색·페어링** | 브라우저는 주변 기기를 스캔할 수 없으므로, 서버가 "지금 켜져 있고 주인이 없는 기기"를 알려준다. 기기가 다시 켜지면 10분간 `GET /api/devices/discoverable` 에 노출되고, 이때 등록하면 **API 키를 새로 만들지 않고** 연결만 한다(기기에 이미 키가 심어져 있으므로) |
| ② | **보호자 공유** | 소유자가 24시간짜리 1회용 초대 코드를 만들고, 받은 사람이 `POST /api/devices/invites/:code` 로 참여. 소유자는 `user_devices.created_at` 이 가장 이른 사람 |
| ③ | **계정 복구** | 아이디 찾기(이름+전화번호) / 비밀번호 재설정 2단계. 토큰은 해시로만 저장하고 30분 만료·1회용. IP 기준 10분 5회 제한 |
| ④ | **펌웨어 업데이트** | 서버가 기기에 접속할 수 없으므로 요청을 표시만 해 두고, 기기가 센서 전송 응답의 `firmware.update` 로 지시를 받아 간다. 최신 버전을 보고하면 표시가 자동 해제됨 |

**함께 고친 것**

- `POST /api/devices` 에 `provisionOnly` 추가 — 내 목록에 넣지 않고 API 키만 발급합니다.
  기기를 만들 때 키를 심어 두는 용도이며, ①의 출발점입니다.
- `PATCH /api/me`(프로필 수정)·`PATCH /api/me/password`(비밀번호 변경) 신설.
  ③이 전화번호를 필요로 하는데 가입 화면이 전화번호를 받지 않기 때문입니다.
- 페어링·펌웨어 처리를 `try/catch` 로 격리 — 부가 기능의 실패가 센서 수신(안전 기능)을
  막지 않도록 했습니다. 알림 발송을 격리해 둔 것과 같은 이유입니다.

**검증** — 실제 DB에 마이그레이션을 적용하고 34개 항목을 HTTP 로 확인한 뒤
테스트 계정·기기를 모두 삭제했습니다(잔여 행 0). 페어링 시간 만료 후 등록 차단,
연결 후 검색 목록에서 제외, 기존 API 키 유지, 초대 코드 재사용 차단, 소유자가 아닌
보호자의 권한 차단(403), 참여 전 기기 존재 은닉(404), 재설정 토큰 재사용 차단까지 포함합니다.

**남은 문제** — 계정 복구의 본인 확인이 이름 + 전화번호뿐이고 재설정 토큰을 응답으로
바로 돌려줍니다. 메일·문자 발송 수단이 생기면 `reset-password/request` 응답에서 토큰을 빼고
그쪽으로 보내야 합니다. 페어링도 10분 창 안에서는 같은 서버를 쓰는 다른 계정이 먼저
가져갈 수 있으므로, 엄격하게 하려면 기기에 페어링 버튼을 두어야 합니다.

### 2026-08-09 — 프론트엔드 전면 교체 대응

프론트엔드가 **TypeScript + shadcn 구조에서 JavaScript + styled-components 구조로 통째로
교체**됐습니다. `lib/api.ts`·`lib/push.ts`·`vite.config.ts`·`firebase-config.js`·
`firebase-messaging-sw.js` 가 모두 사라지고, 실제 API 호출은 `src/api/monitoringApi.js`
하나만 남았습니다.

**다행히 응답 형태는 그대로 맞았습니다.** 백엔드 `presenters.js` 가 화면용 필드명에 맞춰
작성돼 있었는데, 새 프론트의 `data/mock*.js` 가 같은 필드명을 그대로 계승했기 때문입니다.
모니터링·대시보드·기기 목록·알림·이력 전부 수정 없이 붙습니다.

| # | 변경 | 내용 |
|---|---|---|
| ① | **가입 유형 저장** | `POST /api/auth/register` 가 `signupType`(`user`/`guardian`)을 역할로 저장. `admin` 은 목록에 없어 화면에서 관리자 계정을 만들 수 없음. DB에 `users_role_check` 제약 추가 |
| ② | **계정별 설정 API 신설** | `GET·PATCH /api/me/settings`. 마이그레이션 007 의 `user_settings` 테이블. 설정 화면에 기기 선택이 없어 계정 값과 기기 값을 한 응답으로 합침 |
| ③ | **푸시 설정 실동작** | "푸시 알림"을 끈 계정은 FCM 발송 대상에서 제외. 알림 센터 기록은 유지 |
| ④ | **`longChargeWarning` 호환** | 프론트는 스위치(boolean), DB는 시간(숫자). 양쪽 다 받고, 껐다 켜면 이전 시간을 복구(0이었으면 12시간) |

**검증** — 실제 DB에 트랜잭션으로 적용해 20개 항목을 확인하고 전부 롤백했습니다.
가입 유형 반영·권한 상승 차단·부분 수정 시 값 유지·잘못된 값 400·기기 전체 일괄 적용·
기기 단위 수정의 독립성·토큰 없을 때 401 까지 통과했습니다.

**해소된 이전 과제** — 옛 문서에 적혀 있던 "분리 배포를 막는 문제 2곳"(`lib/api.ts` 상대 경로,
`vite.config.ts` 프록시 포트 3000)은 해당 파일들이 사라지면서 함께 없어졌습니다.
새 프론트는 처음부터 `VITE_API_BASE_URL ?? "http://localhost:8000"` 절대 주소 방식입니다.

**남은 문제** — 로그인이 서버를 부르지 않고 토큰도 저장하지 않습니다. 목 데이터를 끄면 전부 401 입니다.

### 2026-07-28 — 프론트엔드 재업데이트 대응

프론트엔드가 65 → 71개 파일로 갱신되며 **모니터링·설정 화면이 새로 구현**되고,
`src/api/monitoringApi.js` 가 추가되어 백엔드가 지켜야 할 계약이 코드로 명시됐습니다.
이에 맞춰 백엔드를 수정했습니다.

| # | 변경 | 내용 |
|---|---|---|
| ① | **모니터링 엔드포인트 신설** | `GET /api/devices/:id/monitoring?range=…`. 프론트가 쓰는 필드명(`current`·`voltage`·`timestamp`·`label`)과 응답 래퍼에 맞춤. 시간 버킷 평균으로 구간별 점 개수 고정 |
| ② | **CORS 추가** | `api/cors.js` 신설. 프론트가 절대 주소로 호출하므로 필수. 허용 목록은 `CORS_ORIGINS` 로 지정 |
| ③ | **기본 포트 3000 → 8000** | 프론트엔드 기본 API 주소와 일치시킴. 배포는 플랫폼이 `PORT` 를 주입하므로 영향 없음 |
| ④ | **기기별 안전 설정** | 마이그레이션 005. 온도 차단 기준·자동 차단·냉각팬·장시간 경고를 기기마다 저장하고 위험 판단에 즉시 반영 |
| ⑤ | **ESP32 응답 확장** | `cutoff`·`fan` 필드 추가 — 펌웨어가 차단·냉각팬을 바로 제어 |
| ⑥ | **장시간 충전 경고** | 기준 시간을 넘기면 "충전 시간 초과" 알림을 세션당 한 번 생성 |

**검증 결과** — 4개 구간 모두 정상 응답, CORS 사전 요청 204·허용되지 않은 출처 차단 확인,
설정 저장 후 45℃ 기준에서 46℃ 데이터가 `danger` 로 판정되는 것까지 확인했습니다.

### 2026-07-27 — 화면 6종 기준 정렬

| # | 변경 | 내용 |
|---|---|---|
| ① | **12V 계열로 통일** | 화면 기준(전압 14.5V 미만·표시값 12.4V)에 맞춰 임계값을 온도 50/45/40℃·전류 4A·전압 14.5V 로 변경. 충전량 추정식도 11.8~12.75V 로 조정 |
| ② | **가스 제외** | 화면에 가스 표시가 없어 위험 판단·API·시드·문서에서 제거. 연기 감지는 유지, `gas_ppm` 컬럼은 하드웨어 데이터 보존용으로 존치 |
| ③ | **알림 4종 지원** | 마이그레이션 004. 알림을 위험 이벤트에서 독립시켜 "충전 완료"(success)·"기기 연결됨"(info) 자동 생성 |
| ④ | **`/api/me` 신설** | 프로필·보호자·대표 기기를 한 번에 반환 |
| ⑤ | **추정 지표 산출** | 배터리 건강도·추천 신뢰도를 충전 이력 기반으로 계산 (근거를 코드 주석과 문서에 명시) |
| ⑥ | **센서값 유지** | 값 없는 수신에도 마지막 센서값을 유지해 대시보드 빈칸 방지 |

### 2026-07-27 (이전) — 프론트엔드 데이터 형태 맞춤

| # | 변경 | 내용 |
|---|---|---|
| ① | **아이디 로그인** | 프론트가 `{ userId, password }` 를 보내므로 아이디·이메일 모두 허용 |
| ② | **기기 목록 형태 변경** | `DeviceRow` 가 쓰는 형태(`battery`·`status`·`firmware`·`isFavorite`)로 반환 |
| ③ | **시리얼로도 접근** | `:id` 에 기기 코드(CS-0042)와 숫자 id 둘 다 허용 |
| ④ | **대시보드·이력 엔드포인트** | 화면이 필요한 값을 서버가 조립해 한 번에 반환 |
| ⑤ | **표시 변환 분리** | `presenters.js` 로 날짜·단위·상태 문자열 변환을 모음 |
| ⑥ | **기기 삭제** | `DELETE /api/devices/:id` — 이력 보존, 같은 시리얼 재등록 시 복구 |
