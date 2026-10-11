# Tinjauan Keamanan & Privasi Biometrik (Security & Privacy Review)

## 1. Perlindungan Data Biometrik (UU PDP No. 27 Tahun 2022)
Data wajah adalah data pribadi spesifik (biometrik). Penerapannya di Magtim Center mengikuti kaidah:
1. **Tidak Menyimpan Foto Mentah:** Sistem mengekstraksi representasi matematis (vektor floating point embedding) dan tidak mewajibkan penyimpanan foto resolusi tinggi secara permanen.
2. **Persetujuan & Dasar Pemrosesan:** Sebelum registrasi wajah (enrollment), petugas harus mengonfirmasi persetujuan jamaah / wali santri.
3. **Hak Penghapusan (Right to Erasure):** Disediakan tombol "Hapus Template Biometrik" yang akan menghapus vektor template secara permanen dari penyimpanan.
4. **Human Fallback Wajib:** Jamaah yang tidak bersedia atau gagal scan wajah tetap dapat diabsen menggunakan presensi manual atau QR/RFID tanpa diskriminasi.

## 2. Keamanan Akses & Anti-Spoofing
- **Row Level Security (RLS):** Template wajah dibatasi hanya dapat dibaca oleh Admin Kelompok terkait dan Super Admin.
- **Liveness & Quality Check:** Memeriksa ukuran wajah proporsional, kecerahan frame, dan stabilitas pose sebelum matching.
- **Audit Logging:** Setiap proses scan dicatat ke `face_scan_events` tanpa mencatat data embedding di dalam log teks.
- **Pencegahan Fraud / Duplikasi:** Menggunakan kunci idempotent kombinasi `(generusId + tanggal + jenisPengajian)` sehingga presensi tidak dapat dicatat berulang kali untuk sesi yang sama.
