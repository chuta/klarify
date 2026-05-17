import Anthropic from '@anthropic-ai/sdk';

// Model role assignments — driven by env (CLAUDE.md §15).
// Defaults match CLAUDE.md §3 + §15: advisory work uses claude-sonnet-4-5.
export const KLARIFY_MODELS = {
  advisory: process.env.ANTHROPIC_MODEL_ADVISORY ?? 'claude-sonnet-4-5',
  architect: process.env.ANTHROPIC_MODEL_ARCH ?? 'claude-opus-4',
  simple: process.env.ANTHROPIC_MODEL_SIMPLE ?? 'claude-haiku-4-5',
} as const;

export type KlarifyModelRole = keyof typeof KLARIFY_MODELS;

let cached: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set. See .env.example.');
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export function getKlarifyModel(role: KlarifyModelRole): string {
  return KLARIFY_MODELS[role];
}
