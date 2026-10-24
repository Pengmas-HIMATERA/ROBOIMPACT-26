[ROBOIMPACT](../../README.md) / [Dokumentasi](../README.md) / Track

<sub>ROBOIMPACT 2026 / TRACK</sub>

# Sumber track

[File terkait](#file-terkait) · [Skala dan pembaruan](#skala-dan-pembaruan) · [Buka PDF](../../Simulator/public/Track.pdf)

[`Simulator/public/Track.pdf`](../../Simulator/public/Track.pdf) adalah satu-satunya PDF sumber lintasan dalam repository, sekaligus file yang disajikan Vite pada URL `/Track.pdf`. Start berasal dari garis panjang di sisi kiri atau kanan; finish simulator berada pada balok hitam tengah.

## File terkait

| File | Peran |
| --- | --- |
| [Simulator/public/Track.pdf](../../Simulator/public/Track.pdf) | PDF sumber lintasan dan file yang disajikan aplikasi |
| [track.svg](../../Simulator/assets/track.svg) | Geometri vektor yang ditampilkan aplikasi |
| [track-mask.json](../../Simulator/assets/track-mask.json) | Mask pembacaan sensor virtual, 1600 × 1600 piksel |
| [provenance.json](../../Simulator/assets/provenance.json) | Hash PDF, ukuran halaman, dan catatan pembuatan vektor/mask |

SHA-256 PDF sumber:

```text
0c23f95d39ce4da9c07503109ffde8467a1247c34252ca9dc4694da6e7c8dc8a
```

## Skala dan pembaruan

Arena browser dimulai pada **2 × 2 m**, berdasarkan ukuran halaman PDF saat dicetak 100%. Ukuran arena fisik belum dikonfirmasi; panel simulator dapat mengubah skalanya.

Untuk memperbarui lintasan, ganti PDF di `Simulator/public/Track.pdf`. Periksa hash dari root repository:

```powershell
Get-FileHash Simulator/public/Track.pdf -Algorithm SHA256
```

> [!IMPORTANT]
> Mengganti PDF saja tidak memperbarui bentuk track pada model. SVG, mask sensor, dan metadata provenance juga perlu disesuaikan.

Repository menyimpan hasil konversi dan catatan prosesnya dalam provenance; tidak ada satu script yang membangun ulang seluruh aset track dari PDF.

---

[← Dokumentasi pendukung](../README.md) · [Panduan simulator →](../../Simulator/README.md)
