/**
 * Sends Resend transactional email when a regulatory document analysis completes.
 * Sprint 3 (S3-C1): CRITICAL/HIGH → immediate alert; MEDIUM/LOW → standard notice.
 *
 * Call from the analysis queue after `uploaded_documents.status = 'complete'`.
 * Uses @klarify/email (Resend SDK) with idempotency keys so retries never
 * double-notify a founder who already received the alert.
 */
import {
  sendDocumentAnalysisCriticalEmail,
  sendDocumentAnalysisStandardEmail,
  type SendEmailResult,
} from '@klarify/email';

/** Shape stored in `uploaded_documents.analysis_result` (Sprint 3 analyser). */
export interface StoredDocumentAnalysis {
  plain_language_summary?: string;
  issuing_regulator?: {
    code?: string;
    name?: string;
    department?: string;
  };
  urgency_level?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  action_plan?: Array<{ action?: string } | string>;
  response_deadline?: {
    days_remaining?: number | null;
    date_string?: string | null;
    is_specified?: boolean;
  };
}

export interface NotifyDocumentAnalysisInput {
  documentId: string;
  recipientEmail: string;
  recipientName: string;
  filename: string;
  urgencyLevel: string | null;
  analysisResult: StoredDocumentAnalysis | null;
}

function regulatorLabel(analysis: StoredDocumentAnalysis | null): string {
  const reg = analysis?.issuing_regulator;
  if (reg?.name) return reg.name;
  if (reg?.code) return reg.code.replace(/_/g, ' ');
  return 'Regulator';
}

function topActions(analysis: StoredDocumentAnalysis | null): string[] {
  const plan = analysis?.action_plan;
  if (!Array.isArray(plan) || plan.length === 0) {
    return [
      'Open your action plan in Klarify and review the full analysis.',
      'Confirm the response deadline with your compliance officer.',
      'Prepare any documents the regulator requested.',
    ];
  }
  return plan.slice(0, 3).map((step) => {
    if (typeof step === 'string') return step;
    return step.action ?? 'Review this step in your dashboard.';
  });
}

function daysRemaining(analysis: StoredDocumentAnalysis | null): number | null {
  const n = analysis?.response_deadline?.days_remaining;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/**
 * Dispatch the correct Resend template for the document urgency level.
 * Returns `{ sent: false }` when urgency does not warrant email (e.g. pending).
 */
export async function notifyDocumentAnalysisComplete(
  input: NotifyDocumentAnalysisInput,
): Promise<{ sent: boolean; result?: SendEmailResult }> {
  const urgency =
    input.urgencyLevel ??
    input.analysisResult?.urgency_level ??
    null;

  if (!urgency || urgency === 'pending') {
    return { sent: false };
  }

  const summary =
    input.analysisResult?.plain_language_summary?.trim() ||
    'Your regulatory document has been analysed. Open Klarify for the full breakdown, action plan, and draft response.';

  const base = {
    to: input.recipientEmail,
    name: input.recipientName,
    documentId: input.documentId,
    documentTitle: input.filename,
    issuingRegulator: regulatorLabel(input.analysisResult),
    summary,
    idempotencyKey: `doc-analysis:${input.documentId}`,
  };

  if (urgency === 'CRITICAL' || urgency === 'HIGH') {
    const result = await sendDocumentAnalysisCriticalEmail({
      ...base,
      urgency,
      daysRemaining: daysRemaining(input.analysisResult),
      topActions: topActions(input.analysisResult),
    });
    return { sent: true, result };
  }

  if (urgency === 'MEDIUM' || urgency === 'LOW') {
    const result = await sendDocumentAnalysisStandardEmail({
      ...base,
      urgency,
    });
    return { sent: true, result };
  }

  return { sent: false };
}
