═══════════════════════════════════════════════════════════════
KLARIFY — SPRINT 6
EXECUTABLE TASK BREAKDOWN FOR CLAUDE CODE
Source: Klarify_PRD_v1.1 + CLAUDE.md (May 2026)
═══════════════════════════════════════════════════════════════

HOW TO USE THIS FILE
─────────────────────
Each task block between ═══ dividers is a self-contained
Claude Code prompt. Copy the entire block and paste directly
into Claude Code as a single instruction.

TASK TYPES:
  🤖 CLAUDE CODE   → Paste directly into Claude Code
  🖐  MANUAL        → You must do this yourself (external
                      service, account, configuration)
  🔍 VERIFY         → Run this check before proceeding

MODEL GUIDE:
  Architecture / hard problems → Opus 4
  All implementation work      → Sonnet 4.5
  Debugging after 2 attempts   → Escalate to Opus 4

SPRINT PREREQUISITES — confirm before starting Sprint 6:
  ✅ Sprint 5 complete: billing, ARIP tracker, regulator CRM,
     email notifications, 13 document templates, lifecycle drips
  ✅ Migration 018_email_drip_log.sql applied in production
  ✅ All tests passing: pnpm test
  ✅ Zero TypeScript errors: pnpm tsc --noEmit
  ✅ Product owner has reviewed scenario + jurisdiction prompts
     before merge (CLAUDE.md §18 — prompts are locked assets)

SCOPE DECISIONS (Sprint 6):
  ✅ IN SCOPE:  US-005 Scenario Simulator, US-004 Jurisdiction Expansion
  ❌ OUT OF SCOPE: US-011 full Human Escalation directory (vetted profiles,
     booking, referral fees). Keep /dashboard/specialists request form
     for MVP. Compliance PDF export (US-006) deferred to Sprint 7.
  ❌ OUT OF SCOPE: PWA packaging, native mobile — Beta track items


╔═══════════════════════════════════════════════════════════╗
║  SPRINT 6 — WEEKS 13–14                                   ║
║  GOAL: LAUNCH FEATURES LIVE                               ║
║                                                           ║
║  Delivers: US-005 (Scenario Simulator),                   ║
║            US-004 (Jurisdiction Expansion Adviser)        ║
║                                                           ║
║  Milestone: PRD §8 Launch track (weeks 17–20) —           ║
║  scenario + jurisdiction features; human escalation       ║
║  directory deferred to post-beta.                         ║
╚═══════════════════════════════════════════════════════════╝


PLAN GATING (CLAUDE.md §10 — DO NOT modify without sign-off)
─────────────────────────────────────────────────────────────
Feature                  Free/Navigator    Compass      Flagship
Scenario Simulator       ❌                ✅           ✅
Jurisdiction targets     Nigeria only      2 total      All 5
                         (no expansion UI) (NG + 1)     (NG,GH,KE,MU,ZA)

Both features count against ai_queries_monthly (same bucket as
chat and classify) unless product owner adds a separate cap.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 6 — PHASE A: SHARED FOUNDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S6-A1 🤖 CLAUDE CODE — Types, Validation & System Prompts
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md §6 (AI rules), §9 (API structure), §10
(PLAN_LIMITS), §11 (corpus), and PRD v1.1 US-004 + US-005
fully before starting.
Use Opus 4 for prompt design. Use Sonnet 4.5 for types/schemas.

⚠️  CLAUDE.md §18: KLARIFY_SCENARIO_PROMPT and
KLARIFY_JURISDICTION_PROMPT require product owner review
before merge. Do not ship prompts without Chimezie sign-off.

1. CORE TYPES
   Create: packages/core/src/types/scenario.ts
   Create: packages/core/src/types/jurisdictionGap.ts

   ScenarioResult:
   {
     scenario_summary: string,
     outcomes: {
       best_case: ScenarioOutcome,
       likely_case: ScenarioOutcome,
       worst_case: ScenarioOutcome
     },
     key_assumptions: string[],
     citations: Citation[],
     disclaimer: string
   }

   ScenarioOutcome:
   {
     label: 'best_case' | 'likely_case' | 'worst_case',
     probability: 'LOW' | 'MEDIUM' | 'HIGH',
     summary: string,
     regulatory_basis: string,
     business_impact: string,
     recommended_mitigation: string,
     citations: Citation[]
   }

   JurisdictionGapResult:
   {
     source_jurisdiction: JurisdictionCode,
     target_jurisdictions: JurisdictionCode[],
     generated_at: string,
     dimensions: Array<{
       dimension: 'corporate_structure' | 'licensing' |
         'capital_requirements' | 'aml_cft_programme' |
         'kyc_standards' | 'reporting_obligations' |
         'regulatory_contacts',
       jurisdiction: JurisdictionCode,  // which target this row applies to
       status: 'green' | 'amber' | 'red',
       current_state: string,
       target_requirement: string,
       gap_summary: string,
       how_to_close: string,
       citations: Citation[]
     }>,
     regulator_contacts: Array<{
       jurisdiction: JurisdictionCode,
       name: string,
       website: string,
       email: string
     }>,
     disclaimer: string
   }

   Re-export from packages/core/src/types/index.ts

