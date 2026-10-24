[ROBOIMPACT 2026](../../README.md) / [Simulator](../README.md) / Pengujian

<sub>ROBOIMPACT 2026 / VALIDATION</sub>

<a id="pengujian-simulator-dan-sketch-arduino"></a>

# Pengujian

[Pemeriksaan cepat](#pemeriksaan-cepat) · [Isi folder](#isi-folder) · [Verifikasi C++](#verifikasi-adapter-terhadap-c) · [Benchmark](#benchmark-perjalanan-dan-plot) · [Laporan hasil](REPO_SKETCH_RESULTS.md)

Folder ini memisahkan pengujian controller browser dari pengujian logika sketch `.ino` pada model fisika yang sama. Controller browser memakai tiga sensor dan tuning/recovery sendiri; sketch aktif bang-bang memakai dua sensor, sedangkan sketch PID memakai tiga sensor.

## Pemeriksaan cepat

Gunakan Node.js 22.18+ dan dependensi `npm ci` dari folder `Simulator`. Jalankan dari folder tersebut:

```powershell
npm test
npm run typecheck
```

`npm test` menjalankan `model.test.mjs` melalui test runner Node dengan TypeScript stripping. Tes juga membaca sketch aktif di `../../code/line_follower_pid/` dan `../../code/line_follower_bang_bang/`; pertahankan susunan repository saat menjalankannya. Perintah ini tidak melakukan build Uno, kompilasi C++, atau menghasilkan laporan benchmark.

## Isi folder

| File | Peran |
| --- | --- |
| [model.test.mjs](model.test.mjs) | Unit/regresi controller, deadzone, dinamika, sensor, finish, dan konfigurasi sketch aktif |
| [repo-sketch-adapter.mjs](repo-sketch-adapter.mjs) | Port JavaScript logika `.ino`; membaca gain, threshold per sensor, dan parameter motor dari source |
| [verify-repo-sketches.py](verify-repo-sketches.py) | Membandingkan adapter dengan sketch C++ melalui mock API Arduino |
| [run-repo-sketches.mjs](run-repo-sketches.mjs) | Menjalankan 36 perjalanan sketch aktif pada model simulator |
| [plot-repo-sketches.py](plot-repo-sketches.py) | Membuat plot dari hasil benchmark yang sudah dihasilkan |
| [REPO_SKETCH_RESULTS.md](REPO_SKETCH_RESULTS.md) | Catatan baseline, kondisi, hasil, dan batas interpretasi |

## Verifikasi adapter terhadap C++

Siapkan Python (contoh di bawah memakai `uv`) dan `g++` di `PATH`, selain Node.js. Script hanya memakai standard library Python dan mock Arduino; Arduino IDE tidak diperlukan untuk pemeriksaan ini.

Dari root repository:

```powershell
uv run --no-project python Simulator/tests/verify-repo-sketches.py
```

Pemeriksaan memakai 176 sampel berurutan untuk setiap kombinasi controller dan profil threshold: default serta kalibrasi berbeda per sensor. Total 704 perbandingan memeriksa PWM, lalu error, integral, dan arah pencarian pada PID. Source profil kalibrasi dan executable C++ dibuat dalam direktori sementara; sketch repository tidak diubah.

<details>
<summary><strong>Batas verifikasi adapter</strong></summary>

Adapter adalah port manual logika sketch, bukan interpreter `.ino`. Jika struktur sketch, pin, recovery, atau rumusnya berubah, tinjau adapter dan skenario verifikasinya. Mock C++ ini tidak mengemulasi timing hardware maupun floating point AVR secara menyeluruh.

</details>

## Benchmark perjalanan dan plot

Dari folder `Simulator`:

```powershell
node --experimental-strip-types tests/run-repo-sketches.mjs
uv run --no-project python tests/plot-repo-sketches.py
```

Runner memakai arena 2 × 2 m tanpa gangguan: dua controller × massa 300/550/1.200 g × loop 1/10/20 ms × start kiri/kanan, total 36 run. PWM sketch diberikan langsung ke model tanpa kompensasi deadzone browser. ADC tengah diabaikan oleh sketch bang-bang dua sensor.

Run berakhir saat mencapai zona finish simulator, diam sekitar tiga detik, keluar arena, atau mencapai batas 120 detik simulasi. Zona finish dinilai model; kedua sketch belum memiliki deteksi finish sendiri.

Hasil lokal dibuat di `Simulator/output/repo-sketch-test/`:

| Hasil | Isi |
| --- | --- |
| `results.json` | Kondisi, parameter, hasil, dan lintasan semua run |
| `comparison.svg` | Plot baseline 550 g / 10 ms dari kedua start |

Hasil tersebut diabaikan Git dan baru tersedia setelah perintah di atas dijalankan. Script plot memerlukan `results.json` terlebih dahulu. [Laporan hasil](REPO_SKETCH_RESULTS.md) adalah catatan tersimpan; perbarui setelah perubahan sketch atau model yang memengaruhi hasil. Lulus pemeriksaan model tidak membuktikan keberhasilan robot fisik.

---

[ROBOIMPACT 2026](../../README.md) · [Simulator](../README.md) · Pengujian · [Hasil sketch](REPO_SKETCH_RESULTS.md) · [Perekaman](../tools/recording/README.md)
