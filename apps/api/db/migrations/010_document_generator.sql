-- ============================================================================
-- Klarify — 010_document_generator.sql
--
-- Sprint 4 Phase B (S4-B1) — Compliance Document Generator (US-008).
--
-- Extends `generated_documents` with the columns the generator needs to:
--   * Support multi-version histories per (org, template) without ever
--     losing a previous draft (audit-trail requirement).
--   * Mark exactly ONE version per (org, template) as "current" so the
--     library UI can render one row per template without N+1 queries.
--   * Persist the form_data the user supplied so "Regenerate" can prefill
--     without forcing them to retype 12 fields.
--   * Surface the regulatoryBasis verbatim from the prompt template (CLAUDE.md
--     §14) so the table view can show it without a join into application
--     config.
--   * Soft-delete generated documents so the audit trail survives a user
--     "delete" action — mirrors the pattern we use on conversations + roadmap.
--
-- Purely additive. No row migration needed: existing rows (none expected on
-- this pre-launch deployment) will default to is_current=true / deleted_at=null.
-- ============================================================================

ALTER TABLE public.generated_documents
  ADD COLUMN IF NOT EXISTS regulatory_basis TEXT,
  ADD COLUMN IF NOT EXISTS form_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- The (org_id, template_type, version) tuple is logically unique — versions
-- start at 1 and monotonically advance. Index it so listVersions() is a
-- single-page scan.
CREATE UNIQUE INDEX IF NOT EXISTS uq_gen_docs_org_template_version
  ON public.generated_documents(org_id, template_type, version)
  WHERE deleted_at IS NULL;

-- listDocuments() returns one row per (org, template_type) — the current
-- version. Index makes that a single-row lookup per template.
CREATE INDEX IF NOT EXISTS idx_gen_docs_org_template_current
  ON public.generated_documents(org_id, template_type)
  WHERE is_current = TRUE AND deleted_at IS NULL;
