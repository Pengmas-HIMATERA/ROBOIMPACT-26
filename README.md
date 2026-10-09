# ROBOIMPACT 2026 | LINE FOLLOWER

Program Arduino dan simulator robot line follower: PID tiga sensor, bang-bang, serta tes sensor dan motor.

Simulator memakai **bang-bang tiga sensor sebagai default**, dengan PID sebagai pembanding. Kedua sketch aktif memakai sensor kiri/tengah/kanan **A0/A1/A2** dan pemetaan motor yang sama.

[Mulai praktik](code/README.md#mulai-praktik) · [Panduan bang-bang](code/line_follower_bang_bang/README.md) · [Panduan PID](code/README.md#panduan-pid) · [Simulator](Simulator/README.md) · [Hardware](hardware/README.md)

## Preview simulasi PID

[![Animasi lengkap model terbaru: start, tiga dorongan, dan finish](Simulator/assets/pid-preview.gif?v=20261009)](Simulator/output/pid-follow-preview.mp4)

Preview model terbaru: Uno di tray bertiang, roda TT kuning, dan tiga sensor IR biru. Kamera Ikuti dengan tiga dorongan lateral memperlihatkan koreksi PID hingga robot berhenti di finish. GIF dan MP4 ditayangkan **4×**, memakai Kp 30, Ki 0, Kd 5 serta massa 550 g. Ini simulasi fisika asumsi dan recovery khusus simulator, bukan pengujian robot fisik. [Cara menjalankan simulator](Simulator/README.md).

## Track

<img src="Simulator/assets/track.svg" alt="Track line follower: start kiri atau kanan dan finish pada balok hitam tengah" width="560">

Start dari garis panjang di kiri atau kanan, menuju finish pada balok hitam tengah.

## Sketch Arduino

| Sketch | Fungsi |
| --- | --- |
| [PID tiga sensor](code/line_follower_pid/line_follower_pid.ino) | Kiri/tengah/kanan A0/A1/A2; gain 18/0,01/5; threshold 300. |
| [Bang-bang tiga sensor](code/line_follower_bang_bang/line_follower_bang_bang.ino) | A0/A1/A2, threshold 400, PWM 86, recovery lost-line, Serial 9600 baud. |
| [Tes motor](code/test/motor_test/motor_test.ino) | Pengujian motor melalui driver L298N. |
| [Tes sensor](code/test/sensor_test/sensor_test.ino) | Pembacaan sensor garis melalui Serial Monitor. |

Versi lama disimpan di [code/reference](code/reference/README.md). Kedua sketch aktif belum memiliki deteksi atau stop finish sendiri; stop pada zona finish merupakan fitur simulator.

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

## Hardware dan wiring

Arduino Uno R3, driver L298N, dua motor TT, dan tiga sensor IR analog memakai rangkaian yang sama untuk bang-bang maupun PID.

![Wiring tiga sensor: Arduino Uno, L298N, dan dua motor](hardware/wiring-3-sensor.svg)

[PNG wiring](hardware/wiring-3-sensor.png) · [Daftar sambungan](hardware/connections-3-sensor.csv) · [Panduan hardware dan referensi lima sensor](hardware/README.md)

## Hasil uji simulator

Uji sketch repo pada variasi massa 300/550/1.200 g, periode loop 1/10/20 ms, dan kedua posisi start mencapai zona finish pada **18/18 run PID** serta **18/18 run bang-bang**. Hasil ini berasal dari model simulator, bukan pengujian robot fisik atau build target Uno.

[Hasil, batasan, dan cara reproduksi](Simulator/tests/REPO_SKETCH_RESULTS.md)
