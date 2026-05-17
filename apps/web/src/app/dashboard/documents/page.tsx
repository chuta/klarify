import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * /dashboard/documents — Document Analyser & Generator
 *
 * Full implementation: Sprint 3 (Document Analyser) + Sprint 4 (Generator).
 *
 * Sprint 3: Upload a regulatory letter → OCR → AI analysis → 72-hour action
 *           plan → editable draft response → export as .docx.
 * Sprint 4: Generate 13 compliance document templates (BWRA, AML Policy,
 *           KYC Tiers, ARIP Operational Plan, etc.)
 */
export default async function DocumentsPage(): Promise<JSX.Element> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/sign-in');

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Documents</h1>
        <p className="mt-1 text-sm text-[#555555]">
          Analyse regulatory letters in seconds and generate compliance documents
          pre-built to Nigerian regulatory standards.
        </p>
      </div>

      {/* Two panels — Analyser (Sprint 3) and Generator (Sprint 4) */}
      <div className="grid gap-6 sm:grid-cols-2">

        {/* Document Analyser */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#C0392B] bg-white shadow-sm">
          <div className="bg-[#FDF2F2] px-5 py-4">
            <span className="inline-block rounded-full bg-[#C0392B] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              Sprint 3 — In Progress
            </span>
            <h2 className="mt-2 text-lg font-semibold text-[#1A1A1A]">Regulatory Letter Analyser</h2>
            <p className="mt-1 text-xs text-[#555555]">
              Received something from SEC Nigeria, CBN, or NFIU? Upload it and get a plain-English
              breakdown, urgency rating, 72-hour action plan, and a draft response — in under 30 seconds.
            </p>
          </div>
          <div className="flex-1 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
              What you&apos;ll get
            </p>
            <ul className="space-y-2 text-sm text-[#555555]">
              {[
                ['⛔', 'Urgency level — Critical / High / Medium / Low'],
                ['📋', 'Plain-language summary of what the regulator is asking'],
                ['⏱️', 'Deadline countdown with calendar integration'],
                ['✅', '72-hour action plan (numbered, checkable steps)'],
                ['📄', 'Draft acknowledgment response (export as .docx)'],
                ['💬', 'Follow-up Q&A with FounderCounsel in context'],
              ].map(([icon, text]) => (
                <li key={text as string} className="flex items-start gap-2">
                  <span className="shrink-0">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-[#F5F5F5] px-5 py-4">
            {/* Upload zone preview — will be interactive in Sprint 3 */}
            <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-[#CCCCCC] bg-[#FAFAFA]">
              <p className="text-xs text-[#CCCCCC]">
                Drop your regulatory document here — coming Sprint 3
              </p>
            </div>
          </div>
        </div>

        {/* Document Generator */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#D4A843] bg-white shadow-sm">
          <div className="bg-[#FDF6E3] px-5 py-4">
            <span className="inline-block rounded-full bg-[#D4A843] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white">
              Sprint 4 — Coming Next
            </span>
            <h2 className="mt-2 text-lg font-semibold text-[#1A1A1A]">Compliance Document Generator</h2>
            <p className="mt-1 text-xs text-[#555555]">
              Generate first-draft compliance documents calibrated to Nigerian regulatory
              standards. Pre-filled with your company details from onboarding.
            </p>
          </div>
          <div className="flex-1 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
              13 templates available at launch
            </p>
            <ul className="space-y-1.5 text-xs text-[#555555]">
              {[
                'Business-Wide Risk Assessment (BWRA)',
                'AML/CFT Policy Manual',
                'KYC Tiering Framework',
                'Token Classification Legal Memo',
                'ARIP Operational Plan (incl. exit plan)',
                'ARIP Sworn Undertaking',
                'Sponsored Individual Profile (Form SEC 2/2D)',
                'Entity Rules & Governance Framework',
                'STR Filing Template (goAML format)',
                'PEP Register Template',
                'Compliance Officer Appointment Letter',
                'ARIP White Paper Outline',
                'Regulator Engagement Brief',
              ].map((doc) => (
                <li key={doc} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#D4A843]" />
                  {doc}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-[#F5F5F5] px-5 py-4">
            <p className="text-xs text-[#CCCCCC]">
              Export as Word (.docx) or PDF · version history maintained ·
              regulatory basis cited on every section
            </p>
          </div>
        </div>
      </div>

      {/* Legal disclaimer — CLAUDE.md §16 Rule 1 */}
      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-xs text-amber-800">
          All generated documents are first drafts for review. Klarify provides regulatory
          information, not legal advice. Review all compliance documents with a qualified
          practitioner before filing or submission.
        </p>
      </div>
    </div>
  );
}
