[ROBOIMPACT](../../README.md) / [Firmware](../README.md) / Bang-bang

<sub>ROBOIMPACT 2026 / FIRMWARE</sub>

# ROBOIMPACT · Line follower bang-bang

Sketch aktif memakai **dua sensor: kiri A3 dan kanan A2**, Arduino Uno, L298N, dan dua motor TT. Bang-bang memilih maju, belok, atau berhenti dari kombinasi kedua sensor, tanpa gain PID.

[Sketch Arduino](line_follower_bang_bang.ino) · [Wiring](#wiring-dan-pengaturan) · [Keputusan sensor](#keputusan-sensor) · [Pengujian](#pengujian-dan-tuning)

## Wiring dan pengaturan

| Komponen | Pin Uno |
| --- | --- |
| Sensor kiri, AO | A3 |
| Sensor kanan, AO | A2 |
| Motor kiri IN1 / IN2 / ENA | 10 / 9 / 11 PWM |
| Motor kanan IN3 / IN4 / ENB | 8 / 7 / 6 PWM |

Pemetaan motor sama dengan PID aktif, tetapi PID memakai tiga sensor A0/A1/A2. Semua ground disatukan, VCC sensor ke suplai 5 V sesuai modul. Gunakan AO; modul DO saja memerlukan perubahan kode. Lepaskan jumper ENA/ENB untuk mengendalikan PWM.

> [!IMPORTANT]
> Diagram dalam [panduan hardware](../../hardware/README.md) memakai **tiga sensor**. Untuk sketch aktif ini, gunakan sambungan dua sensor **A3/A2** pada tabel di atas; sensor tengah tidak digunakan.

Ada **dua threshold independen**: `THRESHOLD_KIRI = 400` dan `THRESHOLD_KANAN = 400`. Sensor dianggap membaca hitam ketika ADC lebih besar dari threshold miliknya. Nilai awalnya sama, tetapi dapat dikalibrasi berbeda. PWM `speedKiri` dan `speedKanan` masing-masing **68**, pada skala 0–255.

## Keputusan sensor

`1` = hitam, `0` = putih, berdasarkan threshold masing-masing sensor.

| Kiri | Kanan | Gerak | PWM kiri / kanan |
| --- | --- | --- | --- |
| 0 | 0 | Maju | 68 / 68 |
| 1 | 0 | Kiri | 0 / 68 |
| 0 | 1 | Kanan | 68 / 0 |
| 1 | 1 | Berhenti | 0 / 0 |

Saat belok, satu roda berhenti dan roda lainnya maju. Kedua sensor hitam menghentikan motor selama pola itu terbaca; kondisi ini tidak terkunci dan bukan deteksi finish khusus. Jika pola berubah, robot mengikuti keputusan berikutnya.

> [!NOTE]
> Sketch langsung membaca sensor setelah `setup()`, tanpa startup delay atau recovery lost-line. Kedua sensor putih tetap memerintahkan maju, termasuk ketika robot kehilangan garis.

Serial Monitor **9600 baud** mencetak ADC kiri/kanan setiap loop; pembacaan ADC dan Serial ikut menentukan periode loop.

## Pengujian dan tuning

Buka sketch di Arduino IDE, pilih Uno dan port. Ukur nilai putih/hitam masing-masing sensor, lalu tentukan `THRESHOLD_KIRI` dan `THRESHOLD_KANAN` di antara kedua hasil pengukuran sensor terkait. Angkat roda saat memeriksa keempat kombinasi keputusan, kanal motor, dan arah putaran. Sesuaikan PWM kiri/kanan jika melenceng, dan uji tinggi serta jarak sensor ketika melewati tikungan.

[Hasil benchmark terbaru](../../Simulator/tests/REPO_SKETCH_RESULTS.md) menguji sketch dua sensor aktif dengan PWM 68 pada model simulator. Kondisi dan batas pengujian tercantum dalam laporan; perilaku motor nyata tetap perlu diuji dan dikalibrasi.

---

[Sebelumnya: tes komponen](../test/README.md) · [Firmware](../README.md) · **Berikutnya: [line follower PID](../line_follower_pid/README.md)**
