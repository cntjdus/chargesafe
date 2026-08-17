/*
 * ChargeSafe — ESP32 도킹스테이션 펌웨어
 * ---------------------------------------------------------------
 * 하는 일
 *   1) 센서(온도·전류·전압·연기)를 읽는다
 *   2) 자체 안전 판단으로 위험하면 "즉시" 충전을 차단한다  ← 네트워크와 무관
 *   3) 서버로 값을 보내고, 서버 판단(level/cutoff/fan)을 받아 반영한다
 *
 * 필요한 라이브러리 (Arduino IDE → 라이브러리 관리자에서 설치)
 *   - ArduinoJson  (by Benoit Blanchon)   ※ 이것 하나만 설치하면 됩니다
 *   나머지(WiFi, HTTPClient, WiFiClientSecure)는 ESP32 보드 패키지에 포함돼 있습니다
 *
 * 보드 설정
 *   도구 → 보드 → ESP32 Dev Module (또는 사용 중인 ESP32 보드)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
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

// ── 핀 번호 (실제 배선에 맞게 수정) ──
const int PIN_TEMP    = 34;   // 온도 센서 (아날로그)
const int PIN_CURRENT = 35;   // 전류 센서 ACS712 (아날로그)
const int PIN_VOLTAGE = 32;   // 전압 분배 회로 (아날로그)
const int PIN_SMOKE   = 33;   // MQ-2 연기 감지 (디지털 DO)
const int PIN_RELAY   = 26;   // 충전 릴레이 (HIGH = 충전 ON)
const int PIN_FAN     = 27;   // 냉각팬
const int PIN_BUZZER  = 25;   // 부저
const int PIN_LED_OK  = 12;   // 정상 표시 LED (초록)
const int PIN_LED_BAD = 13;   // 위험 표시 LED (빨강)

// ── 자체 안전 기준 (서버와 같은 값으로 맞춰 두세요) ──
const float LOCAL_TEMP_DANGER = 50.0;   // ℃ 이상이면 즉시 차단
const float LOCAL_CURRENT_MAX = 4.0;    // A
const float CHARGING_CURRENT_MIN = 0.1; // 이 이상 흐르면 "충전 중"으로 본다

// ══════════════════════════════════════════════════════════
//  ② 아래부터는 그대로 두어도 동작합니다
// ══════════════════════════════════════════════════════════

unsigned long lastSendAt = 0;
bool chargingAllowed = true;    // 릴레이 상태
String serverLevel = "normal";  // 서버가 판단한 단계

// ── 센서 읽기 ────────────────────────────────────────────
// ※ 실제 사용하는 센서에 맞게 이 함수들의 계산식을 바꾸세요.
//    ESP32의 analogRead()는 0~4095 (12비트), 기준 전압 약 3.3V 입니다.

float readTemperature() {
  // 예시: LM35 (10mV/℃). DS18B20을 쓴다면 DallasTemperature 라이브러리로 교체하세요.
  int raw = analogRead(PIN_TEMP);
  float volts = raw * (3.3 / 4095.0);
  return volts * 100.0;   // LM35: 1V = 100℃
}

float readCurrent() {
  // 예시: ACS712-20A (기준 2.5V, 100mV/A)
  int raw = analogRead(PIN_CURRENT);
  float volts = raw * (3.3 / 4095.0);
  float amps = (volts - 2.5) / 0.100;
  if (amps < 0) amps = -amps;      // 방향 무시하고 크기만
  if (amps < 0.05) amps = 0;       // 잡음 제거
  return amps;
}

float readVoltage() {
  // 예시: 전압 분배 (R1=30k, R2=7.5k → 최대 약 16.5V 측정)
  int raw = analogRead(PIN_VOLTAGE);
  float volts = raw * (3.3 / 4095.0);
  return volts * 5.0;              // (R1+R2)/R2 = 5
}

bool readSmoke() {
  // MQ-2 디지털 출력: 감지되면 LOW 인 모듈이 많습니다. 모듈에 맞게 바꾸세요.
  return digitalRead(PIN_SMOKE) == LOW;
}

// ── 액추에이터 제어 ──────────────────────────────────────
void applyOutputs(bool cutoff, bool fanOn, const String& level) {
  chargingAllowed = !cutoff;
  digitalWrite(PIN_RELAY, chargingAllowed ? HIGH : LOW);
  digitalWrite(PIN_FAN, fanOn ? HIGH : LOW);

  bool danger = (level == "danger");
  digitalWrite(PIN_LED_OK, danger ? LOW : HIGH);
  digitalWrite(PIN_LED_BAD, danger ? HIGH : LOW);

  if (danger) {
    tone(PIN_BUZZER, 2000);   // 위험 시 경고음
  } else {
    noTone(PIN_BUZZER);
  }
}

// ── 서버로 전송 ──────────────────────────────────────────
void sendReading(float temp, float current, float voltage, bool smoke, bool charging) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[전송] 와이파이 끊김 — 건너뜀");
    return;
  }

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

  // 보낼 JSON 만들기
  StaticJsonDocument<200> doc;
  doc["charging"]    = charging;
  doc["temperature"] = temp;
  doc["current_a"]   = current;
  doc["voltage_v"]   = voltage;
  doc["smoke"]       = smoke;

  String body;
  serializeJson(doc, body);

  int status = http.POST(body);

  if (status == 200) {
    String payload = http.getString();
    Serial.print("[전송] 성공: ");
    Serial.println(payload);

    // 서버 응답 해석
    StaticJsonDocument<300> res;
    if (deserializeJson(res, payload) == DeserializationError::Ok) {
      serverLevel = res["level"] | "normal";

      // 서버가 cutoff/fan 을 주면 그대로 따르고,
      // 아직 없는 버전이면 level 로부터 스스로 판단합니다.
      bool cutoff = res.containsKey("cutoff")
                      ? res["cutoff"].as<bool>()
                      : (serverLevel == "danger");
      bool fan = res.containsKey("fan")
                      ? res["fan"].as<bool>()
                      : (serverLevel != "normal");

      applyOutputs(cutoff, fan, serverLevel);
    }
  } else if (status == 401) {
    Serial.println("[전송] 401 — API 키가 잘못됐거나 기기가 해제되었습니다");
  } else {
    Serial.print("[전송] 실패 코드: ");
    Serial.println(status);
  }

  http.end();
}

// ── 와이파이 연결 ────────────────────────────────────────
void connectWiFi() {
  Serial.print("와이파이 연결 중");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("연결됨! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("연결 실패 — SSID/비밀번호를 확인하세요");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== ChargeSafe ESP32 시작 ===");

  // 내부 풀업을 켠다. MQ-2를 아직 안 붙였을 때 핀이 떠서 LOW 로 읽히는 것을
  // 막아 준다(= 연기 오검출). 모듈을 붙이면 DO 가 직접 구동하므로 영향이 없다.
  pinMode(PIN_SMOKE, INPUT_PULLUP);
  pinMode(PIN_RELAY, OUTPUT);
  pinMode(PIN_FAN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_OK, OUTPUT);
  pinMode(PIN_LED_BAD, OUTPUT);

  digitalWrite(PIN_RELAY, HIGH);   // 기본: 충전 허용
  digitalWrite(PIN_FAN, LOW);

  connectWiFi();
}

void loop() {
  // ① 센서 읽기
  float temp    = readTemperature();
  float current = readCurrent();
  float voltage = readVoltage();
  bool  smoke   = readSmoke();
  bool  charging = (current > CHARGING_CURRENT_MIN);

  // ② 자체 안전 판단 — 네트워크와 무관하게 "즉시" 동작한다.
  //    서버 응답을 기다리다 늦으면 안 되는 부분이므로 여기서 먼저 처리합니다.
  bool localDanger = smoke || (temp >= LOCAL_TEMP_DANGER) || (current >= LOCAL_CURRENT_MAX);
  if (localDanger) {
    applyOutputs(true, true, "danger");   // 즉시 차단 + 팬 가동 + 경고
    Serial.println("[안전] 자체 판단으로 충전 차단!");
  }

  // ③ 주기적으로 서버에 전송
  if (millis() - lastSendAt >= SEND_INTERVAL_MS) {
    lastSendAt = millis();

    Serial.printf("온도 %.1f℃  전류 %.2fA  전압 %.2fV  연기 %s  충전 %s\n",
                  temp, current, voltage,
                  smoke ? "감지" : "없음",
                  charging ? "중" : "대기");

    if (WiFi.status() != WL_CONNECTED) connectWiFi();
    sendReading(temp, current, voltage, smoke, charging);
  }

  delay(200);
}
