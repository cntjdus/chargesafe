/*
 * ChargeSafe — ESP32-S3 동작 코드 + 서버 실시간 전송
 * ---------------------------------------------------------------
 * 온도 ×2 · 전류 · 전압을 주의/경고/위험/즉시차단 4단계로 판단하고 K1/K2 를 이중으로 끊는다.
 *   - 이동평균 + 히스테리시스 + 연속 판정으로 순간 튐에 끊기지 않게 한다
 *   - 온도는 부팅 직후 실온을 기준으로 +℃ 만큼 오르면 판단한다 (상대 모드)
 *   - 온도+전기 복합 이상, 센서 고장, 경고 지속, 단락 의심도 차단 조건이다
 *   - K1 차단 후 전류가 남으면 K2 까지 끊고, 그래도 흐르면 "차단 실패"로 알린다 (논블로킹)
 *   - 원인에 따라 조건이 돌아오면 자동 재가동한다 (10분에 3회까지, 넘으면 비상정지로만 해제)
 * 통신은 별도 태스크(코어 0)에서 돌기 때문에 서버가 느려도 차단 판단은 멈추지 않는다.
 * 서버가 cutoff:true 를 보내면(웹 설정의 온도 기준) 그것도 차단 조건이 된다.
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
 *
 * 시리얼 시험 명령 (115200, 시리얼 모니터에서 입력)
 *   t=전류 원인 차단 / b=온도 즉시 차단 / s=단락 의심 / r=해제 / 1·2=K1·K2 고장 시뮬 / i=기준값 / h=도움말
 *   k=K1 단독 차단 시험 (K2 는 그대로, 5초 뒤 자동 복구 — 서버에는 기록하지 않음)
 *   ※ t·b·s 시험 차단은 서버에 실제 차단으로 기록된다
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

// ===== 하드웨어 설정 =====
#define RELAY_ACTIVE_LOW 1    // LOW에서 켜지는 모듈이면 1, HIGH에서 켜지면 0
#define RELAY_OPEN_DRAIN 1    // 1: OFF 때 핀을 놓아줌 (3.3V로 안 떨어지는 모듈 해결, LOW 트리거 전용)
#define USE_ESTOP_PIN 1       // 블록②를 GPIO17에 연결했으면 1
#define SWAP_TEMP_SENSORS 0   // 배터리/충전기 값이 반대로 보이면 1
#define BUZZER_ACTIVE_HIGH 1  // 부저가 HIGH에서 울리면 1
#define LED_COMMON_ANODE 0    // 공통 캐소드면 0, 공통 애노드면 1
#define ALARM_MAX_MS 30000    // 비상정지/위험 경보음 최대 지속 시간 (0 = 계속)
#define GRACE_MS 3000         // 재가동 직후 돌입전류/전압 변동 무시 시간

// ╔══════════════════════════════════════════════════════════╗
// ║  지표별 기준표: 주의 / 경고 / 위험(K1) / 즉시차단(K1·K2) / 복귀  ║
// ╚══════════════════════════════════════════════════════════╝

// (1) 온도 — 센서가 약 35℃까지만 오르는 환경에 맞춘 시연용 값
#define TEMP_MODE_RELATIVE 1  // 1: 부팅 직후 실온 기준 +℃ (권장), 0: 고정 온도(℃)
#define BASE_SAMPLES 3        // 실온 기준을 잡는 센서 읽기 횟수(초). 이 동안 프로브를 만지지 마세요
#define REL_CAUTION   1.5     // 상대 모드: 실온 +
#define REL_WARN      2.5
#define REL_DANGER    3.5
#define REL_EMERGENCY 5.0
#define TEMP_HYS      0.5     // 복귀 여유: 복귀값 = 주의 기준 − TEMP_HYS (실온 +1.0)
#define ABS_CAUTION   27.0    // 고정 모드 (실온 25℃ 기준)
#define ABS_WARN      28.5
#define ABS_DANGER    30.0
#define ABS_EMERGENCY 31.5
#define REL_RECOVER   (REL_CAUTION - TEMP_HYS)
#define ABS_RECOVER   (ABS_CAUTION - TEMP_HYS)

// (2) 전류 — 정상 전류 기준값 × 배수
#define CURRENT_NOMINAL 58.0  // mA, 팬이 정상 회전할 때의 실측 전류
#define CUR_CAUTION   (CURRENT_NOMINAL * 1.5)
#define CUR_WARN      (CURRENT_NOMINAL * 2.0)
#define CUR_DANGER    (CURRENT_NOMINAL * 3.0)
#define CUR_EMERGENCY (CURRENT_NOMINAL * 6.0)
#define CUR_HYS       (CURRENT_NOMINAL * 0.2)   // 복귀값 = 주의 기준 − CUR_HYS (정상 ×1.3)

// (3) 전압 — 정상 전압 기준값 × 배수 (INA219는 26V까지만 허용, DCPS는 24V 이하로)
#define VOLT_NOMINAL 12.0     // V, 팬이 정상 회전할 때 센서 LCD에 표시되는 값으로 맞추세요
#define VOLT_FAN_SAFE_MODE 1  // 1: 12V 팬 보호용 낮은 과전압 기준(시연 권장), 0: 일반 기준
#if VOLT_FAN_SAFE_MODE
  #define VH_CAUTION   (VOLT_NOMINAL * 1.08)    // 13.0V
  #define VH_WARN      (VOLT_NOMINAL * 1.15)    // 13.8V
  #define VH_DANGER    (VOLT_NOMINAL * 1.25)    // 15.0V  → K1 차단
  #define VH_EMERGENCY (VOLT_NOMINAL * 1.50)    // 18.0V  → K1·K2 동시 차단, 수동 해제
#else
  #define VH_CAUTION   (VOLT_NOMINAL * 1.15)    // 13.8V
  #define VH_WARN      (VOLT_NOMINAL * 1.25)    // 15.0V
  #define VH_DANGER    (VOLT_NOMINAL * 1.50)    // 18.0V
  #define VH_EMERGENCY (VOLT_NOMINAL * 1.80)    // 21.6V
#endif
#define VL_CAUTION   (VOLT_NOMINAL * 0.85)      // 저전압 (릴레이 ON 중에만) 10.2V
#define VL_WARN      (VOLT_NOMINAL * 0.70)      //                          8.4V
#define V_NOPOWER    (VOLT_NOMINAL * 0.30)      // 이 값 미만 = 입력 전원 없음 (안내만)
#define VOLT_HYS     (VOLT_NOMINAL * 0.05)      // 복귀 여유 (0.6V)
#define SHORT_V      (VOLT_NOMINAL * 0.60)      // 단락 의심: 전압이 이 값 이하이면서
#define SHORT_I      (CURRENT_NOMINAL * 2.5)    //            전류가 이 값 이상 (2초 연속)

// (4) 온도 상승 속도: RISE_WINDOW_S초 동안 올라간 온도 (℃)
#define RISE_WINDOW_S 20
#define RISE_CAUTION 2.0
#define RISE_WARN    4.0

// (5) 오탐 방지 / 판정 안정화
#define AVG_N 3               // 이동평균 개수 (1초 간격)
#define UP_COUNT 2            // 단계 상승에 필요한 연속 판정 횟수(초)
#define DOWN_COUNT 5          // 단계 하강에 필요한 연속 판정 횟수(초)
#define WARN_TO_TRIP_MS 8000  // 경고가 이 시간 이어지면 위험으로 승격
#define FAULT_COUNT 3         // 센서가 연속으로 안 읽히면 센서 이상으로 판단하는 횟수
#define SENSOR_FAULT_TRIP 1   // 1: 센서 이상 = 경고(→ 시간 지나면 차단), 0: 주의만

// (6) K1/K2 차단 로직
#define CUT_BOTH_ON_EMERGENCY 1   // 즉시 차단(온도/전류/과전압): K1·K2 동시 차단
#define CUT_BOTH_ON_COMBO     1   // 온도+전기 복합 위험: K1·K2 동시 차단
#define CUT_VERIFY_MS 500         // 차단 명령 후 확인하기까지 대기 시간
#define CUT_VERIFY_MA (CURRENT_NOMINAL * 0.4)   // 이 전류 이상이면 아직 안 끊긴 것
#define CUT_VERIFY_USE_VOLT 0     // 1: 전압(정상×0.5 초과)도 차단 실패 판정에 사용 (팬 역기전력 주의)

// (7) 자동 재가동 (시연용으로 대기 시간을 줄인 값)
#define AUTO_RECOVER 1               // 1: 조건이 맞으면 자동 재가동
#define RECOVER_AFTER_EMERGENCY 1    // 0: 온도/전류 즉시 차단도 수동 해제만 허용
#define RECOVER_MIN_OFF_MS 8000      // 조건형(온도 원인): 차단 후 최소 대기
#define RECOVER_PROBE_WAIT_MS 10000  // 시험형(전류/전압 원인): 차단 후 최소 대기
#define RECOVER_HOLD_MS 8000         // 정상 상태를 이 시간 연속 유지해야 재가동
#define RECOVER_MAX_COUNT 3          // RECOVER_WINDOW_MS 안에 자동 재가동 가능한 횟수
#define RECOVER_WINDOW_MS 600000UL   // 10분

// (8) 고장 시뮬레이션 초기값 (시연 중에는 시리얼 '1', '2'로 켜고 끔)
#define SIM_K1_STUCK 0
#define SIM_K2_STUCK 0

// (9) K1 단독 차단 시험 (시리얼 'k'): K2 는 그대로 두고 K1 만 끈 뒤 이 시간 뒤 자동 복구
#define K1_TEST_MS 5000

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

// ===== 상태 변수 =====
bool ina219OK = false;
bool tempBattOK = false, tempChgrOK = false;
bool estopPressed = false, rawEstop = false;
bool tripped = false;
int  tripLevel = 0;           // 1 = K1에서 차단, 2 = K2까지 차단
bool relaysOn = false;
bool k1On = false, k2On = false;
bool simK1Stuck = SIM_K1_STUCK, simK2Stuck = SIM_K2_STUCK;   // 고장 시뮬레이션 (런타임 토글)
float tempBatt = 0, tempChgr = 0;
float currentmA = 0, busV = 0, powerMW = 0;
unsigned long rawChangedAt = 0, graceUntil = 0, lastSense = 0, lastLcd = 0;
unsigned long beepUntil = 0, alarmStart = 0;

// ===== 실온 기준 (상대 모드) =====
float battBase = 0, chgrBase = 0, battBaseSum = 0, chgrBaseSum = 0;
int battBaseN = 0, chgrBaseN = 0;
bool battBaseOK = false, chgrBaseOK = false;

// ===== 차단 / 자동 재가동 상태 =====
enum CutState { CUT_NONE, CUT_K1_WAIT, CUT_K2_WAIT, CUT_DONE, CUT_FAILED };
CutState cutState = CUT_NONE;
unsigned long cutStamp = 0, tripStart = 0, normalSince = 0, recoverWindowStart = 0;
int leakCount = 0, okCount = 0, recoverCount = 0;
bool recoverLocked = false;

// ===== K1 단독 차단 시험 ('k') =====
bool k1Test = false;          // 시험 중 (K1 만 꺼 둔 상태)
bool k1TestChecked = false;   // 차단 결과를 이미 확인했는지
unsigned long k1TestStart = 0;

// ===== 알고리즘 상태 =====
enum Reason {
  R_NONE, R_BATT, R_CHGR, R_RISE, R_CURRENT, R_VOLT_HIGH, R_VOLT_LOW, R_NOPOWER,
  R_COMBO, R_SENSOR, R_TIMEOUT, R_SHORT, R_EMERG_TEMP, R_EMERG_CURR, R_EMERG_VOLT, R_SERVER
};
enum RecoverType { REC_MANUAL, REC_CONDITION, REC_PROBE };

struct MovAvg {
  float buf[AVG_N];
  int count = 0, idx = 0;
  void reset() { count = 0; idx = 0; }
  void add(float v) { buf[idx] = v; idx = (idx + 1) % AVG_N; if (count < AVG_N) count++; }
  float mean() const {
    if (count == 0) return 0;
    float s = 0;
    for (int i = 0; i < count; i++) s += buf[i];
    return s / count;
  }
};
MovAvg avgBatt, avgChgr, avgCur, avgVolt;

float riseHist[RISE_WINDOW_S + 1];
int riseCount = 0, riseIdx = 0;
float lastRise = 0;

int hTB = 0, hTC = 0, hCur = 0, hVH = 0, hVL = 0;   // 지표별 히스테리시스 단계 기억
int shortCount = 0;

int alertLevel = 0;           // 0 정상, 1 주의, 2 경고, 3 위험
Reason alertReason = R_NONE;
int upCount = 0, downCount = 0;
int battFault = 0, chgrFault = 0;
unsigned long warnSince = 0;

// 서버에 보낼 원인 코드를 고르기 위한 세부 정보
bool emergTempChgr = false;   // 온도 즉시 차단이 충전기 쪽이었는지
bool comboIsCurrent = true;   // 복합 이상의 전기 쪽이 전류였는지 (아니면 전압)
Reason timeoutFrom = R_NONE;  // 경고 지속으로 승격되기 전의 원인

// ===== 통신 태스크와 주고받는 값 =====
// I2C·릴레이·부저·LED 는 메인 루프만 건드리고, 통신 태스크는 아래 값만 읽고 쓴다.
struct Reading {
  float battTemp;    // 배터리함 온도 (센서 고장이면 NAN → 서버에 null)
  float chgrTemp;    // 충전기 표면 온도 (센서 고장이면 NAN → 서버에 null)
  float currentA;
  float voltageV;
  bool charging;
  const char* stopReason;   // 충전을 멈춘 이유 (멈추지 않았으면 nullptr) — 아래 tripCode 참고
};
portMUX_TYPE shareMux = portMUX_INITIALIZER_UNLOCKED;
Reading latest = {NAN, NAN, NAN, NAN, false, nullptr};
volatile bool latestReady = false;      // 첫 센서 읽기 전에는 보내지 않는다
Reading tripReport;                     // 차단 직전 값
volatile bool tripReportPending = false;
Reading stopReport;                     // 차단·비상정지 직후 값 (charging:false + 원인)
volatile bool stopReportPending = false;
bool stopReported = false;              // 이번 정지를 이미 서버에 알렸는지
volatile bool serverCutoff = false;     // 서버가 cutoff:true 를 보냄 (웹 설정의 온도 기준·자동 차단 반영)
volatile uint32_t resetGen = 0;         // 재가동할 때마다 증가 — 재가동 전 응답으로 다시 끊지 않기 위함
volatile bool wifiUp = false;

// 차단 원인 코드 — 서버로 stop_reason 에 실어 보낸다.
// 서버는 이걸 보고 세션을 "충전 완료"가 아니라 차단·비상정지로 닫는다. (비상정지는 estop)
const char* tripCode = nullptr;

const char* levelName(int l) {
  switch (l) { case 1: return "주의"; case 2: return "경고"; case 3: return "위험"; default: return "정상"; }
}

const char* reasonText(Reason r) {      // 16칸 LCD와 시리얼 공용
  switch (r) {
    case R_BATT:       return "BATT TEMP HIGH";
    case R_CHGR:       return "CHGR TEMP HIGH";
    case R_RISE:       return "TEMP RISING";
    case R_CURRENT:    return "CURRENT HIGH";
    case R_VOLT_HIGH:  return "VOLTAGE HIGH";
    case R_VOLT_LOW:   return "VOLTAGE LOW";
    case R_NOPOWER:    return "NO INPUT POWER";
    case R_COMBO:      return "TEMP+ELEC HIGH";
    case R_SENSOR:     return "SENSOR FAULT";
    case R_TIMEOUT:    return "WARN TIMEOUT";
    case R_SHORT:      return "SHORT SUSPECTED";
    case R_EMERG_TEMP: return "EMERG TEMP LIM";
    case R_EMERG_CURR: return "EMERG CURR LIM";
    case R_EMERG_VOLT: return "EMERG VOLT LIM";
    case R_SERVER:     return "SERVER CUTOFF";
    default:           return "";
  }
}

// 차단 원인 → 서버의 stop_reason 코드 (서버 ingest.service.js 의 STOP_CAUSES 와 맞춘다)
const char* stopCodeFor(Reason r) {
  if (r == R_TIMEOUT) r = timeoutFrom;   // 경고가 길어져 끊은 경우는 원래 원인으로 기록
  switch (r) {
    case R_BATT:       return "overheat";
    case R_CHGR:       return "charger_overheat";
    case R_EMERG_TEMP: return emergTempChgr ? "charger_overheat" : "overheat";
    case R_RISE:       return "temp_rise";
    case R_CURRENT:
    case R_EMERG_CURR: return "overcurrent";
    case R_VOLT_HIGH:
    case R_EMERG_VOLT: return "overvoltage";
    case R_VOLT_LOW:   return "undervoltage";
    case R_SHORT:      return "short_circuit";
    case R_COMBO:      return comboIsCurrent ? "temp_current_anomaly" : "temp_voltage_anomaly";
    case R_SENSOR:     return "sensor_fault";
    case R_SERVER:     return "server";
    default:           return "overheat";
  }
}

// 차단 원인별 재가동 방식
RecoverType recoverType(Reason r) {
  switch (r) {
    case R_BATT: case R_CHGR: case R_RISE:
      return REC_CONDITION;                                        // 온도: 온도 복귀 확인
    case R_CURRENT: case R_VOLT_HIGH: case R_VOLT_LOW: case R_COMBO: case R_TIMEOUT:
      return REC_PROBE;                                            // 차단 중 측정 불가: 시험 재가동
    case R_EMERG_TEMP:
      return RECOVER_AFTER_EMERGENCY ? REC_CONDITION : REC_MANUAL;
    case R_EMERG_CURR:
      return RECOVER_AFTER_EMERGENCY ? REC_PROBE : REC_MANUAL;
    default:
      return REC_MANUAL;                                           // 과전압 즉시차단/단락/센서이상/서버 지시: 수동
  }
}

bool recoverAllowed() {
  if (!AUTO_RECOVER || recoverLocked) return false;
  if (cutState != CUT_DONE) return false;                          // 차단 실패는 수동 해제
  return recoverType(alertReason) != REC_MANUAL;
}

// ---------- 온도 기준 ----------
bool getThr(float base, bool baseOK, float &c, float &w, float &d, float &e) {
#if TEMP_MODE_RELATIVE
  if (!baseOK) return false;                 // 실온 기준이 잡히기 전에는 온도 판단을 하지 않음
  c = base + REL_CAUTION;
  w = base + REL_WARN;
  d = base + REL_DANGER;
  e = base + REL_EMERGENCY;
#else
  c = ABS_CAUTION; w = ABS_WARN; d = ABS_DANGER; e = ABS_EMERGENCY;
#endif
  return true;
}

void printThr(const char* name, float base) {
  float c, w, d, e;
  getThr(base, true, c, w, d, e);
#if TEMP_MODE_RELATIVE
  float rec = base + REL_RECOVER;
#else
  float rec = ABS_RECOVER;
#endif
  Serial.printf("[온도 기준] %s 실온 %.1fC → 주의 %.1f / 경고 %.1f / 위험 %.1f / 즉시차단 %.1f / 복귀 %.1f 이하\n",
                name, base, c, w, d, e, rec);
}

void printElecThr() {
  Serial.printf("[전류 기준] 정상 %.0fmA → 주의 %.0f / 경고 %.0f / 위험 %.0f / 즉시차단 %.0f / 복귀 %.0f 이하 (mA)\n",
                CURRENT_NOMINAL, CUR_CAUTION, CUR_WARN, CUR_DANGER, CUR_EMERGENCY, CUR_CAUTION - CUR_HYS);
  Serial.printf("[과전압 기준] 정상 %.1fV → 주의 %.1f / 경고 %.1f / 위험 %.1f / 즉시차단 %.1f / 복귀 %.1f 이하 (V)\n",
                VOLT_NOMINAL, VH_CAUTION, VH_WARN, VH_DANGER, VH_EMERGENCY, VH_CAUTION - VOLT_HYS);
  Serial.printf("[저전압 기준] 주의 %.1f 이하 / 경고 %.1f 이하 / 복귀 %.1f 이상 / 입력없음 %.1f 미만 (V)\n",
                VL_CAUTION, VL_WARN, VL_CAUTION + VOLT_HYS, V_NOPOWER);
  Serial.printf("[단락 의심] 전압 %.1fV 이하 & 전류 %.0fmA 이상이 2초 연속 → K1·K2 동시 차단 (수동 해제)\n",
                SHORT_V, SHORT_I);
}

void printAllThr() {
#if TEMP_MODE_RELATIVE
  if (battBaseOK) printThr("배터리함", battBase);
  if (chgrBaseOK) printThr("충전기", chgrBase);
#else
  printThr("고정 모드", 0);
#endif
  printElecThr();
}

void printHelp() {
  Serial.println("[시험 명령] t=전류 원인 차단 / b=온도 즉시 차단 / s=단락 의심 / r=해제 / "
                 "k=K1 단독 차단(5초 뒤 복구) / 1=K1 고장 시뮬 토글 / 2=K2 고장 시뮬 토글 / i=기준값 출력 / h=도움말");
}

// ---------- RGB LED ----------
void ledWrite(bool r, bool g, bool b) {
  digitalWrite(LED_R, (r != (bool)LED_COMMON_ANODE) ? HIGH : LOW);
  digitalWrite(LED_G, (g != (bool)LED_COMMON_ANODE) ? HIGH : LOW);
  digitalWrite(LED_B, (b != (bool)LED_COMMON_ANODE) ? HIGH : LOW);
}

void updateLed(unsigned long now) {
  if (estopPressed) {
    ledWrite((now % 1000) < 500, false, false);          // 비상정지: 빨강 천천히 깜빡
  } else if (k1Test) {
    ledWrite(false, false, ((now / 250) % 2) == 0);      // K1 단독 차단 시험: 파랑 깜빡
  } else if (cutState == CUT_FAILED) {
    bool on = ((now / 100) % 2) == 0;                    // 차단 실패: 자홍색 아주 빠른 깜빡
    ledWrite(on, false, on);
  } else if (tripped) {
    ledWrite(((now / 150) % 2) == 0, false, false);      // 위험 차단: 빨강 빠르게 깜빡
  } else if (alertLevel == 2) {
    bool on = ((now / 400) % 2) == 0;                    // 경고: 노랑 깜빡
    ledWrite(on, on, false);
  } else if (alertLevel == 1) {
    ledWrite(true, true, false);                         // 주의: 노랑 켜짐
  } else {
    ledWrite(false, true, false);                        // 정상: 초록
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
    on = true;                                           // 일회성 비프
  } else if (estopPressed) {
    on = alarmActive && ((now % 1000) < 200);            // 비상정지: 1초에 한 번
  } else if (cutState == CUT_FAILED) {
    on = ((now / 100) % 2) == 0;                         // 차단 실패: 아주 빠른 연속음 (시간 제한 없음)
  } else if (tripped) {
    on = alarmActive && ((now / 150) % 2 == 0);          // 위험 차단: 빠른 삑삑삑
  } else if (alertLevel == 2) {
    on = (now % 2000) < 120;                             // 경고: 2초마다 짧게
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
  bool simStuck = (pin == RELAY_K1 && simK1Stuck) || (pin == RELAY_K2 && simK2Stuck);
  if (!on && simStuck) {
    // 고장 시뮬레이션: 소프트웨어는 OFF라고 명령했지만 실제 핀은 그대로 (릴레이가 안 떨어짐)
  } else {
    bool level = RELAY_ACTIVE_LOW ? !on : on;            // 켜짐 = LOW(액티브 로우) / HIGH(액티브 하이)
    digitalWrite(pin, level ? HIGH : LOW);
  }
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
  unsigned long now = millis();

  // ---- LCD ① 센서값 (0x3F) : B=배터리함, C=충전기 ----
  if (tempBattOK) snprintf(tb, sizeof(tb), "%.1f", tempBatt); else snprintf(tb, sizeof(tb), "--.-");
  if (tempChgrOK) snprintf(tc, sizeof(tc), "%.1f", tempChgr); else snprintf(tc, sizeof(tc), "--.-");
  snprintf(a, sizeof(a), "B:%s C:%s", tb, tc);
  snprintf(b, sizeof(b), "I:%.0fmA V:%.1fV", currentmA, busV);
  lcdLine(lcdSensor, 0, a);
  lcdLine(lcdSensor, 1, b);

  // ---- LCD ② 상태 (0x26) ----
  bool alt = ((now / 1500) % 2) == 0;     // 1.5초마다 2번째 줄 내용 교대
  int phase = (now / 1500) % 3;

  if (estopPressed)                 snprintf(a, sizeof(a), "EMERGENCY STOP");
  else if (k1Test)                  snprintf(a, sizeof(a), "TEST: K1 ONLY");
  else if (cutState == CUT_FAILED)  snprintf(a, sizeof(a), "!! CUT FAILED !!");
  else if (tripped)                 snprintf(a, sizeof(a), tripLevel == 2 ? "DANGER! 2nd CUT" : "DANGER! 1st CUT");
  else if (alertLevel == 2)         snprintf(a, sizeof(a), "WARNING");
  else if (alertLevel == 1)         snprintf(a, sizeof(a), "CAUTION");
  else                              snprintf(a, sizeof(a), "STATUS: NORMAL");

  if (!estopPressed && k1Test) {
    // 지금 전류와 복구까지 남은 시간 — 전류가 0 이면 K1 혼자 끊은 것
    long remain = ((long)K1_TEST_MS - (long)(now - k1TestStart) + 999) / 1000;
    if (remain < 0) remain = 0;
    snprintf(b, sizeof(b), "I:%.0fmA BACK %lds", currentmA, remain);
  } else if (!estopPressed && cutState == CUT_FAILED) {
    snprintf(b, sizeof(b), alt ? "PRESS E-STOP!" : "UNPLUG POWER!");
  } else if (!estopPressed && tripped) {
    if (phase == 0) {
      snprintf(b, sizeof(b), "%s", reasonText(alertReason));
    } else if (phase == 1) {
      snprintf(b, sizeof(b), "K1:%s K2:%s", k1On ? "ON" : "OFF", k2On ? "ON" : "OFF");
    } else if (recoverLocked) {
      snprintf(b, sizeof(b), "LOCKED: E-STOP");
    } else if (recoverAllowed()) {
      if (normalSince == 0) {
        snprintf(b, sizeof(b), "COOLING DOWN");
      } else {
        long remain = ((long)RECOVER_HOLD_MS - (long)(now - normalSince)) / 1000;
        if (remain < 0) remain = 0;
        snprintf(b, sizeof(b), "RESTART IN %lds", remain);
      }
    } else {
      snprintf(b, sizeof(b), USE_ESTOP_PIN ? "Cycle E-STOP" : "Reboot to reset");
    }
  } else if (!estopPressed && alertLevel == 2) {
    long remain = ((long)WARN_TO_TRIP_MS - (long)(now - warnSince)) / 1000;
    if (remain < 0) remain = 0;
    if (alt) snprintf(b, sizeof(b), "%s", reasonText(alertReason));
    else     snprintf(b, sizeof(b), "AUTO CUT IN %lds", remain);
  } else if (!estopPressed && alertLevel == 1) {
    snprintf(b, sizeof(b), "%s", reasonText(alertReason));
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
  r.stopReason = estopPressed ? "estop" : tripped ? tripCode : nullptr;

  // 멈춘 직후 한 번은 "충전 안 함 + 원인"을 꼭 보낸다.
  // 자동 재가동이 빨라서 5초 주기 전송 사이에 정지 상태가 지나가 버려도, 서버가 세션을 차단으로 닫게 하기 위함.
  bool stopped = estopPressed || tripped;
  bool sendStop = stopped && !stopReported;
  if (sendStop) stopReported = true;
  if (!stopped) stopReported = false;

  portENTER_CRITICAL(&shareMux);
  latest = r;
  latestReady = true;
  if (sendStop) {
    stopReport = r;
    stopReport.charging = false;
    stopReportPending = true;
  }
  portEXIT_CRITICAL(&shareMux);
}

// ---------- 위험 판단 알고리즘 ----------
int levelOf(float v, float caution, float warn, float danger) {
  if (v >= danger) return 3;
  if (v >= warn)   return 2;
  if (v >= caution) return 1;
  return 0;
}

// 올라갈 때는 즉시, 내려갈 때는 (현재 단계 기준값 − hys) 아래로 내려가야 하강
int levelHyst(float v, float c, float w, float d, float hys, int &lv) {
  int raw = levelOf(v, c, w, d);
  if (raw >= lv) { lv = raw; return lv; }
  float held = (lv == 3) ? d : (lv == 2) ? w : c;
  if (v < held - hys) lv = raw;
  return lv;
}

// 저전압용 (값이 낮을수록 위험, 복귀는 기준값 + hys 이상)
int levelHystLow(float v, float c, float w, float hys, int &lv) {
  int raw = (v <= w) ? 2 : (v <= c) ? 1 : 0;
  if (raw >= lv) { lv = raw; return lv; }
  float held = (lv == 2) ? w : c;
  if (v > held + hys) lv = raw;
  return lv;
}

void pushRise(float t) {
  riseHist[riseIdx] = t;
  riseIdx = (riseIdx + 1) % (RISE_WINDOW_S + 1);
  if (riseCount < RISE_WINDOW_S + 1) riseCount++;
}

float riseDelta(float latestT) {
  if (riseCount < RISE_WINDOW_S + 1) return 0;     // 20초치가 쌓이기 전에는 판단 안 함
  return latestT - riseHist[riseIdx];              // riseIdx = 가장 오래된 값
}

void setLevel(int lvl, Reason r) {
  if (lvl == alertLevel) { if (lvl > 0) alertReason = r; return; }
  Serial.printf("[단계 변경] %s → %s (원인: %s)\n",
                levelName(alertLevel), levelName(lvl), lvl > 0 ? reasonText(r) : "-");
  if (lvl > alertLevel && r != R_NOPOWER) beep(lvl == 1 ? 120 : 300);   // 입력 전원 없음 안내는 소리 없이
  alertLevel = lvl;
  alertReason = (lvl == 0) ? R_NONE : r;
}

void resetAlgorithm(unsigned long now) {
  avgBatt.reset(); avgChgr.reset(); avgCur.reset(); avgVolt.reset();
  riseCount = 0; riseIdx = 0; lastRise = 0;
  hTB = hTC = hCur = hVH = hVL = 0;
  shortCount = 0;
  alertLevel = 0; alertReason = R_NONE;
  upCount = 0; downCount = 0; warnSince = 0;
  graceUntil = now + GRACE_MS;
}

void evaluate(unsigned long now) {
  float tB = avgBatt.mean(), tC = avgChgr.mean(), cur = avgCur.mean(), vol = avgVolt.mean();

  // 1) 온도 (실온 기준, 복귀 히스테리시스 포함)
  float bC = 0, bW = 0, bD = 0, bE = 0, cC = 0, cW = 0, cD = 0, cE = 0;
  bool bThr = tempBattOK && getThr(battBase, battBaseOK, bC, bW, bD, bE);
  bool cThr = tempChgrOK && getThr(chgrBase, chgrBaseOK, cC, cW, cD, cE);
  int lvB = 0, lvC = 0;
  if (bThr) lvB = levelHyst(tB, bC, bW, bD, TEMP_HYS, hTB); else hTB = 0;
  if (cThr) lvC = levelHyst(tC, cC, cW, cD, TEMP_HYS, hTC); else hTC = 0;

  int lvR = 0;
  if (tempBattOK || tempChgrOK) {
    float tMax = fmaxf(tempBattOK ? tB : -100.0f, tempChgrOK ? tC : -100.0f);
    pushRise(tMax);
    lastRise = riseDelta(tMax);
    lvR = (lastRise >= RISE_WARN) ? 2 : (lastRise >= RISE_CAUTION) ? 1 : 0;   // 상승 속도만으로는 위험까지 가지 않음
  }

  // 2) 전류 / 전압 (INA219)
  int lvI = 0, lvVh = 0, lvVl = 0;
  bool noPower = false;
  if (ina219OK) {
    lvI  = levelHyst(cur, CUR_CAUTION, CUR_WARN, CUR_DANGER, CUR_HYS, hCur);
    lvVh = levelHyst(vol, VH_CAUTION, VH_WARN, VH_DANGER, VOLT_HYS, hVH);
    noPower = vol < V_NOPOWER;
    if (noPower) hVL = 0; else lvVl = levelHystLow(vol, VL_CAUTION, VL_WARN, VOLT_HYS, hVL);
  }

  int tempLevel = max(lvB, max(lvC, lvR));
  int elecLevel = max(lvI, max(lvVh, lvVl));

  // 3) 가장 높은 지표를 원인으로 선택 (동률이면 전압 → 전류 → 온도 순)
  int raw = 0;
  Reason reason = R_NONE;
  auto pick = [&](int lv, Reason r) { if (lv > raw) { raw = lv; reason = r; } };
  pick(lvVh, R_VOLT_HIGH);
  pick(lvVl, R_VOLT_LOW);
  pick(lvI, R_CURRENT);
  pick(lvB, R_BATT);
  pick(lvC, R_CHGR);
  pick(lvR, R_RISE);
  if (noPower && raw < 1) { raw = 1; reason = R_NOPOWER; }     // 입력 전원 없음: 안내만

  // 4) 복합 조건 (온도 + 전류/전압)
  if (tempLevel >= 1 && elecLevel >= 1 && raw < 2) { raw = 2; reason = R_COMBO; }   // 둘 다 주의 → 경고
  if (tempLevel >= 2 && elecLevel >= 2)            { raw = 3; reason = R_COMBO; }   // 둘 다 경고 → 위험
  if (reason == R_COMBO) comboIsCurrent = lvI >= max(lvVh, lvVl);

  // 5) 센서 이상 (Fail-Safe)
  bool fault = !ina219OK || battFault >= FAULT_COUNT || chgrFault >= FAULT_COUNT;
  if (fault) {
    int fl = SENSOR_FAULT_TRIP ? 2 : 1;
    if (raw < fl) { raw = fl; reason = R_SENSOR; }
  }

  // 6) 즉시 차단 (평균/지속시간 무시, 순간값 기준)
  shortCount = (ina219OK && busV >= V_NOPOWER && busV <= SHORT_V && currentmA >= SHORT_I) ? shortCount + 1 : 0;
  Reason em = R_NONE;
  bool battEmerg = bThr && tempBatt >= bE;
  bool chgrEmerg = cThr && tempChgr >= cE;
  if (shortCount >= 2)                                           em = R_SHORT;        // 단락 의심
  else if (ina219OK && busV >= VH_EMERGENCY)                     em = R_EMERG_VOLT;   // 과전압 한계
  else if (battEmerg || chgrEmerg)                               em = R_EMERG_TEMP;   // 온도 한계
  else if (ina219OK && currentmA >= CUR_EMERGENCY)               em = R_EMERG_CURR;   // 전류 한계
  bool emergency = (em != R_NONE);
  if (emergency) { raw = 3; reason = em; }
  if (em == R_EMERG_TEMP) emergTempChgr = !battEmerg;

  // 7) 단계 안정화: 상승은 UP_COUNT회 연속, 하강은 DOWN_COUNT회 연속 필요
  if (emergency) {
    setLevel(3, reason);
  } else if (raw > alertLevel) {
    downCount = 0;
    if (++upCount >= UP_COUNT) { setLevel(raw, reason); upCount = 0; }
  } else if (raw < alertLevel) {
    upCount = 0;
    if (alertReason == R_NOPOWER && alertLevel == 1) {     // 전원이 돌아오면 즉시 정상 복귀
      setLevel(raw, reason);
      downCount = 0;
    } else if (++downCount >= DOWN_COUNT) {
      setLevel(alertLevel - 1, reason);
      downCount = 0;
    }
  } else {
    upCount = 0; downCount = 0;
    if (raw > 0) alertReason = reason;
  }

  // 8) 경고가 오래 지속되면 위험으로 승격
  if (alertLevel >= 2) {
    if (warnSince == 0) warnSince = now;
    if (alertLevel < 3 && now - warnSince >= WARN_TO_TRIP_MS) {
      timeoutFrom = alertReason;
      setLevel(3, R_TIMEOUT);
    }
  } else {
    warnSince = 0;
  }
}

// ---------- K1/K2 차단 로직 ----------
void escalateToK2(unsigned long now, const char* why) {
  Serial.printf("[%s] K2 차단 시도\n", why);
  setRelay(RELAY_K2, false);
  tripLevel = 2;
  cutState = CUT_K2_WAIT;
  cutStamp = now;
}

void startCut(Reason r, unsigned long now) {
  tripCode = stopCodeFor(r);

  // 차단 뒤에는 전류가 0 이 되므로, 서버에 위험 기록이 남도록 차단 직전 값을 바로 보낸다
  portENTER_CRITICAL(&shareMux);
  tripReport = latest;
  tripReportPending = true;
  portEXIT_CRITICAL(&shareMux);

  tripped = true;
  relaysOn = false;
  alarmStart = now;
  tripStart = now;
  normalSince = 0;
  leakCount = 0;
  okCount = 0;

  bool emergencyKind = (r == R_EMERG_TEMP || r == R_EMERG_CURR || r == R_EMERG_VOLT);
  bool both = !ina219OK || r == R_SHORT ||
              (emergencyKind && CUT_BOTH_ON_EMERGENCY) ||
              (r == R_COMBO && CUT_BOTH_ON_COMBO);

  Serial.printf("[위험 차단] 원인: %s (서버 코드 %s)\n", reasonText(r), tripCode);
  if (both) {
    Serial.println(ina219OK ? "K1·K2 동시 차단" : "INA219 이상 → 전류 확인 불가, K1·K2 동시 차단");
    setRelay(RELAY_K1, false);
    setRelay(RELAY_K2, false);
    tripLevel = 2;
    cutState = CUT_K2_WAIT;
  } else {
    Serial.println("K1만 차단 시도 (K2는 대기)");
    setRelay(RELAY_K1, false);
    tripLevel = 1;
    cutState = CUT_K1_WAIT;
  }
  cutStamp = now;
}

// 차단 명령 후 CUT_VERIFY_MS가 지나면 INA219로 실제 차단 여부를 확인 (논블로킹)
void updateCut(unsigned long now) {
  if (cutState != CUT_K1_WAIT && cutState != CUT_K2_WAIT) return;
  if (now - cutStamp < CUT_VERIFY_MS) return;

  float c = ina219OK ? ina219.getCurrent_mA() : 0;
  if (fabs(c) < 5) c = 0;
  bool stillFlowing = ina219OK && c > CUT_VERIFY_MA;
#if CUT_VERIFY_USE_VOLT
  if (ina219OK && ina219.getBusVoltage_V() > VOLT_NOMINAL * 0.5) stillFlowing = true;
#endif

  if (cutState == CUT_K1_WAIT) {
    if (stillFlowing) {
      Serial.printf("[1차 차단 실패] 전류 %.0fmA 지속\n", c);
      escalateToK2(now, "2차 차단");
    } else {
      Serial.println("[1차 차단 성공] K2는 대기(ON) 유지");
      cutState = CUT_DONE;
    }
  } else {
    if (stillFlowing) {
      Serial.printf("[차단 실패] K1·K2 모두 명령했지만 전류 %.0fmA 지속 → 비상정지로 수동 차단 필요\n", c);
      cutState = CUT_FAILED;
    } else {
      Serial.println(ina219OK ? "[2차 차단 성공]" : "[차단 완료] (전류 확인 불가)");
      cutState = CUT_DONE;
    }
  }
}

// 차단 후 1초마다: 다시 전류가 흐르는지 감시, 차단 실패 시 재시도
void monitorCut(unsigned long now) {
  if (cutState == CUT_DONE) {
    bool leak = ina219OK && currentmA > CUT_VERIFY_MA;
    leakCount = leak ? leakCount + 1 : 0;
    if (leakCount >= 2) {
      leakCount = 0;
      if (k2On) {
        escalateToK2(now, "재통전 감지");
      } else {
        Serial.println("[차단 실패] 차단 후 전류가 다시 흐릅니다");
        cutState = CUT_FAILED;
      }
    }
  } else if (cutState == CUT_FAILED) {
    setRelay(RELAY_K1, false);                    // 재시도
    setRelay(RELAY_K2, false);
    bool ok = ina219OK && currentmA <= CUT_VERIFY_MA;
    okCount = ok ? okCount + 1 : 0;
    if (okCount >= 3) {
      okCount = 0;
      tripLevel = 2;
      cutState = CUT_DONE;
      Serial.println("[차단 복구] 전류 0 확인");
    }
  }
}

// ---------- 수동 해제 / 자동 재가동 ----------
// 다시 켤 때 공통: 차단 상태를 지우고, 재가동 전 서버 응답의 차단 지시는 무효로 한다
void clearTrip(unsigned long now) {
  k1Test = false;
  tripped = false;
  tripLevel = 0;
  tripCode = nullptr;
  cutState = CUT_NONE;
  normalSince = 0;
  resetGen++;
  serverCutoff = false;
  resetAlgorithm(now);
  setRelays(true);
}

void manualReset(unsigned long now) {
  recoverCount = 0;
  recoverLocked = false;
  clearTrip(now);
}

// 온도 복귀 확인: 두 센서 모두 읽히고 복귀값 이하 (전류/전압은 차단 중 측정 불가)
bool tempsRecovered() {
  if (!ina219OK || !tempBattOK || !tempChgrOK) return false;
#if TEMP_MODE_RELATIVE
  if (!battBaseOK || !chgrBaseOK) return false;
  return avgBatt.mean() <= battBase + REL_RECOVER && avgChgr.mean() <= chgrBase + REL_RECOVER;
#else
  return avgBatt.mean() <= ABS_RECOVER && avgChgr.mean() <= ABS_RECOVER;
#endif
}

void doRecover(unsigned long now) {
  if (now - recoverWindowStart > RECOVER_WINDOW_MS) { recoverWindowStart = now; recoverCount = 0; }
  if (recoverCount >= RECOVER_MAX_COUNT) {
    recoverLocked = true;
    Serial.println("[자동 재가동 잠김] 반복 차단 → 비상정지를 눌렀다 떼서 해제하세요");
    return;
  }
  recoverCount++;
  if (recoverType(alertReason) == REC_PROBE) {
    Serial.printf("[시험 재가동] 대기 후 릴레이 ON, 전류/전압 이상이 남아 있으면 다시 차단 (%d/%d회)\n",
                  recoverCount, RECOVER_MAX_COUNT);
  } else {
    Serial.printf("[자동 재가동] 온도 복귀 %lus 유지 → 릴레이 ON (%d/%d회)\n",
                  RECOVER_HOLD_MS / 1000UL, recoverCount, RECOVER_MAX_COUNT);
  }
  clearTrip(now);
  beep(150);
}

void tryRecover(unsigned long now) {
  if (!recoverAllowed()) { normalSince = 0; return; }
  unsigned long minOff = (recoverType(alertReason) == REC_PROBE) ? RECOVER_PROBE_WAIT_MS : RECOVER_MIN_OFF_MS;
  if ((now - tripStart) >= minOff && tempsRecovered()) {
    if (normalSince == 0) normalSince = now;
    if (now - normalSince >= RECOVER_HOLD_MS) doRecover(now);
  } else {
    normalSince = 0;
  }
}

// ---------- K1 단독 차단 시험 ('k') ----------
// 위험 판단과 무관하게 K1 만 끄고, K2 로 넘기지 않는다. K1 혼자 회로를 끊을 수 있는지 확인하는 용도.
void startK1Test(unsigned long now) {
  if (k1Test || tripped || estopPressed || !relaysOn) {
    Serial.println("[시험] K1 단독 차단은 정상 동작 중(K1·K2 ON)에만 할 수 있습니다");
    return;
  }
  Serial.printf("[시험] K1 단독 차단 — K2 는 그대로, %lu초 뒤 자동 복구\n", K1_TEST_MS / 1000UL);
  k1Test = true;
  k1TestChecked = false;
  k1TestStart = now;
  setRelay(RELAY_K1, false);
  beep(100);
}

void updateK1Test(unsigned long now) {
  if (!k1Test) return;

  // 끈 지 CUT_VERIFY_MS 뒤에 전류를 한 번 재서 결과를 알려 준다
  if (!k1TestChecked && now - k1TestStart >= CUT_VERIFY_MS) {
    k1TestChecked = true;
    float c = ina219OK ? ina219.getCurrent_mA() : 0;
    if (fabs(c) < 5) c = 0;
    if (!ina219OK)              Serial.println("[시험 결과] INA219 이상 — 전류로 확인 불가, 팬이 멈췄는지 눈으로 확인");
    else if (c > CUT_VERIFY_MA) Serial.printf("[시험 결과] K1 차단 실패 — 전류 %.0fmA 지속 (K1 이 떨어지지 않음)\n", c);
    else                        Serial.printf("[시험 결과] K1 차단 성공 — 전류 %.0fmA\n", c);
  }

  if (now - k1TestStart >= K1_TEST_MS) {
    k1Test = false;
    setRelay(RELAY_K1, true);
    resetAlgorithm(now);                  // 시험 중 0mA 평균을 지우고, 재가동 돌입전류는 유예
    beep(150);
    Serial.println("[시험] K1 복구 → 정상 동작");
  }
}

// ---------- 시리얼 시험 명령 (측정값과 무관하게 차단/재가동 로직만 시험) ----------
void forceCut(Reason r, unsigned long now, const char* msg) {
  if (tripped || estopPressed || k1Test) return;
  Serial.println(msg);
  alertReason = r;
  alertLevel = 3;
  startCut(r, now);
}

void handleSerialTest(unsigned long now) {
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == 't')      forceCut(R_CURRENT, now, "[시험] 전류 원인 차단 강제 실행 (K1만, 시험형 재가동)");
    else if (ch == 'b') forceCut(R_EMERG_TEMP, now, "[시험] 온도 즉시 차단 강제 실행 (K1·K2, 조건형 재가동)");
    else if (ch == 's') forceCut(R_SHORT, now, "[시험] 단락 의심 차단 강제 실행 (K1·K2, 수동 해제)");
    else if (ch == 'k') startK1Test(now);
    else if (ch == '1') { simK1Stuck = !simK1Stuck; Serial.printf("[시험] K1 고장 시뮬레이션 %s\n", simK1Stuck ? "ON" : "OFF"); }
    else if (ch == '2') { simK2Stuck = !simK2Stuck; Serial.printf("[시험] K2 고장 시뮬레이션 %s\n", simK2Stuck ? "ON" : "OFF"); }
    else if (ch == 'i') printAllThr();
    else if (ch == 'h') printHelp();
    else if (ch == 'r') {
      if (estopPressed) { Serial.println("[시험] 비상정지가 눌려 있어 해제할 수 없습니다"); continue; }
      Serial.println("[시험] 차단 해제, 릴레이 ON");
      manualReset(now);
    }
  }
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
  // 비상정지·차단으로 멈췄으면 이유를 함께 보낸다 (서버가 "충전 완료"로 오해하지 않도록)
  if (r.stopReason) doc["stop_reason"] = r.stopReason;
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
    bool due = tripReportPending || stopReportPending || (millis() - lastSendAt >= SEND_INTERVAL_MS);

    if (due && latestReady) {
      lastSendAt = millis();
      if (!wifiUp) wifiUp = connectWiFi();

      if (wifiUp) {
        uint32_t gen = resetGen;
        Reading r;
        // 보내는 순서: 차단 직전 값 → 멈춘 직후 값(원인) → 최신 값
        portENTER_CRITICAL(&shareMux);
        if (tripReportPending)      { r = tripReport; tripReportPending = false; }
        else if (stopReportPending) { r = stopReport; stopReportPending = false; }
        else                        { r = latest; }
        portEXIT_CRITICAL(&shareMux);

        bool cutoff = false;
        sendReading(r, cutoff);
        // 응답이 오는 사이에 재가동했다면, 재가동 전 값에 대한 지시이므로 무시한다
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

  if (simK1Stuck || simK2Stuck) {
    Serial.printf("※ 고장 시뮬레이션 켜짐: K1 stuck=%d, K2 stuck=%d\n", simK1Stuck, simK2Stuck);
  }
#if TEMP_MODE_RELATIVE
  Serial.println("※ 온도 기준: 부팅 직후 실온 기준 (약 4초간 프로브를 만지지 마세요)");
#else
  printThr("고정 모드", 0);
#endif
  printElecThr();
  printHelp();

  beep(100);                                  // 부팅 완료 확인음
  delay(1000);                                // 부팅 안내 문구 확인용
  resetAlgorithm(millis());
  if (!estopPressed) setRelays(true);         // 비상정지가 안 눌린 상태일 때만 가동

  // 통신은 코어 0 에서 (와이파이도 코어 0 에서 돈다). HTTPS 때문에 스택을 넉넉히 준다.
  xTaskCreatePinnedToCore(networkTask, "network", 12288, nullptr, 1, nullptr, 0);

  Serial.println("=== ChargeSafe 온도·전류·전압 판단 + K1/K2 차단 + 재가동 + 서버 전송 시작 ===");
}

void loop() {
  unsigned long now = millis();

  handleSerialTest(now);

#if USE_ESTOP_PIN
  // 1) 비상정지 (30ms 디바운스)
  bool raw = (digitalRead(ESTOP_PIN) == HIGH);
  if (raw != rawEstop) { rawEstop = raw; rawChangedAt = now; }
  if (rawEstop != estopPressed && now - rawChangedAt > 30) {
    estopPressed = rawEstop;
    if (estopPressed) {
      alarmStart = now;
      k1Test = false;                     // K1 시험 중이었다면 취소 (해제 때 함께 재가동)
      setRelays(false);
      Serial.println("[비상정지] 눌림 → 릴레이 OFF, 팬 정지");
    } else {
      manualReset(now);
      beep(150);                          // 재가동 확인음
      Serial.println("[비상정지] 해제 → 차단 상태 해제, 릴레이 ON, 팬 재가동");
    }
  }
#endif

  // 2) 차단 후 확인 + K1 단독 시험 진행 (논블로킹)
  updateCut(now);
  updateK1Test(now);

  // 3) 1초마다 센서 읽기 → 평균 → 알고리즘 / 차단 후 감시 / 재가동
  if (now - lastSense >= 1000) {
    lastSense = now;

    float t1 = sensors.getTempCByIndex(BATT_IDX);
    float t2 = sensors.getTempCByIndex(CHGR_IDX);
    sensors.requestTemperatures();
    tempBattOK = (t1 > DEVICE_DISCONNECTED_C + 1);
    tempChgrOK = (t2 > DEVICE_DISCONNECTED_C + 1);
    if (tempBattOK) { tempBatt = t1; avgBatt.add(t1); battFault = 0; } else if (battFault < 1000) battFault++;
    if (tempChgrOK) { tempChgr = t2; avgChgr.add(t2); chgrFault = 0; } else if (chgrFault < 1000) chgrFault++;

    // 실온 기준 잡기 (부팅 후 처음 BASE_SAMPLES회 평균)
    if (tempBattOK && !battBaseOK) {
      battBaseSum += t1;
      if (++battBaseN >= BASE_SAMPLES) { battBase = battBaseSum / battBaseN; battBaseOK = true; printThr("배터리함", battBase); }
    }
    if (tempChgrOK && !chgrBaseOK) {
      chgrBaseSum += t2;
      if (++chgrBaseN >= BASE_SAMPLES) { chgrBase = chgrBaseSum / chgrBaseN; chgrBaseOK = true; printThr("충전기", chgrBase); }
    }

    if (ina219OK) {
      currentmA = ina219.getCurrent_mA();
      busV = ina219.getBusVoltage_V();
      powerMW = ina219.getPower_mW();
      if (fabs(currentmA) < 5) { currentmA = 0; powerMW = 0; }   // 무부하 노이즈 정리
      avgCur.add(currentmA);
      avgVolt.add(busV);
    }

    // 통신 태스크가 가져갈 최신 값.
    // K1 시험 중에는 갱신하지 않는다 — 전류 0 을 서버가 "충전 완료"로 오해해 기록을 닫지 않도록 직전 값을 유지
    if (!k1Test) publishReading();

    if (relaysOn && !estopPressed && !tripped && !k1Test && now > graceUntil) {
      evaluate(now);
      if (alertLevel >= 3) {
        startCut(alertReason, now);
      } else if (serverCutoff) {
        // 기기 기준으로는 아직 위험이 아니지만 서버(웹 설정 기준)가 위험이라고 판단한 경우
        alertReason = R_SERVER;
        alertLevel = 3;
        startCut(R_SERVER, now);
      }
    } else if (tripped && !estopPressed) {
      monitorCut(now);
      tryRecover(now);
    }
    if (tripped || estopPressed) serverCutoff = false;   // 이미 끊긴 상태에서 온 지시는 버린다

    Serial.printf("배터리함 %.1fC(평균 %.1f) | 충전기 %.1fC(평균 %.1f) | 전류 %.0fmA(평균 %.0f) | 전압 %.1fV(평균 %.1f) | K1:%s K2:%s | 단계: %s %s | 와이파이: %s\n",
                  tempBattOK ? tempBatt : NAN, avgBatt.mean(),
                  tempChgrOK ? tempChgr : NAN, avgChgr.mean(),
                  currentmA, avgCur.mean(), busV, avgVolt.mean(),
                  k1On ? "ON" : "OFF", k2On ? "ON" : "OFF",
                  estopPressed ? "비상정지" : k1Test ? "K1시험" : (cutState == CUT_FAILED) ? "차단실패" : tripped ? "위험차단" : levelName(alertLevel),
                  reasonText(alertReason), wifiUp ? "연결" : "끊김");
  }

  // 4) LCD, 부저, LED
  if (now - lastLcd >= 300) {
    lastLcd = now;
    updateLcd();
  }
  updateBuzzer(now);
  updateLed(now);
}
