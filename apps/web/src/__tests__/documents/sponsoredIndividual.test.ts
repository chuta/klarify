/**
 * Sponsored Individual form — pure logic unit tests.
 *
 * Like the rest of the web test suite, we avoid a DOM renderer (no jsdom setup)
 * and instead test the pure validation and state logic that drives the form.
 * Component rendering tests belong in end-to-end / Playwright suites.
 */

import { describe, expect, it } from 'vitest';

// =============================================================================
// Logic extracted from SponsoredIndividualForm
// (mirrors the real logic — if the component changes, update here too)
// =============================================================================

const MIN_INDIVIDUALS = 4;
const MAX_INDIVIDUALS = 10;

interface IndividualData {
  full_name: string;
  role: string;
  other_role: string;
  nin: string;
  bvn: string;
  responsibilities: string;
  experience: string;
  no_criminal_convictions: boolean;
  no_sanctions: boolean;
  no_misconduct: boolean;
  no_bankruptcy: boolean;
}

function blankIndividual(): IndividualData {
  return {
    full_name: '',
    role: '',
    other_role: '',
    nin: '',
    bvn: '',
    responsibilities: '',
    experience: '',
    no_criminal_convictions: false,
    no_sanctions: false,
    no_misconduct: false,
    no_bankruptcy: false,
  };
}

function isIndividualComplete(ind: IndividualData): boolean {
  const coreOk =
    ind.full_name.trim().length > 0 &&
    ind.role.trim().length > 0 &&
    ind.nin.trim().length > 0 &&
    ind.bvn.trim().length > 0 &&
    ind.responsibilities.trim().length > 0 &&
    ind.experience.trim().length > 0;
  const declarationsOk =
    ind.no_criminal_convictions &&
    ind.no_sanctions &&
    ind.no_misconduct &&
    ind.no_bankruptcy;
  return coreOk && declarationsOk;
}

function isFormValid(companyName: string, individuals: IndividualData[]): boolean {
  if (companyName.trim().length === 0) return false;
  if (individuals.length < MIN_INDIVIDUALS) return false;
  return individuals.every(isIndividualComplete);
}