2. ZOD VALIDATION
   Create: packages/core/src/validation/scenario.ts
   Create: packages/core/src/validation/jurisdictionGap.ts
   Mirror classify.ts patterns (min lengths, jurisdiction enums).
   JurisdictionCode enum: NG | GH | KE | MU | ZA

3. SCENARIO TEMPLATES (constants — not AI-generated)
   Create: packages/core/src/scenarios/templates.ts

   Export SCENARIO_TEMPLATES array (id, title, description, prefillText):

   S1: Launch without ARIP application
   S2: Operate DAX without SEC registration
   S3: Add naira on-ramp without CBN engagement
   S4: CBN stablecoin framework published (hypothetical evolution)
   S5: Expand to Ghana before NG licence secured
   S6: Receive SEC enforcement notice (pre-response planning)
   S7: AIP promotional ban breach scenario
   S8: Cross-border custody without DAC registration

4. SYSTEM PROMPTS
   Create: packages/ai/src/prompts/scenario.ts
     export const KLARIFY_SCENARIO_PROMPT

   Create: packages/ai/src/prompts/jurisdiction.ts
     export const KLARIFY_JURISDICTION_PROMPT

   Export from packages/ai/src/prompts/index.ts

   SCENARIO PROMPT rules (PRD US-005):
   - Plain English; cite every regulatory claim
   - Output structured JSON only (no markdown wrapper)
   - Best Case / Likely Case / Worst Case with probability,
     regulatory basis, business impact, recommended mitigation
   - Flag areas of regulatory evolution explicitly
   - Mandatory disclaimer (CLAUDE.md §16 Rule 1)
   - Never give definitive legal advice

   JURISDICTION PROMPT rules (PRD US-004):
   - Compare source vs target using user's profile + indicator context
   - 7 dimension rows per target jurisdiction
   - green / amber / red with actionable how_to_close guidance
   - Cite: GH VASP Act 2025, KE VASP Act 2025, MU VAITOS, ZA CASP/FSCA
   - Nigeria baseline: ISA 2025, SEC DAR, MLPPA, NFIU VASP framework
   - If uncertain of section number: say so — do not hallucinate
   - Mandatory disclaimer

5. REPLACE STUBS
   Update: packages/ai/src/scenarios/index.ts
     Re-export SCENARIO_TEMPLATES + ScenarioResult types from core

   Update: packages/ai/src/jurisdiction/index.ts
     Re-export JurisdictionGapResult types from core

6. TESTS
   Create: packages/core/src/__tests__/validation/scenario.test.ts
   Create: packages/core/src/__tests__/validation/jurisdictionGap.test.ts
   Create: packages/ai/src/__tests__/prompts/scenario.test.ts
   Create: packages/ai/src/__tests__/prompts/jurisdiction.test.ts

   - Zod rejects scenario < 30 chars
   - Zod rejects invalid jurisdiction codes
   - Prompt files contain disclaimer requirement
   - Prompt files require JSON output shape keywords
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S6-A2 🤖 CLAUDE CODE — Database Migration & Prisma Models
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 5 (schema) and Section 15 (RLS)
before starting. Use Sonnet 4.5.

Create: apps/api/db/migrations/019_scenario_jurisdiction.sql

Tables:

scenario_analyses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          UUID NOT NULL REFERENCES organisations(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  scenario_text   TEXT NOT NULL,
  template_id     TEXT,                -- SCENARIO_TEMPLATES id if used
  parent_id       UUID REFERENCES scenario_analyses(id),  -- iteration chain
  result          JSONB NOT NULL,
  model_used      TEXT,
  tokens_used     INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

jurisdiction_gap_analyses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                UUID NOT NULL REFERENCES organisations(id),
  user_id               UUID NOT NULL REFERENCES users(id),
  source_jurisdiction   TEXT NOT NULL,
  target_jurisdictions  TEXT[] NOT NULL,
  result                JSONB NOT NULL,
  model_used            TEXT,
  tokens_used           INT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
)

RLS policies: org-scoped on both tables (mirror product_classifications).
Indexes: (org_id, created_at DESC) on both tables.

Update: apps/api/prisma/schema.prisma
  Add ScenarioAnalysis and JurisdictionGapAnalysis models.

Run: pnpm --filter @klarify/api db:generate

Apply in production before deploying Sprint 6 API routes.
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S6-A3 🤖 CLAUDE CODE — Feature Gate Extensions
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read apps/api/src/middleware/featureGate.ts and
packages/core/src/types/subscription.ts before starting.
Use Sonnet 4.5.

Update: apps/api/src/middleware/featureGate.ts

Add exported helpers:

requireScenarioSimulator()
  → wraps requireFeature('scenario_simulator')
  → 402 if free or navigator plan

