import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { InviteAcceptClient } from './InviteAcceptClient';

export const metadata: Metadata = {
  title: 'Accept invitation — Klarify',
  description: 'Accept your team invitation to join your organisation on Klarify.',
};

export default function InvitePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="border-b border-[#CCCCCC] bg-white px-6 py-4">
        <Link href="/">
          <Image src="/klarify_logo.png" alt="Klarify" width={100} height={34} priority />
        </Link>
      </header>

      <main className="mx-auto max-w-lg px-6 py-12">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-[#CCCCCC] bg-white p-10 text-center text-sm text-[#555555]">
              Loading…
            </div>
          }
        >
          <InviteAcceptClient />
        </Suspense>
      </main>
    </div>
  );
}
