// =============================================================================
// apps/api/scripts/seedRoadmapTemplates.ts
//
// Idempotent upsert of every SeedTaskTemplate from @klarify/core into the
// `roadmap_task_templates` master table. Safe to run on every deploy.
// Run with:  pnpm tsx apps/api/scripts/seedRoadmapTemplates.ts
// =============================================================================

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { ALL_SEED_TEMPLATES } from '@klarify/core';

// Load root .env so the script works locally without `pnpm dev`.
(function loadRootEnv() {
  try {
    const envPath = resolve(process.cwd(), '../../.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const k = trimmed.slice(0, eq).trim();
      let v = trimmed.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (k && !(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* env file optional in production */
  }
})();

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    let upserted = 0;
    for (const t of ALL_SEED_TEMPLATES) {
      await prisma.roadmapTaskTemplate.upsert({
        where: { id: t.id },
        create: {
          id: t.id,
          phase: t.phase,
          title: t.title,
          description: t.description,
          regulatoryBasis: t.regulatory_basis,
          effortDaysMin: t.effort_days_min,
          effortDaysMax: t.effort_days_max,
          templateId: t.template_id ?? null,
          isBlocker: t.is_blocker,
          dependsOn: [...t.depends_on],
          productTypes: [...t.product_types],
          linkedIndicatorKey: t.linked_indicator_key ?? null,
          linkedDimension: t.linked_dimension ?? null,
          displayOrder: t.display_order,
        },
        update: {
          phase: t.phase,
          title: t.title,
          description: t.description,
          regulatoryBasis: t.regulatory_basis,
          effortDaysMin: t.effort_days_min,
          effortDaysMax: t.effort_days_max,
          templateId: t.template_id ?? null,
          isBlocker: t.is_blocker,
          dependsOn: [...t.depends_on],
          productTypes: [...t.product_types],
          linkedIndicatorKey: t.linked_indicator_key ?? null,
          linkedDimension: t.linked_dimension ?? null,
          displayOrder: t.display_order,
        },
      });
      upserted += 1;
    }
    const total = await prisma.roadmapTaskTemplate.count();
    console.log(
      JSON.stringify({ upserted, totalInDb: total, expected: ALL_SEED_TEMPLATES.length }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('[seedRoadmapTemplates] failed:', err);
  process.exit(1);
});
