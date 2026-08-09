# ChargeSafe 프론트엔드 연동 가이드

프론트엔드(`frontend/`)를 백엔드 API에 붙이는 방법을 순서대로 정리한 문서입니다.
백엔드 담당이 작성했고, **프론트엔드 담당이 읽고 작업하는 문서**입니다.

- 백엔드 전체 구조: `ChargeSafe_백엔드_구조_설명서.md`
- 서버 구축·배포: `ChargeSafe_서버구축_정리.md`
- API 요약표: `README.md`

**최종 수정** 2026-08-09 (마이그레이션 008 · 기기 검색·보호자 공유·계정 복구·펌웨어 업데이트 반영)

> **검증됨** — 이 문서의 코드와 응답 형태는 실제 서버에 붙여 확인했습니다.
> 2장의 `apiFetch` 를 그대로 실행해 문서에 적은 모든 엔드포인트를 호출하고,
> 응답의 키 목록과 상태 코드를 하나씩 대조했습니다. 프론트엔드 쪽 서술
> (파일·변수·컴포넌트 동작)도 실제 소스를 확인한 내용입니다.

---

## 0. 지금 상태

앱 전체에서 `fetch` 가 있는 파일은 `src/api/monitoringApi.js` **하나뿐**이고,
그마저 3번 줄 `USE_MOCK_DATA = true` 로 꺼져 있습니다. 나머지 화면은 전부
파일 상단 상수나 `data/mock*.js` 를 읽습니다. 즉 **연결된 화면은 0개**입니다.

연결을 막는 것은 네 가지입니다.

| # | 문제 | 위치 |
|---|---|---|
| ① | 로그인이 서버를 부르지 않음 | `components/login/LoginForm.jsx` — `console.log` 후 바로 성공 처리 |
| ② | 토큰을 저장하는 코드가 없음 | `App.jsx` 에 `removeItem("accessToken")` 만 있고 `setItem` 이 없음 |
| ③ | 요청에 `Authorization` 헤더가 없음 | `api/monitoringApi.js` 헤더에 `Content-Type` 뿐 |
| ④ | `node_modules` 미설치 · `.env` 없음 | `frontend/` |

**②③ 때문에 `USE_MOCK_DATA` 만 `false` 로 바꾸면 전 화면이 401 로 깨집니다.**
반드시 아래 순서대로 진행하세요.

> **CORS 는 이미 열려 있습니다.** `api/cors.js` 기본 허용 목록에 Vite 개발 서버
> `http://localhost:5173` 이 들어 있어 백엔드는 손댈 게 없습니다.

---

## 1. 준비

```bash
cd frontend
npm install
```

`frontend/.env` 를 새로 만듭니다.

```
VITE_API_BASE_URL=http://localhost:8000
```

> `VITE_` 환경변수는 **빌드 시점에 값이 문자열로 박힙니다.** 실행 중에 읽는 게 아니므로
> `.env` 를 고치면 dev 서버를 껐다 켜야 합니다. 파일이 없어도 코드의 기본값이
> `http://localhost:8000` 이고 백엔드 포트도 8000이라 로컬은 그대로 동작하지만,
> 배포할 때는 반드시 지정해야 합니다.

백엔드를 먼저 띄웁니다.

```bash
cd backend && npm start
```

```bash
cd frontend && npm run dev
```

---

## 2. 공용 클라이언트 (`src/api/client.js` — 새 파일)

토큰 저장과 `Authorization` 헤더를 여기서 한 번에 해결합니다.
이것만 만들어 두면 나머지 API 는 전부 한 줄짜리가 됩니다.

```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const TOKEN_KEY = "accessToken";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const apiFetch = async (path, options = {}) => {
  const token = getToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // 토큰이 만료됐거나 없는 경우 — 로그인 화면으로 되돌린다
  if (response.status === 401) {
    clearToken();
    const error = new Error("로그인이 필요합니다.");
    error.status = 401;
    throw error;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // 백엔드는 실패를 { error: "..." } 로 내려줍니다.
    // 사용자에게 그대로 보여줄 한글 안내가 있으면 message 가 함께 오므로 그쪽을 먼저 씁니다
    // (예: 기기 등록 실패 시 "기기 전원을 껐다 켠 뒤 10분 안에 등록해 주세요.").
    const error = new Error(data?.message ?? data?.error ?? "요청에 실패했습니다.");
    error.status = response.status;   // 6장에서 상태 코드로 분기할 때 씁니다
    throw error;
  }

  return data;
};
```

