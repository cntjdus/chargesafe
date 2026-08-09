-- 프론트엔드 화면에는 있는데 백엔드에 없던 기능들을 위한 스키마.
--   ① 기기 검색·페어링  — AddDeviceModal 의 "주변 ChargeSafe 기기를 검색합니다"
--   ② 보호자 공유       — 한 기기를 여러 보호자가 함께 보기
--   ③ 계정 복구         — 로그인 화면의 "아이디 찾기 / 비밀번호 재설정"
--   ④ 펌웨어 업데이트   — 기기 카드의 "업데이트 필요"

-- ── ① 기기 검색·페어링 ────────────────────────────────────────
-- 웹 브라우저는 주변 기기를 직접 검색할 수 없다(BLE·WiFi 스캔 불가).
-- 대신 "아직 주인이 없는 기기가 방금 켜져서 서버로 신호를 보내는 중"이면
-- 등록 대기 상태로 보고 목록에 띄운다.
--
-- 이 시각은 ingest.service.js 가 채운다 — 기기가 10분 이상 끊겼다가 다시
-- 신호를 보내는 순간(= 전원을 껐다 켠 순간)부터 10분간 열린다.
-- 기기 전원을 껐다 켤 수 있는 사람은 기기 앞에 있는 사람뿐이므로,
-- 이 시간 제한이 사실상의 물리적 인증 역할을 한다.
ALTER TABLE devices ADD COLUMN pairing_until TIMESTAMPTZ;

-- ── ④ 펌웨어 업데이트 ─────────────────────────────────────────
-- 서버가 기기에 직접 접속할 수는 없다(기기는 공유기 안쪽에 있다).
-- 그래서 보호자가 업데이트를 요청하면 여기에 표시만 해 두고,
-- 기기가 다음 센서 전송에 대한 응답으로 그 지시를 받아 간다.
ALTER TABLE devices ADD COLUMN firmware_update_requested BOOLEAN NOT NULL DEFAULT false;

-- ── ② 보호자 공유 ─────────────────────────────────────────────
-- 누가 이 기기를 처음 등록했는지(소유자) 가리기 위해 참여 시각을 남긴다.
-- 초대 코드 발급과 다른 보호자 내보내기는 소유자만 할 수 있다.
ALTER TABLE user_devices ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 초대 코드 — 소유자가 만들고, 코드를 받은 사람이 한 번만 쓸 수 있다.
-- 코드에는 헷갈리는 글자(I, O, 0, 1)를 뺀 32자만 사용한다 (devices.routes.js).
CREATE TABLE device_invites (
    code       VARCHAR(8) PRIMARY KEY,
    device_id  BIGINT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relation   VARCHAR(20),                -- "딸", "아들" 등 — 설정 화면에 표시된다
    expires_at TIMESTAMPTZ NOT NULL,
    used_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_invites_device ON device_invites (device_id, created_at DESC);

-- ── ③ 비밀번호 재설정 ─────────────────────────────────────────
-- 토큰 원문은 저장하지 않고 해시만 둔다 (devices.api_key_hash 와 같은 방식).
-- 토큰이 유출돼도 DB만으로는 재설정을 할 수 없다.
CREATE TABLE password_resets (
    token_hash VARCHAR(64) PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_password_resets_user ON password_resets (user_id, created_at DESC);

-- 006_enable_rls.sql 과 같은 이유 — 새 테이블도 PostgREST 자동 공개를 막는다.
-- (권한 회수는 006 의 ALTER DEFAULT PRIVILEGES 가 이미 적용하지만 RLS 는 테이블마다 켜야 한다)
ALTER TABLE public.device_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;
