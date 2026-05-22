-- ============================================================================
-- 012_arip_tracker.sql  — Sprint 5-B1: ARIP Tracker Backend
--
-- Extends arip_applications with full AIP operational columns.
-- Adds arip_growth_log (per-event growth ledger) and arip_stage_history.
-- Regulatory source: ARIP Framework, SEC Nigeria, June 2024.
--
-- AIP restrictions (Section 29, ARIP Framework):
--   - Max 50 customers during AIP period
--   - Max NGN 2,000,000 per single customer transaction
--   - Max NGN 5,000,000 AUM per customer
--   - Prohibition on promotional activities (Section 29b)
--   - Must stay within approved operational plan (Section 29a)
--
-- Stage model (spec stages):
--   pre_screening → initial_assessment → eligibility → aip → full_registration
-- ============================================================================

-- ── 1. Add operational columns to arip_applications ───────────────────────────

ALTER TABLE public.arip_applications
  ADD COLUMN IF NOT EXISTS stage_entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS aip_extension_count INT NOT NULL DEFAULT 0,

  -- AIP period customer and AUM tracking (Section 29, ARIP Framework)
  ADD COLUMN IF NOT EXISTS aip_total_customers INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aip_total_aum_ngn BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS aip_max_customers INT NOT NULL DEFAULT 50,
  -- Amounts stored in kobo (NGN × 100) to avoid floating-point issues
  ADD COLUMN IF NOT EXISTS aip_max_single_txn_ngn BIGINT NOT NULL DEFAULT 200000000,   -- NGN 2,000,000
  ADD COLUMN IF NOT EXISTS aip_max_customer_aum_ngn BIGINT NOT NULL DEFAULT 500000000, -- NGN 5,000,000

  -- Compliance blockers
  ADD COLUMN IF NOT EXISTS solicitor_engaged BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS solicitor_name TEXT,
  ADD COLUMN IF NOT EXISTS solicitor_firm TEXT,
  ADD COLUMN IF NOT EXISTS solicitor_engaged_date DATE,

  ADD COLUMN IF NOT EXISTS fidelity_bond_in_place BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fidelity_bond_amount_ngn BIGINT,
  ADD COLUMN IF NOT EXISTS fidelity_bond_expiry DATE,

  -- Application fee tracking (REVOP)
  ADD COLUMN IF NOT EXISTS application_fee_paid BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS application_fee_amount_ngn INT,
  ADD COLUMN IF NOT EXISTS application_fee_paid_date DATE,

  -- SEC reference number assigned on formal application
  ADD COLUMN IF NOT EXISTS sec_reference_number TEXT;

-- ── 2. Extend stage CHECK to include spec stages ───────────────────────────────

ALTER TABLE public.arip_applications
  DROP CONSTRAINT IF EXISTS arip_applications_current_stage_check;

ALTER TABLE public.arip_applications
  ADD CONSTRAINT arip_applications_current_stage_check
  CHECK (current_stage IN (
    -- S5-B1 spec stages (primary)
    'pre_screening',
    'initial_assessment',
    'eligibility',
    'aip',
    'full_registration',
    -- 5-stage UI model from 005_arip_relax_constraints (keep for backward compat)
    'eligibility_notification',
    'formal_application',
    'aip_active',
    'transition_to_registration',
    -- Old 7-stage values retained for historical rows
    'formal_app',
    'aip_operations'
  ));

-- ── 3. arip_growth_log — append-only growth event ledger ──────────────────────

CREATE TABLE IF NOT EXISTS public.arip_growth_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arip_id       UUID NOT NULL REFERENCES public.arip_applications(id) ON DELETE CASCADE,
  org_id        UUID NOT NULL,
  event_type    TEXT NOT NULL CHECK (event_type IN (
    'customer_onboarded',
    'aum_update',
    'restriction_breach',
    'extension_granted'
  )),
  delta_customers INT NOT NULL DEFAULT 0,
  delta_aum_ngn   BIGINT NOT NULL DEFAULT 0,
  description     TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS arip_growth_log_arip_id_idx ON public.arip_growth_log(arip_id);
CREATE INDEX IF NOT EXISTS arip_growth_log_org_id_idx  ON public.arip_growth_log(org_id);

-- ── 4. arip_stage_history — immutable audit trail of stage transitions ─────────

CREATE TABLE IF NOT EXISTS public.arip_stage_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arip_id        UUID NOT NULL REFERENCES public.arip_applications(id) ON DELETE CASCADE,
  from_stage     TEXT,
  to_stage       TEXT NOT NULL,
  notes          TEXT,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS arip_stage_history_arip_id_idx ON public.arip_stage_history(arip_id);

-- ── 5. RLS policies for new tables ────────────────────────────────────────────

ALTER TABLE public.arip_growth_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arip_stage_history ENABLE ROW LEVEL SECURITY;

-- Growth log: visible only to members of the owning org.
CREATE POLICY IF NOT EXISTS arip_growth_log_org_isolation
  ON public.arip_growth_log
  USING (org_id::text = current_setting('app.current_org_id', true));

-- Stage history: scoped via the parent ARIP application's org.
CREATE POLICY IF NOT EXISTS arip_stage_history_org_isolation
  ON public.arip_stage_history
  USING (
    arip_id IN (
      SELECT id FROM public.arip_applications
      WHERE org_id::text = current_setting('app.current_org_id', true)
    )
  );
