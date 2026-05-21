// Sprint 4 — Document Generator templates. New prompts; do not edit existing §18-protected files.
//
// This module surfaces:
//   * DOCUMENT_TEMPLATES — the typed map of all 9 Sprint 4 templates.
//   * getTemplate(id)    — strict lookup; throws on unknown id.
//   * listTemplates()    — array form for the library UI.
//   * TemplateId / TemplateCategory / DocumentTemplate / DocumentField — types.
//
// The 4 ARIP Framework templates (Operational Plan, Sworn Undertaking,
// Sponsored Individual, Entity Rules) ship in Sprint 5 and will extend
// DOCUMENT_TEMPLATES additively without breaking the Sprint 4 API.

import { BWRA_TEMPLATE } from './BWRA.js';
import { AML_POLICY_TEMPLATE } from './AML_POLICY.js';
import { KYC_TIERS_TEMPLATE } from './KYC_TIERS.js';
import { TOKEN_MEMO_TEMPLATE } from './TOKEN_MEMO.js';
import { ARIP_WHITEPAPER_TEMPLATE } from './ARIP_WHITEPAPER.js';
import { STR_TEMPLATE } from './STR_TEMPLATE.js';
import { PEP_REGISTER_TEMPLATE } from './PEP_REGISTER.js';
import { CO_APPOINTMENT_TEMPLATE } from './CO_APPOINTMENT.js';
import { REG_BRIEF_TEMPLATE } from './REG_BRIEF.js';
import type { DocumentTemplate, TemplateId } from './types.js';

export type { DocumentField, DocumentTemplate, TemplateCategory, TemplateId } from './types.js';
export { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/** Frozen registry of all Sprint 4 templates keyed by templateId. */
export const DOCUMENT_TEMPLATES: Readonly<Record<TemplateId, DocumentTemplate>> = Object.freeze({
  BWRA: BWRA_TEMPLATE,
  AML_POLICY: AML_POLICY_TEMPLATE,
  KYC_TIERS: KYC_TIERS_TEMPLATE,
  TOKEN_MEMO: TOKEN_MEMO_TEMPLATE,
  ARIP_WHITEPAPER: ARIP_WHITEPAPER_TEMPLATE,
  STR_TEMPLATE: STR_TEMPLATE,
  PEP_REGISTER: PEP_REGISTER_TEMPLATE,
  CO_APPOINTMENT: CO_APPOINTMENT_TEMPLATE,
  REG_BRIEF: REG_BRIEF_TEMPLATE,
});

/** The ordered list of all template IDs — used by tests that iterate the registry. */
export const ALL_TEMPLATE_IDS: readonly TemplateId[] = Object.freeze([
  'BWRA',
  'AML_POLICY',
  'KYC_TIERS',
  'TOKEN_MEMO',
  'ARIP_WHITEPAPER',
  'STR_TEMPLATE',
  'PEP_REGISTER',
  'CO_APPOINTMENT',
  'REG_BRIEF',
] as const);

export function isTemplateId(value: string): value is TemplateId {
  return Object.prototype.hasOwnProperty.call(DOCUMENT_TEMPLATES, value);
}

/** Strict lookup. Returns null when the id is not a known template. */
export function getTemplate(id: string): DocumentTemplate | null {
  if (!isTemplateId(id)) return null;
  return DOCUMENT_TEMPLATES[id];
}

/** Array form of the registry, in the canonical display order. */
export function listTemplates(): DocumentTemplate[] {
  return ALL_TEMPLATE_IDS.map((id) => DOCUMENT_TEMPLATES[id]);
}
