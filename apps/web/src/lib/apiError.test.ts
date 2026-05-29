import { describe, expect, it } from 'vitest';
import { formatApiError } from './apiError';

describe('formatApiError', () => {
  it('returns string error from Klarify envelope', () => {
    expect(
      formatApiError({ success: false, error: 'No organisation found.' }),
    ).toBe('No organisation found.');
  });

  it('parses raw Zod safeParse error objects', () => {
    expect(
      formatApiError({
        success: false,
        error: {
          issues: [
            {
              path: ['description'],
              message: 'Please provide at least 50 characters of product description.',
            },
          ],
        },
      }),
    ).toBe('description: Please provide at least 50 characters of product description.');
  });

  it('falls back when error is an unrecognised object', () => {
    expect(formatApiError({ success: false, error: { foo: 'bar' } })).toBe(
      'Something went wrong. Please try again.',
    );
  });
});
