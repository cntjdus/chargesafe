-- 설정 화면에서 기기별로 저장하는 안전·충전 설정
-- (기존에는 .env 전역값이라 기기마다 다르게 둘 수 없었다)

-- 온도 차단 기준 — 설정 화면의 선택 범위 40~65℃, 기본 50℃
ALTER TABLE devices ADD COLUMN cutoff_temperature SMALLINT NOT NULL DEFAULT 50
  CONSTRAINT devices_cutoff_temperature_range CHECK (cutoff_temperature BETWEEN 40 AND 65);

-- 자동 차단 사용 여부 — 끄면 위험 판단은 하되 충전을 강제로 끊지 않는다
ALTER TABLE devices ADD COLUMN auto_cutoff_enabled BOOLEAN NOT NULL DEFAULT true;

-- 냉각팬 자동 작동 — 주의 단계 이상일 때 펌웨어가 팬을 켤지 여부
ALTER TABLE devices ADD COLUMN cooling_fan_enabled BOOLEAN NOT NULL DEFAULT true;

-- 장시간 충전 경고 — 기준 시간을 넘기면 주의 알림을 남긴다 (0 이면 사용 안 함)
ALTER TABLE devices ADD COLUMN long_charge_warning_hours SMALLINT NOT NULL DEFAULT 12
  CONSTRAINT devices_long_charge_hours_range CHECK (long_charge_warning_hours BETWEEN 0 AND 48);
