# Uji sketch repo pada model simulator

Menggunakan `advance()`, sensor virtual, track, deadzone dan inersia yang sama dengan simulator browser. Adapter membaca parameter dari `.ino` dan mengirim PWM aktual tanpa kompensasi tambahan. PID tidak diubah; bang-bang diperbaiki menjadi tiga sensor dengan recovery lost-line.

## Baseline setelah perbaikan bang-bang

Arena 2 × 2 m, massa 550 g, loop 10 ms, tanpa gangguan. Deadzone start 60 / sustain 45 PWM.

| Sketch | Start kiri | Start kanan | Hasil |
| --- | --- | --- | --- |
| PID A0/A1/A2; 18/0,01/5; threshold 300; PWM dasar 60 | 106,65 s | 104,97 s | Zona finish |
| Bang-bang A0/A1/A2; threshold 400; PWM 86 | 58,55 s | 58,27 s | Zona finish |

Bang-bang sebelumnya memakai dua sensor A3/A2 dan PWM 68; berhenti setelah 12,3 / 11,7 cm karena kedua sensor hitam menjalankan stop. Versi asli disimpan di [referensi](../../code/reference/line_follower_bang_bang_2_sensor/line_follower_bang_bang_2_sensor.ino).

Perbaikan: kiri/tengah/kanan A0/A1/A2 mengikuti wiring PID, pola simetris tetap maju, startup 1 detik, coast 65 selama 150 ms saat kehilangan garis, pencarian PWM 86 ke sisi terakhir dan bergantian setiap 1.400 ms, stop terkunci setelah hilang 3 detik. Tidak menambahkan deteksi finish yang hanya berdasarkan semua sensor hitam.

## Variasi dan verifikasi

Massa 300, 550, 1.200 g × periode loop 1, 10, 20 ms × kedua start: **18 run per controller**. PID **18/18** dan bang-bang **18/18** mencapai zona finish dalam batas 120 detik.

Kesamaan adapter dan sketch C++ diverifikasi dengan mock Arduino, termasuk delapan pola sensor, threshold 400/401, batas grace/sweep/timeout, reacquisition, dan stop terkunci. Ini bukan build target Uno atau pengujian hardware.

**Kedua sketch belum memiliki deteksi atau stop finish sendiri.** Penilaian finish memakai zona geometris simulator dan menghentikan benchmark. Loop adalah asumsi uji: timing ADC, Serial, CPU Arduino, baterai, drop L298N, noise dan kalibrasi sensor/motor fisik belum diverifikasi.

## Reproduksi

Dari root repo, memerlukan `g++` di PATH:

```sh
python Simulator/tests/verify-repo-sketches.py
```

Dari folder `Simulator`:

```sh
node --experimental-strip-types tests/run-repo-sketches.mjs
python tests/plot-repo-sketches.py
npm test
npm run typecheck
```

[Data 36 run](../output/repo-sketch-test/results.json) · [Plot SVG](../output/repo-sketch-test/comparison.svg) · [Preview PNG](../output/repo-sketch-test/comparison.png)
