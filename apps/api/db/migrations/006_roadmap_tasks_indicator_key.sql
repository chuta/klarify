-- ============================================================================
-- 006_roadmap_tasks_indicator_key.sql
--
-- Add the missing `indicator_key` column on `roadmap_tasks`.
--
-- Background:
--   The Prisma schema (apps/api/prisma/schema.prisma) declares
--     indicatorKey String? @map("indicator_key")
--   on RoadmapTask, and the runtime depends on it:
--     * apps/web/src/app/api/onboarding/complete/route.ts seeds Phase 1
--       tasks with an indicator_key per packages/core/src/roadmap/templates.ts.
--     * apps/web/src/app/api/compliance/roadmap/task/[id]/route.ts reads
--       the value when a task is marked complete and flips the matching
--       readiness-score indicator (CLAUDE.md §16 Rule 6 — score must update
--       in real time).
--
--   However 001_init.sql never created the column, so every prisma.roadmapTask
--   SELECT fails on production with P2022:
--     "The column `roadmap_tasks.indicator_key` does not exist".
--
-- This migration is purely additive — no data loss possible.
-- ============================================================================

ALTER TABLE public.roadmap_tasks
  ADD COLUMN IF NOT EXISTS indicator_key TEXT;
