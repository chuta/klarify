// CLAUDE.md §7 — Typography tokens. VERBATIM.

export const typography = {
  fontFamily: {
    primary: 'Inter',
    mono: 'JetBrains Mono', // for regulatory citations
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16, // minimum body size (CLAUDE.md §7)
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
} as const;

export type FontSizeToken = keyof typeof typography.fontSize;
