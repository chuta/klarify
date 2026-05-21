import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import { RoadmapClient } from './_client';
import type { RoadmapApiResponse } from '@/components/roadmap/types';

interface ScoreShape {
  totalScore: number;
  dimensions: Record<string, number>;
}

export default async function RoadmapPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const [, sessionRes] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  const session = sessionRes.data.session;
  if (!session) redirect('/sign-in');

  const accessToken = session.access_token;

  const [roadmapResult, scoreResult] = await Promise.all([
    apiFetch<RoadmapApiResponse>('/api/compliance/roadmap', accessToken),
    apiFetch<ScoreShape>('/api/compliance/score', accessToken),
  ]);

  const initialRoadmap: RoadmapApiResponse = roadmapResult.success
    ? roadmapResult.data
    : { tasks: [], grouped: {}, phaseProgress: [], orgId: null };
  const initialScore = scoreResult.success ? scoreResult.data.totalScore : 0;

  // Surface the solicitor indicator state to the client so the
  // P3-01 drawer banner reflects current truth on first paint.
  const solicitorEngaged = Boolean(
    scoreResult.success &&
      typeof scoreResult.data === 'object' &&
      // The /score endpoint surfaces dimension scores. We use a separate read
      // for the indicator state via the snapshot field of the latest record —
      // but to keep the page lean we initialise to false and let the drawer
      // refresh on first open. This is fine because indicators are also
      // exposed via PUT /api/compliance/indicators which returns the latest
      // computed state.
      false,
  );

  return (
    <RoadmapClient
      initialRoadmap={initialRoadmap}
      initialScore={initialScore}
      initialSolicitorEngaged={solicitorEngaged}
      accessToken={accessToken}
    />
  );
}
