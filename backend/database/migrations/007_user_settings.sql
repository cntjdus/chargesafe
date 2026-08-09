-- 회원가입 화면이 "사용자 / 보호자" 두 유형을 고르게 하므로 역할 값을 명시한다.
-- 지금까지는 제약이 없어 아무 문자열이나 들어갈 수 있었다.
-- admin 은 화면에서 만들 수 없고 DB에서 직접 지정한다 (권한 상승 방지).
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('user', 'guardian', 'admin'));

-- 설정 화면에서 계정 단위로 저장하는 값들.
-- 기기 단위 설정(온도 차단·자동 차단·냉각팬·장시간 경고·목표 충전량)은
-- 005_device_settings.sql 에서 devices 테이블에 두었다.
--
-- 행이 없는 계정은 아래 DEFAULT 와 같은 값으로 동작한다
-- (api/me.routes.js 의 DEFAULT_USER_SETTINGS 와 같은 값을 유지할 것).
CREATE TABLE user_settings (
    user_id                BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- 알림 설정
    push_notifications     BOOLEAN NOT NULL DEFAULT true,
    guardian_notifications BOOLEAN NOT NULL DEFAULT false,
    notification_sound     BOOLEAN NOT NULL DEFAULT false,
    -- 접근성 설정
    voice_guide            BOOLEAN NOT NULL DEFAULT true,
    large_text             BOOLEAN NOT NULL DEFAULT false,
    theme_mode             VARCHAR(10) NOT NULL DEFAULT 'light'
      CONSTRAINT user_settings_theme_mode_check
      CHECK (theme_mode IN ('light', 'dark', 'custom')),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 006_enable_rls.sql 과 같은 이유 — 새 테이블도 PostgREST 자동 공개를 막는다.
-- (권한 회수는 006 의 ALTER DEFAULT PRIVILEGES 가 이미 적용하지만 RLS 는 테이블마다 켜야 한다)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
