// Motor A (kanan) - L298N
const int motorL_IN1 = 8;
const int motorL_IN2 = 7;
const int motorL_ENA = 6; // PWM

// Motor B (kiri) - L298N
const int motorR_IN3 = 10;
const int motorR_IN4 = 9;
const int motorR_ENB = 11; // PWM

// Kecepatan default (0-255)
const int speedDefault = 200;

void setup() {
  // Konfigurasi pin motor sebagai OUTPUT
  pinMode(motorL_IN1, OUTPUT);
  pinMode(motorL_IN2, OUTPUT);
  pinMode(motorL_ENA, OUTPUT);
  
  pinMode(motorR_IN3, OUTPUT);
  pinMode(motorR_IN4, OUTPUT);
  pinMode(motorR_ENB, OUTPUT);
  
  // Serial untuk debugging (opsional)
  Serial.begin(9600);
  Serial.println("=== Motor Test L298N Started ===");
  
  // Pastikan motor mati di awal
  stopMotors();
  delay(1000);
}

// ========= FUNGSI KONTROL MOTOR =========

void moveForward(int speed) {
  // Motor Kiri: IN1=HIGH, IN2=LOW
  digitalWrite(motorL_IN1, HIGH);
  digitalWrite(motorL_IN2, LOW);
  analogWrite(motorL_ENA, speed);
  
  // Motor Kanan: IN3=HIGH, IN4=LOW
  digitalWrite(motorR_IN3, HIGH);
  digitalWrite(motorR_IN4, LOW);
  analogWrite(motorR_ENB, speed);
}

void moveBackward(int speed) {
  // Motor Kiri: IN1=LOW, IN2=HIGH
  digitalWrite(motorL_IN1, LOW);
  digitalWrite(motorL_IN2, HIGH);
  analogWrite(motorL_ENA, speed);
  
  // Motor Kanan: IN3=LOW, IN4=HIGH
  digitalWrite(motorR_IN3, LOW);
  digitalWrite(motorR_IN4, HIGH);
  analogWrite(motorR_ENB, speed);
}

void turnLeft(int speed) {
  // Motor Kiri: Mundur, Motor Kanan: Maju
  digitalWrite(motorL_IN1, LOW);
  digitalWrite(motorL_IN2, HIGH);
  analogWrite(motorL_ENA, speed);
  
  digitalWrite(motorR_IN3, HIGH);
  digitalWrite(motorR_IN4, LOW);
  analogWrite(motorR_ENB, speed);
}

void turnRight(int speed) {
  // Motor Kiri: Maju, Motor Kanan: Mundur
  digitalWrite(motorL_IN1, HIGH);
  digitalWrite(motorL_IN2, LOW);
  analogWrite(motorL_ENA, speed);
  
  digitalWrite(motorR_IN3, LOW);
  digitalWrite(motorR_IN4, HIGH);
  analogWrite(motorR_ENB, speed);
}

void spinLeft(int speed) {
  // Kedua motor berputar berlawanan arah (pivot kiri)
  digitalWrite(motorL_IN1, LOW);
  digitalWrite(motorL_IN2, HIGH);
  analogWrite(motorL_ENA, speed);
  
  digitalWrite(motorR_IN3, HIGH);
  digitalWrite(motorR_IN4, LOW);
  analogWrite(motorR_ENB, speed);
}

void spinRight(int speed) {
  // Kedua motor berputar berlawanan arah (pivot kanan)
  digitalWrite(motorL_IN1, HIGH);
  digitalWrite(motorL_IN2, LOW);
  analogWrite(motorL_ENA, speed);
  
  digitalWrite(motorR_IN3, LOW);
  digitalWrite(motorR_IN4, HIGH);
  analogWrite(motorR_ENB, speed);
}

void stopMotors() {
  // Matikan semua motor
  digitalWrite(motorL_IN1, LOW);
  digitalWrite(motorL_IN2, LOW);
  analogWrite(motorL_ENA, 0);
  
  digitalWrite(motorR_IN3, LOW);
  digitalWrite(motorR_IN4, LOW);
  analogWrite(motorR_ENB, 0);
}

// ========= FUNGSI SETTING KECEPATAN TIAP MOTOR =========

// Atur kecepatan motor kiri saja
void setLeftMotor(int direction, int speed) {
  // direction: 1 = maju, -1 = mundur, 0 = stop
  if (direction == 1) {
    digitalWrite(motorL_IN1, HIGH);
    digitalWrite(motorL_IN2, LOW);
  } else if (direction == -1) {
    digitalWrite(motorL_IN1, LOW);
    digitalWrite(motorL_IN2, HIGH);
  } else {
    digitalWrite(motorL_IN1, LOW);
    digitalWrite(motorL_IN2, LOW);
    speed = 0;
  }
  analogWrite(motorL_ENA, constrain(speed, 0, 255));
}

// Atur kecepatan motor kanan saja
void setRightMotor(int direction, int speed) {
  if (direction == 1) {
    digitalWrite(motorR_IN3, HIGH);
    digitalWrite(motorR_IN4, LOW);
  } else if (direction == -1) {
    digitalWrite(motorR_IN3, LOW);
    digitalWrite(motorR_IN4, HIGH);
  } else {
    digitalWrite(motorR_IN3, LOW);
    digitalWrite(motorR_IN4, LOW);
    speed = 0;
  }
  analogWrite(motorR_ENB, constrain(speed, 0, 255));
}

void loop() {
  // // === TEST 1: Maju ===
  // Serial.println(">> Maju 2 detik");
  // moveForward(speedDefault);
  // delay(2000);
  // stopMotors();
  // delay(500);
  
  // // === TEST 2: Mundur ===
  // Serial.println(">> Mundur 2 detik");
  // moveBackward(speedDefault);
  // delay(2000);
  // stopMotors();
  // delay(500);
  
  // // === TEST 3: Belok Kiri ===
  // Serial.println(">> Belok Kiri 1.5 detik");
  // turnLeft(speedDefault);
  // delay(1500);
  // stopMotors();
  // delay(500);
  
  // // === TEST 4: Belok Kanan ===
  // Serial.println(">> Belok Kanan 1.5 detik");
  // turnRight(speedDefault);
  // delay(1500);
  // stopMotors();
  // delay(500);
  
  // // === TEST 5: Putar di Tempat (Spin) ===
  // Serial.println(">> Spin Kiri 1 detik");
  // spinLeft(speedDefault);
  // delay(1000);
  // stopMotors();
  // delay(500);
  
  // Serial.println(">> Spin Kanan 1 detik");
  // spinRight(speedDefault);
  // delay(1000);
  // stopMotors();
  // delay(1000);
  setRightMotor(1,120);
  setLeftMotor(1,150);
  delay(2000);

  turnLeft(100);
  delay(200);

  setRightMotor(1,120);
  setLeftMotor(1,150);
  delay(10000);
}