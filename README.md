# ROBOIMPACT 2026 | LINE FOLLOWER

Program Arduino dan simulator robot line follower: PID tiga sensor, bang-bang, serta tes sensor dan motor.

## Preview simulasi PID

[![Animasi lengkap: start, tiga dorongan, dan finish](Simulator/assets/pid-preview.gif)](Simulator/output/pid-follow-preview.mp4)

Kamera Ikuti dengan tiga dorongan lateral untuk memperlihatkan koreksi PID hingga robot berhenti di finish. Video memakai fisika asumsi dan recovery khusus simulator, bukan pengujian robot fisik. [Cara menjalankan simulator](Simulator/README.md).

## Track

<img src="Simulator/assets/track.svg" alt="Track line follower: start kiri atau kanan dan finish pada balok hitam tengah" width="560">

Start dari garis panjang di kiri atau kanan, menuju finish pada balok hitam tengah.

## Sketch Arduino

| Sketch | Fungsi |
| --- | --- |
| [PID tiga sensor](code/line_follower_pid/line_follower_pid.ino) | Kiri/tengah/kanan A0/A1/A2; gain 18/0,01/5; threshold 300. |
| [code/line_follower_bang_bang/line_follower_bang_bang.ino](code/line_follower_bang_bang/line_follower_bang_bang.ino) | Kontrol bang-bang tiga sensor A0/A1/A2, threshold 400, PWM 86, recovery lost-line, Serial 9600 baud. |
| `test/motor_test/motor_test.ino` | Pengujian motor melalui driver L298N. |
| `test/sensor_test/sensor_test.ino` | Pembacaan sensor garis melalui Serial Monitor. |

## Penggunaan

[Panduan bang-bang](code/line_follower_bang_bang/README.md) · [Panduan PID](code/README.md#panduan-pid) · [Hardware dan wiring umum](hardware/README.md) · [Panduan simulator](Simulator/README.md)

1. Buka sketch di Arduino IDE dan pilih board serta port sesuai perangkat.
2. Periksa pemetaan pin dan kecepatan motor sebelum upload.
3. Serial Monitor tes sensor menggunakan 115200 baud; tes motor menggunakan 9600 baud.

## Pemetaan pin

| Sinyal | Program utama | Tes terkait |
| --- | --- | --- |
| Sensor PID | Kiri/tengah/kanan A0/A1/A2 | Tes sensor A0/A1/A2 |
| Motor kiri (IN1, IN2, ENA) | 10, 9, 11 | 10, 9, 11 |
| Motor kanan (IN3, IN4, ENB) | 8, 7, 6 | 8, 7, 6 |
