/** Human Escalation v0 — topic tags for directory + intake form. */
export type SpecialistTopic =
  | 'enforcement_response'
  | 'arip'
  | 'aml'
  | 'cbn_payments'
  | 'corporate'
  | 'general';

export type SpecialistRequestUrgency = 'critical' | 'standard';

export type SpecialistRequestSource =
  | 'directory'
  | 'chat'
  | 'document_analyser'
  | 'dashboard';

export interface SpecialistProfile {
  readonly id: string;
  readonly name: string;
  readonly firm: string;
  readonly specialties: readonly SpecialistTopic[];
  readonly jurisdictions: readonly string[];
  readonly languages: readonly string[];
  readonly typicalResponse: string;
  readonly feeRange: string;
  readonly bio: string;
  readonly verified: true;
}

export const SPECIALIST_TOPIC_LABELS: Record<SpecialistTopic, string> = {
  enforcement_response: 'Enforcement / regulator letter response',
  arip: 'SEC Nigeria ARIP / licensing',
  aml: 'AML/CFT & NFIU compliance',
  cbn_payments: 'CBN payments / VASP banking',
  corporate: 'Corporate structure & CAC',
  general: 'General regulatory advisory',
};
