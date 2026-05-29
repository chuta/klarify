import { describe, expect, it } from 'vitest';
import {
  buildClassifyPayload,
  CLASSIFY_LIMITS,
  isClassifyFormValid,
  validateClassifyForm,
} from './classifyFormValidation';

const validValues = {
  description: 'A'.repeat(CLASSIFY_LIMITS.minDescription),
  features: ['naira on-ramp'],
  businessModel: '0.2% trading fee',
  targetUsers: 'Retail investors in Nigeria',
  featureDraft: '',
};

describe('validateClassifyForm', () => {
  it('accepts a fully completed form', () => {
    expect(validateClassifyForm(validValues)).toEqual({});
    expect(isClassifyFormValid(validValues)).toBe(true);
  });

  it('rejects description under 50 characters', () => {
    const errors = validateClassifyForm({
      ...validValues,
      description: 'too short',
    });
    expect(errors.description).toMatch(/50 characters/);
  });

  it('rejects description over 4000 characters', () => {
    const errors = validateClassifyForm({
      ...validValues,
      description: 'A'.repeat(CLASSIFY_LIMITS.maxDescription + 1),
    });
    expect(errors.description).toMatch(/4000 characters/);
  });

  it('rejects empty business model and target users', () => {
    const errors = validateClassifyForm({
      ...validValues,
      businessModel: '   ',
      targetUsers: '',
    });
    expect(errors.businessModel).toBeTruthy();
    expect(errors.targetUsers).toBeTruthy();
  });

  it('rejects unsubmitted feature draft text', () => {
    const errors = validateClassifyForm({
      ...validValues,
      featureDraft: 'pending feature',
    });
    expect(errors.featureDraft).toMatch(/Press Enter/);
  });
});

describe('buildClassifyPayload', () => {
  it('trims fields and never sends empty strings', () => {
    const description = `  ${'hello world '.repeat(5).trim()}  `.padEnd(
      CLASSIFY_LIMITS.minDescription + 4,
      'x',
    );
    expect(
      buildClassifyPayload({
        description,
        features: ['  kyc  '],
        businessModel: '  fees  ',
        targetUsers: '  retail  ',
        featureDraft: '',
      }),
    ).toEqual({
      description: description.trim(),
      features: ['kyc'],
      businessModel: 'fees',
      targetUsers: 'retail',
    });
  });
});
