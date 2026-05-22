import type { SpecialistProfile, SpecialistTopic } from './types.js';

/**
 * Vetted specialist network — Sprint 6B Human Escalation v0.
 *
 * Introductions are routed through Klarify (hello@klarify.africa).
 * Replace placeholder entries with vetted practitioners before public launch.
 * CLAUDE.md PRD Appendix B criteria apply to every listing.
 */
export const VETTED_SPECIALISTS: readonly SpecialistProfile[] = [
  {
    id: 'sp-enforcement-01',
    name: 'Enforcement response counsel',
    firm: 'Vetted Nigerian securities & fintech practice',
    specialties: ['enforcement_response', 'general'],
    jurisdictions: ['NG'],
    languages: ['English'],
    typicalResponse: '24–48 hours',
    feeRange: '₦200k–₦500k initial consult',
    bio: 'Experienced in SEC Nigeria and CBN enforcement correspondence. Klarify introduction only — not direct contact.',
    verified: true,
  },
  {
    id: 'sp-arip-01',
    name: 'SEC / ARIP licensing counsel',
    firm: 'Vetted securities law practice (Lagos)',
    specialties: ['arip', 'general'],
    jurisdictions: ['NG'],
    languages: ['English'],
    typicalResponse: '48–72 hours',
    feeRange: '₦250k–₦600k initial consult',
    bio: 'Advises on ARIP Framework applications, solicitor-led filings, and SEC Nigeria digital asset registration.',
    verified: true,
  },
  {
    id: 'sp-token-01',
    name: 'Token classification adviser',
    firm: 'Vetted capital markets practice',
    specialties: ['arip', 'corporate', 'general'],
    jurisdictions: ['NG'],
    languages: ['English'],
    typicalResponse: '3–5 business days',
    feeRange: '₦150k–₦400k memo / opinion',
    bio: 'Product classification, white paper review, and ISA 2025 / SEC Digital Asset Rules analysis.',
    verified: true,
  },
  {
    id: 'sp-aml-01',
    name: 'AML/CFT & MLRO adviser',
    firm: 'Vetted compliance consultancy',
    specialties: ['aml', 'general'],
    jurisdictions: ['NG'],
    languages: ['English'],
    typicalResponse: '48–72 hours',
    feeRange: '₦120k–₦350k initial consult',
    bio: 'MLPPA 2022 programmes, NFIU goAML registration, BWRA, STR/CTR workflows, and MLRO appointment.',
    verified: true,
  },
  {
    id: 'sp-cbn-01',
    name: 'CBN / payments specialist',
    firm: 'Vetted banking & payments practice',
    specialties: ['cbn_payments', 'general'],
    jurisdictions: ['NG'],
    languages: ['English'],
    typicalResponse: '3–5 business days',
    feeRange: '₦180k–₦450k initial consult',
    bio: 'Naira on/off-ramps, VASP bank account guidelines, and dual SEC/CBN licensing structures.',
    verified: true,
  },
  {
    id: 'sp-corp-01',
    name: 'Corporate & CAC structuring',
    firm: 'Vetted corporate law practice',
    specialties: ['corporate', 'general'],
    jurisdictions: ['NG'],
    languages: ['English'],
    typicalResponse: '5–7 business days',
    feeRange: '₦100k–₦300k initial consult',
    bio: 'CAMA 2020 incorporation, share structure, beneficial ownership, and pre-ARIP corporate readiness.',
    verified: true,
  },
  {
    id: 'sp-ops-01',
    name: 'Compliance operations lead',
    firm: 'Vetted fractional compliance network',
    specialties: ['aml', 'arip', 'general'],
    jurisdictions: ['NG'],
    languages: ['English'],
    typicalResponse: '48–72 hours',
    feeRange: '₦80k–₦200k / session',
    bio: 'Hands-on compliance officer support, policy implementation, and regulator meeting preparation.',
    verified: true,
  },
  {
    id: 'sp-xborder-01',
    name: 'Cross-border expansion adviser',
    firm: 'Vetted pan-African regulatory practice',
    specialties: ['general', 'arip'],
    jurisdictions: ['NG', 'GH', 'KE', 'ZA'],
    languages: ['English'],
    typicalResponse: '5–10 business days',
    feeRange: '₦200k–₦500k gap analysis',
    bio: 'Multi-jurisdiction VASP expansion, Ghana/Kenya/SA gap analysis, and Nigeria-first licensing strategy.',
    verified: true,
  },
] as const;

export function getSpecialistById(id: string): SpecialistProfile | undefined {
  return VETTED_SPECIALISTS.find((s) => s.id === id);
}

export function specialistsForTopic(topic: SpecialistTopic): SpecialistProfile[] {
  if (topic === 'general') return [...VETTED_SPECIALISTS];
  return VETTED_SPECIALISTS.filter((s) => s.specialties.includes(topic));
}

/** Client-side check: assistant offered human escalation (no prompt changes). */
export function messageSuggestsEscalation(content: string): boolean {
  return /qualified specialist|connect you with|human specialist|vetted Nigerian/i.test(
    content,
  );
}