`error.status` 를 꼭 남겨 두세요. 6장의 기능들은 상태 코드로 분기해야 합니다
(예: 초대 코드가 `404` 없는 코드 / `409` 사용된 코드 / `410` 만료).

토큰 만료는 **7일**입니다. 만료되면 401 이 오고 위 코드가 토큰을 지웁니다.
`App.jsx` 에서 이 에러를 잡아 `setIsLoggedIn(false)` 로 돌려주면 됩니다.

---

## 3. 인증 (`src/api/authApi.js` — 새 파일)

**반드시 이것부터 합니다.** 토큰이 없으면 나머지 API 가 전부 401 입니다.

```js
import { apiFetch, setToken, clearToken } from "./client";

export const login = async ({ userId, password }) => {
  const data = await apiFetch("/api/auth/login", {
    method: "POST",
    body: { userId, password },
  });

  setToken(data.token);
  return data.user;
};

// signupType 은 SignupTypeSelector 의 "user"(사용자) / "guardian"(보호자)
export const register = ({ signupType, name, userId, password, phone }) =>
  apiFetch("/api/auth/register", {
    method: "POST",
    body: { signupType, name, userId, password, phone },
  });

export const logout = () => clearToken();
```

### `LoginForm.jsx` 수정

`handleSubmit` 안의 `console.log` 두 줄을 이걸로 바꿉니다.

```js
try {
  const user = await login(formData);
  onLoginSuccess?.(user);
} catch (error) {
  alert(error.message);
}
```

`handleSubmit` 을 `async` 로 바꾸는 것을 잊지 마세요.

### `SignupForm.jsx` / `App.jsx`

`onSignupNext` 가 지금 `console.log` 만 합니다. 가입은 한 번의 호출로 끝납니다.

```js
const handleSignupNext = async (signupData) => {
  try {
    await register(signupData);
    alert("가입이 완료되었습니다. 로그인해 주세요.");
    setAuthPage("login");
  } catch (error) {
    alert(error.message);   // 아이디 중복이면 "userId or email already registered"
  }
};
```

| 응답 | 의미 |
|---|---|
| 201 | 가입 성공 — `{ id, userId, email, name, phone, role }` |
| 400 | `password` 또는 `name` 누락 |
| 409 | 아이디(또는 이메일) 중복 |

> **가입 2단계 화면에서 전화번호를 받아 주세요.** 지금은 이름·아이디·비밀번호만 받습니다.
> 아이디 찾기와 비밀번호 재설정이 전화번호로 본인을 확인하므로, 전화번호가 없으면
> 그 두 기능을 쓸 수 없습니다. 이미 가입한 계정은 `PATCH /api/me` 로 채울 수 있습니다(6-4).
>
> `signupType` 에 `admin` 을 보내도 `guardian` 으로 저장됩니다(권한 상승 방지).

---

## 4. 화면별 API 모듈 (`src/api/chargesafeApi.js` — 새 파일)

응답 형태가 화면과 다른 두 곳(알림·이력)은 **여기서 맞춰 버립니다.**
그러면 페이지 컴포넌트는 목 데이터를 쓰던 때와 똑같은 모양으로 받습니다.

```js
import { apiFetch } from "./client";

// ── 공통 ──
export const getMe = () => apiFetch("/api/me");

// ── 기기 ──
export const getDevices = () => apiFetch("/api/devices");
export const updateDevice = (deviceId, patch) =>
  apiFetch(`/api/devices/${deviceId}`, { method: "PATCH", body: patch });
export const deleteDevice = (deviceId) =>
  apiFetch(`/api/devices/${deviceId}`, { method: "DELETE" });

// ── 화면 데이터 ──
export const getDashboard = (deviceId) =>
  apiFetch(`/api/devices/${deviceId}/dashboard`);

export const getHistory = async (deviceId) => {
  const data = await apiFetch(`/api/devices/${deviceId}/history`);
  return { histories: data.items, summary: data.summary };   // 형태 맞춤
};

export const getNotifications = async () => {
  const data = await apiFetch("/api/notifications");
  return data.items;                                          // 형태 맞춤
};
export const readNotification = (id) =>
  apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
export const readAllNotifications = () =>
  apiFetch("/api/notifications/read-all", { method: "POST" });

// ── 설정 ──
export const getSettings = () => apiFetch("/api/me/settings");
export const saveSettings = (patch) =>
  apiFetch("/api/me/settings", { method: "PATCH", body: patch });
```

