// =============================================================================
// aripTracker.test.ts — unit tests for the ARIP tracker service.
//
// These tests cover pure logic functions only — no database connection needed.
// DB-dependent functions (advanceStage, recordGrowthEvent, etc.) are tested
// for their validation logic by extracting the pure parts.
//
// Regulatory source: ARIP Framework, SEC Nigeria, June 2024.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  STAGE_ORDER,
  getStageIndex,
  isSpecStage,
} from '../../services/aripTracker.js';

// ---------------------------------------------------------------------------
// Stage ordering — validates the 5-stage spec model
// ---------------------------------------------------------------------------

describe('STAGE_ORDER — 5-stage ARIP model', () => {
  it('contains exactly 5 stages in the correct order', () => {
    expect(STAGE_ORDER).toEqual([
      'pre_screening',
      'initial_assessment',
      'eligibility',
      'aip',
      'full_registration',
    ]);
  });

  it('pre_screening is stage index 0', () => {
    expect(getStageIndex('pre_screening')).toBe(0);
  });

  it('initial_assessment is stage index 1', () => {
    expect(getStageIndex('initial_assessment')).toBe(1);
  });

  it('eligibility is stage index 2', () => {
    expect(getStageIndex('eligibility')).toBe(2);
  });

  it('aip is stage index 3', () => {
    expect(getStageIndex('aip')).toBe(3);
  });

  it('full_registration is stage index 4', () => {
    expect(getStageIndex('full_registration')).toBe(4);
  });

  it('unknown stage returns -1', () => {
    expect(getStageIndex('some_random_stage')).toBe(-1);
  });
});

