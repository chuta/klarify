// Utility formatting functions — CLAUDE.md §3 (Tech Stack).
import type { DimensionKey } from '../compliance/readinessScore.js';

/**
 * Format a readiness score as a plain string.
 * e.g. 42 → "42"
 */
export function formatScore(score: number): string {
  return String(Math.round(score));
}

/**
 * Convert a dimension key to a human-readable label.
 * e.g. "corporate_structure" → "Corporate Structure"
 */
export function formatDimensionName(key: DimensionKey): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert an indicator key to a human-readable label.
 * e.g. "cac_registered" → "CAC Registered"
 */
export function formatIndicatorName(key: string): string {
  // Handle fully-qualified "dimension.indicator_key" format.
  const dotIndex = key.indexOf('.');
  const indicatorPart = dotIndex !== -1 ? key.slice(dotIndex + 1) : key;
  return indicatorPart
    .split('_')
    .map((word) => word.toUpperCase() === word ? word : word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/**
 * Format a date as "15 May 2026".
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month ?? ''} ${year}`;
}

/**
 * Format a date as a relative string — "3 days ago", "just now", "in 2 days".
 * Uses a simple threshold approach (no external library).
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) return 'just now';
  if (diffSec < 0) {
    // future
    const absSec = Math.abs(diffSec);
    const absMin = Math.round(absSec / 60);
    const absHour = Math.round(absMin / 60);
    const absDay = Math.round(absHour / 24);
    if (absSec < 3600) return `in ${absMin} minute${absMin !== 1 ? 's' : ''}`;
    if (absHour < 24) return `in ${absHour} hour${absHour !== 1 ? 's' : ''}`;
    return `in ${absDay} day${absDay !== 1 ? 's' : ''}`;
  }
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
}

/**
 * Format a monetary amount.
 * Default currency is NGN (₦).
 * e.g. formatCurrency(29000) → "₦29,000"
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
  const symbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency;
  const formatted = amount.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
