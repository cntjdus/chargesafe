/*
 * ChargeSafe — ESP32-S3 도킹스테이션 펌웨어 (저전압 시연 버전)
 * ---------------------------------------------------------------
 * 하는 일
 *   1) 센서(DS18B20 온도 · INA219 전류/전압)를 읽고 LCD 에 표시한다
 *   2) 자체 안전 판단으로 위험하면 "즉시" 충전을 차단한다  ← 네트워크와 무관
 *        K1 차단 → 0.5초 뒤에도 전류가 흐르면 K2 로 2차 차단 (06_FINAL 검증 로직)
 *        한 번 차단하면 재부팅(EN 버튼) 전까지 차단을 유지한다
 *   3) 서버로 값을 보내고, 서버가 cutoff 를 주면 같은 방식으로 차단한다
 *
 * 필요한 라이브러리 (Arduino IDE → 라이브러리 관리자에서 설치)
 *   - ArduinoJson        (Benoit Blanchon)
 *   - OneWire            (Paul Stoffregen)
 *   - DallasTemperature  (Miles Burton)
 *   - Adafruit INA219    (설치할 때 Adafruit BusIO 도 함께 설치)
 *   - LiquidCrystal I2C  (Frank de Brabander)
 *   WiFi, HTTPClient, WiFiClientSecure, Wire 는 ESP32 보드 패키지에 포함돼 있습니다
 *
 * 보드 설정
 *   도구 → 보드 → ESP32S3 Dev Module
 *   도구 → USB CDC On Boot → Enabled  (USB 로 시리얼 모니터를 보려면 필요)
 *   도구 → PSRAM → OPI PSRAM          (N16R8)
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

// ══════════════════════════════════════════════════════════
//  ① 여기만 본인 환경에 맞게 수정하세요
//     와이파이 정보와 API 키는 실제 값 대신 secrets.h 를 참조합니다.
//     secrets.h 는 .gitignore 로 제외되어 저장소에 올라가지 않습니다.
//     (처음 받았다면 secrets.h.example 을 secrets.h 로 복사해 채우세요)
// ══════════════════════════════════════════════════════════

const char* WIFI_SSID     = SECRET_WIFI_SSID;
const char* WIFI_PASSWORD = SECRET_WIFI_PASSWORD;

// 배포 서버 (HTTPS). 로컬 테스트는 아래 주석을 참고하세요.
const char* SERVER_URL = "https://chargesafe-zc39.onrender.com/api/ingest/readings";
// 로컬 PC에서 테스트할 때 (PC와 ESP32가 같은 와이파이여야 함):
// const char* SERVER_URL = "http://192.168.0.10:8000/api/ingest/readings";
//   → 192.168.0.10 자리에 PC의 IP를 넣으세요 (명령 프롬프트에서 ipconfig 로 확인)

// 대시보드에서 기기 등록 시 딱 한 번 보여준 API 키 (실제 값은 secrets.h)
const char* API_KEY = SECRET_API_KEY;

// 서버로 보내는 주기 (밀리초). 5초 = 5000
const unsigned long SEND_INTERVAL_MS = 5000;

// ── 핀 번호 (ESP32-S3-N16R8 기준 · 테스트 가이드 0절 핀맵) ──
const int PIN_I2C_SDA = 8;    // INA219 · LCD 공유
const int PIN_I2C_SCL = 9;    // INA219 · LCD 공유
const int PIN_TEMP    = 4;    // DS18B20 (4.7kΩ 풀업 필요)
const int PIN_K1      = 18;   // 릴레이 K1 — 1차 차단
const int PIN_K2      = 16;   // 릴레이 K2 — 2차 차단 (백업)

const uint8_t INA219_ADDR = 0x40;
const bool RELAY_ACTIVE_LOW = true;   // LOW 에서 붙는 모듈 (4단계에서 확인한 극성)

// ── 자체 안전 기준 (서버·웹 설정과 같은 값으로 맞춰 두세요) ──
const float LOCAL_TEMP_DANGER   = 40.0;   // ℃ 이상이면 즉시 차단 (웹 설정 온도 차단 기준)
const float LOCAL_CURRENT_MAX_A = 0.5;    // A 이상이면 즉시 차단 (Render CURRENT_MAX_A)
const float CHARGING_MIN_MA     = 30.0;   // 이 이상 흐르면 "충전 중"으로 본다
const float K1_FAIL_MA          = 50.0;   // K1 을 끊은 뒤에도 이만큼 흐르면 K1 고장으로 본다

// 시연용: 1 로 바꾸면 K1 이 차단 명령을 무시하는 고장을 흉내 낸다 → K2 백업 동작 확인
#define SIMULATE_K1_FAILURE 0

// ══════════════════════════════════════════════════════════
//  ② 아래부터는 그대로 두어도 동작합니다
// ══════════════════════════════════════════════════════════

OneWire oneWire(PIN_TEMP);
DallasTemperature tempSensor(&oneWire);
Adafruit_INA219 ina219(INA219_ADDR);
LiquidCrystal_I2C* lcd = nullptr;

// ── 릴레이 · 차단 상태 (메인 루프에서만 바꾼다) ──
bool k1On = false;
bool k2On = false;
bool tripped = false;            // 한 번 차단하면 재부팅 전까지 유지
const char* tripCause = "";      // LCD·시리얼 표시용

// ── DS18B20 상태 ──
// 변환에 시간이 걸리므로(11비트 기준 약 375ms) 요청과 읽기를 분리한다.
// 매 루프에서 기다리면 "즉시 차단"이 그만큼 늦어지기 때문이다.
const unsigned long TEMP_CONVERSION_MS = 400;
unsigned long lastTempRequestAt = 0;
float lastTemp = NAN;           // 마지막으로 성공한 값
int tempFailCount = 0;          // 연속 실패 횟수

// ── INA219 상태 ──
int inaFailCount = 0;           // 연속 무응답 횟수
bool inaFault = false;

// ── 네트워크 태스크와 주고받는 값 ──
// HTTP 전송은 Render 가 깨어날 때 50초까지 걸릴 수 있다. 메인 루프에서 기다리면
// 그동안 차단 판단이 멈추므로, 전송은 별도 태스크(코어 0)에서 한다.
// I2C(LCD·INA219)와 릴레이는 메인 루프만 건드린다.
struct Reading {
  float temp;        // NAN 이면 센서 고장 → 서버에 null 로 간다
  float currentA;
  float voltageV;
  bool charging;
};
portMUX_TYPE shareMux = portMUX_INITIALIZER_UNLOCKED;
Reading latest = {NAN, 0, 0, false};
Reading tripReport;                    // 차단 직전 값 (서버에 위험 기록을 남기기 위함)
volatile bool tripReportPending = false;
volatile bool serverCutoff = false;    // 서버가 cutoff:true 를 보냄
volatile bool wifiUp = false;
char serverLevel[12] = "-";

// ── 릴레이 ───────────────────────────────────────────────
void setRelay(int pin, bool on) {
  digitalWrite(pin, (on == RELAY_ACTIVE_LOW) ? LOW : HIGH);
}

// ── 센서 읽기 ────────────────────────────────────────────
float readTemperature() {
  // 아직 변환이 안 끝났으면 직전 값을 그대로 쓴다
  if (millis() - lastTempRequestAt < TEMP_CONVERSION_MS) {
    return lastTemp;
  }

  float celsius = tempSensor.getTempCByIndex(0);

  // DS18B20 의 두 가지 오류값을 걸러낸다
  //   -127.0 : 센서를 찾지 못함 (배선 끊김 · 풀업 저항 없음)
  //     85.0 : 전원 리셋 직후 변환이 끝나지 않았을 때의 기본값
  // 85℃ 는 실제 온도로도 나올 수 있지만, 위험 기준이 40℃ 이므로
  // 그 전에 이미 차단되었어야 한다. 따라서 오류로 보는 편이 안전하다.
  bool valid = (celsius != DEVICE_DISCONNECTED_C)
            && (celsius != 85.0f)
            && (celsius > -55.0f)
            && (celsius < 125.0f);

  if (valid) {
    lastTemp = celsius;
    tempFailCount = 0;
  } else {
    tempFailCount++;
    // 한두 번 튀는 건 무시하고, 세 번 연속 실패해야 고장으로 본다
    if (tempFailCount >= 3) lastTemp = NAN;
  }

  // 다음 변환을 미리 걸어 둔다 (논블로킹)
  tempSensor.requestTemperatures();
  lastTempRequestAt = millis();

  return lastTemp;
}

// INA219 가 I2C 에 응답하는지 확인한다. 끊겨도 라이브러리는 엉뚱한 값을
// 돌려줄 뿐 오류를 알려주지 않으므로, 주소 응답으로 고장을 판단한다.
bool inaResponds() {
  Wire.beginTransmission(INA219_ADDR);
  return Wire.endTransmission() == 0;
}

void checkIna() {
  if (inaResponds()) {
    inaFailCount = 0;
    inaFault = false;
  } else if (++inaFailCount >= 3) {
    inaFault = true;
  }
}

// 전류 크기(mA). 부하가 없을 때 -3mA 정도 튀는 잡음은 방향과 무관하게 크기로 본다.
float readCurrentMA() {
  return fabsf(ina219.getCurrent_mA());
}

// ── 차단 ────────────────────────────────────────────────
void cutK2(const char* why) {
  setRelay(PIN_K2, false);
  k2On = false;
  Serial.printf("[1차 차단 실패] K2 차단 (%s)\n", why);
}

// 06_FINAL 과 같은 순서: K1 차단 → 0.5초 뒤 전류 확인 → 여전히 흐르면 K2 차단
void trip(const char* cause, const Reading& before) {
  if (tripped) return;
  tripped = true;
  tripCause = cause;

  // 차단 뒤에는 전류가 0 이 되므로, 서버가 위험 값을 기록하도록 차단 "직전" 값을 바로 보낸다
  portENTER_CRITICAL(&shareMux);
  tripReport = before;
  tripReportPending = true;
  portEXIT_CRITICAL(&shareMux);

  Serial.printf("[위험 감지: %s] K1 차단 시도\n", cause);
#if SIMULATE_K1_FAILURE
  Serial.println("  (K1 고장 시뮬레이션 — K1 차단 명령을 무시합니다)");
#else
  setRelay(PIN_K1, false);
#endif
  k1On = false;
  delay(500);

  if (inaFault) {
    // 전류를 확인할 수 없으면 K1 이 끊겼는지 모르므로 K2 도 끊는다
    cutK2("전류 센서 고장 — 확인 불가");
    return;
  }
  float check = readCurrentMA();
  if (check > K1_FAIL_MA) {
    cutK2("K1 차단 후에도 전류 흐름");
  } else {
    Serial.println("[1차 차단 성공]");
  }
}

// ── LCD (16x2) ──────────────────────────────────────────
void lcdLine(uint8_t row, const char* text) {
  char buf[17];
  snprintf(buf, sizeof(buf), "%-16s", text);   // 남은 칸을 공백으로 지운다
  lcd->setCursor(0, row);
  lcd->print(buf);
}

void updateLcd(float temp, float currentMA, bool charging) {
  if (lcd == nullptr) return;

  char line[17];
  char tempStr[7];
  if (isnan(temp)) snprintf(tempStr, sizeof(tempStr), "--.-");
  else             snprintf(tempStr, sizeof(tempStr), "%.1f", temp);

  if (inaFault) snprintf(line, sizeof(line), "T:%sC I:----", tempStr);
  else          snprintf(line, sizeof(line), "T:%sC I:%.0fmA", tempStr, currentMA);
  lcdLine(0, line);

  if (tripped) {
    // 예) "CUT K1 OVERHEAT" / "CUT K2 OVERCURR"
    snprintf(line, sizeof(line), "CUT %s %s", k2On ? "K1" : "K2", tripCause);
  } else {
    snprintf(line, sizeof(line), "%-9s WiFi:%c", charging ? "CHARGING" : "IDLE", wifiUp ? 'O' : 'X');
  }
  lcdLine(1, line);
}

// ── 서버로 전송 (네트워크 태스크에서만 호출) ─────────────
void sendReading(const Reading& r) {
  HTTPClient http;
  String url = String(SERVER_URL);

  if (url.startsWith("https")) {
    // HTTPS: 인증서 검증을 생략합니다(캡스톤 수준에서 가장 간단한 방법).
    static WiFiClientSecure client;
    client.setInsecure();
    http.begin(client, url);
  } else {
    http.begin(url);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-API-Key", API_KEY);
  // Render 무료 플랜은 절전 상태에서 깨어나는 데 50초까지 걸립니다.
  http.setTimeout(60000);

  // 보낼 JSON 만들기 (연기 센서는 이번 구성에 없으므로 항상 false)
  StaticJsonDocument<200> doc;
  doc["charging"]    = r.charging;
  if (isnan(r.temp)) doc["temperature"] = nullptr;   // 센서 고장
  else               doc["temperature"] = r.temp;
  doc["current_a"]   = r.currentA;
  doc["voltage_v"]   = r.voltageV;
  doc["smoke"]       = false;

  String body;
  serializeJson(doc, body);

  int status = http.POST(body);

  if (status == 200) {
    String payload = http.getString();
    Serial.print("[전송] 성공: ");
    Serial.println(payload);

    // 필요한 필드만 읽는다 (응답에 firmware 등 다른 값도 섞여 있음)
    StaticJsonDocument<64> filter;
    filter["level"] = true;
    filter["cutoff"] = true;
    StaticJsonDocument<128> res;
    if (deserializeJson(res, payload, DeserializationOption::Filter(filter)) == DeserializationError::Ok) {
      strlcpy(serverLevel, res["level"] | "normal", sizeof(serverLevel));
      // 차단 해제는 서버가 아니라 재부팅으로만 한다. 그래서 true 일 때만 반영한다.
      if (res["cutoff"] | false) serverCutoff = true;
    }
  } else if (status == 401) {
    Serial.println("[전송] 401 — API 키가 잘못됐거나 기기가 해제되었습니다");
  } else {
    Serial.print("[전송] 실패 코드: ");
    Serial.println(status);
  }

  http.end();
}

// ── 와이파이 연결 (네트워크 태스크에서만 호출) ───────────
void connectWiFi() {
  Serial.println("와이파이 연결 중...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    vTaskDelay(pdMS_TO_TICKS(500));
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("와이파이 연결됨! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("와이파이 연결 실패 — SSID/비밀번호를 확인하세요 (2.4GHz 만 지원)");
  }
}

void networkTask(void*) {
  connectWiFi();
  unsigned long lastSendAt = 0;

  for (;;) {
    wifiUp = (WiFi.status() == WL_CONNECTED);
    bool due = tripReportPending || (millis() - lastSendAt >= SEND_INTERVAL_MS);

    if (due) {
      if (!wifiUp) {
        connectWiFi();
        wifiUp = (WiFi.status() == WL_CONNECTED);
      }
      if (wifiUp) {
        Reading r;
        portENTER_CRITICAL(&shareMux);
        bool isTripReport = tripReportPending;
        r = isTripReport ? tripReport : latest;
        tripReportPending = false;
        portEXIT_CRITICAL(&shareMux);

        sendReading(r);
      } else {
        Serial.println("[전송] 와이파이 끊김 — 건너뜀");
      }
      lastSendAt = millis();
    }
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}

// ── 시작 ────────────────────────────────────────────────
void initLcd() {
  // LCD 주소 자동탐지 (0x27 또는 0x3F)
  uint8_t candidates[] = {0x27, 0x3F};
  for (uint8_t addr : candidates) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.printf("LCD 발견: 0x%02X\n", addr);
      lcd = new LiquidCrystal_I2C(addr, 16, 2);
      lcd->init();
      lcd->backlight();
      lcdLine(0, "ChargeSafe");
      lcdLine(1, "Booting...");
      return;
    }
  }
  Serial.println("LCD를 찾지 못했습니다. 배선 확인 필요. (LCD 없이 계속 동작)");
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== ChargeSafe ESP32-S3 시작 ===");

  // 부팅 중에는 두 릴레이 모두 끊어 둔다. 센서 확인이 끝난 뒤에만 연결한다.
  digitalWrite(PIN_K1, RELAY_ACTIVE_LOW ? HIGH : LOW);
  digitalWrite(PIN_K2, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_K1, OUTPUT);
  pinMode(PIN_K2, OUTPUT);
  setRelay(PIN_K1, false);
  setRelay(PIN_K2, false);

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  delay(500);
  initLcd();

  // ── INA219 시작 ──
  if (ina219.begin()) {
    ina219.setCalibration_32V_1A();   // 최대 1A 까지 측정
    Serial.println("INA219 초기화 완료");
  } else {
    inaFault = true;
    Serial.println("INA219를 찾을 수 없습니다. 배선을 확인하세요.");
  }

  // ── DS18B20 시작 ──
  tempSensor.begin();
  Serial.printf("DS18B20 %d개 발견\n", tempSensor.getDeviceCount());

  tempSensor.setResolution(11);            // 0.125℃ · 변환 375ms
  tempSensor.setWaitForConversion(true);   // 첫 값만 기다렸다 읽는다
  tempSensor.requestTemperatures();
  float first = tempSensor.getTempCByIndex(0);
  if (first != DEVICE_DISCONNECTED_C && first != 85.0f) lastTemp = first;

  tempSensor.setWaitForConversion(false);  // 이후로는 논블로킹
  tempSensor.requestTemperatures();
  lastTempRequestAt = millis();

  // 센서가 정상일 때만 충전을 허용한다. 고장이면 첫 루프에서 차단 상태로 들어간다.
  if (!inaFault && !isnan(lastTemp)) {
    setRelay(PIN_K1, true);
    setRelay(PIN_K2, true);
    k1On = k2On = true;
    Serial.println("릴레이 K1·K2 연결 (충전 허용)");
  }

  // 전송은 코어 0 에서 (와이파이도 코어 0 에서 돈다). HTTPS 때문에 스택을 넉넉히 준다.
  xTaskCreatePinnedToCore(networkTask, "network", 12288, nullptr, 1, nullptr, 0);

  Serial.println("=== 감시 시작 ===");
}

// ── 메인 루프: 안전 판단 (네트워크와 무관하게 200ms 마다) ──
void loop() {
  static unsigned long lastPrintAt = 0;
  static unsigned long lastLcdAt = 0;

  // ① 센서 읽기
  checkIna();
  float temp      = readTemperature();
  float currentMA = inaFault ? 0 : readCurrentMA();
  float voltageV  = inaFault ? 0 : ina219.getBusVoltage_V();
  bool  tempFault = isnan(temp);                // 3회 연속 실패
  bool  charging  = !inaFault && currentMA >= CHARGING_MIN_MA;

  Reading now = {temp, currentMA / 1000.0f, voltageV, charging};
  portENTER_CRITICAL(&shareMux);
  latest = now;
  portEXIT_CRITICAL(&shareMux);

  // ② 자체 안전 판단 — 네트워크와 무관하게 "즉시" 동작한다.
  //    센서가 고장 나면 과열·과전류를 감지할 수 없으므로 위험으로 본다.
  if (!tripped) {
    const char* cause = nullptr;
    if (tempFault)                                 cause = "TEMP ERR";
    else if (inaFault)                             cause = "INA ERR";
    else if (temp >= LOCAL_TEMP_DANGER)            cause = "OVERHEAT";
    else if (currentMA >= LOCAL_CURRENT_MAX_A * 1000.0f) cause = "OVERCURR";
    else if (serverCutoff)                         cause = "SERVER";

    if (cause) trip(cause, now);
  } else if (k2On && !inaFault && currentMA > K1_FAIL_MA) {
    // 차단 뒤에 K1 이 다시 붙어 버린 경우(접점 융착 등)에도 K2 로 막는다
    cutK2("차단 유지 중 전류 재감지");
  }

  // ③ 화면 · 시리얼 표시
  if (millis() - lastLcdAt >= 500) {
    lastLcdAt = millis();
    updateLcd(temp, currentMA, charging);
  }
  if (millis() - lastPrintAt >= 1000) {
    lastPrintAt = millis();
    Serial.printf("온도 %.2f℃  전류 %.1fmA  전압 %.2fV  %s  K1:%s K2:%s  서버:%s%s\n",
                  temp, currentMA, voltageV,
                  charging ? "충전중" : "대기",
                  k1On ? "ON" : "OFF", k2On ? "ON" : "OFF",
                  serverLevel,
                  tripped ? "  [차단 유지]" : "");
  }

  delay(200);
}
