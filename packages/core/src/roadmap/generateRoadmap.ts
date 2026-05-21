// =============================================================================
// generateRoadmap — pure function that materialises seed templates into the
// per-org task list shape that gets inserted into `roadmap_tasks`.
//
// One-way data flow:
//   ALL_SEED_TEMPLATES (or DB roadmap_task_templates)
//        → filter by user.product_types
//        → annotate with initial lock state (Phase 1 unlocked, others locked)
//        → return as RoadmapTaskInsert[]
//
// The caller (API route / onboarding) is responsible for the actual DB write.
// =============================================================================

import type { SeedTaskTemplate } from './seedTaskTemplates.js';
import { ALL_SEED_TEMPLATES } from './seedTaskTemplates.js';

/** Minimal slice of UserProfile needed for product-type filtering. */
export interface RoadmapUserProfile {
  readonly product_types: readonly string[];
}

/** Shape suitable for `prisma.roadmapTask.create()`. */
export interface RoadmapTaskInsert {
  readonly templateRefId: string;
  readonly phase: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly description: string;
  readonly regulatoryBasis: string | null;
  readonly templateId: string | null;
  readonly indicatorKey: string | null;
  readonly isBlocker: boolean;
  readonly isLocked: boolean;
  readonly isCustom: false;
  readonly status: 'not_started';
}

/**
 * Decide whether a template applies to a user given their product_types.
 * - `['ALL']` templates always apply.
 * - Otherwise, intersect with user.product_types (case-insensitive on either
 *   side). If the user has empty product_types (still onboarding), include
 *   the template only if it's ALL.
 */
export function templateMatchesProductTypes(
  template: SeedTaskTemplate,
  userProductTypes: readonly string[],
): boolean {
  if (template.product_types.includes('ALL')) return true;
  const normalisedUser = userProductTypes.map((p) => p.toUpperCase());
  return template.product_types.some((pt) => normalisedUser.includes(pt.toUpperCase()));
}

/**
 * Initial lock state for a freshly generated roadmap.
 *
 * Sprint 4 rule:
 *   * Phase 1 → unlocked.
 *   * Phase 2, 3, 4 → locked. The phaseUnlock engine flips them later
 *     once the prerequisites are met.
 */
function initialIsLocked(phase: 1 | 2 | 3 | 4): boolean {
  return phase !== 1;
}

/**
 * Materialise the roadmap for an org based on the user's profile.
 *
 * @param profile     The user's product_types (and other fields if needed).
 * @param templates   Optional override — defaults to `ALL_SEED_TEMPLATES`.
 *                    Tests inject a fixture here.
 */
export function generateRoadmap(
  profile: RoadmapUserProfile,
  templates: readonly SeedTaskTemplate[] = ALL_SEED_TEMPLATES,
): RoadmapTaskInsert[] {
  const matching = templates.filter((t) =>
    templateMatchesProductTypes(t, profile.product_types),
  );
  // Stable sort: phase asc, then display_order asc, then id asc.
  const sorted = [...matching].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase - b.phase;
    if (a.display_order !== b.display_order) return a.display_order - b.display_order;
    return a.id.localeCompare(b.id);
  });
  return sorted.map((t) => ({
    templateRefId: t.id,
    phase: t.phase,
    title: t.title,
    description: t.description,
    regulatoryBasis: t.regulatory_basis,
    templateId: t.template_id ?? null,
    indicatorKey: t.linked_indicator_key ?? null,
    isBlocker: t.is_blocker,
    isLocked: initialIsLocked(t.phase),
    isCustom: false,
    status: 'not_started',
  }));
}