requireJurisdictionExpansion(targets: JurisdictionCode[])
  Logic:
  a. resolveOrgPlan(userId)
  b. free / navigator → 402 with upgradeUrl (Nigeria only — no expansion)
  c. compass → allow if:
       - source + targets ⊆ {NG, GH, KE, MU, ZA}
       - unique jurisdiction count in analysis ≤ 2
       - at least one target ≠ source
  d. flagship → allow all 5 codes, up to 4 targets per request
  e. Return 402 with { code: 'PLAN_LIMIT_REACHED', requiredPlan, upgradeUrl }

Both endpoints also use rateLimitAI (same bucket as chat/classify).

Update: apps/api/src/__tests__/billing/billing.test.ts
  - scenario_simulator blocked for navigator
  - jurisdiction expansion blocked for free plan
  - compass allows NG→GH
  - compass blocks NG→GH+KE in single request (exceeds 2-jurisdiction limit)
  - flagship allows NG→GH+KE+MU+ZA
═══════════════════════════════════════════════════════


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 6 — PHASE B: SCENARIO SIMULATOR (US-005)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S6-B1 🤖 CLAUDE CODE — Scenario Simulator API
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read apps/api/src/routes/ai/classify.ts as the canonical
implementation pattern. Read PRD US-005 acceptance criteria.
Use Sonnet 4.5 for route implementation.

Create: apps/api/src/routes/ai/scenario.ts

POST /api/ai/scenario

Request body:
{
  scenario: string,           // min 30 chars, max 2000
  templateId?: string,        // optional — from SCENARIO_TEMPLATES
  parentAnalysisId?: string   // optional — "what if X instead of Y"
}

Middleware (in order):
  requireAuth → requireScenarioSimulator → rateLimitAI → validateBody

Handler logic:
a. Load user profile + org + latest readiness score snapshot
b. If parentAnalysisId: load prior scenario_analyses row (RLS enforced),
   include prior scenario + outcomes in Claude context for iteration
c. RAG retrieve:
   query: scenario text + "regulatory consequences enforcement licence ARIP SEC CBN NFIU"
   jurisdictions: user.target_markets mapped to codes + ['NG','FATF']
   topK: 10, minSimilarity: 0.75
d. assembleContext(chunks, userProfile)
e. Claude call:
   model: process.env.ANTHROPIC_MODEL_ARCH (Opus 4)
   temperature: 0
   max_tokens: 3000
   system: KLARIFY_BASE_SYSTEM_PROMPT + KLARIFY_SCENARIO_PROMPT + context
   user: scenario text + optional template label + parent context
f. Parse JSON response; validate with ScenarioResultSchema (Zod)
g. Persist scenario_analyses row
h. Increment ai_queries counter (via rateLimitAI)
i. Return: { success: true, data: { analysisId, result } }

GET /api/ai/scenario/history
  - Org-scoped list: id, scenario_summary, template_id, created_at
  - Order: created_at DESC, limit 20

GET /api/ai/scenario/:id
  - Full result + parent chain for iteration thread
  - 404 if not found or wrong org (RLS)

Mount in apps/api/src/index.ts:
  app.route('/api/ai/scenario', scenarioRoutes)

Error handling:
  401: not authenticated
  402: plan gate or query limit reached
  422: invalid body
  503: Claude unavailable or invalid JSON from model

TESTS: apps/api/src/__tests__/ai/scenario.test.ts
  - Unauthenticated → 401
  - Navigator plan → 402
  - Valid request persists row + returns 3 outcomes
  - Each outcome has citations array
  - parentAnalysisId includes prior analysis in prompt (mock Claude)
  - Invalid Claude JSON → 503 with plain-English error
  - Disclaimer present in result.disclaimer
  - Query limit counter increments
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S6-B2 🤖 CLAUDE CODE — Scenario Simulator UI (Web)
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 7 (brand tokens) and PRD US-005
acceptance criteria before starting.
Use Sonnet 4.5.
Mirror classify + chat UX patterns.

1. PAGE
   Create: apps/web/src/app/dashboard/scenario/page.tsx

   Server component: auth gate + pass apiBaseUrl to client
   (same pattern as /dashboard/classify — Fly API direct fetch)

2. CLIENT COMPONENT
   Create: apps/web/src/components/scenario/ScenarioSimulator.tsx

   STATE 1 — INPUT:
   - Page header: "Scenario Simulator"
   - Subtitle explaining use case (PRD US-005 persona)
   - Non-dismissible disclaimer banner (CLAUDE.md §16 Rule 1)
     Same pattern as chat — must never be removed
   - Template grid: 8 cards from SCENARIO_TEMPLATES
     Click → pre-fills textarea with template prefillText
   - Free-text textarea: min 30, max 2000, character counter
   - "Analyse Scenario" CTA (teal, disabled while loading)
   - Loading state: "Analysing regulatory consequences…"
     Estimated time: 10–20 seconds

   STATE 2 — RESULTS:
   Component: ScenarioOutcomeCards

   3-column desktop / stacked mobile (PRD: visual, not wall of text):
   - Best Case card — green top border
   - Likely Case card — amber top border
   - Worst Case card — red top border

   Each card shows:
   - Probability badge (LOW / MEDIUM / HIGH)
   - Summary (plain English)
   - Regulatory basis (JetBrains Mono, klarifyTeal)
   - Business impact
   - Recommended mitigation
   - Citation chips (reuse CitationBadge from chat UI)

   Below cards:
   - Key assumptions bullet list
   - Iteration input: "What if I do X instead of Y?"
     → POST with parentAnalysisId from current analysisId
   - "Run another scenario" button (reset to STATE 1)
   - "Ask Klarify about this" → /dashboard/chat?scenarioId={id}

   HISTORY (sidebar desktop / drawer mobile):
   - GET /api/ai/scenario/history on mount
   - Click row → reload that analysis

