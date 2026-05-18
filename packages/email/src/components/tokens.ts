// Email-safe brand tokens. Mirrors packages/ui/src/tokens/colors.ts
// but as plain hex strings (no Tailwind, no React Native StyleSheet —
// emails are rendered as inline-styled HTML).
//
// Source: CLAUDE.md §7 — Brand & Design Tokens.

export const emailColors = {
  klarifyTeal: '#0B6E6E',
  klarifyNavy: '#0D2B45',
  klarifyGold: '#D4A843',

  bgPrimary: '#FAFAFA',
  bgTeal:    '#E6F4F4',
  bgNavy:    '#E8EEF4',
  bgGold:    '#FDF6E3',
  bgGrey:    '#F5F5F5',

  statusCritical: '#C0392B',
  statusHigh:     '#D4A843',
  statusGood:     '#1A7A4A',
  statusReady:    '#0B6E6E',

  textPrimary: '#1A1A1A',
  textMuted:   '#555555',
  textLight:   '#CCCCCC',

  white:       '#FFFFFF',
  borderGrey:  '#E5E7EB',
} as const;

export const emailFonts = {
  // Wide fallback stack — Inter only loads on platforms that support webfonts
  // in email (Apple Mail, iOS, mostly). Everywhere else falls through to
  // system sans. We never rely on Inter being available.
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
} as const;

export const emailLayout = {
  contentWidth: 600,           // standard email max width
  paddingX:     32,
  paddingY:     32,
  radius:       8,
} as const;

export function urgencyColor(
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
): { bg: string; fg: string; border: string } {
  switch (level) {
    case 'CRITICAL':
      return { bg: '#FDECEA', fg: '#C0392B', border: '#C0392B' };
    case 'HIGH':
      return { bg: '#FDF6E3', fg: '#8A6D1F', border: '#D4A843' };
    case 'MEDIUM':
      return { bg: '#E8EEF4', fg: '#0D2B45', border: '#0D2B45' };
    case 'LOW':
      return { bg: '#E6F4F4', fg: '#0B6E6E', border: '#0B6E6E' };
  }
}

export function readinessColor(score: number): string {
  if (score <= 40) return emailColors.statusCritical;
  if (score <= 70) return emailColors.statusHigh;
  if (score <= 90) return emailColors.statusGood;
  return emailColors.statusReady;
}

export function readinessLabel(score: number): string {
  if (score <= 40) return 'Critical';
  if (score <= 70) return 'In Progress';
  if (score <= 90) return 'Good Standing';
  return 'Regulator Ready';
}
