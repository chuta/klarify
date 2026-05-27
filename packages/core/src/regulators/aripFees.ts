// Authoritative ARIP fee schedule — SEC Digital Asset Rules 2024.
// Minimum capital (MCR) thresholds are in SEC Circular No. 26-1 (Jan 2026);
// cite that circular for capital adequacy, not this module.

/** Flat non-refundable ARIP processing fee per SEC DAR 2024 §VIII(20)(a). */
export const ARIP_PROCESSING_FEE_NGN = 2_000_000;

export const ARIP_PROCESSING_FEE = {
  amountNgn: ARIP_PROCESSING_FEE_NGN,
  currency: 'NGN' as const,
  regulatoryBasis: 'SEC Digital Asset Rules 2024, Section VIII, Rule 20(a)',
  shortLabel: 'ARIP non-refundable processing fee',
  revopNote:
    'Pay via REVOP only after receiving Stage 2 eligibility notification.',
} as const;

/** MCR citation for checklist / eligibility items (amounts vary by VASP category). */
export const VASP_MCR_CITATION =
  'SEC Circular No. 26-1 (January 2026), Section 4';

export const VASP_MCR_NOTE =
  'Minimum capital varies by VASP category. Verify your threshold via Product Classifier or Ask Klarify.';

/** CRM / seed JSON shape for regulators.arip_fees. */
export function buildSecAripFeesJson(): {
  arip_processing_fee_ngn: number;
  currency: string;
  citation: string;
  note: string;
} {
  return {
    arip_processing_fee_ngn: ARIP_PROCESSING_FEE.amountNgn,
    currency: ARIP_PROCESSING_FEE.currency,
    citation: ARIP_PROCESSING_FEE.regulatoryBasis,
    note: `${ARIP_PROCESSING_FEE.shortLabel}. ${ARIP_PROCESSING_FEE.revopNote}`,
  };
}

export function formatAripProcessingFeeNgn(): string {
  return `NGN ${ARIP_PROCESSING_FEE.amountNgn.toLocaleString('en-NG')}`;
}

export function aripProcessingFeeHelpText(): string {
  return `${formatAripProcessingFeeNgn()} — ${ARIP_PROCESSING_FEE.regulatoryBasis}. ${ARIP_PROCESSING_FEE.revopNote}`;
}
