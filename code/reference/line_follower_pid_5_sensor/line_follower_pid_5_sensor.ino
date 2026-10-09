// ========== PIN SENSOR ==========
const int s1 = A0;
const int s2 = A1;
const int s3 = A2;
const int s4 = A3;
const int s5 = A4;
// const int s6 = A5;

// ========== PIN MOTOR ==========
// KIRI
const int motorL_IN1 = 10;
const int motorL_IN2 = 9;
const int motorL_ENA = 11;
// KANAN
const int motorR_IN3 = 8;
const int motorR_IN4 = 7;
const int motorR_ENB = 6;

// ========== Konstanta PID ==========
float Kp = 18.0; //10
float Ki = 0;
float Kd = 5.0; //5

// ========== MOTOR SETTINGS ==========
const int baseSpeedR = 55;   // <-- motor kiri
const int baseSpeedL = 55;   // <-- motor kanan
const int maxSpeed   = 90;
const int minSpeed   = 0;
const int reverseBaseSpeed = 60;
const int reverseMaxSpeed  = 90;
const int reverseMinSpeed  = 0;

// ========== PEMBACAAN SENSOR ==========
const int sensorThreshold = 100;

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

void setup() {
  Serial.begin(115200);

  pinMode(s1, INPUT);
  pinMode(s2, INPUT);
  pinMode(s3, INPUT);
  pinMode(s4, INPUT);
  pinMode(s5, INPUT);
  // pinMode(s6, INPUT);

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
  int sensorVal[5]; //5
  int weightedSum = 0;
  int totalWeight = 0;

  sensorVal[0] = analogRead(s1);  // posisi -15
  sensorVal[1] = analogRead(s2);  // posisi -5
  sensorVal[2] = analogRead(s3);  // posisi  0
  sensorVal[3] = analogRead(s4);  // posisi +5
  sensorVal[4] = analogRead(s5);  // posisi +15

  int positions[5] = {-10, -2, 0, 2, 10};

  for (int i = 0; i < 5; i++) {
    if (sensorVal[i] > sensorThreshold) {  //<
      int weight = sensorVal[i] - sensorThreshold;
      weightedSum += positions[i] * weight;
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

void setRightMotor(int direction, int speed) {
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

void setLeftMotor(int direction, int speed) {
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

  //debug sensor
  Serial.print(analogRead(s1));
  Serial.print(" ");
  Serial.print(analogRead(s2));
  Serial.print(" ");
  Serial.print(analogRead(s3));
  Serial.print(" ");
  Serial.print(analogRead(s4));
  Serial.print(" ");
  Serial.print(analogRead(s5));
  Serial.println();

}

// ========== LOOP ==========
void loop() {                                         
  error = readSensors();
  // ==========================
  // PID NORMAL
  // ==========================
  if (lineDetected) {

    if (error > 5)
      searchDirection = 1;
    else if (error < -5)
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