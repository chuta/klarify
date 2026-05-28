import {
  ArrowTopRightOnSquareIcon,
  ClockIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';

/** SEC Innovation Office quick contacts — shared by ARIP tracker pages. */
export function SecInnovationContacts(): JSX.Element {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[#CCCCCC] bg-[#FAFAFA] px-5 py-3 text-xs text-[#555555]">
      <span className="font-semibold text-[#1A1A1A]">SEC Innovation Office:</span>
      <a
        href="mailto:innovation@sec.gov.ng"
        className="inline-flex items-center gap-1.5 hover:text-[#0B6E6E]"
      >
        <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        innovation@sec.gov.ng
      </a>
      <a
        href="mailto:fintech@sec.gov.ng"
        className="inline-flex items-center gap-1.5 hover:text-[#0B6E6E]"
      >
        <EnvelopeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        fintech@sec.gov.ng
      </a>
      <span className="inline-flex items-center gap-1.5">
        <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Tue &amp; Thu, 10am–2pm
      </span>
      <a
        href="https://home.sec.gov.ng"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 font-medium text-[#0B6E6E] hover:underline"
      >
        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        SEC ePortal
      </a>
    </div>
  );
}
