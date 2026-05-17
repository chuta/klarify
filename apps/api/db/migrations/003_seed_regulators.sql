-- =============================================================================
-- Klarify — 003_seed_regulators.sql
-- Seeds the Nigerian regulator reference list from CLAUDE.md Section 13.
-- Idempotent (ON CONFLICT DO UPDATE) so it is safe to re-run.
-- Run after 001_init.sql and 002_rls.sql.
-- =============================================================================

INSERT INTO public.regulators
  (code, name, mandate, website, portal, email, phone, address, jurisdiction_tags)
VALUES
  ('SEC_NIGERIA',
   'Securities and Exchange Commission Nigeria',
   'Primary regulator for digital assets under ISA 2025',
   'https://sec.gov.ng',
   'https://home.sec.gov.ng',
   'info@sec.gov.ng',
   '+234 09-462-3600',
   'SEC Tower, Plot 272 Samuel Adesujo Ademulegun Street, Abuja',
   ARRAY['DAX','DAOP','DAC','DAI','SECURITIES','ARIP']),

  ('CBN',
   'Central Bank of Nigeria',
   'Monetary policy, payment systems, naira, banking supervision',
   'https://cbn.gov.ng',
   NULL,
   'info@cbn.gov.ng',
   '+234 0800-225-5226',
   NULL,
   ARRAY['PAYMENT','STABLECOIN','ENAIRA','BANKING','FX']),

  ('NFIU',
   'Nigerian Financial Intelligence Unit',
   'AML/CFT compliance, STR/CTR filing, financial intelligence',
   'https://nfiu.gov.ng',
   'https://goaml.nfiu.gov.ng',
   'info@nfiu.gov.ng',
   '+234 09-461-0000',
   NULL,
   ARRAY['AML','CFT','STR','CTR','VASP_REGISTRATION']),

  ('NITDA',
   'National Information Technology Development Agency',
   'Blockchain policy, data protection (NDPA), AI strategy',
   'https://nitda.gov.ng',
   NULL,
   'info@nitda.gov.ng',
   '+234 09-291-5000',
   NULL,
   ARRAY['BLOCKCHAIN_POLICY','DATA_PROTECTION','AI']),

  ('CAC',
   'Corporate Affairs Commission',
   'Company registration, beneficial ownership register',
   'https://cac.gov.ng',
   NULL,
   'info@cac.gov.ng',
   '+234 09-461-8000',
   NULL,
   ARRAY['INCORPORATION','BENEFICIAL_OWNERSHIP']),

  ('EFCC',
   'Economic and Financial Crimes Commission',
   'Financial crime investigation and prosecution',
   'https://efcc.gov.ng',
   NULL,
   'info@efcc.gov.ng',
   '+234 09-904-5096',
   NULL,
   ARRAY['ENFORCEMENT','AML','FRAUD']),

  ('NAICOM',
   'National Insurance Commission',
   'Insurance regulation — fidelity bonds for VASPs',
   'https://naicom.gov.ng',
   NULL,
   NULL,
   NULL,
   NULL,
   ARRAY['INSURANCE','FIDELITY_BOND'])
ON CONFLICT (code) DO UPDATE SET
  name              = EXCLUDED.name,
  mandate           = EXCLUDED.mandate,
  website           = EXCLUDED.website,
  portal            = EXCLUDED.portal,
  email             = EXCLUDED.email,
  phone             = EXCLUDED.phone,
  address           = EXCLUDED.address,
  jurisdiction_tags = EXCLUDED.jurisdiction_tags;

-- Sanity check
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM public.regulators;
  RAISE NOTICE 'Klarify regulators seeded: % rows', n;
END $$;
