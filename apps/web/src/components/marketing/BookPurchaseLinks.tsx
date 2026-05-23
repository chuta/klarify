const BOOK_LINKS = {
  selar: {
    href: 'https://selar.com/g5525p7n52',
    label: 'Nigeria (Selar)',
    ariaLabel: 'Purchase The Founder\'s Guide on Selar — Nigeria (opens in new tab)',
  },
  gumroad: {
    href: 'https://chuta.gumroad.com/l/lghqcj',
    label: 'International (Gumroad)',
    ariaLabel: 'Purchase The Founder\'s Guide on Gumroad — international (opens in new tab)',
  },
} as const;

/**
 * Blockquote attribution + regional purchase links for The Founder's Guide.
 * Citation stays typographic; commerce links sit on a separate muted line.
 */
export function BookPurchaseLinks(): JSX.Element {
  return (
    <footer className="mt-4 text-center text-sm not-italic">
      <p className="font-semibold text-[#0B6E6E]">
        — <em>The Founder&apos;s Guide to Building in Regulated Markets</em>, Chimezie Chuta, 2026
      </p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-normal text-[#555555]">
        <span>Digital edition:</span>
        <PurchaseLink {...BOOK_LINKS.selar} />
        <span className="text-[#CCCCCC]" aria-hidden>
          ·
        </span>
        <PurchaseLink {...BOOK_LINKS.gumroad} />
      </p>
    </footer>
  );
}

interface PurchaseLinkProps {
  href: string;
  label: string;
  ariaLabel: string;
}

function PurchaseLink({ href, label, ariaLabel }: PurchaseLinkProps): JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1 font-semibold text-[#0B6E6E] transition hover:text-[#0A5F5F] hover:underline"
    >
      {label}
      <ExternalLinkIcon />
    </a>
  );
}

function ExternalLinkIcon(): JSX.Element {
  return (
    <svg
      className="h-3 w-3 shrink-0 opacity-70"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}
