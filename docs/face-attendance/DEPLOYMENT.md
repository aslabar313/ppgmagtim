# Panduan Deployment (Deployment Guide)

## 1. Konfigurasi Database (Supabase)
Jalankan file migration:
`supabase/migrations/20261011_magtim_face_attendance.sql`
pada Supabase SQL Editor proyek aktif Anda. Migration ini membuat:
- `face_enrollments`
- `face_templates`
- `face_scan_events`
- `attendance_corrections`
beserta indeks dan Row Level Security (RLS).

## 2. Environment Variables
Gunakan variabel existing yang sudah terkonfigurasi di `.env` / Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

## 3. Deployment ke Vercel / Cloud
Aplikasi terintegrasi langsung dengan pipeline deployment existing:
```bash
npm run build
# atau jika menggunakan git remote push
git push origin main
```
Tidak ada konfigurasi backend terpisah atau server khusus yang perlu disiapkan.
