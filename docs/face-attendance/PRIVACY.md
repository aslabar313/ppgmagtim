# Standar Privasi Data Biometrik — Magtim Center

## 1. Kebijakan Privasi Sesuai UU PDP No. 27 Tahun 2022
1. **Definisi Data Pribadi Spesifik:**
   - Data wajah yang diproses oleh modul Magtim Center dikategorikan sebagai Data Pribadi Spesifik (Biometrik).
2. **Persetujuan & Dasar Pemrosesan:**
   - Registrasi wajah wajib disertai konfirmasi petugas atas persetujuan jamaah / wali santri.
3. **Penyimpanan Terisolasi:**
   - Sistem tidak menyimpan foto wajah resolusi tinggi mentah secara permanen.
   - Yang disimpan hanyalah vektor representasi matematis 128-dimensi (embedding) yang dienkode dalam format numerik.
4. **Hak Penghapusan (Right to Erasure):**
   - Setiap jamaah atau walinya berhak meminta penghapusan template wajahnya kapan saja.
   - Petugas/Admin dapat menekan tombol "Hapus Template" di daftar santri atau dialog pendaftaran, yang akan langsung menghapus data dari `face_templates` dan `face_enrollments`.
5. **Alternatif Non-Biometrik:**
   - Jamaah yang memilih tidak mendaftarkan wajah dapat tetap melakukan presensi menggunakan metode input manual, kartu RFID, atau QR code tanpa adanya sanksi atau pembedaan hak kehadiran.
