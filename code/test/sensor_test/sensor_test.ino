int s1 = A0; // kiri
int s2 = A1; // tengah
int s3 = A2; // kanan

void setup() {
  Serial.begin(115200);
}

void loop() {
  int v1 = analogRead(s1);
  int v2 = analogRead(s2);
  int v3 = analogRead(s3);

  Serial.print("S1: "); Serial.print(v1);
  Serial.print(" | S2: "); Serial.print(v2);
  Serial.print(" | S3: "); Serial.println(v3);

  delay(300);
}