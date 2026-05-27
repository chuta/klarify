-- US-008B — White Paper Analyzer (Compass+)
-- Gap analysis + SEC Nigeria ARIP outline for uploaded foreign white papers.

CREATE TABLE IF NOT EXISTS public.white_paper_analyses (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                    UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id                   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  source_jurisdiction       TEXT NOT NULL
    CHECK (source_jurisdiction IN ('GH','KE','MU','ZA','OTHER')),
  licence_category_sought   TEXT NOT NULL
    CHECK (licence_category_sought IN ('DAX','DAOP','DAC','DAI','HYBRID')),
  existing_source_licence   TEXT,

  original_filename         TEXT,
  file_type                 TEXT,
  file_size                 INTEGER,
  s3_key                    TEXT,
  extracted_text            TEXT NOT NULL,
  ocr_method                TEXT
    CHECK (ocr_method IS NULL OR ocr_method IN ('pdf-parse','textract','paste')),

  status                    TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','extracting','analysing','complete','error')),
  error_message             TEXT,

  result                    JSONB,
  completeness_pct          INTEGER,
  sections_adequate         INTEGER,

  uploaded_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ocr_completed_at          TIMESTAMPTZ,
  analysed_at               TIMESTAMPTZ,
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_white_paper_analyses_org_uploaded
  ON public.white_paper_analyses(org_id, uploaded_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_white_paper_analyses_status_pending
  ON public.white_paper_analyses(status, uploaded_at)
  WHERE status IN ('pending','extracting','analysing') AND deleted_at IS NULL;

ALTER TABLE public.white_paper_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.white_paper_analyses FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS white_paper_analyses_org_read ON public.white_paper_analyses;
CREATE POLICY white_paper_analyses_org_read ON public.white_paper_analyses
  FOR SELECT USING (public.is_org_member(org_id) AND deleted_at IS NULL);

DROP POLICY IF EXISTS white_paper_analyses_org_write ON public.white_paper_analyses;
CREATE POLICY white_paper_analyses_org_write ON public.white_paper_analyses
  FOR INSERT WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS white_paper_analyses_org_update ON public.white_paper_analyses;
CREATE POLICY white_paper_analyses_org_update ON public.white_paper_analyses
  FOR UPDATE USING (public.is_org_member(org_id));
