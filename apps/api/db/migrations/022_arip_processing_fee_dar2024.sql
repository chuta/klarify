-- Align SEC Nigeria arip_fees with SEC Digital Asset Rules 2024, Section VIII, Rule 20(a).
-- Replaces superseded per-category filing fee tiers (NGN 100k / 50k).

UPDATE regulators
SET arip_fees = '{
  "arip_processing_fee_ngn": 2000000,
  "currency": "NGN",
  "citation": "SEC Digital Asset Rules 2024, Section VIII, Rule 20(a)",
  "note": "ARIP non-refundable processing fee. Pay via REVOP only after receiving Stage 2 eligibility notification."
}'::jsonb
WHERE code = 'SEC_NIGERIA';
