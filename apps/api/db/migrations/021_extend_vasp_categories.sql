-- Phase 2 — SEC Circular 26-1 VASP categories: AVASP, DAPO, RATOP.
-- Extends CHECK constraints on classification, ARIP, and white paper tables.

ALTER TABLE public.product_classifications
  DROP CONSTRAINT IF EXISTS product_classifications_primary_category_check;

ALTER TABLE public.product_classifications
  ADD CONSTRAINT product_classifications_primary_category_check
  CHECK (primary_category IN (
    'DAX', 'DAOP', 'DAC', 'DAI', 'AVASP', 'DAPO', 'RATOP', 'PAYMENT', 'HYBRID'
  ));

ALTER TABLE public.arip_applications
  DROP CONSTRAINT IF EXISTS arip_applications_licence_type_check;

ALTER TABLE public.arip_applications
  ADD CONSTRAINT arip_applications_licence_type_check
  CHECK (licence_type IN (
    'DAX', 'DAOP', 'DAC', 'DAI', 'AVASP', 'DAPO', 'RATOP', 'unknown'
  ));

ALTER TABLE public.white_paper_analyses
  DROP CONSTRAINT IF EXISTS white_paper_analyses_licence_category_sought_check;

ALTER TABLE public.white_paper_analyses
  ADD CONSTRAINT white_paper_analyses_licence_category_sought_check
  CHECK (licence_category_sought IN (
    'DAX', 'DAOP', 'DAC', 'DAI', 'AVASP', 'DAPO', 'RATOP', 'HYBRID'
  ));
