-- ============================================================================
-- ROLLBACK PLAN: docs/festival_generus_part2_rollback.sql
-- MODULE       : FESTIVAL GENERUS — PART 2 (CORE COMPETITION ENGINE)
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_audit_fg_artworks ON public.fg_artworks;
DROP TRIGGER IF EXISTS trg_audit_fg_arena_queues ON public.fg_arena_queues;

DROP TABLE IF EXISTS public.fg_arena_queues CASCADE;
DROP TABLE IF EXISTS public.fg_artworks CASCADE;

COMMIT;
