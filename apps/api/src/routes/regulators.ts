// Regulators CRM — GET /api/regulators, GET /api/regulators/:code
// Serves the pre-seeded Nigerian regulator list from the database.
// Sprint 5 will extend this with interactions, contacts, and engagement log.
import { Hono } from 'hono';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';

export const regulatorRoutes = new Hono<{ Variables: AuthVars }>();

// ========================================================================== //
// GET /api/regulators — all regulators (no org scope — global reference data) //
// ========================================================================== //
regulatorRoutes.get('/', requireAuth, async (c) => {
  try {
    const regulators = await prisma.regulator.findMany({
      orderBy: { code: 'asc' },
    });
    return c.json({ success: true as const, data: regulators });
  } catch (err) {
    console.error('[regulators/get-all] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch regulators.', code: 'REGULATORS_FETCH_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// GET /api/regulators/:code — single regulator profile                        //
// ========================================================================== //
regulatorRoutes.get('/:code', requireAuth, async (c) => {
  const code = c.req.param('code').toUpperCase();
  try {
    const regulator = await prisma.regulator.findUnique({
      where: { code },
    });
    if (!regulator) {
      return c.json(
        { success: false as const, error: 'Regulator not found.', code: 'NOT_FOUND' },
        404,
      );
    }
    return c.json({ success: true as const, data: regulator });
  } catch (err) {
    console.error('[regulators/get-one] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch regulator.', code: 'REGULATOR_FETCH_ERROR' },
      500,
    );
  }
});
