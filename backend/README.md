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

`http://localhost:8000` 에 접속하면 보호자 대시보드가 열립니다.
(`/health` 가 `{"status":"ok"}` 를 반환하면 서버 정상. 대시보드를 빌드하지 않았다면
루트 경로는 API 안내 JSON을 반환합니다.)

대시보드를 수정하며 개발할 때는 Vite 개발 서버를 함께 쓰면 편합니다
(`/api` 요청은 자동으로 8000번 백엔드로 전달됩니다):

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
  cors.js                     다른 주소의 프론트엔드 호출 허용 (CORS)
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
    004_notification_types.sql 알림 유형(완료·정보)·보호자 관계
    005_device_settings.sql   기기별 안전 설정(온도 차단·자동 차단·냉각팬·장시간 경고)
    006_enable_rls.sql        전 테이블 RLS 적용·anon 권한 회수 (외부 직접 접근 차단)
    007_user_settings.sql     계정별 설정(알림·접근성·테마)·가입 유형(role) 제약
    008_pairing_sharing_recovery.sql
                              기기 페어링·보호자 초대·비밀번호 재설정·펌웨어 업데이트 표시

notification/                 보호자 알림
  notification.service.js     FCM 발송 + notifications 테이블 기록
  firebase.js                 Firebase Admin(FCM) 초기화

render.yaml / DEPLOY.md        배포 설정 및 가이드
.env.example                   환경 변수 예시
ChargeSafe_프론트엔드_연동_가이드.md   프론트엔드 담당용 연동 절차
ChargeSafe_백엔드_구조_설명서.md       백엔드 전체 구조·설계 근거
ChargeSafe_서버구축_정리.md            Supabase·Firebase·Render 구축 기록
```

대시보드(`../frontend`)는 React 19 + Vite + styled-components 앱입니다.

```
frontend/
  index.html                  진입점 (Vite)
  vite.config.js              플러그인만 설정 (프록시 없음 — 절대 주소로 호출)
  src/
    App.jsx                   스플래시 → 로그인/회원가입 → MainPage 전환
    pages/                    MainPage(사이드바+헤더) 아래 6개 화면
                              대시보드 / 모니터링 / 충전이력 / 알림센터 / 기기관리 / 설정
    api/monitoringApi.js      백엔드 호출 (현재 USE_MOCK_DATA = true)
    data/mock*.js             화면별 목 데이터 — 백엔드 응답 형태의 기준
    components/               화면별 컴포넌트 (dashboard·device·monitoring·settings 등)
    contexts/AppThemeContext  라이트/다크/고대비 테마
    styles/                   styled-components 테마·전역 스타일
  public/                     favicon.svg, icons.svg
  dist/                       빌드 결과 — 백엔드가 이 폴더를 서빙
```

> **현재 프론트엔드는 목 데이터로 동작합니다.** 실제 호출은 `api/monitoringApi.js`
> 하나뿐이고 그마저 `USE_MOCK_DATA = true` 로 꺼져 있습니다. 로그인도 토큰을 저장하지
> 않습니다. 연동에 필요한 작업은 아래 "프론트엔드 연동" 항목을 참고하세요.

> 프론트엔드(`frontend/`)와 비밀값(`.env`, `firebase-service-account.json`)은
> `.gitignore`로 저장소에서 제외됩니다. 로컬 개발용으로만 존재합니다.

### 프론트엔드 연동

> **전체 절차와 화면별 코드 예시는 [`ChargeSafe_프론트엔드_연동_가이드.md`](./ChargeSafe_프론트엔드_연동_가이드.md) 에 있습니다.**
> 프론트엔드 담당은 그 문서만 보면 됩니다.

백엔드 응답은 프론트 `data/mock*.js` 의 필드명에 맞춰 두었으므로 값을 갈아 끼우는 수준이지만,
**순서가 중요합니다.**

1. **토큰 저장 + `Authorization` 헤더** — 로그인이 지금 서버를 부르지 않고, 토큰을 저장하는
   코드도 없습니다.

   ```js
   headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
   ```

2. `src/api/monitoringApi.js` 의 `USE_MOCK_DATA` 를 `false` 로 변경
   기본 주소가 `http://localhost:8000` 이라 로컬은 그대로 동작합니다.
   분리 배포 시에는 프론트 `.env` 에 `VITE_API_BASE_URL` 을 지정합니다(빌드 시점에 반영).

