-- ==============================================================================
-- MIGRATION: 20261013_monev_part2_enhancements.sql
-- MODUL MONEV AGENDA BULANAN PPG - PART 2 & COMPLETE PRODUCTION ENHANCEMENTS
-- Penambahan Kolom Status Ketercapaian (termasuk NOT_STARTED), Locking Metadata,
-- Evidence Table, Follow-up Management, Views Agregasi, dan RLS Policies
-- Idempotent & Safe Execution (Non-Destructive)
-- ==============================================================================

-- 0. Pastikan ENUM monev_submission_status mendukung 'LOCKED'
ALTER TYPE public.monev_submission_status ADD VALUE IF NOT EXISTS 'LOCKED';

DO $$
BEGIN
    -- 1. Tambah kolom locking & cakupan kustom pada monev_periods
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'monev_periods' 
        AND column_name = 'locked_by'
    ) THEN
        ALTER TABLE public.monev_periods ADD COLUMN locked_by TEXT;
        ALTER TABLE public.monev_periods ADD COLUMN locked_at TIMESTAMPTZ;
        ALTER TABLE public.monev_periods ADD COLUMN selected_agenda_ids JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.monev_periods ADD COLUMN selected_desas JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- 2. Tambah kolom status_ketercapaian pada tabel monev_monitoring_items
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'monev_monitoring_items' 
        AND column_name = 'status_ketercapaian'
    ) THEN
        ALTER TABLE public.monev_monitoring_items 
        ADD COLUMN status_ketercapaian TEXT NOT NULL DEFAULT 'NOT_STARTED';
    END IF;

    -- Perbarui constraint status_ketercapaian untuk mendukung NOT_STARTED, COMPLETED, PARTIAL, NOT_COMPLETED
    ALTER TABLE public.monev_monitoring_items DROP CONSTRAINT IF EXISTS chk_monev_item_ketercapaian;
    ALTER TABLE public.monev_monitoring_items 
    ADD CONSTRAINT chk_monev_item_ketercapaian 
    CHECK (status_ketercapaian IN ('NOT_STARTED', 'COMPLETED', 'PARTIAL', 'NOT_COMPLETED'));

    -- 3. Tambah kolom is_mandatory dan laporan_pelaksanaan pada tabel monev_monitoring_items jika belum ada
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'monev_monitoring_items' 
        AND column_name = 'is_mandatory'
    ) THEN
        ALTER TABLE public.monev_monitoring_items 
        ADD COLUMN is_mandatory BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'monev_monitoring_items' 
        AND column_name = 'laporan_pelaksanaan'
    ) THEN
        ALTER TABLE public.monev_monitoring_items 
        ADD COLUMN laporan_pelaksanaan TEXT DEFAULT '';
    END IF;

    -- 4. Perluas kolom tabel monev_follow_ups untuk integrasi tindak lanjut agenda bermasalah
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'monev_follow_ups' 
        AND column_name = 'wilayah'
    ) THEN
        ALTER TABLE public.monev_follow_ups ADD COLUMN wilayah TEXT;
        ALTER TABLE public.monev_follow_ups ADD COLUMN agenda_judul TEXT;
        ALTER TABLE public.monev_follow_ups ADD COLUMN nomor_urut INT;
        ALTER TABLE public.monev_follow_ups ADD COLUMN alasan_kendala TEXT;
        ALTER TABLE public.monev_follow_ups ADD COLUMN deskripsi_masalah TEXT;
        ALTER TABLE public.monev_follow_ups ADD COLUMN rencana_tindakan TEXT;
        ALTER TABLE public.monev_follow_ups ADD COLUMN catatan_progres TEXT;
    END IF;

    -- Perbarui check constraint status follow-up untuk mendukung OPEN, IN_PROGRESS, COMPLETED, CANCELLED
    ALTER TABLE public.monev_follow_ups DROP CONSTRAINT IF EXISTS monev_follow_ups_status_check;
    ALTER TABLE public.monev_follow_ups 
    ADD CONSTRAINT monev_follow_ups_status_check 
    CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BELUM_SELESAI', 'DALAM_PROSES', 'SELESAI'));

    -- 5. Tabel monev_evidence (Bukti Dokumentasi / Lampiran Agenda)
    CREATE TABLE IF NOT EXISTS public.monev_evidence (
        id TEXT PRIMARY KEY,
        monitoring_item_id TEXT NOT NULL REFERENCES public.monev_monitoring_items(id) ON DELETE CASCADE,
        period_id TEXT NOT NULL REFERENCES public.monev_periods(id) ON DELETE CASCADE,
        wilayah TEXT NOT NULL,
        desa TEXT NOT NULL,
        judul_dokumentasi TEXT NOT NULL,
        file_url TEXT NOT NULL,
        file_type TEXT DEFAULT 'link',
        uploaded_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    ALTER TABLE public.monev_evidence ENABLE ROW LEVEL SECURITY;

    -- Perketat RLS: Hapus policy SELECT terlalu terbuka pada follow_ups dan evidence
    DROP POLICY IF EXISTS "Allow read follow_ups for all auth" ON public.monev_follow_ups;
    DROP POLICY IF EXISTS "Allow manage follow_ups for admins and coordinators" ON public.monev_follow_ups;
    DROP POLICY IF EXISTS "Allow read monev_evidence for auth" ON public.monev_evidence;
    DROP POLICY IF EXISTS "Allow manage monev_evidence based on scope" ON public.monev_evidence;

    -- RLS Strict Scope untuk monev_follow_ups (Admin Kelompok = own group, Admin Desa = own village, Admin PPG = all)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Strict scope select monev_follow_ups') THEN
        CREATE POLICY "Strict scope select monev_follow_ups" ON public.monev_follow_ups
        FOR SELECT TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Strict scope write monev_follow_ups') THEN
        CREATE POLICY "Strict scope write monev_follow_ups" ON public.monev_follow_ups
        FOR ALL TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        )
        WITH CHECK (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        );
    END IF;

    -- RLS Strict Scope untuk monev_evidence
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Strict scope select monev_evidence') THEN
        CREATE POLICY "Strict scope select monev_evidence" ON public.monev_evidence
        FOR SELECT TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Strict scope write monev_evidence') THEN
        CREATE POLICY "Strict scope write monev_evidence" ON public.monev_evidence
        FOR ALL TO authenticated
        USING (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        )
        WITH CHECK (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        );
    END IF;

    -- RLS Self-Provisioning INSERT untuk monev_submissions dan monev_monitoring_items saat Periode OPEN (Tanpa menunggu approval Admin)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow self-provision submissions when period open') THEN
        CREATE POLICY "Allow self-provision submissions when period open" ON public.monev_submissions
        FOR INSERT TO authenticated
        WITH CHECK (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow self-provision monitoring items when period open') THEN
        CREATE POLICY "Allow self-provision monitoring items when period open" ON public.monev_monitoring_items
        FOR INSERT TO authenticated
        WITH CHECK (
            auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
            OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
            OR (auth.jwt() ->> 'role' = 'Admin Kelompok' AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        );
    END IF;

    -- 6. Tambah indeks untuk pencarian cepat tindak lanjut, evidence, dan monitoring items
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = 'idx_monev_follow_ups_period_status'
    ) THEN
        CREATE INDEX idx_monev_follow_ups_period_status 
        ON public.monev_follow_ups(period_id, status);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = 'idx_monev_items_status_ketercapaian'
    ) THEN
        CREATE INDEX idx_monev_items_status_ketercapaian 
        ON public.monev_monitoring_items(period_id, status_ketercapaian);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname = 'idx_monev_evidence_item'
    ) THEN
        CREATE INDEX idx_monev_evidence_item 
        ON public.monev_evidence(monitoring_item_id);
    END IF;

END $$;

-- 7. Database Aggregation View untuk Performa Dashboard Command Center
CREATE OR REPLACE VIEW public.v_monev_region_performance AS
SELECT 
    period_id,
    wilayah,
    COUNT(*) AS total_desa,
    COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'VERIFIED')) AS reported_desa,
    COUNT(*) FILTER (WHERE status = 'VERIFIED') AS verified_desa,
    COUNT(*) FILTER (WHERE status = 'SUBMITTED') AS submitted_desa,
    COUNT(*) FILTER (WHERE status = 'REJECTED') AS rejected_desa,
    COUNT(*) FILTER (WHERE status = 'DRAFT' AND progress_persen > 0) AS draft_desa,
    COUNT(*) FILTER (WHERE status = 'DRAFT' AND progress_persen = 0) AS not_started_desa,
    ROUND(AVG(progress_persen), 1) AS avg_completion_rate
FROM public.monev_submissions
GROUP BY period_id, wilayah;

