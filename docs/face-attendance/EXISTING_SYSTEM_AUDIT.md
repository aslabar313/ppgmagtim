# Audit Sistem Existing — SIM PPG Magetan Timur (ppgmagtim-354)

## 1. Ringkasan Eksekutif
Aplikasi `ppgmagtim-354` adalah Sistem Informasi Monitoring (SIM) PPG Magetan Timur yang memonitor santri (generus), pengajar, presensi kegiatan, kurikulum materi, raport, sarpras, keuangan, dan integrasi WhatsApp.

- **Bahasa & Framework:** TypeScript, React 19, Vite, TanStack Router (`@tanstack/react-router`, `@tanstack/react-start`)
- **Styling:** Tailwind CSS v4, Lucide React icons, Radix UI primitives
- **Database & Backend:** Supabase Client (`@supabase/supabase-js`) dipadukan dengan failover/local-first data store `src/lib/mockData.ts` dan `src/lib/mockDataHelper.ts` (menggunakan LocalStorage dengan prefix `sim_tpq_*`)
- **Build Target:** Nitro / Vercel Serverless SSR & SPA client

## 2. Struktur Data Existing
### Data Generus (Jamaah / Santri)
Tersimpan di model `Generus` (`src/lib/mockData.ts`):
- `id: string` (Primary identifier: contoh `"gen-1"`, `"gen-2"`)
- `namaLengkap: string`
- `nisInternal: string`
- `namaKelompok: string`
- `kategori?: "Caberawit" | "Muda-Mudi" | "Jama'ah Dewasa"`
- `qrCode: string`
- `rfidUid?: string`
- `foto: string` (avatar/data URI/url)
- `statusAktif: boolean`

### Data Presensi
Model `Presensi` (`src/lib/mockData.ts`):
- `id: string`
- `generusId: string` (referensi ke `Generus.id`)
- `namaLengkap: string`
- `namaKelompok: string`
- `tanggal: string` (format YYYY-MM-DD)
- `statusKehadiran: "Hadir" | "Izin" | "Sakit" | "Alfa"`
- `jenisPengajian?: string`
- `waktuTap?: string` (format HH:mm:ss)
- `keterangan?: string`

### Autentikasi & Hak Akses
- Penyimpanan lokal: `localStorage.getItem("sim_tpq_logged_role")`, `sim_tpq_active_scope`, `sim_tpq_logged_user`
- Role pengguna: `Super Admin`, `Admin Daerah`, `Admin Desa`, `Admin Kelompok`, `Pengajar`, `Viewer`
- Filter cakupan (scope): Berdasarkan `kelompok` atau `desa`.

## 3. Komponen yang Digunakan Kembali (Reuse First)
1. **Identitas Jamaah:** `Generus` (ID, nama, kelompok, kategori).
2. **Data Presensi Utama:** `Presensi` list yang terintegrasi dengan filter kelompok, tanggal, dan jenis pengajian.
3. **Penyimpanan Data:** Supabase tables + fallback `mockDataHelper.ts` (`loadData` & `saveData`).
4. **UI Design System:** Radix UI Dialog, Cards, Badges, Tabs, Lucide icons, Sonner toast.

## 4. Analisis Kebutuhan Fitur Face Scan
Untuk menambahkan modul **Magtim Center — Presensi Wajah**:
- Modul harus dapat diakses melalui tab navigasi admin `AdminPanel.tsx` atau tab khusus di `PresensiPanel.tsx`.
- Menyediakan alur registrasi wajah (enrollment) yang menghubungkan `generusId` dengan template biometrik (vektor embedding numerik 128-dimensi atau 512-dimensi).
- Menyediakan engine pengenalan wajah di sisi browser (client-side matching 1:N) dengan fallback server Supabase edge function jika online.
- Menggunakan model ekstraksi wajah berlisensi terbuka dan ramah performa browser (face-api.js / tfjs / MediaPipe FaceMesh / lightweight embeddings).
- Menyimpan template terisolasi tanpa menyimpan foto mentah secara sembarangan.
- Memberikan human fallback (tombol presensi manual langsung bila scan tidak cocok atau gagal).