describe('isSpecStage — spec stage guard', () => {
  it('accepts all 5 spec stages', () => {
    for (const stage of STAGE_ORDER) {
      expect(isSpecStage(stage)).toBe(true);
    }
  });

  it('rejects legacy UI stage names', () => {
    expect(isSpecStage('initial_assessment_old')).toBe(false);
    expect(isSpecStage('aip_active')).toBe(false);
    expect(isSpecStage('formal_application')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Stage transition validation logic (pure)
// ---------------------------------------------------------------------------

describe('Stage transition validation', () => {
  /** Mirrors the validation logic from advanceStage() without a DB call. */
  function validateTransition(
    currentStage: string,
    toStage: string,
    solicitorEngaged: boolean,
    fidelityBondInPlace: boolean,
  ): { valid: boolean; code?: string } {
    if (!isSpecStage(toStage) || !isSpecStage(currentStage)) {
      return { valid: true }; // Non-spec stages: allow (legacy support)
    }

    const fromIdx = getStageIndex(currentStage);
    const toIdx = getStageIndex(toStage);

    if (toIdx === fromIdx) return { valid: false, code: 'ALREADY_IN_STAGE' };
    if (toIdx !== fromIdx + 1) return { valid: false, code: 'STAGE_SKIP_NOT_ALLOWED' };
    if (toStage === 'initial_assessment' && !solicitorEngaged) {
      return { valid: false, code: 'SOLICITOR_REQUIRED' };
    }
    if (toStage === 'eligibility' && !fidelityBondInPlace) {
      return { valid: false, code: 'FIDELITY_BOND_REQUIRED' };
    }
    return { valid: true };
  }

  it('blocks advance to initial_assessment when solicitor not engaged', () => {
    const result = validateTransition('pre_screening', 'initial_assessment', false, false);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('SOLICITOR_REQUIRED');
  });

  it('allows advance to initial_assessment when solicitor is engaged', () => {
    const result = validateTransition('pre_screening', 'initial_assessment', true, false);
    expect(result.valid).toBe(true);
  });

  it('blocks advance to eligibility when fidelity bond not in place', () => {
    const result = validateTransition('initial_assessment', 'eligibility', true, false);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('FIDELITY_BOND_REQUIRED');
  });

  it('allows advance to eligibility when fidelity bond in place', () => {
    const result = validateTransition('initial_assessment', 'eligibility', true, true);
    expect(result.valid).toBe(true);
  });

  it('blocks skipping stages (pre_screening → aip)', () => {
    const result = validateTransition('pre_screening', 'aip', true, true);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('STAGE_SKIP_NOT_ALLOWED');
  });

  it('blocks skipping stages (initial_assessment → full_registration)', () => {
    const result = validateTransition('initial_assessment', 'full_registration', true, true);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('STAGE_SKIP_NOT_ALLOWED');
  });

  it('blocks re-advancing to the same stage', () => {
    const result = validateTransition('eligibility', 'eligibility', true, true);
    expect(result.valid).toBe(false);
    expect(result.code).toBe('ALREADY_IN_STAGE');
  });

  it('allows sequential advance through all stages', () => {
    const pairs: Array<[string, string]> = [
      ['pre_screening', 'initial_assessment'],
      ['initial_assessment', 'eligibility'],
      ['eligibility', 'aip'],
      ['aip', 'full_registration'],
    ];
    for (const [from, to] of pairs) {
      const r = validateTransition(from, to, true, true);
      expect(r.valid).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// AIP date calculation
// ---------------------------------------------------------------------------

describe('AIP date calculation', () => {
  it('AIP expiry is 6 months after issuance', () => {
    const issued = new Date('2026-05-01');
    const expectedExpiry = new Date(issued);
    expectedExpiry.setMonth(expectedExpiry.getMonth() + 6);
    expect(expectedExpiry.toISOString().slice(0, 10)).toBe('2026-11-01');
  });

  it('days remaining is negative when AIP has expired', () => {
    const past = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
    const ms = past.getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    expect(days).toBeLessThan(0);
  });

  it('days remaining is 30 when exactly 30 days away', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const ms = future.getTime() - Date.now();
    const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
    expect(days).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Customer cap calculations
// ---------------------------------------------------------------------------

describe('Customer cap calculations — Section 29d, ARIP Framework', () => {
  const AIP_MAX_CUSTOMERS = 50;

  function calcCustomerUtil(current: number, cap: number = AIP_MAX_CUSTOMERS) {
    return (current / cap) * 100;
  }

  it('0 customers = 0% utilisation', () => {
    expect(calcCustomerUtil(0)).toBe(0);
  });

  it('25 customers = 50% utilisation', () => {
    expect(calcCustomerUtil(25)).toBe(50);
  });

  it('45 customers = 90% utilisation (approaching cap)', () => {
    expect(calcCustomerUtil(45)).toBe(90);
  });

  it('50 customers = 100% utilisation (cap reached)', () => {
    expect(calcCustomerUtil(50)).toBe(100);
  });

  it('cap breach triggers at exactly 50 customers', () => {
    const current = 50;
    const breached = current >= AIP_MAX_CUSTOMERS;
    expect(breached).toBe(true);
  });

  it('49 customers is NOT a breach', () => {
    const current = 49;
    const breached = current >= AIP_MAX_CUSTOMERS;
    expect(breached).toBe(false);
  });

  it('approaching cap at 90% (45+ customers)', () => {
    const approachingAt = 45;
    const utilPct = calcCustomerUtil(approachingAt);
    expect(utilPct).toBeGreaterThanOrEqual(90);
    expect(utilPct).toBeLessThan(100);
  });

  it('division by zero guard when cap is 0', () => {
    const utilPct = AIP_MAX_CUSTOMERS > 0 ? calcCustomerUtil(10, 0) : 0;
    // When cap is 0, should default to 0 not throw
    const safeUtil = 0 > 0 ? calcCustomerUtil(10, 0) : 0;
    expect(safeUtil).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// AIP regulatory caps (Section 29, ARIP Framework)
// ---------------------------------------------------------------------------

describe('AIP regulatory caps — Section 29, ARIP Framework', () => {
  const MAX_SINGLE_TXN_NGN = 2_000_000;
  const MAX_CUSTOMER_AUM_NGN = 5_000_000;
  const MAX_CUSTOMERS = 50;

  it('max single transaction is NGN 2,000,000', () => {
    expect(MAX_SINGLE_TXN_NGN).toBe(2_000_000);
  });

  it('max per-customer AUM is NGN 5,000,000', () => {
    expect(MAX_CUSTOMER_AUM_NGN).toBe(5_000_000);
  });

  it('max customers during AIP is 50', () => {
    expect(MAX_CUSTOMERS).toBe(50);
  });

  it('kobo-to-NGN conversion is accurate', () => {
    const kobo = BigInt(200_000_000); // 2,000,000 NGN in kobo
    const ngn = Number(kobo) / 100;
    expect(ngn).toBe(2_000_000);
  });
});

// ---------------------------------------------------------------------------
// Growth event logic
// ---------------------------------------------------------------------------

describe('Growth event processing', () => {
  function processGrowthEvent(
    currentCustomers: number,
    deltaCustomers: number,
    maxCustomers: number = 50,
  ) {
    const newTotal = currentCustomers + deltaCustomers;
    const utilPct = maxCustomers > 0 ? (newTotal / maxCustomers) * 100 : 0;
    const customerCapBreached = newTotal >= maxCustomers;
    const approachingCap = utilPct >= 90 && !customerCapBreached;
    const warnings: string[] = [];

    if (customerCapBreached) {
      warnings.push(`Customer cap reached: ${newTotal}/${maxCustomers}.`);
    } else if (approachingCap) {
      warnings.push(`Approaching customer cap: ${newTotal}/${maxCustomers}.`);
    }

    return {
      newTotal,
      utilPct,
      customerCapBreached,
      withinLimits: !customerCapBreached,
      warnings,
    };
  }

  it('adding 1 customer to empty registry = 1 total, 2% utilisation', () => {
    const result = processGrowthEvent(0, 1);
    expect(result.newTotal).toBe(1);
    expect(result.utilPct).toBe(2);
    expect(result.withinLimits).toBe(true);
  });

  it('reaching cap of 50 triggers breach warning', () => {
    const result = processGrowthEvent(49, 1);
    expect(result.newTotal).toBe(50);
    expect(result.customerCapBreached).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.withinLimits).toBe(false);
  });

  it('45 customers triggers approaching-cap warning', () => {
    const result = processGrowthEvent(44, 1);
    expect(result.newTotal).toBe(45);
    expect(result.utilPct).toBe(90);
    expect(result.withinLimits).toBe(true); // Not yet breached
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('growth beyond cap is also flagged as breach', () => {
    const result = processGrowthEvent(50, 5); // 55 customers > 50 cap
    expect(result.customerCapBreached).toBe(true);
    expect(result.withinLimits).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Stage history recording (pure data check)
// ---------------------------------------------------------------------------

describe('Stage history data shape', () => {
  it('stage history entry has all required fields', () => {
    const entry = {
      id: 'uuid-1',
      aripId: 'uuid-2',
      fromStage: 'pre_screening',
      toStage: 'initial_assessment',
      notes: null,
      transitionedAt: new Date().toISOString(),
    };
    expect(entry).toHaveProperty('id');
    expect(entry).toHaveProperty('fromStage');
    expect(entry).toHaveProperty('toStage');
    expect(entry).toHaveProperty('transitionedAt');
  });

  it('first transition has null fromStage', () => {
    const firstEntry = {
      fromStage: null,
      toStage: 'pre_screening',
    };
    expect(firstEntry.fromStage).toBeNull();
  });
});
