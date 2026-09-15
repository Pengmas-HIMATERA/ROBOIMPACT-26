> **Perilaku aktif:** PID tracking berasal dari sketch, tetapi lost-line kini memakai recovery khusus simulator. Bagian port lost-line lama di bawah adalah catatan historis. Sketch Arduino tidak diubah.
>
> Lost: hapus P/I/D lama, maju lurus PWM 30 selama 150 ms, cari dengan PWM 55/0 bergantian setiap 600 ms. Arah pertama memakai error terakhir di luar deadband ±0.25; jika belum diketahui mulai kanan. Setelah 3 detik lost, PWM 0/0 terkunci sampai Reset. Saat garis kembali sebelum timeout, integral dimulai ulang dan derivative pertama nol. Semua durasi adalah parameter awal simulasi, belum tuning hardware.

# ROBOIMPACT — visualisasi sketch line follower

Visualisasi TypeScript + Three.js memakai port alur `code/line_follower_pid/line_follower_pid.ino`. Sketch asli tidak diubah. Ini replika logika kontrol dengan plant asumsi, bukan digital twin terkalibrasi atau emulator Arduino.

## Video preview

[Tonton atau unduh MP4 — 720p, 49 detik](output/pid-follow-preview.mp4)

Perjalanan dari start sampai finish dengan kamera Ikuti. Tiga dorongan lateral berkekuatan 2.0 diberikan pada detik simulasi 12, 22, dan 35, masing-masing selama 0.35 detik. Robot mencapai finish pada 44.69 detik dan berhenti dengan PWM 0/0. Hasil ini berlaku untuk skenario simulasi yang direkam.

## Menjalankan simulator

Node.js 22.18+; dari folder Animation:

```powershell
npm ci
npm run dev
npm test
npm run build
```

Preview: http://127.0.0.1:8765. Build ke `dist/`; `npm run preview` memakai port yang sama (hentikan dev server lebih dahulu). Build memiliki peringatan ukuran chunk Three.js sekitar 570 kB minified. Dependency lokal, WebGL 2 diperlukan.

## Yang mengikuti sketch

| Bagian | Perilaku |
|---|---|
| Startup | Motor berhenti selama delay(1000) |
| Input | Lima ADC A0–A4; aktif hanya jika >100 |
| Error | Weighted mean dengan bobot −10, −2, 0, 2, 10; bobot sinyal = ADC−100 |
| Gain default | Kp=18, Ki=0, Kd=5 |
| Integral | integral += error per loop, clamp ±100; tetap terakumulasi ketika Ki=0 |
| Derivatif | error−lastError per loop; tanpa dt atau filter |
| Output | P+I+D tanpa clamp PID |
| PWM | int(55+PID) dan int(55−PID), lalu clamp 0–90 |
| Garis hilang | Integral direset, error dan PID lama dipertahankan |
| Grace period | <1000 ms sejak garis terakhir: panggil moveMotors dengan PID lama |
| Pencarian | searchDirection=+1 → PWM 90/0; −1 → 0/90 |
| Arah belum diketahui | Tidak menulis motor: mempertahankan perintah sebelumnya |
| Reacquisition | PID berjalan lagi, lastError masih nilai terakhir sebelum hilang |

Arah pencarian hanya berubah ketika error >5 atau <−5, sesuai sketch. Tidak ada recovery tambahan atau pemaksaan robot ke garis. PID state di panel/grafik tetap menunjukkan kalkulasi terakhir saat garis hilang; mode firmware membedakan tracking, coasting, search, hold, startup.

## Mapping motor yang perlu dicocokkan

Sketch mendeklarasikan motorL_ENA=11 dan motorR_ENB=6, tetapi **setLeftMotor menulis pin motorR** dan **setRightMotor menulis pin motorL**:

| Fungsi | IN1 / IN2 | Enable | Asumsi sisi fisik default |
|---|---|---|---|
| setLeftMotor | 8 / 7 | 6 | kiri |
| setRightMotor | 10 / 9 | 11 | kanan |

