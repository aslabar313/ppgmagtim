-- ============================================================================
-- MIGRATION: 20261104_festival_generus_foundation.sql
-- MODULE   : FESTIVAL GENERUS — PART 1 (FOUNDATION & SYSTEM ARCHITECTURE)
-- PURPOSE  : Non-destructive modular schema (36 fg_* tables), organizational
--            hierarchy integration (Daerah -> Desa -> Kelompok), 15-role RBAC,
--            3-judge DECIMAL scoring architecture, Cerdas Cermat team-match
--            schema, audit trail triggers, and strict Row Level Security (RLS).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. ENUM TYPES & HELPER SECURITY FUNCTIONS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fg_role_type') THEN
        CREATE TYPE public.fg_role_type AS ENUM (
            'Superadmin',
            'Admin Daerah',
            'Admin Desa',
            'Admin Kelompok',
            'Admin Festival',
            'Ketua Panitia',
            'Sekretaris',
            'Admin Registrasi',
            'Ketua Dewan Juri',
            'Juri',
            'Operator Arena',
            'Operator Cerdas Cermat',
            'Petugas Check-in',
            'Viewer',
            'Pendamping'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fg_event_status') THEN
        CREATE TYPE public.fg_event_status AS ENUM (
            'DRAFT',
            'REGISTRATION_OPEN',
            'REGISTRATION_CLOSED',
            'ONGOING',
            'SCORING_LOCKED',
            'COMPLETED',
            'ARCHIVED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fg_competition_type') THEN
        CREATE TYPE public.fg_competition_type AS ENUM (
            'INDIVIDUAL',
            'TEAM',
            'QUIZ_TEAM'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fg_registration_status') THEN
        CREATE TYPE public.fg_registration_status AS ENUM (
            'DRAFT',
            'SUBMITTED',
            'VERIFIED',
            'REJECTED',
            'CHECKED_IN',
            'DISQUALIFIED'
        );
    END IF;
END $$;

-- Helper functions reading verified JWT claims (never trusting raw browser payload)
CREATE OR REPLACE FUNCTION public.fg_current_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'fg_role', ''),
    NULLIF(auth.jwt() ->> 'role', ''),
    'Viewer'
  );
$$;

CREATE OR REPLACE FUNCTION public.fg_current_region()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'region_name', ''),
    NULLIF(auth.jwt() ->> 'daerah', ''),
    'Daerah Magetan Timur'
  );
$$;

CREATE OR REPLACE FUNCTION public.fg_current_village()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'village_name', ''),
    NULLIF(auth.jwt() ->> 'wilayah', ''),
    NULLIF(auth.jwt() ->> 'scope', ''),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.fg_current_group()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'group_name', ''),
    NULLIF(auth.jwt() ->> 'kelompok', ''),
    NULLIF(auth.jwt() ->> 'desa', ''),
    NULLIF(auth.jwt() ->> 'scope', ''),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.fg_is_global_festival_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT public.fg_current_role() IN (
    'Superadmin',
    'Super Admin',
    'Admin Festival',
    'Ketua Panitia',
    'Sekretaris'
  );
$$;

