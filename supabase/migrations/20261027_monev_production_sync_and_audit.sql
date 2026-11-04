-- ==============================================================================
-- MIGRATION: 20261027_monev_production_sync_and_audit.sql
-- MODUL MONEV AGENDA BULANAN PPG - AUDIT TRAIL, VERIFICATION/REJECTION METADATA,
-- STRICT RLS & CENTRALIZED SOURCE-OF-TRUTH SYNC STORE
-- ==============================================================================

DO $$
BEGIN
    -- 1. Tambah kolom Audit Trail & Verification/Rejection pada monev_submissions (Section 8 & 10)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monev_submissions' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.monev_submissions ADD COLUMN created_by TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monev_submissions' AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public.monev_submissions ADD COLUMN updated_by TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monev_submissions' AND column_name = 'verification_note'
    ) THEN
        ALTER TABLE public.monev_submissions ADD COLUMN verification_note TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monev_submissions' AND column_name = 'rejected_by'
    ) THEN
        ALTER TABLE public.monev_submissions ADD COLUMN rejected_by TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monev_submissions' AND column_name = 'rejected_at'
    ) THEN
        ALTER TABLE public.monev_submissions ADD COLUMN rejected_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monev_submissions' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.monev_submissions ADD COLUMN rejection_reason TEXT;
    END IF;

    -- 2. Tambah kolom created_by pada monev_monitoring_items (Section 10)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monev_monitoring_items' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE public.monev_monitoring_items ADD COLUMN created_by TEXT;
    END IF;

    -- 3. Tabel monev_state_store untuk sinkronisasi cepat Source of Truth lintas sesi/perangkat
    CREATE TABLE IF NOT EXISTS public.monev_state_store (
        key TEXT PRIMARY KEY,
        payload JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_by TEXT,
        updated_role TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
    );

    ALTER TABLE public.monev_state_store ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Service role full access monev_state_store" ON public.monev_state_store;
    CREATE POLICY "Service role full access monev_state_store" ON public.monev_state_store
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

    -- 4. Perkuat RLS Policies pada monev_submissions & monev_monitoring_items (Section 11)
    DROP POLICY IF EXISTS "Allow read submissions based on scope" ON public.monev_submissions;
    DROP POLICY IF EXISTS "Allow update submissions based on scope" ON public.monev_submissions;
    DROP POLICY IF EXISTS "Allow read monitoring items based on scope" ON public.monev_monitoring_items;
    DROP POLICY IF EXISTS "Allow update monitoring items based on scope" ON public.monev_monitoring_items;

    CREATE POLICY "Allow read submissions based on scope" ON public.monev_submissions
    FOR SELECT TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
        OR (auth.jwt() ->> 'role' = 'Viewer' AND (auth.jwt() ->> 'scope' = 'Semua' OR auth.jwt() ->> 'scope' = wilayah OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
        OR (auth.jwt() ->> 'role' IN ('Admin Kelompok', 'Pengajar') AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
    );

    CREATE POLICY "Allow update submissions based on scope" ON public.monev_submissions
    FOR UPDATE TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
        OR (
            status IN ('DRAFT', 'REJECTED')
            AND (
                (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
                OR (auth.jwt() ->> 'role' IN ('Admin Kelompok', 'Pengajar') AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
            )
        )
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
        OR (
            status IN ('DRAFT', 'REJECTED', 'SUBMITTED')
            AND (
                (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
                OR (auth.jwt() ->> 'role' IN ('Admin Kelompok', 'Pengajar') AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
            )
        )
    );

    CREATE POLICY "Allow read monitoring items based on scope" ON public.monev_monitoring_items
    FOR SELECT TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
        OR (auth.jwt() ->> 'role' = 'Viewer' AND (auth.jwt() ->> 'scope' = 'Semua' OR auth.jwt() ->> 'scope' = wilayah OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
        OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
        OR (auth.jwt() ->> 'role' IN ('Admin Kelompok', 'Pengajar') AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
    );

    CREATE POLICY "Allow update monitoring items based on scope" ON public.monev_monitoring_items
    FOR UPDATE TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
        OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
        OR (auth.jwt() ->> 'role' IN ('Admin Kelompok', 'Pengajar') AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
    )
    WITH CHECK (
        auth.jwt() ->> 'role' IN ('Super Admin', 'Admin Daerah')
        OR (auth.jwt() ->> 'role' = 'Admin Desa' AND auth.jwt() ->> 'scope' = wilayah)
        OR (auth.jwt() ->> 'role' IN ('Admin Kelompok', 'Pengajar') AND (auth.jwt() ->> 'desa' = desa OR replace(auth.jwt() ->> 'scope', 'Kelompok ', '') = desa))
    );

    -- Pastikan service_role memiliki akses penuh ke seluruh tabel monev_*
    GRANT ALL ON public.monev_master_agenda TO service_role;
    GRANT ALL ON public.monev_periods TO service_role;
    GRANT ALL ON public.monev_period_agenda_snapshot TO service_role;
    GRANT ALL ON public.monev_submissions TO service_role;
    GRANT ALL ON public.monev_monitoring_items TO service_role;
    GRANT ALL ON public.monev_follow_ups TO service_role;
    GRANT ALL ON public.monev_evidence TO service_role;
    GRANT ALL ON public.monev_audit_logs TO service_role;
    GRANT ALL ON public.monev_state_store TO service_role;
END $$;
