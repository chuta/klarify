import Link from 'next/link';

export interface ReassessReadinessLinkProps {
  /** When true, use a more prominent style (score at 0). */
  emphasize?: boolean;
}

/**
 * Routes to the infrastructure re-assessment wizard — authoritative score rebuild
 * for Post-Letter founders and accounts with stale/zero scores.
 */
export function ReassessReadinessLink({
  emphasize = false,
}: ReassessReadinessLinkProps): JSX.Element {
  return (
    <Link
      href="/dashboard/readiness-assessment"
      className={[
        'rounded-lg px-4 py-2 text-sm font-semibold transition',
        emphasize
          ? 'bg-[#D4A843] text-[#1A1A1A] hover:bg-[#c4983a]'
          : 'border border-[#CCCCCC] text-[#555555] hover:border-[#0B6E6E] hover:text-[#0B6E6E] hover:bg-[#FAFAFA]',
      ].join(' ')}
    >
      Re-assess my infrastructure
    </Link>
  );
}