`monitoringApi.js` 는 이미 있으므로 두 줄만 고칩니다.

```js
const USE_MOCK_DATA = false;                       // 3번 줄
// 그리고 fetch 를 apiFetch 로 교체 — 지금은 Authorization 이 없어 401 이 납니다
```

---

## 5. 화면별 교체 순서와 응답 형태

**권장 순서** — 하나씩 확인하면서 진행하세요.

```
로그인 → GET /api/me (헤더·사이드바) → 기기 목록 → 대시보드 → 이력·알림 → 설정
```

### 5-1. 공통 (`MainPage.jsx` 의 `MOCK_COMMON_DATA`)

```js
const data = await getMe();
```

```jsonc
{
  "deviceId": "CS-0042",          // 대표 기기(즐겨찾기 우선, 없으면 먼저 등록한 기기)
  "chargePercent": 63,
  "chargingStatus": "충전 중",     // 또는 "대기 중"
  "firmware": "최신",
  "user":     { "name": "김민구", "role": "사용자", "userId": "...", "email": "...", "phoneNumber": null },
  "guardian": { "name": "박산하", "relation": "딸", "phoneNumber": "010-..." }   // 없으면 null
}
```

`user.role` 은 이미 한글(`사용자`/`보호자`/`관리자`)로 내려옵니다.
`guardian` 은 **같은 기기를 함께 보는 다른 보호자**입니다. 혼자 쓰면 `null` 이므로
`CallConfirmModal` 을 열기 전에 `null` 검사를 넣어 주세요.

### 5-2. 대시보드 (`DashboardPage.jsx` 의 `MOCK_DASHBOARD_DATA`)

```js
const data = await getDashboard(deviceId);
```

`MOCK_DASHBOARD_DATA` 와 **필드 이름·구조가 같습니다.** 그대로 갈아 끼우면 됩니다.
`temperature`/`current`/`voltage` 는 `{ value, unit, status, progress }` 형태입니다.

**`null` 이 오는 경우가 있습니다.** 목 데이터에는 항상 값이 들어 있어서 놓치기 쉽습니다.

| 필드 | `null` 이 되는 조건 |
|---|---|
| `completionTime` · `completionPeriod` · `remainingTime` | 충전 중이 아니거나 충전 속도를 아직 계산하지 못함 |
| `batteryHealth` | 충전량이 기록된 완료 세션이 **2회 미만** |
| `aiConfidence` | 완료된 충전 세션이 **0회** (1회면 59, 2회 68 … 5회 이상 95로 올라감) |
| `emergencyAlert.title` · `time` · `level` | 미확인 위험·경고 알림 없음 (`exists: false`) |
| 센서 `value` | 아직 센서값을 받지 못함 (이때 `status` 는 `"수신 대기"`) |

**화면에서 손봐야 하는 두 곳** — 실제 컴포넌트를 확인한 결과입니다.

- **`SummarySection.jsx`** 는 `data.batteryHealth ?? 0` 으로 받는데,
  `getHealthDescription(null)` 이 `"위험 · 교체 권장"` 을 돌려줍니다.
  → 이력이 없는 새 계정에 **"배터리 건강도 0% · 위험 · 교체 권장"** 이 뜹니다.
  `null` 이면 `"—"` + `"측정 데이터 부족"` 처럼 따로 처리해 주세요. `aiConfidence` 도 같습니다.
- **`SensorCard.jsx`** 의 `value = "-"` 기본값은 **`undefined` 일 때만** 적용됩니다.
  서버는 `null` 을 보내므로 값 자리가 빈칸이 됩니다.
  → `value={data.temperature.value ?? "-"}` 로 넘겨 주세요.

