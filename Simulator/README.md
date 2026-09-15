# ROBOIMPACT · Simulator line follower

Simulator 3D untuk belajar PID: ubah gain, beri dorongan, dan amati robot kembali mengikuti garis.

**TypeScript · Three.js · Vite**

[Mulai](#mulai) · [Kontrol](#kontrol) · [Track](#track) · [Logika robot](#logika-robot) · [Pengembangan](#pengembangan) · [Materi Arduino](../code/README.md)

## Preview

[![Perjalanan lengkap: start, tiga dorongan, lalu finish](assets/pid-preview.gif)](output/pid-follow-preview.mp4)

Kamera **Ikuti**, tiga dorongan lateral, lalu berhenti di finish. Ini hasil skenario simulasi yang direkam; model fisiknya belum dikalibrasi dengan robot asli.

## Mulai

Siapkan **Node.js 22.18+** dan browser dengan **WebGL 2**. Dari root repository:

```powershell
cd Simulator
npm ci
npm run dev
```

Buka [simulator lokal](http://127.0.0.1:8765). Arena langsung memenuhi viewport browser. Tekan **Keluar** untuk melihat panel pengaturan dan telemetri.

### Percobaan pertama

1. Pilih kamera **Ikuti**, lalu beri **Dorong kiri** atau **Dorong kanan**.
2. Keluar dari tampilan arena penuh, ubah satu gain, lalu tekan **Reset**.
3. Ulangi gangguan yang sama; bandingkan zig-zag dan waktu kembali ke garis.

Pelajari efek tiap gain lewat [infografik P–I–D](../code/README.md#panduan-pid).

## Kontrol

| Kontrol | Kegunaan |
| --- | --- |
| Jeda / Lanjut | Menghentikan sementara dan melanjutkan simulasi |
| Reset | Mengulang perjalanan dengan pengaturan saat ini |
| Dorong kiri / kanan | Pulsa lateral relatif terhadap arah robot |
| Perspektif / Atas / Samping / Ikuti | Mengubah sudut kamera |
| Fullscreen / Keluar | Memperbesar arena atau kembali ke panel lengkap |
| Kecepatan 0.5× / 1× / 2× | Mengubah kecepatan pemutaran |
| Kp, Ki, Kd | Mengubah kontribusi kontrol PID |
| Muat gain sketch | Memulihkan gain 18/0/5 dan mengulang startup |
| Track, sisi arena, posisi start | Mengubah geometri pengujian dan mengulang perjalanan |
| Periode loop / Tukar sisi fisik motor | Mengubah timing atau mapping motor dan mengulang perjalanan |

Grafik menampilkan **error sensor**, **komponen PID**, atau **PWM motor**. Posisi X adalah koordinat arena, bukan error PID. Dorongan saat jeda baru dijalankan ketika simulasi dilanjutkan.

## Track

<img src="assets/track.png" alt="Track dengan start pada garis panjang kiri atau kanan, dan finish pada balok hitam tengah" width="560">

| Bagian | Aturan simulator |
| --- | --- |
| Start | Garis panjang kiri atau kanan, menghadap ke dalam arena |
| Finish | Balok hitam tengah; motor berhenti saat sensor depan mencapai zona ini |
| Ukuran arena | Default 2 × 2 m; dapat diubah melalui panel |
| Track alternatif | Garis lurus untuk membandingkan respons kontrol |

[PDF sumber](public/Track.pdf) · [Provenance dan hash](assets/provenance.json)

Ukuran 2 m berasal dari skala halaman PDF pada cetak 100%; ukuran arena fisik belum dikonfirmasi. Gambar track dan pembacaan sensor memakai bentuk raster yang sama.

## Logika robot

Dasar kontrol berasal dari [sketch line follower PID](../code/line_follower_pid/line_follower_pid.ino). Simulator menjalankan port TypeScript, bukan mengeksekusi sketch Arduino langsung.

| Bagian | Perilaku aktif |
| --- | --- |
| Startup | Motor diam selama 1 detik |
| Sensor | Lima ADC; aktif ketika nilai > 100 |
| Error | Rata-rata berbobot posisi −10, −2, 0, 2, 10; bobot sinyal ADC − 100 |
| Gain awal | Kp = 18, Ki = 0, Kd = 5 |
| Integral | Akumulasi error per loop, dibatasi ±100 |
| Derivative | Selisih error antar-loop; tanpa faktor waktu atau filter |
| PWM saat tracking | Integer dari 55 ± output PID, dibatasi 0–90 |

### Recovery lost-line

Recovery berikut merupakan tambahan simulator; **belum diterapkan ke sketch Arduino**.

| Waktu sejak garis hilang | Respons |
| --- | --- |
| 0–150 ms | Hapus kontribusi PID lama, maju pelan dengan PWM 30/30 |
| 150 ms–3 detik | Cari dengan PWM 55/0 atau 0/55; arah berganti tiap 600 ms |
| Mencapai 3 detik | Berhenti dengan PWM 0/0 sampai Reset |
| Garis ditemukan sebelum timeout | Kembali tracking; integral dimulai ulang dan derivative pertama nol |

Arah pencarian pertama mengikuti error terakhir di luar ±0.25; jika belum diketahui, mulai ke kanan. Deteksi finish juga tambahan simulator. Lihat [perilaku sketch asli](../code/README.md#lost-line) sebelum menerapkannya ke robot.

<details>
<summary><strong>Detail model · Dimensi, motor, sensor, dan waktu</strong></summary>

Semua ukuran dan respons mekanik berikut adalah asumsi sementara.

| Parameter | Nilai |
| --- | --- |
| Skala scene | 1 unit = 10 cm |
| Deck robot | 8.5 × 8 cm; dua roda dan lengan sensor depan |
| Diameter / lebar ban | 4 cm / 1.2 cm |
| Jarak pusat kedua roda | 9.6 cm |
| Sensor di depan axle | 9.5 cm |
| Offset lateral sensor | −36, −18, 0, 18, 36 mm |
| Motor | 200 RPM pada PWM 255; respons PWM linear |
| Lag motor | 120 ms |
| Periode loop default | 10 ms; pilihan 1/5/10/20 ms |
| Integrasi gerak | 1/120 detik, dengan substep pada batas loop firmware |
| Dorongan | Pulsa 0.35 detik, satuan normalisasi; damping slip 2.5/s |

- Track PDF memakai mask piksel hitam dengan footprint sensor berbobot. Track lurus memakai respons ADC Gaussian.
- Gerak differential drive berasal dari selisih kecepatan roda. Dorongan mengikuti arah lateral robot; momentum disimpan dalam koordinat dunia.
- Playback speed tidak mengubah periode loop dalam waktu simulasi.
- Model belum mencakup dead zone motor, penurunan tegangan driver, massa terkalibrasi, atau timing ADC dan Serial hardware.
- Perhitungan JavaScript bukan emulasi bit-exact float AVR. `delay(1)` pada sketch tidak menjamin loop total 1 ms.

**Mapping motor:** `setLeftMotor()` mengendalikan pin 8/7, PWM 6; `setRightMotor()` pin 10/9, PWM 11. Default simulator menganggap fungsi tersebut sesuai roda kiri/kanan. Toggle pertukaran sisi memodelkan wiring terbalik; polaritas kabel motor belum dimodelkan.

</details>

## Pengembangan

Jalankan dari folder `Simulator`:

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server pada port 8765 |
| `npm run typecheck` | Memeriksa tipe TypeScript |
| `npm test` | Menguji controller dan model |
| `npm run build` | Typecheck dan build ke `dist/` |
| `npm run preview` | Menyajikan hasil build pada port 8765; hentikan dev server dahulu |

```text
Simulator/
├── src/              # Controller, model fisika, robot 3D, dan UI
├── styles/           # Stylesheet halaman dan arena
├── tests/            # Pengujian controller dan model
├── tools/recording/  # Perekam preview dan penerima video lokal
├── assets/           # Track, mask sensor, provenance, dan GIF
├── public/           # PDF sumber
├── output/           # MP4 preview dan ekspor lokal
├── index.html        # Entry point aplikasi
└── package.json      # Dependensi dan perintah npm
```

| File utama | Tanggung jawab |
| --- | --- |
| [firmware.ts](src/firmware.ts) | Pembacaan sensor, PID, startup, dan recovery |
| [model.ts](src/model.ts) | Gerak, motor, gaya, dan penjadwalan controller |
| [track.ts](src/track.ts) | Geometri track, mask sensor, start, dan finish |
| [robot.ts](src/robot.ts) | Konstanta dimensi robot bersama |
| [scene.ts](src/scene.ts) | Tampilan Three.js dan kamera |
| [simulation.ts](src/simulation.ts) | Kontrol UI dan histori telemetri |

Tes memeriksa perilaku model dan beberapa konstanta sketch. Jika Arduino berubah, port tetap perlu ditinjau manual. Lulus tes bukan bukti keberhasilan pada robot fisik atau semua konfigurasi track.

<details>
<summary><strong>Alat tambahan · Rekam video preview</strong></summary>

Dengan dev server aktif, buka terminal lain di folder `Simulator` dan jalankan penerima video lokal:

```powershell
uv run --no-project python tools/recording/record-save.py
```

Buka [halaman perekam](http://127.0.0.1:8765/tools/recording/record-preview.html). Rekaman disimpan ke `output/pid-follow-preview.webm`; penerima menggunakan port 8766.

Skenario preview memakai kamera Ikuti dengan dorongan berkekuatan 2.0 pada detik simulasi 12, 22, dan 35, masing-masing 0.35 detik. Rekaman yang tersedia mencapai finish pada 44.69 detik.

MP4 preview disimpan di Git. Ekspor lokal lain di `output/` diabaikan oleh `.gitignore`; GIF README berada di `assets/`.

</details>
