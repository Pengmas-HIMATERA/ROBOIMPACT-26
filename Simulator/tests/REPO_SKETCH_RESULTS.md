# Uji sketch repo pada model simulator

Menggunakan `advance()`, sensor virtual, track, deadzone dan inersia yang sama dengan simulator browser. Adapter membaca parameter serta threshold setiap sensor dari `.ino` dan mengirim PWM aktual tanpa kompensasi tambahan. Sketch aktif: PID tiga sensor A0/A1/A2 dan bang-bang dua sensor A3/A2. ADC tengah pada model diabaikan oleh adapter bang-bang.

## Baseline sketch aktif

Arena 2 × 2 m, massa 550 g, loop 10 ms, tanpa gangguan. Deadzone start 60 / sustain 45 PWM.

| Sketch | Start kiri | Start kanan | Hasil |
| --- | --- | --- | --- |
| PID A0/A1/A2; 18/0,01/5; threshold 300/300/300; PWM dasar 60 | 106,65 s | 104,97 s | Zona finish |
| Bang-bang A3/A2; threshold 400/400; PWM 68 | 6,05 s | 5,94 s | Run dihentikan karena robot diam |

Bang-bang aktif berhenti setelah 12,3 / 11,7 cm karena kedua sensor hitam memerintahkan stop. Runner mengakhiri run setelah robot hampir diam selama tiga detik; waktu pada tabel termasuk penantian ini. Stop pada sketch tidak terkunci: jika ADC berubah, keputusan motor dapat berubah. Versi dengan satu threshold bersama disimpan di [referensi](../../code/reference/line_follower_bang_bang_2_sensor/line_follower_bang_bang_2_sensor.ino).

Mode bang-bang browser masih memakai tiga sensor, PWM 86 dan recovery simulator. Hasil browser tersebut berbeda dari pengujian sketch aktif dua sensor di laporan ini.

## Variasi dan verifikasi

Massa 300, 550, 1.200 g × periode loop 1, 10, 20 ms × kedua start: **18 run per controller**. PID **18/18** mencapai zona finish dalam batas 120 detik. Bang-bang **18/18** berhenti karena pola kedua sensor hitam, tanpa mencapai finish.

Kesamaan adapter dan sketch C++ diverifikasi dengan mock Arduino pada **176 sampel per controller dan profil kalibrasi**. Profil default memakai threshold bang-bang 400/400 dan PID 300/300/300; profil berbeda memakai 200/600 dan 200/400/600 dalam salinan sketch sementara. Total **704 perbandingan** memeriksa PWM, serta error, integral, dan arah pencarian PID. Sampel mencakup batas threshold, sensor tengah yang diabaikan bang-bang, serta stop dan gerak kembali. Ini bukan build target Uno atau pengujian hardware.

**Kedua sketch belum memiliki deteksi atau stop finish sendiri.** Penilaian finish memakai zona geometris simulator dan menghentikan benchmark. Loop adalah asumsi uji: timing ADC, Serial, CPU Arduino, baterai, drop L298N, noise dan kalibrasi sensor/motor fisik belum diverifikasi.

## Reproduksi

Dari root repo, memerlukan `g++` di PATH:

```powershell
uv run --no-project python Simulator/tests/verify-repo-sketches.py
```

Dari folder `Simulator`:

```powershell
node --experimental-strip-types tests/run-repo-sketches.mjs
uv run --no-project python tests/plot-repo-sketches.py
npm test
npm run typecheck
```

[Data 36 run](../output/repo-sketch-test/results.json) · [Plot SVG](../output/repo-sketch-test/comparison.svg)
