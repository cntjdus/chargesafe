-- 알림 센터가 위험/주의/완료/정보 4종을 표시하므로,
-- 알림이 위험 이벤트에만 종속되지 않도록 자체 필드를 갖게 한다.
ALTER TABLE notifications ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE notifications ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'info'
  CONSTRAINT notifications_kind_check CHECK (kind IN ('danger', 'warning', 'success', 'info'));
ALTER TABLE notifications ADD COLUMN title VARCHAR(100);
ALTER TABLE notifications ADD COLUMN device_id BIGINT REFERENCES devices(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN occurred_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 기존 위험 이벤트 기반 알림에 새 필드를 채워 넣는다
UPDATE notifications n
SET kind = CASE WHEN e.level = 'danger' THEN 'danger' ELSE 'warning' END,
    title = CASE e.cause
      WHEN 'smoke' THEN '연기 감지'
      WHEN 'overheat' THEN '배터리 온도 초과'
      WHEN 'temp_current_anomaly' THEN '온도·전류 이상 감지'
      WHEN 'temp_voltage_anomaly' THEN '온도·전압 이상 감지'
      WHEN 'temp_rise' THEN '온도 급상승 감지'
      WHEN 'temp_high' THEN '배터리 온도 상승'
      WHEN 'current_change' THEN '충전 전류 이상'
      ELSE '충전 이상 감지' END,
    device_id = s.device_id,
    occurred_at = e.occurred_at
FROM risk_events e
JOIN charging_sessions s ON s.id = e.session_id
WHERE n.event_id = e.id;

CREATE INDEX idx_notifications_occurred ON notifications (user_id, occurred_at DESC);

-- 설정 화면의 "보호자 연결됨 · 김보호 (딸)" 표시용 관계
ALTER TABLE user_devices ADD COLUMN relation VARCHAR(20);
