/** Stage options for onboarding and readiness re-assessment wizards. */
export const STAGE_OPTIONS = [
  { value: 'idea', label: 'Idea Stage', desc: "I have a concept but haven't started building" },
  { value: 'building', label: 'Building', desc: 'Actively developing the product' },
  { value: 'launched', label: 'Launched', desc: 'Live with real users, no licence yet' },
  { value: 'arip', label: 'ARIP in Progress', desc: 'SEC approval-in-principle process started' },
  { value: 'licensed', label: 'Licensed', desc: 'Full regulatory licence obtained' },
] as const;

/** Infrastructure checklist — seeds Readiness Score indicator state. */
export const INFRASTRUCTURE_OPTIONS = [
  { key: 'corporate_structure.cac_registered', label: 'Registered with the Corporate Affairs Commission (CAC)' },
  { key: 'corporate_structure.correct_share_structure', label: 'Share structure meets SEC minimum capital thresholds' },
  { key: 'corporate_structure.nigerian_ceo_resident', label: 'CEO/MD is resident in Nigeria' },
  { key: 'capital_licensing.minimum_capital_deposited', label: 'Minimum paid-up capital deposited and documented' },
  { key: 'capital_licensing.capital_source_documented', label: 'Source of capital funds documented' },
  { key: 'capital_licensing.arip_application_submitted', label: 'ARIP application submitted to SEC Nigeria' },
  { key: 'aml_cft_programme.bwra_documented', label: 'Business-Wide Risk Assessment (BWRA) documented' },
  { key: 'aml_cft_programme.aml_policy_in_place', label: 'AML/CFT Policy Manual drafted and adopted' },
  { key: 'aml_cft_programme.nfiu_goaml_registered', label: 'Registered on the NFIU goAML portal' },
  { key: 'aml_cft_programme.mlro_appointed', label: 'Money Laundering Reporting Officer (MLRO) appointed' },
  { key: 'kyc_infrastructure.nin_verification_integrated', label: 'NIN (National Identity Number) verification integrated' },
  { key: 'kyc_infrastructure.bvn_verification_integrated', label: 'BVN (Bank Verification Number) verification integrated' },
  { key: 'kyc_infrastructure.tiered_kyc_documented', label: 'Tiered KYC framework documented' },
  { key: 'product_classification.product_classified', label: 'Product formally classified under SEC Digital Asset Rules' },
  { key: 'product_classification.legal_opinion_obtained', label: 'Legal opinion on product classification obtained' },
] as const;
