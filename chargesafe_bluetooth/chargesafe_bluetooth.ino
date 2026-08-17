#include "BluetoothSerial.h"

BluetoothSerial SerialBT;

unsigned long lastSendAt = 0;
bool wasConnected = false;
String rxLine = "";

void setup() {
  Serial.begin(115200);
  delay(500);

  SerialBT.begin("ChargeSafe_ESP32");

  Serial.println("\n=== Bluetooth 시작 ===");
  Serial.println("컴퓨터에서 ChargeSafe_ESP32 로 연결하세요.");
}

void loop() {
  bool connected = SerialBT.hasClient();

  // 연결 상태가 바뀔 때만 알린다 (연결됐는지 눈으로 확인 가능)
  if (connected != wasConnected) {
    Serial.println(connected ? "[BT] PC 연결됨" : "[BT] PC 연결 끊김");
    wasConnected = connected;
  }

  // 1초마다 전송 — 연결돼 있을 때만
  if (connected && millis() - lastSendAt >= 1000) {
    lastSendAt = millis();

    SerialBT.printf("Hello from ChargeSafe! %lu\n", millis() / 1000);
    Serial.println("[BT] 전송함");
  }

  // 수신 — 버퍼에 있는 걸 모두 읽고, 줄바꿈이 오면 한 줄로 출력
  while (SerialBT.available()) {
    char c = SerialBT.read();

    if (c == '\n' || c == '\r') {
      if (rxLine.length() > 0) {
        Serial.print("PC에서 받음: ");
        Serial.println(rxLine);
        rxLine = "";
      }
    } else {
      rxLine += c;
    }
  }

  delay(10);   // delay(1000) 이면 수신이 느려집니다
}