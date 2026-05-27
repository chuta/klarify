'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { WhitePaperProcessingStepper } from '@/components/documents/WhitePaperProcessingStepper';
import { WhitePaperAnalysisResultView } from '@/components/documents/WhitePaperAnalysisResult';
import type { WhitePaperAnalysisResult } from '@klarify/core';

type Status = 'pending' | 'extracting' | 'analysing' | 'complete' | 'error';

interface InitialState {
  status: Status;
  errorMessage: string | null;
  result: WhitePaperAnalysisResult | null;
  filename: string;
}

export function WhitePaperDetailClient({
  analysisId,
  initial,
  apiBaseUrl,
}: {
  analysisId: string;
  initial: InitialState;
  apiBaseUrl: string;
}): JSX.Element {
  const baseUrl = apiBaseUrl.replace(/\/$/, '');
  const [status, setStatus] = useState<Status>(initial.status);
  const [errorMessage, setErrorMessage] = useState<string | null>(initial.errorMessage);
  const [result, setResult] = useState<WhitePaperAnalysisResult | null>(initial.result);
  const cancelledRef = useRef(false);

  const isTerminal = status === 'complete' || status === 'error';

  useEffect(() => {
    if (isTerminal && result) return;
    if (isTerminal && status === 'error') return;
    cancelledRef.current = false;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchResult = async (token: string): Promise<void> => {
      const res = await fetch(`${baseUrl}/api/documents/whitepaper/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = (await res.json()) as
        | { success: true; data: { result: WhitePaperAnalysisResult | null; status: Status } }
        | { success: false; error: string };
      if (body.success && body.data.result) {
        setResult(body.data.result);
        setStatus('complete');
      }
    };

    const tick = async (): Promise<void> => {
      if (cancelledRef.current) return;
      try {
        const supabase = createClient();
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (!token) return;
        const res = await fetch(`${baseUrl}/api/documents/whitepaper/${analysisId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const body = (await res.json()) as
          | {
              success: true;
              data: { status: Status; errorMessage: string | null };
            }
          | { success: false; error: string };
        if (!body.success) {
          setErrorMessage(body.error);
          setStatus('error');
          return;
        }
        setStatus(body.data.status);
        setErrorMessage(body.data.errorMessage);
        if (body.data.status === 'complete' && !result) {
          await fetchResult(token);
          return;
        }
        if (body.data.status === 'error') return;
      } catch (err) {
        console.warn('[whitepaper] poll failed', err);
      }
      timer = setTimeout(() => void tick(), 2000);
    };

    void tick();
    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [baseUrl, analysisId, isTerminal, status, result]);

  if (status === 'complete' && result) {
    return (
      <WhitePaperAnalysisResultView
        analysisId={analysisId}
        filename={initial.filename}
        result={result}
        apiBaseUrl={apiBaseUrl}
      />
    );
  }

  if (status === 'error') {
    return (
      <WhitePaperProcessingStepper status="error" errorMessage={errorMessage} />
    );
  }

  return <WhitePaperProcessingStepper status={status} errorMessage={errorMessage} />;
}
