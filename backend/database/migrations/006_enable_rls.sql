-- Supabase Database Linter(Security Advisor)가 지적한
-- rls_disabled_in_public / sensitive_columns_exposed 오류 대응.
--
-- Supabase는 public 스키마의 모든 테이블을 PostgREST REST API로 자동 공개한다.
-- anon key는 프론트엔드에 노출되는 공개 키이므로, 아무 보호가 없으면
-- 외부에서 users.password_hash, devices.api_key_hash, push_tokens.token 까지
-- 읽고 쓸 수 있다 (실제로 anon 롤에 INSERT/UPDATE/DELETE/TRUNCATE 까지 부여돼 있었다).
--
-- 이 백엔드는 PostgREST를 쓰지 않고 pg Pool로 직접 접속하며(database/db.js),
-- 접속 롤 postgres 가 테이블 소유자라 RLS를 우회한다.
-- 따라서 정책(POLICY)을 하나도 만들지 않고 RLS만 켜서
-- "외부 API 전면 차단 / 백엔드는 그대로" 상태로 만든다.
--
-- 주의: 나중에 프론트엔드에서 supabase-js로 DB를 직접 호출할 계획이 생기면
-- 그때 auth.uid() 기반 정책을 별도 마이그레이션으로 추가해야 한다.

ALTER TABLE public.users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charging_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_status     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- 2차 방어선 — RLS 설정을 실수로 되돌리더라도 권한 자체가 없으면 접근이 막힌다.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- 앞으로 생길 테이블도 기본적으로 차단 (새 마이그레이션에서 놓치는 것을 방지)
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
