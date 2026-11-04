-- ============================================================================
-- ROLLBACK PLAN: docs/festival_generus_rollback.sql
-- MODULE       : FESTIVAL GENERUS — PART 1
-- PURPOSE      : Safely revert all fg_* tables, triggers, functions, and types
--                without touching any existing SIM TPQ / Monev PPG tables.
-- ============================================================================

BEGIN;

-- 1. Drop Audit Triggers on fg_* tables
DROP TRIGGER IF EXISTS trg_audit_fg_registrations ON public.fg_registrations;
DROP TRIGGER IF EXISTS trg_audit_fg_scoring_submissions ON public.fg_scoring_submissions;
DROP TRIGGER IF EXISTS trg_audit_fg_scoring_revisions ON public.fg_scoring_revisions;
DROP TRIGGER IF EXISTS trg_audit_fg_approvals ON public.fg_approvals;

-- 2. Drop fg_* tables in reverse dependency order
DROP TABLE IF EXISTS public.fg_state_store CASCADE;
DROP TABLE IF EXISTS public.fg_audit_logs CASCADE;
DROP TABLE IF EXISTS public.fg_certificates CASCADE;
DROP TABLE IF EXISTS public.fg_approvals CASCADE;
DROP TABLE IF EXISTS public.fg_championship_results CASCADE;
DROP TABLE IF EXISTS public.fg_championship_points CASCADE;
DROP TABLE IF EXISTS public.fg_championship_configs CASCADE;
DROP TABLE IF EXISTS public.fg_awards CASCADE;
DROP TABLE IF EXISTS public.fg_competition_results CASCADE;

DROP TABLE IF EXISTS public.fg_quiz_leaderboards CASCADE;
DROP TABLE IF EXISTS public.fg_quiz_score_events CASCADE;
DROP TABLE IF EXISTS public.fg_quiz_responses CASCADE;
DROP TABLE IF EXISTS public.fg_quiz_matches CASCADE;
DROP TABLE IF EXISTS public.fg_quiz_questions CASCADE;
DROP TABLE IF EXISTS public.fg_quiz_rounds CASCADE;

DROP TABLE IF EXISTS public.fg_scoring_revisions CASCADE;
DROP TABLE IF EXISTS public.fg_tie_breaker_rules CASCADE;
DROP TABLE IF EXISTS public.fg_scoring_results CASCADE;
DROP TABLE IF EXISTS public.fg_scoring_details CASCADE;
DROP TABLE IF EXISTS public.fg_scoring_submissions CASCADE;
DROP TABLE IF EXISTS public.fg_scoring_penalties CASCADE;
DROP TABLE IF EXISTS public.fg_scoring_criteria CASCADE;
DROP TABLE IF EXISTS public.fg_scoring_versions CASCADE;
DROP TABLE IF EXISTS public.fg_scoring_templates CASCADE;

DROP TABLE IF EXISTS public.fg_judge_reviews CASCADE;
DROP TABLE IF EXISTS public.fg_judge_sessions CASCADE;
DROP TABLE IF EXISTS public.fg_judge_assignments CASCADE;
DROP TABLE IF EXISTS public.fg_judges CASCADE;

DROP TABLE IF EXISTS public.fg_stage_advancements CASCADE;
DROP TABLE IF EXISTS public.fg_checkins CASCADE;
DROP TABLE IF EXISTS public.fg_participant_numbers CASCADE;
DROP TABLE IF EXISTS public.fg_documents CASCADE;
DROP TABLE IF EXISTS public.fg_registrations CASCADE;
DROP TABLE IF EXISTS public.fg_team_members CASCADE;
DROP TABLE IF EXISTS public.fg_teams CASCADE;
DROP TABLE IF EXISTS public.fg_participants CASCADE;
DROP TABLE IF EXISTS public.fg_contingents CASCADE;

DROP TABLE IF EXISTS public.fg_event_settings CASCADE;
DROP TABLE IF EXISTS public.fg_competition_rules CASCADE;
DROP TABLE IF EXISTS public.fg_competitions CASCADE;
DROP TABLE IF EXISTS public.fg_arenas CASCADE;
DROP TABLE IF EXISTS public.fg_competition_categories CASCADE;
DROP TABLE IF EXISTS public.fg_event_stages CASCADE;
DROP TABLE IF EXISTS public.fg_events CASCADE;

-- 3. Drop helper functions
DROP FUNCTION IF EXISTS public.fg_record_audit_trigger() CASCADE;
DROP FUNCTION IF EXISTS public.fg_can_access_org(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.fg_is_global_festival_admin() CASCADE;
DROP FUNCTION IF EXISTS public.fg_current_group() CASCADE;
DROP FUNCTION IF EXISTS public.fg_current_village() CASCADE;
DROP FUNCTION IF EXISTS public.fg_current_region() CASCADE;
DROP FUNCTION IF EXISTS public.fg_current_role() CASCADE;

-- 4. Drop custom enum types
DROP TYPE IF EXISTS public.fg_registration_status CASCADE;
DROP TYPE IF EXISTS public.fg_competition_type CASCADE;
DROP TYPE IF EXISTS public.fg_event_status CASCADE;
DROP TYPE IF EXISTS public.fg_role_type CASCADE;

COMMIT;
