# Klarify — US-008B · White Paper Analyzer

**Status:** ✅ IMPLEMENTED — PENDING MANUAL QA & DEPLOY  
**Author:** Chimezie Chuta / Blockspace Technologies  
**Date:** 27 May 2026  
**Approved:** 27 May 2026 — Chimezie Chuta (product owner)  
**Parent feature:** US-008 Compliance Document Generator  
**Sprint placement:** Post–Sprint 5 (Beta sprint or Sprint 6 extension)  
**Canonical spec:** `Klarify_US-008B_White_Paper_Analyzer.md`

---

## 1. Summary

Founders expanding into Nigeria who already operate elsewhere (e.g. Ghana-licensed VASP with an existing token and white paper) need to know whether their **current white paper** meets **SEC Nigeria ARIP white paper requirements**, what gaps exist, and how to produce a **Nigeria-compliant outline** without starting from a blank page.

**White Paper Analyzer** is a Compass+-gated sub-tab under **Document Generator**. It accepts upload or paste of an existing white paper, produces a structured **gap report** and a draft **SEC Nigeria ARIP white paper outline**, and offers a one-click handoff to the existing **ARIP White Paper Outline** generator with fields pre-filled.

This extends US-008; it does not replace the Letter Analyser (US-002) or Jurisdiction Expansion Adviser (US-004).

---

## 2. User story

**As a founder or compliance officer who already has a white paper from another jurisdiction,**

I want to upload my existing white paper and receive a plain-English gap analysis against SEC Nigeria ARIP requirements plus a draft Nigeria-compliant outline — so I know exactly what to rewrite before engaging my solicitor and filing an ARIP application.

### Primary personas

| Persona | Scenario |
|---|---|
| **Corporate Innovator** | Bank/telco innovation team expanding a GH-licensed product into NG |
| **Compliance Professional** | Lawyer reviewing a client's foreign white paper before NG filing |
| **Pre-Launch / ARIP founder** | Has a 2021–2023 white paper that predates ISA 2025 / current SEC DAR |

### Pain point (from the book)

Founders treat white papers as marketing documents. SEC Nigeria expects a **structured disclosure instrument** tied to the ARIP application bundle. A Ghana-compliant or self-drafted white paper often omits Nigeria-specific requirements — exit plan, AIP restrictions, solicitor filing pathway, NFIU AML cross-references, fidelity bond commitment — and founders only discover the gaps at solicitor review or SEC feedback.

---

## 3. Product positioning

```text
Jurisdiction Expansion (US-004)     →  Org-level: licensing, capital, AML programme
White Paper Analyzer (US-008B)      →  Document-level: does THIS white paper work for SEC NG?
ARIP White Paper Generator (US-008) →  Produce the final editable submission document
ARIP Tracker (US-009)               →  Track application stages after documents are ready
```

**Differentiation from Letter Analyser (US-002):** No urgency/deadline/draft response letter. Output is completeness scoring, section gaps, and product disclosure outline — not regulator correspondence.

**Differentiation from Jurisdiction Expansion (US-004):** Analyses the **content and structure of one uploaded document**, not the org's overall compliance posture across seven dimensions.

---

## 4. Plan gating

| Plan | Access |
|---|---|
| Free | `UpgradePrompt` — Compass required |
| Navigator | `UpgradePrompt` — Compass required |
| Compass | Full access |
| Flagship | Full access |

**Rationale:** Multi-jurisdiction expansion aligns with Compass (`jurisdictions: 2`). This feature does **not** consume the Navigator 3-documents/month generator quota or the Navigator 5/month letter-analyser quota. It is a distinct Compass+ capability.

**Middleware:** `requireFeature('white_paper_analyzer')` — new boolean in `PlanLimits` (Compass+ only). Do not overload `document_analyses` or `document_templates` counters.

---

## 5. UI placement & navigation

### Location

Sub-tab on the Document Generator page:

**Route:** `/dashboard/compliance/documents` with tab state `?tab=analyzer`  
**Results route:** `/dashboard/compliance/documents/analyzer/[id]`

### Top-level tabs on Document Generator page

