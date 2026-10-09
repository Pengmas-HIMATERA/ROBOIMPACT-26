// ---------- PIN SENSOR ----------
const int SENSOR_KIRI  = A3;
const int SENSOR_KANAN = A2;

// ---------- PIN MOTOR ----------
const int IN1 = 10;          // motor kiri
const int IN2 = 9;           // motor kiri
const int motorL_ENA = 11;   // PWM motor kiri

const int IN3 = 8;           // motor kanan
const int IN4 = 7;           // motor kanan
const int motorR_ENB = 6;    // PWM motor kanan

// ---------- THRESHOLD ----------
const int THRESHOLD = 400;   // nilai 0-1023

// ========== MOTOR SETTINGS (0 - 255) ==========
const int speedKiri  = 68;   // kecepatan motor kiri
const int speedKanan = 68;   // kecepatan motor kanan

void setup() {
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  pinMode(motorL_ENA, OUTPUT);
  pinMode(motorR_ENB, OUTPUT);

  Serial.begin(9600);
}

void loop() {
  int nilaiKiri  = analogRead(SENSOR_KIRI);
  int nilaiKanan = analogRead(SENSOR_KANAN);

  Serial.print("Kiri: "); Serial.print(nilaiKiri);
  Serial.print(" | Kanan: "); Serial.println(nilaiKanan);

  bool adaGarisKiri  = (nilaiKiri  > THRESHOLD);
  bool adaGarisKanan = (nilaiKanan > THRESHOLD);

  if (!adaGarisKiri && !adaGarisKanan) {
    maju();
  } else if (adaGarisKiri && !adaGarisKanan) {
    belokKiri();
  } else if (!adaGarisKiri && adaGarisKanan) {
    belokKanan();
  } else {
    berhenti();
  }
}

void maju() {
  analogWrite(motorL_ENA, speedKiri);
  analogWrite(motorR_ENB, speedKanan);
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void belokKiri() {
  analogWrite(motorL_ENA, 0);
  analogWrite(motorR_ENB, speedKanan);
  digitalWrite(IN1, LOW);  digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
}

void belokKanan() {
  analogWrite(motorL_ENA, speedKiri);
  analogWrite(motorR_ENB, 0);
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);  digitalWrite(IN4, LOW);
}

void berhenti() {
  analogWrite(motorL_ENA, 0);
  analogWrite(motorR_ENB, 0);
  digitalWrite(IN1, LOW); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, LOW);
}
