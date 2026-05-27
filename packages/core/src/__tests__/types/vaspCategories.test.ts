import { describe, expect, it } from 'vitest';
import {
  PRODUCT_TYPES,
  VASP_LICENCE_TYPES,
  isVaspLicenceType,
  productTypesRequireSec,
} from '../../types/vaspCategories.js';

describe('vaspCategories', () => {
  it('includes SEC Circular 26-1 categories', () => {
    expect(VASP_LICENCE_TYPES).toContain('AVASP');
    expect(VASP_LICENCE_TYPES).toContain('DAPO');
    expect(VASP_LICENCE_TYPES).toContain('RATOP');
    expect(PRODUCT_TYPES).toContain('PAYMENT');
    expect(PRODUCT_TYPES).toContain('HYBRID');
  });

  it('productTypesRequireSec covers all VASP licence types', () => {
    for (const t of VASP_LICENCE_TYPES) {
      expect(productTypesRequireSec([t])).toBe(true);
    }
    expect(productTypesRequireSec(['PAYMENT'])).toBe(false);
  });

  it('isVaspLicenceType is case-sensitive on input', () => {
    expect(isVaspLicenceType('RATOP')).toBe(true);
    expect(isVaspLicenceType('ratop')).toBe(false);
  });
});
