import { describe, it, expect } from 'vitest';
import {
  applyDiscount,
  formatDiscountLabel,
  normalizeCouponCode,
} from '../../services/couponService.js';

describe('normalizeCouponCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCouponCode('  compass20  ')).toBe('COMPASS20');
  });
});

describe('applyDiscount', () => {
  it('applies percent discount', () => {
    expect(
      applyDiscount(159_000, { discountType: 'percent', discountValue: 20 }),
    ).toBe(127_200);
  });

  it('applies fixed NGN discount', () => {
    expect(
      applyDiscount(47_000, { discountType: 'fixed_ngn', discountValue: 10_000 }),
    ).toBe(37_000);
  });

  it('never charges below ₦100 minimum', () => {
    expect(
      applyDiscount(500, { discountType: 'fixed_ngn', discountValue: 900 }),
    ).toBe(100);
  });

  it('caps discount at original amount for fixed NGN', () => {
    expect(
      applyDiscount(1_000, { discountType: 'fixed_ngn', discountValue: 5_000 }),
    ).toBe(100);
  });

  it('rounds percent discounts to whole naira', () => {
    expect(
      applyDiscount(47_000, { discountType: 'percent', discountValue: 15 }),
    ).toBe(39_950);
  });
});

describe('formatDiscountLabel', () => {
  it('formats percent', () => {
    expect(formatDiscountLabel({ discountType: 'percent', discountValue: 25 })).toBe('25% off');
  });

  it('formats fixed NGN', () => {
    expect(formatDiscountLabel({ discountType: 'fixed_ngn', discountValue: 5000 })).toBe(
      '₦5,000 off',
    );
  });
});