CREATE OR REPLACE FUNCTION public.fg_can_access_org(
  p_region_name TEXT,
  p_village_name TEXT,
  p_group_name TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN public.fg_current_role() IN ('Superadmin', 'Super Admin', 'Admin Festival', 'Ketua Panitia', 'Sekretaris', 'Ketua Dewan Juri') THEN true
    WHEN public.fg_current_role() = 'Admin Daerah' THEN
      (p_region_name IS NULL OR p_region_name = '' OR p_region_name = public.fg_current_region())
    WHEN public.fg_current_role() = 'Admin Desa' THEN
      (p_village_name = public.fg_current_village() OR ('Desa ' || p_village_name) = public.fg_current_village())
    WHEN public.fg_current_role() IN ('Admin Kelompok', 'Pendamping') THEN
      (
        p_group_name = public.fg_current_group()
        OR ('Kelompok ' || p_group_name) = public.fg_current_group()
        OR regexp_replace(public.fg_current_group(), '^Kelompok\s+', '', 'i') = regexp_replace(COALESCE(p_group_name, ''), '^Kelompok\s+', '', 'i')
      )
    ELSE false
  END;
$$;

-- ============================================================================
-- A. CORE FESTIVAL (7 TABLES)
-- ============================================================================

-- 1. fg_events
CREATE TABLE IF NOT EXISTS public.fg_events (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    theme TEXT,
    hijri_year TEXT,
    gregorian_year INT NOT NULL,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    host_village_name TEXT,
    location_name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_start_date DATE NOT NULL,
    registration_end_date DATE NOT NULL,
    status public.fg_event_status NOT NULL DEFAULT 'DRAFT',
    total_categories INT NOT NULL DEFAULT 17,
    judges_per_competition INT NOT NULL DEFAULT 3 CHECK (judges_per_competition >= 1 AND judges_per_competition <= 7),
    description TEXT,
    created_by TEXT NOT NULL DEFAULT 'system',
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_fg_events_dates CHECK (end_date >= start_date)
);

-- 2. fg_event_stages
CREATE TABLE IF NOT EXISTS public.fg_event_stages (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    stage_code TEXT NOT NULL, -- PENYISIHAN, SEMIFINAL, FINAL
    stage_name TEXT NOT NULL,
    sequence_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_event_stage UNIQUE (event_id, stage_code)
);

-- 3. fg_competition_categories
CREATE TABLE IF NOT EXISTS public.fg_competition_categories (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL, -- e.g. Al-Qur'an & Ibadah, Keilmuan & Hafalan, Seni & Kreativitas, Beregu & Ketangkasan
    description TEXT,
    display_order INT NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_comp_cat_code UNIQUE (event_id, code)
);

-- 4. fg_arenas
CREATE TABLE IF NOT EXISTS public.fg_arenas (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    building_or_zone TEXT,
    capacity INT NOT NULL DEFAULT 50,
    operator_username TEXT,
    checkin_officer_username TEXT,
    status TEXT NOT NULL DEFAULT 'READY' CHECK (status IN ('READY', 'ACTIVE', 'BREAK', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_arena_code UNIQUE (event_id, code)
);

-- 5. fg_competitions (17 Cabang Lomba Caberawit)
CREATE TABLE IF NOT EXISTS public.fg_competitions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES public.fg_competition_categories(id) ON DELETE RESTRICT,
    arena_id TEXT REFERENCES public.fg_arenas(id) ON DELETE SET NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    competition_type public.fg_competition_type NOT NULL DEFAULT 'INDIVIDUAL',
    gender_scope TEXT NOT NULL DEFAULT 'MIXED' CHECK (gender_scope IN ('PUTRA', 'PUTRI', 'MIXED', 'PUTRA_PUTRI_SEPARATE')),
    age_Segment TEXT NOT NULL DEFAULT 'Caberawit (Usia < 13 Tahun)',
    min_age INT NOT NULL DEFAULT 4,
    max_age INT NOT NULL DEFAULT 12,
    min_members_per_team INT NOT NULL DEFAULT 1,
    max_members_per_team INT NOT NULL DEFAULT 1,
    max_quota_per_group INT NOT NULL DEFAULT 2,
    max_quota_per_village INT NOT NULL DEFAULT 10,
    judge_count INT NOT NULL DEFAULT 3 CHECK (judge_count = 3),
    scoring_method TEXT NOT NULL DEFAULT 'SUM_3_JUDGES' CHECK (scoring_method IN ('SUM_3_JUDGES', 'AVERAGE_3_JUDGES', 'QUIZ_POINT_SYSTEM')),
    schedule_start TIMESTAMPTZ,
    schedule_end TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CHECKIN', 'ONGOING', 'SCORING_COMPLETED', 'PUBLISHED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_competition_code UNIQUE (event_id, code)
);

-- 6. fg_competition_rules
CREATE TABLE IF NOT EXISTS public.fg_competition_rules (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    rule_number INT NOT NULL DEFAULT 1,
    rule_title TEXT NOT NULL,
    rule_description TEXT NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 7,
    is_mandatory_document BOOLEAN NOT NULL DEFAULT false,
    disqualification_condition TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. fg_event_settings
CREATE TABLE IF NOT EXISTS public.fg_event_settings (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_event_setting UNIQUE (event_id, setting_key)
);

-- ============================================================================
-- B. PESERTA DAN KONTINGEN (9 TABLES)
-- ============================================================================

-- 8. fg_contingents (Kontingen Kelompok -> Desa -> Daerah)
CREATE TABLE IF NOT EXISTS public.fg_contingents (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL, -- Desa Selatan, Desa Tengah, Desa Utara, Desa Timur
    group_id TEXT,              -- Reference to tpq_kelompok / klp-*
    group_name TEXT NOT NULL,   -- Kelompok Karas, Kelompok Soco, etc.
    contingent_code TEXT NOT NULL,
    leader_name TEXT NOT NULL,
    leader_whatsapp TEXT,
    pendamping_username TEXT,
    total_participants INT NOT NULL DEFAULT 0,
    total_teams INT NOT NULL DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('DRAFT', 'SUBMITTED', 'VERIFIED', 'LOCKED')),
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_contingent_group UNIQUE (event_id, group_name)
);

-- 9. fg_participants (Terintegrasi dengan generus + Snapshot Identitas Historis)
CREATE TABLE IF NOT EXISTS public.fg_participants (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    contingent_id TEXT NOT NULL REFERENCES public.fg_contingents(id) ON DELETE CASCADE,
    generus_id TEXT NOT NULL, -- FK / Link ke tabel anggota/santri (generus) yang sudah ada
    -- Snapshot Identitas Peserta (menjaga konsistensi data historis)
    snapshot_full_name TEXT NOT NULL,
    snapshot_nis TEXT NOT NULL,
    snapshot_gender TEXT NOT NULL CHECK (snapshot_gender IN ('Laki-laki', 'Perempuan')),
    snapshot_birth_date DATE NOT NULL,
    snapshot_age INT NOT NULL CHECK (snapshot_age >= 3 AND snapshot_age <= 25),
    snapshot_category TEXT NOT NULL DEFAULT 'Caberawit',
    snapshot_parent_name TEXT,
    snapshot_parent_whatsapp TEXT,
    snapshot_group_id TEXT,
    snapshot_group_name TEXT NOT NULL,
    snapshot_village_name TEXT NOT NULL,
    snapshot_region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    photo_url TEXT,
    eligibility_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (eligibility_status IN ('PENDING', 'VERIFIED', 'INELIGIBLE')),
    eligibility_notes TEXT,
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_participant_event_generus UNIQUE (event_id, generus_id)
);

-- 10. fg_teams (Regu/Tim untuk Lomba Beregu & Cerdas Cermat)
CREATE TABLE IF NOT EXISTS public.fg_teams (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    contingent_id TEXT NOT NULL REFERENCES public.fg_contingents(id) ON DELETE CASCADE,
    team_code TEXT NOT NULL,
    team_name TEXT NOT NULL,
    captain_participant_id TEXT REFERENCES public.fg_participants(id) ON DELETE SET NULL,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    member_count INT NOT NULL DEFAULT 3,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'DISQUALIFIED')),
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_team_code UNIQUE (event_id, team_code)
);

-- 11. fg_team_members
CREATE TABLE IF NOT EXISTS public.fg_team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES public.fg_teams(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES public.fg_participants(id) ON DELETE CASCADE,
    member_role TEXT NOT NULL DEFAULT 'ANGGOTA' CHECK (member_role IN ('KETUA_REGU', 'JURU_BICARA', 'ANGGOTA', 'CADANGAN')),
    sequence_no INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_team_participant UNIQUE (team_id, participant_id)
);

-- 12. fg_registrations (Satu entri lomba: tepat satu dari participant_id ATAU team_id terisi)
CREATE TABLE IF NOT EXISTS public.fg_registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    contingent_id TEXT NOT NULL REFERENCES public.fg_contingents(id) ON DELETE CASCADE,
    participant_id TEXT REFERENCES public.fg_participants(id) ON DELETE CASCADE,
    team_id TEXT REFERENCES public.fg_teams(id) ON DELETE CASCADE,
    registration_code TEXT NOT NULL UNIQUE,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    status public.fg_registration_status NOT NULL DEFAULT 'SUBMITTED',
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- CRITICAL CHECK CONSTRAINT: Tepat satu participant_id atau team_id yang terisi!
    CONSTRAINT chk_fg_registrations_exclusive_entry CHECK (
        (participant_id IS NOT NULL AND team_id IS NULL)
        OR (participant_id IS NULL AND team_id IS NOT NULL)
    ),
    CONSTRAINT uq_fg_reg_comp_participant UNIQUE (competition_id, participant_id),
    CONSTRAINT uq_fg_reg_comp_team UNIQUE (competition_id, team_id)
);

