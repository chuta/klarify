// Document Generator templates — 9 Sprint 4 templates + 4 Sprint 5 ARIP Framework templates.
//
// This module surfaces:
//   * DOCUMENT_TEMPLATES — the typed map of all 13 templates.
//   * getTemplate(id)    — strict lookup; returns null on unknown id.
//   * listTemplates()    — array form for the library UI.
//   * TemplateId / TemplateCategory / DocumentTemplate / DocumentField — types.

import { BWRA_TEMPLATE } from './BWRA.js';
import { AML_POLICY_TEMPLATE } from './AML_POLICY.js';
import { KYC_TIERS_TEMPLATE } from './KYC_TIERS.js';
import { TOKEN_MEMO_TEMPLATE } from './TOKEN_MEMO.js';
import { ARIP_WHITEPAPER_TEMPLATE } from './ARIP_WHITEPAPER.js';
import { STR_TEMPLATE } from './STR_TEMPLATE.js';
import { PEP_REGISTER_TEMPLATE } from './PEP_REGISTER.js';
import { CO_APPOINTMENT_TEMPLATE } from './CO_APPOINTMENT.js';
import { REG_BRIEF_TEMPLATE } from './REG_BRIEF.js';
// Sprint 5 ARIP Framework templates (Compass+ only)
import { ARIP_OPERATIONAL_PLAN_TEMPLATE } from './ARIP_OPERATIONAL_PLAN.js';
import { ARIP_SWORN_UNDERTAKING_TEMPLATE } from './ARIP_SWORN_UNDERTAKING.js';
import { SPONSORED_INDIVIDUAL_TEMPLATE } from './SPONSORED_INDIVIDUAL.js';
import { ARIP_ENTITY_RULES_TEMPLATE } from './ARIP_ENTITY_RULES.js';
import type { DocumentTemplate, TemplateId } from './types.js';

export type { DocumentField, DocumentTemplate, TemplateCategory, TemplateId } from './types.js';
export { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/** Frozen registry of all templates keyed by templateId. */
export const DOCUMENT_TEMPLATES: Readonly<Record<TemplateId, DocumentTemplate>> = Object.freeze({
  // Sprint 4 — 9 standard templates
  BWRA: BWRA_TEMPLATE,
  AML_POLICY: AML_POLICY_TEMPLATE,
  KYC_TIERS: KYC_TIERS_TEMPLATE,
  TOKEN_MEMO: TOKEN_MEMO_TEMPLATE,
  ARIP_WHITEPAPER: ARIP_WHITEPAPER_TEMPLATE,
  STR_TEMPLATE: STR_TEMPLATE,
  PEP_REGISTER: PEP_REGISTER_TEMPLATE,
  CO_APPOINTMENT: CO_APPOINTMENT_TEMPLATE,
  REG_BRIEF: REG_BRIEF_TEMPLATE,
  // Sprint 5 — 4 ARIP Framework templates (Compass+ only)
  ARIP_OPERATIONAL_PLAN: ARIP_OPERATIONAL_PLAN_TEMPLATE,
  ARIP_SWORN_UNDERTAKING: ARIP_SWORN_UNDERTAKING_TEMPLATE,
  SPONSORED_INDIVIDUAL: SPONSORED_INDIVIDUAL_TEMPLATE,
  ARIP_ENTITY_RULES: ARIP_ENTITY_RULES_TEMPLATE,
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
  'ARIP_OPERATIONAL_PLAN',
  'ARIP_SWORN_UNDERTAKING',
  'SPONSORED_INDIVIDUAL',
  'ARIP_ENTITY_RULES',
] as const);

/** Sprint 5 ARIP Framework template IDs — all require Compass+ plan. */
export const ARIP_FRAMEWORK_TEMPLATE_IDS: readonly TemplateId[] = Object.freeze([
  'ARIP_OPERATIONAL_PLAN',
  'ARIP_SWORN_UNDERTAKING',
  'SPONSORED_INDIVIDUAL',
  'ARIP_ENTITY_RULES',
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