Ini dipertahankan sebagai routing fungsi, bukan diperbaiki diam-diam. Toggle **Tukar sisi fisik motor** memodelkan wiring terbalik. Readout PWM kiri/kanan adalah perintah fungsi sketch, bukan pembacaan RPM; animasi roda memakai sisi fisik setelah toggle. Belum memodelkan polaritas kabel motor terbalik.

## Asumsi plant dan waktu

- Satu unit scene = 0.1 m; diameter roda 65 mm; jarak antar roda 96 mm.
- Motor diasumsikan TT 200 RPM pada PWM 255. Hubungan PWM-ke-RPM linear, tanpa dead zone atau drop tegangan driver. Pada PWM 55, target sekitar 43.1 RPM / 0.147 m/s; ini hasil asumsi, bukan pengukuran.
- Kecepatan motor mengikuti target dengan lag 120 ms. Differential drive menghitung yaw dari selisih kecepatan aktual roda.
- Sensor berada 71 mm di depan pusat robot; offset lateral −36, −18, 0, 18, 36 mm. Respon ADC diasumsikan Gaussian: 30 + 820 exp(−0.5(distance/8mm)^2), dibulatkan ke integer. Nilai tinggi di garis hitam.
- Lima sensor visual dan panel ADC mengikuti model yang sama. Posisi bobot firmware bukan ukuran jarak fisik sensor.
- Periode loop default 10 ms, bisa dipilih 1/5/10/20 ms. **delay(1) bukan periode loop total**: waktu analogRead dan Serial.print juga berkontribusi. Belum ada pengukuran timing board.
- Integrasi gerak 1/120 s dengan substep pada batas loop firmware. Playback speed tidak mengubah loop dalam waktu simulasi.
- Dorongan = gaya lateral dalam satuan normalisasi, pulsa 0.35 s. Slip diredam dengan koefisien 2.5/s. Tidak ada massa atau gaya Newton terkalibrasi.
- JS memakai floating-point double; ini port alur, bukan emulasi bit-exact float AVR, ADC hardware, atau Serial timing.

## Kontrol UI

**Muat gain sketch** memulihkan 18/0/5 dan mengulang startup. Preset P/PD/PID lain adalah eksperimen, bukan nilai asli sketch. Mengubah periode loop atau mapping motor juga mereset perjalanan. Reset mempertahankan pengaturan. Saat jeda, pulsa dorongan menunggu Lanjut.

Tab grafik: error sensor, komponen PID per loop, atau PWM perintah motor. Simpangan x ditampilkan terpisah dari error sensor. Label 3D opsional, panel teori bisa dilipat, UI responsif. Kamera mengikuti gerak maju.

## Struktur / validasi

- `firmware.ts`: port readSensors, calculatePID, moveMotors, lost-line, dan startup.
- `model.ts`: model ADC, motor, gerak, gaya, dan scheduler firmware.
- `simulation.ts`: UI dan histori telemetri.
- `scene.ts`: robot, lima sensor, jalur, kamera.
- `model.test.mjs`: dua belas tes untuk konstanta sumber, startup, error berbobot, integer PWM, grace boundary, search, unknown direction, integral, periode loop, dan gaya.

Jika sketch berubah, port ini perlu ditinjau ulang. Tes memeriksa konstanta kunci dari file sumber; itu tidak menjamin seluruh perubahan logika otomatis terdeteksi. Tidak mengeksekusi sketch Arduino langsung, dan belum divalidasi terhadap telemetry robot fisik.


## Track PDF pengguna

Default sekarang memakai `public/Track.pdf`, dirender menjadi `assets/track.png` (1600 × 1600). `assets/track-mask.json` menyimpan rentang piksel hitam per baris dari render yang sama (ambang grayscale <128). `track.ts` mengubah koordinat dunia menjadi koordinat piksel. Sensor mengambil cakupan hitam lokal dengan footprint berbobot; tampilan dan sensor berbagi bentuk track yang sama, bukan lintasan yang digambar ulang secara perkiraan.

