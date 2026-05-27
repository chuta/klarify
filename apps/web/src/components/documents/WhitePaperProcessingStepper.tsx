'use client';

import { ProcessingStepper } from '@/components/documents/ProcessingStepper';

type Status = 'pending' | 'extracting' | 'analysing' | 'complete' | 'error';

/**
 * White paper analysis stepper — reuses ProcessingStepper shell with
 * white-paper-specific copy in the subtitle via wrapper heading.
 */
export function WhitePaperProcessingStepper({
  status,
  errorMessage,
}: {
  status: Status;
  errorMessage?: string | null;
}): JSX.Element {
  return (
    <div>
      <p className="mb-4 text-sm text-[#555]">
        Assessing your white paper against SEC Nigeria ARIP requirements. This usually takes
        30–60 seconds.
      </p>
      <ProcessingStepper status={status} errorMessage={errorMessage} />
    </div>
  );
}
