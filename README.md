# Eksperimen Robotika I

Program Arduino untuk robot line follower berbasis PID dengan manuver checkpoint dan parkir.

## Program

| Sketch | Fungsi |
| --- | --- |
| `line_follower/line_follower.ino` | Program utama line follower, manuver checkpoint, dan parkir. |
| `line_follower_pid/line_follower_pid.ino` | Versi PID dan pencarian garis tanpa manuver misi (sebelumnya `line_follower1.ino`). |
| `test/motor_test/motor_test.ino` | Pengujian motor melalui driver L298N. |
| `test/sensor_test/sensor_test.ino` | Pembacaan sensor garis melalui Serial Monitor. |

Nama folder dan file sketch dibuat sama agar dapat dibuka langsung di Arduino IDE. Setiap program lengkap ditempatkan dalam folder terpisah untuk menghindari deklarasi ganda saat kompilasi.

## Penggunaan

1. Buka sketch di Arduino IDE dan pilih board serta port sesuai perangkat.
2. Periksa pemetaan pin dan kecepatan motor sebelum upload.
3. Serial Monitor tes sensor menggunakan 115200 baud; tes motor menggunakan 9600 baud.

## Pemetaan pin

Sketch tes masih memakai konfigurasi eksperimen sebelumnya. Sesuaikan pin dengan wiring robot sebelum digunakan.

| Sinyal | Program utama | Tes terkait |
| --- | --- | --- |
| Sensor | S1-S6: A0-A5 | S1-S5: A1-A5 |
| Motor kiri (IN1, IN2, ENA) | 10, 9, 11 | 8, 7, 6 |
| Motor kanan (IN3, IN4, ENB) | 8, 7, 6 | 10, 9, 11 |

Varian PID eksperimen dan tes MQ-2 dihapus dari struktur aktif. Versi yang pernah di-commit tetap tersedia melalui riwayat Git.
