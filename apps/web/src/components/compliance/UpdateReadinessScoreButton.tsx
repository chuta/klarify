'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export interface UpdateReadinessScoreButtonProps {
  accessToken: string;
  /** When true, use a more prominent style (score at 0 after onboarding). */
  emphasize?: boolean;
}

/**
 * Rebuilds the Readiness Score from onboarding infrastructure + snapshot + roadmap.
 * Does not re-run the full onboarding wizard — calls POST /api/compliance/score/recalculate.
 */
export function UpdateReadinessScoreButton({
  accessToken,
  emphasize = false,
}: UpdateReadinessScoreButtonProps): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compliance/score/recalculate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const body: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof body === 'object' &&
          body !== null &&
          'error' in body &&
          typeof (body as { error: unknown }).error === 'string'
            ? (body as { error: string }).error
            : 'Could not update your score. Try again.';
        setError(msg);
        return;
      }
      router.refresh();
    } catch {
      setError('Network error — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={loading}
        className={[
          'rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-wait disabled:opacity-60',
          emphasize
            ? 'bg-[#D4A843] text-[#1A1A1A] hover:bg-[#c4983a]'
            : 'border border-[#CCCCCC] text-[#555555] hover:border-[#0B6E6E] hover:text-[#0B6E6E] hover:bg-[#FAFAFA]',
        ].join(' ')}
      >
        {loading ? 'Updating…' : 'Update your Readiness Score'}
      </button>
      {error !== null && (
        <p className="text-xs text-[#C0392B]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
