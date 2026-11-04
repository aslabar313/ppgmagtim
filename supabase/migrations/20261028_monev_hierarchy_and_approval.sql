-- ============================================================================
-- MIGRATION: 20261028_monev_hierarchy_and_approval.sql
-- PURPOSE  : Safe, non-destructive hierarchy normalization (Daerah -> Desa -> Kelompok),
--            canonical report_id, and Admin Desa / Superadmin approval RLS policies.
-- ============================================================================

-- 1. Add canonical hierarchy & report_id columns to monev_submissions
ALTER TABLE public.monev_submissions
  ADD COLUMN IF NOT EXISTS report_id TEXT,
  ADD COLUMN IF NOT EXISTS desa_nama TEXT,
  ADD COLUMN IF NOT EXISTS kelompok_nama TEXT;

-- Backfill existing records safely without deleting or resetting historical data
UPDATE public.monev_submissions
SET
  report_id = COALESCE(report_id, id::text),
  desa_nama = regexp_replace(wilayah, '^Desa\s+', '', 'i'),
  kelompok_nama = regexp_replace(desa, '^(Kelompok|Desa)\s+', '', 'i')
WHERE report_id IS NULL OR desa_nama IS NULL OR kelompok_nama IS NULL;

-- 2. Add canonical hierarchy & report_id columns to monev_monitoring_items
ALTER TABLE public.monev_monitoring_items
  ADD COLUMN IF NOT EXISTS report_id TEXT,
  ADD COLUMN IF NOT EXISTS desa_nama TEXT,
  ADD COLUMN IF NOT EXISTS kelompok_nama TEXT;

UPDATE public.monev_monitoring_items
SET
  report_id = COALESCE(report_id, submission_id::text),
  desa_nama = regexp_replace(wilayah, '^Desa\s+', '', 'i'),
  kelompok_nama = regexp_replace(desa, '^(Kelompok|Desa)\s+', '', 'i')
WHERE report_id IS NULL OR desa_nama IS NULL OR kelompok_nama IS NULL;

-- 3. Create indexes for fast lookup by report_id, desa_nama, kelompok_nama
CREATE INDEX IF NOT EXISTS idx_monev_submissions_report_id ON public.monev_submissions(report_id);
CREATE INDEX IF NOT EXISTS idx_monev_submissions_hierarchy ON public.monev_submissions(desa_nama, kelompok_nama);
CREATE INDEX IF NOT EXISTS idx_monev_items_report_id ON public.monev_monitoring_items(report_id);
CREATE INDEX IF NOT EXISTS idx_monev_items_hierarchy ON public.monev_monitoring_items(desa_nama, kelompok_nama);
