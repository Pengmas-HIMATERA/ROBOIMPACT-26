[ROBOIMPACT 2026](../../../README.md) / [Simulator](../../README.md) / Perekaman

<sub>ROBOIMPACT 2026 / CAPTURE</sub>

# Perekam preview PID

[Jalankan](#jalankan) · [Skenario dan hasil](#skenario-dan-hasil) · [Konversi MP4/GIF](#konversi-frame-ke-mp4-dan-gif)

Alat lokal untuk membuat preview perjalanan PID dari start kiri, tiga dorongan lateral, lalu finish. Halaman ini memilih PID secara eksplisit; aplikasi simulator utama memakai bang-bang sebagai mode awal.

## Jalankan

Siapkan dependensi simulator sesuai [panduan mulai](../../README.md#mulai). Dari folder `Simulator`, jalankan dev server:

```powershell
npm run dev
```

Buka terminal lain di folder yang sama dan jalankan penerima menggunakan Python standard library:

```powershell
uv run --no-project python tools/recording/record-save.py
```

Buka [halaman perekam lokal](http://127.0.0.1:8765/tools/recording/record-preview.html). Browser memerlukan WebGL 2; tombol rekam WebM juga memerlukan dukungan `MediaRecorder` dengan codec VP8. Penerima terikat ke loopback dan mengizinkan origin `http://127.0.0.1:8765`, jadi gunakan alamat tersebut. Hentikan penerima dan dev server dengan `Ctrl+C` setelah selesai.

## Skenario dan hasil

Konfigurasi perekam memakai gain `SKETCH` dan massa `ROBOT_MASS_KG` dari source simulator: saat ini 30/0/5 dan 550 g. Arena 2 m, periode loop 10 ms, start kiri, kamera Ikuti. Dorongan pada detik simulasi 12, 22, dan 35 memiliki strength +2, −2, +2, setara gaya ±0,12 N dengan durasi 0,35 detik. Konfigurasi ini tidak membaca pengaturan yang sedang dipilih pada halaman simulator utama.

- **Rekam start sampai finish:** merekam canvas 1280 × 720 pada 15 fps dengan kecepatan 1× ke `output/pid-follow-preview.webm`; tautan unduh juga ditampilkan setelah selesai.
- **Ekspor GIF 4x (frame deterministik):** menjalankan langkah fisika `DT`, mengambil frame pada 12 fps dengan kecepatan tayang 4×, lalu mengirim PNG dan manifest ke penerima. Ekspor berhenti dengan error bila belum finish pada 100 detik simulasi.

Semua path hasil berikut relatif terhadap folder `Simulator`:

| Lokasi | Isi |
| --- | --- |
| `output/pid-follow-preview.webm` | Rekaman browser kecepatan 1× |
| `output/preview-frames/00000.png`, dst. | Frame deterministik untuk video/GIF 4× |
| `output/preview-recording.json` | Konfigurasi, jadwal dorongan, fps, jumlah frame, dan hasil perjalanan ekspor deterministik |
| `output/pid-follow-preview.mp4` | MP4 preview yang disimpan di Git |
| `assets/pid-preview.gif` | Preview GIF yang ditampilkan README simulator |

Penerima menimpa file bernama sama, tetapi tidak menghapus sisa frame ekspor terdahulu. Gunakan folder `output/preview-frames/` yang kosong sebelum ekspor baru agar konversi tidak menyertakan frame lama. Preview tersimpan sebelumnya mencapai finish pada sekitar 50,42 detik simulasi; hasil ekspor ulang mengikuti source saat dijalankan.

## Konversi frame ke MP4 dan GIF

Setelah status ekspor menunjukkan **Selesai**, gunakan FFmpeg yang tersedia di `PATH`. Jalankan dari folder `Simulator`:

```powershell
ffmpeg -y -framerate 12 -i output/preview-frames/%05d.png -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart output/pid-follow-preview.mp4
ffmpeg -y -i output/pid-follow-preview.mp4 -filter_complex "fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" -loop 0 assets/pid-preview.gif
```

Kedua perintah menimpa MP4/GIF preview tersimpan. Periksa hasil visual sebelum menyimpan perubahan ke Git. Hasil lokal lain di `output/` diabaikan oleh `.gitignore`; pengecualiannya hanya `output/pid-follow-preview.mp4`.

<details>
<summary><strong>Isi alat perekaman</strong></summary>

| File | Peran |
| --- | --- |
| [record-preview.html](record-preview.html) | Entry point halaman perekam yang disajikan Vite |
| [record-preview.ts](record-preview.ts) | Skenario, render kamera Ikuti, perekaman WebM, dan ekspor frame deterministik |
| [record-save.py](record-save.py) | Penerima HTTP pada `127.0.0.1:8766` untuk video, frame PNG, dan manifest |

</details>

---

[ROBOIMPACT 2026](../../../README.md) · [Simulator](../../README.md) · [Pengujian](../../tests/README.md) · [Hasil sketch](../../tests/REPO_SKETCH_RESULTS.md) · Perekaman
