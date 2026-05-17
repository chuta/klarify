-- =============================================================================
-- Klarify — 001_init.sql
-- Initial schema. Mirrors CLAUDE.md Section 5 verbatim, plus:
--   - `regulators` reference table for Section 13 seed data (read by GET /api/regulators)
--   - `regulatory_corpus` for pgvector RAG embeddings (Section 11)
-- Run order: 001_init.sql → 002_rls.sql → 003_seed_regulators.sql
-- =============================================================================

-- ---- Extensions ------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector for RAG (Section 11)

-- ---- updated_at trigger function -------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS & ORGANISATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  avatar      TEXT,
  plan        TEXT NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free','navigator','compass','flagship')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

CREATE TABLE IF NOT EXISTS public.organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  plan        TEXT NOT NULL DEFAULT 'free'
              CHECK (plan IN ('free','navigator','compass','flagship')),
  seats_used  INT  NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orgs_owner ON public.organisations(owner_id);

CREATE TABLE IF NOT EXISTS public.org_members (
  org_id   UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL DEFAULT 'member'
           CHECK (role IN ('owner','admin','member','viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (org_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.org_members(user_id);

-- ============================================================================
-- USER PROFILE (onboarding state)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id                  UUID PRIMARY KEY
                           REFERENCES public.users(id) ON DELETE CASCADE,
  product_types            TEXT[] NOT NULL DEFAULT '{}',  -- DAX, DAOP, DAC, DAI, payment, hybrid
  target_markets           TEXT[] NOT NULL DEFAULT '{}',  -- NG, GH, KE, ZA, MU
  stage                    TEXT
                           CHECK (stage IN ('idea','building','launched','arip','licensed')),
  team_size                INT,
  has_compliance_officer   BOOLEAN NOT NULL DEFAULT FALSE,
  existing_infrastructure  TEXT[] NOT NULL DEFAULT '{}',
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- READINESS SCORES (heart of ComplianceOS — Section 8 weights enforced in code)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.readiness_scores (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                     UUID NOT NULL
                             REFERENCES public.organisations(id) ON DELETE CASCADE,
  total_score                INT NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  corporate_structure        INT NOT NULL CHECK (corporate_structure BETWEEN 0 AND 100),
  capital_licensing          INT NOT NULL CHECK (capital_licensing BETWEEN 0 AND 100),
  kyc_infrastructure         INT NOT NULL CHECK (kyc_infrastructure BETWEEN 0 AND 100),
  aml_cft_programme          INT NOT NULL CHECK (aml_cft_programme BETWEEN 0 AND 100),
  transaction_monitoring     INT NOT NULL CHECK (transaction_monitoring BETWEEN 0 AND 100),
  regulatory_reporting       INT NOT NULL CHECK (regulatory_reporting BETWEEN 0 AND 100),
  regulatory_relationships   INT NOT NULL CHECK (regulatory_relationships BETWEEN 0 AND 100),
  product_classification     INT NOT NULL CHECK (product_classification BETWEEN 0 AND 100),
  calculated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot                   JSONB NOT NULL DEFAULT '{}'::JSONB
);
CREATE INDEX IF NOT EXISTS idx_readiness_org_time
  ON public.readiness_scores(org_id, calculated_at DESC);

-- ============================================================================
-- ROADMAP
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.roadmap_tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  phase              INT  NOT NULL CHECK (phase BETWEEN 1 AND 4),
  title              TEXT NOT NULL,
  description        TEXT,
  regulatory_basis   TEXT,
  status             TEXT NOT NULL DEFAULT 'not_started'
                     CHECK (status IN ('not_started','in_progress','complete','blocked')),
  owner_user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  due_date           DATE,
  template_id        TEXT,
  is_locked          BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_roadmap_org_phase ON public.roadmap_tasks(org_id, phase);
CREATE INDEX IF NOT EXISTS idx_roadmap_owner ON public.roadmap_tasks(owner_user_id);
CREATE TRIGGER trg_roadmap_tasks_updated_at
  BEFORE UPDATE ON public.roadmap_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- DOCUMENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.generated_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  template_type  TEXT NOT NULL CHECK (template_type IN (
                   'BWRA','AML_POLICY','KYC_TIERS','TOKEN_MEMO','ARIP_WHITEPAPER',
                   'STR_TEMPLATE','PEP_REGISTER','CO_APPOINTMENT','REG_BRIEF')),
  title          TEXT NOT NULL,
  content        JSONB NOT NULL DEFAULT '{}'::JSONB,
  version        INT  NOT NULL DEFAULT 1,
  s3_key         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gen_docs_org ON public.generated_documents(org_id);
CREATE TRIGGER trg_generated_documents_updated_at
  BEFORE UPDATE ON public.generated_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.uploaded_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  filename         TEXT NOT NULL,
  file_type        TEXT,
  s3_key           TEXT NOT NULL,
  analysis_result  JSONB,
  urgency_level    TEXT CHECK (urgency_level IN ('critical','high','medium','low')),
  action_items     JSONB,
  uploaded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  analysed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_uploaded_docs_org ON public.uploaded_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_docs_urgency
  ON public.uploaded_documents(org_id, urgency_level)
  WHERE urgency_level IN ('critical','high');

-- ============================================================================
-- AI CONVERSATIONS (FounderCounsel)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(org_id);
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content          TEXT NOT NULL,
  citations        JSONB NOT NULL DEFAULT '[]'::JSONB,
  model_used       TEXT,
  tokens_used      INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_convo ON public.messages(conversation_id, created_at);

-- ============================================================================
-- REGULATORS — reference data (Section 13) + per-org CRM
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.regulators (
  code               TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  mandate            TEXT NOT NULL,
  website            TEXT,
  portal             TEXT,
  email              TEXT,
  phone              TEXT,
  address            TEXT,
  jurisdiction_tags  TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.regulator_contacts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  regulator_code  TEXT NOT NULL REFERENCES public.regulators(code) ON DELETE RESTRICT,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_contacts_org ON public.regulator_contacts(org_id);
CREATE TRIGGER trg_regulator_contacts_updated_at
  BEFORE UPDATE ON public.regulator_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.regulator_interactions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id               UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  regulator_code       TEXT NOT NULL REFERENCES public.regulators(code) ON DELETE RESTRICT,
  interaction_type     TEXT NOT NULL CHECK (interaction_type IN
                          ('call','email','meeting','submission','letter')),
  subject              TEXT NOT NULL,
  outcome              TEXT,
  follow_up_required   BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_date       DATE,
  occurred_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reg_interactions_org_time
  ON public.regulator_interactions(org_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_reg_interactions_followup
  ON public.regulator_interactions(org_id, follow_up_date)
  WHERE follow_up_required = TRUE;

-- ============================================================================
-- ARIP TRACKER (Section 5)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.arip_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL UNIQUE
                    REFERENCES public.organisations(id) ON DELETE CASCADE,
  licence_type      TEXT NOT NULL CHECK (licence_type IN ('DAX','DAOP','DAC','DAI')),
  current_stage     TEXT NOT NULL DEFAULT 'pre_screening'
                    CHECK (current_stage IN (
                      'pre_screening','initial_assessment','eligibility',
                      'formal_app','aip','aip_operations','full_registration')),
  aip_issued_date   DATE,
  aip_expiry_date   DATE,
  notes             JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_arip_applications_updated_at
  BEFORE UPDATE ON public.arip_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- COMPLIANCE CALENDAR
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.compliance_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL CHECK (event_type IN (
                  'STR_FILING','CTR_FILING','PEP_REGISTER','QUARTERLY_TRAINING',
                  'BWRA_REVIEW','ARIP_DEADLINE','CUSTOM')),
  title         TEXT NOT NULL,
  description   TEXT,
  due_date      TIMESTAMPTZ NOT NULL,
  recurrence    TEXT CHECK (recurrence IN
                  ('daily','weekly','monthly','quarterly','annual')),
  is_complete   BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_calendar_org_due ON public.compliance_events(org_id, due_date);
CREATE INDEX IF NOT EXISTS idx_calendar_org_open
  ON public.compliance_events(org_id, due_date) WHERE is_complete = FALSE;

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  plan                  TEXT NOT NULL CHECK (plan IN ('free','navigator','compass','flagship')),
  billing_cycle         TEXT NOT NULL CHECK (billing_cycle IN ('monthly','annual')),
  flutterwave_sub_id    TEXT,
  stripe_sub_id         TEXT,
  status                TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','cancelled','past_due','trialing')),
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_subscriptions_active_org
  ON public.subscriptions(org_id) WHERE status IN ('active','trialing');
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- REGULATORY CORPUS (pgvector — Section 11)
-- NOTE (CLAUDE.md §16 Rule 4): contents MUST be official publications +
-- The Founder's Guide ONLY. No AI-generated summaries. No secondary sources.
-- Embedding dimension 1024 matches Voyage AI voyage-law-2 (Section 3).
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.regulatory_corpus (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document    TEXT NOT NULL,         -- e.g. 'ISA 2025', 'MLPPA 2022', 'Founders Guide 2026'
  jurisdiction       TEXT NOT NULL,         -- NG, GH, KE, ZA, MU, INTL
  section_reference  TEXT,                  -- e.g. 'Section 357', 'Rule 4(2)'
  content            TEXT NOT NULL,
  embedding          VECTOR(1024),          -- voyage-law-2: 1024 dims
  metadata           JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_corpus_jurisdiction ON public.regulatory_corpus(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_corpus_source ON public.regulatory_corpus(source_document);
-- HNSW index for cosine similarity search (pgvector ≥ 0.5)
CREATE INDEX IF NOT EXISTS idx_corpus_embedding
  ON public.regulatory_corpus USING hnsw (embedding vector_cosine_ops);