| Tab | Label | Default |
|---|---|---|
| `templates` | Templates | Yes (existing library) |
| `analyzer` | White Paper Analyzer | New |

Do **not** add a separate sidebar nav item. The analyzer tab appears in the page header tab strip below the Document Generator title.

### Compass+ gate (Free / Navigator)

When a non-Compass user selects the **White Paper Analyzer** tab, render `UpgradePrompt`:

- Feature: `white_paper_analyzer`
- Required plan: `compass`
- Copy: *"Analyse an existing white paper against SEC Nigeria ARIP requirements and get a gap report plus Nigeria-compliant outline."*
- CTA: `/dashboard/billing?plan=compass`

### Analyzer tab layout (mirrors Letter Analyser)

Modelled after `/dashboard/documents` (Regulatory letter analyser):

1. **Page title (within tab):** White Paper Analyzer  
2. **Subtitle:** Upload or paste your existing white paper. Klarify will assess it against SEC Nigeria ARIP white paper requirements, highlight gaps, and draft a Nigeria-compliant outline — typically in under 60 seconds.  
3. **Input sub-tabs:** Upload file | Paste text | Recent (N)  
4. **Pre-submit metadata form** (required before analysis starts):
   - **Source jurisdiction** (select): `GH` | `KE` | `MU` | `ZA` | `OTHER`
   - **Licence category sought in Nigeria** (select): `DAX` | `DAOP` | `DAC` | `DAI` | `HYBRID`
   - **Existing licence in source market** (optional text): e.g. "Ghana VASP Act 2025 — Digital Asset Exchange"
5. **Upload zone:** PDF, JPG, PNG, WEBP — max 10 MB (reuse existing upload validation)  
6. **Disclaimer banner** (non-dismissible, amber): standard Klarify legal disclaimer + ARIP solicitor filing note (Section 16, ARIP Framework)

### Results page layout

Processing stepper (reuse pattern from letter analyser):

- Uploading document…
- Extracting text…
- Analysing against SEC Nigeria requirements…
- Preparing gap report and outline…

**Results — two-column desktop, stacked mobile:**

#### Left column — Gap Report

| Block | Content |
|---|---|
| **Completeness banner** | e.g. "8 of 14 required sections adequately covered" — colour: red ≤5, amber 6–10, green 11–14 |
| **Executive summary** | 2–3 sentences: overall readiness for ARIP white paper submission |
| **Critical gaps** | Top 5 blockers ranked; each with remediation step |
| **Section assessment table** | 14 rows (see §7); columns: Section | Status | Gap summary | Citation chips |
| **Source jurisdiction notes** | What from the foreign WP can be retained vs must be rewritten for NG |
| **Token / classification flags** | If uploaded WP classifies token differently than likely NG category — amber alert |

**Status values per section:** `adequate` | `partial` | `missing` | `not_applicable`

#### Right column — Draft Outline

| Block | Content |
|---|---|
| **Draft ARIP white paper outline** | Full 14-section outline per `ARIP_WHITEPAPER` template structure; section headings + bullet guidance (not full legal prose) |
| **Editable rich text** | TinyMCE editor (reuse document generator editor) |
| **Actions** | Copy to clipboard | Download gap report (.docx) | Download outline (.docx) |
| **Primary CTA** | **Open in Document Generator** → `/dashboard/compliance/documents/generate/ARIP_WHITEPAPER?fromAnalysis={id}` with form fields pre-filled from analysis |

#### Footer

- Persistent disclaimer  
- **Ask Klarify about this analysis** → `/dashboard/ask?context=whitepaper_analysis&analysisId={id}`

---

## 6. Input requirements

| Field | Required | Validation |
|---|---|---|
| File or pasted text | Yes | Min 1,000 characters extracted/pasted; max 200,000 characters |
| Source jurisdiction | Yes | Enum: GH, KE, MU, ZA, OTHER |
| Licence category (NG) | Yes | Enum: DAX, DAOP, DAC, DAI, HYBRID |
| Existing source licence | No | Max 500 chars |

**Pre-flight rejection (422):**

