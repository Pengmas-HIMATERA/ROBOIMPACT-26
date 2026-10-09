# ROBOIMPACT · Line follower bang-bang

Sketch aktif memakai **tiga sensor A0/A1/A2**, Arduino Uno, L298N, dan dua motor TT. Bang-bang memilih maju atau belok dengan PWM tetap, tanpa gain PID.

[Sketch Arduino](line_follower_bang_bang.ino) · [Wiring umum](../../hardware/README.md) · [Panduan PID](../README.md#panduan-pid) · [Hasil uji](../../Simulator/tests/REPO_SKETCH_RESULTS.md)

## Wiring dan pengaturan

| Komponen | Pin Uno |
| --- | --- |
| Sensor kiri / tengah / kanan, AO | A0 / A1 / A2 |
| Motor kiri IN1 / IN2 / ENA | 10 / 9 / 11 PWM |
| Motor kanan IN3 / IN4 / ENB | 8 / 7 / 6 PWM |

Wiring sama dengan PID aktif dan diagram tiga sensor. Semua ground disatukan, VCC sensor ke suplai 5 V sesuai modul. Gunakan AO; modul DO saja memerlukan perubahan kode. Lepaskan jumper ENA/ENB untuk mengendalikan PWM.

Threshold **400**, hitam aktif jika ADC **> 400**. PWM maju dan belok **86**, coast **65**: nilai aktual di skala 0–255, tanpa kompensasi tambahan di sketch. Nilai ini melewati deadzone awal 60 pada model; motor nyata perlu dikalibrasi.

## Keputusan sensor

`1` = hitam, `0` = putih. Sensor samping mengambil prioritas terhadap tengah.

| Kiri | Tengah | Kanan | Gerak | PWM kiri / kanan |
| --- | --- | --- | --- | --- |
| 0 | 1 | 0 | Maju | 86 / 86 |
| 1 | 0 | 0 | Kiri | 0 / 86 |
| 1 | 1 | 0 | Kiri | 0 / 86 |
| 0 | 0 | 1 | Kanan | 86 / 0 |
| 0 | 1 | 1 | Kanan | 86 / 0 |
| 1 | 0 | 1 | Maju | 86 / 86 |
| 1 | 1 | 1 | Maju | 86 / 86 |
| 0 | 0 | 0 | Recovery | Sesuai tahap berikut |

Saat belok, satu roda berhenti dan roda lainnya maju. Semua hitam tidak lagi menghentikan robot: pola ini juga muncul pada penanda start atau persimpangan, sehingga tidak cukup untuk memastikan finish.

## Startup dan recovery

- Startup: motor diam 1 detik.
- Garis hilang kurang dari 150 ms: maju pelan dengan PWM 65/65.
- Masih hilang: cari ke arah belokan terakhir; tanpa riwayat, cari kanan. Arah berganti setiap 1.400 ms dengan PWM 86/0 atau 0/86.
- Garis ditemukan: lanjutkan keputusan sensor biasa.
- Hilang selama 3 detik: stop terkunci. Reset board untuk mencoba lagi.

Serial Monitor 9600 baud, dicetak paling sering setiap 100 ms supaya telemetri tidak menahan setiap loop. Periode loop fisik masih dipengaruhi ADC dan Serial; tidak dijamin sama dengan periode benchmark.

## Pengujian dan tuning

Buka sketch di Arduino IDE, pilih Uno dan port. Ukur nilai putih/hitam masing-masing sensor, lalu tentukan threshold di antaranya. Angkat roda saat memeriksa kanal motor dan arah putaran. Sesuaikan PWM kiri/kanan jika melenceng, dan uji tinggi serta jarak sensor ketika melewati tikungan.

Pada model simulator, massa 550 g dan loop 10 ms, sketch mencapai zona finish dari kedua start sekitar **58 detik**. Variasi massa 300–1.200 g dan loop 1/10/20 ms diuji pada kedua start. Detail dan batas pengujian tersedia dalam [laporan](../../Simulator/tests/REPO_SKETCH_RESULTS.md).

**Sketch belum memiliki deteksi atau stop finish sendiri.** Benchmark memakai zona geometris simulator untuk menilai finish dan menghentikan run; hasil ini bukan bukti stop otomatis di robot nyata. Noise, baterai, dan deadzone motor fisik belum dikalibrasi.

Mode browser memakai keputusan dan recovery yang sama, tetapi mengonversi demand 55 menjadi PWM 86 melalui kompensasi motor. Sketch mengirim PWM 86 secara langsung. Browser juga memiliki penilai finish berdasarkan posisi arena.

[Versi dua sensor asli](../reference/line_follower_bang_bang_2_sensor/line_follower_bang_bang_2_sensor.ino) disimpan untuk referensi: A3/A2, PWM 68, dan stop ketika kedua sensor hitam.
