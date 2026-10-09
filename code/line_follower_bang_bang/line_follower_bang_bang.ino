// Bang-bang tiga sensor analog: hitam menghasilkan ADC lebih tinggi.
const int SENSOR_KIRI = A0;
const int SENSOR_TENGAH = A1;
const int SENSOR_KANAN = A2;
const int IN1 = 10, IN2 = 9, motorL_ENA = 11;
const int IN3 = 8, IN4 = 7, motorR_ENB = 6;
const int THRESHOLD = 400;
// PWM aktual di atas deadzone model (60); kalibrasi di robot.
const int speedKiri = 86;
const int speedKanan = 86;
const int COAST_PWM = 65;
const int STARTUP_MS = 1000;
const int LOST_GRACE_MS = 150;
const int SEARCH_SWEEP_MS = 1400;
const int LOST_TIMEOUT_MS = 3000;
int searchDirection = 1; // +1 kanan, -1 kiri.
bool lineLost = false;
bool stopped = false;
unsigned long lostSinceMs = 0;
unsigned long lastSerialMs = 0;

void setMotors(int left, int right) {
  digitalWrite(IN1, left > 0 ? HIGH : LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, right > 0 ? HIGH : LOW); digitalWrite(IN4, LOW);
  analogWrite(motorL_ENA, left); analogWrite(motorR_ENB, right);
}
void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
  pinMode(motorL_ENA, OUTPUT); pinMode(motorR_ENB, OUTPUT);
  Serial.begin(9600); setMotors(0, 0); delay(STARTUP_MS);
}
void loop() {
  if (stopped) { setMotors(0, 0); return; }
  unsigned long nowMs = millis();
  int kiri = analogRead(SENSOR_KIRI);
  int tengah = analogRead(SENSOR_TENGAH);
  int kanan = analogRead(SENSOR_KANAN);
  bool left = kiri > THRESHOLD;
  bool center = tengah > THRESHOLD;
  bool right = kanan > THRESHOLD;
  // Batasi Serial agar tidak menahan setiap iterasi kontrol.
  if (nowMs - lastSerialMs >= 100) {
    lastSerialMs = nowMs;
    Serial.print("Kiri: "); Serial.print(kiri);
    Serial.print(" | Tengah: "); Serial.print(tengah);
    Serial.print(" | Kanan: "); Serial.println(kanan);
  }
  if (left || center || right) {
    lineLost = false;
    if (left != right) {
      searchDirection = left ? -1 : 1;
      setMotors(left ? 0 : speedKiri, right ? 0 : speedKanan);
    } else {
      // Tengah saja atau pola simetris: maju. Semua hitam bukan bukti finish.
      setMotors(speedKiri, speedKanan);
    }
  } else {
    if (!lineLost) { lineLost = true; lostSinceMs = nowMs; }
    unsigned long elapsed = nowMs - lostSinceMs;
    if (elapsed >= LOST_TIMEOUT_MS) {
      stopped = true; // Reset board untuk mencoba lagi.
      setMotors(0, 0);
    } else if (elapsed < LOST_GRACE_MS) {
      setMotors(COAST_PWM, COAST_PWM);
    } else {
      unsigned long phase = (elapsed - LOST_GRACE_MS) / SEARCH_SWEEP_MS;
      int direction = phase % 2 == 0 ? searchDirection : -searchDirection;
      setMotors(direction == 1 ? speedKiri : 0, direction == -1 ? speedKanan : 0);
    }
  }
}