**1을 건너뛰고 2만 하면 전 화면이 401 로 깨집니다.**

CORS 는 이미 열려 있습니다 (`api/cors.js` 기본 허용 목록에 Vite 개발 서버 `:5173` 포함).

## API 요약

### 보호자용 (JWT — `Authorization: Bearer <token>`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/auth/register` | 회원가입 `{ userId, password, name, signupType?, email?, phone? }` |
| POST | `/api/auth/login` | 로그인 `{ userId, password }` → `{ token, user }` (아이디·이메일 모두 허용) |
| POST | `/api/auth/find-id` | 아이디 찾기 `{ name, phone }` → 가려진 아이디 |
| POST | `/api/auth/reset-password/request` | 비밀번호 재설정 ① 본인 확인 `{ userId, name, phone }` → 토큰 |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 ② `{ resetToken, password }` |
| GET | `/api/me` | 프로필·보호자·대표 기기 (상단바/설정 화면 공통 정보) |
| PATCH | `/api/me` | 프로필 수정 `{ name?, phoneNumber?, email? }` |
| PATCH | `/api/me/password` | 비밀번호 변경 `{ currentPassword, newPassword }` |
| GET | `/api/me/settings` | 설정 화면 전체 값 한 번에 조회 |
| PATCH | `/api/me/settings` | 설정 저장 (보낸 항목만 변경) |
| GET | `/api/devices` | 내 기기 목록 (화면용 형태: `battery`, `status`, `firmware`, `isFavorite` 등) |
| GET | `/api/devices/discoverable` | 등록 대기 중인 기기 (기기 추가 화면의 "주변 기기 검색") |
| POST | `/api/devices` | 기기 등록 `{ serial_number, name?, location?, provisionOnly? }` |
| PATCH | `/api/devices/:id` | 기기 설정 수정 (아래 표 참고) |
| GET | `/api/devices/:id/members` | 이 기기를 함께 보는 보호자 목록 |
| POST | `/api/devices/:id/invites` | 보호자 초대 코드 발급 `{ relation? }` (소유자만) |
| GET | `/api/devices/:id/invites` | 아직 쓰지 않은 초대 코드 목록 (소유자만) |
| DELETE | `/api/devices/:id/invites/:code` | 초대 코드 취소 (소유자만) |
| POST | `/api/devices/invites/:code` | 초대 코드로 기기 공유에 참여 |
| PATCH | `/api/devices/:id/members/:userId` | 보호자 관계·알림 수신 수정 |
| DELETE | `/api/devices/:id/members/:userId` | 보호자 내보내기 (소유자만) |
| POST | `/api/devices/:id/firmware-update` | 펌웨어 업데이트 요청 |
| GET | `/api/devices/:id/monitoring` | 모니터링 그래프 (`?range=realtime\|hour\|today\|week`) |
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

> `:id` 는 내부 숫자 id 와 시리얼 번호(화면에 보이는 기기 코드) 둘 다 사용할 수 있습니다.

**`PATCH /api/devices/:id` 로 저장할 수 있는 값** (설정 화면 항목)

| 필드 | 범위 | 설명 |
|---|---|---|
| `name`, `location` | 문자열 | 기기 이름·설치 위치 |
| `isFavorite` | true/false | 즐겨찾기 (목록 상단 고정) |
| `targetPercent` | 50~100 | 충전 모드의 목표 충전량 |
| `cutoffTemperature` | 40~65 | 온도 차단 기준 (위험 판단에 즉시 반영) |
| `automaticCutoff` | true/false | 끄면 위험이어도 강제 차단하지 않음 |
| `coolingFan` | true/false | 주의 단계 이상에서 냉각팬 작동 여부 |
| `longChargeWarningHours` | 0~48 | 장시간 충전 경고 기준 (0이면 사용 안 함) |
| `longChargeWarning` | true/false | 위 항목의 켜기/끄기 스위치. 켜면 이전 시간(없으면 12), 끄면 0 |