`EmergencyAlert.jsx` 는 `!alert?.exists` 를 이미 검사하므로 그대로 두면 됩니다.

### 5-3. 모니터링

`monitoringApi.js` 를 그대로 쓰면 됩니다. `range` 는 `realtime | hour | today | week`
(프론트 `TimeRangeTabs` 의 id 와 같습니다).

```jsonc
{ "deviceId": "CS-0042", "range": "realtime", "updatedAt": "...",
  "measurements": [{ "timestamp": "...", "label": "14:03", "temperature": 31.2, "current": 1.2, "voltage": 12.4 }] }
```

센서 데이터가 없으면 `measurements` 가 빈 배열입니다(화면에 이미 "표시할 데이터가 없습니다" 처리가 있습니다).

### 5-4. 충전 이력

```js
const { histories, summary } = await getHistory(deviceId);
```

`mockChargingHistory` / `mockHistorySummary` 와 같은 형태입니다.

`status` 는 **세 가지**입니다. 목 데이터에는 두 가지뿐이라 주의가 필요합니다.

| `status` | 의미 | `ChargingHistoryRow` 현재 동작 |
|---|---|---|
| `completed` | 정상 완료 | "정상 완료" ✔ |
| `blocked` | 자동 차단 | "자동 차단" ✔ (`blockedReason` 에 "배터리 과열" 등이 함께 옵니다) |
| `charging` | **진행 중** | `blocked` 가 아니므로 **"정상 완료"로 잘못 표시됩니다** |

진행 중인 세션은 `endTime` 이 `"진행 중"`, `endBattery` 가 `0` 으로 옵니다.
`ChargingHistoryRow.jsx` 가 `history.status === "blocked"` 만 검사하므로
세 번째 분기를 추가해 주세요.

### 5-5. 알림 센터

```js
const notifications = await getNotifications();
```

`initialNotifications` 와 같은 형태(`type`, `title`, `message`, `dateGroup`, `time`, `isRead`)에
`deviceId`, `deviceName` 이 추가로 옵니다.

**읽음 처리를 서버에도 보내야 합니다.** 지금은 `setState` 만 해서 새로고침하면 초기화됩니다.

```js
const handleReadNotification = async (id) => {
  setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  try { await readNotification(id); } catch { /* 화면은 이미 읽음 처리됨 */ }
};
```

> `NotificationCenterPage` 가 자기 `useState` 로 알림을 따로 들고 있습니다.
> `MainPage` 의 상태와 이중으로 관리되고 있으니, 연동하면서 한쪽으로 합치는 게 좋습니다.

### 5-6. 기기 관리

```js
const devices = await getDevices();
```

`initialDevices` 와 같은 형태에 다음이 추가로 옵니다.

| 필드 | 용도 |
|---|---|
| `deviceId` | 내부 숫자 id — API 경로에는 `id`(시리얼)를 써도 되므로 보통 필요 없습니다 |
| `targetPercent`, `cutoffTemperature`, `automaticCutoff`, `coolingFan` | 기기별 설정 |
| `longChargeWarning`, `longChargeWarningHours` | 장시간 충전 경고 |
| `firmwareVersion`, `firmwareUpdating` | 펌웨어 버전 / 업데이트 요청 중 여부 |

`DeviceSettingsModal` 의 저장(`onSave`)과 즐겨찾기·삭제를 서버에 반영합니다.

```js
await updateDevice(device.id, { name, isFavorite });
await deleteDevice(device.id);
```

> `:id` 자리에는 화면에 보이는 기기 코드(`CS-0042`)와 내부 숫자 id 둘 다 쓸 수 있습니다.

### 5-7. 설정

```js
const settings = await getSettings();          // 화면 진입 시
await saveSettings({ themeMode: "dark" });     // 바뀐 항목만
```

`defaultSettings` 와 같은 필드명이고 `hasDevice` 가 추가로 옵니다.
**보낸 항목만 바뀌고** 나머지는 그대로 유지되므로, 토글 하나가 바뀔 때마다
그 항목만 보내면 됩니다.

