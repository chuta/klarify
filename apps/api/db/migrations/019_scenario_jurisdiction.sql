-- Sprint 6 — Scenario Simulator (US-005) + Jurisdiction Expansion (US-004)
-- Persisted AI analysis results with org-scoped RLS.

-- ---------------------------------------------------------------------------
-- scenario_analyses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scenario_analyses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scenario_text TEXT NOT NULL,
  template_id   TEXT,
  parent_id     UUID REFERENCES public.scenario_analyses(id) ON DELETE SET NULL,
  result        JSONB NOT NULL,
  model_used    TEXT,
  tokens_used   INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scenario_analyses_org_time
  ON public.scenario_analyses(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scenario_analyses_user
  ON public.scenario_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_scenario_analyses_parent
  ON public.scenario_analyses(parent_id)
  WHERE parent_id IS NOT NULL;

ALTER TABLE public.scenario_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_analyses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS scenario_analyses_org_read ON public.scenario_analyses;
CREATE POLICY scenario_analyses_org_read ON public.scenario_analyses
  FOR SELECT USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS scenario_analyses_org_write ON public.scenario_analyses;
CREATE POLICY scenario_analyses_org_write ON public.scenario_analyses
  FOR INSERT WITH CHECK (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- jurisdiction_gap_analyses
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.jurisdiction_gap_analyses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_jurisdiction  TEXT NOT NULL,
  target_jurisdictions TEXT[] NOT NULL,
  result               JSONB NOT NULL,
  model_used           TEXT,
  tokens_used          INT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jurisdiction_gap_analyses_org_time
  ON public.jurisdiction_gap_analyses(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jurisdiction_gap_analyses_user
  ON public.jurisdiction_gap_analyses(user_id);

ALTER TABLE public.jurisdiction_gap_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdiction_gap_analyses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS jurisdiction_gap_analyses_org_read ON public.jurisdiction_gap_analyses;
CREATE POLICY jurisdiction_gap_analyses_org_read ON public.jurisdiction_gap_analyses
  FOR SELECT USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS jurisdiction_gap_analyses_org_write ON public.jurisdiction_gap_analyses;
CREATE POLICY jurisdiction_gap_analyses_org_write ON public.jurisdiction_gap_analyses
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
