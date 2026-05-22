import type { Regulator } from '@klarify/core';
import { NIGERIAN_REGULATORS } from '@klarify/core/regulators';
import { prisma } from '@/lib/db';

type RegulatorRow = {
  code: string;
  name: string;
  mandate: string;
  website: string | null;
  portal: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  jurisdictionTags: string[];
  aripContacts: unknown;
  aripFees: unknown;
};

function mapRow(row: RegulatorRow): Regulator {
  return {
    code: row.code,
    name: row.name,
    mandate: row.mandate,
    website: row.website,
    portal: row.portal,
    email: row.email,
    phone: row.phone,
    address: row.address,
    jurisdictionTags: row.jurisdictionTags ?? [],
    aripContacts: row.aripContacts as Regulator['aripContacts'],
    aripFees: row.aripFees as Regulator['aripFees'],
  };
}

function seedFallback(): Regulator[] {
  return NIGERIAN_REGULATORS.map((r) => ({
    code: r.code,
    name: r.name,
    mandate: r.mandate,
    website: r.website ?? null,
    portal: r.portal ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    address: r.address ?? null,
    jurisdictionTags: [...r.jurisdiction_tags],
  }));
}

/**
 * Load the 7 Nigerian regulator profiles for the hub page.
 *
 * The `regulators` table has RLS (002_rls.sql) — reads require
 * `app.current_user_id` to be set. Plain Prisma queries without that GUC
 * return zero rows silently, which is why the card grid was empty in prod.
 */
export async function loadRegulatorsForUser(userId: string): Promise<Regulator[]> {
  try {
    const rows = await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true)`,
        userId,
      );
      return tx.regulator.findMany({ orderBy: { code: 'asc' } });
    });

    if (rows.length > 0) {
      return rows.map((row) => mapRow(row as RegulatorRow));
    }

    console.warn('[regulators] DB returned 0 rows — using seed fallback');
    return seedFallback();
  } catch (err) {
    console.warn('[regulators] load failed — using seed fallback', err);
    return seedFallback();
  }
}
