// Pure unit tests for auto-title generation (chat.ts).
import { describe, it, expect } from 'vitest';
import { autoTitleFromMessage } from '../../routes/ai/chat.js';

describe('autoTitleFromMessage', () => {
  it('returns the message as-is when ≤ 60 chars', () => {
    const msg = 'What licences do I need for a Nigerian DAX?';
    expect(autoTitleFromMessage(msg)).toBe(msg);
  });

  it('collapses internal whitespace', () => {
    expect(autoTitleFromMessage('Hello\n\n  world')).toBe('Hello world');
  });

  it('truncates long messages on a word boundary', () => {
    const msg =
      'I received a letter from the SEC Nigeria yesterday and they are asking about my exchange';
    const result = autoTitleFromMessage(msg);
    expect(result.length).toBeLessThanOrEqual(61); // 60 + ellipsis
    expect(result.endsWith('…')).toBe(true);
    expect(result).not.toContain('  '); // no double-spaces
    // Should end on a complete word (no partial-letter cut).
    const lastWord = result.replace('…', '').split(' ').pop();
    expect(lastWord).not.toBe('');
  });

  it('hard-cuts on a single very long word', () => {
    const msg = 'A'.repeat(100);
    const result = autoTitleFromMessage(msg);
    expect(result.length).toBeLessThanOrEqual(61);
    expect(result.endsWith('…')).toBe(true);
  });

  it('trims surrounding whitespace before measuring length', () => {
    const msg = '   short msg   ';
    expect(autoTitleFromMessage(msg)).toBe('short msg');
  });

  it('returns single-word messages unchanged', () => {
    expect(autoTitleFromMessage('ARIP')).toBe('ARIP');
  });
});
