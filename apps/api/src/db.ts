import { PrismaClient } from '@prisma/client';

// Single shared Prisma client. In serverless/edge deployments a new instance
// would normally be created per request, but we run on a long-lived Node
// process (Railway/Render — CLAUDE.md §3), so a singleton is correct.
export const prisma = new PrismaClient();

export interface RlsContext {
  readonly userId: string;
  readonly orgId: string;
}

/**
 * Run `fn` inside a transaction with the RLS GUCs set, so every query inside
 * is filtered by the policies in apps/api/db/migrations/002_rls.sql.
 *
 * This is the ONLY supported path for queries that touch org-scoped tables.
 * CLAUDE.md §16 Rule 3: "Every query must be scoped to the authenticated
 * user's organisation. Test this."
 */
export async function withRls<T>(
  ctx: RlsContext,
  fn: (tx: Omit<PrismaClient, '$transaction' | '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // set_config(name, value, is_local=true) scopes the GUC to this transaction.
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, ctx.userId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, ctx.orgId);
    return fn(tx);
  });
}
