int s1 = A1;
int s2 = A2;
int s3 = A3;
int s4 = A4;
int s5 = A5;

void setup() {
  Serial.begin(115200);
}

void loop() {
  int v1 = analogRead(s1);
  int v2 = analogRead(s2);
  int v3 = analogRead(s3);
  int v4 = analogRead(s4);
  int v5 = analogRead(s5);

  Serial.print("S1: "); Serial.print(v1);
  Serial.print(" | S2: "); Serial.print(v2);
  Serial.print(" | S3: "); Serial.print(v3);
  Serial.print(" | S4: "); Serial.print(v4);
  Serial.print(" | S5: "); Serial.println(v5);

  delay(300);
}