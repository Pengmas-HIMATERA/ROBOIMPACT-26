// ========== PIN DEFINITIONS ==========
const int s1 = A0; // kiri
const int s2 = A1; // tengah
const int s3 = A2; // kanan
const int SENSOR_COUNT = 3;
const int sensorPins[SENSOR_COUNT] = {s1, s2, s3};
const int sensorPositions[SENSOR_COUNT] = {-2, 0, 2};
const float SEARCH_DEADBAND = 0.25; // harus lebih kecil dari rentang error +/-2

const int motorL_IN1 = 10;
const int motorL_IN2 = 9;
const int motorL_ENA = 11;

const int motorR_IN3 = 8;
const int motorR_IN4 = 7;
const int motorR_ENB = 6;

const int servoPin = 4;

// ========== PID CONSTANTS ==========
float Kp =18.0; //10
float Ki = 0.01;
float Kd = 5.0; //5

// ========== MOTOR SETTINGS ==========
const int baseSpeedR = 60;   // PWM dasar motor kanan
const int baseSpeedL = 60;   // PWM dasar motor kiri
const int maxSpeed   = 85;
const int minSpeed   = 0;
const int reverseBaseSpeed = 60;
const int reverseMaxSpeed  = 90;
const int reverseMinSpeed  = 0;

// ========== THRESHOLD ==========
const int sensorThresholds[SENSOR_COUNT] = {300, 300, 300}; // kiri, tengah, kanan

// ========== VARIABLES ==========
float error      = 0, lastError  = 0;
float integral   = 0, derivative = 0;
float pidOutput  = 0;
int   leftSpeed  = 0, rightSpeed = 0;
bool  lineDetected = false;
unsigned long lastLineTime = 0;
float lastValidError = 0;
int searchDirection = 0;

//flag
bool checkpointDetected = false;
bool pickup = false;
bool drop = false;
unsigned long checkpointTime = 0;
bool misi = false;
bool sinus = false;

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < SENSOR_COUNT; i++) {
    pinMode(sensorPins[i], INPUT);
  }

  pinMode(motorL_IN1, OUTPUT);
  pinMode(motorL_IN2, OUTPUT);
  pinMode(motorL_ENA, OUTPUT);
  pinMode(motorR_IN3, OUTPUT);
  pinMode(motorR_IN4, OUTPUT);
  pinMode(motorR_ENB, OUTPUT);

  stopMotors();
  Serial.println("=== Robot Ready ===");
  delay(1000);
}

// ========== BACA SENSOR ==========
float readSensors() {
  int sensorVal[SENSOR_COUNT];
  int weightedSum = 0;
  int totalWeight = 0;

  for (int i = 0; i < SENSOR_COUNT; i++) {
    sensorVal[i] = analogRead(sensorPins[i]);
    if (sensorVal[i] > sensorThresholds[i]) {
      int weight = sensorVal[i] - sensorThresholds[i];
      weightedSum += sensorPositions[i] * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight == 0) {
    lineDetected = false;
    integral = 0;
    return error;
  }

  lineDetected = true;
  lastLineTime = millis();

  float currentError = (float)weightedSum / totalWeight;
  lastValidError = currentError;

  return currentError;
}

// ========== PID ==========
void calculatePID() {
  float P = Kp * error;

  integral += error;
  integral  = constrain(integral, -100, 100);
  float I   = Ki * integral;

  derivative = error - lastError;
  float D    = Kd * derivative;

  pidOutput = P + I + D;
  lastError = error;
}

// ========== MOTOR ==========
void moveMotors() {
  leftSpeed  = baseSpeedL + pidOutput;
  rightSpeed = baseSpeedR - pidOutput;

  leftSpeed  = constrain(leftSpeed,  minSpeed, maxSpeed);
  rightSpeed = constrain(rightSpeed, minSpeed, maxSpeed);

  setLeftMotor(1, leftSpeed);
  setRightMotor(1, rightSpeed);
}

void stopMotors() {
  digitalWrite(motorL_IN1, LOW);
  digitalWrite(motorL_IN2, LOW);
  analogWrite(motorL_ENA, 0);
  digitalWrite(motorR_IN3, LOW);
  digitalWrite(motorR_IN4, LOW);
  analogWrite(motorR_ENB, 0);
}

void setLeftMotor(int direction, int speed) {
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

// ========== DEBUG ==========
void debugOutput() {
  // //debug pid
  // Serial.print("Detected: "); Serial.print(lineDetected ? "YES" : "NO ");
  // Serial.print(" | Error: "); Serial.print(error, 1);
  // Serial.print(" | PID: ");   Serial.print(pidOutput, 1);
  // Serial.print(" | L: ");     Serial.print(leftSpeed);
  // Serial.print(" | R: ");     Serial.println(rightSpeed);

  // Debug tiga sensor: kiri, tengah, kanan.
  for (int i = 0; i < SENSOR_COUNT; i++) {
    if (i > 0) Serial.print(" ");
    Serial.print(analogRead(sensorPins[i]));
  }
  Serial.println();

}

// ========== LOOP ==========
void loop() {
  error = readSensors();
  // if (analogRead(s1) > sensorThresholds[0] &&
  //     analogRead(s2) > sensorThresholds[1] &&
  //     analogRead(s3) > sensorThresholds[2] &&
  //     sinus != true
  // ){
  //   stopMotors();
  //   delay(500);

  //   setRightMotor(1, 90);
  //   setLeftMotor(1, 0);
  //   delay(250);

  //   setRightMotor(1, 0);
  //   setLeftMotor(1, 90);
  //   delay(250);

  //   setRightMotor(1, 90);
  //   setLeftMotor(1, 0);
  //   delay(250);

  //   setRightMotor(1, 0);
  //   setLeftMotor(1, 90);
  //   delay(250);

  //   sinus = true;
  // }

  // ==========================
  // PID
  // ==========================
  if (lineDetected) {

    if (error > SEARCH_DEADBAND)
      searchDirection = 1;
    else if (error < -SEARCH_DEADBAND)
      searchDirection = -1;

    calculatePID();
    moveMotors();
  }

  // ==========================
  // LOST LINE
  // ==========================
  else {

    if (millis() - lastLineTime < 1000) {

      moveMotors();
    }
    else {

      if (searchDirection == 1) {

        setLeftMotor(1, 90);
        setRightMotor(1, 0);
      }
      else if (searchDirection == -1) {

        setLeftMotor(1, 0);
        setRightMotor(1, 90);
      }
    }
  }
  debugOutput();
  delay(1);
}