-- 13. fg_documents
CREATE TABLE IF NOT EXISTS public.fg_documents (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    participant_id TEXT REFERENCES public.fg_participants(id) ON DELETE CASCADE,
    registration_id TEXT REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('AKTA_KELAHIRAN', 'KARTU_KELUARGA', 'PAS_FOTO', 'SURAT_REKOMENDASI_KELOMPOK', 'KARTU_SANTRI', 'LAINNYA')),
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. fg_participant_numbers (Nomor Urut Tampil / Nomor Dada)
CREATE TABLE IF NOT EXISTS public.fg_participant_numbers (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    display_number TEXT NOT NULL, -- e.g. "ADZ-001", "CC-A01"
    turn_order INT NOT NULL,
    arena_id TEXT REFERENCES public.fg_arenas(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    assigned_by TEXT,
    CONSTRAINT uq_fg_part_num_comp_stage UNIQUE (competition_id, stage_id, display_number),
    CONSTRAINT uq_fg_part_num_reg_stage UNIQUE (registration_id, stage_id)
);

-- 15. fg_checkins (Daftar Ulang & Kehadiran Arena)
CREATE TABLE IF NOT EXISTS public.fg_checkins (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    arena_id TEXT REFERENCES public.fg_arenas(id) ON DELETE SET NULL,
    checkin_type TEXT NOT NULL DEFAULT 'ARENA_CALL' CHECK (checkin_type IN ('MAIN_DESK', 'ARENA_CALL', 'FINAL_CALL')),
    checkin_status TEXT NOT NULL DEFAULT 'PRESENT' CHECK (checkin_status IN ('PRESENT', 'LATE', 'ABSENT', 'EXCUSED')),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    officer_username TEXT NOT NULL,
    qr_verified BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    CONSTRAINT uq_fg_checkin_reg_stage_type UNIQUE (registration_id, stage_id, checkin_type)
);

-- 16. fg_stage_advancements (Kelolosan Babak Penyisihan -> Semifinal -> Final)
CREATE TABLE IF NOT EXISTS public.fg_stage_advancements (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    from_stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    to_stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    source_rank INT NOT NULL,
    source_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    advancement_status TEXT NOT NULL DEFAULT 'QUALIFIED' CHECK (advancement_status IN ('QUALIFIED', 'RESERVE', 'ELIMINATED')),
    approved_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_stage_adv_reg UNIQUE (registration_id, from_stage_id, to_stage_id)
);

-- ============================================================================
-- C. JURI (4 TABLES)
-- ============================================================================

-- 17. fg_judges
CREATE TABLE IF NOT EXISTS public.fg_judges (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    full_name TEXT NOT NULL,
    honorific_title TEXT,
    origin_unit TEXT NOT NULL,
    specialization TEXT NOT NULL,
    whatsapp TEXT,
    is_chief_judge BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_judge_event_user UNIQUE (event_id, username)
);

-- 18. fg_judge_assignments (Penugasan 3 Juri per Cabang Lomba)
CREATE TABLE IF NOT EXISTS public.fg_judge_assignments (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    judge_id TEXT NOT NULL REFERENCES public.fg_judges(id) ON DELETE CASCADE,
    judge_position INT NOT NULL CHECK (judge_position IN (1, 2, 3)), -- Juri 1, Juri 2, Juri 3
    arena_id TEXT REFERENCES public.fg_arenas(id) ON DELETE SET NULL,
    is_lead_judge BOOLEAN NOT NULL DEFAULT false,
    assigned_by TEXT NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_judge_pos_per_comp_stage UNIQUE (competition_id, stage_id, judge_position),
    CONSTRAINT uq_fg_judge_unique_per_comp_stage UNIQUE (competition_id, stage_id, judge_id)
);

-- 19. fg_judge_sessions
CREATE TABLE IF NOT EXISTS public.fg_judge_sessions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES public.fg_judge_assignments(id) ON DELETE CASCADE,
    judge_id TEXT NOT NULL REFERENCES public.fg_judges(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    session_status TEXT NOT NULL DEFAULT 'OPEN' CHECK (session_status IN ('OPEN', 'IN_PROGRESS', 'SUBMITTED', 'LOCKED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    locked_at TIMESTAMPTZ,
    device_fingerprint TEXT,
    notes TEXT
);

-- 20. fg_judge_reviews (Catatan Evaluasi & Berita Acara Dewan Juri)
CREATE TABLE IF NOT EXISTS public.fg_judge_reviews (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    registration_id TEXT REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    judge_id TEXT NOT NULL REFERENCES public.fg_judges(id) ON DELETE CASCADE,
    review_type TEXT NOT NULL DEFAULT 'PARTICIPANT_NOTE' CHECK (review_type IN ('PARTICIPANT_NOTE', 'OBJECTION_REVIEW', 'STAGE_DELIBERATION')),
    recommendation TEXT,
    review_comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- D. PENILAIAN (9 TABLES — NUMERIC/DECIMAL ONLY, NO FLOAT)
-- ============================================================================

-- 21. fg_scoring_templates
CREATE TABLE IF NOT EXISTS public.fg_scoring_templates (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_total_score NUMERIC(8,2) NOT NULL DEFAULT 100.00,
    min_total_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    aggregation_mode TEXT NOT NULL DEFAULT 'SUM_3_JUDGES' CHECK (aggregation_mode IN ('SUM_3_JUDGES', 'AVERAGE_3_JUDGES')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_scoring_template_comp UNIQUE (competition_id)
);

-- 22. fg_scoring_versions
CREATE TABLE IF NOT EXISTS public.fg_scoring_versions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES public.fg_scoring_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    changelog TEXT,
    is_published BOOLEAN NOT NULL DEFAULT true,
    published_by TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_scoring_version UNIQUE (template_id, version_number)
);

-- 23. fg_scoring_criteria
CREATE TABLE IF NOT EXISTS public.fg_scoring_criteria (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES public.fg_scoring_templates(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES public.fg_scoring_versions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL, -- e.g. Tajwid & Makharijul Huruf, Irama/Lagu, Adab & Sikap
    description TEXT,
    weight_percent NUMERIC(5,2) NOT NULL DEFAULT 25.00 CHECK (weight_percent > 0 AND weight_percent <= 100),
    min_score NUMERIC(8,2) NOT NULL DEFAULT 50.00,
    max_score NUMERIC(8,2) NOT NULL DEFAULT 100.00,
    sequence_order INT NOT NULL DEFAULT 1,
    is_tie_breaker_priority BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 24. fg_scoring_penalties
CREATE TABLE IF NOT EXISTS public.fg_scoring_penalties (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES public.fg_scoring_templates(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL, -- e.g. Kelebihan Waktu > 1 Menit, Bantuan Pendamping, Salah Kostum
    deduction_points NUMERIC(8,2) NOT NULL DEFAULT 5.00 CHECK (deduction_points >= 0),
    max_occurrences INT NOT NULL DEFAULT 3,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 25. fg_scoring_submissions (Nilai dari masing-masing Juri 1, Juri 2, Juri 3)
CREATE TABLE IF NOT EXISTS public.fg_scoring_submissions (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    judge_id TEXT NOT NULL REFERENCES public.fg_judges(id) ON DELETE RESTRICT,
    judge_position INT NOT NULL CHECK (judge_position IN (1, 2, 3)),
    raw_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    penalty_deduction NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    final_judge_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    submission_status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (submission_status IN ('DRAFT', 'SUBMITTED', 'LOCKED')),
    judge_notes TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_score_sub_reg_judge UNIQUE (registration_id, stage_id, judge_id)
);

-- 26. fg_scoring_details (Rincian Nilai per Kriteria oleh Juri)
CREATE TABLE IF NOT EXISTS public.fg_scoring_details (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES public.fg_scoring_submissions(id) ON DELETE CASCADE,
    criteria_id TEXT NOT NULL REFERENCES public.fg_scoring_criteria(id) ON DELETE RESTRICT,
    score_value NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    weighted_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_score_detail_crit UNIQUE (submission_id, criteria_id)
);

-- 27. fg_scoring_results (Rekapitulasi Nilai 3 Juri per Registrasi)
CREATE TABLE IF NOT EXISTS public.fg_scoring_results (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    judge_1_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    judge_2_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    judge_3_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    total_judge_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    average_judge_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    total_penalty NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    final_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    tie_breaker_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    rank_number INT,
    is_locked BOOLEAN NOT NULL DEFAULT false,
    locked_by TEXT,
    locked_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_scoring_result_reg_stage UNIQUE (registration_id, stage_id)
);

-- 28. fg_tie_breaker_rules
CREATE TABLE IF NOT EXISTS public.fg_tie_breaker_rules (
    id TEXT PRIMARY KEY,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    priority_order INT NOT NULL DEFAULT 1,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('HIGHEST_MAIN_CRITERIA', 'LOWEST_PENALTY', 'CHIEF_JUDGE_SCORE', 'YOUNGER_AGE_PRIORITY')),
    criteria_id TEXT REFERENCES public.fg_scoring_criteria(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_tie_breaker_order UNIQUE (competition_id, priority_order)
);

-- 29. fg_scoring_revisions (Riwayat Koreksi Nilai dengan Persetujuan Ketua Dewan Juri)
CREATE TABLE IF NOT EXISTS public.fg_scoring_revisions (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES public.fg_scoring_submissions(id) ON DELETE CASCADE,
    old_score NUMERIC(8,2) NOT NULL,
    new_score NUMERIC(8,2) NOT NULL,
    reason TEXT NOT NULL,
    requested_by TEXT NOT NULL,
    approved_by TEXT,
    approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- E. CERDAS CERMAT (6 TABLES — RELASI PERTANDINGAN & TIM/REGU)
-- ============================================================================

-- 30. fg_quiz_rounds
CREATE TABLE IF NOT EXISTS public.fg_quiz_rounds (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    round_code TEXT NOT NULL, -- BABAK_WAJIB, BABAK_LEMPARAN, BABAK_REBUTAN
    round_name TEXT NOT NULL,
    correct_points NUMERIC(8,2) NOT NULL DEFAULT 100.00,
    wrong_penalty_points NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    thrown_correct_points NUMERIC(8,2) NOT NULL DEFAULT 50.00,
    sequence_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_quiz_round_code UNIQUE (competition_id, stage_id, round_code)
);

-- 31. fg_quiz_questions
CREATE TABLE IF NOT EXISTS public.fg_quiz_questions (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL REFERENCES public.fg_quiz_rounds(id) ON DELETE CASCADE,
    question_code TEXT NOT NULL,
    packet_code TEXT NOT NULL DEFAULT 'PAKET_A',
    category_topic TEXT NOT NULL, -- Al-Qur'an, Hadits, Fiqih Ibadah, Sejarah Islam, 6 Tabiat Luhur
    question_text TEXT NOT NULL,
    expected_answer TEXT NOT NULL,
    max_points NUMERIC(8,2) NOT NULL DEFAULT 100.00,
    time_limit_seconds INT NOT NULL DEFAULT 15,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 32. fg_quiz_matches (Pertandingan antar Regu/Tim A, B, C, D)
CREATE TABLE IF NOT EXISTS public.fg_quiz_matches (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    stage_id TEXT NOT NULL REFERENCES public.fg_event_stages(id) ON DELETE CASCADE,
    arena_id TEXT REFERENCES public.fg_arenas(id) ON DELETE SET NULL,
    match_code TEXT NOT NULL,
    match_name TEXT NOT NULL,
    team_a_id TEXT NOT NULL REFERENCES public.fg_teams(id) ON DELETE RESTRICT,
    team_b_id TEXT NOT NULL REFERENCES public.fg_teams(id) ON DELETE RESTRICT,
    team_c_id TEXT REFERENCES public.fg_teams(id) ON DELETE RESTRICT,
    team_d_id TEXT REFERENCES public.fg_teams(id) ON DELETE RESTRICT,
    winner_team_id TEXT REFERENCES public.fg_teams(id) ON DELETE SET NULL,
    operator_username TEXT,
    chief_judge_id TEXT REFERENCES public.fg_judges(id) ON DELETE SET NULL,
    match_status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (match_status IN ('SCHEDULED', 'LIVE', 'COMPLETED', 'VERIFIED')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_quiz_match_code UNIQUE (event_id, match_code)
);

-- 33. fg_quiz_responses (Jawaban Tim pada Pertandingan Cerdas Cermat)
CREATE TABLE IF NOT EXISTS public.fg_quiz_responses (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES public.fg_quiz_matches(id) ON DELETE CASCADE,
    round_id TEXT NOT NULL REFERENCES public.fg_quiz_rounds(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES public.fg_quiz_questions(id) ON DELETE RESTRICT,
    team_id TEXT NOT NULL REFERENCES public.fg_teams(id) ON DELETE CASCADE,
    response_mode TEXT NOT NULL DEFAULT 'DIRECT' CHECK (response_mode IN ('DIRECT', 'THROWN', 'BUZZER_REBUTAN')),
    is_correct BOOLEAN NOT NULL DEFAULT true,
    score_awarded NUMERIC(8,2) NOT NULL DEFAULT 100.00,
    judge_verified BOOLEAN NOT NULL DEFAULT true,
    recorded_by TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 34. fg_quiz_score_events (Event Perubahan Skor Real-Time Cerdas Cermat)
CREATE TABLE IF NOT EXISTS public.fg_quiz_score_events (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES public.fg_quiz_matches(id) ON DELETE CASCADE,
    round_id TEXT REFERENCES public.fg_quiz_rounds(id) ON DELETE SET NULL,
    team_id TEXT NOT NULL REFERENCES public.fg_teams(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('WAJIB_CORRECT', 'THROWN_CORRECT', 'REBUTAN_CORRECT', 'REBUTAN_WRONG', 'PENALTY', 'JUDGE_ADJUSTMENT')),
    points_delta NUMERIC(8,2) NOT NULL,
    running_total NUMERIC(8,2) NOT NULL,
    description TEXT,
    operator_username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 35. fg_quiz_leaderboards (Klasemen Akhir Pertandingan Tim Cerdas Cermat)
CREATE TABLE IF NOT EXISTS public.fg_quiz_leaderboards (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL REFERENCES public.fg_quiz_matches(id) ON DELETE CASCADE,
    team_id TEXT NOT NULL REFERENCES public.fg_teams(id) ON DELETE CASCADE,
    wajib_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    lemparan_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    rebutan_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    penalty_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    total_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    rank_in_match INT NOT NULL DEFAULT 1,
    is_advancing BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_quiz_lb_match_team UNIQUE (match_id, team_id)
);

-- ============================================================================
-- F. HASIL DAN ADMINISTRASI (8 TABLES)
-- ============================================================================

-- 36. fg_competition_results (Keputusan Pemenang Resmi per Cabang Lomba)
CREATE TABLE IF NOT EXISTS public.fg_competition_results (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_id TEXT NOT NULL REFERENCES public.fg_competitions(id) ON DELETE CASCADE,
    registration_id TEXT NOT NULL REFERENCES public.fg_registrations(id) ON DELETE CASCADE,
    contingent_id TEXT NOT NULL REFERENCES public.fg_contingents(id) ON DELETE CASCADE,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    final_score NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    final_rank INT NOT NULL CHECK (final_rank >= 1),
    predicate_label TEXT NOT NULL, -- Juara 1, Juara 2, Juara 3, Harapan 1, Harapan 2, Harapan 3, Finalis
    championship_points NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    is_published BOOLEAN NOT NULL DEFAULT false,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_comp_result_reg UNIQUE (competition_id, registration_id)
);

-- 37. fg_awards
CREATE TABLE IF NOT EXISTS public.fg_awards (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    competition_result_id TEXT NOT NULL REFERENCES public.fg_competition_results(id) ON DELETE CASCADE,
    award_title TEXT NOT NULL,
    medal_type TEXT NOT NULL CHECK (medal_type IN ('GOLD', 'SILVER', 'BRONZE', 'HONORABLE', 'SPECIAL')),
    trophy_code TEXT,
    certificate_eligible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 38. fg_championship_configs (Konfigurasi Perhitungan Juara Umum)
CREATE TABLE IF NOT EXISTS public.fg_championship_configs (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    scope_level TEXT NOT NULL DEFAULT 'KELOMPOK_DAN_DESA' CHECK (scope_level IN ('KELOMPOK', 'DESA', 'KELOMPOK_DAN_DESA')),
    gold_points NUMERIC(8,2) NOT NULL DEFAULT 5.00,
    silver_points NUMERIC(8,2) NOT NULL DEFAULT 3.00,
    bronze_points NUMERIC(8,2) NOT NULL DEFAULT 1.00,
    honorable_1_points NUMERIC(8,2) NOT NULL DEFAULT 0.50,
    team_competition_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    tie_break_policy TEXT NOT NULL DEFAULT 'MOST_GOLD_MEDALS',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_champ_cfg_event UNIQUE (event_id)
);

-- 39. fg_championship_points (Transaksi Poin Kejuaraan per Kontingen)
CREATE TABLE IF NOT EXISTS public.fg_championship_points (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    contingent_id TEXT NOT NULL REFERENCES public.fg_contingents(id) ON DELETE CASCADE,
    competition_result_id TEXT NOT NULL REFERENCES public.fg_competition_results(id) ON DELETE CASCADE,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    medal_type TEXT NOT NULL,
    points_earned NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_fg_champ_pts_result UNIQUE (competition_result_id)
);

-- 40. fg_championship_results (Klasemen Perolehan Medali & Juara Umum)
CREATE TABLE IF NOT EXISTS public.fg_championship_results (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    standing_level TEXT NOT NULL CHECK (standing_level IN ('KELOMPOK', 'DESA')),
    contingent_id TEXT REFERENCES public.fg_contingents(id) ON DELETE CASCADE,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT,
    gold_count INT NOT NULL DEFAULT 0,
    silver_count INT NOT NULL DEFAULT 0,
    bronze_count INT NOT NULL DEFAULT 0,
    honorable_count INT NOT NULL DEFAULT 0,
    total_points NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    standing_rank INT NOT NULL DEFAULT 1,
    is_overall_champion BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 41. fg_approvals (Berita Acara Pengesahan Ketua Dewan Juri & Ketua Panitia)
CREATE TABLE IF NOT EXISTS public.fg_approvals (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('COMPETITION_RESULT', 'CHAMPIONSHIP_STANDING', 'SCORE_REVISION', 'PUBLICATION')),
    target_id TEXT NOT NULL,
    approver_username TEXT NOT NULL,
    approver_role TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    approval_notes TEXT,
    digital_signature_hash TEXT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 42. fg_certificates
CREATE TABLE IF NOT EXISTS public.fg_certificates (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES public.fg_events(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    registration_id TEXT REFERENCES public.fg_registrations(id) ON DELETE SET NULL,
    competition_result_id TEXT REFERENCES public.fg_competition_results(id) ON DELETE SET NULL,
    recipient_name TEXT NOT NULL,
    recipient_role TEXT NOT NULL DEFAULT 'PESERTA' CHECK (recipient_role IN ('PESERTA', 'JUARA', 'JURI', 'PANITIA', 'PENDAMPING')),
    competition_name TEXT,
    predicate_label TEXT,
    region_name TEXT NOT NULL DEFAULT 'Daerah Magetan Timur',
    village_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    qr_verification_token TEXT NOT NULL UNIQUE,
    pdf_url TEXT,
    issued_by TEXT NOT NULL,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 43. fg_audit_logs (Audit Trail Keamanan 3-Lapis Festival Generus)
CREATE TABLE IF NOT EXISTS public.fg_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT,
    action_category TEXT NOT NULL CHECK (action_category IN (
        'DATA_CREATE',
        'DATA_UPDATE',
        'DATA_DELETE',
        'ACCESS_CHANGE',
        'SCORE_CHANGE',
        'RESULT_APPROVAL',
        'RESULT_PUBLISH'
    )),
    entity_table TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    actor_username TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    actor_scope TEXT,
    region_name TEXT,
    village_name TEXT,
    group_name TEXT,
    old_values JSONB,
    new_values JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Optional State Sync Mirror Table (mirrors monev_state_store pattern for hybrid low-latency sync)
CREATE TABLE IF NOT EXISTS public.fg_state_store (
    key TEXT PRIMARY KEY,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_by TEXT,
    updated_role TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- INDEXES FOR HIGH-PERFORMANCE LOOKUPS & RLS FILTERING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fg_contingents_org ON public.fg_contingents(event_id, village_name, group_name);
CREATE INDEX IF NOT EXISTS idx_fg_participants_org ON public.fg_participants(event_id, snapshot_village_name, snapshot_group_name);
CREATE INDEX IF NOT EXISTS idx_fg_participants_generus ON public.fg_participants(generus_id);
CREATE INDEX IF NOT EXISTS idx_fg_teams_org ON public.fg_teams(event_id, competition_id, village_name, group_name);
CREATE INDEX IF NOT EXISTS idx_fg_registrations_org ON public.fg_registrations(event_id, competition_id, village_name, group_name);
CREATE INDEX IF NOT EXISTS idx_fg_registrations_part ON public.fg_registrations(participant_id) WHERE participant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fg_registrations_team ON public.fg_registrations(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fg_judge_assign_lookup ON public.fg_judge_assignments(competition_id, stage_id, judge_id);
CREATE INDEX IF NOT EXISTS idx_fg_scoring_sub_lookup ON public.fg_scoring_submissions(competition_id, stage_id, registration_id);
CREATE INDEX IF NOT EXISTS idx_fg_scoring_res_lookup ON public.fg_scoring_results(competition_id, stage_id, final_score DESC);
CREATE INDEX IF NOT EXISTS idx_fg_quiz_matches_comp ON public.fg_quiz_matches(competition_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_fg_comp_results_org ON public.fg_competition_results(event_id, village_name, group_name);
CREATE INDEX IF NOT EXISTS idx_fg_audit_logs_cat ON public.fg_audit_logs(action_category, created_at DESC);

-- ============================================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fg_record_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_category TEXT;
    v_actor TEXT;
    v_role TEXT;
    v_entity_id TEXT;
BEGIN
    v_actor := COALESCE(NULLIF(auth.jwt() ->> 'username', ''), NULLIF(auth.jwt() ->> 'email', ''), 'system');
    v_role := public.fg_current_role();

    IF TG_TABLE_NAME IN ('fg_scoring_submissions', 'fg_scoring_details', 'fg_scoring_results', 'fg_scoring_revisions', 'fg_quiz_score_events') THEN
        v_category := 'SCORE_CHANGE';
    ELSIF TG_TABLE_NAME = 'fg_approvals' THEN
        v_category := 'RESULT_APPROVAL';
    ELSIF TG_OP = 'INSERT' THEN
        v_category := 'DATA_CREATE';
    ELSIF TG_OP = 'UPDATE' THEN
        v_category := 'DATA_UPDATE';
    ELSE
        v_category := 'DATA_DELETE';
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_entity_id := COALESCE(OLD.id::text, 'unknown');
        INSERT INTO public.fg_audit_logs (action_category, entity_table, entity_id, actor_username, actor_role, old_values)
        VALUES (v_category, TG_TABLE_NAME, v_entity_id, v_actor, v_role, to_jsonb(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        v_entity_id := COALESCE(NEW.id::text, 'unknown');
        INSERT INTO public.fg_audit_logs (action_category, entity_table, entity_id, actor_username, actor_role, old_values, new_values)
        VALUES (v_category, TG_TABLE_NAME, v_entity_id, v_actor, v_role, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSE
        v_entity_id := COALESCE(NEW.id::text, 'unknown');
        INSERT INTO public.fg_audit_logs (action_category, entity_table, entity_id, actor_username, actor_role, new_values)
        VALUES (v_category, TG_TABLE_NAME, v_entity_id, v_actor, v_role, to_jsonb(NEW));
        RETURN NEW;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_fg_registrations ON public.fg_registrations;
CREATE TRIGGER trg_audit_fg_registrations
AFTER INSERT OR UPDATE OR DELETE ON public.fg_registrations
FOR EACH ROW EXECUTE FUNCTION public.fg_record_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_fg_scoring_submissions ON public.fg_scoring_submissions;
CREATE TRIGGER trg_audit_fg_scoring_submissions
AFTER INSERT OR UPDATE OR DELETE ON public.fg_scoring_submissions
FOR EACH ROW EXECUTE FUNCTION public.fg_record_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_fg_scoring_revisions ON public.fg_scoring_revisions;
CREATE TRIGGER trg_audit_fg_scoring_revisions
AFTER INSERT OR UPDATE OR DELETE ON public.fg_scoring_revisions
FOR EACH ROW EXECUTE FUNCTION public.fg_record_audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_fg_approvals ON public.fg_approvals;
CREATE TRIGGER trg_audit_fg_approvals
AFTER INSERT OR UPDATE OR DELETE ON public.fg_approvals
FOR EACH ROW EXECUTE FUNCTION public.fg_record_audit_trigger();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL 36+ TABLES
-- ============================================================================

ALTER TABLE public.fg_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_event_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_competition_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_competition_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_arenas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_event_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fg_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_contingents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_participant_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_stage_advancements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fg_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_judge_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_judge_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_judge_reviews ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fg_scoring_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_scoring_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_scoring_penalties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_scoring_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_scoring_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_scoring_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_tie_breaker_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_scoring_revisions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fg_quiz_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_quiz_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_quiz_score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_quiz_leaderboards ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.fg_competition_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_championship_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_championship_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_championship_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fg_state_store ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (3-LAYER DEFENSE: ORG HIERARCHY + 15 ROLES)
-- ============================================================================

DO $$
BEGIN
    -- 1. Core Festival Master Catalogs: Readable by authenticated users, writable by Festival Admins / Superadmin / Admin Daerah
    DROP POLICY IF EXISTS "fg_core_read_all" ON public.fg_events;
    CREATE POLICY "fg_core_read_all" ON public.fg_events FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_core_manage_events" ON public.fg_events;
    CREATE POLICY "fg_core_manage_events" ON public.fg_events FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah')
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah');

    DROP POLICY IF EXISTS "fg_stages_read_all" ON public.fg_event_stages;
    CREATE POLICY "fg_stages_read_all" ON public.fg_event_stages FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_stages_manage" ON public.fg_event_stages;
    CREATE POLICY "fg_stages_manage" ON public.fg_event_stages FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah')
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah');

    DROP POLICY IF EXISTS "fg_categories_read_all" ON public.fg_competition_categories;
    CREATE POLICY "fg_categories_read_all" ON public.fg_competition_categories FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_categories_manage" ON public.fg_competition_categories;
    CREATE POLICY "fg_categories_manage" ON public.fg_competition_categories FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah')
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah');

    DROP POLICY IF EXISTS "fg_competitions_read_all" ON public.fg_competitions;
    CREATE POLICY "fg_competitions_read_all" ON public.fg_competitions FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_competitions_manage" ON public.fg_competitions;
    CREATE POLICY "fg_competitions_manage" ON public.fg_competitions FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah')
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah');

    DROP POLICY IF EXISTS "fg_rules_read_all" ON public.fg_competition_rules;
    CREATE POLICY "fg_rules_read_all" ON public.fg_competition_rules FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "fg_arenas_read_all" ON public.fg_arenas;
    CREATE POLICY "fg_arenas_read_all" ON public.fg_arenas FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_arenas_manage" ON public.fg_arenas;
    CREATE POLICY "fg_arenas_manage" ON public.fg_arenas FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Operator Arena'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Operator Arena'));

    -- 2. Scoped Organization Tables (Contingents, Participants, Registrations, Teams, Documents)
    -- Superadmin / Admin Daerah / Admin Festival / Admin Registrasi: Full regional access
    -- Admin Desa: ONLY their own village (desa) and groups underneath it
    -- Admin Kelompok / Pendamping: ONLY their own group (kelompok)
    DROP POLICY IF EXISTS "fg_contingents_scoped_select" ON public.fg_contingents;
    CREATE POLICY "fg_contingents_scoped_select" ON public.fg_contingents
    FOR SELECT TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() IN ('Admin Registrasi', 'Petugas Check-in', 'Viewer')
    );

    DROP POLICY IF EXISTS "fg_contingents_scoped_write" ON public.fg_contingents;
    CREATE POLICY "fg_contingents_scoped_write" ON public.fg_contingents
    FOR ALL TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    )
    WITH CHECK (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    );

    DROP POLICY IF EXISTS "fg_participants_scoped_select" ON public.fg_participants;
    CREATE POLICY "fg_participants_scoped_select" ON public.fg_participants
    FOR SELECT TO authenticated
    USING (
        public.fg_can_access_org(snapshot_region_name, snapshot_village_name, snapshot_group_name)
        OR public.fg_current_role() IN ('Admin Registrasi', 'Petugas Check-in', 'Operator Arena')
    );

    DROP POLICY IF EXISTS "fg_participants_scoped_write" ON public.fg_participants;
    CREATE POLICY "fg_participants_scoped_write" ON public.fg_participants
    FOR ALL TO authenticated
    USING (
        public.fg_can_access_org(snapshot_region_name, snapshot_village_name, snapshot_group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    )
    WITH CHECK (
        public.fg_can_access_org(snapshot_region_name, snapshot_village_name, snapshot_group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    );

    DROP POLICY IF EXISTS "fg_teams_scoped_select" ON public.fg_teams;
    CREATE POLICY "fg_teams_scoped_select" ON public.fg_teams
    FOR SELECT TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() IN ('Admin Registrasi', 'Petugas Check-in', 'Operator Arena', 'Operator Cerdas Cermat', 'Juri', 'Viewer')
    );

    DROP POLICY IF EXISTS "fg_teams_scoped_write" ON public.fg_teams;
    CREATE POLICY "fg_teams_scoped_write" ON public.fg_teams
    FOR ALL TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    )
    WITH CHECK (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    );

    DROP POLICY IF EXISTS "fg_registrations_scoped_select" ON public.fg_registrations;
    CREATE POLICY "fg_registrations_scoped_select" ON public.fg_registrations
    FOR SELECT TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() IN ('Admin Registrasi', 'Petugas Check-in', 'Operator Arena', 'Operator Cerdas Cermat')
        OR (
            public.fg_current_role() = 'Juri'
            AND EXISTS (
                SELECT 1 FROM public.fg_judge_assignments ja
                JOIN public.fg_judges j ON j.id = ja.judge_id
                WHERE ja.competition_id = fg_registrations.competition_id
                  AND j.username = COALESCE(auth.jwt() ->> 'username', '')
            )
        )
    );

    DROP POLICY IF EXISTS "fg_registrations_scoped_write" ON public.fg_registrations;
    CREATE POLICY "fg_registrations_scoped_write" ON public.fg_registrations
    FOR ALL TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    )
    WITH CHECK (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    );

    DROP POLICY IF EXISTS "fg_documents_scoped_select" ON public.fg_documents;
    CREATE POLICY "fg_documents_scoped_select" ON public.fg_documents
    FOR SELECT TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() = 'Admin Registrasi'
    );

    -- 3. Judges & Scoring Policies (Juri only accesses assigned competitions)
    DROP POLICY IF EXISTS "fg_judges_read" ON public.fg_judges;
    CREATE POLICY "fg_judges_read" ON public.fg_judges FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "fg_judge_assignments_read" ON public.fg_judge_assignments;
    CREATE POLICY "fg_judge_assignments_read" ON public.fg_judge_assignments FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "fg_scoring_submissions_policy" ON public.fg_scoring_submissions;
    CREATE POLICY "fg_scoring_submissions_policy" ON public.fg_scoring_submissions
    FOR ALL TO authenticated
    USING (
        public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri')
        OR (
            public.fg_current_role() = 'Juri'
            AND EXISTS (
                SELECT 1 FROM public.fg_judge_assignments ja
                JOIN public.fg_judges j ON j.id = ja.judge_id
                WHERE ja.competition_id = fg_scoring_submissions.competition_id
                  AND ja.judge_id = fg_scoring_submissions.judge_id
                  AND j.username = COALESCE(auth.jwt() ->> 'username', '')
            )
        )
    )
    WITH CHECK (
        public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri')
        OR (
            public.fg_current_role() = 'Juri'
            AND EXISTS (
                SELECT 1 FROM public.fg_judge_assignments ja
                JOIN public.fg_judges j ON j.id = ja.judge_id
                WHERE ja.competition_id = fg_scoring_submissions.competition_id
                  AND ja.judge_id = fg_scoring_submissions.judge_id
                  AND j.username = COALESCE(auth.jwt() ->> 'username', '')
            )
        )
    );

    -- 4. Cerdas Cermat Policies (Operator Cerdas Cermat + Dewan Juri + Festival Admin)
    DROP POLICY IF EXISTS "fg_quiz_matches_read" ON public.fg_quiz_matches;
    CREATE POLICY "fg_quiz_matches_read" ON public.fg_quiz_matches FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_quiz_matches_write" ON public.fg_quiz_matches;
    CREATE POLICY "fg_quiz_matches_write" ON public.fg_quiz_matches FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Operator Cerdas Cermat'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Operator Cerdas Cermat'));

    DROP POLICY IF EXISTS "fg_quiz_leaderboards_read" ON public.fg_quiz_leaderboards;
    CREATE POLICY "fg_quiz_leaderboards_read" ON public.fg_quiz_leaderboards FOR SELECT TO authenticated USING (true);

    -- 5. Results, Championship, Certificates & Audit Logs
    DROP POLICY IF EXISTS "fg_comp_results_read" ON public.fg_competition_results;
    CREATE POLICY "fg_comp_results_read" ON public.fg_competition_results
    FOR SELECT TO authenticated
    USING (
        is_published = true
        OR public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri')
        OR public.fg_can_access_org(region_name, village_name, group_name)
    );

    DROP POLICY IF EXISTS "fg_audit_logs_insert" ON public.fg_audit_logs;
    CREATE POLICY "fg_audit_logs_insert" ON public.fg_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

    DROP POLICY IF EXISTS "fg_audit_logs_select" ON public.fg_audit_logs;
    CREATE POLICY "fg_audit_logs_select" ON public.fg_audit_logs
    FOR SELECT TO authenticated
    USING (
        public.fg_is_global_festival_admin()
        OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri')
    );

    DROP POLICY IF EXISTS "fg_state_store_service_role" ON public.fg_state_store;
    CREATE POLICY "fg_state_store_service_role" ON public.fg_state_store
    FOR ALL TO service_role USING (true) WITH CHECK (true);

    -- Additional explicit RLS policies for remaining fg_* tables
    DROP POLICY IF EXISTS "fg_event_settings_read" ON public.fg_event_settings;
    CREATE POLICY "fg_event_settings_read" ON public.fg_event_settings FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_event_settings_write" ON public.fg_event_settings;
    CREATE POLICY "fg_event_settings_write" ON public.fg_event_settings FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah')
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() = 'Admin Daerah');

    DROP POLICY IF EXISTS "fg_team_members_access" ON public.fg_team_members;
    CREATE POLICY "fg_team_members_access" ON public.fg_team_members FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.fg_teams t
            WHERE t.id = fg_team_members.team_id
              AND (
                  public.fg_can_access_org(t.region_name, t.village_name, t.group_name)
                  OR public.fg_current_role() IN ('Admin Registrasi', 'Petugas Check-in', 'Operator Arena', 'Operator Cerdas Cermat', 'Juri', 'Viewer')
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.fg_teams t
            WHERE t.id = fg_team_members.team_id
              AND (public.fg_can_access_org(t.region_name, t.village_name, t.group_name) OR public.fg_current_role() = 'Admin Registrasi')
        )
    );

    DROP POLICY IF EXISTS "fg_participant_numbers_read" ON public.fg_participant_numbers;
    CREATE POLICY "fg_participant_numbers_read" ON public.fg_participant_numbers FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_participant_numbers_write" ON public.fg_participant_numbers;
    CREATE POLICY "fg_participant_numbers_write" ON public.fg_participant_numbers FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Admin Registrasi', 'Petugas Check-in', 'Operator Arena'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Admin Registrasi', 'Petugas Check-in', 'Operator Arena'));

    DROP POLICY IF EXISTS "fg_checkins_read" ON public.fg_checkins;
    CREATE POLICY "fg_checkins_read" ON public.fg_checkins FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_checkins_write" ON public.fg_checkins;
    CREATE POLICY "fg_checkins_write" ON public.fg_checkins FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Petugas Check-in', 'Operator Arena', 'Admin Registrasi'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Petugas Check-in', 'Operator Arena', 'Admin Registrasi'));

    DROP POLICY IF EXISTS "fg_stage_advancements_read" ON public.fg_stage_advancements;
    CREATE POLICY "fg_stage_advancements_read" ON public.fg_stage_advancements FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_stage_advancements_write" ON public.fg_stage_advancements;
    CREATE POLICY "fg_stage_advancements_write" ON public.fg_stage_advancements FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri'));

    DROP POLICY IF EXISTS "fg_judge_sessions_access" ON public.fg_judge_sessions;
    CREATE POLICY "fg_judge_sessions_access" ON public.fg_judge_sessions FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'));

    DROP POLICY IF EXISTS "fg_judge_reviews_access" ON public.fg_judge_reviews;
    CREATE POLICY "fg_judge_reviews_access" ON public.fg_judge_reviews FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'));

    DROP POLICY IF EXISTS "fg_scoring_templates_read" ON public.fg_scoring_templates;
    CREATE POLICY "fg_scoring_templates_read" ON public.fg_scoring_templates FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_scoring_versions_read" ON public.fg_scoring_versions;
    CREATE POLICY "fg_scoring_versions_read" ON public.fg_scoring_versions FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_scoring_criteria_read" ON public.fg_scoring_criteria;
    CREATE POLICY "fg_scoring_criteria_read" ON public.fg_scoring_criteria FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_scoring_penalties_read" ON public.fg_scoring_penalties;
    CREATE POLICY "fg_scoring_penalties_read" ON public.fg_scoring_penalties FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_tie_breaker_rules_read" ON public.fg_tie_breaker_rules;
    CREATE POLICY "fg_tie_breaker_rules_read" ON public.fg_tie_breaker_rules FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "fg_scoring_details_access" ON public.fg_scoring_details;
    CREATE POLICY "fg_scoring_details_access" ON public.fg_scoring_details FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'));

    DROP POLICY IF EXISTS "fg_scoring_results_read" ON public.fg_scoring_results;
    CREATE POLICY "fg_scoring_results_read" ON public.fg_scoring_results FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_scoring_results_write" ON public.fg_scoring_results;
    CREATE POLICY "fg_scoring_results_write" ON public.fg_scoring_results FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'));

    DROP POLICY IF EXISTS "fg_scoring_revisions_access" ON public.fg_scoring_revisions;
    CREATE POLICY "fg_scoring_revisions_access" ON public.fg_scoring_revisions FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri'));

    DROP POLICY IF EXISTS "fg_quiz_rounds_read" ON public.fg_quiz_rounds;
    CREATE POLICY "fg_quiz_rounds_read" ON public.fg_quiz_rounds FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_quiz_questions_access" ON public.fg_quiz_questions;
    CREATE POLICY "fg_quiz_questions_access" ON public.fg_quiz_questions FOR SELECT TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri', 'Operator Cerdas Cermat'));

    DROP POLICY IF EXISTS "fg_quiz_responses_access" ON public.fg_quiz_responses;
    CREATE POLICY "fg_quiz_responses_access" ON public.fg_quiz_responses FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri', 'Operator Cerdas Cermat'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri', 'Operator Cerdas Cermat'));

    DROP POLICY IF EXISTS "fg_quiz_score_events_access" ON public.fg_quiz_score_events;
    CREATE POLICY "fg_quiz_score_events_access" ON public.fg_quiz_score_events FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri', 'Operator Cerdas Cermat'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri', 'Juri', 'Operator Cerdas Cermat'));

    DROP POLICY IF EXISTS "fg_awards_read" ON public.fg_awards;
    CREATE POLICY "fg_awards_read" ON public.fg_awards FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_championship_configs_read" ON public.fg_championship_configs;
    CREATE POLICY "fg_championship_configs_read" ON public.fg_championship_configs FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_championship_points_read" ON public.fg_championship_points;
    CREATE POLICY "fg_championship_points_read" ON public.fg_championship_points FOR SELECT TO authenticated USING (true);
    DROP POLICY IF EXISTS "fg_championship_results_read" ON public.fg_championship_results;
    CREATE POLICY "fg_championship_results_read" ON public.fg_championship_results FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS "fg_approvals_access" ON public.fg_approvals;
    CREATE POLICY "fg_approvals_access" ON public.fg_approvals FOR ALL TO authenticated
    USING (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri'))
    WITH CHECK (public.fg_is_global_festival_admin() OR public.fg_current_role() IN ('Admin Daerah', 'Ketua Dewan Juri'));

    DROP POLICY IF EXISTS "fg_certificates_scoped_read" ON public.fg_certificates;
    CREATE POLICY "fg_certificates_scoped_read" ON public.fg_certificates FOR SELECT TO authenticated
    USING (
        public.fg_can_access_org(region_name, village_name, group_name)
        OR public.fg_current_role() IN ('Admin Registrasi', 'Viewer')
    );
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

COMMIT;
