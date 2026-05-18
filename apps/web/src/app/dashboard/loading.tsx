/**
 * Dashboard segment loading skeleton.
 *
 * Next.js renders this as the <Suspense> fallback for every page inside
 * /dashboard/* while the corresponding Server Component is rendering on
 * the server (Supabase auth + apiFetch round-trips). Because there is no
 * loading.tsx in any nested dashboard segment, this one file is the
 * fallback for ALL dashboard routes — /dashboard, /dashboard/roadmap,
 * /dashboard/regulators/arip, /dashboard/calendar, etc.
 *
 * Design constraints:
 *   - Mirror the dashboard page container (max-w-5xl) so the skeleton
 *     occupies the same footprint as the eventual content.
 *   - Generic enough to look reasonable in front of any dashboard page,
 *     not just the score gauge.
 *   - No client JS, no data fetching — this file must be instant.
 *
 * Colour tokens align with CLAUDE.md §7 (brand tokens).
 */

function ShimmerBar({ className = '' }: { className?: string }): JSX.Element {
  return <div className={`animate-pulse rounded bg-[#E6F4F4] ${className}`} />;
}

function ShimmerCard({ className = '' }: { className?: string }): JSX.Element {
  return (
    <div className={`animate-pulse rounded-2xl border border-[#CCCCCC] bg-white p-6 ${className}`}>
      <div className="mb-3 h-3 w-1/3 rounded bg-[#E6F4F4]" />
      <div className="mb-2 h-7 w-2/3 rounded bg-[#E6F4F4]" />
      <div className="h-2 w-full rounded bg-[#F5F5F5]" />
    </div>
  );
}

export default function DashboardLoading(): JSX.Element {
  return (
    <div className="max-w-5xl mx-auto" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading dashboard…</span>

      {/* ── Welcome header skeleton ─────────────────────────────────── */}
      <div className="mb-8">
        <ShimmerBar className="mb-3 h-7 w-72" />
        <ShimmerBar className="h-3 w-96" />
      </div>

      {/* ── Hero card (gauge + copy area) ───────────────────────────── */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-[#CCCCCC] bg-white shadow-sm">
        <div className="flex flex-col items-center gap-8 p-8 md:flex-row">
          {/* Gauge placeholder — circular */}
          <div className="shrink-0">
            <div className="h-[220px] w-[220px] animate-pulse rounded-full border-[12px] border-[#E6F4F4]" />
          </div>

          {/* Copy column */}
          <div className="flex-1 space-y-3">
            <ShimmerBar className="h-3 w-40" />
            <ShimmerBar className="h-9 w-48" />
            <ShimmerBar className="h-3 w-full" />
            <ShimmerBar className="h-3 w-5/6" />
            <ShimmerBar className="h-3 w-2/3" />
            <div className="mt-5 flex gap-3">
              <ShimmerBar className="h-10 w-32" />
              <ShimmerBar className="h-10 w-40" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Section heading ─────────────────────────────────────────── */}
      <ShimmerBar className="mb-4 h-4 w-52" />

      {/* ── Grid of secondary cards ─────────────────────────────────── */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <ShimmerCard key={i} />
        ))}
      </div>
    </div>
  );
}
