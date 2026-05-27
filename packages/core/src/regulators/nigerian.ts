// CLAUDE.md §13 — Pre-loaded Nigerian regulators. Seeded into the DB via
// apps/api/db/migrations/003_seed_regulators.sql. Runtime reads from DB.
// This constant exists as the typed source of truth and for seed-script use.
// DO NOT use it directly in UI — CLAUDE.md §16 Rule 2 forbids hardcoded
// regulatory content in UI components.

export interface RegulatorRecord {
  readonly code: string;
  readonly name: string;
  readonly mandate: string;
  readonly website?: string;
  readonly portal?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly jurisdiction_tags: readonly string[];
}

export const NIGERIAN_REGULATORS: readonly RegulatorRecord[] = [
  {
    code: 'SEC_NIGERIA',
    name: 'Securities and Exchange Commission Nigeria',
    mandate: 'Primary regulator for digital assets under ISA 2025',
    website: 'https://sec.gov.ng',
    portal: 'https://home.sec.gov.ng',
    email: 'info@sec.gov.ng',
    phone: '+234 09-462-3600',
    address: 'SEC Tower, Plot 272 Samuel Adesujo Ademulegun Street, Abuja',
    jurisdiction_tags: ['DAX', 'DAOP', 'DAC', 'DAI', 'AVASP', 'DAPO', 'RATOP', 'SECURITIES', 'ARIP'],
  },
  {
    code: 'CBN',
    name: 'Central Bank of Nigeria',
    mandate: 'Monetary policy, payment systems, naira, banking supervision',
    website: 'https://cbn.gov.ng',
    email: 'info@cbn.gov.ng',
    phone: '+234 0800-225-5226',
    jurisdiction_tags: ['PAYMENT', 'STABLECOIN', 'ENAIRA', 'BANKING', 'FX'],
  },
  {
    code: 'NFIU',
    name: 'Nigerian Financial Intelligence Unit',
    mandate: 'AML/CFT compliance, STR/CTR filing, financial intelligence',
    website: 'https://nfiu.gov.ng',
    portal: 'https://goaml.nfiu.gov.ng',
    email: 'info@nfiu.gov.ng',
    phone: '+234 09-461-0000',
    jurisdiction_tags: ['AML', 'CFT', 'STR', 'CTR', 'VASP_REGISTRATION'],
  },
  {
    code: 'NITDA',
    name: 'National Information Technology Development Agency',
    mandate: 'Blockchain policy, data protection (NDPA), AI strategy',
    website: 'https://nitda.gov.ng',
    email: 'info@nitda.gov.ng',
    phone: '+234 09-291-5000',
    jurisdiction_tags: ['BLOCKCHAIN_POLICY', 'DATA_PROTECTION', 'AI'],
  },
  {
    code: 'CAC',
    name: 'Corporate Affairs Commission',
    mandate: 'Company registration, beneficial ownership register',
    website: 'https://cac.gov.ng',
    email: 'info@cac.gov.ng',
    phone: '+234 09-461-8000',
    jurisdiction_tags: ['INCORPORATION', 'BENEFICIAL_OWNERSHIP'],
  },
  {
    code: 'EFCC',
    name: 'Economic and Financial Crimes Commission',
    mandate: 'Financial crime investigation and prosecution',
    website: 'https://efcc.gov.ng',
    email: 'info@efcc.gov.ng',
    phone: '+234 09-904-5096',
    jurisdiction_tags: ['ENFORCEMENT', 'AML', 'FRAUD'],
  },
  {
    code: 'NAICOM',
    name: 'National Insurance Commission',
    mandate: 'Insurance regulation — fidelity bonds for VASPs',
    website: 'https://naicom.gov.ng',
    jurisdiction_tags: ['INSURANCE', 'FIDELITY_BOND'],
  },
];