3. PLAN GATE
   Free / Navigator: render UpgradePrompt (requiredPlan: 'compass')
   Do not render input form for gated users.

4. NAV
   Update: apps/web/src/app/dashboard/_nav.tsx
   Add under FounderCounsel section (after AI Advisory):
   { href: '/dashboard/scenario', label: 'Scenario Simulator', icon: ... }

5. DASHBOARD QUICK ACTION
   Update: apps/web/src/app/dashboard/page.tsx
   Add quick action for Compass+ users:
   "Simulate a regulatory scenario →" routes to /dashboard/scenario

6. NETLIFY PROXY (browser-origin, if needed)
   Create: apps/web/src/app/api/ai/scenario/route.ts
   Thin proxy to Fly API — mirror classify/chat proxy pattern.

7. TESTS
   Create: apps/web/src/__tests__/scenario/scenario.test.tsx
   - Template click pre-fills textarea
   - 3 outcome cards render with probability badges
   - UpgradePrompt shown for navigator plan
   - Disclaimer banner always present
   - Iteration submits parentAnalysisId
   - Mobile: cards stack vertically at 360px
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S6-B3 🔍 VERIFY — Scenario Simulator End-to-End
──────────────────────────────────────────────────────────

Before starting Phase C, manually verify:

1. Log in as Compass test user
2. Go to /dashboard/scenario
3. Click template "Launch without ARIP application"
4. Run analysis — 3 cards render within 20 seconds
5. Verify each card has: probability, summary, regulatory basis,
   business impact, mitigation, at least one citation chip
6. Enter iteration: "What if I apply for ARIP first?"
7. Second analysis references first scenario context
8. History sidebar shows both runs
9. Log in as Navigator → UpgradePrompt shown, no input form
10. Navigator POST /api/ai/scenario → 402
11. Disclaimer visible on input and results screens
12. Mobile 360px: cards stack, readable, CTA accessible

□ Template pre-fill works
□ 3-column outcome layout correct
□ Iteration chains via parentAnalysisId
□ Compass+ gate enforced (UI + API)
□ Counts against monthly AI query quota
□ Disclaimer on all screens
□ History persists across page refresh


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 6 — PHASE C: JURISDICTION EXPANSION ADVISER (US-004)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S6-C1 🖐 MANUAL — Corpus Extraction Quality (Prerequisite)
──────────────────────────────────────────────────────────

Before shipping jurisdiction gap analysis to production users,
verify RAG corpus **extraction quality** — not just file presence.

IMPORTANT — file presence vs usable text:
  The mandated 27-file corpus (CLAUDE.md §11.3–§11.5) may all
  exist in packages/ai/corpus/raw/ and ingest without error.
  That is NOT sufficient. A PDF can "succeed" with almost no
  searchable text if it is a scanned/image document and pdf-parse
  extracts only metadata or blank pages.

  Rule of thumb after ingest:
    chars ÷ pages ≥ ~500  →  likely OK
    chars ÷ pages < ~500   →  FAILED extraction — replace PDF or OCR

  Example of failed extraction (May 2026 ingest):
    NG_BOFIA_2020.pdf   — 91 pages / 1,445 chars / 2 chunks  ⚠️
    KE_VASP_ACT_2025.pdf — 52 pages / 821 chars / 1 chunk    ⚠️

  Example of healthy extraction:
    NG_ISA_2025.pdf     — 196 pages / 488,505 chars / 252 chunks ✅
    NG_MLPPA_2022.pdf   — 27 pages / 53,174 chars / 36 chunks  ✅

