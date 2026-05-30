'use client';

// =============================================================================
// ScoreHistorySection — client wrapper that owns the `days` state and
// re-fetches score history data when the user switches between 30/60/90d.
//
// Pattern: server component fetches initial data + passes accessToken; this
// wrapper handles the interactive days-switching entirely client-side.
// CLAUDE.md §3: client fetches must use NEXT_PUBLIC_API_URL (Fly origin).
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import {
  ScoreHistoryChart,
  type ScorePoint,
} from '@/components/compliance/ScoreHistoryChart';
import { track } from '@/lib/analytics/events';

interface ScoreHistoryData {
  days: number;
  points: ScorePoint[];
  current: ScorePoint | null;
  baseline: ScorePoint | null;
  delta: number;
}

interface ScoreHistorySectionProps {
  initialData: ScoreHistoryData;
  accessToken: string;
}

export function ScoreHistorySection({
  initialData,
  accessToken,
}: ScoreHistorySectionProps): JSX.Element {
  const [data, setData] = useState<ScoreHistoryData>(initialData);
  const [days, setDays] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    track('readiness_score_viewed', {
      score: initialData.current?.total ?? undefined,
    });
    // Fire once on mount — the dashboard score view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDaysChange = useCallback(
    async (newDays: 30 | 60 | 90) => {
      if (newDays === days) return;
      setDays(newDays);
      setLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
        const res = await fetch(
          `${apiBase}/api/compliance/score/history?days=${newDays}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          },
        );
        if (res.ok) {
          const body = (await res.json()) as { success: boolean; data: ScoreHistoryData };
          if (body.success) setData(body.data);
        }
      } catch (err) {
        console.error('[ScoreHistorySection] fetch error', err);
      } finally {
        setLoading(false);
      }
    },
    [days, accessToken],
  );

  return (
    <div
      className={[
        'rounded-2xl border border-[#CCCCCC] bg-white p-6 shadow-sm transition-opacity duration-150',
        loading ? 'opacity-60' : 'opacity-100',
      ].join(' ')}
    >
      <ScoreHistoryChart
        points={data.points}
        days={days}
        delta={data.delta}
        onDaysChange={handleDaysChange}
      />
    </div>
  );
}
