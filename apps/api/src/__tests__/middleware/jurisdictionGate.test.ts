import { describe, it, expect } from 'vitest';
import { checkJurisdictionExpansionAccess } from '../../middleware/featureGate.js';

describe('checkJurisdictionExpansionAccess', () => {
  it('blocks free plan', () => {
    const result = checkJurisdictionExpansionAccess('free', 'NG', ['GH']);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.requiredPlan).toBe('compass');
  });

  it('blocks navigator plan', () => {
    const result = checkJurisdictionExpansionAccess('navigator', 'NG', ['GH']);
    expect(result.allowed).toBe(false);
  });

  it('allows compass NG→GH', () => {
    const result = checkJurisdictionExpansionAccess('compass', 'NG', ['GH']);
    expect(result.allowed).toBe(true);
  });

  it('blocks compass NG→GH+KE (exceeds 2-jurisdiction limit)', () => {
    const result = checkJurisdictionExpansionAccess('compass', 'NG', ['GH', 'KE']);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.requiredPlan).toBe('flagship');
  });

  it('allows flagship NG→GH+KE+MU+ZA', () => {
    const result = checkJurisdictionExpansionAccess('flagship', 'NG', [
      'GH',
      'KE',
      'MU',
      'ZA',
    ]);
    expect(result.allowed).toBe(true);
  });

  it('rejects when all targets equal source', () => {
    const result = checkJurisdictionExpansionAccess('compass', 'NG', ['NG']);
    expect(result.allowed).toBe(false);
  });
});
