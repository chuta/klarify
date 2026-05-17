// CLAUDE.md §7 — Brand & Design Tokens. VERBATIM.

export const colors = {
  // Primary brand
  klarifyTeal: '#0B6E6E', // Primary — trust, navigation, depth
  klarifyNavy: '#0D2B45', // Secondary — authority, stability
  klarifyGold: '#D4A843', // Accent — achievement, milestones

  // Backgrounds
  bgPrimary: '#FAFAFA',
  bgTeal: '#E6F4F4',
  bgNavy: '#E8EEF4',
  bgGold: '#FDF6E3',
  bgGrey: '#F5F5F5',

  // Status (CRITICAL — used for compliance urgency indicators)
  statusCritical: '#C0392B', // Red — 0-40 readiness score
  statusHigh: '#D4A843',     // Amber — in progress
  statusGood: '#1A7A4A',     // Green — 71-90 readiness score
  statusReady: '#0B6E6E',    // Teal — 91-100 regulator ready

  // Text
  textPrimary: '#1A1A1A',
  textMuted: '#555555',
  textLight: '#CCCCCC',

  // Neutral
  white: '#FFFFFF',
  borderGrey: '#CCCCCC',
} as const;

export type ColorToken = keyof typeof colors;

export function getScoreColor(score: number): string {
  if (score <= 40) return colors.statusCritical;
  if (score <= 70) return colors.statusHigh;
  if (score <= 90) return colors.statusGood;
  return colors.statusReady;
}

export function getScoreLabel(score: number): 'Critical' | 'In Progress' | 'Good Standing' | 'Regulator Ready' {
  if (score <= 40) return 'Critical';
  if (score <= 70) return 'In Progress';
  if (score <= 90) return 'Good Standing';
  return 'Regulator Ready';
}