STEP 1 — Confirm all 27 files on disk
  ls packages/ai/corpus/raw/*.pdf | wc -l   # expect 27

  Full mandated set (CLAUDE.md §11.3–§11.5):
  Nigerian (16): FOUNDERS_GUIDE_2026 + all 15 NG_* files including
    NG_ISA_2025, NG_MLPPA_2022, NG_SEC_DAR_2022/2023/2024,
    NG_CBN_VASP_2023, NG_NFIU_VASP_2024, NG_BOFIA_2020, etc.
  Regional (7): GH_ISA_ACT_2025, GH_VASP_ACT_2025, KE_VASP_ACT_2025,
    MU_VAITOS_2021, ZA_CASP_FSCA, ZA_FICA, ZA_FAIS
  International (4): FATF_REC15_2019, FATF_UPDATES_2019_2025,
    FATF_TU_VA_2023 (secondary), INTL_GIABA_MER_NIGERIA

  If any file is missing from disk → download from official source
  (URLs in CLAUDE.md Sprint 2 S2-A2 manual) and ingest.

STEP 2 — Review ingest log for extraction quality
  After pnpm ingest --all (or per-file), inspect each line:

  □ chars/page ratio acceptable for every file (see rule above)
  □ No critical doc below 10 chunks unless genuinely short (e.g.
    NG_SEC_DAR_2022 at 4 pages / 6 chunks is OK)

  KNOWN PROBLEM FILES (fix before production jurisdiction ship):
  □ NG_BOFIA_2020.pdf — re-source searchable/text PDF from CBN or
    official gazette; re-ingest. Affects banking-supervision context;
    CBN VASP 2023 partially covers VASP banking rules.
  □ KE_VASP_ACT_2025.pdf — BLOCKS NG→Kenya gap analysis until fixed.
    Re-source from Kenya CMA / official parliament source; re-ingest.
    Target: 50+ pages with tens of thousands of chars, not ~800.

  SUSPECTED DUPLICATE / WRONG FILE (verify manually):
  If two files show IDENTICAL page count + char count + chunk count,
  open both — one may be a misnamed copy:
  □ NG_CBN_VASP_2023.pdf vs NG_NFIU_VASP_2024.pdf
    (both 12 pages / 21,232 chars / 31 chunks — verify NFIU is the
    Dec 2024 NFIU AML/CFT Framework for VASPs, not CBN guidelines)
  □ FATF_REC15_2019.pdf vs FATF_TU_VA_2023.pdf
    (identical stats — CLAUDE.md §11.5: FATF_UPDATES_2019_2025.pdf
    is authoritative; remove or replace duplicate if same file)

  SEC DAR versioning (expected behaviour, not an error):
  □ NG_SEC_DAR_2024 "replaced N existing chunks" — pipeline dedupes
    by regulation key; 2024 correctly supersedes 2023 in DB.

STEP 3 — Re-ingest fixed files
  cd packages/ai
  pnpm ingest --file=NG_BOFIA_2020.pdf      # after replacement
  pnpm ingest --file=KE_VASP_ACT_2025.pdf   # after replacement
  pnpm ingest --file=NG_NFIU_VASP_2024.pdf  # if wrong file confirmed

STEP 4 — DB sanity check (optional)
  SELECT source_document, COUNT(*) AS chunks
  FROM regulatory_corpus
  GROUP BY source_document
  ORDER BY chunks DESC;

  Expect ~3,500–4,000 total chunks across 27 source documents.
  Flag any mandated doc with ≤ 5 chunks (except small SEC DAR 2022).

STEP 5 — RAG retrieval smoke tests
  cd packages/ai && pnpm tsx scripts/test-rag.ts

  Query 1 (Nigeria baseline — must pass before any jurisdiction ship):
    "What licences does a Nigerian crypto exchange need under ISA 2025?"
    → NG_ISA_2025 + NG_SEC_DAR chunks, similarity > 0.75

  Query 2 (Ghana expansion target):
    "Ghana VASP licensing and capital requirements 2025"
    → GH_VASP_ACT chunks, similarity > 0.75

  Query 3 (Kenya expansion target — blocked until KE PDF fixed):
    "Kenya VASP Act 2025 licensing requirements"
    → KE_VASP_ACT chunks, similarity > 0.75

  Query 4 (AML baseline — verify NFIU not misfiled):
    "NFIU VASP AML framework STR filing requirements"
    → NG_NFIU_VASP + NG_MLPPA chunks (not CBN-only content)

SPRINT 6 GATE — what blocks what:
  ✅ S6 Phase A + B (Scenario Simulator): may proceed even with
     BOFIA/KE extraction issues; ISA/MLPPA/SEC/CBN ingest is sufficient.
  ⚠️  S6 Phase C build (jurisdiction API/UI): may proceed in parallel.
  ❌ S6-C4 / production ship of NG→KE jurisdiction analysis:
     blocked until KE_VASP_ACT_2025.pdf re-sourced and re-ingested.
  ❌ Production ship if NFIU file confirmed wrong (duplicate of CBN).

Wrong gap analysis causes real harm to founders planning cross-border
expansion. Extraction quality matters more than file count.


──────────────────────────────────────────────────────────
TASK S6-C2 🤖 CLAUDE CODE — Jurisdiction Gap API + Export
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read apps/api/src/routes/ai/classify.ts and
apps/api/src/services/documentGeneration.ts (docx export).
Read PRD US-004 acceptance criteria fully.
Use Sonnet 4.5.

Create: apps/api/src/routes/ai/jurisdictionGap.ts

POST /api/ai/jurisdiction-gap

Request body:
{
  sourceJurisdiction: 'NG',        // default from user profile
  targetJurisdictions: ['GH']      // 1–4 targets; validated against plan
}

Middleware:
  requireAuth → requireJurisdictionExpansion(targets) → rateLimitAI → validateBody

Handler logic:
a. Load org profile: product_types, target_markets, stage
b. Load all 8 dimension indicator states + latest readiness score
c. Build "current posture" context block from indicators + score
d. RAG retrieve:
   query: "licensing capital AML KYC reporting VASP registration requirements"
   jurisdictions: [source, ...targets, 'FATF']
   topK: 12
e. assembleContext(chunks, userProfile)
f. Claude call:
   model: ANTHROPIC_MODEL_ARCH (Opus 4)
   temperature: 0
   max_tokens: 4000
   system: KLARIFY_BASE_SYSTEM_PROMPT + KLARIFY_JURISDICTION_PROMPT + context
g. Validate JurisdictionGapResult (Zod)
h. Merge regulator contacts from packages/core/src/regulators/ seed data
   for target jurisdictions — DO NOT hardcode contacts in UI (CLAUDE.md §16 Rule 2)
i. Persist jurisdiction_gap_analyses row
j. Return: { success: true, data: { analysisId, result } }

GET /api/ai/jurisdiction-gap/history
  - Org-scoped: id, source, targets, created_at, gap counts summary
  - Order: created_at DESC, limit 20

GET /api/ai/jurisdiction-gap/:id
  - Full result (RLS enforced)

POST /api/ai/jurisdiction-gap/:id/export
  - Generate .docx gap analysis report
  - Reuse docx pipeline from documentGeneration.ts / exportDraft.ts
  - Structure:
    * Company name + date header
    * Executive summary (X green / Y amber / Z red gaps)
    * Gap table: Dimension | Current | Target | Status | How to close
    * Regulator contacts section per target jurisdiction
    * Disclaimer footer (mandatory)
  - Upload to S3 (private, SSE), return signed URL (1h TTL)
  - Plan gate: Compass+ only (matches PRD export requirement)

Create: apps/api/src/services/jurisdictionGapExport.ts
  (docx generation service — keep route handler thin)

Mount in apps/api/src/index.ts:
  app.route('/api/ai/jurisdiction-gap', jurisdictionGapRoutes)

TESTS: apps/api/src/__tests__/ai/jurisdictionGap.test.ts
  - NG→GH returns 7 dimension rows for GH
  - Each row has status green|amber|red + how_to_close
  - Free plan → 402
  - Navigator plan → 402
  - Compass NG→GH → 200
  - Compass NG→GH+KE+MU → 402 (exceeds 2-jurisdiction limit)
  - Flagship allows all 5 jurisdictions
  - Export returns valid docx (ZIP magic bytes)
  - Export blocked for Navigator (402)
  - RLS: user cannot read another org's analysis
  - Disclaimer present in result
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S6-C3 🤖 CLAUDE CODE — Jurisdiction Expansion UI (Web)
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 7 (brand tokens) and PRD US-004
acceptance criteria before starting.
Use Sonnet 4.5.

1. PAGE
   Create: apps/web/src/app/dashboard/jurisdiction/page.tsx

2. CLIENT COMPONENT
   Create: apps/web/src/components/jurisdiction/JurisdictionGapAnalyser.tsx

   STEP 1 — SELECTOR:
   - Source jurisdiction: pre-filled from user profile (default NG)
     Read-only chip for all users
   - Target jurisdiction(s): multi-select chips
     GH · Kenya · Mauritius · South Africa (full names + codes)
   - Plan-aware selector limits:
     Free / Navigator → UpgradePrompt only (requiredPlan: 'compass')
     Compass → max 1 target chip selectable
     Flagship → up to 4 target chips
   - "Run Gap Analysis" CTA (teal)
   - Non-dismissible disclaimer banner

   STEP 2 — RESULTS:
   Component: JurisdictionGapTable

   For each target jurisdiction, render a section:

   SUMMARY STRIP:
   - "X gaps already satisfied · Y need adjustment · Z action required"
   - Colour counts: green / amber / red

   GAP TABLE (7 rows per PRD US-004):
   Columns: Dimension | Your current state | Target requirement | Status

   Status cell: colour-coded pill
   - green → "Already satisfied"
   - amber → "Needs adjustment"
   - red → "Action required"

   Expand row → slide-over drawer:
   - Gap summary (plain English)
   - "How to close this gap" guidance
   - Citation chips (reuse CitationBadge)
   - Link to relevant roadmap task if mapping exists in seedTasks

   REGULATOR CONTACTS CARD:
   - Contacts from API result (not hardcoded in UI)

   ACTIONS:
   - "Download Word report" → POST export endpoint → download
   - "Run another analysis" → reset selector
   - "Ask Klarify about expanding to {target}"
     → /dashboard/chat?jurisdictionId={id}

   HISTORY PANEL:
   - Past analyses: source → targets + date + gap summary

3. NAV
   Update: apps/web/src/app/dashboard/_nav.tsx
   Add under FounderCounsel (after Scenario Simulator):
   { href: '/dashboard/jurisdiction', label: 'Jurisdiction Expansion', icon: ... }

4. ONBOARDING / DASHBOARD NUDGE
   Update: apps/web/src/app/dashboard/page.tsx
   If user.target_markets includes GH or KE and plan is Compass+:
   Show nudge banner: "Planning expansion? Run a jurisdiction gap analysis →"

5. CLASSIFY PAGE CTA
   Update: apps/web/src/components/classify/ClassifyForm.tsx (or results card)
   After classification result: CTA link to /dashboard/jurisdiction

6. NETLIFY PROXY
   Create: apps/web/src/app/api/ai/jurisdiction-gap/route.ts
   Create: apps/web/src/app/api/ai/jurisdiction-gap/[id]/export/route.ts
   Thin proxies to Fly API.

7. TESTS
   Create: apps/web/src/__tests__/jurisdiction/jurisdiction.test.tsx
   - Compass user sees max 1 target chip
   - Gap table renders 7 dimension rows per target
   - Red row expands with how_to_close text
   - Export button triggers download
   - Free user sees UpgradePrompt
   - Disclaimer always visible
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S6-C4 🔍 VERIFY — Jurisdiction Expansion End-to-End
──────────────────────────────────────────────────────────

Before starting Phase D, manually verify:

1. Log in as Compass user with NG profile
2. Go to /dashboard/jurisdiction
3. Select GH as target → run analysis
4. Verify 7 dimension rows with green/amber/red status pills
5. Expand a red row → how_to_close guidance + citations visible
6. Download Word report → opens in Word/Docs with disclaimer footer
7. Run NG→KE analysis → cites Kenya VASP Act in output
8. Log in as Flagship → select GH + KE + MU + ZA in one request
9. Log in as Compass → attempt GH + KE together → blocked (402 or UI limit)
10. Log in as Navigator → UpgradePrompt, no selector
11. History panel shows past analyses
12. Mobile 360px: table readable, expand drawer works

□ 7-dimension gap table per target
□ Colour-coded status pills
□ Expandable how_to_close guidance
□ Word export with disclaimer
□ Plan jurisdiction limits enforced (UI + API)
□ Regulator contacts from API (not hardcoded UI)
□ RLS: cannot access another org's analysis


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 6 — PHASE D: INTEGRATION & POLISH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S6-D1 🤖 CLAUDE CODE — Product Integration
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Use Sonnet 4.5. Minimise scope — integration only, no new features.

1. FEATURES + PRICING PAGES
   Update: apps/web/src/app/features/page.tsx
   Update: apps/web/src/app/pricing/page.tsx
   - Remove any "coming soon" copy for Scenario Simulator and
     Jurisdiction Expansion
   - Add deep links: /dashboard/scenario, /dashboard/jurisdiction

2. CHAT CONTEXT HANDOFF
   Update: apps/web/src/app/dashboard/chat/page.tsx
     (and ChatInterface client component)
   Accept URL params: ?scenarioId= | ?jurisdictionId=
   Server-side fetch saved analysis → inject as first-turn context
   Display banner: "Continuing from your scenario / gap analysis"

3. EMAIL DRIP CTA LINKS
   Update: packages/email/src/templates/drips/DripPlanComparison.tsx
   Ensure Compass CTA links resolve to /dashboard/scenario via buildAppUrl()

4. REPLACE AI PACKAGE STUBS
   Confirm packages/ai/src/scenarios/index.ts and
   packages/ai/src/jurisdiction/index.ts export real types
   (completed in S6-A1 — verify no empty stub remains)

5. UPDATE CLAUDE.md §17
   Mark Sprint 6 complete.
   Set current sprint to Beta (20-user closed beta).
   Note: Human Escalation directory deferred; form-based
   specialist requests remain the MVP path (US-011 partial).

6. BUILD EMAIL PACKAGE AFTER PROMPT CHANGES
   Ensure Dockerfile Fly build step still runs:
   pnpm --filter @klarify/email build
   (No email template changes required unless DripPlanComparison updated)
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S6-D2 🔍 VERIFY — Sprint 6 Complete Checkpoint
──────────────────────────────────────────────────────────

Run full Sprint 6 verification before closing sprint:

SCENARIO SIMULATOR (US-005):
□ Template selection pre-fills scenario text
□ 3-column Best / Likely / Worst cards with citations
□ Each outcome has probability, regulatory basis, business impact, mitigation
□ Iteration ("what if X instead") chains via parentAnalysisId
□ Compass+ gate works; Navigator gets 402 + UpgradePrompt
□ Counts against monthly AI query quota
□ Disclaimer on all screens (non-dismissible)
□ History persists across sessions
□ Response time < 20 seconds

JURISDICTION EXPANSION (US-004):
□ Source + target selector respects plan jurisdiction limits
□ 7-dimension gap table with green / amber / red status per target
□ Expandable how_to_close guidance on each row
□ NG→GH and NG→KE analyses cite correct regional Acts
□ Word export opens correctly with disclaimer footer
□ Flagship can select all 5 jurisdictions
□ Compass limited to 2 jurisdictions total (NG + 1 target)
□ Free / Navigator blocked with upgrade path
□ Response time < 25 seconds (single target)

INTEGRATION:
□ /dashboard/scenario and /dashboard/jurisdiction in nav
□ Chat handoff from ?scenarioId= and ?jurisdictionId= works
□ Features + pricing pages link to live features (no "coming soon")
□ Classify result page links to jurisdiction expansion

SECURITY:
□ RLS on scenario_analyses and jurisdiction_gap_analyses
□ No cross-org analysis access
□ S3 export URLs expire after 1 hour

CORPUS:
□ S6-C1 extraction quality verified (chars/page ratio, not just file count)
□ KE_VASP_ACT_2025 re-sourced if NG→KE jurisdiction ships to production
□ NG→GH RAG smoke test passes (> 0.75 similarity)
□ NFIU vs CBN duplicate verified (if identical ingest stats)

TESTS:
□ pnpm test — all passing
□ pnpm tsc --noEmit — zero TypeScript errors
□ pnpm lint — zero lint errors

SPRINT 6 MILESTONE: "Launch Features Live" ✅

─────────────────────────────────────────────────────
After Sprint 6 closes:
  - Begin 20-user closed beta (PRD §8 Beta weeks 13–16)
  - Book readers + BNUG community
  - Beta feedback informs Sprint 7:
      * Compliance PDF export (US-006)
      * PWA packaging
      * Human Escalation vetted directory (US-011 full)
      * PostHog funnel dashboards + feature flags (SDK wired May 2026)
─────────────────────────────────────────────────────


╔═══════════════════════════════════════════════════════════╗
║  SPRINT 6 — DEFERRED ITEMS (NOT IN THIS SPRINT)          ║
╚═══════════════════════════════════════════════════════════╝

| Item | User Story | MVP substitute | Target |
|------|-----------|----------------|--------|
| Vetted specialist directory | US-011 | /dashboard/specialists form + email intake | Sprint 7 |
| Consultation booking + referral fee | US-011 | Manual follow-up by Blockspace team | Sprint 7 |
| Compliance PDF export | US-006 | Not yet built | Sprint 7 |
| PWA + offline mode | PRD §5.5 | Responsive web | Beta polish |
| Native mobile app | PRD §4.1 Phase 2 | Web-only | Post-beta |
| PostHog analytics (SDK + events) | PRD §4.2 | ✅ Shipped pre–Sprint 7 (client + server, consent, 17 events) | — |
| PostHog funnel dashboards + flags | PRD §4.2 | Events wired; UI funnels not configured | Sprint 7 |
| Google OAuth | PRD §4.2 | Email + magic link | Sprint 7 |


╔═══════════════════════════════════════════════════════════╗
║  SPRINT 6 — EXTERNAL SERVICES SUMMARY                     ║
║  (Everything requiring accounts or credentials)           ║
╚═══════════════════════════════════════════════════════════╝

Service              Purpose                    Setup In
─────────────────────────────────────────────────────────────
Anthropic API        Opus 4 scenario + gap      ✅ Sprint 2
Voyage AI            RAG embeddings             ✅ Sprint 2
PostgreSQL + pgvector Analysis persistence      ✅ Sprint 0
AWS S3               Gap analysis .docx export    ✅ Sprint 3
Resend               No new templates required  ✅ Sprint 3
Korapay              Plan gating (Compass+)     ✅ Sprint 5

NEW MANUAL WORK:
  🖐 Corpus extraction quality review + re-ingest (S6-C1) — see task above
  🖐 Product owner prompt review (S6-A1) — before merge
  Note: all 27 PDFs may be present on disk; S6-C1 is about usable
  text extraction (BOFIA, KE VASP) and duplicate-file verification.

No new infrastructure accounts required for Sprint 6.


╔═══════════════════════════════════════════════════════════╗
║  SPRINT 6 — BUILD ORDER & ESTIMATED EFFORT                ║
╚═══════════════════════════════════════════════════════════╝

| Order | Task | Effort | Depends on |
|-------|------|--------|------------|
| 1 | S6-A1 Types + prompts | 1 day | PO prompt review |
| 2 | S6-A2 Migration | 0.5 day | — |
| 3 | S6-A3 Feature gates | 0.5 day | A1 |
| 4 | S6-B1 Scenario API | 1.5 days | A1–A3 |
| 5 | S6-B2 Scenario UI | 1.5 days | B1 |
| 6 | S6-C1 Extraction quality verify | 0.5 day | Manual — parallel with B |
| 7 | S6-C2 Jurisdiction API | 2 days | A1–A3, C1 |
| 8 | S6-C3 Jurisdiction UI | 1.5 days | C2 |
| 9 | S6-D1 Integration | 1 day | B2, C3 |
| 10 | S6-D2 Verify | 1 day | All |

Total estimate: ~10–11 dev days (~2 weeks, one fullstack dev)


─────────────────────────────────────────────────────────────
Klarify — Sprint 6 Task Breakdown v1.0
Source: Klarify_PRD_v1.1 + CLAUDE.md (May 2026)
Prepared by: Chimezie Chuta | Blockspace Technologies
Scenario Simulator (US-005) + Jurisdiction Expansion (US-004)
Human Escalation directory (US-011) explicitly deferred.
─────────────────────────────────────────────────────────────
