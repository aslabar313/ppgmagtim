-- =====================================================================
-- MONEV PPG: Monev Agenda Bulanan PPG Database Schema & Foundation
-- Migration File: supabase/migrations/20261013_monev_agenda_bulanan.sql
-- =====================================================================

-- 1. ENUM TYPES
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'monev_period_status') THEN
        CREATE TYPE public.monev_period_status AS ENUM (
            'DRAFT',
            'OPEN',
            'VERIFICATION',
            'LOCKED',
            'ARCHIVED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'monev_submission_status') THEN
        CREATE TYPE public.monev_submission_status AS ENUM (
            'DRAFT',
            'SUBMITTED',
            'VERIFIED',
            'REJECTED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'monev_agenda_kategori') THEN
        CREATE TYPE public.monev_agenda_kategori AS ENUM (
            'Kurikulum',
            'Evaluasi',
            'Pembinaan Mubaligh',
            'KBM Caberawit',
            'Muda-Mudi',
            'Musyawarah 5 Unsur',
            'Administrasi & BK',
            'Lainnya'
        );
    END IF;
END $$;

-- 2. TABEL: monev_master_agenda (Katalog Master Agenda PPG)
CREATE TABLE IF NOT EXISTS public.monev_master_agenda (
    id TEXT PRIMARY KEY,
    nomor_urut INT NOT NULL,
    judul_agenda TEXT NOT NULL,
    kategori public.monev_agenda_kategori NOT NULL DEFAULT 'Lainnya',
    sasaran TEXT NOT NULL DEFAULT 'Semua',
    frekuensi TEXT NOT NULL DEFAULT 'Bulanan',
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    deskripsi TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABEL: monev_periods (Periode Monitoring Bulanan PPG)
CREATE TABLE IF NOT EXISTS public.monev_periods (
    id TEXT PRIMARY KEY,
    nama_periode TEXT NOT NULL,
    tahun INT NOT NULL,
    bulan INT NOT NULL, -- 1 s/d 12
    periode_kode TEXT NOT NULL UNIQUE, -- Contoh: '2026-10'
    status public.monev_period_status NOT NULL DEFAULT 'DRAFT',
    tanggal_mulai DATE NOT NULL,
    tanggal_selesai DATE NOT NULL,
    cakupan_wilayah JSONB NOT NULL DEFAULT '["Desa Selatan", "Desa Tengah", "Desa Utara", "Desa Timur"]'::jsonb,
    total_desa INT NOT NULL DEFAULT 28,
    total_agenda INT NOT NULL DEFAULT 18,
    catatan_periode TEXT,
    created_by TEXT NOT NULL DEFAULT 'PPG Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. TABEL: monev_period_agenda_snapshot (Snapshot Agenda Terikat Periode)
-- Memastikan perubahan master agenda di masa depan tidak merusak rekam jejak periode lalu
CREATE TABLE IF NOT EXISTS public.monev_period_agenda_snapshot (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL REFERENCES public.monev_periods(id) ON DELETE CASCADE,
    master_agenda_id TEXT NOT NULL REFERENCES public.monev_master_agenda(id),
    nomor_urut INT NOT NULL,
    judul_agenda TEXT NOT NULL,
    kategori public.monev_agenda_kategori NOT NULL,
    sasaran TEXT NOT NULL DEFAULT 'Semua',
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    bobot_persen NUMERIC(5,2) NOT NULL DEFAULT 5.56, -- Rata-rata 100% / 18
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_period_agenda_master UNIQUE (period_id, master_agenda_id)
);

-- 5. TABEL: monev_submissions (Status Pengumpulan Pelaporan per Desa per Periode)
CREATE TABLE IF NOT EXISTS public.monev_submissions (
    id TEXT PRIMARY KEY,
    period_id TEXT NOT NULL REFERENCES public.monev_periods(id) ON DELETE CASCADE,
    wilayah TEXT NOT NULL, -- Desa Selatan, Desa Tengah, Desa Utara, Desa Timur
    desa TEXT NOT NULL,    -- Soco, Bendo, Karas, dll.
    status public.monev_submission_status NOT NULL DEFAULT 'DRAFT',
    progress_persen NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    agenda_selesai INT NOT NULL DEFAULT 0,
    agenda_total INT NOT NULL DEFAULT 18,
    submitted_by TEXT,
    submitted_at TIMESTAMPTZ,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    catatan_verifikasi TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_period_desa UNIQUE (period_id, desa)
);

-- 6. TABEL: monev_monitoring_items (Item Detail Monitoring per Agenda per Desa)
CREATE TABLE IF NOT EXISTS public.monev_monitoring_items (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES public.monev_submissions(id) ON DELETE CASCADE,
    period_id TEXT NOT NULL REFERENCES public.monev_periods(id) ON DELETE CASCADE,
    agenda_snapshot_id TEXT NOT NULL REFERENCES public.monev_period_agenda_snapshot(id) ON DELETE CASCADE,
    wilayah TEXT NOT NULL,
    desa TEXT NOT NULL,
    judul_agenda TEXT NOT NULL,
    nomor_urut INT NOT NULL,
    kategori public.monev_agenda_kategori NOT NULL,
    terlaksana BOOLEAN NOT NULL DEFAULT false,
    tanggal_pelaksanaan DATE,
    ketercapaian_persen INT NOT NULL DEFAULT 0 CHECK (ketercapaian_persen >= 0 AND ketercapaian_persen <= 100),
    jumlah_peserta INT DEFAULT 0,
    penanggung_jawab TEXT,
    kendala TEXT,
    tindak_lanjut TEXT,
    catatan_evaluasi TEXT,
    evidence_urls JSONB DEFAULT '[]'::jsonb,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_period_desa_agenda UNIQUE (period_id, desa, agenda_snapshot_id)
);

-- 7. TABEL: monev_follow_ups (Eskalasi & Tindak Lanjut Khusus)
CREATE TABLE IF NOT EXISTS public.monev_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_item_id TEXT NOT NULL REFERENCES public.monev_monitoring_items(id) ON DELETE CASCADE,
    period_id TEXT NOT NULL REFERENCES public.monev_periods(id) ON DELETE CASCADE,
    desa TEXT NOT NULL,
    uraian_tindak_lanjut TEXT NOT NULL,
    target_selesai DATE,
    pic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'BELUM_SELESAI' CHECK (status IN ('BELUM_SELESAI', 'DALAM_PROSES', 'SELESAI')),
    hasil_tindak_lanjut TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABEL: monev_audit_logs (Audit Trail Khusus Modul Monev PPG)
CREATE TABLE IF NOT EXISTS public.monev_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL, -- PERIOD, MASTER_AGENDA, SUBMISSION, MONITORING_ITEM
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,      -- CREATE, UPDATE, STATUS_CHANGE, VERIFY, REJECT
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. INDEKS INTEGRITAS & PERFORMA QUERY
CREATE INDEX IF NOT EXISTS idx_monev_periods_kode ON public.monev_periods(periode_kode);
CREATE INDEX IF NOT EXISTS idx_monev_submissions_period ON public.monev_submissions(period_id, wilayah);
CREATE INDEX IF NOT EXISTS idx_monev_monitoring_items_lookup ON public.monev_monitoring_items(period_id, desa);
CREATE INDEX IF NOT EXISTS idx_monev_monitoring_items_agenda ON public.monev_monitoring_items(agenda_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_monev_period_snapshot_period ON public.monev_period_agenda_snapshot(period_id);
CREATE INDEX IF NOT EXISTS idx_monev_audit_entity ON public.monev_audit_logs(entity_type, entity_id);

-- 10. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.monev_master_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monev_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monev_period_agenda_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monev_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monev_monitoring_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monev_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monev_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy Master Agenda & Periods:
-- Semua pengguna terautentikasi dapat membaca
-- Hanya Super Admin & Admin Daerah yang dapat memodifikasi
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read monev_master_agenda for all auth') THEN
        CREATE POLICY "Allow read monev_master_agenda for all auth" ON public.monev_master_agenda
        FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow manage monev_master_agenda for admins') THEN
        CREATE POLICY "Allow manage monev_master_agenda for admins" ON public.monev_master_agenda
        FOR ALL TO authenticated
        USING (auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah'))
        WITH CHECK (auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read monev_periods for all auth') THEN
        CREATE POLICY "Allow read monev_periods for all auth" ON public.monev_periods
        FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow manage monev_periods for admins') THEN
        CREATE POLICY "Allow manage monev_periods for admins" ON public.monev_periods
        FOR ALL TO authenticated
        USING (auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah'))
        WITH CHECK (auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read monev_period_agenda_snapshot for all') THEN
        CREATE POLICY "Allow read monev_period_agenda_snapshot for all" ON public.monev_period_agenda_snapshot
        FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow manage monev_period_agenda_snapshot for admins') THEN
        CREATE POLICY "Allow manage monev_period_agenda_snapshot for admins" ON public.monev_period_agenda_snapshot
        FOR ALL TO authenticated
        USING (auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah'))
        WITH CHECK (auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah'));
    END IF;

    -- Submissions & Monitoring Items:
    -- Super Admin & Admin Daerah: akses penuh
    -- Koordinator Desa: dapat membaca dan mengedit sesuai wilayah/desa penugasan
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read submissions based on scope') THEN
        CREATE POLICY "Allow read submissions based on scope" ON public.monev_submissions
        FOR SELECT TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR auth.jwt() ->> 'scope' = 'Semua'
            OR auth.jwt() ->> 'scope' = wilayah
            OR auth.jwt() ->> 'desa' = desa
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update submissions based on scope') THEN
        CREATE POLICY "Allow update submissions based on scope" ON public.monev_submissions
        FOR UPDATE TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR auth.jwt() ->> 'scope' = wilayah
            OR auth.jwt() ->> 'desa' = desa
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read monitoring items based on scope') THEN
        CREATE POLICY "Allow read monitoring items based on scope" ON public.monev_monitoring_items
        FOR SELECT TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR auth.jwt() ->> 'scope' = 'Semua'
            OR auth.jwt() ->> 'scope' = wilayah
            OR auth.jwt() ->> 'desa' = desa
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update monitoring items based on scope') THEN
        CREATE POLICY "Allow update monitoring items based on scope" ON public.monev_monitoring_items
        FOR UPDATE TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR auth.jwt() ->> 'scope' = wilayah
            OR auth.jwt() ->> 'desa' = desa
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow read follow_ups for all auth') THEN
        CREATE POLICY "Allow read follow_ups for all auth" ON public.monev_follow_ups
        FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow manage follow_ups for admins and coordinators') THEN
        CREATE POLICY "Allow manage follow_ups for admins and coordinators" ON public.monev_follow_ups
        FOR ALL TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah', 'Admin Desa')
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow insert monev_audit_logs for auth') THEN
        CREATE POLICY "Allow insert monev_audit_logs for auth" ON public.monev_audit_logs
        FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select monev_audit_logs for admin') THEN
        CREATE POLICY "Allow select monev_audit_logs for admin" ON public.monev_audit_logs
        FOR SELECT TO authenticated
        USING (auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah'));
    END IF;
END $$;

-- 11. IDEMPOTENT SEED DATA: 18 MASTER AGENDA BULANAN PPG
INSERT INTO public.monev_master_agenda 
(id, nomor_urut, judul_agenda, kategori, sasaran, frekuensi, is_mandatory, is_active, deskripsi)
VALUES
('mag-01', 1, 'Musyawarah guru', 'Musyawarah 5 Unsur', 'Guru', 'Bulanan', true, true, 'Musyawarah pembinaan dan evaluasi guru/pengajar TPQ bulanan'),
('mag-02', 2, 'Musyawarah 5 unsur', 'Musyawarah 5 Unsur', '5 Unsur', 'Bulanan', true, true, 'Koordinasi pembinaan 5 unsur (Pengurus, Guru, Orang Tua, Tokoh, Mubaligh)'),
('mag-03', 3, 'Muda mudi hadir pengajian kelompok', 'Muda-Mudi', 'Muda-Mudi', 'Bulanan', true, true, 'Monitoring tingkat kehadiran muda-mudi di pengajian rutin kelompok'),
('mag-04', 4, 'Evaluasi target MM September', 'Evaluasi', 'Muda-Mudi', 'Bulanan', true, true, 'Evaluasi pencapaian target kurikulum dan karakter muda-mudi periode bulanan'),
('mag-05', 5, 'Hari boso CR dan MM', 'KBM Caberawit', 'Caberawit & MM', 'Bulanan', true, true, 'Pelaksanaan program hari berbahasa krama/Jawa halus santri Caberawit dan Muda-Mudi'),
('mag-06', 6, 'Tim bacaan dan Pegon khusus generus', 'Kurikulum', 'Caberawit', 'Bulanan', true, true, 'Pendampingan khusus tim verifikasi bacaan Al-Quran dan Pegon generus'),
('mag-07', 7, 'Mas di jadwal ngajar Generus', 'Pembinaan Mubaligh', 'Mubaligh & Pengajar', 'Bulanan', true, true, 'Penjadwalan dan realisasi mengajar pengurus/mas-mas untuk kelas generus'),
('mag-08', 8, 'Penerobosan MM (terjadwal)', 'Muda-Mudi', 'Muda-Mudi', 'Bulanan', true, true, 'Agenda penerobosan dan pendampingan santri muda-mudi terjadwal'),
('mag-09', 9, 'Sambung CR dan MM', 'KBM Caberawit', 'Caberawit & MM', 'Bulanan', true, true, 'Kegiatan sambung keakraban antara Caberawit dan Muda-Mudi'),
('mag-10', 10, 'Sensus Generus', 'Administrasi & BK', 'Semua Generus', 'Bulanan', true, true, 'Pembaruan data sensus santri, mutasi, dan pertumbuhan generus'),
('mag-11', 11, 'Muda Mudi tidur masjid', 'Muda-Mudi', 'Muda-Mudi', 'Bulanan', true, true, 'Program qiyamul lail dan pembinaan karakter menginap/tidur masjid muda-mudi'),
('mag-12', 12, 'Serkiler PPG September', 'Administrasi & BK', 'Pengurus', 'Bulanan', true, true, 'Penyaluran dan tindak lanjut surat edaran/serkiler resmi PPG bulanan'),
('mag-13', 13, 'BK klp cek absensi', 'Administrasi & BK', 'BK Kelompok', 'Bulanan', true, true, 'Biro Konseling/BK kelompok melakukan audit dan cross-check absensi santri'),
('mag-14', 14, 'BK kelompok setor lembar kerja ke BK desa', 'Administrasi & BK', 'BK Kelompok', 'Bulanan', true, true, 'Penyetoran form dan lembar kerja evaluasi BK kelompok ke koordinator BK desa'),
('mag-15', 15, 'Asad khusus CR', 'KBM Caberawit', 'Caberawit', 'Bulanan', true, true, 'Latihan dan pembinaan seni beladiri ASAD khusus santri Caberawit'),
('mag-16', 16, 'Asad khusus MM', 'Muda-Mudi', 'Muda-Mudi', 'Bulanan', true, true, 'Latihan dan pembinaan seni beladiri ASAD khusus santri Muda-Mudi'),
('mag-17', 17, 'MBG (makan bersama Generus) CR', 'KBM Caberawit', 'Caberawit', 'Bulanan', true, true, 'Program Makan Bersama Generus (MBG) santri Caberawit untuk keakraban dan gizi'),
('mag-18', 18, 'MBG Muda Mudi', 'Muda-Mudi', 'Muda-Mudi', 'Bulanan', true, true, 'Program Makan Bersama Generus (MBG) muda-mudi untuk penguatan ukhuwah')
ON CONFLICT (id) DO UPDATE SET
    nomor_urut = EXCLUDED.nomor_urut,
    judul_agenda = EXCLUDED.judul_agenda,
    kategori = EXCLUDED.kategori,
    sasaran = EXCLUDED.sasaran,
    deskripsi = EXCLUDED.deskripsi,
    updated_at = timezone('utc'::text, now());

-- 12. IDEMPOTENT SEED DATA: PERIODE DEFAULT (Oktober 2026)
INSERT INTO public.monev_periods
(id, nama_periode, tahun, bulan, periode_kode, status, tanggal_mulai, tanggal_selesai, cakupan_wilayah, total_desa, total_agenda, catatan_periode)
VALUES
(
    'period-2026-10',
    'Monev PPG Periode Oktober 2026',
    2026,
    10,
    '2026-10',
    'OPEN',
    '2026-10-01',
    '2026-10-31',
    '["Desa Selatan", "Desa Tengah", "Desa Utara", "Desa Timur"]'::jsonb,
    28,
    18,
    'Periode monitoring aktif agenda bulanan PPG Daerah Magetan Timur bulan Oktober 2026.'
)
ON CONFLICT (id) DO UPDATE SET
    nama_periode = EXCLUDED.nama_periode,
    status = EXCLUDED.status,
    total_desa = EXCLUDED.total_desa,
    total_agenda = EXCLUDED.total_agenda,
    updated_at = timezone('utc'::text, now());
