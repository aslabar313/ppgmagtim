-- ============================================================================
-- MIGRATION: 20261105_festival_generus_part2_core_engine.sql
-- MODULE   : FESTIVAL GENERUS — PART 2 (CORE COMPETITION ENGINE)
-- PURPOSE  : Extends Part 1 schema with Physical Artwork Judging (fg_artworks),
--            Arena Queue & Timer Management (fg_arena_queues), Education Level
--            validation, WITHDRAWN registration status, Judge Isolation policy,
--            Cerdas Cermat before/after score audit fields, and RLS policies.
-- ============================================================================

BEGIN;

-- 1. Extend fg_registration_status enum with WITHDRAWN
ALTER TYPE public.fg_registration_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';

-- 2. Extend fg_competitions for Part 2 Core Engine requirements
ALTER TABLE public.fg_competitions
    ADD COLUMN IF NOT EXISTS display_number INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS education_level TEXT NOT NULL DEFAULT 'SD',
    ADD COLUMN IF NOT EXISTS material_summary TEXT,
    ADD COLUMN IF NOT EXISTS theme_text TEXT,
    ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 10,
    ADD COLUMN IF NOT EXISTS is_physical_artwork BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_asad_official_rules BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS rules_confirmed_by_committee BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS male_bonus_enabled BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS male_bonus_points NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS male_bonus_approved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS blind_peer_judge_scores BOOLEAN NOT NULL DEFAULT true;

-- 3. Extend fg_participants with education_level snapshot
ALTER TABLE public.fg_participants
    ADD COLUMN IF NOT EXISTS snapshot_education_level TEXT NOT NULL DEFAULT 'SD';

-- 4. Extend fg_scoring_submissions & fg_scoring_results for high-precision (J1+J2+J3)/3
ALTER TABLE public.fg_scoring_submissions
    ADD COLUMN IF NOT EXISTS criteria_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS bonus_points NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS is_autosaved BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ;

ALTER TABLE public.fg_scoring_results
    ADD COLUMN IF NOT EXISTS criteria_averages JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS tie_breaker_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS is_tied_requiring_deliberation BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deliberation_note TEXT;

-- 5. Physical Artwork Judging Table: fg_artworks (Categories 1, 2, 3)
CREATE TABLE IF NOT EXISTS public.fg_artworks (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES public.fg_participants(id) ON DELETE CASCADE,
    artwork_code TEXT NOT NULL UNIQUE, -- e.g. KRY-2026-MWR-001
    theme_applied TEXT NOT NULL,
    paper_size TEXT NOT NULL DEFAULT 'F4 (Disediakan Panitia)',
    photo_url TEXT NOT NULL,
    physical_table_number TEXT,
    duration_used_minutes INT NOT NULL DEFAULT 90,
    without_parent_assistance_verified BOOLEAN NOT NULL DEFAULT true,
    no_colored_background_verified BOOLEAN NOT NULL DEFAULT true,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT,
    CONSTRAINT uq_fg_artwork_registration UNIQUE (registration_id)
);