- Extracted text < 1,000 chars → *"This document doesn't contain enough text for analysis. Try a clearer PDF or paste the full white paper."*
- Heuristic: no section-like structure detected → warn but proceed with `low_structure_confidence: true` flag in result

**Supported file types:** Same as Letter Analyser — PDF, JPG, JPEG, PNG, WEBP. Max 10 MB. S3 encrypted storage. UUID-only keys.

---

## 7. Assessment checklist — 14 SEC Nigeria sections

Gap analysis MUST evaluate against this fixed checklist (canonical source: `packages/ai/src/prompts/documents/ARIP_WHITEPAPER.ts` system prompt structure):

| # | Section ID | Section name |
|---|---|---|
| 1 | `executive_summary` | Executive Summary |
| 2 | `about_issuer` | About the Issuer |
| 3 | `product_description` | Product Description |
| 4 | `technology` | Technology & Custody Architecture |
| 5 | `regulatory_categorisation` | Regulatory Categorisation (NG licence category) |
| 6 | `risk_disclosure` | Risk Disclosure (≥6 risk categories) |
| 7 | `investor_protection` | Investor / Customer Protection |
| 8 | `aml_cft` | AML / CFT Compliance Summary |
| 9 | `governance` | Governance & Sponsored Individuals |
| 10 | `capital_insurance` | Capital and Fidelity Bond / Insurance |
| 11 | `application_pathway` | Application Pathway (solicitor + REVOP fee) |
| 12 | `exit_plan` | Exit Plan (Section 36 — mandatory) |
| 13 | `aip_restrictions` | AIP Period Restrictions (Section 29) |
| 14 | `sign_off` | Sign-off & Solicitor Review |

AI MUST NOT invent additional mandatory sections beyond this list without flagging them as *recommended* rather than *required*.

---

## 8. Output schema

Structured JSON persisted to `white_paper_analyses.result` (see §10).

```typescript
interface WhitePaperAnalysisResult {
  /** ISO-8601 */
  analysed_at: string;

  source_jurisdiction: 'GH' | 'KE' | 'MU' | 'ZA' | 'OTHER';
  licence_category_sought: 'DAX' | 'DAOP' | 'DAC' | 'DAI' | 'HYBRID';
  existing_source_licence: string | null;

  /** 0–14 count of sections marked adequate */
  sections_adequate_count: number;
  sections_total: 14;
  completeness_pct: number; // round(adequate / applicable * 100)

  executive_summary: string;

  critical_gaps: Array<{
    rank: number; // 1–5
    section_id: string;
    title: string;
    gap_description: string;
    remediation: string;
    citations: Citation[];
  }>;

  section_assessments: Array<{
    section_id: string;
    section_name: string;
    status: 'adequate' | 'partial' | 'missing' | 'not_applicable';
    found_in_upload: boolean;
    gap_summary: string; // empty if adequate
    remediation: string; // empty if adequate
    citations: Citation[];
  }>;

  source_jurisdiction_notes: {
    retainable_content: string[];   // bullet list
    must_rewrite: string[];         // bullet list
    comparative_notes: string;    // plain English GH→NG etc.
  };

  token_classification_flags: Array<{
    severity: 'info' | 'amber' | 'critical';
    message: string;
    citations: Citation[];
  }>;

  /** Draft outline — mirrors ARIP_WHITEPAPER 14-section structure */
  draft_outline: {
    sections: Array<{
      number: number;
      title: string;
      guidance: string;       // bullet points for what to include
      suggested_content: string; // draft paragraph stubs where gaps exist
      regulatory_basis: string;
    }>;
  };

  /** Pre-fill payload for ARIP_WHITEPAPER generator form */
  generator_prefill: {
    product_name?: string;
    licence_category: string;
    product_summary?: string;
    token_or_asset_details?: string;
    target_users?: string;
    technology_stack?: string;
    investor_protection_measures?: string;
    capital_position?: string;
  };

  low_structure_confidence: boolean;

  disclaimer: string; // MUST be exact CLAUDE.md §16 sentence
}

interface Citation {
  regulation: string;
  section: string;
  url?: string;
}
```

**Disclaimer field (mandatory, exact text):**