| 저장 위치 | 필드 |
|---|---|
| 계정 | `pushNotifications`, `guardianNotifications`, `notificationSound`, `voiceGuide`, `largeText`, `themeMode` |
| **내 기기 전체** | `chargeMode`(또는 `targetPercent`), `coolingFan`, `automaticCutoff`, `cutoffTemperature`, `longChargeWarning` |

설정 화면에는 기기 선택이 없으므로, 기기 값은 **내 기기 전체에 같은 값**이 적용됩니다.
기기마다 다르게 두려면 `PATCH /api/devices/:id` 를 쓰세요.

- `chargeMode` 는 `batteryProtection`(85) / `eco`(80) / `normal`(90) / `full`(100)
  — `data/settingsData.js` 의 id 와 같습니다.
- **`chargeMode` 가 `null` 일 수 있습니다.** `targetPercent` 가 위 네 값 중 어느 것도 아닐 때입니다
  (`PATCH /api/devices/:id` 로 87 같은 값을 직접 넣은 경우). `SettingsPage` 는
  `chargeModes.find(...) ?? chargeModes[0]` 이라 이때 "배터리 보호"로 **잘못** 표시되므로,
  `null` 이면 `targetPercent` 를 숫자로 보여 주는 편이 정확합니다.
- **등록된 기기가 없으면** `hasDevice: false` 이고 기기 값은 저장되지 않습니다.
  이때 기기 설정 항목은 비활성화해 주세요.
- `themeMode` 는 서버에도 저장되지만 화면 적용은 `AppThemeContext` 가 localStorage 로 합니다.
  다른 기기에서 로그인해도 같은 테마가 나오게 하려면, 로그인 후 `getSettings()` 의
  `themeMode` 로 `setThemeMode()` 를 한 번 호출해 주세요.

---

## 6. 새로 추가된 기능 (화면만 붙이면 됩니다)

2026-08-09에 백엔드에 추가한 것들입니다. 프론트에 아직 화면이 없거나 목 데이터입니다.

### 6-1. 기기 추가 — `AddDeviceModal`

지금 `discoverableDevices` 가 하드코딩돼 있습니다. 브라우저는 주변 기기를 직접 검색할 수
없으므로(BLE·WiFi 스캔 불가), 서버가 **"지금 켜져 있고 아직 주인이 없는 기기"** 를 알려줍니다.

```js
export const getDiscoverableDevices = () => apiFetch("/api/devices/discoverable");
export const connectDevice = (serialNumber) =>
  apiFetch("/api/devices", { method: "POST", body: { serial_number: serialNumber } });
```

응답은 `discoverableDevices` 와 같은 형태(`id`, `name`, `location`, `signal`, `battery`, `firmware`)에
`pairingUntil`(등록 대기 만료 시각)이 추가로 옵니다.

```js
const handleConnectDevice = async (device) => {
  try {
    await connectDevice(device.id);
    setDevices(await getDevices());
  } catch (error) {
    alert(error.message);
  }
};
```

**사용자에게 안내해야 할 것** — 기기는 **전원을 껐다 켠 뒤 10분 동안만** 목록에 나타납니다.
목록이 비어 있으면 "기기 전원을 껐다 켠 뒤 다시 검색해 주세요" 를 보여 주세요.
시간이 지난 뒤 등록을 시도하면 409 와 함께 같은 안내 문구가 `message` 로 옵니다.

모달을 열 때마다 새로 조회하고, 3~5초 간격으로 다시 조회하면 "검색 중" UX 가 자연스럽습니다.

### 6-2. 보호자 공유 (화면 없음 — 새로 만들어야 합니다)

기기 하나를 여러 보호자가 함께 봅니다. 처음 등록한 사람이 **소유자**입니다.

```js
export const getMembers = (deviceId) => apiFetch(`/api/devices/${deviceId}/members`);
export const createInvite = (deviceId, relation) =>
  apiFetch(`/api/devices/${deviceId}/invites`, { method: "POST", body: { relation } });
export const acceptInvite = (code) =>
  apiFetch(`/api/devices/invites/${code}`, { method: "POST" });
export const removeMember = (deviceId, userId) =>
  apiFetch(`/api/devices/${deviceId}/members/${userId}`, { method: "DELETE" });
```

```
소유자    createInvite("CS-0042", "딸")  → { code: "UACZWAP7", expiresAt: "..." }
         (코드를 문자·카카오톡 등 앱 밖에서 전달)
받은 사람  acceptInvite("UACZWAP7")      → 참여 완료
```

