CREATE TYPE risk_level AS ENUM ('normal', 'caution', 'warning', 'danger');

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    role          VARCHAR(20) NOT NULL DEFAULT 'guardian',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devices (
    id            BIGSERIAL PRIMARY KEY,
    serial_number VARCHAR(64) UNIQUE NOT NULL,
    api_key_hash  VARCHAR(255) NOT NULL,
    name          VARCHAR(100),
    location      VARCHAR(255),
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_devices (
    user_id   BIGINT REFERENCES users(id) ON DELETE CASCADE,
    device_id BIGINT REFERENCES devices(id) ON DELETE CASCADE,
    notify    BOOLEAN NOT NULL DEFAULT true,
    PRIMARY KEY (user_id, device_id)
);

CREATE TABLE charging_sessions (
    id           BIGSERIAL PRIMARY KEY,
    device_id    BIGINT NOT NULL REFERENCES devices(id),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at     TIMESTAMPTZ,
    end_reason   VARCHAR(20),
    max_temp     NUMERIC(5,2),
    max_current  NUMERIC(6,3),
    auto_cutoff  BOOLEAN NOT NULL DEFAULT false,
    cutoff_cause VARCHAR(50)
);
CREATE INDEX idx_sessions_device ON charging_sessions (device_id, started_at DESC);
CREATE INDEX idx_sessions_open ON charging_sessions (device_id) WHERE ended_at IS NULL;

CREATE TABLE sensor_readings (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT NOT NULL REFERENCES charging_sessions(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    temperature NUMERIC(5,2),
    current_a   NUMERIC(6,3),
    voltage_v   NUMERIC(6,2),
    gas_ppm     NUMERIC(8,2),
    smoke       BOOLEAN NOT NULL DEFAULT false,
    level       risk_level NOT NULL DEFAULT 'normal'
);
CREATE INDEX idx_readings_session_time ON sensor_readings (session_id, recorded_at DESC);

CREATE TABLE risk_events (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT NOT NULL REFERENCES charging_sessions(id),
    level       risk_level NOT NULL,
    cause       VARCHAR(50) NOT NULL,
    detail      JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_session ON risk_events (session_id, occurred_at DESC);

CREATE TABLE notifications (
    id       BIGSERIAL PRIMARY KEY,
    event_id BIGINT NOT NULL REFERENCES risk_events(id),
    user_id  BIGINT NOT NULL REFERENCES users(id),
    channel  VARCHAR(20) NOT NULL DEFAULT 'push',
    message  TEXT NOT NULL,
    status   VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at  TIMESTAMPTZ
);
CREATE INDEX idx_notifications_user ON notifications (user_id, id DESC);

-- 대시보드 실시간 표시용: 기기당 1행, 수신할 때마다 UPSERT
CREATE TABLE device_status (
    device_id    BIGINT PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
    is_charging  BOOLEAN NOT NULL DEFAULT false,
    level        risk_level NOT NULL DEFAULT 'normal',
    temperature  NUMERIC(5,2),
    current_a    NUMERIC(6,3),
    voltage_v    NUMERIC(6,2),
    gas_ppm      NUMERIC(8,2),
    smoke        BOOLEAN NOT NULL DEFAULT false,
    last_seen_at TIMESTAMPTZ
);
