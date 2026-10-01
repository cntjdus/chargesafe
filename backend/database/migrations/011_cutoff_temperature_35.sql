-- 시연용으로 온도 차단 기준을 35℃ 까지 낮출 수 있게 한다 (기존 40~65℃ → 35~65℃).
-- 손이나 따뜻한 물로 센서를 데워 차단 동작을 보여 주기 위함. 기존 값은 그대로 유지된다.
ALTER TABLE devices DROP CONSTRAINT IF EXISTS devices_cutoff_temperature_range;
ALTER TABLE devices ADD CONSTRAINT devices_cutoff_temperature_range
  CHECK (cutoff_temperature BETWEEN 35 AND 65);
