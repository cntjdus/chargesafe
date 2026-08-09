# ChargeSafe 백엔드 서버 구축 정리

> 전동휠체어 스마트 충전 도킹스테이션 — 백엔드/데이터베이스 담당
> 팀 EngiNEAR · 26-1 캡스톤디자인
> 최종 갱신: 2026-08-07
> 저장소 경로: `Desktop\26-1 캡스톤디자인\Chargesafe_Backend` (브랜치 `backend`)

---

## 목차

1. [전체 구성](#1-전체-구성)
2. [기술 스택](#2-기술-스택)
3. [폴더 구조](#3-폴더-구조)
4. [서버 부팅 흐름](#4-서버-부팅-흐름)
5. [환경 변수](#5-환경-변수)
6. [데이터베이스](#6-데이터베이스)
7. [인증 — 두 종류](#7-인증--두-종류)
8. [API 전체 목록](#8-api-전체-목록)
9. [위험 판단 엔진](#9-위험-판단-엔진)
10. [센서 1건이 처리되는 과정](#10-센서-1건이-처리되는-과정)
11. [푸시 알림](#11-푸시-알림)
12. [보안 조치](#12-보안-조치)
13. [로컬 실행](#13-로컬-실행)
14. [배포 요약](#14-배포-요약)
15. [**서버 배포 전체 — Supabase · Firebase · Render**](#15-서버-배포-전체--supabase--firebase--render)
16. [현재 상태와 남은 일](#16-현재-상태와-남은-일)

---

## 1. 전체 구성

```
[ESP32 도킹스테이션]              [보호자 브라우저]
   센서 5초마다 전송                   대시보드 6화면
        │ X-API-Key                        │ JWT
        ▼                                  ▼
   ┌──────────────────────────────────────────┐
   │   Express 서버 (Node.js)  포트 8000      │
   │   위험 판단 → DB 저장 → 알림 발송        │
   └──────────────────────────────────────────┘
        │                                  │
        ▼                                  ▼
   [Supabase PostgreSQL]            [Firebase FCM]
      서울 리전                       푸시 알림
```

역할이 셋으로 갈립니다.

- **ESP32** — 센서값을 올리고, 서버 응답으로 차단/팬 지시를 받습니다.
- **서버** — 위험을 판단하고, 저장하고, 알림을 보냅니다.
- **보호자 화면** — 조회만 합니다. 데이터를 만들지 않습니다.

이 분리가 중요한 이유는 **안전 기능이 서버에 종속되지 않기 때문**입니다. ESP32는 자체 판단으로도 차단하므로, 서버가 죽어도 화재 방지는 동작합니다.

---

## 2. 기술 스택

| 구분 | 선택 | 이유 |
|---|---|---|
| 런타임 | Node.js 20+ | 팀 학습 곡선이 가장 낮음 |
| 프레임워크 | Express 5 | 라우팅만 필요, 무거운 프레임워크 불필요 |
| DB | PostgreSQL (Supabase) | 무료, 서울 리전, 관리형 |
| DB 드라이버 | `pg` (Pool) | ORM 없이 SQL 직접 — 쿼리 흐름이 그대로 보임 |
| 인증 | `jsonwebtoken` + `bcryptjs` | 표준 조합 |
| 푸시 | `firebase-admin` | 웹 푸시 무료 |
| 배포 | Render (무료 플랜) | GitHub 연동 자동 배포 |

### 의존성 (6개)

```json
"bcryptjs": "^2.4.3",
"dotenv": "^16.4.5",
"express": "^5.1.0",
"firebase-admin": "^14.2.0",
"jsonwebtoken": "^9.0.2",
"pg": "^8.13.1"
```

개발용으로 `nodemon` 하나만 더 있습니다. 의존성을 최소로 유지한 이유는 **캡스톤 기간 내에 팀원 누구나 코드를 읽을 수 있어야** 하기 때문입니다.

---

## 3. 폴더 구조

```
Chargesafe_Backend/
├── README.md              프로젝트 문서
├── .gitignore             .env / 키파일 / frontend/ 제외
└── backend/
    ├── server.js          진입점 (포트 열기만)
    ├── app.js             Express 조립
    ├── package.json
    ├── render.yaml        배포 청사진
    ├── DEPLOY.md          배포 가이드
    ├── .env               비밀값 (커밋 안 됨)
    ├── .env.example       비밀값 없는 견본
    │
    ├── api/               ← 요청 처리
    │   ├── cors.js               CORS 허용 출처
    │   ├── userAuth.js           보호자 인증 (JWT)
    │   ├── deviceAuth.js         기기 인증 (API Key)
    │   ├── auth.routes.js        회원가입/로그인
    │   ├── me.routes.js          내 정보
    │   ├── devices.routes.js     기기 (가장 큼, 18KB)
    │   ├── sessions.routes.js    충전 세션
    │   ├── ingest.routes.js      센서 수신 입구
    │   ├── notifications.routes.js
    │   ├── push.routes.js        FCM 토큰 등록
    │   ├── ingest.service.js     센서 처리 핵심 로직
    │   ├── risk.service.js       위험 판단 엔진
    │   └── presenters.js         DB행 → 화면용 변환
    │
    ├── database/          ← 데이터
    │   ├── db.js                 연결 풀
    │   ├── migrate.js            마이그레이션 실행기
    │   ├── seed-demo.js          데모 데이터
    │   └── migrations/           001~006 (6개)
    │
    └── notification/      ← 알림
        ├── firebase.js
        └── notification.service.js
```

`api / database / notification` 3계층은 팀 루트 README의 구조를 그대로 따른 것입니다.

**라우트와 서비스를 분리한 이유**가 있습니다. `*.routes.js`는 요청/응답 형태만 다루고, `*.service.js`는 판단 로직만 담당합니다. 이렇게 두면 위험 판단 규칙을 바꿀 때 HTTP 코드를 건드릴 필요가 없습니다.

---

## 4. 서버 부팅 흐름

### `backend/server.js` — 포트만 엽니다

```js
const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.warn('경고: JWT_SECRET이 설정되지 않았습니다. .env 파일을 확인하세요.');
}

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`ChargeSafe backend listening on http://localhost:${port}`);
});
```

기본값 **8000**은 프론트엔드가 기대하는 주소(`monitoringApi.js`의 기본값)와 맞춘 값입니다. Render 같은 배포 환경에서는 플랫폼이 주입하는 `PORT`가 우선합니다.

`server.js`와 `app.js`를 나눈 이유는 **테스트 때문**입니다. `app.js`는 포트를 열지 않으므로 테스트에서 그대로 가져다 쓸 수 있습니다.

### `backend/app.js` — 미들웨어를 순서대로 쌓습니다

**순서가 중요합니다.**

| 순서 | 처리 | 설명 |
|---|---|---|
| 1 | CORS | 다른 출처 차단 여부를 가장 먼저 결정 |
| 2 | JSON 파싱 | 요청 본문 해석 |
| 3 | 정적 파일 | `frontend/dist` 있으면 서빙 |
| 4 | `/`, `/health` | 안내 JSON, 헬스체크 |
| 5 | `/api/*` 7개 | 실제 API |
| 6 | SPA 폴백 | 새로고침·딥링크 대응 |
| 7 | 404 → 에러 핸들러 | 마지막 그물 |

**CORS가 맨 앞인 이유** — 차단할 요청이면 뒤 과정을 아예 실행하지 않는 게 맞습니다.

**SPA 폴백이 필요한 이유** — React 앱은 주소가 `/monitoring`이어도 실제 파일이 없습니다. 새로고침하면 404가 나므로, API가 아닌 GET 요청은 전부 `index.html`로 넘겨 React 라우터가 처리하게 합니다.

```js
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  if (!fs.existsSync(DIST_INDEX)) return next();
  res.sendFile(DIST_INDEX);
});
```

---

## 5. 환경 변수

| 변수 | 필수 | 용도 |
|---|:---:|---|
| `DATABASE_URL` | ✅ | Supabase Session Pooler 주소 |
| `JWT_SECRET` | ✅ | 토큰 서명 키 |
| `PORT` | | 기본 8000 |
| `CORS_ORIGINS` | | 미설정 시 localhost 4종만 허용 |
| `FIREBASE_SERVICE_ACCOUNT` | | JSON 문자열 또는 base64 (배포용) |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | | 파일 경로 (로컬용) |
| `TEMP_DANGER` | | 위험 온도, 기본 50℃ |
| `TEMP_WARNING` | | 경고 온도, 기본 45℃ |
| `TEMP_CAUTION` | | 주의 온도, 기본 40℃ |
| `TEMP_RISE_PER_MIN` | | 온도 상승 속도, 기본 2℃/분 |
| `CURRENT_MAX_A` | | 최대 전류, 기본 4A |
| `VOLTAGE_MAX_V` | | 최대 전압, 기본 14.5V |
| `SOC_MIN_VOLT` | | 충전량 0% 전압, 기본 11.8V |
| `SOC_MAX_VOLT` | | 충전량 100% 전압, 기본 12.75V |
| `LATEST_FIRMWARE_VERSION` | | 펌웨어 최신 버전 표시용 |

**필수는 2개뿐**입니다. FCM 키가 없어도 서버는 정상 작동하며, 알림이 DB에만 기록되고 푸시만 안 나갑니다. 이렇게 만든 이유는 **팀원이 자기 PC에서 서버를 켤 때 Firebase 설정 없이도 개발할 수 있게** 하기 위해서입니다.

`.env` 로드는 실행 위치와 무관하게 동작합니다.

```js
require('dotenv').config({ path: path.join(__dirname, '.env') });
```

`cd backend`를 하든 루트에서 실행하든 같은 파일을 읽습니다.

---

## 6. 데이터베이스

### 마이그레이션 8개

| 파일 | 내용 |
|---|---|
| `001_init.sql` | 기본 테이블 8개 + `risk_level` ENUM |
| `002_push_tokens.sql` | FCM 토큰 저장 |
| `003_frontend_fields.sql` | 아이디 로그인, 즐겨찾기, 펌웨어 버전, 목표 충전량 |
| `004_notification_types.sql` | 알림 4종(위험/주의/완료/정보) 분리 |
| `005_device_settings.sql` | 기기별 안전 설정 |
| `006_enable_rls.sql` | **보안** — RLS 적용 + anon 권한 회수 |
| `007_user_settings.sql` | 계정별 설정(알림·접근성·테마) + 가입 유형 제약 |
| `008_pairing_sharing_recovery.sql` | 기기 페어링, 보호자 초대, 비밀번호 재설정, 펌웨어 업데이트 표시 |

### 마이그레이션 실행기 (`database/migrate.js`)

```js
// 1. schema_migrations 테이블 확보
// 2. migrations/*.sql 정렬해서 순회
// 3. 이미 적용된 건 skip
// 4. 파일마다 BEGIN → 실행 → INSERT → COMMIT
//    실패하면 ROLLBACK
```

**파일마다 트랜잭션을 거는 이유** — 중간 파일이 실패해도 그 파일만 통째로 되돌아갑니다. 절반만 적용된 상태가 생기지 않습니다.

**여러 번 실행해도 안전합니다.** 적용 이력을 `schema_migrations`에 남기므로 이미 적용된 파일은 건너뜁니다.

### 테이블 13개

| 테이블 | 역할 |
|---|---|
| `users` | 보호자 계정 |
| `devices` | 도킹스테이션 + 기기별 설정 |
| `user_devices` | 보호자↔기기 연결 (즐겨찾기, 관계, 참여 시각) |
| `charging_sessions` | 충전 1회 = 1행 |
| `sensor_readings` | 5초마다 1행 (가장 빨리 쌓임) |
| `risk_events` | 위험 단계 변화 시점 |
| `notifications` | 알림 이력 + 읽음 상태 |
| `device_status` | **기기당 1행** — 실시간 표시 전용 |
| `push_tokens` | 브라우저별 FCM 토큰 |
| `user_settings` | **계정당 1행** — 알림·접근성·테마 |
| `device_invites` | 보호자 초대 코드 (24시간·1회용) |
| `password_resets` | 비밀번호 재설정 토큰 (해시만 저장) |
| `schema_migrations` | 마이그레이션 이력 |

### 설계 포인트 — `device_status`를 따로 둔 이유

대시보드는 "지금 이 기기의 온도"를 자주 묻습니다. 이걸 `sensor_readings`에서 찾으면 **수십만 행 중 최신 1행**을 뒤져야 합니다.

`device_status`는 기기당 딱 1행이고 수신할 때마다 덮어씁니다. 대시보드는 **1행만 읽으면** 됩니다.

```sql
CREATE TABLE device_status (
    device_id    BIGINT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    is_charging  BOOLEAN NOT NULL DEFAULT false,
    level        risk_level NOT NULL DEFAULT 'normal',
    temperature  NUMERIC(5,2),
    current_a    NUMERIC(6,3),
    voltage_v    NUMERIC(6,2),
    last_seen_at TIMESTAMPTZ
);
```

### 설계 포인트 — 즐겨찾기가 `user_devices`에 있는 이유

즐겨찾기는 **기기의 속성이 아니라 보호자의 취향**입니다. 한 기기를 여러 보호자가 볼 때 각자 다르게 설정해야 하므로 연결 테이블에 둡니다.

반면 온도 차단 기준은 **기기의 속성**이므로 `devices`에 있습니다.

---

## 7. 인증 — 두 종류

| 대상 | 방식 | 헤더 | 파일 |
|---|---|---|---|
| 보호자 | JWT | `Authorization: Bearer …` | `api/userAuth.js` |
| ESP32 | API Key | `X-API-Key: csk_…` | `api/deviceAuth.js` |

**둘로 나눈 이유** — 사람과 기계는 인증 요구가 다릅니다. 사람은 로그인/만료가 필요하지만, 기기는 한 번 심어두면 계속 쓰는 고정 키가 맞습니다.

### 기기 키는 평문을 저장하지 않습니다

```js
const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
const { rows } = await pool.query(
  `SELECT id, serial_number, is_active,
          cutoff_temperature, auto_cutoff_enabled, cooling_fan_enabled,
          long_charge_warning_hours
   FROM devices WHERE api_key_hash = $1`, [hash]
);
```

발급 시점 **딱 한 번만** 원본을 보여주고, DB에는 SHA-256 해시만 넣습니다. DB가 유출돼도 키를 복원할 수 없습니다.

인증하면서 **기기 설정까지 같이 읽어옵니다.** 위험 판단에 바로 필요하므로 쿼리를 한 번으로 줄인 것입니다.

### 비밀번호는 bcrypt

`bcryptjs`로 해시합니다. SHA-256이 아니라 bcrypt를 쓰는 이유는 **의도적으로 느리기 때문**입니다. 무차별 대입 공격을 어렵게 만듭니다.

---

## 8. API 전체 목록 (22개)

### 인증

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 → JWT 발급 |
| GET | `/api/me` | 내 정보 |

### 기기

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/devices` | 기기 목록 |
| POST | `/api/devices` | 기기 등록 → API 키 1회 발급 |
| PATCH | `/api/devices/:id` | 이름·위치·안전설정 변경 |
| DELETE | `/api/devices/:id` | 연결 해제 |
| GET | `/api/devices/:id/status` | 현재 상태 |
| GET | `/api/devices/:id/monitoring` | 그래프 데이터 |
| GET | `/api/devices/:id/dashboard` | 대시보드 종합 |
| GET | `/api/devices/:id/history` | 충전 이력 |
| GET | `/api/devices/:id/sessions` | 세션 목록 |
| GET | `/api/devices/:id/readings` | 원본 센서값 |
| GET | `/api/devices/:id/events` | 위험 이벤트 |

### 센서 수신 / 세션

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/ingest/readings` | **ESP32 전용** |
| GET | `/api/sessions/:id/readings` | 세션별 센서값 |

### 알림 / 푸시

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notifications` | 알림 목록 |
| PATCH | `/api/notifications/:id/read` | 읽음 처리 |
| POST | `/api/notifications/read-all` | 모두 읽음 |
| GET | `/api/push/status` | FCM 사용 가능 여부 |
| POST | `/api/push/register` | 토큰 등록 |
| POST | `/api/push/unregister` | 토큰 해제 |

`:id` 자리에는 **일련번호와 숫자 ID 둘 다** 넣을 수 있습니다. 프론트엔드가 어느 쪽을 쓰든 동작하게 하기 위한 배려입니다.

### `PATCH /api/devices/:id` 로 바꿀 수 있는 값

| 필드 | 범위 |
|---|---|
| `name` | 기기 이름 |
| `location` | 설치 위치 |
| `isFavorite` | 즐겨찾기 |
| `targetPercent` | 50 ~ 100 |
| `cutoffTemperature` | 40 ~ 65 |
| `automaticCutoff` | true/false |
| `coolingFan` | true/false |
| `longChargeWarningHours` | 0 ~ 48 (0이면 사용 안 함) |

---

## 9. 위험 판단 엔진

`api/risk.service.js` — **12V 배터리 기준**입니다.

| 단계 | 조건 |
|---|---|
| 🔴 **위험** | 연기 감지 **또는** 온도 ≥ 50℃ |
| 🟠 **경고** | 온도 ≥ 45℃ **그리고** (전류 ≥ 4A 또는 전압 ≥ 14.5V) |
| 🟡 **주의** | 온도 상승 ≥ 2℃/분, 온도 ≥ 40℃, 전류 ≥ 4A 중 하나 |
| 🟢 **정상** | 그 외 |

### 경고를 복합 조건으로 둔 이유

온도만 높은 건 **주의** 수준입니다. 여름에 그냥 더울 수도 있습니다.

그런데 온도가 높은데 **전류나 전압까지 이상**하면 이야기가 다릅니다. 배터리 내부에서 문제가 진행 중이라는 신호이므로 경고로 올립니다.

### 온도 상승 속도를 보는 이유

절대 온도가 아직 낮아도 **빠르게 오르고 있다면** 곧 위험해집니다. 직전 측정값과 비교해 분당 상승률을 계산합니다.

```js
const minutes = (Date.now() - new Date(prevReading.recorded_at).getTime()) / 60000;
const risePerMin = (temperature - Number(prevReading.temperature)) / minutes;
if (risePerMin >= t.tempRisePerMin) return { level: 'caution', cause: 'temp_rise' };
```

### 임계값 우선순위

```
기기별 설정 (DB)  >  .env 환경변수  >  코드 기본값
```

`005` 마이그레이션 이후로는 기기마다 다른 차단 온도를 쓸 수 있습니다.

```js
function assess(reading, prevReading, overrides = {}) {
  const t = { ...THRESHOLDS, ...overrides };
  ...
}
```

---

## 10. 센서 1건이 처리되는 과정

`api/ingest.service.js`

```
ESP32 전송 (X-API-Key)
   ↓
① 열린 세션 찾기 / 없으면 새로 시작
② sensor_readings 에 기록
③ 직전 값과 비교해 위험 판단
④ device_status UPSERT (실시간 표시용)
⑤ 단계가 올라갔으면 risk_events + 알림
   ↓
응답: { level, cause, session_id, cutoff, fan }
```

### ⑤를 try/catch로 감싼 이유

**알림 실패가 센서 저장을 막으면 안 됩니다.** FCM 서버가 느리거나 토큰이 만료됐다고 해서 안전 데이터 기록이 중단되면 본말이 전도됩니다.

부가 기능 때문에 핵심 기능이 죽는 상황을 피하려는 의도입니다.

### ④에서 COALESCE를 쓴 이유

```sql
temperature = COALESCE($2, device_status.temperature)
```

값이 빠진 수신이 와도 **마지막 정상값을 지우지 않습니다.** 센서 하나가 잠깐 오작동해도 대시보드가 빈칸이 되지 않습니다.

### 응답의 `cutoff`, `fan`

```js
return {
  level, cause, session_id: session.id,
  cutoff: level === 'danger' && autoCutoffOn,
  fan: device.cooling_fan_enabled !== false && severity(level) >= severity('caution'),
};
```

ESP32에게 주는 **지시**입니다. 다만 차단 판단 자체는 ESP32도 독립적으로 하므로, 서버가 죽어도 안전 기능은 살아 있습니다.

---

## 11. 푸시 알림

```
위험 감지
   ↓
notifications 테이블 저장
   ↓
push_tokens 에서 해당 보호자의 토큰 조회
   ↓
FCM 발송 (data-only)
   ↓
서비스 워커가 직접 알림 표시
```

### data-only 메시지를 쓰는 이유

FCM에는 `notification` 필드와 `data` 필드가 있습니다. `notification`을 쓰면 브라우저가 자동으로 표시하는데, **앱이 켜져 있을 때와 꺼져 있을 때 동작이 달라집니다.**

`data`만 보내고 서비스 워커가 직접 그리면 **어느 상황에서도 똑같이** 동작합니다.

### 알림 클릭

`client.navigate()`로 알림 탭으로 이동합니다. 창이 이미 열려 있으면 그 창을 쓰고, 없으면 `openWindow`로 새로 엽니다.

> **주의** — 개발 중 `Ctrl+Shift+R`(하드 리로드)을 하면 페이지가 서비스 워커의 제어에서 벗어나 클릭이 동작하지 않습니다. 일반 `F5`를 쓰세요.

### FCM 없이도 동작합니다

```js
if (!serviceAccount) return null;   // 알림은 DB에만 기록
```

키가 없으면 조용히 넘어가고 DB 기록만 남깁니다. 서버가 죽지 않습니다.

---

## 12. 보안 조치

| 항목 | 처리 |
|---|---|
| 비밀번호 | bcrypt 해시 |
| 기기 키 | SHA-256 해시, 평문 미저장 |
| 비밀값 | `.gitignore`로 커밋 차단 |
| DB 외부 노출 | **RLS 적용 + anon 권한 회수** |
| CORS | 출처 허용 목록 |
| 에러 응답 | 내부 정보 숨김 |
| SQL 주입 | 파라미터 바인딩 (`$1`, `$2`) |

### `006_enable_rls.sql` — 실제 취약점을 막은 것

Supabase는 `public` 스키마의 모든 테이블을 **PostgREST REST API로 자동 공개**합니다. anon 키는 프론트엔드에 노출되는 공개 키인데, 아무 보호가 없으면 외부에서

- `users.password_hash`
- `devices.api_key_hash`
- `push_tokens.token`

을 **읽고 쓸 수 있었습니다.** 실제로 anon 롤에 INSERT/UPDATE/DELETE/TRUNCATE까지 부여돼 있었습니다.

이 백엔드는 PostgREST를 쓰지 않고 `pg` Pool로 직접 접속하며, 접속 롤 `postgres`가 테이블 소유자라 RLS를 우회합니다. 따라서 **정책을 하나도 만들지 않고 RLS만 켜서** "외부 API 전면 차단 / 백엔드는 그대로" 상태를 만들었습니다.

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- … 10개 테이블 전부

-- 2차 방어선
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;

-- 앞으로 생길 테이블도 기본 차단
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
```

> **나중에** 프론트엔드에서 `supabase-js`로 DB를 직접 호출할 계획이 생기면, 그때 `auth.uid()` 기반 정책을 별도 마이그레이션으로 추가해야 합니다.

### `.gitignore`

```
node_modules/
.env
firebase-service-account.json
.claude/
frontend/
```

`.env`와 서비스 계정 키는 **경로 무관하게** 제외됩니다.

---

## 13. 로컬 실행

### ① 설치

```bash
cd backend
npm install
```

### ② 환경 변수

`.env.example`을 `.env`로 복사한 뒤 최소 2개를 채웁니다.

```
DATABASE_URL=postgresql://postgres.xxxxx:비밀번호@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
JWT_SECRET=충분히-긴-임의-문자열
```

### ③ 마이그레이션

```bash
npm run migrate
```

```
applied 001_init.sql
applied 002_push_tokens.sql
...
```

이미 적용됐으면 `skip`이 뜹니다. **몇 번 실행해도 안전합니다.**

### ④ 서버 실행

```bash
npm run dev     # 개발 (파일 변경 시 자동 재시작)
npm start       # 운영
```

### ⑤ 확인

```bash
curl http://localhost:8000/health
```

`{"status":"ok"}` 가 나오면 정상입니다.

### 테스트 계정

| 항목 | 값 |
|---|---|
| 이메일 | `test@chargesafe.com` |
| 비밀번호 | `test1234` |

`node database/seed-demo.js` 로 생성됩니다.

---

## 14. 배포 요약

| 항목 | 값 |
|---|---|
| 서버 | Render (무료 플랜) |
| 배포 주소 | `https://chargesafe-zc39.onrender.com` |
| DB | Supabase (서울 리전) |
| 푸시 | Firebase FCM (`chargesafe-cs`) |
| 브랜치 | `backend` |
| Root Directory | `backend` |

자세한 내용은 다음 장에 있습니다.

---

# 15. 서버 배포 전체 — Supabase · Firebase · Render

## 15.0 배포 구성 한눈에 보기

배포에는 **외부 서비스 3개**가 관여합니다. 각자 역할이 다르고, 설정하는 곳도 다릅니다.

```
┌─────────────────────────────────────────────────────────┐
│  GitHub  (cntjdus/chargesafe, 브랜치 backend)            │
│     └─ 코드만. 비밀값은 절대 올리지 않음                 │
└───────────────────────┬─────────────────────────────────┘
                        │ push 하면 자동 배포
                        ▼
┌─────────────────────────────────────────────────────────┐
│  Render  ─ 서버 실행                                     │
│     Node.js 프로세스, 환경변수 3개 주입                  │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
           ▼                          ▼
┌────────────────────┐      ┌────────────────────────────┐
│  Supabase          │      │  Firebase                  │
│  PostgreSQL 저장   │      │  FCM 푸시 발송             │
│  서울 리전         │      │  프로젝트 chargesafe-cs    │
└────────────────────┘      └────────────────────────────┘
```

| 서비스 | 담당 | 요금 | 설정 위치 |
|---|---|---|---|
| GitHub | 코드 보관 | 무료 | 저장소 |
| **Render** | 서버 실행 | 무료 플랜 | Render 대시보드 |
| **Supabase** | 데이터 저장 | 무료 플랜 | Supabase 대시보드 |
| **Firebase** | 푸시 알림 | 무료 (Spark) | Firebase 콘솔 |

**핵심 원칙 하나** — 비밀값은 **코드가 아니라 각 서비스의 환경변수/설정**에 넣습니다. `.gitignore`가 `.env`와 서비스 계정 키를 막는 이유가 이것입니다.

---

## 15.1 Supabase — 데이터베이스

### 15.1.1 프로젝트 정보

| 항목 | 값 |
|---|---|
| 프로젝트 ref | `grrsirsvwsplwexinmwx` |
| 리전 | `ap-northeast-2` (서울) |
| 엔진 | PostgreSQL |
| 접속 방식 | **Session Pooler** |
| 호스트 | `aws-1-ap-northeast-2.pooler.supabase.com` |
| 포트 | `5432` |
| DB 이름 | `postgres` |

**서울 리전을 고른 이유** — ESP32와 보호자 브라우저 모두 한국에 있습니다. 리전이 멀면 매 쿼리마다 왕복 지연이 붙습니다.

### 15.1.2 연결 문자열 3종 — 어느 것을 쓸 것인가

Supabase 대시보드의 **Connect** 버튼을 누르면 연결 문자열이 3가지 나옵니다. 이 선택이 배포 성패를 가릅니다.

| 종류 | 포트 | 특징 | 이 프로젝트 |
|---|---|---|---|
| **Direct connection** | 5432 | DB에 직접. IPv6 전용 | ❌ Render가 IPv4라 연결 실패 |
| **Session pooler** | 5432 | 연결 재사용, IPv4 지원 | ✅ **사용 중** |
| **Transaction pooler** | 6543 | 트랜잭션 단위 풀링 | ❌ prepared statement 제약 |

**Session Pooler를 쓴 이유가 둘 있습니다.**

1. **IPv4 지원** — Direct connection은 IPv6 전용이라 Render 무료 플랜에서 연결되지 않습니다.
2. **연결 재사용** — 무료 플랜은 동시 연결 수가 제한적인데, 풀러가 연결을 돌려쓰므로 한도에 덜 부딪힙니다.

**Transaction Pooler를 피한 이유** — `pg` 드라이버가 쓰는 prepared statement가 트랜잭션 풀링과 충돌할 수 있습니다.

### 15.1.3 연결 문자열 얻는 법

```
Supabase 대시보드
  → 상단 Connect 버튼
  → Connection String 탭
  → Session pooler 선택
  → URI 복사
```

형태는 이렇습니다.

```
postgresql://postgres.grrsirsvwsplwexinmwx:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres
```

> ⚠️ **대괄호를 지우세요.** `[YOUR-PASSWORD]` 자리에 비밀번호만 넣습니다. 대괄호를 남기면 인증에 실패합니다. (실제로 처음 연결할 때 겪었던 문제입니다.)

비밀번호는 **프로젝트 생성 시 설정한 Database Password**입니다. 잊었으면 `Settings → Database → Reset database password`에서 재설정할 수 있습니다.

### 15.1.4 연결 코드

`database/db.js` — 놀랄 만큼 짧습니다.

```js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = { pool };
```

**Pool을 쓴 이유** — 요청마다 새 연결을 만들면 느립니다. 풀은 연결을 미리 만들어두고 재사용합니다.

**SSL 설정이 없는 이유** — Supabase 연결 문자열이 이미 SSL을 요구하고, `pg`가 자동으로 처리합니다.

### 15.1.5 스키마 적용

```bash
cd backend
npm run migrate
```

**배포 시에는 실행하지 않습니다.** 스키마는 이미 Supabase에 적용돼 있고, Render는 서버만 띄우면 됩니다.

새 마이그레이션을 추가했다면 **로컬에서 한 번 실행**하면 됩니다. DB는 클라우드에 하나뿐이라 로컬에서 실행해도 배포 환경에 반영됩니다.

> Render 빌드 과정에 마이그레이션을 넣지 않은 이유 — 배포할 때마다 DB를 건드리면, 배포 실패가 DB 손상으로 이어질 수 있습니다. 스키마 변경은 **의도적으로 수동**입니다.

### 15.1.6 SQL Editor로 직접 확인하기

Supabase 대시보드 → **SQL Editor** 에서 바로 쿼리할 수 있습니다.

```sql
-- 적용된 마이그레이션 확인
SELECT * FROM schema_migrations ORDER BY version;

-- 등록된 기기
SELECT id, serial_number, name, location, is_active FROM devices;

-- 최근 센서값 10건
SELECT recorded_at, temperature, current_a, voltage_v, level
FROM sensor_readings ORDER BY recorded_at DESC LIMIT 10;

-- 현재 상태
SELECT * FROM device_status;
```

### 15.1.7 Security Advisor 경고 대응

Supabase는 `Advisors → Security Advisor`에서 보안 문제를 점검해 줍니다. 초기에 다음 경고가 떴습니다.

| 경고 | 의미 |
|---|---|
| `rls_disabled_in_public` | public 테이블에 RLS가 꺼져 있음 |
| `sensitive_columns_exposed` | 비밀번호 해시 등이 API로 노출됨 |

`006_enable_rls.sql`로 해결했습니다. **적용 후 Security Advisor를 다시 실행해 경고가 사라졌는지 확인하세요.**

### 15.1.8 무료 플랜 한도

| 항목 | 한도 |
|---|---|
| DB 용량 | 500MB |
| 대역폭 | 5GB/월 |
| 동시 연결 | 제한적 (풀러 권장) |
| **비활성 일시정지** | **7일 무접속 시 일시정지** |

> ⚠️ **가장 조심할 항목은 7일 일시정지입니다.** 방학이나 시험 기간에 아무도 접속하지 않으면 DB가 멈춥니다. 대시보드에서 수동으로 되살릴 수 있지만, **발표 직전에 겪으면 곤란**하므로 시연 며칠 전에는 반드시 한 번 접속해 두세요.

### 15.1.9 용량 관리

`sensor_readings`가 가장 빨리 쌓입니다.

| 기기 수 | 하루 | 한 달 |
|---|---|---|
| 1대 | 약 17,000행 | 약 51만 행 |
| 10대 | 약 17만 행 | 약 510만 행 |

캡스톤 기간에는 문제없지만, 장기 운영한다면 **오래된 원본을 시간 단위 평균으로 줄이는(다운샘플링)** 정책이 필요합니다.

```sql
-- 예시: 30일 지난 원본 삭제 (요약 테이블을 먼저 만든 뒤 실행)
DELETE FROM sensor_readings WHERE recorded_at < now() - interval '30 days';
```

### 15.1.10 백업

무료 플랜은 자동 백업이 제한적입니다. 중요한 시점(발표 전 등)에는 수동으로 받아두는 게 안전합니다.

```
Supabase 대시보드 → Database → Backups
```

또는 로컬에서:

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

---

## 15.2 Firebase — 푸시 알림 (FCM)

> ⚠️ **2026-08-09 현재, 이 장의 프론트엔드 부분은 동작하지 않습니다.**
> 프론트엔드가 전면 교체되면서 `public/firebase-config.js`, `public/firebase-messaging-sw.js`,
> `src/lib/push.ts` 가 모두 사라졌습니다. 브라우저가 토큰을 발급받지 않으므로 `push_tokens`
> 테이블이 비어 있고, **푸시는 실제로 발송되지 않습니다.**
>
> | 구분 | 상태 |
> |---|---|
> | 백엔드 발송 코드 (`notification/`) | ✅ 그대로 있음 |
> | 서비스 계정 키 설정 (15.2.5~15.2.7) | ✅ 지금도 유효 |
> | 프론트 설정 파일·서비스 워커 (15.2.3~15.2.4) | ❌ 파일 없음 — 다시 만들어야 함 |
> | 알림 센터 화면 (`notifications` 테이블) | ✅ 정상 동작 |
>
> 아래 내용은 **프론트에 FCM을 다시 넣을 때의 기준 문서**로 보시면 됩니다.

### 15.2.1 프로젝트 정보

| 항목 | 값 |
|---|---|
| 프로젝트 ID | `chargesafe-cs` |
| 발신자 ID | `49557287937` |
| 인증 도메인 | `chargesafe-cs.firebaseapp.com` |
| 요금제 | Spark (무료) |

**FCM 웹 푸시는 완전 무료**입니다. 발송 건수 제한이 없습니다.

### 15.2.2 설정에 필요한 값 3가지

푸시 알림은 **웹 설정 · VAPID 키 · 서비스 계정 키** 세 가지가 모두 있어야 동작합니다. 각각 역할과 보안 등급이 다릅니다.

| 값 | 쓰는 쪽 | 공개 여부 | 얻는 곳 |
|---|---|---|---|
| firebaseConfig | 브라우저 | **공개 OK** | 프로젝트 설정 → 일반 → 내 앱 |
| VAPID 키 | 브라우저 | **공개 OK** | 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 |
| 서비스 계정 키 | **서버** | 🔒 **절대 비공개** | 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 |

> 앞의 두 개가 공개돼도 되는 이유 — 브라우저에 어차피 내려가는 값입니다. 이 값들만으로는 알림을 **보낼** 수 없고, 받을 준비만 할 수 있습니다.
>
> 서비스 계정 키는 다릅니다. 이걸 가지면 **누구에게든 알림을 보낼 수 있고** 다른 Firebase 리소스에도 접근됩니다. 절대 커밋하지 마세요.

### 15.2.3 웹 앱 등록 → firebaseConfig

```
Firebase 콘솔 → 프로젝트 설정(⚙️) → 일반 탭
  → "내 앱" 섹션 → 웹 아이콘(</>)
  → 앱 닉네임 입력 → 앱 등록
```

나온 `firebaseConfig`를 `frontend/public/firebase-config.js`에 넣었습니다.

```js
self.FIREBASE_CONFIG = {
  apiKey: "<Firebase 콘솔에서 복사>",
  authDomain: "chargesafe-cs.firebaseapp.com",
  projectId: "chargesafe-cs",
  storageBucket: "chargesafe-cs.firebasestorage.app",
  messagingSenderId: "49557287937",
  appId: "1:49557287937:web:facbef114e273bc8397c00",
  measurementId: "G-SQEDLJ578E",
};
```

**이 파일을 따로 둔 이유** — 서비스 워커(`firebase-messaging-sw.js`)와 앱의 푸시 모듈 **둘 다** 같은 설정이 필요합니다. 한 곳에 두고 양쪽에서 읽습니다. (서비스 워커는 번들러를 거치지 않으므로 `import` 를 쓸 수 없어 `public/` 에 둡니다.)

### 15.2.4 VAPID 키

```
Firebase 콘솔 → 프로젝트 설정 → 클라우드 메시징 탭
  → 웹 구성 → 웹 푸시 인증서 → 키 쌍 생성
```

```js
self.FIREBASE_VAPID_KEY = "<웹 푸시 인증서 키 쌍에서 복사>";
```

VAPID는 **브라우저가 "이 서버가 보낸 알림이 맞다"고 확인**하는 용도입니다. 없으면 토큰 발급 자체가 안 됩니다.

### 15.2.5 서비스 계정 키 (서버용) 🔒

```
Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 탭
  → Node.js 선택 → "새 비공개 키 생성" → JSON 다운로드
```

받은 파일을 `backend/firebase-service-account.json`으로 저장합니다. 이 이름은 **`.gitignore`에 등록돼 있어** 커밋되지 않습니다.

### 15.2.6 서버가 키를 읽는 방식 — 로컬과 배포가 다릅니다

`notification/firebase.js`

```js
function loadServiceAccount() {
  // 1순위: 환경변수에 JSON 문자열 또는 base64 (배포용)
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const text = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(text);
  }
  // 2순위: 파일 경로 (로컬용)
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (saPath) {
    const resolved = path.isAbsolute(saPath) ? saPath : path.join(__dirname, '..', saPath);
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  }
  return null;   // 둘 다 없으면 알림은 DB 기록만
}
```

| 환경 | 사용 변수 | 값 |
|---|---|---|
| 로컬 | `FIREBASE_SERVICE_ACCOUNT_PATH` | `./firebase-service-account.json` |
| Render | `FIREBASE_SERVICE_ACCOUNT` | JSON **전체 내용**을 붙여넣기 |

**두 방식을 만든 이유** — Render에는 파일을 올릴 수 없습니다. 환경변수에 JSON을 통째로 넣어야 하는데, 로컬에서는 파일이 편합니다. 둘 다 지원하면 코드 수정 없이 양쪽에서 돌아갑니다.

**base64도 받는 이유** — 일부 배포 플랫폼은 여러 줄 값이나 특수문자를 제대로 다루지 못합니다. 그럴 때 base64로 인코딩해 넣으면 됩니다.

```bash
# base64 인코딩이 필요할 때
base64 -w 0 firebase-service-account.json
```

### 15.2.7 초기화

```js
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const app = initializeApp({ credential: cert(serviceAccount) });
messaging = getMessaging(app);
```

> ⚠️ **firebase-admin v14부터는 모듈식 API를 써야 합니다.** 예전 방식(`admin.credential.cert`)은 `undefined`가 되어 동작하지 않습니다. 인터넷의 오래된 예제를 따라 하면 여기서 막힙니다.

**초기화 실패해도 서버는 살아 있습니다.**

```js
catch (err) {
  console.warn('FCM 초기화 실패 — 알림은 DB에만 기록됩니다:', err.message);
  messaging = null;
}
```

### 15.2.8 승인된 도메인 등록 (배포 후 필수)

배포 주소에서 푸시가 동작하려면 도메인을 등록해야 합니다.

```
Firebase 콘솔 → Authentication → Settings
  → 승인된 도메인(Authorized domains) → 도메인 추가
```

| 입력할 값 | 형태 |
|---|---|
| ✅ 올바름 | `chargesafe-zc39.onrender.com` |
| ❌ 틀림 | `https://chargesafe-zc39.onrender.com` |
| ❌ 틀림 | `chargesafe-zc39.onrender.com/notifications` |

**`https://`와 경로를 빼고 도메인만** 넣습니다.

### 15.2.9 푸시 동작 확인

```bash
curl https://chargesafe-zc39.onrender.com/api/push/status
```

`{"enabled":true}` 면 서버에서 FCM이 살아 있는 것입니다.

브라우저 쪽은 이 순서로 확인합니다.

1. 대시보드 접속 → 알림 권한 **허용**
2. 개발자 도구 → Application → Service Workers → `firebase-messaging-sw.js` **activated** 확인
3. DB에서 토큰 확인

```sql
SELECT user_id, LEFT(token, 20) || '...' AS token, created_at FROM push_tokens;
```

### 15.2.10 푸시 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 토큰이 발급되지 않음 | VAPID 키 누락/오타 | `firebase-config.js` 확인 |
| 토큰은 있는데 알림이 안 옴 | 서버에 서비스 계정 키 없음 | `/api/push/status` 확인 |
| 앱이 켜져 있을 때만 안 뜸 | 포그라운드 핸들러 누락 | `onMessage` 등록 확인 |
| 알림 클릭해도 반응 없음 | 하드 리로드로 SW 제어 해제 | **F5**로 새로고침 |
| HTTPS 아닌 곳에서 안 됨 | 웹 푸시는 HTTPS 필수 | `localhost`는 예외로 허용됨 |
| 배포 주소에서만 안 됨 | 승인된 도메인 미등록 | 15.2.8 수행 |

---

## 15.3 Render — 서버 실행

### 15.3.1 왜 Render인가

| 후보 | 장점 | 단점 |
|---|---|---|
| **Render** ✅ | GitHub 연동 자동 배포, 무료, Node 그대로 | 무료 플랜 절전 |
| Fly.io | 빠름, 리전 선택 | 카드 등록 필요, 설정 복잡 |
| Railway | 편함 | 무료 크레딧 소진 후 유료 |
| Vercel/Cloudflare | 콜드스타트 짧음 | **서버리스라 코드 재작성 필요** |
| AWS EC2 | 자유도 최고 | 설정 부담, 요금 관리 |

**Render를 고른 결정적 이유** — 코드를 **하나도 고치지 않고** 그대로 올릴 수 있습니다. 캡스톤 일정에서 이게 가장 큽니다.

### 15.3.2 배포 준비물

- GitHub 계정
- Render 계정 (GitHub으로 가입 가능)
- 비밀값 3가지
  - `DATABASE_URL` — Supabase 연결 문자열
  - `JWT_SECRET` — `.env`에 있는 값
  - `firebase-service-account.json` **전체 내용**

### 15.3.3 서비스 생성

```
dashboard.render.com → New + → Web Service
  → GitHub 저장소 cntjdus/chargesafe 연결
```

### 15.3.4 서비스 설정

| 항목 | 값 | 비고 |
|---|---|---|
| Name | `chargesafe` | 배포 주소가 됩니다 |
| Region | Singapore | 한국에서 가장 가까움 |
| Branch | **`backend`** | main 아님 |
| **Root Directory** | **`backend`** | ⚠️ **반드시 입력** |
| Runtime | Node | 자동 감지 |
| Build Command | `npm install` | |
| Start Command | `npm start` | |
| Plan | Free | |

> ⚠️ **Root Directory가 가장 흔한 실수입니다.**
> 백엔드는 저장소 루트가 아니라 `backend/` 폴더 안에 있습니다. 이걸 비워두면 Render가 루트에서 `package.json`을 찾다가 **빌드에 실패**합니다.

### 15.3.5 환경변수

Render 대시보드 → **Environment** 탭에서 입력합니다.

| Key | Value | 필수 |
|---|---|:---:|
| `DATABASE_URL` | `backend/.env`의 Supabase 문자열 그대로 | ✅ |
| `JWT_SECRET` | `backend/.env`의 값 그대로 | ✅ |
| `FIREBASE_SERVICE_ACCOUNT` | JSON 파일 **전체 내용** (`{` 부터 `}` 까지) | 푸시용 |
| `CORS_ORIGINS` | 프론트엔드 배포 주소 | 분리 배포 시 |

**`PORT`는 넣지 마세요.** Render가 자동으로 주입하며, 코드가 그 값을 우선 사용합니다.

```js
const port = process.env.PORT || 8000;   // Render의 PORT가 이깁니다
```

### 15.3.6 render.yaml (Blueprint)

저장소에 이 파일이 있으면 Render가 읽어서 서비스를 자동 구성합니다.

```yaml
services:
  - type: web
    name: chargesafe
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: FIREBASE_SERVICE_ACCOUNT
        sync: false
```

`sync: false`는 **"이 값은 저장소에 없으니 배포할 때 직접 입력하라"**는 뜻입니다. 비밀값이 코드에 섞이지 않게 하는 장치입니다.

### 15.3.7 배포 실행과 로그

`Create Web Service`를 누르면 몇 분 뒤 배포됩니다. 진행 상황은 **Logs** 탭에서 볼 수 있습니다.

성공했을 때 나오는 로그:

```
==> Building...
==> Running 'npm install'
added 132 packages
==> Build successful
==> Deploying...
==> Running 'npm start'
FCM 초기화 완료 (project: chargesafe-cs)
ChargeSafe backend listening on http://localhost:10000
==> Your service is live 🎉
```

> 포트가 10000으로 나오는 건 정상입니다. Render가 주입한 값이며, 외부에서는 443(HTTPS)으로 접근합니다.

### 15.3.8 자동 재배포

`backend` 브랜치에 push하면 **Render가 자동으로 다시 빌드하고 배포**합니다. 별도 조작이 필요 없습니다.

끄고 싶으면 `Settings → Build & Deploy → Auto-Deploy → No`로 바꿉니다.

수동 배포는 `Manual Deploy → Deploy latest commit`입니다.

### 15.3.9 무료 플랜의 특성

| 항목 | 내용 |
|---|---|
| 실행 시간 | 월 750시간 (1개 서비스는 상시 가동 가능) |
| 대역폭 | 월 100GB |
| **절전** | **15분 무접속 시 잠듦** |
| **콜드스타트** | **약 25초** (실측 24.6초) |
| 디스크 | 임시 (재시작 시 초기화) |
| HTTPS | 자동 제공 |

### 15.3.10 콜드스타트 — 정확히 언제 문제가 되는가

**충전 중에는 발생하지 않습니다.** ESP32가 5초마다 요청을 보내므로 서버가 잠들 틈이 없습니다.

지연이 생기는 경우는 둘뿐입니다.

1. 오랜만에 **대시보드를 열 때**
2. 오랜만에 **충전을 시작할 때**

**안전 차단은 영향받지 않습니다.** 펌웨어가 서버와 무관하게 스스로 차단하도록 설계했습니다.

다만 정직하게 적자면 — **서버가 자던 중 위험이 발생하면 보호자 알림이 최대 50초 늦습니다.** 차단은 즉시지만 알림은 늦는다는 뜻입니다.

### 15.3.11 콜드스타트 대응책

| 방법 | 비용 | 효과 |
|---|---|---|
| ① **외부 크론으로 깨우기** | 무료 | 10분마다 `/health` 호출 |
| ② 유료 전환 (Starter $7/월) | 유료 | 절전 없음, 코드 변경 없음 |
| ③ 서버리스 전환 | 무료~ | **백엔드 대부분 재작성 필요** |

**①을 먼저 시도하는 게 합리적입니다.** cron-job.org 같은 무료 서비스에 다음을 등록합니다.

```
URL: https://chargesafe-zc39.onrender.com/health
주기: 10분
```

`/health`가 가벼운 이유가 여기 있습니다. DB를 건드리지 않고 JSON만 반환하므로 깨우기용으로 딱 맞습니다.

```js
app.get('/health', (req, res) => res.json({ status: 'ok' }));
```

> ③이 어려운 이유 — `firebase-admin`은 Cloudflare Workers에서 동작하지 않고, `pg`는 TCP가 필요하며, `express`는 Hono 등으로 재작성해야 합니다. 특히 `bcryptjs`는 의도적으로 느린 연산이라 **Workers의 요청당 CPU 한도를 넘길 위험**이 있습니다.

### 15.3.12 디스크는 임시입니다

Render의 파일 시스템은 **재시작하면 초기화**됩니다. 그래서 서버는 디스크에 아무것도 쓰지 않도록 만들었습니다.

파일 접근은 **읽기 3곳뿐**이며 전부 설정·코드입니다.

| 위치 | 대상 |
|---|---|
| `app.js` | 대시보드 `index.html` 존재 확인 |
| `database/migrate.js` | 마이그레이션 `.sql` (CLI 실행 시) |
| `notification/firebase.js` | FCM 서비스 계정 키 |

업로드 기능도, 로그 파일 쓰기도 없습니다. **인스턴스가 교체돼도 잃을 데이터가 없습니다.**

---

## 15.4 배포 후 연결 작업

서버만 올린다고 끝이 아닙니다. **주소가 바뀌었으므로** 이를 참조하는 곳을 모두 갱신해야 합니다.

> 프론트엔드를 **다른 주소에 따로 배포**한다면 이 장에 더해 **15.5** 를 반드시 함께 보세요. CORS 설정과 프론트엔드 코드 수정이 추가로 필요합니다.

### ① ESP32 펌웨어

`chargesafe_esp32.ino`

```cpp
const char* SERVER_URL = "https://chargesafe-zc39.onrender.com/api/ingest/readings";
// 로컬 테스트용
// const char* SERVER_URL = "http://192.168.0.10:8000/api/ingest/readings";
```

> HTTPS를 쓰므로 펌웨어에서 `WiFiClientSecure`가 필요합니다. 이미 반영돼 있습니다.
>
> 타임아웃은 **60초**로 넉넉히 잡았습니다. 콜드스타트(25초)를 견디기 위해서입니다.
> ```cpp
> http.setTimeout(60000);
> ```

### ② 프론트엔드

```
VITE_API_BASE_URL=https://chargesafe-zc39.onrender.com
```

### ③ CORS 허용 출처

프론트엔드를 **다른 주소에 배포했다면** Render 환경변수에 추가합니다.

```
CORS_ORIGINS=https://chargesafe-frontend.vercel.app
```

같은 서버에서 서빙한다면 필요 없습니다.

### ④ Firebase 승인 도메인

15.2.8 참고 — `chargesafe-zc39.onrender.com` 추가.

---

## 15.5 프론트엔드를 따로 배포하는 경우

프론트엔드를 Vercel·Netlify 등 **다른 주소에 배포**하면 구조가 바뀝니다. 지금까지는 한 서버가 화면과 API를 모두 냈지만, 분리하면 **서로 다른 출처(origin)** 가 됩니다.

### 15.5.1 무엇이 달라지는가

**분리 전 — 같은 출처**

```
https://chargesafe-zc39.onrender.com
   ├─ /            → React 화면 (Express가 dist 서빙)
   └─ /api/*       → API
```
브라우저 입장에서 **한 집안**이라 CORS가 필요 없습니다.

**분리 후 — 다른 출처**

```
https://chargesafe.vercel.app          ← 화면 (정적 호스팅)
        │  cross-origin 요청
        ▼
https://chargesafe-zc39.onrender.com   ← API (Render)
```
브라우저가 **남의 집 요청**으로 취급하므로 CORS 허가가 반드시 필요합니다.

### 15.5.2 프론트엔드 주소 설정 — 현재 상태

> **2026-08-09 갱신.** 이전 판에는 "분리 배포를 막는 문제 2곳(`lib/api.ts` 상대 경로,
> `vite.config.ts` 프록시 포트 3000)"이 적혀 있었습니다. 프론트엔드가 전면 교체되면서
> **두 파일 모두 사라졌고 문제도 함께 해소**됐습니다. 아래가 현재 코드 기준입니다.

#### 지금은 절대 주소 방식입니다

`frontend/src/api/monitoringApi.js`

```js
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const response = await fetch(
  `${API_BASE_URL}/api/devices/${deviceId}/monitoring/?${query}`, { ... });
```

Vite 프록시를 쓰지 않고 처음부터 전체 주소로 호출합니다. 백엔드 기본 포트와 같은 8000이
기본값이라 **로컬은 설정 없이 그대로 동작**합니다.

#### 대신 주의할 점 — 배포할 때는 `VITE_API_BASE_URL` 을 반드시 지정

지금 `frontend/.env` 가 없으므로, 그대로 빌드하면 번들 안에 `http://localhost:8000` 이 남습니다.

| 배포 방식 | `VITE_API_BASE_URL` |
|---|---|
| 분리 배포 (Vercel + Render) | `https://chargesafe-zc39.onrender.com` |
| 백엔드가 `dist` 를 함께 서빙 | 빈 문자열 — 같은 출처라 붙일 필요 없음 |
| 로컬 개발 | 설정 불필요 (기본값 8000) |

이 값은 **빌드 시점에 코드로 박히므로** 바꾼 뒤에는 반드시 다시 빌드해야 합니다 (15.5.8).

#### 남은 실제 문제 — 인증 헤더

`monitoringApi.js` 의 fetch 에는 `Authorization` 헤더가 없고, 로그인 화면도 토큰을 저장하지
않습니다. 목 데이터를 끄는 순간 **전 요청이 401** 이 됩니다 (15.5.6).

> 이 파일들은 프론트엔드 소유라 백엔드에서 수정하지 않았습니다.
> **프론트엔드 담당에게 그대로 전달하면 되는 내용**입니다.

### 15.5.3 백엔드가 할 일 — CORS 허용 한 줄

백엔드 쪽 준비는 **환경변수 하나**로 끝납니다. 코드 수정은 필요 없습니다.

Render 대시보드 → Environment:

```
CORS_ORIGINS=https://chargesafe.vercel.app
```

여러 곳이면 **쉼표로** 나열합니다.

```
CORS_ORIGINS=https://chargesafe.vercel.app,https://chargesafe-preview.vercel.app,http://localhost:5173
```

### 15.5.4 CORS 미들웨어가 하는 일

`api/cors.js`

```js
const DEFAULT_ORIGINS = [
  'http://localhost:5173',   // Vite 개발 서버
  'http://localhost:4173',   // Vite 프리뷰
  'http://localhost:3000',
  'http://localhost:8000',
];

const ORIGINS = allowed.length ? allowed : DEFAULT_ORIGINS;

function cors(req, res, next) {
  const origin = req.header('Origin');

  if (origin && (ORIGINS.includes('*') || ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
}
```

설계 의도를 짚어두면:

| 코드 | 이유 |
|---|---|
| `CORS_ORIGINS` 있으면 **덮어씀** | 배포 시 localhost가 열려 있지 않게 |
| `Allow-Headers`에 `Authorization` | 없으면 로그인 토큰을 못 보냄 |
| `Allow-Headers`에 `X-API-Key` | ESP32용 (브라우저 테스트 대비) |
| `Vary: Origin` | 캐시가 출처를 섞지 않게 |
| `OPTIONS → 204` | 사전 요청을 본문 없이 즉시 종료 |
| `origin` 없으면 통과 | **ESP32는 CORS 대상이 아님** |

마지막 항목이 중요합니다. ESP32는 브라우저가 아니라 `Origin` 헤더를 붙이지 않습니다. CORS 검사를 그냥 지나가므로 **분리 배포가 ESP32에 아무 영향을 주지 않습니다.**

> **`*` 는 쓰지 마세요.** `CORS_ORIGINS=*` 로 두면 아무 사이트나 API를 호출할 수 있습니다. 개발 중 급할 때 말고는 실제 도메인을 명시하세요.

### 15.5.5 사전 요청(preflight)이 왜 생기는가

`Authorization` 헤더를 붙이면 브라우저가 **본 요청 전에 OPTIONS를 한 번 더** 보냅니다.

```
① OPTIONS /api/devices    "Authorization 헤더 써도 됩니까?"
   ← 204 + Allow-Headers
② GET /api/devices        실제 요청
```

즉 **요청이 2배**가 됩니다. `Access-Control-Max-Age: 86400` 을 준 이유가 이것입니다. 하루 동안 사전 요청 결과를 캐시해 두 번째부터는 ①을 생략합니다.

### 15.5.6 인증 — 백엔드는 손댈 게 없고, 프론트가 헤더를 붙여야 합니다

이 백엔드는 **JWT를 `Authorization` 헤더로** 받습니다. 쿠키를 쓰지 않습니다.

| 방식 | 분리 배포 시 |
|---|---|
| 쿠키 세션 | `SameSite=None; Secure` 필요, 도메인 문제 복잡 |
| **JWT 헤더** ✅ | **추가 설정 없음** |

쿠키였다면 크로스 도메인 설정으로 한참 고생했을 부분입니다. 헤더 방식이라 백엔드는 **CORS만 열면 끝**입니다.

> ⚠️ **다만 현재 프론트엔드가 토큰을 다루지 않습니다.**
> `LoginForm` 은 입력값을 `console.log` 한 뒤 곧바로 화면을 전환할 뿐 `POST /api/auth/login`
> 을 부르지 않고, `App.jsx` 는 로그아웃에서 `localStorage.removeItem("accessToken")` 을 하지만
> **저장하는 코드가 없습니다.** `monitoringApi.js` 의 fetch 에도 헤더가 없습니다.

프론트에서 해야 할 일은 세 가지입니다.

```js
// ① 로그인 — 실제 호출로 교체
const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId, password }),
});
const { token } = await res.json();

// ② 저장
localStorage.setItem("accessToken", token);

// ③ 모든 요청에 첨부
headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
```

토큰 유효기간은 **7일**입니다(`auth.routes.js`). 만료되면 401이 오므로 로그인 화면으로 되돌리면 됩니다.

### 15.5.7 정적 호스팅 선택과 SPA 설정

| 호스팅 | 무료 | SPA 리라이트 |
|---|:---:|---|
| **Vercel** | ✅ | 자동 |
| **Netlify** | ✅ | `_redirects` 파일 |
| **Cloudflare Pages** | ✅ | 자동 |
| **Render Static Site** | ✅ | 대시보드에서 설정 |

**빌드 설정 (공통)**

| 항목 | 값 |
|---|---|
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| 환경변수 | `VITE_API_BASE_URL=https://chargesafe-zc39.onrender.com` |

**SPA 리라이트가 필요한 이유** — `/monitoring` 같은 주소는 실제 파일이 없습니다. 새로고침하면 404가 나므로 모든 경로를 `index.html`로 넘겨야 합니다. (백엔드가 서빙할 때는 `app.js`의 SPA 폴백이 하던 일입니다.)

Netlify는 `frontend/public/_redirects` 파일이 필요합니다.

```
/*    /index.html   200
```

Vercel·Cloudflare Pages는 Vite 프로젝트를 인식해 자동 처리합니다.

### 15.5.8 ⚠️ `VITE_` 환경변수는 빌드 시점에 박힙니다

Vite의 `import.meta.env.VITE_*` 는 **런타임이 아니라 빌드할 때** 값이 코드에 새겨집니다.

```
환경변수 변경 → 반드시 다시 빌드해야 반영됨
```

Vercel에서 환경변수만 바꾸고 재배포하지 않으면 **옛 주소가 그대로 남습니다.** 값을 바꿨으면 **Redeploy**를 꼭 누르세요.

> 이름이 반드시 `VITE_` 로 시작해야 합니다. 그렇지 않으면 Vite가 클라이언트 번들에 넣지 않습니다.

### 15.5.9 FCM 푸시 — 도메인이 프론트엔드로 바뀝니다

> ⚠️ **현재 프론트엔드에는 FCM 코드가 없습니다.** 교체 과정에서 `public/firebase-config.js`,
> `public/firebase-messaging-sw.js`, `src/lib/push.ts` 가 사라졌습니다. 그래서 `push_tokens`
> 테이블이 비어 있고 **푸시는 실제로 발송되지 않습니다.** 위험 알림은 `notifications` 에
> 그대로 기록되므로 알림 센터 화면은 정상입니다. 백엔드 발송 코드는 그대로 두었으니
> 프론트에 다시 넣으면 아래 내용이 그대로 적용됩니다.

푸시는 **화면이 떠 있는 도메인**을 기준으로 동작합니다. 분리하면 기준이 프론트엔드로 옮겨갑니다.

| 항목 | 조치 |
|---|---|
| Firebase 승인 도메인 | **프론트엔드 도메인**을 추가 (백엔드 아님) |
| 서비스 워커 위치 | `https://프론트도메인/firebase-messaging-sw.js` |
| `firebase-config.js` | 프론트엔드 `public/` 에 함께 배포 |
| HTTPS | 필수 (Vercel·Netlify는 자동) |

```
Firebase 콘솔 → Authentication → Settings → 승인된 도메인
  → chargesafe.vercel.app 추가
```

서비스 워커는 **자기 도메인 루트에 있어야** 사이트 전체를 제어합니다. `public/` 에 두면 빌드 시 `dist/` 루트로 복사되므로 그대로 두면 됩니다.

토큰 등록 요청(`POST /api/push/register`)은 백엔드로 가므로 **CORS 허용에 포함**되어야 합니다. 15.5.3을 했다면 자동으로 됩니다.

### 15.5.10 분리 배포 순서

```
① 백엔드 Render 환경변수에 CORS_ORIGINS 추가 → 재배포
② 프론트엔드에 로그인·토큰 처리 추가 (15.5.6) + USE_MOCK_DATA = false
③ 정적 호스팅에 VITE_API_BASE_URL 설정하고 배포
④ (FCM을 다시 넣는 경우) Firebase 승인 도메인에 프론트엔드 주소 추가
⑤ 검증 (15.5.11)
```

**①을 먼저 하는 이유** — 프론트엔드를 먼저 배포하면 첫 접속에서 전부 CORS 오류가 납니다. 백엔드 문을 먼저 열어두면 헷갈릴 일이 없습니다.

### 15.5.11 분리 배포 검증

**① CORS 헤더가 나오는가**

```bash
curl -i -X OPTIONS https://chargesafe-zc39.onrender.com/api/devices \
  -H "Origin: https://chargesafe.vercel.app" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization"
```

응답에 이 두 줄이 있어야 합니다.

```
Access-Control-Allow-Origin: https://chargesafe.vercel.app
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key
```

없으면 `CORS_ORIGINS` 값이 틀렸거나 재배포를 안 한 것입니다.

**② 프론트엔드가 올바른 주소를 보는가**

배포된 화면에서 개발자 도구 → Network → 요청 URL이 **백엔드 도메인**인지 확인합니다. 자기 도메인이면 15.5.2 ① 수정이 안 된 것입니다.

**③ 로그인 → 기기 목록**이 실제로 뜨는지 확인합니다.

**④ 새로고침**해도 404가 안 나는지 확인합니다 (SPA 리라이트).

**⑤ 알림 권한 허용** 후 `push_tokens` 테이블에 행이 생기는지 확인합니다.

### 15.5.12 분리 배포 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| `No 'Access-Control-Allow-Origin' header` | `CORS_ORIGINS` 미설정 | 15.5.3 |
| 오타 하나로 CORS 실패 | 끝에 `/` 붙임, `http`/`https` 혼동 | **정확히** 일치해야 함 |
| API 요청이 프론트 도메인으로 감 | 상대 경로 그대로 | 15.5.2 ① |
| 환경변수 바꿨는데 그대로 | 빌드 시점 주입 | **Redeploy** |
| 새로고침하면 404 | SPA 리라이트 없음 | 15.5.7 |
| 로컬 개발에서 API 안 붙음 | 프록시가 3000 | 15.5.2 ② |
| 푸시 토큰 발급 실패 | 승인 도메인 미등록 | 15.5.9 |
| preflight만 실패 | `Authorization` 미허용 | `cors.js` 확인 |
| ESP32도 안 됨 | **CORS 문제 아님** | 다른 원인 확인 |

> `CORS_ORIGINS` 값은 **출처(scheme + host + port)만** 적습니다.
> ✅ `https://chargesafe.vercel.app`
> ❌ `https://chargesafe.vercel.app/` (끝 슬래시)
> ❌ `chargesafe.vercel.app` (scheme 없음)

### 15.5.13 분리 배포의 장단점

| | 장점 | 단점 |
|---|---|---|
| **분리** | 정적 CDN이라 화면 로딩이 빠름<br>화면은 콜드스타트 없음<br>각자 독립 배포 | CORS 설정 필요<br>주소 2개 관리<br>프론트 코드 수정 필요 |
| **통합** | 설정 단순, CORS 불필요<br>주소 1개 | 화면도 콜드스타트 영향<br>배포가 서로 묶임 |

**분리를 권하는 이유 하나** — 화면이 정적 CDN에 있으면 **백엔드가 자고 있어도 화면은 즉시 뜹니다.** 로그인 버튼을 누른 뒤에야 서버가 깨어나므로, 사용자가 느끼는 콜드스타트 체감이 크게 줄어듭니다.

---

## 15.6 배포 검증 체크리스트

순서대로 확인하면 어디서 막혔는지 바로 알 수 있습니다.

### ① 서버가 살아 있는가

```bash
curl https://chargesafe-zc39.onrender.com/health
```
→ `{"status":"ok"}`

### ② 라우트가 붙었는가

```bash
curl https://chargesafe-zc39.onrender.com/
```
→ `service`, `endpoints` 가 담긴 JSON

### ③ DB가 연결됐는가

```bash
curl -X POST https://chargesafe-zc39.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@chargesafe.com","password":"test1234"}'
```
→ `token` 이 나오면 DB 연결 성공

### ④ FCM이 초기화됐는가

```bash
curl https://chargesafe-zc39.onrender.com/api/push/status
```
→ `{"enabled":true}`

### ⑤ 센서 수신이 되는가

```bash
curl -X POST https://chargesafe-zc39.onrender.com/api/ingest/readings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: csk_실제키" \
  -d '{"temperature":35.2,"current_a":2.1,"voltage_v":12.6,"smoke":false}'
```
→ `{"level":"normal","cutoff":false,"fan":false, ...}`

### ⑥ 저장이 됐는가

Supabase SQL Editor:

```sql
SELECT * FROM device_status;
SELECT * FROM sensor_readings ORDER BY recorded_at DESC LIMIT 5;
```

---

## 15.7 배포 문제 해결

| 증상 | 원인 | 해결 |
|---|---|---|
| 빌드 실패 `package.json not found` | Root Directory 미입력 | `backend` 입력 |
| `ECONNREFUSED` / `ENETUNREACH` | Direct connection 사용 (IPv6) | **Session Pooler**로 교체 |
| `password authentication failed` | 대괄호 `[]` 남김 | 대괄호 제거 |
| 로그인은 되는데 API가 401 | `JWT_SECRET` 불일치 | 로컬과 같은 값인지 확인 |
| 첫 요청이 25초 걸림 | 무료 플랜 절전 | 정상. 15.3.11 참고 |
| 브라우저 콘솔 CORS 오류 | 출처 미허용 | `CORS_ORIGINS` 추가 |
| 푸시가 안 옴 | 서비스 계정 키 미주입 | `/api/push/status` 확인 |
| 배포는 됐는데 500 | 환경변수 누락 | Logs 탭에서 스택 확인 |
| `admin.credential.cert is not a function` | firebase-admin v14 구식 API | 모듈식 import 사용 |
| 새로고침하면 404 | SPA 폴백 미동작 | `frontend/dist` 존재 확인 |

**로그를 먼저 보세요.** Render 대시보드 → Logs 탭에 원인이 대부분 그대로 찍힙니다.

---

## 15.8 비용

### 현재 (전부 무료)

| 서비스 | 플랜 | 비용 |
|---|---|---|
| Render | Free | $0 |
| Supabase | Free | $0 |
| Firebase | Spark | $0 |
| GitHub | Free | $0 |
| **합계** | | **$0** |

### 트래픽 추정

| 항목 | 계산 |
|---|---|
| ESP32 1대 | 5초 간격 = 하루 약 17,000회 |
| 요청+응답 | 약 250바이트 |
| **기기 1대** | **약 130MB/월** |
| 기기 10대 | 약 1.3GB/월 |

Render 무료 한도가 **100GB/월**이므로 한참 여유가 있습니다.

### 유료로 넘어가는 시점

**대역폭 때문이 아닙니다.** 먼저 부딪히는 건 다음 둘입니다.

1. **Supabase 동시 연결 수** — 기기가 늘면 풀러 한도에 걸립니다
2. **DB 용량 500MB** — `sensor_readings` 누적

그때가 되면 Supabase Pro($25/월)와 Render Starter($7/월)를 고려하게 됩니다. **캡스톤 기간에는 해당 없습니다.**

---

## 15.9 호스팅 평가 5문항 정리

발표나 심사에서 나올 수 있는 질문에 대한 답변입니다.

### Q1. 실제로 실행해야 할 FastAPI/Python 서버가 있는가

**없습니다.** `.py`, `requirements.txt`, `pyproject.toml`, `Pipfile` 어느 것도 없습니다. Node.js + Express 단일 서버이며 의존성은 6개뿐입니다.

### Q2. Pages Functions 같은 서버리스로 대체 가능한가

**구조상 가능하나 사실상 재작성입니다.** 백그라운드 작업도, 웹소켓도, 서버 메모리 상태도 없이 전부 요청→응답으로 끝나므로 서버리스에 적합한 형태이긴 합니다.

문제는 라이브러리입니다.

| 현재 | Workers | 대안 |
|---|---|---|
| `firebase-admin` | ❌ 동작 안 함 | FCM HTTP v1 직접 호출 |
| `pg` | ⚠️ TCP 필요 | Hyperdrive |
| `jsonwebtoken` | ⚠️ Node crypto 의존 | `jose` |
| `express` | ❌ 핸들러 모델 상이 | `Hono` |
| `bcryptjs` | ⚠️ **CPU 한도 위험** | 비용 조정 |

콜드스타트만 문제라면 **같은 Node 코드를 그대로 쓰는 곳**으로 옮기는 게 훨씬 값싼 해결책입니다.

### Q3. 무료 인스턴스의 첫 요청 지연을 감수할 수 있는가

**대체로 괜찮습니다.** 실측 24.6초이나, 충전 중에는 발생하지 않고 안전 차단은 영향받지 않습니다. 다만 서버가 자던 중 위험 발생 시 **알림이 최대 50초 늦습니다.**

### Q4. 데이터가 Render 외부에 보관되는가

**완전히 외부입니다.** 모든 영속 데이터는 Supabase에 있고, 업로드 기능도 디스크 쓰기도 없습니다. 파일 접근은 읽기 3곳(설정·코드)뿐입니다. 인스턴스가 교체돼도 잃을 데이터가 없습니다.

### Q5. 사용량이 늘 때 비용을 감당할 수 있는가

**이 규모에선 부담 없습니다.** 기기당 130MB/월로 무료 한도에 한참 못 미칩니다. 진짜 제약은 비용이 아니라 **Supabase 연결 수와 센서 데이터 누적**입니다.

### 종합

①은 해당 없음, ④는 완전 통과, ⑤는 부담 없음. 판단이 필요한 건 ②·③인데 **둘 다 콜드스타트라는 같은 문제를 다르게 푸는 선택지**입니다.

**권고: 현재 구조 유지.** 서버리스 전환은 백엔드 대부분을 재작성해야 하고 bcrypt CPU 제약이라는 불확실성까지 있어 캡스톤 일정 대비 위험이 큽니다.

> 발표에서 이 질문이 나오면 **"안전 차단은 기기가 자체 판단하므로 서버 지연과 무관하다"** 가 가장 강한 답변입니다.

---

## 15.10 배포 관련 파일 정리

| 파일 | 역할 |
|---|---|
| `backend/render.yaml` | Render Blueprint (서비스 자동 구성) |
| `backend/DEPLOY.md` | 배포 단계별 가이드 |
| `backend/.env.example` | 환경변수 견본 (비밀값 없음) |
| `.gitignore` | 비밀값 커밋 차단 |
| `backend/package.json` | `engines.node >= 20`, start/build 스크립트 |

`package.json`의 `engines`가 중요합니다.

```json
"engines": { "node": ">=20" }
```

Render가 이 값을 읽어 Node 버전을 맞춥니다. 없으면 구버전이 선택돼 Express 5가 동작하지 않을 수 있습니다.

---

# 16. 현재 상태와 남은 일

## 현재 상태

| 항목 | 상태 |
|---|---|
| 브랜치 | `backend` |
| 커밋 | 13개 |
| 최신 커밋 | `docs: 문서에 적힌 Firebase 웹 설정값을 자리표시자로 교체` |
| 배포 | 가동 중 |
| 마이그레이션 | 8개 전부 적용 완료 (`008_pairing_sharing_recovery.sql` — 2026-08-09) |
| 미커밋 변경 | 기기 검색·보호자 공유·계정 복구·펌웨어 업데이트 (Render 서버는 아직 이전 버전) |

## 커밋 이력

```
b95e29e docs: 문서에 적힌 Firebase 웹 설정값을 자리표시자로 교체
e90d59a docs: 백엔드 구조 설명서와 서버 구축 정리 문서를 추가
ab73cee fix(security): public 스키마 전 테이블에 RLS 적용하고 anon 권한을 회수
e86af1b feat: 프론트엔드 monitoringApi 계약에 맞춰 모니터링·기기 설정 API 추가
59bcc9f fix: 루트 응답의 엔드포인트 목록을 실제 라우트와 일치시킴
ab44ed0 feat: 대시보드 6개 화면 기준으로 백엔드 정렬
ea79064 feat: replace dashboard with React frontend and wire it to the API
021d14c feat: add API info response at root path
5f20006 refactor: serve dashboard from frontend/ instead of backend/public
037e696 refactor(backend): reorganize code into api/database/notification layout
772d4a5 docs: main의 README 반영
f3b147b feat(backend): ChargeSafe 백엔드 API/DB 추가
6551651 Initial commit
```

## 백엔드 남은 작업

**없습니다.** 다만 통합에 필요한 두 가지가 다른 담당자 영역에 있습니다.

### ① 프론트엔드 담당

현재 프론트엔드는 **목 데이터로만 동작**합니다. 실제 fetch 는 `src/api/monitoringApi.js`
하나뿐이고 그마저 `USE_MOCK_DATA = true` 로 꺼져 있습니다.

> **작업 절차·화면별 코드 예시는 `ChargeSafe_프론트엔드_연동_가이드.md` 에 따로 정리했습니다.**
> 프론트엔드 담당은 그 문서 하나만 보면 됩니다. 여기서는 큰 순서만 적습니다.

**연동에 반드시 필요한 순서** (배포 환경 관련 내용은 15.5.6)

| # | 작업 | 파일 |
|---|---|---|
| 1 | 로그인을 실제 `POST /api/auth/login` 호출로 교체하고 토큰 저장 | `components/login/LoginForm.jsx`, `App.jsx` |
| 2 | 모든 요청에 `Authorization: Bearer <token>` 헤더 추가 | `api/monitoringApi.js` |
| 3 | `USE_MOCK_DATA` 를 `false` 로 변경 | `api/monitoringApi.js` |
| 4 | 나머지 화면(대시보드·기기·알림·이력·설정)도 목 데이터 대신 API 호출로 교체 | `pages/*`, `data/mock*.js` |

1~2를 건너뛰고 3만 하면 **전 요청이 401** 이 납니다.
백엔드 응답은 `data/mock*.js` 의 필드명에 맞춰 두었으므로 4는 값을 바꿔 끼우는 수준입니다.

**그 외**

- 분리 배포 시 `VITE_API_BASE_URL` 을 백엔드 주소로 설정 (빌드 시점에 박힘 — 15.5.8)
- 회원가입 2단계 화면이 아직 없습니다 (`onSignupNext` 가 `console.log` 만 함)
- FCM 을 다시 쓰려면 `public/firebase-config.js`·`firebase-messaging-sw.js`·토큰 등록 코드가 필요합니다 (15.2)

**백엔드는 준비됐고 화면만 붙이면 되는 것** (2026-08-09 추가, 마이그레이션 008)

| 기능 | 엔드포인트 |
|---|---|
| 주변 기기 검색 (`AddDeviceModal`) | `GET /api/devices/discoverable` → `POST /api/devices { serial_number }` |
| 보호자 공유·초대 | `POST /api/devices/:id/invites` → `POST /api/devices/invites/:code` |
| 아이디 찾기·비밀번호 재설정 | `POST /api/auth/find-id`, `POST /api/auth/reset-password[/request]` |
| 펌웨어 업데이트 실행 | `POST /api/devices/:id/firmware-update` |
| 프로필 수정·비밀번호 변경 | `PATCH /api/me`, `PATCH /api/me/password` |

> 아이디 찾기·비밀번호 재설정은 **전화번호로 본인을 확인**합니다. 지금 가입 화면은
> 전화번호를 받지 않으므로, 가입 2단계나 프로필 화면에서 `PATCH /api/me` 로 채워야
> 두 기능이 동작합니다.

### ② 하드웨어 담당

- ESP32 펌웨어에 실제 센서 연결
- 가이드: `Desktop\26-1 캡스톤디자인\ChargeSafe_ESP32_펌웨어\ESP32_연결_가이드.md`

## 장기 과제 (캡스톤 이후)

- `sensor_readings` 다운샘플링 정책
- 프론트엔드에서 `supabase-js` 직접 호출 시 RLS 정책 추가
- 콜드스타트 대응 (크론 또는 유료 전환)

---

## 관련 문서

| 문서 | 위치 |
|---|---|
| 백엔드 구조 설명서 | `26-1 캡스톤디자인\ChargeSafe_백엔드_구조_설명서.md` |
| **프론트엔드 연동 가이드** | `Chargesafe_Backend\backend\ChargeSafe_프론트엔드_연동_가이드.md` |
| ESP32 연결 가이드 | `26-1 캡스톤디자인\ChargeSafe_ESP32_펌웨어\ESP32_연결_가이드.md` |
| ESP32 펌웨어 | `26-1 캡스톤디자인\ChargeSafe_ESP32_펌웨어\chargesafe_esp32\chargesafe_esp32.ino` |
| 배포 가이드 | `Chargesafe_Backend\backend\DEPLOY.md` |
| 백엔드 README | `Chargesafe_Backend\backend\README.md` |