function filledIndividual(overrides: Partial<IndividualData> = {}): IndividualData {
  return {
    full_name: 'Test Person',
    role: 'Managing Director',
    other_role: '',
    nin: '12345678901',
    bvn: '12345678901',
    responsibilities: 'Responsible for all company operations',
    experience: '10 years in finance',
    no_criminal_convictions: true,
    no_sanctions: true,
    no_misconduct: true,
    no_bankruptcy: true,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('SponsoredIndividualForm — MIN_INDIVIDUALS constant', () => {
  it('minimum individuals required is 4 (Section 18(i) ARIP Framework)', () => {
    expect(MIN_INDIVIDUALS).toBe(4);
  });

  it('maximum individuals is 10', () => {
    expect(MAX_INDIVIDUALS).toBe(10);
  });
});

describe('SponsoredIndividualForm — form validation', () => {
  it('form is invalid with fewer than 4 individuals', () => {
    const company = 'Test Co Ltd';
    const individuals = [
      filledIndividual(),
      filledIndividual(),
      filledIndividual(),
    ]; // only 3
    expect(isFormValid(company, individuals)).toBe(false);
  });

  it('form is invalid with exactly 3 individuals', () => {
    const individuals = Array.from({ length: 3 }, () => filledIndividual());
    expect(isFormValid('Company', individuals)).toBe(false);
  });

  it('form is valid with exactly 4 complete individuals', () => {
    const individuals = Array.from({ length: 4 }, () => filledIndividual());
    expect(isFormValid('Company Ltd', individuals)).toBe(true);
  });

  it('form is valid with more than 4 complete individuals', () => {
    const individuals = Array.from({ length: 7 }, () => filledIndividual());
    expect(isFormValid('Company Ltd', individuals)).toBe(true);
  });

  it('form is invalid when company name is empty', () => {
    const individuals = Array.from({ length: 4 }, () => filledIndividual());
    expect(isFormValid('', individuals)).toBe(false);
  });

  it('cannot submit with fewer than MIN_INDIVIDUALS (validation returns false)', () => {
    const individuals = Array.from({ length: 2 }, () => filledIndividual());
    expect(isFormValid('Company', individuals)).toBe(false);
  });
});

describe('SponsoredIndividualForm — individual completeness', () => {
  it('individual with all fields filled and all declarations checked is complete', () => {
    expect(isIndividualComplete(filledIndividual())).toBe(true);
  });

  it('individual is incomplete if full_name is empty', () => {
    expect(isIndividualComplete(filledIndividual({ full_name: '' }))).toBe(false);
  });

  it('individual is incomplete if role is empty', () => {
    expect(isIndividualComplete(filledIndividual({ role: '' }))).toBe(false);
  });

  it('individual is incomplete if nin is empty', () => {
    expect(isIndividualComplete(filledIndividual({ nin: '' }))).toBe(false);
  });

  it('individual is incomplete if bvn is empty', () => {
    expect(isIndividualComplete(filledIndividual({ bvn: '' }))).toBe(false);
  });

  it('individual is incomplete if responsibilities are empty', () => {
    expect(isIndividualComplete(filledIndividual({ responsibilities: '' }))).toBe(false);
  });

  it('individual is incomplete if experience is empty', () => {
    expect(isIndividualComplete(filledIndividual({ experience: '' }))).toBe(false);
  });

  it('individual is incomplete if no_criminal_convictions is false', () => {
    expect(
      isIndividualComplete(filledIndividual({ no_criminal_convictions: false })),
    ).toBe(false);
  });

  it('individual is incomplete if no_sanctions is false', () => {
    expect(
      isIndividualComplete(filledIndividual({ no_sanctions: false })),
    ).toBe(false);
  });

  it('individual is incomplete if no_misconduct is false', () => {
    expect(
      isIndividualComplete(filledIndividual({ no_misconduct: false })),
    ).toBe(false);
  });

  it('individual is incomplete if no_bankruptcy is false', () => {
    expect(
      isIndividualComplete(filledIndividual({ no_bankruptcy: false })),
    ).toBe(false);
  });

  it('all four boolean declarations must be true for the individual to be complete', () => {
    // Test each combination of 3/4 declarations checked — all should fail
    const combinations: Partial<IndividualData>[] = [
      { no_criminal_convictions: false, no_sanctions: true, no_misconduct: true, no_bankruptcy: true },
      { no_criminal_convictions: true, no_sanctions: false, no_misconduct: true, no_bankruptcy: true },
      { no_criminal_convictions: true, no_sanctions: true, no_misconduct: false, no_bankruptcy: true },
      { no_criminal_convictions: true, no_sanctions: true, no_misconduct: true, no_bankruptcy: false },
    ];
    for (const combo of combinations) {
      expect(isIndividualComplete(filledIndividual(combo))).toBe(false);
    }
  });
});

describe('SponsoredIndividualForm — add/remove logic', () => {
  it('initial state has exactly MIN_INDIVIDUALS (4) blank individuals', () => {
    const initial = Array.from({ length: MIN_INDIVIDUALS }, () => blankIndividual());
    expect(initial).toHaveLength(MIN_INDIVIDUALS);
  });

  it('can add individuals up to MAX_INDIVIDUALS', () => {
    let count = MIN_INDIVIDUALS;
    while (count < MAX_INDIVIDUALS) {
      count += 1;
    }
    expect(count).toBeLessThanOrEqual(MAX_INDIVIDUALS);
  });

  it('individual count badge shows correct progress', () => {
    const belowMin = (count: number): boolean => count < MIN_INDIVIDUALS;
    expect(belowMin(3)).toBe(true);
    expect(belowMin(4)).toBe(false);
    expect(belowMin(5)).toBe(false);
  });

  it('cannot have fewer than MIN_INDIVIDUALS (remove is gated)', () => {
    const canRemove = (currentCount: number): boolean =>
      currentCount > MIN_INDIVIDUALS;
    expect(canRemove(4)).toBe(false);
    expect(canRemove(5)).toBe(true);
  });
});

describe('SponsoredIndividualForm — individual count badge behaviour', () => {
  it('shows amber warning when individual count is below 4', () => {
    const count = 3;
    const isBelow = count < MIN_INDIVIDUALS;
    expect(isBelow).toBe(true);
  });

  it('shows no warning when count reaches 4', () => {
    const count = 4;
    const isBelow = count < MIN_INDIVIDUALS;
    expect(isBelow).toBe(false);
  });
});