- 코드는 **24시간 유효**, **한 번만** 사용 가능. 헷갈리는 글자(I, O, 0, 1)는 빠져 있습니다.
- `getMembers` 응답의 `isOwner` / `isMe` 로 화면을 나누면 됩니다.
- 초대 발급·취소와 다른 보호자 내보내기는 **소유자만** 가능합니다(아니면 403).

| 응답 | 의미 |
|---|---|
| 404 | 없는 코드 |
| 409 | 이미 사용된 코드 |
| 410 | 만료된 코드 |
| 403 | 소유자가 아님 |

### 6-3. 아이디 찾기 · 비밀번호 재설정 — 로그인 화면 버튼

```js
export const findUserId = (name, phone) =>
  apiFetch("/api/auth/find-id", { method: "POST", body: { name, phone } });

export const requestPasswordReset = (userId, name, phone) =>
  apiFetch("/api/auth/reset-password/request", { method: "POST", body: { userId, name, phone } });

export const resetPassword = (resetToken, password) =>
  apiFetch("/api/auth/reset-password", { method: "POST", body: { resetToken, password } });
```

- 아이디 찾기는 **앞 3글자만 보이고 나머지는 `*`** 인 형태로 돌려줍니다 (`kdk9696` → `kdk****`).
  로그인에 바로 쓸 수는 없고 "내 아이디가 이거였구나" 를 확인하는 용도입니다.
- 비밀번호 재설정은 2단계입니다. ①에서 받은 `resetToken` 을 ②에 넘깁니다
  (**30분 유효, 1회용**). 화면 상태로 들고 있다가 바로 쓰면 됩니다.
- 실패 응답: 404(일치하는 계정 없음), 429(시도 초과 — 10분에 5회), 400(만료·사용된 토큰).
- **전화번호가 등록된 계정만** 찾을 수 있습니다(3장 참고).

> ⚠️ 지금은 메일·문자 발송 수단이 없어 재설정 토큰을 응답으로 바로 돌려줍니다.
> 실제 서비스로 쓰려면 백엔드에서 메일·문자 발송으로 바꿔야 합니다(백엔드 담당).

### 6-4. 프로필 수정 · 비밀번호 변경 — 설정 화면의 `ProfileCard`

```js
export const updateProfile = (patch) => apiFetch("/api/me", { method: "PATCH", body: patch });
export const changePassword = (currentPassword, newPassword) =>
  apiFetch("/api/me/password", { method: "PATCH", body: { currentPassword, newPassword } });
```

`updateProfile({ name, phoneNumber, email })` — 보낸 항목만 바뀝니다.
`phoneNumber` 에 빈 문자열을 보내면 지워집니다. 이메일 중복은 409 입니다.

`changePassword` 는 현재 비밀번호가 틀리면 401 입니다.

### 6-5. 펌웨어 업데이트 — 기기 카드의 "업데이트 필요"

```js
export const requestFirmwareUpdate = (deviceId) =>
  apiFetch(`/api/devices/${deviceId}/firmware-update`, { method: "POST" });
```

서버는 기기에 직접 접속할 수 없어서(기기는 공유기 안쪽) **요청을 표시만** 해 둡니다.
기기가 다음 센서 전송 때 지시를 받아 가고, 업데이트를 마치면 자동으로 해제됩니다.

- 요청 직후 `GET /api/devices` 의 `firmwareUpdating` 이 `true` 가 됩니다
  → "업데이트 대기 중" 으로 표시하고 버튼을 비활성화하세요.
- 완료되면 `firmware` 가 `"최신"`, `firmwareUpdating` 이 `false` 로 돌아옵니다.
- 이미 최신이면 409 입니다.

---

## 7. 자주 걸리는 것

### 응답 형태가 화면과 다른 두 곳

| 위치 | 백엔드 | 화면 |
|---|---|---|
| 알림 | `{ items, unreadCount }` | 배열 그 자체 |
| 이력 | `{ items, summary }` | `histories`, `summary` 두 변수 |

4장의 API 모듈에서 이미 맞춰 두었으니 그대로 쓰면 됩니다.