- Track mempunyai dua ujung di kiri/kanan bawah. Vian mengonfirmasi start dari garis panjang; tersedia pilihan kiri menghadap kanan dan kanan menghadap kiri.
- Ukuran halaman PDF 5669 × 5669 pt setara sekitar 2 × 2 m pada cetak 100%. Ukuran lapangan aktual belum dikonfirmasi; input sisi arena 1–5 m tersedia dan mereset perjalanan.
- Pada skala 2 m, stroke utama sekitar 30 mm berdasarkan raster; bukan dimensi tertulis pada gambar.
- Posisi default start di pusat penanda panjang (x piksel 50 / 1550, y 1320). Balok hitam tengah menjadi finish: simulasi menghentikan motor ketika sensor depan mencapai penanda. Ini aturan misi tambahan di simulator; sketch Arduino asli belum memiliki logika finish. Kedua garis panjang di sisi luar hanya menjadi pilihan start. Reset memulai ulang.
- Track PDF menyediakan kamera Atas untuk seluruh arena dan Ikuti untuk mengikuti robot dari dekat. Robot bergerak dalam X/Z dan jejak menunjukkan perjalanan. Label Posisi X bukan cross-track error; error PID tetap hasil lima ADC.
- Garis lurus lama tetap tersedia untuk pembandingan. Pada mode itu, sensor Gaussian dan kamera mengikuti gerak maju seperti sebelumnya.
- Skala board, pilihan start, dan pilihan track tidak mengubah firmware; semuanya mengubah plant/geometri pengujian.
- Provenance dan hash sumber ada di `assets/provenance.json`.

Uji 60 detik dengan asumsi default membawa robot dari masing-masing sisi dan berhenti di penanda tengah. Ini validasi integrasi model, bukan bukti keberhasilan pada robot nyata. Dua belas tes kini meliputi bentuk mask, background putih, penanda, start dua sisi, dan perjalanan pada PDF.

Dorongan kiri/kanan dan gaya konstan memakai sumbu lateral robot saat itu. Gaya diproyeksikan ke X/Z pada setiap langkah; momentum tetap disimpan dalam koordinat dunia dan mereda dengan damping. Panah gaya mengikuti orientasi yang sama.

## Dimensi robot terkini

Alas dikonfirmasi Vian: **25 × 25 cm**, atau 2.5 × 2.5 scene units. Dimensi bersama di `robot.ts` dipakai tampilan, kinematika, sensor, dan deteksi finish. Diameter roda tetap asumsi 65 mm; jarak pusat roda kiri–kanan diasumsikan 26.6 cm dan sensor 14.3 cm di depan pusat bodi. Lebar array sensor tetap 7.2 cm. Dimensi pemasangan ini belum diukur pada robot asli.

Validasi perjalanan 60 detik di atas berasal dari robot kecil sebelumnya, bukan geometri 25 cm. Pada geometri baru, skala arena 2 m dan gain 18/0/5 belum mencapai finish dalam 120 detik dari kedua start. Tes finish sekarang menguji pendekatan lokal ke penanda dari kedua arah; tidak mengklaim keberhasilan satu lintasan penuh. Gain sketch dipertahankan. Ukuran arena dan geometri pemasangan aktual perlu dikonfirmasi sebelum kalibrasi.

### Revisi bentuk kompak

Vian membatalkan ukuran 25 × 25 cm dan memberi referensi robot dua roda dengan lengan sensor. Model kini memakai dua roda pada satu axle, deck elektronik 8.5 × 8 cm, lengan depan dan array lima sensor. Ukuran sementara: jarak roda 9.6 cm, sensor 9.5 cm di depan axle, ban diameter 6.5 cm. Ukuran lama dan hasil pengujian 25 cm di atas bersifat historis. Tampilan serta geometri simulasi memakai konstanta kompak yang sama; ini bukan pengukuran dari foto.

Revisi proporsi roda: diameter kini 4 cm dan lebar ban 1.2 cm; deck diturunkan 1.25 cm. Radius yang sama dipakai untuk mesh, putaran roda, dan konversi RPM ke kecepatan linear. Ukuran tetap sementara.
