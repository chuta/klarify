-- ============================================================================
-- Klarify — 009_roadmap_sprint4.sql
--
-- Sprint 4 Phase A (S4-A1) — Smart Compliance Roadmap.
--
-- 1. Creates the master `roadmap_task_templates` library that powers
--    `generateRoadmap()` and `checkAndUnlockPhases()` in packages/core.
-- 2. Extends `roadmap_tasks` with the columns needed for the Kanban UI:
--      * `template_ref_id` → which seed template the row was generated from.
--        Distinct from the existing `template_id` (which references a
--        compliance document template like 'BWRA' / 'AML_POLICY' — that
--        column stays unchanged).
--      * `is_custom`  → true when a user created the task themselves.
--      * `is_blocker` → mirrors the seed flag for fast UI queries.
--      * `notes`      → drawer free-text auto-saved by the UI.
--      * `deleted_at` → soft-delete for custom tasks (DELETE endpoint).
-- 3. Wipes all existing `roadmap_tasks` rows. CLAUDE.md Sprint 4 task
--    spec — "WIPE and reseed": small live user base, no production
--    user-customised tasks; cleanest path is regeneration on next visit.
-- 4. Adds an RLS policy so the templates table is readable by any
--    authenticated user (it's a master library, not user data).
--
-- Run order: 008_sprint3_documents.sql → 009_roadmap_sprint4.sql.
-- Seeding of templates lives in packages/core/src/roadmap/seedTaskTemplates.ts
-- and runs from apps/api/scripts/seedRoadmapTemplates.ts. SQL DDL only here.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Master template library
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roadmap_task_templates (
  id                   TEXT PRIMARY KEY,                      -- e.g. 'P1-01'
  phase                INT  NOT NULL CHECK (phase BETWEEN 1 AND 4),
  title                TEXT NOT NULL,
  description          TEXT NOT NULL,
  regulatory_basis     TEXT,
  effort_days_min      INT,
  effort_days_max      INT,
  template_id          TEXT,                                  -- doc template (CLAUDE.md §14)
  is_blocker           BOOLEAN NOT NULL DEFAULT false,
  depends_on           TEXT[]  NOT NULL DEFAULT '{}',
  product_types        TEXT[]  NOT NULL DEFAULT ARRAY['ALL'],
  linked_indicator_key TEXT,                                  -- "<dimension>.<indicator>"
  linked_dimension     TEXT,                                  -- duplicates for score-recalc hint
  display_order        INT  NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_templates_phase
  ON public.roadmap_task_templates(phase, display_order);

-- World-readable for any authenticated user. Templates are static reference
-- data; writes go through the seed script (service-role connection bypasses
-- RLS).
ALTER TABLE public.roadmap_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_task_templates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_read_all ON public.roadmap_task_templates;
CREATE POLICY templates_read_all ON public.roadmap_task_templates
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 2. Extend roadmap_tasks
-- ---------------------------------------------------------------------------
-- 2a. Wipe existing org tasks (Sprint 4 wipe-and-reseed contract).
--     RLS will keep the DELETE limited to whatever the current GUC says —
--     but this migration runs from a service-role / direct connection
--     where RLS is bypassed, so the wipe is global. Safe: pre-launch.
DELETE FROM public.roadmap_tasks;

-- 2b. New columns. All NULL-safe to keep this migration purely additive
--     on the schema side.
ALTER TABLE public.roadmap_tasks
  ADD COLUMN IF NOT EXISTS template_ref_id TEXT
    REFERENCES public.roadmap_task_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_custom  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_blocker BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes      TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2c. Supporting indexes for the Kanban queries.
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_template_ref
  ON public.roadmap_tasks(template_ref_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_org_phase_locked
  ON public.roadmap_tasks(org_id, phase, is_locked)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_org_not_deleted
  ON public.roadmap_tasks(org_id)
  WHERE deleted_at IS NULL;
