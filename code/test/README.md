[ROBOIMPACT](../../README.md) / [Firmware](../README.md) / Tes komponen

<sub>ROBOIMPACT 2026 / BENCH TEST</sub>

# Pengujian sensor dan motor

Dua sketch ini memeriksa komponen sebelum menjalankan line follower. Keduanya adalah sketch Arduino mandiri, bukan automated test simulator.

[Tes sensor](#tes-sensor) · [Tes motor](#tes-motor) · [Wiring](../../hardware/README.md)

| Folder | Sketch | Tujuan |
| --- | --- | --- |
| sensor_test/ | [sensor_test.ino](sensor_test/sensor_test.ino) | Membaca ADC tiga sensor untuk kalibrasi |
| motor_test/ | [motor_test.ino](motor_test/motor_test.ino) | Memeriksa kanal motor dan arah putaran |

Buka sketch yang ingin diuji di Arduino IDE, pilih Arduino Uno serta port, lalu upload. Masing-masing folder harus tetap memiliki nama yang sama dengan file `.ino` di dalamnya.

## Tes sensor

Sketch memakai tiga input: **S1 kiri A0**, **S2 tengah A1**, dan **S3 kanan A2**. Buka Serial Monitor pada **115200 baud**. Format keluarannya:

```text
S1: <ADC kiri> | S2: <ADC tengah> | S3: <ADC kanan>
```

Pembacaan dicetak setiap sekitar **300 ms**. Sketch ini hanya membaca sensor dan tidak mengendalikan motor atau menerapkan threshold.

1. Tempatkan masing-masing sensor di atas putih dan hitam pada tinggi pemasangan yang akan dipakai.
2. Catat rentang ADC tiap sensor; pastikan perbedaannya cukup jelas.
3. Pilih threshold di antara kedua rentang untuk sensor terkait.
4. Masukkan hasilnya ke `THRESHOLD_KIRI` / `THRESHOLD_KANAN` pada bang-bang atau elemen `sensorThresholds` kiri/tengah/kanan pada PID.

Sketch line follower aktif menganggap **ADC lebih besar dari threshold sebagai garis hitam**. Pastikan pembacaan hardware mendukung asumsi ini.

> [!NOTE]
> Untuk wiring bang-bang dua sensor, input kiri berada di **A3** dan kanan **A2**. Sesuaikan deklarasi input kiri tes sensor dari A0 ke A3 sebelum menguji wiring tersebut; pembacaan tengah tidak digunakan.

## Tes motor

> [!IMPORTANT]
> **Angkat roda sebelum memberi daya.** Setelah startup selama satu detik, sketch menjalankan urutan motor berulang tanpa menunggu input Serial.

| Fungsi | Pin arah Uno | Pin PWM Uno | Kanal L298N |
| --- | --- | --- | --- |
| `setLeftMotor()` | 10, 9 | 11 | A · kiri |
| `setRightMotor()` | 8, 7 | 6 | B · kanan |

Buka Serial Monitor pada **9600 baud** untuk pesan startup `=== Motor Test L298N Started ===`. Loop aktif tidak mencetak tahap gerakan.

| Tahap | Perintah aktif | Durasi |
| --- | --- | --- |
| 1 | Kiri maju PWM 150, kanan maju PWM 120 | 2 detik |
| 2 | `turnLeft(100)`: kiri mundur, kanan maju, PWM 100/100 | 200 ms |
| 3 | Kiri maju PWM 150, kanan maju PWM 120 | 10 detik |

Setelah tahap 3, urutan langsung kembali ke tahap 1 tanpa berhenti. Periksa bahwa fungsi kiri/kanan mengendalikan roda yang sesuai, lalu cocokkan arah maju dengan pemasangan kabel motor.

Fungsi maju, mundur, dan spin tersedia, tetapi rangkaian tes untuk fungsi-fungsi tersebut masih dikomentari. `speedDefault = 200` tidak dipakai oleh loop aktif. Pemetaan motor sama dengan kedua line follower aktif.

---

[Hardware](../../hardware/README.md) · [Firmware](../README.md) · **Berikutnya: [bang-bang dua sensor](../line_follower_bang_bang/README.md)**
