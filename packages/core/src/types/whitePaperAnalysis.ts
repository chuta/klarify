// US-008B — White Paper Analyzer result types.

export const WHITE_PAPER_SOURCE_JURISDICTIONS = ['GH', 'KE', 'MU', 'ZA', 'OTHER'] as const;
export type WhitePaperSourceJurisdiction = (typeof WHITE_PAPER_SOURCE_JURISDICTIONS)[number];

export const WHITE_PAPER_LICENCE_CATEGORIES = ['DAX', 'DAOP', 'DAC', 'DAI', 'HYBRID'] as const;
export type WhitePaperLicenceCategory = (typeof WHITE_PAPER_LICENCE_CATEGORIES)[number];

export const WHITE_PAPER_SECTION_IDS = [
  'executive_summary',
  'about_issuer',
  'product_description',
  'technology',
  'regulatory_categorisation',
  'risk_disclosure',
  'investor_protection',
  'aml_cft',
  'governance',
  'capital_insurance',
  'application_pathway',
  'exit_plan',
  'aip_restrictions',
  'sign_off',
] as const;

export type WhitePaperSectionId = (typeof WHITE_PAPER_SECTION_IDS)[number];

export const WHITE_PAPER_SECTION_NAMES: Record<WhitePaperSectionId, string> = {
  executive_summary: 'Executive Summary',
  about_issuer: 'About the Issuer',
  product_description: 'Product Description',
  technology: 'Technology & Custody Architecture',
  regulatory_categorisation: 'Regulatory Categorisation',
  risk_disclosure: 'Risk Disclosure',
  investor_protection: 'Investor / Customer Protection',
  aml_cft: 'AML / CFT Compliance Summary',
  governance: 'Governance & Sponsored Individuals',
  capital_insurance: 'Capital and Fidelity Bond / Insurance',
  application_pathway: 'Application Pathway',
  exit_plan: 'Exit Plan',
  aip_restrictions: 'AIP Period Restrictions',
  sign_off: 'Sign-off & Solicitor Review',
};

export type WhitePaperSectionStatus = 'adequate' | 'partial' | 'missing' | 'not_applicable';

export interface WhitePaperCitation {
  regulation: string;
  section: string;
  url?: string;
}

export interface WhitePaperCriticalGap {
  rank: number;
  section_id: WhitePaperSectionId;
  title: string;
  gap_description: string;
  remediation: string;
  citations: WhitePaperCitation[];
}

export interface WhitePaperSectionAssessment {
  section_id: WhitePaperSectionId;
  section_name: string;
  status: WhitePaperSectionStatus;
  found_in_upload: boolean;
  gap_summary: string;
  remediation: string;
  citations: WhitePaperCitation[];
}

export interface WhitePaperSourceJurisdictionNotes {
  retainable_content: string[];
  must_rewrite: string[];
  comparative_notes: string;
}

export interface WhitePaperTokenFlag {
  severity: 'info' | 'amber' | 'critical';
  message: string;
  citations: WhitePaperCitation[];
}

export interface WhitePaperOutlineSection {
  number: number;
  title: string;
  guidance: string;
  suggested_content: string;
  regulatory_basis: string;
}

export interface WhitePaperGeneratorPrefill {
  product_name?: string;
  licence_category: string;
  product_summary?: string;
  token_or_asset_details?: string;
  target_users?: string;
  technology_stack?: string;
  investor_protection_measures?: string;
  capital_position?: string;
}

export interface WhitePaperAnalysisResult {
  analysed_at: string;
  source_jurisdiction: WhitePaperSourceJurisdiction;
  licence_category_sought: WhitePaperLicenceCategory;
  existing_source_licence: string | null;
  sections_adequate_count: number;
  sections_total: number;
  completeness_pct: number;
  executive_summary: string;
  critical_gaps: WhitePaperCriticalGap[];
  section_assessments: WhitePaperSectionAssessment[];
  source_jurisdiction_notes: WhitePaperSourceJurisdictionNotes;
  token_classification_flags: WhitePaperTokenFlag[];
  draft_outline: {
    sections: WhitePaperOutlineSection[];
  };
  generator_prefill: WhitePaperGeneratorPrefill;
  low_structure_confidence: boolean;
  disclaimer: string;
}

export const WHITE_PAPER_DISCLAIMER =
  'This is regulatory information, not legal advice. For advice specific to your situation, consult a qualified practitioner.';

export type WhitePaperAnalysisStatus =
  | 'pending'
  | 'extracting'
  | 'analysing'
  | 'complete'
  | 'error';