-- 6. Arena Queue, Calling & Timer Table: fg_arena_queues
CREATE TABLE IF NOT EXISTS public.fg_arena_queues (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    arena_id TEXT NOT NULL REFERENCES public.fg_arenas(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    queue_number INT NOT NULL,
    participant_number_code TEXT NOT NULL,
    call_status TEXT NOT NULL DEFAULT 'WAITING' CHECK (call_status IN ('WAITING', 'CALLED', 'PERFORMING', 'COMPLETED', 'SKIPPED', 'ABSENT')),
    attendance_status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (attendance_status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED')),
    timer_limit_seconds INT NOT NULL DEFAULT 600,
    timer_elapsed_seconds INT NOT NULL DEFAULT 0,
    timer_status TEXT NOT NULL DEFAULT 'IDLE' CHECK (timer_status IN ('IDLE', 'RUNNING', 'PAUSED', 'FINISHED')),
    overtime_flagged BOOLEAN NOT NULL DEFAULT false,
    called_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    operator_username TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_arena_queue_reg_stage UNIQUE (registration_id, stage_id)
);

-- 7. Extend Cerdas Cermat tables (fg_quiz_matches, fg_quiz_score_events, fg_quiz_leaderboards)
ALTER TABLE public.fg_quiz_matches
    ADD COLUMN IF NOT EXISTS active_round_type TEXT NOT NULL DEFAULT 'GILIRAN' CHECK (active_round_type IN ('GILIRAN', 'REBUTAN')),
    ADD COLUMN IF NOT EXISTS active_turn_team_id TEXT REFERENCES public.fg_teams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS buzzer_locked_team_id TEXT REFERENCES public.fg_teams(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS question_timer_seconds INT NOT NULL DEFAULT 15,
    ADD COLUMN IF NOT EXISTS giliran_correct_points NUMERIC(8,2) NOT NULL DEFAULT 100.00,
    ADD COLUMN IF NOT EXISTS giliran_wrong_points NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS rebutan_correct_points NUMERIC(8,2) NOT NULL DEFAULT 100.00,
    ADD COLUMN IF NOT EXISTS rebutan_wrong_points NUMERIC(8,2) NOT NULL DEFAULT -50.00,
    ADD COLUMN IF NOT EXISTS rules_confirmed_by_committee BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.fg_quiz_score_events
    ADD COLUMN IF NOT EXISTS question_id TEXT,
    ADD COLUMN IF NOT EXISTS score_before NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS score_after NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT 'Penilaian jawaban Cerdas Cermat';

ALTER TABLE public.fg_quiz_leaderboards
    ADD COLUMN IF NOT EXISTS correct_answers_count INT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wrong_answers_count INT NOT NULL DEFAULT 0;

-- 8. Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_fg_artworks_comp ON public.fg_artworks(competition_id, registration_id);
CREATE INDEX IF NOT EXISTS idx_fg_arena_queues_lookup ON public.fg_arena_queues(arena_id, competition_id, queue_number);

-- 9. Audit Triggers on new tables
DROP TRIGGER IF EXISTS trg_audit_fg_artworks ON public.fg_artworks;
CREATE TRIGGER trg_audit_fg_artworks
AFTER INSERT OR UPDATE OR DELETE ON public.fg_artworks
FOR EACH ROW EXECUTE FUNCTION public.fg_record_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_fg_arena_queues ON public.fg_arena_queues;
CREATE TRIGGER trg_audit_fg_arena_queues
AFTER INSERT OR UPDATE OR DELETE ON public.fg_arena_queues
FOR EACH ROW EXECUTE FUNCTION public.fg_record_audit_trigger();

-- 10. Enable RLS and Policies on all new tables
ALTER TABLE public.fg_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_arena_queues ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "fg_artworks_read_policy" ON public.fg_artworks;
    CREATE POLICY "fg_artworks_read_policy" ON public.fg_artworks
    FOR SELECT TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() IN ('Admin Registrasi', 'Operator Arena', 'Petugas Check-in', 'Ketua Dewan Juri')
        OR (
            public.fg_current_role() = 'Juri'
            AND EXISTS (
                SELECT 1 FROM public.fg_judge_assignments ja
                JOIN public.fg_judges j ON j.id = ja.judge_id
                WHERE ja.competition_id = fg_artworks.competition_id
                  AND j.username = COALESCE(auth.jwt() ->> 'username', '')
            )
        )
    );

    DROP POLICY IF EXISTS "fg_artworks_write_policy" ON public.fg_artworks;
    CREATE POLICY "fg_artworks_write_policy" ON public.fg_artworks
    FOR ALL TO authenticated
    USING (
        public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Admin Registrasi', 'Operator Arena', 'Petugas Check-in')
        OR public.fg_can_access_org(region_name, village_name, group_name)
    )
    WITH CHECK (
        public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Admin Registrasi', 'Operator Arena', 'Petugas Check-in')
        OR public.fg_can_access_org(region_name, village_name, group_name)
    );

    DROP POLICY IF EXISTS "fg_arena_queues_read_policy" ON public.fg_arena_queues;
    CREATE POLICY "fg_arena_queues_read_policy" ON public.fg_arena_queues
    FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "fg_arena_queues_write_policy" ON public.fg_arena_queues;
    CREATE POLICY "fg_arena_queues_write_policy" ON public.fg_arena_queues
    FOR ALL TO authenticated
    USING (
        public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Operator Arena', 'Petugas Check-in', 'Ketua Dewan Juri')
    )
    WITH CHECK (
        public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Operator Arena', 'Petugas Check-in', 'Ketua Dewan Juri')
    );
END $$;

GRANT ALL ON public.fg_artworks TO service_role;
GRANT ALL ON public.fg_arena_queues TO service_role;

COMMIT;
