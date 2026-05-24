'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface JoinTeamClientProps {
  inviteId: string;
  organisationName: string;
  role: string;
  invitedEmail: string;
  userEmail: string;
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrator',
    member: 'Team member',
    viewer: 'Viewer (read-only)',
  };
  return map[role] ?? role;
}

export function JoinTeamClient({
  inviteId,
  organisationName,
  role,
  invitedEmail,
  userEmail,
}: JoinTeamClientProps): JSX.Element {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMismatch = userEmail.toLowerCase() !== invitedEmail.toLowerCase();

  async function handleAccept(): Promise<void> {
    setAccepting(true);
    setError(null);

    try {
      const supabase = (await import('@/lib/supabase/client')).createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push(`/sign-in?next=${encodeURIComponent(`/dashboard/join-team?invite=${inviteId}`)}`);
        return;
      }

      const res = await fetch('/api/invites/accept-by-id', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteId }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) {
        setError(json.error ?? 'Failed to join the team.');
        return;
      }
      router.push('/dashboard/welcome');
      router.refresh();
    } catch {
      setError('Failed to join the team. Please try again.');
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-2xl border border-[#CCCCCC] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0B6E6E]">
          Team invitation
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#1A1A1A]">
          Join {organisationName}
        </h1>
        <p className="mt-2 text-sm text-[#555555]">
          You&apos;ve been invited as a <strong>{formatRole(role)}</strong>.
          Accept to access your organisation&apos;s compliance workspace — you
          won&apos;t need to set up a new organisation.
        </p>

        <div className="mt-6 space-y-2 rounded-xl bg-[#FAFAFA] px-4 py-4 text-sm text-[#555555]">
          <p>
            <span className="font-medium text-[#1A1A1A]">Invited email:</span> {invitedEmail}
          </p>
          <p>
            <span className="font-medium text-[#1A1A1A]">Signed in as:</span> {userEmail}
          </p>
        </div>

        {emailMismatch && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This invitation was sent to <strong>{invitedEmail}</strong>. Sign out and
            sign in with that email to accept.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleAccept()}
          disabled={accepting || emailMismatch}
          className="mt-6 w-full rounded-xl bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
        >
          {accepting ? 'Joining…' : 'Accept invitation →'}
        </button>
      </div>
    </div>
  );
}
