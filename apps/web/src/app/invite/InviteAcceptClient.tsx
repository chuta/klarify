'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface InvitePreview {
  organisationName: string;
  email: string;
  role: string;
  expiresAt: string;
  expired: boolean;
  revoked: boolean;
  accepted: boolean;
}

function formatRole(role: string): string {
  const map: Record<string, string> = {
    admin: 'Administrator',
    member: 'Team member',
    viewer: 'Viewer (read-only)',
  };
  return map[role] ?? role;
}

export function InviteAcceptClient(): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(!!data.user);
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setError('This invitation link is missing a token.');
      setLoading(false);
      return;
    }

    void fetch(`/api/invites/preview?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json();
        if (!json.success) {
          setError(json.error ?? 'Invalid invitation.');
          return;
        }
        setPreview(json.data as InvitePreview);
      })
      .catch(() => setError('Failed to load invitation.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept(): Promise<void> {
    if (!token) return;
    setAccepting(true);
    setError(null);

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push(`/sign-in?next=${encodeURIComponent(`/invite?token=${token}`)}`);
      return;
    }

    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? 'Failed to accept invitation.');
        return;
      }
      router.push('/dashboard/welcome');
    } catch {
      setError('Failed to accept invitation.');
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#CCCCCC] bg-white p-10 text-center text-sm text-[#555555]">
        Loading invitation…
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-red-700">Invalid invitation</h1>
        <p className="mt-2 text-sm text-red-600">{error}</p>
        <Link href="/" className="mt-6 inline-block text-sm text-[#0B6E6E] hover:underline">
          Go to klarify.africa
        </Link>
      </div>
    );
  }

  if (!preview) return <div />;

  const unavailable = preview.expired || preview.revoked || preview.accepted;

  return (
    <div className="rounded-2xl border border-[#CCCCCC] bg-white p-8 shadow-sm">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0B6E6E]">
          Team invitation
        </p>
        <h1 className="mt-2 text-2xl font-bold text-[#1A1A1A]">
          Join {preview.organisationName}
        </h1>
        <p className="mt-2 text-sm text-[#555555]">
          You&apos;ve been invited as a <strong>{formatRole(preview.role)}</strong>
        </p>
      </div>

      {preview.accepted && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          This invitation has already been accepted.
          <Link href="/dashboard" className="ml-1 font-semibold underline">
            Go to dashboard
          </Link>
        </div>
      )}

      {preview.revoked && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This invitation has been revoked. Contact your organisation administrator for a new invite.
        </div>
      )}

      {preview.expired && !preview.accepted && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This invitation expired. Ask your administrator to send a new one.
        </div>
      )}

      {!unavailable && (
        <>
          <div className="mb-6 space-y-2 rounded-xl bg-[#FAFAFA] px-4 py-4 text-sm text-[#555555]">
            <p>
              <span className="font-medium text-[#1A1A1A]">Invited email:</span> {preview.email}
            </p>
            <p>
              <span className="font-medium text-[#1A1A1A]">Expires:</span>{' '}
              {new Date(preview.expiresAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {signedIn === false && (
            <div className="mb-6 rounded-xl border border-[#E6F4F4] bg-[#E6F4F4] px-4 py-4 text-sm text-[#0B6E6E]">
              Sign in or create an account with <strong>{preview.email}</strong> to accept this
              invitation.
            </div>
          )}

          {signedIn && userEmail && userEmail.toLowerCase() !== preview.email.toLowerCase() && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You are signed in as <strong>{userEmail}</strong>, but this invite was sent to{' '}
              <strong>{preview.email}</strong>. Sign out and sign in with the correct email.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            {signedIn ? (
              <button
                type="button"
                onClick={() => void handleAccept()}
                disabled={
                  accepting ||
                  (userEmail?.toLowerCase() !== preview.email.toLowerCase())
                }
                className="flex-1 rounded-xl bg-[#0B6E6E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:opacity-50"
              >
                {accepting ? 'Joining…' : 'Accept invitation →'}
              </button>
            ) : (
              <>
                <Link
                  href={`/sign-in?next=${encodeURIComponent(`/invite?token=${token}`)}`}
                  className="flex-1 rounded-xl bg-[#0B6E6E] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
                >
                  Sign in to accept
                </Link>
                <Link
                  href={`/sign-up?next=${encodeURIComponent(`/invite?token=${token}`)}`}
                  className="flex-1 rounded-xl border border-[#0B6E6E] px-6 py-3 text-center text-sm font-semibold text-[#0B6E6E] transition hover:bg-[#E6F4F4]"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
