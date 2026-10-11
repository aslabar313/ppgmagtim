# Arsitektur Teknis Magtim Center — Presensi Wajah

## 1. Diagram Alur Proses

```
[ Kamera HP / Laptop ]
         │ (Stream Video Frame)
         ▼
[ Quality & Liveness Pre-Check ] ─── (Gagal) ───► Instruksi Koreksi Pencahayaan/Posisi
         │ (Frame Valid)
         ▼
[ Feature Extractor (128D Embedding) ]
         │ (Vektor Numerik)
         ▼
[ 1:N Matcher vs Template Kelompok Aktif ]
         │
    ┌────┴───────────────────────────┐
    ▼                                ▼
(Match Found: Dist <= 0.42)   (No Match / Belum Ada Template)
    │                                │
    ▼                                ▼
[ Cek Idempotency Presensi ]    [ Saran Fallback Manual ]
    │
    ├── (Sudah Hadir) ──► Notifikasi "Sudah Presensi" (Beep Low)
    └── (Belum Hadir) ──► Transaksi Hadir (Beep High) + Catat FaceScanEvent
```

## 2. Karakteristik Komponen
- **Provider CV:** `src/lib/faceRecognitionEngine.ts` (Zero heavy dependency, berjalan cepat pada CPU HP mobile).
- **Storage Layer:** `src/lib/faceStorage.ts` (Terisolasi dari data biodata umum, mendukung Supabase RLS & IndexedDB/LocalStorage failover).
- **Integrasi UI:** `src/components/PresensiPanel.tsx` (Seamless tab switch antara Log, Manual, RFID, Scan Wajah, dan Data Face ID).
