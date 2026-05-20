-- ============================================================================
-- Klarify — 007_sprint2_rag_and_chat.sql
--
-- Sprint 2 (RAG ingestion + FounderCounsel chat + Product Classification).
-- This migration is purely additive — no data loss possible. It introduces:
--
--   1. ingestion_log
--        Tracks every corpus ingestion run (one row per source file). Lets the
--        CLI in packages/ai/scripts/ingest.ts resume gracefully and surface
--        per-file failures (Voyage 429, PDF parse errors). The regulatory
--        corpus rows themselves already live in `regulatory_corpus` (001_init).
--
--   2. conversations.deleted_at
--        Soft-delete column for FounderCounsel conversations (CLAUDE.md §9:
--        DELETE /api/ai/conversations/:id). Existing hard-cascade Message
--        rows are preserved — we just hide the conversation from listings.
--
--   3. user_profiles.last_classified_at
--        Tracks when the user last ran POST /api/ai/classify so the dashboard
--        can nudge un-classified founders (CLAUDE.md §12 "Pre-Launch Founder"
--        persona — instant product classification is their core need).
--
--   4. product_classifications
--        One row per classification request. Stores the full Claude Opus 4
--        result (DAX / DAOP / DAC / DAI / PAYMENT / HYBRID), so users can
--        re-open their Regulatory Identity Card and so the "Ask a follow-up"
--        button in the chat UI can rehydrate classification context.
--
-- RLS policies for the two new tables are added too — CLAUDE.md §16 Rule 3
-- ("Never expose user compliance data to other users. RLS on every table.").
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ingestion_log
-- ---------------------------------------------------------------------------
-- Service-role only: corpus ingestion is run by ops via the CLI, never by an
-- end user. We still ENABLE RLS for defence-in-depth — the service connection
-- bypasses RLS by default; authenticated user connections see nothing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingestion_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename          TEXT NOT NULL,
  chunk_count       INT NOT NULL DEFAULT 0,
  embedding_model   TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','extracting','embedding','complete','error')),
  error_msg         TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_filename ON public.ingestion_log(filename);
CREATE INDEX IF NOT EXISTS idx_ingestion_log_started  ON public.ingestion_log(started_at DESC);

ALTER TABLE public.ingestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingestion_log FORCE ROW LEVEL SECURITY;
-- No policy defined = deny by default for authenticated users.
-- Service-role connections bypass RLS and can read/write freely.

-- ---------------------------------------------------------------------------
-- 2. conversations.deleted_at (soft delete)
-- ---------------------------------------------------------------------------
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index — fast listings that filter out soft-deleted conversations.
CREATE INDEX IF NOT EXISTS idx_conversations_active
  ON public.conversations(user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. user_profiles.last_classified_at
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_classified_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. product_classifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_classifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES public.users(id)         ON DELETE CASCADE,
  description       TEXT NOT NULL,
  -- Full ClassificationResult JSON (see packages/ai/src/classify/types.ts).
  -- Storing as JSONB lets us evolve the schema without DDL.
  result            JSONB NOT NULL,
  -- Primary category extracted from result for cheap dashboard queries.
  primary_category  TEXT NOT NULL
                    CHECK (primary_category IN
                      ('DAX','DAOP','DAC','DAI','PAYMENT','HYBRID')),
  risk_level        TEXT NOT NULL
                    CHECK (risk_level IN ('CRITICAL','HIGH','MEDIUM')),
  model_used        TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_classifications_org_time
  ON public.product_classifications(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_classifications_user
  ON public.product_classifications(user_id);

ALTER TABLE public.product_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_classifications FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pc_org_read ON public.product_classifications;
CREATE POLICY pc_org_read ON public.product_classifications
  FOR SELECT USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS pc_org_write ON public.product_classifications;
CREATE POLICY pc_org_write ON public.product_classifications
  FOR INSERT WITH CHECK (public.is_org_member(org_id));

-- Updates are intentionally NOT allowed — every classification is immutable.
-- Users who want to re-classify generate a new row. This preserves audit
-- history (CLAUDE.md §11.7 update protocol).
