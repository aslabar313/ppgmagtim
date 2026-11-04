-- ============================================================================
-- MIGRATION: 20261106_festival_generus_part3_finalization.sql
-- PROJECT  : PPG MAGETAN TIMUR CENTER — MODUL FESTIVAL GENERUS (PART 3)
-- SCOPE    : QR Check-in Anti-Duplication, Result Approval Lock, Anti-Double
--            Championship Points, Certificate Approval Guard & Load Indexes
-- SAFETY   : Non-destructive, idempotent (CREATE/ALTER IF NOT EXISTS)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. QR CHECK-IN ANTI-DUPLICATION CONSTRAINT & TRIGGER (SECTION 9 RULE #9)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_fg_checkins_single_registration
  ON public.fg_checkins (registration_id)
  WHERE checkin_status = 'PRESENT';

CREATE OR REPLACE FUNCTION public.fn_fg_prevent_duplicate_qr_checkin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.fg_checkins c
    WHERE c.registration_id = NEW.registration_id
      AND c.checkin_status = 'PRESENT'
      AND c.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'QR CHECK-IN DITOLAK: QR Code untuk registrasi % sudah digunakan check-in sebelumnya.', NEW.registration_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fg_prevent_duplicate_qr_checkin ON public.fg_checkins;
CREATE TRIGGER trg_fg_prevent_duplicate_qr_checkin
BEFORE INSERT OR UPDATE ON public.fg_checkins
FOR EACH ROW
EXECUTE FUNCTION public.fn_fg_prevent_duplicate_qr_checkin();

-- ============================================================================
-- 2. ANTI-DOUBLE CHAMPIONSHIP POINTS & RESULT DEDUPLICATION (SECTION 8)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_fg_competition_results_comp_reg
  ON public.fg_competition_results (competition_id, registration_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fg_championship_points_comp_reg
  ON public.fg_championship_points (competition_id, registration_id);

-- ============================================================================
-- 3. LOCK APPROVED COMPETITION RESULTS AGAINST ARBITRARY CHANGES (SECTION 9 #8)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_fg_guard_approved_competition_results()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_comp_id uuid;
BEGIN
  v_comp_id := COALESCE(NEW.competition_id, OLD.competition_id);
  IF EXISTS (
    SELECT 1
    FROM public.fg_approvals a
    WHERE a.competition_id = v_comp_id
      AND a.approval_status = 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'HASIL SUDAH DISAHKAN: Kategori lomba % telah disahkan secara resmi dan tidak dapat diubah sembarangan.', v_comp_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fg_lock_approved_scoring_submissions ON public.fg_scoring_submissions;
CREATE TRIGGER trg_fg_lock_approved_scoring_submissions
BEFORE INSERT OR UPDATE OR DELETE ON public.fg_scoring_submissions
FOR EACH ROW
EXECUTE FUNCTION public.fn_fg_guard_approved_competition_results();

-- ============================================================================
-- 4. CERTIFICATE ISSUANCE REQUIRES OFFICIAL APPROVAL (SECTION 9 RULE #10)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_fg_guard_certificate_requires_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.fg_approvals a
    WHERE a.competition_id = NEW.competition_id
      AND a.approval_status = 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'PENERBITAN SERTIFIKAT DITOLAK: Hasil kategori % belum disahkan secara resmi (fg_approvals).', NEW.competition_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fg_guard_certificate_requires_approval ON public.fg_certificates;
CREATE TRIGGER trg_fg_guard_certificate_requires_approval
BEFORE INSERT ON public.fg_certificates
FOR EACH ROW
EXECUTE FUNCTION public.fn_fg_guard_certificate_requires_approval();

-- ============================================================================
-- 5. PERFORMANCE & LOAD TESTING INDEXES (500 PARTICIPANTS, 17 CATS, 12 ARENAS)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_fg_participants_event_org
  ON public.fg_participants (event_id, snapshot_region_name, snapshot_village_name, snapshot_group_name);

CREATE INDEX IF NOT EXISTS idx_fg_registrations_comp_status_org
  ON public.fg_registrations (competition_id, status, village_name, group_name);

CREATE INDEX IF NOT EXISTS idx_fg_scoring_submissions_reg_stage_pos
  ON public.fg_scoring_submissions (registration_id, stage_id, judge_position, submission_status);

CREATE INDEX IF NOT EXISTS idx_fg_scoring_results_comp_stage_rank
  ON public.fg_scoring_results (competition_id, stage_id, rank_number, final_score DESC);

CREATE INDEX IF NOT EXISTS idx_fg_arena_queues_arena_call_status
  ON public.fg_arena_queues (arena_id, call_status, queue_number);

CREATE INDEX IF NOT EXISTS idx_fg_audit_logs_event_created
  ON public.fg_audit_logs (event_id, created_at DESC);

COMMIT;