> This is regulatory information, not legal advice. For advice specific to your situation, consult a qualified practitioner.

Additional UI copy (not in JSON): *This gap report and outline are first drafts for review with your registered Nigerian solicitor. Under Section 16 of the ARIP Framework, ARIP applications MUST be filed through a registered solicitor or adviser.*

---

## 9. AI & RAG requirements

| Parameter | Value |
|---|---|
| Model | `ANTHROPIC_MODEL_ARCH` (Opus 4) |
| Temperature | `0` |
| Max tokens | `6000` |
| RAG query | First 2,000 chars of extracted text + `"SEC Nigeria ARIP white paper disclosure requirements token classification exit plan investor protection"` |
| RAG jurisdictions | `['NG', source_jurisdiction, 'FATF']` |
| topK | `12` |
| minSimilarity | `0.5` |

**System prompt:** New file `packages/ai/src/prompts/whitePaperAnalyser.ts`.  
⚠️ **CLAUDE.md §18:** Requires explicit product owner review before production merge.

**Prompt rules (non-negotiable):**

1. Plain language throughout  
2. Every regulatory claim cited from retrieved corpus  
3. Distinguish settled positions vs evolving areas  
4. Never hallucinate section numbers — say "verify at sec.gov.ng" if uncertain  
5. Map assessment ONLY to the 14-section checklist in §7  
6. Flag if uploaded document appears to be marketing material, not a white paper  
7. Cross-reference CBN VASP Guidelines if product involves naira on/off-ramps  
8. Always include solicitor filing requirement in `application_pathway` assessment  
9. `exit_plan` missing → always `critical` gap regardless of other scores  

**Response format:** Structured JSON only (validated with Zod). Same pattern as product classification and jurisdiction gap endpoints.

---

## 10. Data model

### New table: `white_paper_analyses`

```sql
CREATE TABLE white_paper_analyses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID NOT NULL REFERENCES organisations(id),
  user_id           UUID NOT NULL REFERENCES users(id),

  -- Input metadata
  source_jurisdiction       TEXT NOT NULL,  -- GH|KE|MU|ZA|OTHER
  licence_category_sought   TEXT NOT NULL,  -- DAX|DAOP|DAC|DAI|HYBRID
  existing_source_licence   TEXT,

  -- Source document
  original_filename   TEXT,
  file_type           TEXT,
  file_size           INT,
  s3_key              TEXT,               -- null if paste-only
  extracted_text      TEXT NOT NULL,
  ocr_method          TEXT,               -- pdf_parse|textract|paste

  -- Processing
  status              TEXT NOT NULL DEFAULT 'pending',
  -- pending | extracting | analysing | complete | error
  error_message       TEXT,

  -- Output
  result              JSONB,              -- WhitePaperAnalysisResult
  completeness_pct    INT,                -- denormalised for list sort
  sections_adequate   INT,

  -- Timestamps
  uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
  ocr_completed_at    TIMESTAMPTZ,
  analysed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_white_paper_analyses_org ON white_paper_analyses(org_id, uploaded_at DESC);
```

**RLS:** Org-scoped — same pattern as `uploaded_documents`.

**Reuse:** OCR pipeline (`documentOcr.ts`) and S3 upload service — pass `documentKind: 'white_paper'` or use dedicated service wrapper; do NOT mix results into letter analyser list.

### Plan limits update (`packages/core/src/types/subscription.ts`)

```typescript
// Add to PlanLimits interface:
readonly white_paper_analyzer: boolean;

// Values:
free: false
navigator: false
compass: true
flagship: true
```

---

## 11. API endpoints

Base path: `/api/documents/whitepaper`

| Method | Path | Auth | Gate | Description |
|---|---|---|---|---|
| `POST` | `/upload` | JWT | Compass+ | Multipart upload + metadata → 202 + `{ analysisId, pollUrl }` |
| `POST` | `/analyse` | JWT | Compass+ | Paste text + metadata → 202 |
| `GET` | `/:id/status` | JWT | Org RLS | Poll processing state |
| `GET` | `/:id` | JWT | Org RLS | Full result |
| `GET` | `/recent` | JWT | Org RLS | Last 10 analyses (for Recent tab) |
| `POST` | `/:id/export-gap-report` | JWT | Compass+ | Gap report .docx → signed S3 URL (1h TTL) |
| `POST` | `/:id/export-outline` | JWT | Compass+ | Outline .docx → signed S3 URL (1h TTL) |
| `DELETE` | `/:id` | JWT | Org RLS | Soft delete |

