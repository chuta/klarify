-- ============================================================================
-- 005_arip_relax_constraints.sql
--
-- Relax the CHECK constraints on `arip_applications` so the ARIP tracker can
-- be opened by a founder before they have a confirmed licence type, and so
-- the 5-stage model (ARIP Framework, SEC Nigeria, June 2024) can be saved.
--
-- Background:
--   001_init.sql encoded the OLD 7-stage ARIP model and required licence_type
--   to be one of the four formal categories. In practice:
--     * a founder lands on the tracker at Stage 1 ("Initial Assessment")
--       BEFORE they have classified their product — they need 'unknown' as
--       a valid placeholder.
--     * the UI uses the 5-stage model: initial_assessment,
--       eligibility_notification, formal_application, aip_active,
--       transition_to_registration. The old constraint only accepted
--       initial_assessment by coincidence.
--
-- This migration:
--   1. Drops both CHECKs.
--   2. Re-adds them with the full union of values needed by the current UI.
--      Old values are retained so any historical rows remain valid.
-- ============================================================================

ALTER TABLE public.arip_applications
  DROP CONSTRAINT IF EXISTS arip_applications_licence_type_check;

ALTER TABLE public.arip_applications
  ADD CONSTRAINT arip_applications_licence_type_check
  CHECK (licence_type IN ('DAX', 'DAOP', 'DAC', 'DAI', 'unknown'));

ALTER TABLE public.arip_applications
  DROP CONSTRAINT IF EXISTS arip_applications_current_stage_check;

ALTER TABLE public.arip_applications
  ADD CONSTRAINT arip_applications_current_stage_check
  CHECK (current_stage IN (
    -- 5-stage model (current — ARIP Framework, SEC Nigeria, June 2024)
    'initial_assessment',
    'eligibility_notification',
    'formal_application',
    'aip_active',
    'transition_to_registration',
    -- Legacy 7-stage values retained for backward compatibility
    'pre_screening',
    'eligibility',
    'formal_app',
    'aip',
    'aip_operations',
    'full_registration'
  ));
