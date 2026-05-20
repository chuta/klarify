import { describe, it, expect } from 'vitest';
import { parseFrame } from '../../chat/streaming.js';

describe('parseFrame', () => {
  it('parses a chunk frame', () => {
    const raw = 'event: chunk\ndata: {"type":"chunk","content":"Hello "}';
    const parsed = parseFrame(raw);
    expect(parsed).toEqual({ type: 'chunk', content: 'Hello ' });
  });

  it('parses a done frame with citations and quota', () => {
    const data = {
      type: 'done',
      conversationId: 'conv-1',
      messageId: 'msg-1',
      citations: [{ raw: 'ISA 2025, Section 357', regulation: 'ISA 2025', section: 'Section 357', url: 'https://sec.gov.ng' }],
      queriesUsed: 5,
      queriesLimit: 50,
      plan: 'navigator',
      chunksUsed: 6,
    };
    const raw = `event: done\ndata: ${JSON.stringify(data)}`;
    const parsed = parseFrame(raw);
    expect(parsed?.type).toBe('done');
    if (parsed?.type !== 'done') return;
    expect(parsed.conversationId).toBe('conv-1');
    expect(parsed.citations).toHaveLength(1);
    expect(parsed.queriesUsed).toBe(5);
    expect(parsed.plan).toBe('navigator');
  });

  it('treats null queriesLimit (unlimited) correctly', () => {
    const raw =
      'event: done\ndata: ' +
      JSON.stringify({
        type: 'done',
        conversationId: 'c',
        messageId: 'm',
        citations: [],
        queriesUsed: 1,
        queriesLimit: null,
        plan: 'compass',
        chunksUsed: 4,
      });
    const parsed = parseFrame(raw);
    if (parsed?.type !== 'done') throw new Error('expected done');
    expect(parsed.queriesLimit).toBeNull();
  });

  it('parses an error frame', () => {
    const raw =
      'event: error\ndata: {"type":"error","code":"STREAM_ERROR","message":"oops"}';
    const parsed = parseFrame(raw);
    expect(parsed).toEqual({
      type: 'error',
      code: 'STREAM_ERROR',
      message: 'oops',
    });
  });

  it('falls back to JSON payload type when event: line is missing', () => {
    const raw = 'data: {"type":"chunk","content":"x"}';
    const parsed = parseFrame(raw);
    expect(parsed).toEqual({ type: 'chunk', content: 'x' });
  });

  it('ignores keep-alive comments', () => {
    expect(parseFrame(': keep-alive')).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseFrame('event: chunk\ndata: not json')).toBeNull();
  });

  it('returns null for unrecognised event types', () => {
    expect(
      parseFrame('event: weirdo\ndata: {"type":"weirdo"}'),
    ).toBeNull();
  });

  it('handles multi-line data payloads (concatenates with newline)', () => {
    const raw =
      'event: done\n' +
      'data: {"type":"done","conversationId":"c","messageId":"m",\n' +
      'data: "citations":[],"queriesUsed":0,"queriesLimit":null,"plan":"free","chunksUsed":0}';
    const parsed = parseFrame(raw);
    expect(parsed?.type).toBe('done');
  });
});
