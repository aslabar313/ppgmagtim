# Pemetaan Database (Database Mapping)

## 1. Hubungan Tabel Existing & Ekstensi

| Entitas Logis | Sumber Data Existing | Implementasi Add-on |
|---|---|---|
| **Jamaah / Generus** | `Generus` (`src/lib/mockData.ts` / Supabase `generus`) | Digunakan langsung via `generusId` |
| **Kelompok / Unit** | `Kelompok` (`src/lib/mockData.ts` / Supabase `kelompok`) | Filter scope izin petugas |
| **Presensi Utama** | `Presensi` (`src/lib/mockData.ts` / Supabase `presensi`) | Transaksi final presensi (Single Source of Truth) |
| **Metadata Registrasi** | - | Tabel baru: `face_enrollments` |
| **Template Biometrik** | - | Tabel baru: `face_templates` |
| **Audit Scan** | `AuditLogRecord` | Tabel baru: `face_scan_events` |
| **Riwayat Koreksi** | - | Tabel baru: `attendance_corrections` |

## 2. Skema Tabel Baru (SQL Migration)
Disediakan pada file migration `supabase/migrations/20261011_magtim_face_attendance.sql`.
- `face_enrollments`:
  - `id` (UUID PK)
  - `generus_id` (TEXT FK ke generus)
  - `status` (TEXT: 'active', 'inactive', 'revoked')
  - `model_version` (TEXT)
  - `enrolled_by` (TEXT)
  - `created_at` (TIMESTAMPTZ)
  - `updated_at` (TIMESTAMPTZ)
- `face_templates`:
  - `id` (UUID PK)
  - `enrollment_id` (UUID FK ke face_enrollments)
  - `generus_id` (TEXT)
  - `embedding` (JSONB / FLOAT ARRAY)
  - `quality_score` (FLOAT)
  - `is_active` (BOOLEAN)
  - `created_at` (TIMESTAMPTZ)
- `face_scan_events`:
  - `id` (UUID PK)
  - `session_name` (TEXT)
  - `kelompok` (TEXT)
  - `tanggal` (DATE)
  - `matched_generus_id` (TEXT NULL)
  - `confidence_score` (FLOAT)
  - `status_result` (TEXT: 'success', 'already_present', 'unrecognized', 'poor_quality', 'manual_fallback')
  - `scanned_by` (TEXT)
  - `device_info` (TEXT)
  - `created_at` (TIMESTAMPTZ)
- `attendance_corrections`:
  - `id` (UUID PK)
  - `presensi_id` (TEXT)
  - `generus_id` (TEXT)
  - `old_status` (TEXT)
  - `new_status` (TEXT)
  - `reason` (TEXT)
  - `corrected_by` (TEXT)
  - `created_at` (TIMESTAMPTZ)
