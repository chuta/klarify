import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * /dashboard/chat — FounderCounsel AI Advisory
 *
 * Full implementation: Sprint 2.
 * RAG pipeline + Claude streaming + citation rendering.
 */
export default async function ChatPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Ask FounderCounsel</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Your AI regulatory advisor — plain-English answers with citations to the exact
          regulation, section, and clause.
        </p>
      </div>

      {/* Coming soon card */}
      <div className="overflow-hidden rounded-2xl border border-[#CCCCCC] bg-white shadow-sm">
        {/* Preview of the chat interface */}
        <div className="border-b border-[#F5F5F5] bg-[#FAFAFA] px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C0392B]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#D4A843]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#1A7A4A]" />
            <span className="ml-2 text-xs text-[#CCCCCC]">FounderCounsel — Building now</span>
          </div>
        </div>

        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#E6F4F4]">
            <svg className="h-8 w-8 text-[#0B6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h2 className="mb-2 text-lg font-semibold text-[#1A1A1A]">
            FounderCounsel is launching in Sprint 2
          </h2>
          <p className="mb-6 mx-auto max-w-md text-sm text-[#555555]">
            Ask any question about Nigerian or African digital asset regulation in plain English.
            Every answer is cited to the exact regulation — ISA 2025, SEC Digital Asset Rules,
            MLPPA 2022, NFIU guidelines, and more.
          </p>

          {/* Previews of starter questions */}
          <div className="mx-auto max-w-lg grid gap-2 text-left">
            {[
              'What licences does my product need in Nigeria?',
              'How do I start the SEC Nigeria ARIP process?',
              'What is the minimum capital for a DAX registration?',
              'I received a letter from SEC Nigeria — what do I do?',
            ].map((q) => (
              <div
                key={q}
                className="rounded-lg border border-[#CCCCCC] bg-[#FAFAFA] px-4 py-3 text-sm text-[#555555] cursor-not-allowed"
              >
                {q}
              </div>
            ))}
          </div>

          <p className="mt-6 text-xs text-[#CCCCCC]">
            Sprint 2 · RAG pipeline + Anthropic Claude + citation rendering
          </p>
        </div>
      </div>

      {/* Non-dismissible disclaimer — CLAUDE.md §16 Rule 1 */}
      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          FounderCounsel provides regulatory information, not legal advice. Every response will
          include citations to the specific regulation and a disclaimer to verify with a
          qualified practitioner.
        </p>
      </div>
    </div>
  );
}