### 설정 화면 (`/api/me/settings`)

설정 화면에는 기기 선택이 없으므로, 계정 단위 값과 기기 단위 값을 한 번에 다룹니다.

| 필드 | 저장 위치 | 비고 |
|---|---|---|
| `pushNotifications` | 계정 | 끄면 FCM 푸시를 보내지 않음 (알림 센터 기록은 남음) |
| `guardianNotifications` | 계정 | 위험 감지 시 보호자 자동 알림 |
| `notificationSound` | 계정 | 알림음 |
| `voiceGuide`, `largeText` | 계정 | 접근성 |
| `themeMode` | 계정 | `light` / `dark` / `custom` |
| `chargeMode` | **내 기기 전체** | `batteryProtection`(85) / `eco`(80) / `normal`(90) / `full`(100) |
| `targetPercent` | **내 기기 전체** | `chargeMode` 대신 숫자로 직접 지정 |
| `coolingFan`, `automaticCutoff` | **내 기기 전체** | |
| `cutoffTemperature` | **내 기기 전체** | 40~65 |
| `longChargeWarning` / `longChargeWarningHours` | **내 기기 전체** | |

- 조회 시 기기 값은 **대표 기기**(즐겨찾기 우선, 없으면 먼저 등록한 기기) 기준입니다.
- 저장 시 기기 값은 **내 기기 전체**에 같은 값이 적용됩니다. 기기마다 다르게 두려면 `PATCH /api/devices/:id` 를 쓰세요.
- 등록된 기기가 없으면 응답의 `hasDevice` 가 `false` 이고, 기기 값은 저장되지 않습니다.

### 기기 검색·등록 (`AddDeviceModal`)

브라우저는 주변 기기를 직접 검색할 수 없습니다(BLE·WiFi 스캔 불가). 대신 서버가
**"지금 켜져 있고 아직 주인이 없는 기기"** 를 대신 알려줍니다.

```
① 기기를 만들 때  POST /api/devices { serial_number, provisionOnly: true }
                  → API 키를 발급받아 ESP32 에 심는다 (내 목록에는 들어가지 않는다)
② 사용자가 전원을 켠다
                  → 첫 센서 전송 시 10분짜리 "등록 대기" 시간이 열린다
③ 앱에서 기기 추가  GET  /api/devices/discoverable   → 목록에 나타난다
                  POST /api/devices { serial_number } → 내 기기로 연결
```

- ③에서는 **API 키를 새로 만들지 않습니다**(응답의 `api_key` 가 `null`). 기기에 이미
  키가 심어져 있으므로 새로 만들면 인증이 깨집니다.
- 등록 대기 시간이 지난 기기를 등록하려 하면 409 입니다. 기기 전원을 다시 껐다 켜세요.
- 이미 주인이 있는 기기는 어떤 계정에서도 검색되지 않습니다.
- 전원을 껐다 켤 수 있는 사람 = 기기 앞에 있는 사람 이라는 점을 인증 대신 씁니다.
  같은 네트워크 안의 다른 계정이 10분 안에 먼저 가져갈 수 있다는 뜻이므로,
  더 엄격하게 하려면 기기에 페어링 버튼을 두는 방식으로 바꿔야 합니다.

### 보호자 공유

기기 하나를 여러 보호자가 함께 봅니다. 처음 등록한 사람이 **소유자**입니다.

```
소유자   POST /api/devices/:id/invites { relation: "딸" } → { code: "UACZWAP7" }
         (코드는 앱 밖에서 전달 — 문자·카카오톡 등)
받은 사람 POST /api/devices/invites/UACZWAP7 → 참여 완료
```