**Error codes:**

| Code | HTTP | When |
|---|---|---|
| `PLAN_LIMIT_REACHED` | 402 | Free / Navigator |
| `INSUFFICIENT_TEXT` | 422 | < 1,000 chars |
| `INVALID_FILE_TYPE` | 415 | Not PDF/image |
| `FILE_TOO_LARGE` | 413 | > 10 MB |

**Netlify proxy routes (web):**

- `apps/web/src/app/api/documents/whitepaper/[...path]/route.ts` — proxy to Fly API (same pattern as existing document routes)

---

## 12. Export documents (.docx)

### Gap Report structure

1. Company name + date header (from org profile)  
2. Title: *White Paper Gap Analysis — SEC Nigeria ARIP Requirements*  
3. Source jurisdiction + licence category sought  
4. Completeness score + executive summary  
5. Critical gaps (numbered)  
6. Full 14-section assessment table  
7. Source jurisdiction adaptation notes  
8. Citations appendix  
9. Disclaimer footer (mandatory)

### Outline export structure

1. Company letterhead  
2. Title: *ARIP White Paper Outline (Draft)*  
3. All 14 sections with guidance bullets  
4. Regulatory basis footer per section where applicable  
5. Solicitor filing reminder  
6. Disclaimer footer

Reuse `docx` pipeline from `exportDraft.ts` / `documentGeneration.ts`.

---

## 13. Integrations

| Integration | Behaviour |
|---|---|
| **ARIP White Paper Generator** | CTA passes `generator_prefill` as query params or server-side session; user lands on generate form with fields populated |
| **Roadmap task P3 (ARIP submission)** | Optional v1.1: link from results — *"Mark white paper reviewed"* (does not auto-complete task) |
| **Readiness score** | Optional v1.1: suggest updating `white_paper_drafted` indicator when `completeness_pct ≥ 70` — manual confirm only |
| **Jurisdiction Expansion** | Dashboard nudge on US-004 results page: *"Upload your white paper for SEC Nigeria gap analysis →"* |
| **Ask Klarify** | Pre-load analysis summary as chat context |
| **Email** | Optional v1.1: notify on completion (no urgency tiers — standard completion email) |

---

## 14. Acceptance criteria

### Input & upload

- [ ] Compass+ user can access White Paper Analyzer tab under Document Generator  
- [ ] Free / Navigator users see `UpgradePrompt` on analyzer tab (402 on API)  
- [ ] User must provide source jurisdiction and NG licence category before submit  
- [ ] Upload accepts PDF and images; paste accepts min 1,000 characters  
- [ ] Files stored encrypted in S3; not publicly accessible  

### Analysis output — Gap Report

- [ ] Result includes executive summary and completeness score (X/14 sections adequate)  
- [ ] All 14 checklist sections present in `section_assessments`  
- [ ] Each non-adequate section has gap summary, remediation, and ≥1 citation  
- [ ] Top 5 critical gaps ranked; missing `exit_plan` always appears in critical gaps  
- [ ] Source jurisdiction adaptation notes (retain vs rewrite) present when source ≠ OTHER  
- [ ] Token classification flags shown when uploaded WP classification may differ from NG category  
- [ ] Solicitor filing requirement (ARIP §16) referenced in application pathway assessment  

### Analysis output — Draft Outline

- [ ] Draft outline contains all 14 sections matching ARIP_WHITEPAPER structure  
- [ ] Outline is editable in TinyMCE  
- [ ] **Open in Document Generator** pre-fills ARIP_WHITEPAPER form from `generator_prefill`  

### Export & UX

