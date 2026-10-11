# Rencana Pengujian & Hasil Verifikasi (Test Plan)

## 1. Lingkup Pengujian
1. **Pendaftaran Wajah (Enrollment):**
   - Menguji pengambilan frame wajah jamaah.
   - Menguji validasi kualitas pencahayaan (overexposure & underexposure).
   - Menguji ekstraksi vektor 128D dan penyimpanan template.
   - Menguji re-enrollment dan penghapusan template biometrik.
2. **Pemindaian Realtime (1:N Matching):**
   - Menguji matching pada dataset template kelompok aktif.
   - Menguji pencegahan duplikasi presensi (idempotency: sudah hadir tidak dicatat dua kali).
   - Menguji cooldown scan (mencegah loop audio beeping).
3. **Fallback & Human-in-the-loop:**
   - Menguji tombol presensi manual langsung saat wajah tidak dikenali.
4. **Regression Testing:**
   - Memastikan tab Presensi Manual, Riwayat Absensi, dan Scan RFID tetap berfungsi normal.
   - Memastikan build production Vite & SSR TanStack Router sukses tanpa error.

## 2. Hasil Eksekusi Build & Typecheck
- **Perintah:** `npm run build`
- **Status:** **Exit Code 0 (Success)**
- **Waktu build:** 15.71s
- **Output:** Nitro `.vercel/output` terkompilasi dengan sempurna.
