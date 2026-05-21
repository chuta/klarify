'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ProcessingStepper } from '@/components/documents/ProcessingStepper';
import {
  DocumentAnalysisResult,
  type AnalysisResult,
} from '@/components/documents/DocumentAnalysisResult';

type Status = 'pending' | 'extracting' | 'analysing' | 'complete' | 'error';

interface InitialState {
  status: Status;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
  errorMessage: string | null;
  analysisResult: unknown | null;
  filename: string;
}

/**
 * Client component that owns the polling loop for a single document.
 * Server hydrates `initial` from Prisma; we then poll the status endpoint
 * every 2s until the document is in a terminal state.
 *
 * Why polling instead of SSE: the analysis queue is in-process on Fly, but
 * Netlify's CDN does not stream SSE for non-streaming Next.js page-level
 * components. Polling is simpler, works through every proxy, and is cheap
 * (status endpoint is a single SELECT on the indexed status column).
 */
export function DocumentDetailClient({
  documentId,
  initial,
  apiBaseUrl,
}: {
  documentId: string;
  initial: InitialState;
  apiBaseUrl: string;
}): JSX.Element {
  const router = useRouter();
  const baseUrl = apiBaseUrl.replace(/\/$/, '');

  const [status, setStatus] = useState<Status>(initial.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initial.errorMessage,
  );
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    initial.analysisResult as AnalysisResult | null,
  );
  const [refreshing, setRefreshing] = useState(false);
  const cancelledRef = useRef(false);

  const isTerminal = status === 'complete' || status === 'error';

  // Polling loop.
  useEffect(() => {
    if (isTerminal && analysisResult) return; // nothing to do
    if (isTerminal && status === 'error') return;
    cancelledRef.current = false;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async (): Promise<void> => {
      if (cancelledRef.current) return;
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) return;
        const res = await fetch(`${baseUrl}/api/documents/${documentId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const body = (await res.json()) as
          | {
              success: true;
              data: {
                status: Status;
                urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | null;
                errorMessage: string | null;
              };
            }
          | { success: false; error: string };
        if (!body.success) {
          setErrorMessage(body.error);
          setStatus('error');
          return;
        }
        setStatus(body.data.status);
        setErrorMessage(body.data.errorMessage);
        if (body.data.status === 'complete' && !analysisResult) {
          await fetchResult(token);
          return;
        }
        if (body.data.status === 'error') return;
      } catch (err) {
        // Network blip — keep polling.
        console.warn('[documents] status poll failed', err);
      }
      timer = setTimeout(() => void tick(), 2000);
    };

    const fetchResult = async (token: string): Promise<void> => {
      try {
        const res = await fetch(`${baseUrl}/api/documents/${documentId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const body = (await res.json()) as
          | {
              success: true;
              data: { analysisResult: AnalysisResult | null };
            }
          | { success: false; error: string };
        if (body.success && body.data.analysisResult) {
          setAnalysisResult(body.data.analysisResult);
          setStatus('complete');
        }
      } catch (err) {
        console.warn('[documents] result fetch failed', err);
      }
    };

    void tick();

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [baseUrl, documentId, isTerminal, status, analysisResult]);

  // ---------- Render ----------

  if (status === 'complete' && analysisResult) {
    return (
      <DocumentAnalysisResult
        documentId={documentId}
        filename={initial.filename}
        result={analysisResult}
        apiBaseUrl={baseUrl}
      />
    );
  }

  if (status === 'error') {
    return (
      <div className="space-y-4">
        <ProcessingStepper status="error" errorMessage={errorMessage} />
        <button
          type="button"
          onClick={() => router.push('/dashboard/documents')}
          className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a5a5a]"
        >
          Try another document
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <ProcessingStepper status={status} />
      <button
        type="button"
        onClick={() => {
          setRefreshing(true);
          router.refresh();
          setTimeout(() => setRefreshing(false), 800);
        }}
        className="text-xs text-[#0B6E6E] hover:underline"
      >
        {refreshing ? 'Refreshing…' : 'Not seeing updates? Refresh now.'}
      </button>
    </div>
  );
}