- [ ] Gap report downloadable as valid .docx  
- [ ] Outline downloadable as valid .docx  
- [ ] Processing stepper shows four stages; polls every 2s  
- [ ] Recent tab lists prior analyses with completeness score + date  
- [ ] Non-dismissible legal disclaimer on input and results pages  
- [ ] Analysis completes in < 90 seconds for typical 30-page PDF  

### Security & quality

- [ ] RLS: user cannot access another org's analyses  
- [ ] Opus 4 used (verify in API logs)  
- [ ] Invalid JSON from Claude returns 503 with retry message, not partial result  
- [ ] S3 download URLs expire after 1 hour  

---

## 15. Out of scope (v1)

- Side-by-side diff view (foreign WP vs NG outline)  
- Analysis of multiple documents in one submission (WP + tokenomics + legal opinion bundle)  
- Auto-marking roadmap tasks or readiness indicators without user confirmation  
- Human specialist escalation workflow (use existing Specialists page)  
- Counting against `document_analyses` or `document_templates` monthly quotas  
- Separate sidebar navigation entry  
- White paper analysis for non-NG target jurisdictions (NG is always the assessment target in v1)  

---

## 16. Dependencies

| Dependency | Status |
|---|---|
| Document upload + OCR pipeline (Sprint 3) | ✅ Live |
| ARIP_WHITEPAPER template (Sprint 4) | ✅ Live |
| RAG corpus: NG SEC DAR, ISA 2025, ARIP Framework, Founder's Guide | ✅ Ingested |
| RAG corpus: GH VASP Act 2025 (comparative) | ✅ Ingested |
| docx export pipeline | ✅ Live |
| Compass plan + feature gate middleware | ✅ Live (extend with new flag) |
| Product owner approval of system prompt | ☐ Pending |

---

## 17. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Marketing deck uploaded as white paper | Heuristic flag + `low_structure_confidence`; user warning in UI |
| Long PDF poor OCR | Paste-text fallback; min-char rejection with clear message |
| Overclaiming legal adequacy | Mandatory disclaimers; label output "outline for solicitor review" |
| GH ↔ NG section mapping errors | Fixed 14-section NG checklist; no free-form comparison |
| Prompt drift / hallucinated citations | Temperature 0, RAG grounding, Zod validation, regression tests |

---

## 18. Test plan (pre-release)

### Unit / API tests

- Compass user: upload → complete analysis with 14 section rows  
- Navigator user: 402 on upload  
- Webhook-invalid-signature N/A (no webhook)  
- Text < 1,000 chars → 422  
- Missing `exit_plan` in sample fixture → appears in `critical_gaps`  
- `generator_prefill` maps to ARIP_WHITEPAPER form fields  
- Export endpoints return valid ZIP (.docx)  
- RLS: org A cannot read org B analysis  

### Manual QA fixtures

Prepare 3 fictional test white papers (do not use real client documents):

1. **GH exchange WP** — good product/tech sections, missing exit plan and AIP restrictions → expect amber/red completeness  
2. **Token ICO WP (2021 style)** — outdated regulatory framing → expect token classification flags  
3. **Minimal 2-page summary** — should reject or warn with low structure confidence  

---

## 19. Implementation outline (post sign-off)

Execute only after product owner approval of this spec and the system prompt.

| Phase | Deliverable | Estimate |
|---|---|---|
| **A** | DB migration + `PlanLimits` + feature gate | 0.5 day |
| **B** | `whitePaperAnalysis.ts` service + prompt + Zod schema + queue | 1.5 days |
| **C** | API routes + export services | 1 day |
| **D** | UI: tab + uploader + results page + generator handoff | 1.5 days |
| **E** | Tests + CLAUDE.md §17 update + manual QA | 1 day |

**Total:** ~5–6 engineering days

---

## 20. Sign-off

| Reviewer | Role | Date | Decision |
|---|---|---|---|
| Chimezie Chuta | Product owner | 27 May 2026 | ✅ Approved |
| | Engineering | | Pending implementation kickoff |
| | Legal / compliance review | | System prompt review at build (§18) |

**Notes / revisions requested:** None — approved as written.

---

*Klarify — US-008B White Paper Analyzer v1.0 · Blockspace Technologies · klarify.africa*
