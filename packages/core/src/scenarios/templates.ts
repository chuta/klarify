// US-005 — Pre-built scenario templates (not AI-generated).
// Shown as clickable cards on /dashboard/scenario.

export interface ScenarioTemplate {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly prefillText: string;
}

export const SCENARIO_TEMPLATES: readonly ScenarioTemplate[] = [
  {
    id: 'launch-without-arip',
    title: 'Launch without ARIP application',
    description:
      'You are preparing to go live with a digital asset product in Nigeria without SEC ARIP engagement.',
    prefillText:
      'We are a Nigerian fintech preparing to launch a platform that lets users buy and sell Bitcoin and stablecoins with naira. ' +
      'We have CAC registration and a basic AML policy but have not filed any SEC ARIP application or received AIP. ' +
      'We plan to onboard retail users within 30 days and run marketing on social media. ' +
      'What are the regulatory consequences if we launch without SEC Nigeria authorisation under the current digital asset framework?',
  },
  {
    id: 'operate-dax-unlicensed',
    title: 'Operate DAX without SEC registration',
    description:
      'Secondary-market trading functionality is live or planned without DAX registration.',
    prefillText:
      'Our product matches buyers and sellers of digital assets and takes a transaction fee on each trade. ' +
      'We describe ourselves as a "P2P marketplace" but we set prices, hold order books, and settle trades on-platform. ' +
      'We do not yet have SEC Nigeria DAX registration or any ARIP/AIP. ' +
      'What enforcement and business risks do we face if we continue operating while unregistered?',
  },
  {
    id: 'naira-onramp-without-cbn',
    title: 'Add naira on-ramp without CBN engagement',
    description:
      'Naira bank transfers or payment rails integrated without CBN/VASP banking compliance.',
    prefillText:
      'We already operate a crypto wallet and now want to add direct naira deposits and withdrawals via Nigerian bank transfers and virtual accounts. ' +
      'We have SEC engagement in progress but have not obtained CBN approval or partnered with a deposit money bank under the VASP account guidelines. ' +
      'What happens if we enable naira on-ramps before CBN requirements are met?',
  },
  {
    id: 'cbn-stablecoin-hypothetical',
    title: 'CBN stablecoin framework (hypothetical)',
    description:
      'Assess impact if Nigeria publishes formal stablecoin or e-naira adjacent payment rules.',
    prefillText:
      'We operate a payment product using USDT for cross-border remittances and merchant settlement in Nigeria. ' +
      'Assume the Central Bank of Nigeria publishes a formal stablecoin and payment-token framework requiring licensing for issuers and distributors. ' +
      'How would that likely affect our product, and what should we prepare now under current BOFIA and payment-system rules?',
  },
  {
    id: 'expand-ghana-before-ng-licence',
    title: 'Expand to Ghana before NG licence secured',
    description:
      'Cross-border expansion while still unlicensed or pre-licence in Nigeria.',
    prefillText:
      'We are a Nigerian VASP with users in Nigeria and want to open Ghana operations within 90 days. ' +
      'Our Nigeria SEC ARIP is at initial assessment stage — we do not yet have AIP or full registration. ' +
      'We would onboard Ghanaian users on the same app and use the same compliance manual. ' +
      'What regulatory risks arise in both Nigeria and Ghana if we expand before completing Nigerian licensing?',
  },
  {
    id: 'sec-enforcement-notice',
    title: 'SEC enforcement notice (pre-response)',
    description:
      'Planning response strategy after receiving or expecting SEC Nigeria contact.',
    prefillText:
      'We received informal indication that SEC Nigeria may issue a formal inquiry about our token sale and exchange features. ' +
      'We have not yet received a written notice but our counsel expects one within two weeks. ' +
      'We continued onboarding users while assessing licensing. ' +
      'What are the best, likely, and worst case regulatory outcomes and what mitigations should we prioritise in the next 72 hours?',
  },
  {
    id: 'aip-promotional-ban-breach',
    title: 'AIP promotional ban breach',
    description:
      'Marketing or growth activity during AIP that may violate ARIP Section 29 restrictions.',
    prefillText:
      'We hold an SEC Nigeria AIP and are in the operational incubation period. ' +
      'Our marketing team ran a paid social campaign and a referral bonus programme that increased new sign-ups by 12% in one month. ' +
      'We did not seek SEC pre-approval for the campaign. ' +
      'What are the consequences under ARIP Section 29 promotional restrictions and the customer growth cap?',
  },
  {
    id: 'cross-border-custody-without-dac',
    title: 'Cross-border custody without DAC registration',
    description:
      'Holding client keys or assets without Digital Asset Custodian registration.',
    prefillText:
      'Our platform holds user private keys in our cloud HSM and also offers an "escrow" service for OTC trades between Nigerian and Kenyan counterparties. ' +
      'We have DAX registration in progress but no DAC registration. ' +
      'What regulatory exposure do we have for custody and cross-border escrow under SEC Nigeria rules and counterpart African frameworks?',
  },
] as const;

export type ScenarioTemplateId = (typeof SCENARIO_TEMPLATES)[number]['id'];

export const SCENARIO_TEMPLATE_IDS: readonly ScenarioTemplateId[] = SCENARIO_TEMPLATES.map(
  (t) => t.id,
);

export function getScenarioTemplate(id: string): ScenarioTemplate | undefined {
  return SCENARIO_TEMPLATES.find((t) => t.id === id);
}
