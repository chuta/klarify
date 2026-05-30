'use server';

import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import type { ReadinessReassessmentInput } from '@klarify/core';

interface ReassessmentResult {
  error?: string;
  score?: number;
}

export async function submitReadinessReassessment(
  data: ReadinessReassessmentInput,
): Promise<ReassessmentResult> {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Your session has expired. Please sign in again.' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return { error: 'Your session has expired. Please sign in again.' };
  }

  const result = await apiFetch<{ totalScore: number }>(
    '/api/compliance/score/reassess',
    session.access_token,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

  if (!result.success) {
    return { error: result.error ?? 'Re-assessment failed. Please try again.' };
  }

  return { score: result.data.totalScore };
}