- 코드는 **24시간 유효**하고 **한 번만** 쓸 수 있습니다.
- 초대 코드 발급·취소와 다른 보호자 내보내기는 소유자만 할 수 있습니다.
- 참여한 보호자는 같은 기기의 대시보드·알림을 그대로 받습니다.
- 참여하지 않은 계정에는 기기의 존재 자체가 보이지 않습니다(404).

### 계정 복구

> ⚠️ **메일·문자 발송 수단이 없어 본인 확인을 이름 + 전화번호로만 합니다.**
> 재설정 토큰도 응답으로 바로 돌려줍니다. 실제 서비스로 쓰려면
> `auth.routes.js` 의 `reset-password/request` 응답에서 토큰을 빼고
> 메일·문자로 보내야 합니다(그 외 코드는 그대로 두어도 됩니다).

지금 가입 화면은 전화번호를 받지 않으므로, **`PATCH /api/me` 로 전화번호를 먼저
채워야** 아이디 찾기·비밀번호 재설정이 동작합니다. 계정 복구 엔드포인트는
IP 기준 10분에 5회로 제한됩니다.

### 펌웨어 업데이트

서버는 기기에 직접 접속할 수 없습니다(기기는 공유기 안쪽에 있습니다). 그래서
요청을 표시만 해 두고 기기가 다음 센서 전송의 응답으로 지시를 받아 갑니다.

```
보호자  POST /api/devices/:id/firmware-update
기기    POST /api/ingest/readings { ..., firmware_version: "0.9.0" }
        → 응답 { firmware: { update: true, version: "1.0.0", url: "..." } }
        업데이트 후 firmware_version 을 "1.0.0" 으로 보고하면 표시가 자동 해제된다
```

- 최신 버전(`LATEST_FIRMWARE_VERSION`, 기본 `1.0.0`)과 같으면 요청 시 409 입니다.
- 내려받을 주소는 `FIRMWARE_UPDATE_URL` 환경 변수로 지정합니다(없으면 `null`).
- 기기가 `firmware_version` 을 보내지 않으면 버전 표시는 갱신되지 않습니다.

**가입 유형** — `POST /api/auth/register` 의 `signupType` 은 `user`(사용자) / `guardian`(보호자)만 받습니다.
그 외 값(`admin` 포함)은 `guardian` 으로 처리되어, 화면에서 관리자 계정을 만들 수 없습니다.

**`GET /api/devices/:id/monitoring` 응답**

```json
{
  "deviceId": "CS-0042",
  "range": "realtime",
  "updatedAt": "2026-07-28T01:57:00.000Z",
  "measurements": [
    { "timestamp": "...", "label": "01:57", "temperature": 31.6, "current": 1.2, "voltage": 12.34 }
  ]
}
```

구간별로 시간 버킷 평균을 내어 점 개수를 고정합니다 —
실시간 15초×24개 / 1시간 2분×30개 / 오늘 1시간×24개 / 7일 6시간×28개.

### 기기용 (API 키 — `X-API-Key: csk_...`)

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/ingest/readings` | 센서 데이터 전송 |

ESP32 전송 예시:

```bash
curl -X POST http://localhost:8000/api/ingest/readings \
  -H "X-API-Key: csk_발급받은키" \
  -H "Content-Type: application/json" \
  -d '{"charging": true, "temperature": 32.0, "current_a": 1.2, "voltage_v": 12.4, "smoke": false, "firmware_version": "1.0.0"}'
