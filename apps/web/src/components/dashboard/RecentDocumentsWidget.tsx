import Link from 'next/link';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export interface RecentDoc {
  id: string;
  filename: string;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  uploadedAt: string;
  status: string;
}

const URGENCY_STYLES: Record<
  NonNullable<RecentDoc['urgencyLevel']>,
  string
> = {
  CRITICAL: 'bg-[#C0392B] text-white',
  HIGH: 'bg-[#D4A843] text-[#1A1A1A]',
  MEDIUM: 'bg-[#0D2B45] text-white',
  LOW: 'bg-[#1A7A4A] text-white',
};

/**
 * Dashboard "Recent documents" widget (CLAUDE.md S3-C2).
 *
 * CRITICAL documents always sort first regardless of date so the most
 * urgent items stay above the fold. Up to 3 documents shown; link to
 * the analyser landing page for the full history.
 */
export function RecentDocumentsWidget({
  docs,
}: {
  docs: RecentDoc[];
}): JSX.Element {
  const sorted = [...docs].sort((a, b) => {
    if (a.urgencyLevel === 'CRITICAL' && b.urgencyLevel !== 'CRITICAL') return -1;
    if (b.urgencyLevel === 'CRITICAL' && a.urgencyLevel !== 'CRITICAL') return 1;
    return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
  });
  const top = sorted.slice(0, 3);

  return (
    <div className="rounded-2xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#1A1A1A]">
          Recent regulatory documents
        </h2>
        <Link
          href="/dashboard/documents"
          className="text-xs font-semibold text-[#0B6E6E] hover:underline"
        >
          View all →
        </Link>
      </div>

      {top.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#CCCCCC] bg-[#FAFAFA] px-4 py-6 text-center">
          <p className="text-sm text-[#555]">
            No documents analysed yet.
          </p>
          <p className="mt-1 text-xs text-[#999]">
            Upload a letter from your regulator and get an action plan in 30 seconds.
          </p>
          <Link
            href="/dashboard/documents"
            className="mt-3 inline-block rounded-lg bg-[#0B6E6E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a5a5a]"
          >
            Upload your first document
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {top.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/dashboard/documents/${doc.id}`}
                className="flex items-center gap-3 rounded-lg border border-[#F5F5F5] px-3 py-2 hover:bg-[#FAFAFA]"
              >
                <DocumentTextIcon className="h-5 w-5 shrink-0 text-[#0B6E6E]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[#1A1A1A]">
                    {doc.filename}
                  </p>
                  <p className="text-[11px] text-[#777]">
                    {relativeTime(doc.uploadedAt)} ·{' '}
                    <span className="capitalize">
                      {doc.status === 'complete' ? 'Analysed' : doc.status}
                    </span>
                  </p>
                </div>
                {doc.urgencyLevel && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${URGENCY_STYLES[doc.urgencyLevel]}`}
                  >
                    {doc.urgencyLevel}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)} min ago`;
  if (diffSec < 86_400) return `${Math.round(diffSec / 3600)} h ago`;
  if (diffSec < 604_800) return `${Math.round(diffSec / 86_400)} d ago`;
  return new Date(iso).toLocaleDateString();
}
