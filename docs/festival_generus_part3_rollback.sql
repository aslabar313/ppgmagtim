-- ============================================================================
-- ROLLBACK SCRIPT: festival_generus_part3_rollback.sql
-- Non-destructive rollback for Part 3 triggers and indexes
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_fg_guard_certificate_requires_approval ON public.fg_certificates;
DROP FUNCTION IF EXISTS public.fn_fg_guard_certificate_requires_approval();

DROP TRIGGER IF EXISTS trg_fg_lock_approved_scoring_submissions ON public.fg_scoring_submissions;
DROP FUNCTION IF EXISTS public.fn_fg_guard_approved_competition_results();

DROP TRIGGER IF EXISTS trg_fg_prevent_duplicate_qr_checkin ON public.fg_checkins;
DROP FUNCTION IF EXISTS public.fn_fg_prevent_duplicate_qr_checkin();

DROP INDEX IF EXISTS public.uq_fg_checkins_single_registration;
DROP INDEX IF EXISTS public.uq_fg_competition_results_comp_reg;
DROP INDEX IF EXISTS public.uq_fg_championship_points_comp_reg;
DROP INDEX IF EXISTS public.idx_fg_participants_event_org;
DROP INDEX IF EXISTS public.idx_fg_registrations_comp_status_org;
DROP INDEX IF EXISTS public.idx_fg_scoring_submissions_reg_stage_pos;
DROP INDEX IF EXISTS public.idx_fg_scoring_results_comp_stage_rank;
DROP INDEX IF EXISTS public.idx_fg_arena_queues_arena_call_status;
DROP INDEX IF EXISTS public.idx_fg_audit_logs_event_created;

COMMIT;
