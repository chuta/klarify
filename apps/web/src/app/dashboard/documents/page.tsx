import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DocumentUploader } from '@/components/documents/DocumentUploader';
import { getApiBaseUrl } from '@/lib/env';
import { prisma } from '@/lib/db';

/**
 * /dashboard/documents — Document Analyser entry (Sprint 3 S3-B2).
 *
 * Server component:
 *   1. Gates on auth.
 *   2. Loads the user's most-recent uploaded documents for the "Recent" tab
 *      (SSR so the first paint already shows the list).
 *   3. Renders the three-tab uploader. All submission flows route to
 *      /dashboard/documents/[id] where the polling + results live.
 *
 * The Generator placeholder card moves to /dashboard/documents/generate
 * once Sprint 4 lands.
 */
export default async function DocumentsPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  // SSR-load recent documents directly from the DB rather than going via the
  // API — Netlify Functions cold-start makes the extra hop noticeable.
  const recent = await loadRecentDocs(user.id);

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">
          Regulatory letter analyser
        </h1>
        <p className="mt-1 text-sm text-[#555]">
          Upload a letter from SEC Nigeria, CBN, NFIU, or any regulator. Klarify
          will give you a plain-English breakdown, urgency rating, 72-hour
          action plan, and a draft response — in under 30 seconds.
        </p>
      </header>

      <DocumentUploader
        apiBaseUrl={getApiBaseUrl()}
        recentDocs={recent}
      />

      {/* Legal disclaimer — CLAUDE.md §16 Rule 1 */}
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          All generated analyses and draft responses are first drafts for
          review. Klarify provides regulatory information, not legal advice.
          Review any submission with a qualified practitioner before sending.
        </p>
      </div>
    </div>
  );
}

interface RecentDoc {
  id: string;
  filename: string;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  uploadedAt: string;
  status: string;
}

async function loadRecentDocs(userId: string): Promise<RecentDoc[]> {
  try {
    const docs = await prisma.uploadedDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        filename: true,
        urgencyLevel: true,
        uploadedAt: true,
        status: true,
      },
    });
    return docs.map((d) => ({
      id: d.id,
      filename: d.filename,
      urgencyLevel: (d.urgencyLevel ?? null) as
        | 'CRITICAL'
        | 'HIGH'
        | 'MEDIUM'
        | 'LOW'
        | null,
      uploadedAt: d.uploadedAt.toISOString(),
      status: d.status,
    }));
  } catch (err) {
    console.warn('[documents] recent docs query failed', err);
    return [];
  }
}
