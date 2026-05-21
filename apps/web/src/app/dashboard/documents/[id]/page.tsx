import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db';
import { getApiBaseUrl } from '@/lib/env';
import { DocumentDetailClient } from './_client';

/**
 * /dashboard/documents/[id] — Single-document analyser result (Sprint 3 S3-B2).
 *
 * Server component loads the document by id (RLS-scoped to the caller via
 * prisma findFirst). Hands off to DocumentDetailClient which:
 *   * Polls /api/documents/:id/status every 2s until status is terminal
 *   * Renders the ProcessingStepper while not terminal
 *   * Renders DocumentAnalysisResult once status === 'complete'
 */
export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  const doc = await prisma.uploadedDocument.findFirst({
    where: { id: params.id, userId: user.id },
    select: {
      id: true,
      filename: true,
      status: true,
      urgencyLevel: true,
      errorMessage: true,
      analysisResult: true,
      uploadedAt: true,
    },
  });

  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <nav className="mb-4 text-xs text-[#777]">
        <Link href="/dashboard/documents" className="hover:text-[#0B6E6E]">
          ← Back to analyser
        </Link>
      </nav>

      <header className="mb-6">
        <h1 className="text-xl font-semibold text-[#1A1A1A]">{doc.filename}</h1>
        <p className="mt-1 text-xs text-[#777]">
          Uploaded {new Date(doc.uploadedAt).toLocaleString('en-NG', {
            dateStyle: 'long',
            timeStyle: 'short',
          })}
        </p>
      </header>

      <DocumentDetailClient
        documentId={doc.id}
        initial={{
          status: doc.status as
            | 'pending'
            | 'extracting'
            | 'analysing'
            | 'complete'
            | 'error',
          urgencyLevel: doc.urgencyLevel as
            | 'CRITICAL'
            | 'HIGH'
            | 'MEDIUM'
            | 'LOW'
            | null,
          errorMessage: doc.errorMessage,
          analysisResult: (doc.analysisResult as unknown) ?? null,
          filename: doc.filename,
        }}
        apiBaseUrl={getApiBaseUrl()}
      />
    </div>
  );
}
