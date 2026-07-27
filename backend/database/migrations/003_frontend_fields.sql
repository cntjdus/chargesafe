-- 새 보호자 대시보드(frontend)가 요구하는 필드 추가

-- 로그인 화면이 이메일이 아닌 "아이디"를 받으므로 사용자명을 별도로 둔다
ALTER TABLE users ADD COLUMN username VARCHAR(50);
CREATE UNIQUE INDEX idx_users_username ON users (username) WHERE username IS NOT NULL;

-- 기기 목록의 즐겨찾기는 보호자마다 다르므로 연결 테이블에 둔다
ALTER TABLE user_devices ADD COLUMN is_favorite BOOLEAN NOT NULL DEFAULT false;

-- 기기 카드의 펌웨어 표시("최신"/"업데이트 필요")와 목표 충전량(배터리 보호 모드)
ALTER TABLE devices ADD COLUMN firmware_version VARCHAR(20) NOT NULL DEFAULT '1.0.0';
ALTER TABLE devices ADD COLUMN target_percent SMALLINT NOT NULL DEFAULT 85
  CONSTRAINT devices_target_percent_range CHECK (target_percent BETWEEN 50 AND 100);

-- 알림 센터의 읽음 상태
ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;

-- 알림 목록은 사용자별 최신순으로 조회하므로 인덱스를 맞춘다
CREATE INDEX idx_notifications_user_recent ON notifications (user_id, id DESC);
