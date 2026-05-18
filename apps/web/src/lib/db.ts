import { PrismaClient, Prisma } from '@prisma/client';

// Serverless-safe singleton — prevents exhausting the connection pool during
// Next.js hot reloads in development, while staying stateless in production.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export interface RlsContext {
  readonly userId: string;
  readonly orgId: string;
}

/**
 * Run `fn` inside a transaction with the RLS GUCs set so every query inside
 * is filtered by the policies in apps/api/db/migrations/002_rls.sql.
 * CLAUDE.md §16 Rule 3: "Every query must be scoped to the authenticated
 * user's organisation."
 */
export async function withRls<T>(
  ctx: RlsContext,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, ctx.userId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, ctx.orgId);
    return fn(tx);
  });
}

/** Resolve the user's default org (first membership). Returns null if unset. */
export async function resolveOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}
