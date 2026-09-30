-- 가스 감지를 프로젝트 범위에서 제외하기로 하여, 사용하지 않는 가스 농도 컬럼을 삭제한다.
-- 연기 감지(smoke)는 그대로 유지한다.
ALTER TABLE sensor_readings DROP COLUMN IF EXISTS gas_ppm;
ALTER TABLE device_status   DROP COLUMN IF EXISTS gas_ppm;
