-- Migration: Magtim Center — Face Scan Attendance Add-On
-- File: supabase/migrations/20261011_magtim_face_attendance.sql

CREATE TABLE IF NOT EXISTS public.face_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generus_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    model_version TEXT NOT NULL DEFAULT 'facenet-mobile-v1',
    enrolled_by TEXT,
    consent_acknowledged BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.face_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID REFERENCES public.face_enrollments(id) ON DELETE CASCADE,
    generus_id TEXT NOT NULL,
    embedding JSONB NOT NULL,
    quality_score FLOAT NOT NULL DEFAULT 0.85,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.face_scan_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name TEXT NOT NULL,
    kelompok TEXT NOT NULL,
    tanggal DATE NOT NULL,
    matched_generus_id TEXT,
    confidence_score FLOAT,
    status_result TEXT NOT NULL CHECK (status_result IN ('success', 'already_present', 'unrecognized', 'poor_quality', 'manual_fallback')),
    scanned_by TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attendance_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    presensi_id TEXT NOT NULL,
    generus_id TEXT NOT NULL,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    corrected_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indeks Pencarian dan Integritas Relasi
CREATE INDEX IF NOT EXISTS idx_face_enrollments_generus ON public.face_enrollments(generus_id);
CREATE INDEX IF NOT EXISTS idx_face_templates_generus ON public.face_templates(generus_id);
CREATE INDEX IF NOT EXISTS idx_face_scan_events_session ON public.face_scan_events(session_name, tanggal, kelompok);

-- RLS (Row Level Security)
ALTER TABLE public.face_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;

-- Policy dasar: Authenticated users dapat mengakses data yang relevan
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to face_enrollments for authenticated') THEN
        CREATE POLICY "Allow access to face_enrollments for authenticated" ON public.face_enrollments FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to face_templates for authenticated') THEN
        CREATE POLICY "Allow access to face_templates for authenticated" ON public.face_templates FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to face_scan_events for authenticated') THEN
        CREATE POLICY "Allow access to face_scan_events for authenticated" ON public.face_scan_events FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to attendance_corrections for authenticated') THEN
        CREATE POLICY "Allow access to attendance_corrections for authenticated" ON public.attendance_corrections FOR ALL USING (true);
    END IF;
END $$;
