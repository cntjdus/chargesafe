-- 충전기 표면 온도를 배터리 온도와 따로 저장한다 (DS18B20 2개 구성).
-- 기존 temperature 는 배터리(함) 온도로 그대로 쓰고, 센서가 하나뿐인 기기는 새 칸이 비어 있다.
ALTER TABLE sensor_readings   ADD COLUMN IF NOT EXISTS charger_temp     NUMERIC(5,2);
ALTER TABLE device_status     ADD COLUMN IF NOT EXISTS charger_temp     NUMERIC(5,2);
ALTER TABLE charging_sessions ADD COLUMN IF NOT EXISTS max_charger_temp NUMERIC(5,2);
