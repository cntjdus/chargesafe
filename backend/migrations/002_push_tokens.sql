-- 보호자 브라우저의 FCM 푸시 토큰 (한 계정이 여러 기기/브라우저에서 받을 수 있음)
CREATE TABLE push_tokens (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token        TEXT UNIQUE NOT NULL,
    user_agent   VARCHAR(255),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ
);
CREATE INDEX idx_push_tokens_user ON push_tokens (user_id);
