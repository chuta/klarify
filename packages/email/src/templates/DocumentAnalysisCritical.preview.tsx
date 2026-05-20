/**
 * Default export for `resend emails send --react-email` (Resend CLI).
 * Sample props for the Post-Letter Founder alert — not used in production sends.
 */
import {
  DocumentAnalysisCriticalEmail,
  type DocumentAnalysisCriticalProps,
} from './DocumentAnalysisCritical.js';

const previewProps: DocumentAnalysisCriticalProps = {
  name: 'Chimezie',
  documentId: '00000000-0000-4000-8000-000000000001',
  documentTitle: 'SEC Nigeria — Information Request (Reference SEC/DA/2026/0412)',
  issuingRegulator: 'SEC Nigeria',
  urgency: 'CRITICAL',
  daysRemaining: 19,
  summary:
    'SEC Nigeria is requesting your ARIP application materials, AML policy, and proof of minimum capital. A written response is expected within 21 days.',
  topActions: [
    'Acknowledge receipt with your compliance officer within 24 hours.',
    'Gather ARIP pre-screening documents listed in the notice.',
    'Book a review with your regulatory specialist before submitting any response.',
  ],
};

export default function DocumentAnalysisCriticalPreview(): JSX.Element {
  return <DocumentAnalysisCriticalEmail {...previewProps} />;
}
