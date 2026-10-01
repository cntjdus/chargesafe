/*
 * ChargeSafe — ESP32-S3 동작 코드 + 서버 실시간 전송
 * ---------------------------------------------------------------
 * 하드웨어 동작(온도 ×2 · INA219 · LCD ×2 · K1/K2 이중 차단 · 비상정지 · 부저 · RGB LED)은
 * 테스트 가이드 6단계 06_integration_FINAL 과 같고, 여기에 와이파이로 서버에 값을 보내는 부분만 더했다.
 * 통신은 별도 태스크(코어 0)에서 돌기 때문에 서버가 느려도 차단 판단은 멈추지 않는다.
 *
 * 필요한 라이브러리 (Arduino IDE → 라이브러리 관리자)
 *   OneWire, DallasTemperature, Adafruit INA219 (+ Adafruit BusIO), LiquidCrystal I2C, ArduinoJson
 *
 * 보드 설정 (도구 메뉴)
 *   보드             : ESP32S3 Dev Module
 *   USB CDC On Boot  : Disabled   ← 보드의 COM(UART) 포트로 연결할 때. USB(OTG) 포트면 Enabled
 *   PSRAM            : OPI PSRAM
 *   Flash Size       : 16MB
 *
 * 와이파이 이름·비밀번호와 API 키는 같은 폴더의 secrets.h 에 넣는다.
 *   ESP32-S3 는 2.4GHz 만 된다. 휴대폰 핫스팟은 2.4GHz(아이폰은 "호환성 최대화")로 켤 것.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <Adafruit_INA219.h>
#include <LiquidCrystal_I2C.h>
#include "secrets.h"

// ===== 핀 =====
#define ONE_WIRE_BUS 4        // DS18B20 2개 병렬 (4.7kΩ 풀업 1개)
#define RELAY_K1 18           // 1채널 릴레이 모듈 #1 의 IN
#define RELAY_K2 16           // 1채널 릴레이 모듈 #2 의 IN
#define ESTOP_PIN 17          // 비상정지 블록② (GPIO17 ↔ GND)
#define BUZZER_PIN 15         // 능동 부저
#define LED_R 5               // RGB LED 빨강 (220Ω 경유)
#define LED_G 6               // RGB LED 초록 (220Ω 경유)
#define LED_B 7               // RGB LED 파랑 (220Ω 경유)

// ===== LCD 주소 =====
#define LCD_SENSOR_ADDR 0x3F  // 센서값 표시용
#define LCD_STATUS_ADDR 0x26  // 상태 표시용

// ===== 설정 =====
#define RELAY_ACTIVE_LOW 1    // LOW에서 켜지는 모듈이면 1, HIGH에서 켜지는 모듈이면 0
#define RELAY_OPEN_DRAIN 0    // 1이면 OFF 때 핀을 놓아줌 (LOW 트리거 모듈 전용, 노이즈에 민감할 때)
#define USE_ESTOP_PIN 1       // 블록②를 GPIO17에 연결했으면 1, 안 했으면 0
#define SWAP_TEMP_SENSORS 0   // 배터리/충전기 값이 반대로 보이면 1로 변경
#define BUZZER_ACTIVE_HIGH 1  // 부저가 HIGH에서 울리면 1, LOW에서 울리는 모듈이면 0
#define LED_COMMON_ANODE 0    // 공통 캐소드(GND 연결)면 0, 공통 애노드(3V3 연결)면 1
#define ALARM_MAX_MS 30000    // 경보음 최대 지속 시간 (0 = 계속 울림), LED는 영향 없음
#define TEMP_LIMIT_BATT 40.0  // 배터리함 위험 온도 (℃)
#define TEMP_LIMIT_CHGR 40.0  // 충전기 표면 위험 온도 (℃)
#define CURRENT_LIMIT 500.0   // mA
#define TRIP_COUNT 3          // 연속 N회(초) 초과해야 위험으로 판단
#define GRACE_MS 3000         // 재가동 직후 돌입전류 무시 시간

// ===== 서버 전송 =====
const char* SERVER_URL = "https://chargesafe-zc39.onrender.com/api/ingest/readings";
// 로컬 PC 서버로 테스트할 때 (PC와 ESP32가 같은 와이파이·핫스팟이어야 함):
// const char* SERVER_URL = "http://192.168.0.10:8000/api/ingest/readings";
#define SEND_INTERVAL_MS 5000 // 서버로 보내는 주기
#define CHARGING_MIN_MA 30.0  // 이 이상 흐르면 "충전 중"으로 보고한다

const uint8_t BATT_IDX = SWAP_TEMP_SENSORS ? 1 : 0;   // 배터리함 센서 번호
const uint8_t CHGR_IDX = SWAP_TEMP_SENSORS ? 0 : 1;   // 충전기 센서 번호

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);
Adafruit_INA219 ina219(0x40);
LiquidCrystal_I2C* lcdSensor = nullptr;
LiquidCrystal_I2C* lcdStatus = nullptr;

bool ina219OK = false;
bool tempBattOK = false, tempChgrOK = false;
bool firstSenseDone = false;  // 첫 센서 읽기 전에는 센서 이상으로 보지 않기 위함
bool estopPressed = false;
bool rawEstop = false;
bool tripped = false;
int  tripLevel = 0;           // 1 = 1차(K1)에서 차단 성공, 2 = 2차(K2)까지 차단
bool relaysOn = false;
bool k1On = false, k2On = false;
float tempBatt = 0, tempChgr = 0;
float currentmA = 0, busV = 0, powerMW = 0;
int overCount = 0;
unsigned long rawChangedAt = 0, graceUntil = 0, lastSense = 0, lastLcd = 0;
unsigned long beepUntil = 0, alarmStart = 0;

// ===== 통신 태스크와 주고받는 값 =====
// I2C·릴레이·부저·LED 는 메인 루프만 건드리고, 통신 태스크는 아래 값만 읽고 쓴다.
struct Reading {
  float battTemp;    // 배터리함 온도 (센서 고장이면 NAN → 서버에 null)
  float chgrTemp;    // 충전기 표면 온도 (센서 고장이면 NAN → 서버에 null)
  float currentA;
  float voltageV;
  bool charging;
};
portMUX_TYPE shareMux = portMUX_INITIALIZER_UNLOCKED;
Reading latest = {NAN, NAN, NAN, NAN, false};
volatile bool latestReady = false;      // 첫 센서 읽기 전에는 보내지 않는다
Reading tripReport;                     // 차단 직전 값
volatile bool tripReportPending = false;
volatile bool serverCutoff = false;     // 서버가 cutoff:true 를 보냄 (웹 설정의 온도 기준·자동 차단 반영)
volatile uint32_t resetGen = 0;         // 비상정지로 재가동할 때마다 증가 — 재가동 전 응답으로 다시 끊지 않기 위함
volatile bool wifiUp = false;

// ---------- RGB LED ----------
void ledWrite(bool r, bool g, bool b) {
  digitalWrite(LED_R, (r != (bool)LED_COMMON_ANODE) ? HIGH : LOW);
  digitalWrite(LED_G, (g != (bool)LED_COMMON_ANODE) ? HIGH : LOW);
  digitalWrite(LED_B, (b != (bool)LED_COMMON_ANODE) ? HIGH : LOW);
}

void updateLed(unsigned long now) {
  bool sensorFault = firstSenseDone && (!ina219OK || !tempBattOK || !tempChgrOK);

  if (estopPressed) {
    bool on = (now % 1000) < 500;                  // 비상정지: 빨강 천천히 깜빡
    ledWrite(on, false, false);
  } else if (tripped) {
    bool on = ((now / 150) % 2 == 0);              // 위험 차단: 빨강 빠르게 깜빡
    ledWrite(on, false, false);
  } else if (sensorFault || overCount > 0) {
    ledWrite(true, true, false);                   // 주의: 노랑
  } else {
    ledWrite(false, true, false);                  // 정상: 초록
  }
}

// ---------- 부저 ----------
void buzzerWrite(bool on) {
  digitalWrite(BUZZER_PIN, (on == (bool)BUZZER_ACTIVE_HIGH) ? HIGH : LOW);
}

void beep(unsigned long ms) {            // 한 번 짧게 울리기 (논블로킹)
  beepUntil = millis() + ms;
}

void updateBuzzer(unsigned long now) {
  bool on = false;
  bool alarmActive = (ALARM_MAX_MS == 0) || (now - alarmStart < ALARM_MAX_MS);

  if ((long)(beepUntil - now) > 0) {
    on = true;                                       // 일회성 비프
  } else if (estopPressed) {
    on = alarmActive && ((now % 1000) < 200);        // 비상정지: 1초에 한 번 "삑"
  } else if (tripped) {
    on = alarmActive && ((now / 150) % 2 == 0);      // 위험 차단: 빠른 "삑삑삑"
  }
  buzzerWrite(on);
}

// ---------- 릴레이 (1채널 모듈 2개) ----------
void relayPinInit(int pin) {
#if RELAY_ACTIVE_LOW && RELAY_OPEN_DRAIN
  pinMode(pin, OUTPUT_OPEN_DRAIN);
#else
  pinMode(pin, OUTPUT);
#endif
}

void setRelay(int pin, bool on) {
  bool level = RELAY_ACTIVE_LOW ? !on : on;          // 켜짐 = LOW(액티브 로우) / HIGH(액티브 하이)
  digitalWrite(pin, level ? HIGH : LOW);
  if (pin == RELAY_K1) k1On = on;
  else                 k2On = on;
}

void setRelays(bool on) {
  setRelay(RELAY_K1, on);
  setRelay(RELAY_K2, on);
  relaysOn = on;
}

// ---------- LCD ----------
LiquidCrystal_I2C* initLcd(uint8_t addr) {
  Wire.beginTransmission(addr);
  if (Wire.endTransmission() != 0) {
    Serial.print("LCD 0x"); Serial.print(addr, HEX); Serial.println(" 를 찾지 못했습니다.");
    return nullptr;
  }
  LiquidCrystal_I2C* l = new LiquidCrystal_I2C(addr, 16, 2);
  l->init();
  l->backlight();
  Serial.print("LCD 발견: 0x"); Serial.println(addr, HEX);
  return l;
}

void lcdLine(LiquidCrystal_I2C* l, uint8_t row, const char* s) {
  if (l == nullptr) return;
  char buf[17];
  snprintf(buf, sizeof(buf), "%-16s", s);   // 16칸 고정 (잔상 방지)
  l->setCursor(0, row);
  l->print(buf);
}

void updateLcd() {
  char a[24], b[24], tb[8], tc[8];

  // ---- LCD ① 센서값 (0x3F) : B=배터리함, C=충전기 ----
  if (tempBattOK) snprintf(tb, sizeof(tb), "%.1f", tempBatt); else snprintf(tb, sizeof(tb), "--.-");
  if (tempChgrOK) snprintf(tc, sizeof(tc), "%.1f", tempChgr); else snprintf(tc, sizeof(tc), "--.-");
  snprintf(a, sizeof(a), "B:%s C:%s", tb, tc);
  snprintf(b, sizeof(b), "I:%.0fmA V:%.1fV", currentmA, busV);
  lcdLine(lcdSensor, 0, a);
  lcdLine(lcdSensor, 1, b);

  // ---- LCD ② 상태 (0x26) ----
  if (estopPressed) {
    snprintf(a, sizeof(a), "EMERGENCY STOP");
  } else if (tripped) {
    snprintf(a, sizeof(a), tripLevel == 2 ? "DANGER! 2nd CUT" : "DANGER! 1st CUT");
  } else if (!ina219OK) {
    snprintf(a, sizeof(a), "INA219 ERROR");
  } else if (!tempBattOK && !tempChgrOK) {
    snprintf(a, sizeof(a), "TEMP ERROR B,C");
  } else if (!tempBattOK) {
    snprintf(a, sizeof(a), "BATT TEMP ERR");
  } else if (!tempChgrOK) {
    snprintf(a, sizeof(a), "CHGR TEMP ERR");
  } else if (overCount > 0) {
    snprintf(a, sizeof(a), "WARNING: LIMIT");
  } else {
    snprintf(a, sizeof(a), "STATUS: NORMAL");
  }

  if (tripped && !estopPressed) {
    snprintf(b, sizeof(b), USE_ESTOP_PIN ? "Cycle E-STOP" : "Reboot to reset");
  } else {
    // 마지막 칸: W = 와이파이 연결됨, - = 끊김
    bool fanOn = ina219OK && currentmA > 10;
    snprintf(b, sizeof(b), "FAN:%s K1%c K2%c%c",
             fanOn ? "ON " : "OFF", k1On ? '+' : '-', k2On ? '+' : '-', wifiUp ? 'W' : '-');
  }
  lcdLine(lcdStatus, 0, a);
  lcdLine(lcdStatus, 1, b);
}

// ---------- 서버로 보낼 값 ----------
// 두 온도를 따로 보낸다. 서버도 둘 중 하나만 기준을 넘으면 위험으로 판단한다.
void publishReading() {
  Reading r;
  r.battTemp = tempBattOK ? tempBatt : NAN;
  r.chgrTemp = tempChgrOK ? tempChgr : NAN;
  r.currentA = ina219OK ? fabsf(currentmA) / 1000.0f : NAN;
  r.voltageV = ina219OK ? busV : NAN;
  r.charging = ina219OK && fabsf(currentmA) >= CHARGING_MIN_MA;

  portENTER_CRITICAL(&shareMux);
  latest = r;
  latestReady = true;
  portEXIT_CRITICAL(&shareMux);
}

// ---------- 위험 차단 ----------
void tripSequence(const char* cause) {
  // 차단 뒤에는 전류가 0 이 되므로, 서버에 위험 기록이 남도록 차단 직전 값을 바로 보낸다
  portENTER_CRITICAL(&shareMux);
  tripReport = latest;
  tripReportPending = true;
  portEXIT_CRITICAL(&shareMux);

  Serial.print("[위험 감지] 원인: "); Serial.println(cause);
  Serial.println("K1 차단 시도");
  setRelay(RELAY_K1, false);
  delay(500);
  float check = ina219.getCurrent_mA();
  if (check > 50) {
    Serial.println("[1차 차단 실패] K2 차단 시도");
    setRelay(RELAY_K2, false);
    tripLevel = 2;
  } else {
    Serial.println("[1차 차단 성공]");
    tripLevel = 1;
  }
  relaysOn = false;
  tripped = true;
  alarmStart = millis();                  // 경보음 시작 시각
}

// ======================================================================
//  통신 (코어 0 태스크에서만 실행)
// ======================================================================

const char* wifiReason(wl_status_t s) {
  switch (s) {
    case WL_NO_SSID_AVAIL:   return "핫스팟 이름(SSID)을 찾지 못함 — 이름 오타, 핫스팟 꺼짐, 5GHz 전용 설정을 확인";
    case WL_CONNECT_FAILED:  return "접속 거부 — 비밀번호를 확인";
    case WL_CONNECTION_LOST: return "연결이 끊어짐";
    case WL_DISCONNECTED:    return "응답 없음 — 비밀번호, 보안 방식(WPA3 전용이면 WPA2로) 확인";
    default:                 return "알 수 없음";
  }
}

// 접속에 실패하면 ESP32 가 실제로 보이는 네트워크 목록을 보여 준다.
// 목록에 핫스팟이 없으면 5GHz 로 켜져 있거나 너무 멀리 있는 것이다.
void printNearbyNetworks() {
  int n = WiFi.scanNetworks();
  Serial.printf("[와이파이] ESP32 가 찾은 2.4GHz 네트워크 %d개:\n", n);
  for (int i = 0; i < n && i < 15; i++) {
    bool mine = (WiFi.SSID(i) == String(SECRET_WIFI_SSID));
    Serial.printf("   %-24s %4d dBm  ch%-2d%s\n", WiFi.SSID(i).c_str(), WiFi.RSSI(i), WiFi.channel(i),
                  mine ? "  ← secrets.h 의 이름" : "");
  }
  WiFi.scanDelete();
}

bool connectWiFi() {
  static int failCount = 0;
  Serial.printf("[와이파이] \"%s\" 에 연결 중...\n", SECRET_WIFI_SSID);
  WiFi.disconnect();
  WiFi.begin(SECRET_WIFI_SSID, SECRET_WIFI_PASSWORD);

  unsigned long started = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - started < 20000) {
    vTaskDelay(pdMS_TO_TICKS(250));
  }

  wl_status_t st = WiFi.status();
  if (st == WL_CONNECTED) {
    failCount = 0;
    Serial.printf("[와이파이] 연결됨  IP %s  신호 %d dBm  채널 %d\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI(), WiFi.channel());
    return true;
  }

  Serial.printf("[와이파이] 연결 실패 (코드 %d) %s\n", (int)st, wifiReason(st));
  if (failCount++ % 5 == 0) printNearbyNetworks();   // 매번 하면 로그가 너무 길어져 5번에 한 번
  return false;
}

// 성공하면 true. 서버가 차단을 지시하면 cutoffOut 을 true 로 돌려준다.
bool sendReading(const Reading& r, bool& cutoffOut) {
  static bool firstRequest = true;
  cutoffOut = false;

  HTTPClient http;
  static WiFiClientSecure secureClient;
  String url = SERVER_URL;
  if (url.startsWith("https")) {
    secureClient.setInsecure();   // 인증서 검증 생략 (캡스톤 수준에서 가장 간단한 방법)
    http.begin(secureClient, url);
  } else {
    http.begin(url);
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", SECRET_API_KEY);
  http.setTimeout(60000);         // Render 무료 플랜은 절전에서 깨어나는 데 최대 1분

  StaticJsonDocument<320> doc;
  doc["charging"] = r.charging;
  // temperature = 배터리함 온도, charger_temperature = 충전기 표면 온도
  if (isnan(r.battTemp)) doc["temperature"] = nullptr;         else doc["temperature"] = r.battTemp;
  if (isnan(r.chgrTemp)) doc["charger_temperature"] = nullptr; else doc["charger_temperature"] = r.chgrTemp;
  if (isnan(r.currentA)) doc["current_a"] = nullptr;   else doc["current_a"] = r.currentA;
  if (isnan(r.voltageV)) doc["voltage_v"] = nullptr;   else doc["voltage_v"] = r.voltageV;
  doc["smoke"] = false;           // 연기 센서는 이번 구성에 없음
  String body;
  serializeJson(doc, body);

  if (firstRequest) {
    Serial.println("[전송] 첫 요청 — 서버가 절전 중이면 응답까지 최대 1분 걸립니다");
    firstRequest = false;
  }

  unsigned long started = millis();
  int status = http.POST(body);
  unsigned long took = millis() - started;
  bool ok = false;

  if (status == 200) {
    StaticJsonDocument<64> filter;
    filter["level"] = true;
    filter["cutoff"] = true;
    StaticJsonDocument<128> res;
    String payload = http.getString();
    if (deserializeJson(res, payload, DeserializationOption::Filter(filter)) == DeserializationError::Ok) {
      const char* level = res["level"] | "?";
      cutoffOut = res["cutoff"] | false;
      Serial.printf("[전송] 성공 %lums  보낸 값 %s  → 서버 판단 %s%s\n",
                    took, body.c_str(), level, cutoffOut ? "  (차단 지시)" : "");
    } else {
      Serial.printf("[전송] 성공 %lums  (응답 해석 실패: %s)\n", took, payload.c_str());
    }
    ok = true;
  } else if (status == 401) {
    Serial.println("[전송] 401 — API 키가 틀렸거나 기기가 해제됨. secrets.h 의 SECRET_API_KEY 확인");
  } else if (status > 0) {
    Serial.printf("[전송] 서버 오류 %d: %s\n", status, http.getString().c_str());
  } else {
    // 음수는 서버에 닿지도 못한 경우 (인터넷 없음, DNS 실패, 시간 초과 등)
    Serial.printf("[전송] 연결 실패 %d (%s) — 핫스팟의 인터넷(데이터) 연결 확인\n",
                  status, http.errorToString(status).c_str());
  }
  http.end();
  return ok;
}

void networkTask(void*) {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  wifiUp = connectWiFi();
  unsigned long lastSendAt = 0;

  for (;;) {
    wifiUp = (WiFi.status() == WL_CONNECTED);
    bool due = tripReportPending || (millis() - lastSendAt >= SEND_INTERVAL_MS);

    if (due && latestReady) {
      lastSendAt = millis();
      if (!wifiUp) wifiUp = connectWiFi();

      if (wifiUp) {
        uint32_t gen = resetGen;
        Reading r;
        portENTER_CRITICAL(&shareMux);
        r = tripReportPending ? tripReport : latest;
        tripReportPending = false;
        portEXIT_CRITICAL(&shareMux);

        bool cutoff = false;
        sendReading(r, cutoff);
        // 응답이 오는 사이에 비상정지로 재가동했다면, 재가동 전 값에 대한 지시이므로 무시한다
        if (cutoff && gen == resetGen) serverCutoff = true;
      }
    }
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// ======================================================================

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
  buzzerWrite(false);                     // 부팅 중 소리 방지
  pinMode(LED_R, OUTPUT);
  pinMode(LED_G, OUTPUT);
  pinMode(LED_B, OUTPUT);
  ledWrite(false, false, true);           // 부팅 중: 파랑

  Serial.begin(115200);
  Wire.begin(8, 9);
  delay(300);

  relayPinInit(RELAY_K1);
  relayPinInit(RELAY_K2);
  setRelays(false);                       // 일단 OFF로 확정

#if USE_ESTOP_PIN
  pinMode(ESTOP_PIN, INPUT_PULLUP);
  rawEstop = (digitalRead(ESTOP_PIN) == HIGH);   // 평소 LOW, 눌리면 HIGH
  estopPressed = rawEstop;
  if (estopPressed) alarmStart = millis();
#endif

  lcdSensor = initLcd(LCD_SENSOR_ADDR);
  lcdStatus = initLcd(LCD_STATUS_ADDR);
  lcdLine(lcdSensor, 0, "SENSOR LCD");
  lcdLine(lcdSensor, 1, "addr 0x3F");
  lcdLine(lcdStatus, 0, "STATUS LCD");
  lcdLine(lcdStatus, 1, "addr 0x26");

  ina219OK = ina219.begin();
  if (ina219OK) ina219.setCalibration_32V_1A();
  else Serial.println("INA219를 찾을 수 없습니다.");

  sensors.begin();
  Serial.print("감지된 DS18B20 개수: ");
  Serial.println(sensors.getDeviceCount());   // 2가 나와야 정상
  sensors.setWaitForConversion(false);        // 논블로킹: 비상정지 반응을 늦추지 않기 위함
  sensors.requestTemperatures();
  lastSense = millis();

  beep(100);                                  // 부팅 완료 확인음
  delay(1000);                                // 부팅 안내 문구 확인용
  graceUntil = millis() + GRACE_MS;
  if (!estopPressed) setRelays(true);         // 비상정지가 안 눌린 상태일 때만 가동

  // 통신은 코어 0 에서 (와이파이도 코어 0 에서 돈다). HTTPS 때문에 스택을 넉넉히 준다.
  xTaskCreatePinnedToCore(networkTask, "network", 12288, nullptr, 1, nullptr, 0);

  Serial.println("=== ChargeSafe 동작 코드 시작 (1채널 릴레이 ×2, RGB LED, 부저, 서버 전송) ===");
}

void loop() {
  unsigned long now = millis();

#if USE_ESTOP_PIN
  // 1) 비상정지 상태 읽기 (30ms 디바운스)
  bool raw = (digitalRead(ESTOP_PIN) == HIGH);
  if (raw != rawEstop) { rawEstop = raw; rawChangedAt = now; }
  if (rawEstop != estopPressed && now - rawChangedAt > 30) {
    estopPressed = rawEstop;
    if (estopPressed) {
      alarmStart = now;
      setRelays(false);
      Serial.println("[비상정지] 눌림 → 릴레이 OFF, 팬 정지");
    } else {
      tripped = false;
      tripLevel = 0;
      overCount = 0;
      resetGen++;                         // 이전 서버 응답의 차단 지시는 무효
      serverCutoff = false;
      graceUntil = now + GRACE_MS;
      setRelays(true);                    // 새 ON 신호 → 릴레이 LED 켜지고 팬 재가동
      beep(150);                          // 재가동 확인음
      Serial.println("[비상정지] 해제 → 릴레이 ON, 팬 재가동");
    }
  }
#endif

  // 2) 1초마다 센서 읽기 + 위험 판단
  if (now - lastSense >= 1000) {
    lastSense = now;

    float t1 = sensors.getTempCByIndex(BATT_IDX);
    float t2 = sensors.getTempCByIndex(CHGR_IDX);
    sensors.requestTemperatures();
    tempBattOK = (t1 > DEVICE_DISCONNECTED_C + 1);
    tempChgrOK = (t2 > DEVICE_DISCONNECTED_C + 1);
    if (tempBattOK) tempBatt = t1;
    if (tempChgrOK) tempChgr = t2;
    firstSenseDone = true;

    if (ina219OK) {
      currentmA = ina219.getCurrent_mA();
      busV = ina219.getBusVoltage_V();
      powerMW = ina219.getPower_mW();
      if (fabs(currentmA) < 5) { currentmA = 0; powerMW = 0; }   // 무부하 노이즈 정리
    }

    publishReading();                     // 통신 태스크가 가져갈 최신 값

    if (relaysOn && !estopPressed && !tripped && now > graceUntil) {
      bool battOver = tempBattOK && tempBatt > TEMP_LIMIT_BATT;
      bool chgrOver = tempChgrOK && tempChgr > TEMP_LIMIT_CHGR;
      bool curOver  = ina219OK && currentmA > CURRENT_LIMIT;
      overCount = (battOver || chgrOver || curOver) ? overCount + 1 : 0;
      if (overCount >= TRIP_COUNT) {
        tripSequence(battOver ? "배터리함 과열" : chgrOver ? "충전기 과열" : "과전류");
      } else if (serverCutoff) {
        tripSequence("서버 판단 (웹 설정 기준)");
      }
    } else {
      overCount = 0;
    }
    if (tripped || estopPressed) serverCutoff = false;   // 이미 끊긴 상태에서 온 지시는 버린다

    Serial.print("배터리함: "); Serial.print(tempBattOK ? tempBatt : NAN);
    Serial.print(" C, 충전기: "); Serial.print(tempChgrOK ? tempChgr : NAN);
    Serial.print(" C, 전류: "); Serial.print(currentmA);
    Serial.print(" mA, 전압: "); Serial.print(busV);
    Serial.print(" V, 상태: ");
    Serial.print(estopPressed ? "비상정지" : tripped ? "위험차단" : "정상");
    Serial.println(wifiUp ? ", 와이파이: 연결" : ", 와이파이: 끊김");
  }

  // 3) LCD 갱신
  if (now - lastLcd >= 300) {
    lastLcd = now;
    updateLcd();
  }

  // 4) 부저 + LED 갱신 (매 루프)
  updateBuzzer(now);
  updateLed(now);
}
