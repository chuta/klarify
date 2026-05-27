-- ============================================================================
-- 013_regulator_crm.sql  — Sprint 5-C1: Regulator Engagement CRM
--
-- Extends the regulators master table with ARIP contact and fee data.
-- Extends regulator_interactions with is_complete and created_by columns.
-- Seeds / updates all 7 Nigerian regulators with full contact data.
--
-- Regulatory source: ARIP Framework, SEC Nigeria, June 2024.
-- CLAUDE.md §13 (NIGERIAN_REGULATORS).
-- ============================================================================

-- ── 1. Extend regulators with ARIP contact and fee data ───────────────────────

ALTER TABLE public.regulators
  ADD COLUMN IF NOT EXISTS arip_contacts JSONB,
  ADD COLUMN IF NOT EXISTS arip_fees     JSONB;

-- ── 2. Extend regulator_interactions with completion tracking ─────────────────

ALTER TABLE public.regulator_interactions
  ADD COLUMN IF NOT EXISTS is_complete  BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_by   UUID      REFERENCES public.users(id) ON DELETE SET NULL;

-- Add index for follow-up queries (used by dashboard widget and daily cron).
CREATE INDEX IF NOT EXISTS regulator_interactions_followup_idx
  ON public.regulator_interactions (org_id, follow_up_date)
  WHERE follow_up_required = TRUE AND is_complete = FALSE;

-- ── 3. Seed the 7 Nigerian regulators ─────────────────────────────────────────
-- Uses upsert so re-running the migration is safe.
-- jurisdiction_tags must match CLAUDE.md §13 exactly.

INSERT INTO public.regulators (
  code, name, mandate, website, portal, email, phone, address,
  jurisdiction_tags, arip_contacts, arip_fees
) VALUES
(
  'SEC_NIGERIA',
  'Securities and Exchange Commission Nigeria',
  'Primary regulator for digital assets under ISA 2025',
  'https://sec.gov.ng',
  'https://home.sec.gov.ng',
  'info@sec.gov.ng',
  '+234 09-462-3600',
  'SEC Tower, Plot 272 Samuel Adesujo Ademulegun Street, Abuja',
  ARRAY['DAX','DAOP','DAC','DAI','SECURITIES','ARIP'],
  '{"digital_assets_unit": "Digital Assets and Fintech Unit", "arip_email": "arip@sec.gov.ng", "pre_screening_email": "prescreening@sec.gov.ng", "innovation_office_hours": "Tue & Thu, 10am–2pm WAT"}'::jsonb,
  '{"arip_processing_fee_ngn": 2000000, "currency": "NGN", "citation": "SEC Digital Asset Rules 2024, Section VIII, Rule 20(a)", "note": "ARIP non-refundable processing fee. Pay via REVOP only after receiving Stage 2 eligibility notification."}'::jsonb
),
(
  'CBN',
  'Central Bank of Nigeria',
  'Monetary policy, payment systems, naira, banking supervision',
  'https://cbn.gov.ng',
  NULL,
  'info@cbn.gov.ng',
  '+234 0800-225-5226',
  NULL,
  ARRAY['PAYMENT','STABLECOIN','ENAIRA','BANKING','FX'],
  NULL,
  NULL
),
(
  'NFIU',
  'Nigerian Financial Intelligence Unit',
  'AML/CFT compliance, STR/CTR filing, financial intelligence',
  'https://nfiu.gov.ng',
  'https://goaml.nfiu.gov.ng',
  'info@nfiu.gov.ng',
  '+234 09-461-0000',
  NULL,
  ARRAY['AML','CFT','STR','CTR','VASP_REGISTRATION'],
  '{"goaml_portal": "https://goaml.nfiu.gov.ng", "goaml_note": "Register on goAML before engaging NFIU on any STR/CTR matters."}'::jsonb,
  NULL
),
(
  'NITDA',
  'National Information Technology Development Agency',
  'Blockchain policy, data protection (NDPA), AI strategy',
  'https://nitda.gov.ng',
  NULL,
  'info@nitda.gov.ng',
  '+234 09-291-5000',
  NULL,
  ARRAY['BLOCKCHAIN_POLICY','DATA_PROTECTION','AI'],
  NULL,
  NULL
),
(
  'CAC',
  'Corporate Affairs Commission',
  'Company registration, beneficial ownership register',
  'https://cac.gov.ng',
  NULL,
  'info@cac.gov.ng',
  '+234 09-461-8000',
  NULL,
  ARRAY['INCORPORATION','BENEFICIAL_OWNERSHIP'],
  NULL,
  NULL
),
(
  'EFCC',
  'Economic and Financial Crimes Commission',
  'Financial crime investigation and prosecution',
  'https://efcc.gov.ng',
  NULL,
  'info@efcc.gov.ng',
  '+234 09-904-5096',
  NULL,
  ARRAY['ENFORCEMENT','AML','FRAUD'],
  NULL,
  NULL
),
(
  'NAICOM',
  'National Insurance Commission',
  'Insurance regulation — fidelity bonds for VASPs',
  'https://naicom.gov.ng',
  NULL,
  NULL,
  NULL,
  NULL,
  ARRAY['INSURANCE','FIDELITY_BOND'],
  NULL,
  NULL
)
ON CONFLICT (code) DO UPDATE SET
  name             = EXCLUDED.name,
  mandate          = EXCLUDED.mandate,
  website          = EXCLUDED.website,
  portal           = EXCLUDED.portal,
  email            = EXCLUDED.email,
  phone            = EXCLUDED.phone,
  address          = EXCLUDED.address,
  jurisdiction_tags = EXCLUDED.jurisdiction_tags,
  arip_contacts    = EXCLUDED.arip_contacts,
  arip_fees        = EXCLUDED.arip_fees;