### `longChargeWarning` 기본값 차이

프론트 `defaultSettings` 는 `false` 지만, 서버는 기기의 실제 저장값(기본 12시간)을 보므로
`true` 로 옵니다. **서버 값이 맞습니다.** 기기가 없을 때(`hasDevice: false`)만 무시하세요.

### 기기가 0대일 때

대시보드·모니터링·이력이 전부 빈 값입니다. `getDevices()` 가 빈 배열이면
기기 추가 화면으로 유도해 주세요. 기기 등록은 6-1 을 참고합니다.

### 로그인 상태 유지

지금은 새로고침하면 로그아웃됩니다(`isLoggedIn` 이 `useState(false)`).
`App.jsx` 에서 토큰이 있으면 로그인 상태로 시작하게 하면 됩니다.

```js
const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getToken()));
```

토큰이 만료됐으면 첫 API 호출에서 401 이 나므로, 그때 로그아웃 처리하면 됩니다.

### 백엔드 에러 형태

실패는 항상 `{ "error": "..." }` 입니다. 2장의 `apiFetch` 가 이걸 `Error.message` 로
바꿔 주므로 `catch (e) { alert(e.message) }` 로 그대로 보여 줄 수 있습니다.

---

## 8. 배포

| 위치 | 환경변수 |
|---|---|
| 프론트 (Vercel·Netlify 등) | `VITE_API_BASE_URL=https://chargesafe-zc39.onrender.com` |
| 백엔드 (Render) | `CORS_ORIGINS=https://<프론트-배포주소>` |

- `VITE_` 는 빌드 시점에 박히므로, 값을 바꿨으면 **다시 빌드**해야 합니다.
- SPA 라우팅을 쓰면 호스팅에서 404 → `index.html` 폴백을 켜 주세요.
- Render 무료 플랜은 **15분 무요청 시 잠들고, 깨어나는 데 약 25초**가 걸립니다(실측 24.6초).
  오랜만에 대시보드를 열 때만 생기는 지연이므로, 로딩 표시를 넉넉하게 잡아 주세요.

---

## 9. 체크리스트

- [ ] `npm install` · `frontend/.env` 생성
- [ ] `src/api/client.js` 추가 (토큰 저장 + `Authorization` 헤더)
- [ ] 로그인이 실제 API 를 부르고 토큰을 저장
- [ ] 회원가입이 실제 API 를 부름 (전화번호 입력 포함)
- [ ] `USE_MOCK_DATA = false` · `monitoringApi.js` 를 `apiFetch` 로 교체
- [ ] 화면을 API 로 교체 (공통 → 대시보드 → 모니터링 → 이력 → 알림 → 기기 → 설정)
- [ ] `batteryHealth`·`aiConfidence`·센서 `value` 의 `null` 처리 (5-2)
- [ ] 충전 이력의 `charging`(진행 중) 상태 분기 추가 (5-4)
- [ ] 알림 읽음 처리를 서버에도 반영
- [ ] 기기 추가를 `discoverable` API 로 교체
- [ ] 새로고침해도 로그인이 유지되는지 확인
- [ ] F12 → Network 에서 401 · CORS 오류가 없는지 확인

여유가 되면: 보호자 공유 화면, 아이디 찾기·비밀번호 재설정 화면,
프로필 수정·비밀번호 변경, 펌웨어 업데이트 버튼.

---

## 10. 백엔드에 없는 것

| 화면 요소 | 상태 |
|---|---|
| 펌웨어 파일 배포 | 업데이트 **지시**만 있습니다. 실제 바이너리 호스팅은 하드웨어 담당 |
| 알림음 · 음성 안내 · 큰 글씨 | 값은 저장되지만 실제 동작은 화면에서 처리해야 합니다 |
| 긴급 전화 · 대응 가이드 | 백엔드 불필요 (`tel:` 링크). 보호자 번호는 `GET /api/me` 가 내려줍니다 |
| FCM 푸시 수신 | 백엔드 발송 코드는 있으나, 프론트에 토큰 등록 코드가 없어 `push_tokens` 가 비어 있습니다. 알림 센터는 정상 동작합니다 |

필요한 API 가 더 있으면 백엔드 담당에게 알려 주세요.