```

응답으로 기기가 할 일을 함께 내려줍니다.

| 필드 | 의미 |
|---|---|
| `level` | `normal` / `caution` / `warning` / `danger` |
| `cutoff` | `true` 면 충전을 끊는다 (위험 + 자동 차단 설정이 켜져 있을 때) |
| `fan` | `true` 면 냉각팬을 켠다 (주의 단계 이상 + 냉각팬 설정이 켜져 있을 때) |
| `firmware.update` | `true` 면 `firmware.url` 에서 `firmware.version` 을 내려받아 업데이트 |

`firmware_version` 은 선택 항목이지만, 보내면 기기 카드의 펌웨어 표시가 갱신되고
업데이트 완료 여부를 서버가 스스로 판단할 수 있습니다.
펌웨어 업데이트는 충전이 끝난 뒤(`charging: false`)에 진행하세요.

## 동작 방식

1. ESP32가 주기적으로 `/api/ingest/readings` 로 센서값을 전송합니다.
2. `charging: true` 인데 열린 세션이 없으면 충전 세션을 자동 생성하고, `charging: false` 가 오면 세션을 닫으면서 최고 온도·최대 전류를 집계합니다.
3. 매 수신마다 위험 단계를 판단해 `sensor_readings` 에 저장하고 `device_status` 를 갱신합니다.
4. 단계가 경고 이상으로 올라가는 순간 `risk_events` 에 기록하고 보호자에게 알림을 생성합니다 (같은 단계가 반복돼도 중복 알림은 발생하지 않습니다).
5. 충전이 정상 종료되면 "충전 완료", 오랫동안 끊겼던 기기가 다시 데이터를 보내면 "기기 연결됨" 알림을 남깁니다.
6. 그때 그 기기에 아직 주인이 없으면 10분짜리 등록 대기 시간이 열려 "주변 기기 검색"에 나타납니다.

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

> **현재 프론트엔드에는 FCM 코드가 없습니다.** 이전 버전에 있던 `public/firebase-config.js`,
> `public/firebase-messaging-sw.js`, `src/lib/push.ts` 가 프론트 교체 과정에서 사라졌습니다.
> 따라서 `push_tokens` 테이블이 비어 있어 **푸시는 실제로 발송되지 않습니다.**
> 위험 알림은 `notifications` 테이블에 그대로 기록되므로 **알림 센터 화면은 정상 동작**합니다.
> 백엔드 쪽 발송 코드(`notification/`)는 그대로 두었으니, 프론트에 아래 3~5번이 다시 들어오면
> 추가 작업 없이 동작합니다.

Firebase 프로젝트의 키 3가지를 넣으면 동작합니다.
설정하지 않으면 알림은 DB에만 기록됩니다 (앱 알림 탭에서는 계속 보임).

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 (이름 예: `chargesafe`)
2. **서비스 계정 키 저장** (백엔드 — 지금 바로 가능) — 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성" →
   내려받은 JSON 파일을 `backend/` 폴더에 `firebase-service-account.json`으로 저장하고
   `backend/.env`에 `FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json` 추가 (이 파일은 절대 깃에 올리지 말 것 — .gitignore에 등록됨)
3. **웹 앱 설정 붙여넣기** (프론트) — 프로젝트 설정 → 일반 → "내 앱" → 웹 앱(`</>`) 추가 →
   표시되는 `firebaseConfig` 객체를 프론트의 `public/firebase-config.js`에 `FIREBASE_CONFIG`로 저장
4. **VAPID 키 붙여넣기** (프론트) — 프로젝트 설정 → 클라우드 메시징 → 웹 푸시 인증서 → "키 쌍 생성" →
   키 문자열을 같은 파일의 `FIREBASE_VAPID_KEY`에 붙여넣기
5. 프론트에서 토큰을 발급받아 `POST /api/push/register` 로 등록 (설정 화면의 "푸시 알림" 토글)

동작 방식: 경고/위험 단계 진입 시 서버가 보호자의 등록된 모든 브라우저로 푸시를 발송하고,
결과(sent/failed/pending)를 `notifications` 테이블에 기록합니다. 만료된 토큰은 자동 삭제됩니다.
탭이 백그라운드이거나 닫혀 있어도 `firebase-messaging-sw.js` 서비스 워커가 알림을 표시합니다.
설정 화면에서 **푸시 알림을 끈 계정은 발송 대상에서 제외**되며, 알림 센터 기록은 그대로 남습니다.

## TODO

- [ ] 대시보드 실시간 갱신 (Supabase Realtime 또는 WebSocket)
- [ ] 센서 데이터 다운샘플링 / 보존 정책
