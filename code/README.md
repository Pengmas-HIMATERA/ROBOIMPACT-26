[ROBOIMPACT](../README.md) / Firmware

<sub>ROBOIMPACT 2026 / FIRMWARE</sub>

# ROBOIMPACT · Kode robot

Sketch Arduino untuk praktik line follower dua roda. Alur praktik: **sensor → motor → bang-bang dua sensor → PID tiga sensor → lost-line**.

[Mulai praktik](#mulai-praktik) · [Pengujian komponen](test/README.md) · [Bang-bang](line_follower_bang_bang/README.md) · [PID](line_follower_pid/README.md) · [Hardware](../hardware/README.md) · [Simulator](../Simulator/README.md)

## Isi folder

| Folder | Isi dan tujuan |
| --- | --- |
| [line_follower_bang_bang/](line_follower_bang_bang/README.md) | Sketch aktif dua sensor, tabel keputusan, dan kalibrasi dua threshold |
| [line_follower_pid/](line_follower_pid/README.md) | Sketch aktif tiga sensor, tuning PID, dan perilaku lost-line |
| [test/](test/README.md) | Sketch tes sensor dan motor sebelum menjalankan line follower |
| assets/ | Ilustrasi respons P, I, dan D yang dipakai panduan PID |

Setiap sketch berada dalam folder dengan nama yang sama dengan file `.ino`, sesuai format Arduino IDE. Diagram dan sumber pembuat wiring berada di [hardware/](../hardware/README.md).

## Mulai praktik

Buka file `.ino` di Arduino IDE, pilih board **Arduino Uno** dan port yang sesuai, lalu upload satu sketch pada satu waktu. Sketch aktif memakai fungsi bawaan Arduino dan tidak memerlukan library tambahan.

| Urutan | Sketch | Yang diperiksa | Serial Monitor |
| --- | --- | --- | --- |
| 1 · Sensor | [sensor_test.ino](test/sensor_test/sensor_test.ino) | Nilai putih/hitam setiap sensor sebagai dasar kalibrasi | 115200 baud |
| 2 · Motor | [motor_test.ino](test/motor_test/motor_test.ino) | Kanal kiri/kanan dan arah putaran roda | 9600 baud |
| 3 · Bang-bang | [line_follower_bang_bang.ino](line_follower_bang_bang/line_follower_bang_bang.ino) | Empat keputusan dari dua sensor | 9600 baud |
| 4 · PID | [line_follower_pid.ino](line_follower_pid/line_follower_pid.ino) | Tracking, tuning gain, dan pencarian saat garis hilang | 115200 baud |

Angkat roda saat tes motor pertama dan setelah berganti sketch. Tes motor serta kedua line follower mengendalikan motor secara otomatis setelah `setup()`.

## Konfigurasi sketch aktif

| Konfigurasi | Bang-bang | PID | Tes komponen |
| --- | --- | --- | --- |
| Sensor kiri → kanan | A3, A2 | A0, A1, A2 | Tes sensor: A0, A1, A2 |
| Threshold | `THRESHOLD_KIRI = 400`, `THRESHOLD_KANAN = 400` | `THRESHOLD_KIRI = 300`, `THRESHOLD_TENGAH = 300`, `THRESHOLD_KANAN = 300` | Menampilkan ADC, tanpa threshold |
| PWM tracking awal | Kiri/kanan 68/68 | Dasar 60/60, dibatasi 0–85 | Tes motor: sesuai urutan dalam panduannya |
| Motor kiri | IN1 D10, IN2 D9, ENA D11 PWM | Sama | Sama pada tes motor |
| Motor kanan | IN3 D8, IN4 D7, ENB D6 PWM | Sama | Sama pada tes motor |

> [!IMPORTANT]
> **Pin kiri bang-bang berbeda dari PID dan tes sensor.** Untuk menguji wiring bang-bang, sesuaikan input kiri tes sensor dari A0 ke A3; sensor tengah tidak digunakan. Kalibrasikan threshold tiap sensor dari pengukuran aktual, bukan hanya menyalin nilai awal.

Bang-bang menganggap ADC di atas threshold sebagai hitam dan berhenti selama kedua sensor hitam. PID memakai bobot sinyal tiap sensor dan belum memiliki deteksi finish. Lihat panduan masing-masing untuk perilaku lengkap.

## Arduino dan simulator

[Simulator TypeScript + Three.js](../Simulator/README.md) menyediakan latihan serta pengujian model robot. Mode simulator memiliki fitur seperti recovery tambahan dan finish berdasarkan zona arena; fitur tersebut tidak otomatis tersedia pada sketch Arduino. [Laporan benchmark sketch](../Simulator/tests/REPO_SKETCH_RESULTS.md) menjelaskan kondisi dan batas pengujian model.

Dokumentasi ini mengikuti source dalam repo. Hasil simulasi bukan pengganti pengujian dan kalibrasi hardware.

---

[Repo](../README.md) · **Langkah berikutnya: [tes sensor dan motor](test/README.md)** · [Wiring](../hardware/README.md)
