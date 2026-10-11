# Rencana Integrasi Modul Presensi Wajah — Magtim Center

## 1. Arsitektur Modul Presensi Wajah
Modul **Magtim Center — Presensi Wajah** didesain sebagai add-on non-breaking yang modular:

```
src/
├── components/
│   ├── FaceAttendance/
│   │   ├── FaceEnrollmentDialog.tsx      # Modal registrasi & re-enrollment wajah
│   │   ├── FaceAttendanceScanner.tsx     # Scanner kamera realtime 1:N & liveness
│   │   ├── FaceAttendanceDashboard.tsx   # Dashboard pemantauan sesi & statistik
│   │   ├── FaceAttendanceSessionBar.tsx  # Pengaturan sesi pengajian & threshold
│   │   └── types.ts                      # Tipe data enrollment, template, event
│   └── PresensiPanel.tsx                 # Integrasi tab "Scan Wajah" di Presensi
├── lib/
│   ├── faceRecognitionEngine.ts          # Abstraksi provider (Capture, Quality, Matching)
│   ├── faceStorage.ts                    # Penyimpanan terisolasi template & events
│   └── mockData.ts                       # Sinkronisasi ke Presensi utama
```

## 2. Alur Integrasi Data
1. **Registrasi (Phase 2):**
   - Petugas memilih generus dari daftar generus kelompoknya.
   - Kamera memverifikasi kualitas (brightness, single-face, frontal angle).
   - Ekstraksi 128D descriptor/embedding template.
   - Template disimpan ke tabel `face_templates` & metadata ke `face_enrollments`.
2. **Pemindaian Sesi (Phase 3 & 4):**
   - Petugas memilih Sesi Pengajian (menggunakan daftar jenis pengajian existing seperti *Sambung Kelompok*, *Pengajian Caberawit*, dll.).
   - Petugas mengarahkan kamera ke jamaah.
   - Wajah dideteksi dan di-extract embedding-nya.
   - Euclidean/Cosine distance dicocokkan terhadap template jamaah dalam kelompok aktif (1:N search).
   - Jika jarak < threshold (misal 0.55), identitas diverifikasi.
   - Presensi disimpan langsung ke `Presensi` list utama (`savePresensi`) dengan metadata `keterangan: "Scan Wajah (Magtim Center)"`.
   - Event scan dicatat ke `face_scan_events`.
3. **Pencegahan Duplikasi:**
   - Idempotency check: jika jamaah sudah berstatus Hadir pada tanggal + jenis pengajian yang sama, tampilkan notifikasi "Sudah Presensi".
4. **Fallback Manual:**
   - Apabila scan gagal atau tidak dikenali, tersedia tombol satu-klik "Input Presensi Manual" tanpa meninggalkan sesi.
