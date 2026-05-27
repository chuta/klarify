# CLAUDE.md — Klarify Development Context

Read this file completely before every session. This is the single source of truth for what Klarify is, how it is built, and how every coding decision should be made. When in doubt, refer back here before writing code.

---

## 1. WHAT WE ARE BUILDING

Klarify Africa is an AI-powered regulatory compliance and advisory platform for founders, operators, lawyers, and corporate innovation teams building digital asset and fintech products in African regulated markets.

**Tagline:** Navigate Regulated Markets with Confidence

**Website:** klarify.africa

**Core problem it solves:** African founders building in regulated markets face a recurring, expensive, and often business-ending gap — they do not know what they do not know. They build for months before discovering their product requires a licence. They receive a regulator's letter and do not understand it. They have compliance manuals that nobody follows. Klarify closes this gap permanently, affordably, at scale.

**The book that powers it:** Klarify is the direct software companion to *The Founder's Guide to Building in Regulated Markets* by Chimezie Chuta (Blockspace Technologies, 2026). The book's frameworks, checklists, personas, and institutional knowledge are canonical reference material for every product decision.

---

## 2. TWO ENGINES IN ONE PRODUCT

Klarify bundles two capabilities into a single unified platform:

### FounderCounsel (AI Advisory Engine)
- AI regulatory Q&A in plain English with citations
- Product classification engine (what licence does my product need?)
- Regulatory document analyser (upload a regulator letter → get a 72-hour action plan and draft response)
- Scenario simulator (what happens if I do X?)
- Jurisdiction expansion adviser (Nigeria → Ghana/Kenya/SA gap analysis)
- Human escalation to vetted specialist network

### ComplianceOS (Operational Engine)
- Regulatory Readiness Score (0–100 live gauge across 8 dimensions)
- Smart Compliance Roadmap (personalised Kanban, 4 phases)
- Compliance document generator (13 regulatory document templates — 9 core + 4 ARIP Framework templates)
- ARIP application tracker (5-stage workflow per ARIP Framework, June 2024)
- Regulator engagement CRM (all Nigerian regulators pre-loaded)
- Compliance calendar with automated deadline alerts

---

## 3. TECH STACK

### Monorepo Structure

```
klarify/
├── apps/
│   ├── web/          ← Next.js 14 PWA (klarify.africa)
│   ├── mobile/       ← Expo SDK 51 + Expo Router (iOS + Android)
│   └── api/          ← Node.js + Hono backend
├── packages/
│   ├── core/         ← Business logic (shared 100%)
│   ├── ui/           ← React Native Web components (shared ~60%)
│   ├── ai/           ← AI/RAG engine client (shared 100%)
│   └── config/       ← TypeScript, ESLint, env configs
```

**Monorepo tool:** Turborepo
**Package manager:** pnpm (workspaces)

### Frontend (Web — apps/web)
- **Framework:** Next.js 14 (App Router)
- **Styling:** NativeWind (Tailwind for React Native Web)
- **Component library:** shadcn/ui
- **Charts:** Recharts
- **PWA:** next-pwa (service worker + offline caching)
- **Hosting:** Vercel

### Mobile (apps/mobile)
- **Framework:** Expo SDK 51 with Expo Router (file-based routing)
- **Build:** EAS Build (cloud builds — no Mac required for iOS)
- **OTA updates:** Expo Updates (JS-only changes skip App Store review)
- **Distribution:** EAS Submit

### Backend (apps/api)
- **Runtime:** Node.js 20 (via `tsx` — TypeScript-aware loader, no separate build step for workspace deps)
- **Framework:** Hono (TypeScript-first, faster than Express)
- **API style:** REST
- **Auth:** JWT with 24-hour expiry + refresh token rotation
- **Hosting:** Fly.io — primary region `jnb` (Johannesburg), closest Fly POP to Lagos. Custom domain: `api.klarify.africa`. Config in `apps/api/fly.toml`, image built from `apps/api/Dockerfile`. Deploy runbook: `apps/api/DEPLOY.md`.
- **Hybrid surface:** short-lived Next.js Route Handlers (`apps/web/src/app/api/*`) stay on Netlify for browser-origin requests. Long-running/streaming/SSE/mobile-bearer endpoints live on Fly.

### Database
- **Primary:** PostgreSQL with row-level security (RLS)
- **Cache:** Redis (sessions + rate limiting)
- **Vector store:** pgvector (RAG embeddings — lives in PostgreSQL)
- **ORM:** Prisma

### AI Engine (packages/ai)
- **Primary model:** Claude `claude-sonnet-4-5` (Anthropic)
- **Architecture:** RAG pipeline (Retrieval-Augmented Generation)
- **Embeddings:** `text-embedding-3-small` (OpenAI) or Voyage AI `voyage-law-2` (legal corpus specialist — preferred)
- **Streaming:** Anthropic SDK streaming responses
- **Vector search:** pgvector cosine similarity

### Storage
- **Documents:** AWS S3 or Cloudflare R2
- **Encryption:** AES-256 at rest
- **OCR:** AWS Textract (regulatory letter image uploads)

### Auth
- **Library:** NextAuth.js (web) / Expo SecureStore (mobile)
- **Methods:** Email/password, Google OAuth, Magic link
- **Biometrics (mobile):** Expo LocalAuthentication (V2)

### Payments
- **Provider:** Korapay (existing Blockspace Technologies Limited account — Nigerian cards, bank transfer, USSD, mobile money + international cards via Korapay's multi-currency support)
- **Docs:** https://developers.korapay.com/docs/checkout-standard
- **Billing:** Subscription (monthly/annual) + one-time purchases
- **Webhook event:** `charge.success` (POST to `/api/billing/webhook/korapay`)
- **Signature verification:** HMAC-SHA256 using `KORAPAY_ENCRYPTION_KEY`

### Email
- **Provider:** Resend (preferred) or SendGrid
- **Use:** Deadline alerts, task assignments, weekly digests

### Analytics
- **Tool:** PostHog
- **Use:** Product analytics, session recording, feature flags

---

## 4. SHARED PACKAGES — WHAT LIVES WHERE

### packages/core
Everything that is pure business logic with no UI or platform dependency:

```
packages/core/src/
├── api/              ← All API call functions (fetch wrappers)
├── compliance/       ← Readiness score calculation engine
├── roadmap/          ← Roadmap phase logic, task dependency rules
├── regulators/       ← Regulator data, jurisdiction mappings
├── types/            ← All TypeScript interfaces and types
├── validation/       ← Zod schemas for all forms and API payloads
└── utils/            ← Date helpers, formatting, constants
```

### packages/ai
All AI-related logic — used by both web and mobile:

```
packages/ai/src/
├── chat/             ← useKlarifyChat hook (streaming AI responses)
├── classify/         ← Product classification engine
├── analyse/          ← Document analyser (letter → action plan)
├── scenarios/        ← Scenario simulator
├── jurisdiction/     ← Gap analysis across jurisdictions
├── rag/              ← RAG pipeline (embed, retrieve, augment)
└── prompts/          ← All system prompts (DO NOT edit without review)
```

### packages/ui
React Native Web components — render natively on mobile, as HTML on web:

```
packages/ui/src/
├── components/
│   ├── ReadinessGauge.tsx        ← The most important component
│   ├── ComplianceCard.tsx
│   ├── RegulatoryIdentityCard.tsx
│   ├── MessageBubble.tsx
│   ├── UrgencyBadge.tsx
│   ├── ProgressBar.tsx
│   ├── RoadmapBoard.tsx
│   └── RegulatorProfile.tsx
├── tokens/
│   ├── colors.ts                 ← Brand colours (see Section 7)
│   ├── typography.ts
│   └── spacing.ts
└── platform/                     ← Platform-specific overrides
    ├── DocumentUploader.native.tsx
    ├── DocumentUploader.web.tsx
    ├── Notifications.native.tsx
    └── Notifications.web.tsx
```

---

## 5. DATABASE SCHEMA (CORE TABLES)

```sql
-- Users and organisations
users (id, email, name, avatar, plan, created_at)
organisations (id, name, owner_id, plan, seats_used, created_at)
org_members (org_id, user_id, role)

-- Onboarding and profile
user_profiles (
  user_id,
  product_types[],       -- DAX, DAOP, DAC, DAI, payment, hybrid
  target_markets[],      -- NG, GH, KE, ZA, MU
  stage,                 -- idea, building, launched, arip, licensed
  team_size,
  has_compliance_officer,
  existing_infrastructure[]
)

-- Compliance state (the heart of ComplianceOS)
readiness_scores (
  id, org_id,
  total_score INT,       -- 0-100
  corporate_structure INT,
  capital_licensing INT,
  kyc_infrastructure INT,
  aml_cft_programme INT,
  transaction_monitoring INT,
  regulatory_reporting INT,
  regulatory_relationships INT,
  product_classification INT,
  calculated_at,
  snapshot JSONB         -- full state at time of calculation
)

-- Roadmap
roadmap_tasks (
  id, org_id, phase INT,  -- 1-4
  title, description,
  regulatory_basis,        -- e.g. "MLPPA 2022, Section 4"
  status,                  -- not_started, in_progress, complete, blocked
  owner_user_id,
  due_date,
  template_id,             -- links to document_templates
  is_locked BOOLEAN,       -- true if phase prerequisite not met
  completed_at
)

-- Documents
generated_documents (
  id, org_id, user_id,
  template_type,           -- BWRA, AML_POLICY, KYC_TIERS, etc.
  title, content JSONB,
  version INT,
  s3_key,                  -- encrypted storage reference
  created_at, updated_at
)

uploaded_documents (
  id, org_id, user_id,
  filename, file_type,
  s3_key,
  analysis_result JSONB,   -- AI analysis output
  urgency_level,           -- critical, high, medium, low
  action_items JSONB,
  uploaded_at, analysed_at
)

-- AI conversations (FounderCounsel)
conversations (
  id, user_id, org_id,
  title,
  created_at, updated_at
)

messages (
  id, conversation_id,
  role,                    -- user, assistant
  content TEXT,
  citations JSONB,         -- [{regulation, section, url}]
  model_used,
  tokens_used INT,
  created_at
)

-- Regulators (CRM)
regulator_contacts (
  id, org_id,
  regulator_code,          -- CBN, SEC_NG, NFIU, NITDA, etc.
  contact_name,
  contact_email,
  contact_phone,
  notes
)

regulator_interactions (
  id, org_id,
  regulator_code,
  interaction_type,        -- call, email, meeting, submission, letter
  subject,
  outcome,
  follow_up_required BOOLEAN,
  follow_up_date,
  occurred_at
)

-- ARIP tracker
arip_applications (
  id, org_id,
  licence_type,            -- DAX, DAOP, DAC, DAI
  current_stage,           -- pre_screening, initial_assessment,
                           --   eligibility, formal_app, aip,
                           --   aip_operations, full_registration
  aip_issued_date,
  aip_expiry_date,
  notes JSONB,
  created_at, updated_at
)

-- Compliance calendar
compliance_events (
  id, org_id,
  event_type,              -- STR_FILING, CTR_FILING, PEP_REGISTER,
                           --   QUARTERLY_TRAINING, BWRA_REVIEW,
                           --   ARIP_DEADLINE, CUSTOM
  title, description,
  due_date,
  recurrence,              -- daily, weekly, monthly, quarterly, annual
  is_complete BOOLEAN,
  completed_at
)

-- Subscriptions
subscriptions (
  id, org_id,
  plan,                    -- free, navigator, compass, flagship
  billing_cycle,           -- monthly, annual
  korapay_transaction_ref, -- Korapay charge reference
  korapay_subscription_code,
  status,                  -- active, cancelled, past_due
  current_period_end,
  created_at
)
```

---

## 6. AI SYSTEM PROMPTS

These are the canonical system prompts. **Do not change these without explicit instruction from the product owner.**

### Base System Prompt (all AI interactions)

```
You are Klarify, an AI-powered regulatory advisory assistant built
specifically for founders and teams building digital asset and fintech
products in African regulated markets.

Your knowledge is grounded in:
- Nigerian regulatory frameworks: ISA 2025, SEC Digital Asset Rules
  (2022/2024/2025 amendments), MLPPA 2022, CBN VASP Guidelines 2023,
  NFIU AML/CFT Compliance Framework, NTAA 2025, BOFIA 2020, NDPA 2023
- Pan-African frameworks: Ghana VASP Act 2025, Kenya VASP Act 2025,
  Mauritius VAITOS Act 2021, South Africa CASP/FSCA framework
- International standards: FATF Recommendation 15, FATF Targeted
  Updates 2021-2025, EU MiCA (comparative reference), BIS guidance
- The Founder's Guide to Building in Regulated Markets (Chuta, 2026)

YOUR RULES — follow all of these without exception:

1. PLAIN LANGUAGE: Always respond in plain, founder-friendly English.
   Avoid regulatory jargon unless you are defining it. If you use a
   technical term, explain it immediately.

2. ALWAYS CITE: Every regulatory claim must cite the specific source.
   Format: "Under [Act/Rule], [Section/Rule number], [provision]."
   Example: "Under ISA 2025, Section 357, digital assets are
   classified as securities."

3. DISTINGUISH CERTAINTY: Clearly distinguish between:
   - Settled regulatory positions (state firmly)
   - Areas of active evolution (flag explicitly: "Note: this area
     is still developing as of [date]...")
   - Your interpretation vs. the black letter of the law

4. NEVER GIVE LEGAL ADVICE: You provide regulatory information and
   educational guidance — not legal advice. Every response that touches
   on specific legal obligations must end with:
   "This is regulatory information, not legal advice. For advice
   specific to your situation, consult a qualified practitioner."

5. NEVER HALLUCINATE: If you are not certain of a section number,
   a specific provision, or a regulatory position, say so explicitly.
   "I am not certain of the exact section — you should verify this
   directly at sec.gov.ng." A wrong citation is worse than no citation.

6. ESCALATE WHEN NEEDED: When a question requires human specialist
   input — live enforcement situation, criminal liability question,
   highly complex cross-border structure — say clearly: "This question
   needs a qualified specialist. Would you like me to connect you with
   a vetted Nigerian digital asset regulatory lawyer?"

7. CONTEXT AWARENESS: You have access to the user's compliance profile
   (product type, target markets, ARIP stage, readiness score). Use
   this context to personalise responses. Do not ask for information
   you already have.
```

### Product Classification Prompt

```
You are classifying a digital asset product under Nigerian and African
regulatory frameworks. Use the following classification framework:

DAX (Digital Asset Exchange): Facilitates secondary market trading
between buyers and sellers. Requires SEC Nigeria DAX registration.

DAOP (Digital Asset Offering Platform): Facilitates primary issuance
of digital assets to investors. Requires SEC Nigeria DAOP registration.

DAC (Digital Asset Custodian): Holds and safeguards digital assets
on behalf of clients (controls private keys). Requires SEC Nigeria
DAC registration. Note: a DAX that also holds client assets needs BOTH.

DAI (Digital Asset Intermediary): Brokers, advisors, agents who
facilitate transactions without operating exchange or custody.

PAYMENT PRODUCT: Involves naira on/off-ramps, stablecoin payment
rails, or payment system infrastructure. Requires CBN engagement
IN ADDITION to any SEC registration.

CRITICAL RULES:
- Classify by FUNCTION not by label. Ignore what the founder calls
  their product. Assess what it functionally does.
- A "utility token" that carries economic return rights IS a security.
- Flag if the product spans multiple categories (requires multiple
  registrations).
- Always state the consequence of operating without the required
  registration.

Output as structured JSON:
{
  "primary_category": "DAX|DAOP|DAC|DAI|PAYMENT|HYBRID",
  "secondary_categories": [],
  "primary_regulator": "SEC_NIGERIA|CBN|BOTH",
  "secondary_regulators": [],
  "required_licences": [],
  "risk_if_unlicensed": "CRITICAL|HIGH|MEDIUM",
  "reasoning": "",
  "citations": []
}
```

### Document Analyser Prompt

```
You are analysing a regulatory document received by a Nigerian fintech
or digital asset founder. Your job is to translate formal regulatory
language into a clear, actionable assessment.

Analyse the document and produce output in this exact structure:

PLAIN LANGUAGE SUMMARY: [2-3 sentences. What is this document actually
saying in plain English?]

ISSUING REGULATOR: [Which regulator sent this and which department]

URGENCY LEVEL: [CRITICAL / HIGH / MEDIUM / LOW]
Criteria:
- CRITICAL: Criminal liability risk, licence revocation threatened,
  immediate cease and desist, asset freezing
- HIGH: Formal enforcement notice, response required within 30 days,
  licence suspension possible
- MEDIUM: Information request, compliance query, 60+ days to respond
- LOW: Advisory notice, general circular, no specific action required

WHAT THE REGULATOR IS ASKING FOR: [Bullet list of specific asks]

RESPONSE DEADLINE: [Exact date if stated, or "Not specified"]

72-HOUR ACTION PLAN:
1. [First action — most time-sensitive]
2. [Second action]
3. [Third action]
...

DRAFT ACKNOWLEDGMENT RESPONSE:
[A professional draft response the founder can review with their lawyer.
Tone: cooperative, not adversarial. Acknowledge receipt. Express
intention to engage constructively. Request clarification if needed.
Do NOT assert legal positions or make admissions.]

DISCLAIMER: This analysis is not legal advice. Review this with a
qualified Nigerian digital asset regulatory specialist before
submitting any response to the regulator.
```

---

## 7. BRAND & DESIGN TOKENS

```typescript
// packages/ui/src/tokens/colors.ts
export const colors = {
  // Primary brand
  klarifyTeal:   '#0B6E6E',  // Primary — trust, navigation, depth
  klarifyNavy:   '#0D2B45',  // Secondary — authority, stability
  klarifyGold:   '#D4A843',  // Accent — achievement, milestones

  // Backgrounds
  bgPrimary:     '#FAFAFA',
  bgTeal:        '#E6F4F4',
  bgNavy:        '#E8EEF4',
  bgGold:        '#FDF6E3',
  bgGrey:        '#F5F5F5',

  // Status (CRITICAL — used for compliance urgency indicators)
  statusCritical: '#C0392B',   // Red — 0-40 readiness score
  statusHigh:     '#D4A843',   // Amber — in progress
  statusGood:     '#1A7A4A',   // Green — 71-90 readiness score
  statusReady:    '#0B6E6E',   // Teal — 91-100 regulator ready

  // Text
  textPrimary:   '#1A1A1A',
  textMuted:     '#555555',
  textLight:     '#CCCCCC',

  // Neutral
  white:         '#FFFFFF',
  borderGrey:    '#CCCCCC',
} as const;

// Readiness score colour function
export const getScoreColor = (score: number): string => {
  if (score <= 40) return colors.statusCritical;
  if (score <= 70) return colors.statusHigh;
  if (score <= 90) return colors.statusGood;
  return colors.statusReady;
};

// Readiness score label function
export const getScoreLabel = (score: number): string => {
  if (score <= 40) return 'Critical';
  if (score <= 70) return 'In Progress';
  if (score <= 90) return 'Good Standing';
  return 'Regulator Ready';
};
```

```typescript
// packages/ui/src/tokens/typography.ts
export const typography = {
  fontFamily: {
    primary:   'Inter',
    mono:      'JetBrains Mono',  // for regulatory citations
  },
  fontSize: {
    xs:   12,
    sm:   14,
    base: 16,  // minimum body size
    lg:   18,
    xl:   20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
} as const;
```

---

## 8. READINESS SCORE CALCULATION

The Readiness Score is the single most important data structure in Klarify. It must be calculated correctly and consistently everywhere.

```typescript
// packages/core/src/compliance/readinessScore.ts

export const DIMENSION_WEIGHTS = {
  corporate_structure:         0.10,  // 10%
  capital_licensing:           0.20,  // 20% — highest weight
  kyc_infrastructure:          0.15,  // 15%
  aml_cft_programme:           0.20,  // 20% — highest weight
  transaction_monitoring:      0.10,  // 10%
  regulatory_reporting:        0.10,  // 10%
  regulatory_relationships:    0.10,  // 10%
  product_classification:      0.05,  //  5%
} as const;

// Dimension indicators — what contributes to each sub-score
export const DIMENSION_INDICATORS = {
  corporate_structure: [
    'cac_registered',
    'correct_share_structure',
    'nigerian_ceo_resident',
    'board_composition_compliant',
    'registered_office_address',
  ],
  capital_licensing: [
    'minimum_capital_deposited',
    'capital_source_documented',
    'arip_application_submitted',
    'fidelity_bond_in_place',
    'paid_up_capital_verified',
  ],
  kyc_infrastructure: [
    'nin_verification_integrated',
    'bvn_verification_integrated',
    'tiered_kyc_documented',
    'edd_procedures_defined',
    'pep_screening_configured',
  ],
  aml_cft_programme: [
    'bwra_documented',
    'aml_policy_in_place',
    'nfiu_goaml_registered',
    'mlro_appointed',
    'mlro_qualified',
  ],
  transaction_monitoring: [
    'tm_system_configured',
    'alert_thresholds_set',
    'daily_alert_review_active',
    'str_filing_workflow_tested',
    'ctr_filing_workflow_tested',
  ],
  regulatory_reporting: [
    'goaml_portal_registered',
    'pep_register_maintained',
    'quarterly_training_delivered',
    'annual_bwra_reviewed',
    'record_retention_configured',
  ],
  regulatory_relationships: [
    'sec_contact_logged',
    'cbn_contact_logged',
    'nfiu_contact_logged',
    'pre_screening_conducted',
    'communications_documented',
  ],
  product_classification: [
    'product_classified',
    'legal_opinion_obtained',
    'white_paper_drafted',
    'regulator_notified',
  ],
} as const;

export type DimensionKey = keyof typeof DIMENSION_WEIGHTS;
export type IndicatorKey<D extends DimensionKey> =
  typeof DIMENSION_INDICATORS[D][number];

export interface DimensionScores {
  [K in DimensionKey]: number;  // 0-100 for each dimension
}

export function calculateReadinessScore(
  dimensions: DimensionScores
): number {
  let total = 0;
  for (const [dimension, weight] of
       Object.entries(DIMENSION_WEIGHTS) as
       [DimensionKey, number][]) {
    total += dimensions[dimension] * weight;
  }
  return Math.round(total);
}
```

---

## 9. API STRUCTURE

```
GET  /api/health

# Auth
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/magic-link

# User & Organisation
GET  /api/user/profile
PUT  /api/user/profile
GET  /api/org/:orgId
PUT  /api/org/:orgId

# Onboarding
POST /api/onboarding/complete

# AI — FounderCounsel
POST /api/ai/chat              ← streaming endpoint
POST /api/ai/classify          ← product classification
POST /api/ai/analyse           ← document analysis
POST /api/ai/scenario          ← scenario simulator
POST /api/ai/jurisdiction-gap  ← gap analysis
GET  /api/ai/conversations
GET  /api/ai/conversations/:id
DELETE /api/ai/conversations/:id

# Compliance — ComplianceOS
GET  /api/compliance/score          ← current readiness score
GET  /api/compliance/score/history  ← score over time
PUT  /api/compliance/indicators     ← update indicator statuses
GET  /api/compliance/roadmap        ← all tasks
POST /api/compliance/roadmap/task
PUT  /api/compliance/roadmap/task/:id
DELETE /api/compliance/roadmap/task/:id

# Documents
GET  /api/documents
POST /api/documents/generate        ← generate from template
POST /api/documents/upload          ← upload for analysis
GET  /api/documents/:id
DELETE /api/documents/:id

# Regulators (CRM)
GET  /api/regulators                ← pre-loaded regulator list
GET  /api/regulators/:code          ← specific regulator profile
POST /api/regulators/interactions
GET  /api/regulators/interactions
GET  /api/arip                      ← ARIP tracker state
PUT  /api/arip                      ← update ARIP stage
GET  /api/arip/checklist

# Compliance Calendar
GET  /api/calendar/events
POST /api/calendar/events
PUT  /api/calendar/events/:id
GET  /api/calendar/upcoming         ← next 30 days

# Billing
POST /api/billing/subscribe
POST /api/billing/cancel
GET  /api/billing/status
POST /api/billing/webhook/korapay
```

---

## 10. FEATURE GATES (SUBSCRIPTION TIERS)

```typescript
// packages/core/src/types/subscription.ts
export type Plan = 'free' | 'navigator' | 'compass' | 'flagship';

export const PLAN_LIMITS = {
  free: {
    ai_queries_monthly:     10,
    document_analyses:       0,
    document_templates:      0,
    jurisdictions:           1,   // Nigeria only
    team_seats:              1,
    arip_tracker:          false,
    regulator_crm:         false,
    scenario_simulator:    false,
    human_escalation:      false,
    compliance_export:     false,
    api_access:            false,
  },
  navigator: {
    ai_queries_monthly:     50,
    document_analyses:       5,
    document_templates:      3,
    jurisdictions:           1,   // Nigeria only
    team_seats:              1,
    arip_tracker:          false,
    regulator_crm:         false,
    scenario_simulator:    false,
    human_escalation:      false,
    compliance_export:     false,
    api_access:            false,
  },
  compass: {
    ai_queries_monthly:  Infinity,
    document_analyses:   Infinity,
    document_templates:  Infinity,
    jurisdictions:              2,
    team_seats:                 5,
    arip_tracker:            true,
    regulator_crm:           true,
    scenario_simulator:      true,
    human_escalation:        true,
    compliance_export:    'pdf',
    api_access:             false,
  },
  flagship: {
    ai_queries_monthly:  Infinity,
    document_analyses:   Infinity,
    document_templates:  Infinity,
    jurisdictions:       Infinity, // all 5
    team_seats:          Infinity,
    arip_tracker:            true,
    regulator_crm:           true,
    scenario_simulator:      true,
    human_escalation: 'priority',
    compliance_export:  'full',
    api_access:             true,
  },
} as const;

export const PLAN_PRICING = {
  navigator: { monthly: 29,  annual: 278  },  // 20% annual discount
  compass:   { monthly: 99,  annual: 950  },
  flagship:  { monthly: 299, annual: 2870 },
} as const;
```

---

## 11. REGULATORY CORPUS

The RAG vector database must contain every document listed below. This list is non-negotiable — Klarify's authority depends on it. Corpus files live in `packages/ai/corpus/raw/`.

### 11.1 Corpus Inclusion Criteria

Operational restatement of §16 Rule 4. Before ingesting any new document, classify it against this filter.

**✅ ELIGIBLE — must be ingested:**
- Acts of Parliament (substantive primary legislation)
- Binding regulatory instruments issued under statutory authority (e.g. SEC Rules under ISA, CBN regulations under BOFIA, NFIU frameworks under MLPPA)
- FATF Recommendations and Targeted Updates (binding through FATF mutual-evaluation regime)
- GIABA mutual evaluation reports (binding peer review)
- The Founder's Guide to Building in Regulated Markets (Chuta, 2026) — canonical interpretive reference

**❌ INELIGIBLE — must NOT be ingested, even if officially published:**
- Sandbox guidelines, regulatory incubation frameworks, innovation programme rules (experimental scope, not binding on production businesses)
- Government strategy / policy / vision papers, national blockchain roadmaps
- Draft or proposed rules (not yet enacted)
- FAQs, explanatory memoranda, regulator press releases
- Industry research (Chainalysis, Emurgo, BitKE, exchange outlook reports, etc.)
- AI-generated summaries or secondary sources
- Comparative-jurisdiction reference docs outside African scope (e.g. Barbados, EU MiCA standalone)

When in doubt, exclude. A smaller, authoritative corpus produces better FounderCounsel responses than a larger corpus polluted with non-binding material.

### 11.2 Filename Convention

The ingestion script (Sprint 2-A3 `packages/ai/scripts/ingest.ts`) parses filenames to set jurisdiction and document-type metadata. All corpus files MUST follow:

```
{JURISDICTION_CODE}_{REGULATION_KEY}_{YEAR}.pdf
```

| Code | Meaning |
|---|---|
| `NG` | Nigeria |
| `GH` | Ghana |
| `KE` | Kenya |
| `MU` | Mauritius |
| `ZA` | South Africa |
| `FATF` | FATF (international) |
| `INTL` | Other international / regional bodies (BIS, GIABA, etc.) |
| `REF` | Canonical reference materials (Founder's Guide) |

Filenames must contain only `[A-Z0-9_-.]`. No spaces, colons, parentheses, or accented characters. Year is the version year of the document, not the year it was sourced.

Examples: `NG_ISA_2025.pdf`, `GH_VASP_ACT_2025.pdf`, `FATF_REC15_2019.pdf`, `INTL_GIABA_MER_NIGERIA_2021.pdf`, `REF_FOUNDERS_GUIDE_2026.pdf`.

### 11.3 Nigerian Corpus (PRIMARY)

| Status | Filename | Document |
|---|---|---|
| ✅ | `NG_ISA_2025.pdf` | Investments and Securities Act 2025 |
| ✅ | `NG_BOFIA_2020.pdf` | Banks and Other Financial Institutions Act 2020 |
| ✅ | `NG_CAMA_2020.pdf` | Companies and Allied Matters Act 2020 |
| ✅ | `NG_MLPPA_2022.pdf` | Money Laundering (Prevention and Prohibition) Act 2022 |
| ✅ | `NG_POCA_2022.pdf` | Proceeds of Crime (Recovery and Management) Act 2022 |
| ✅ | `NG_TPPA_2022.pdf` | Terrorism (Prevention and Prohibition) Act 2022 |
| ✅ | `NG_NDPA_2023.pdf` | Nigeria Data Protection Act 2023 |
| ✅ | `NG_NTAA_2025.pdf` | Nigeria Tax Administration Act 2025 |
| ✅ | `NG_STARTUP_ACT_2022.pdf` | Nigeria Startup Act 2022 |
| ✅ | `NG_SEC_DAR_2022.pdf` | SEC Digital Asset Rules 2022 (original) |
| ✅ | `NG_SEC_DAR_2023.pdf` | SEC Digital Asset Rules 2023 |
| ✅ | `NG_SEC_DAR_2024.pdf` | SEC Digital Asset Rules 2024 (latest enacted) |
| ✅ | `NG_CBN_VASP_2023.pdf` | CBN Guidelines on Operation of Bank Accounts for VASPs 2023 (binding under BOFIA) |
| ✅ | `NG_NFIU_VASP_2024.pdf` | NFIU AML/CFT Compliance Framework for VASPs (Dec 2024) |
| ✅ | `NG_EFCC_2024.pdf` | Economic and Financial Crimes Commission Act / EFCC AML Guidance 2024 |

### 11.4 African Regional Corpus

| Status | Filename | Document |
|---|---|---|
| ✅ | `GH_ISA_ACT_2025.pdf` | Ghana Investments and Securities Act 2025 |
| ✅ | `GH_VASP_ACT_2025.pdf` | Ghana VASP Act 2025 (Act 1154) |
| ✅ | `KE_VASP_ACT_2025.pdf` | Kenya VASP Act 2025 |
| ✅ | `MU_VAITOS_2021.pdf` | Mauritius Virtual Asset and Initial Token Offering Services Act 2021 |
| ✅ | `ZA_CASP_FSCA.pdf` | South Africa CASP / FSCA framework |
| ✅ | `ZA_FICA.pdf` | South Africa Financial Intelligence Centre Act |
| ✅ | `ZA_FAIS.pdf` | South Africa Financial Advisory and Intermediary Services Act |

### 11.5 International Standards

| Status | Filename | Document |
|---|---|---|
| ✅ | `FATF_REC15_2019.pdf` | FATF Recommendation 15 (2019 update) |
| ✅ | `FATF_UPDATES_2019_2025.pdf` | FATF Targeted Updates on Virtual Assets 2019–2025 (consolidated — covers all annual updates including 2021, 2022, 2023, 2024, and 2025; accepted as the definitive FATF source since FATF does not publish individual-year Targeted Updates as standalone documents) |
| ✅ | `INTL_GIABA_MER_NIGERIA.pdf` | GIABA Mutual Evaluation Report on Nigeria |

> **Note on FATF individual-year TUs:** FATF publishes Targeted Updates as cumulative revisions rather than discrete annual documents. `FATF_UPDATES_2019_2025.pdf` is the authoritative consolidated source and fully replaces the need for individual-year files. `FATF_TU_VA_2023.pdf` is retained as a secondary reference for the 2023 update specifically, but `FATF_UPDATES_2019_2025.pdf` takes precedence in the RAG pipeline. When citing FATF guidance, FounderCounsel should reference the consolidated document and indicate the relevant year of the update (e.g. "FATF Targeted Update 2023, as consolidated in the FATF Virtual Assets Guidance 2019–2025").

### 11.6 Canonical Interpretive Reference

| Status | Filename | Document |
|---|---|---|
| ✅ | `FOUNDERS_GUIDE_2026.pdf` | **The Founder's Guide to Building in Regulated Markets** (Chuta, 2026) — THIS IS THE MOST IMPORTANT DOCUMENT IN THE CORPUS |

### 11.7 Corpus Update Protocol

The corpus must be updated within 72 hours whenever:
- Any Nigerian regulatory body publishes a new circular, rule, or amendment that meets §11.1 ✅ ELIGIBLE criteria
- FATF publishes an annual Targeted Update (every June)
- A new African VASP Act is enacted (Ghana, Kenya, Mauritius, South Africa, or any new jurisdiction Klarify adds)
- ISA 2025 or any referenced Act is amended

**Update procedure:**
1. Classify the document against §11.1 inclusion criteria. If ❌ INELIGIBLE, do not proceed.
2. Rename to follow §11.2 filename convention.
3. Add a row to the relevant §11.3–11.5 table with `✅` status.
4. Run `pnpm ingest --file={NEW_FILENAME}.pdf` in `packages/ai/`.
5. Verify with the RAG end-to-end test in Sprint 2-A5.
6. Commit the CLAUDE.md update + corpus addition in the same PR.

---

## 12. FIVE TARGET PERSONAS

Always build for these five users. If a feature does not serve at least one of them clearly, question whether it belongs in the MVP.

**The Pre-Launch Founder**
Building a digital asset product in Nigeria. Has not yet engaged any regulator. May have been building for months without knowing they need a licence.
Needs: instant product classification, regulator map, step-by-step readiness roadmap.

**The Post-Letter Founder**
Has received a letter from SEC Nigeria, CBN, or NFIU. Does not understand it. Has 21 days to respond.
Needs: letter analysis, 72-hour action plan, draft response, specialist connection.
← This is the highest-urgency persona. Design for their stress.

**The Compliance Builder**
Has clarity on what to do but lacks the infrastructure to do it systematically. AML manual exists but nobody follows it. STRs are filed late. ARIP application is stalled.
Needs: ComplianceOS — smart checklists, document generators, compliance calendar.

**The Corporate Innovator**
Innovation lead at a bank, telco, or insurance company told to "do something with blockchain." No Web3 background, no compliance framework.
Needs: guided onboarding, regulator map, roadmap appropriate for enterprise context.

**The Compliance Professional**
Lawyer or compliance officer serving multiple clients across Nigeria or West Africa.
Needs: document analysis, regulatory Q&A, jurisdiction comparison, client-ready compliance reports.

---

## 13. REGULATORS PRE-LOADED IN THE CRM

These must be seeded in the database on every fresh deployment.

```typescript
export const NIGERIAN_REGULATORS = [
  {
    code: 'SEC_NIGERIA',
    name: 'Securities and Exchange Commission Nigeria',
    mandate: 'Primary regulator for digital assets under ISA 2025',
    website: 'https://sec.gov.ng',
    portal: 'https://home.sec.gov.ng',
    email: 'info@sec.gov.ng',
    phone: '+234 09-462-3600',
    address: 'SEC Tower, Plot 272 Samuel Adesujo Ademulegun Street, Abuja',
    jurisdiction_tags: ['DAX','DAOP','DAC','DAI','SECURITIES','ARIP'],
  },
  {
    code: 'CBN',
    name: 'Central Bank of Nigeria',
    mandate: 'Monetary policy, payment systems, naira, banking supervision',
    website: 'https://cbn.gov.ng',
    email: 'info@cbn.gov.ng',
    phone: '+234 0800-225-5226',
    jurisdiction_tags: ['PAYMENT','STABLECOIN','ENAIRA','BANKING','FX'],
  },
  {
    code: 'NFIU',
    name: 'Nigerian Financial Intelligence Unit',
    mandate: 'AML/CFT compliance, STR/CTR filing, financial intelligence',
    website: 'https://nfiu.gov.ng',
    portal: 'https://goaml.nfiu.gov.ng',
    email: 'info@nfiu.gov.ng',
    phone: '+234 09-461-0000',
    jurisdiction_tags: ['AML','CFT','STR','CTR','VASP_REGISTRATION'],
  },
  {
    code: 'NITDA',
    name: 'National Information Technology Development Agency',
    mandate: 'Blockchain policy, data protection (NDPA), AI strategy',
    website: 'https://nitda.gov.ng',
    email: 'info@nitda.gov.ng',
    phone: '+234 09-291-5000',
    jurisdiction_tags: ['BLOCKCHAIN_POLICY','DATA_PROTECTION','AI'],
  },
  {
    code: 'CAC',
    name: 'Corporate Affairs Commission',
    mandate: 'Company registration, beneficial ownership register',
    website: 'https://cac.gov.ng',
    email: 'info@cac.gov.ng',
    phone: '+234 09-461-8000',
    jurisdiction_tags: ['INCORPORATION','BENEFICIAL_OWNERSHIP'],
  },
  {
    code: 'EFCC',
    name: 'Economic and Financial Crimes Commission',
    mandate: 'Financial crime investigation and prosecution',
    website: 'https://efcc.gov.ng',
    email: 'info@efcc.gov.ng',
    phone: '+234 09-904-5096',
    jurisdiction_tags: ['ENFORCEMENT','AML','FRAUD'],
  },
  {
    code: 'NAICOM',
    name: 'National Insurance Commission',
    mandate: 'Insurance regulation — fidelity bonds for VASPs',
    website: 'https://naicom.gov.ng',
    jurisdiction_tags: ['INSURANCE','FIDELITY_BOND'],
  },
] as const;
```

---

## 14. DOCUMENT TEMPLATES

Nine regulatory document templates available in the generator. These are the files that must exist in `packages/ai/prompts/documents/`:

| Template ID | Document Name | Regulatory Basis |
|---|---|---|
| BWRA | Business-Wide Risk Assessment | NFIU Guidelines + MLPPA 2022 |
| AML_POLICY | AML/CFT Policy Manual | MLPPA 2022 |
| KYC_TIERS | KYC Tiering Framework | NFIU Guidelines |
| TOKEN_MEMO | Token Classification Legal Memo | ISA 2025, SEC Rules |
| ARIP_WHITEPAPER | ARIP White Paper Outline | SEC Digital Asset Rules |
| STR_TEMPLATE | STR Filing Template | NFIU goAML format |
| PEP_REGISTER | PEP Register Template | NFIU monthly submission |
| CO_APPOINTMENT | Compliance Officer Appointment Letter | MLPPA 2022 |
| REG_BRIEF | Regulator Engagement Brief | Best practice |

---

## 15. CODING STANDARDS

### TypeScript
- Strict mode everywhere: `"strict": true` in all `tsconfig.json`
- No `any` types — use `unknown` with type guards if needed
- All functions must have explicit return types
- All async functions must handle errors with try/catch

### Components
- All shared UI components use React Native primitives (`View`, `Text`, `Pressable`) — never HTML elements in `packages/ui`
- Platform-specific overrides use `.native.tsx` / `.web.tsx` suffixes
- Every component exports its props type as `ComponentNameProps`
- No inline styles — use `StyleSheet.create()` (mobile) or NativeWind `className` (web)

### API
- All endpoints return consistent shape:

```typescript
// Success
{ success: true, data: T, meta?: PaginationMeta }

// Error
{ success: false, error: string, code: string, details?: unknown }
```

- All user-facing error messages are plain English
- Never expose internal error messages or stack traces to clients
- Rate limiting on all AI endpoints: 10 req/minute (free), 60/minute (navigator), unlimited (compass/flagship)

### Testing
- Every new feature needs unit tests in `tests/`
- AI prompt changes need regression tests
- Readiness score calculation is tested with known inputs/outputs
- Document generator output is validated against regulatory requirements

### Commits
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Reference the user story: `feat(US-001): add product classification engine`
- No commit without passing TypeScript check and lint

### Environment Variables

```
# Required in all environments
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
ANTHROPIC_API_KEY=

# AI
ANTHROPIC_MODEL_ADVISORY=claude-sonnet-4-5    # FounderCounsel responses
ANTHROPIC_MODEL_ARCH=claude-opus-4            # Complex reasoning tasks
ANTHROPIC_MODEL_SIMPLE=claude-haiku-4-5       # Simple factual queries
VOYAGE_API_KEY=                               # Embeddings

# Storage
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=

# Payments (Korapay — existing Blockspace Technologies Limited account)
KORAPAY_PUBLIC_KEY=pk_live_...
KORAPAY_SECRET_KEY=sk_live_...
KORAPAY_ENCRYPTION_KEY=        # Used for webhook HMAC-SHA256 signature verification
NEXT_PUBLIC_KORAPAY_PUBLIC_KEY=pk_live_...

# Email
RESEND_API_KEY=

# OCR
AWS_TEXTRACT_REGION=

# Analytics
POSTHOG_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_API_URL=
NODE_ENV=
```

---

## 16. CRITICAL RULES — READ BEFORE EVERY SESSION

These rules are non-negotiable. Violating them creates liability for the product and harms the users Klarify is built to serve.

1. **Never remove the legal disclaimer from AI responses.** Every AI response touching specific legal obligations must end with: *"This is regulatory information, not legal advice. For advice specific to your situation, consult a qualified practitioner."*

2. **Never hardcode regulatory content in UI components.** All regulatory information (section numbers, thresholds, fees, deadlines) comes from the database or RAG corpus — never from hardcoded strings. Regulations change. Hardcoded content becomes dangerously wrong.

3. **Never expose user compliance data to other users.** Row-level security (RLS) on every table. Every query must be scoped to the authenticated user's organisation. Test this.

4. **Never use AI-generated content in the regulatory corpus.** The RAG corpus contains ONLY official government publications and the Founder's Guide. No AI summaries, no secondary sources. Wrong regulatory information causes real harm to real people.

5. **Never skip the citation in AI responses.** An AI response about Nigerian regulation without a citation to the specific regulation is an unverified claim. This is worse than no answer because it appears authoritative.

6. **The Readiness Score must update in real time.** Founders show this score to investors and boards. Stale scores undermine trust in the entire product. Always recalculate on task completion, document upload, and indicator update.

7. **The Post-Letter Founder is always the most urgent user.** When building or reviewing features, always ask: *if someone just received a regulatory letter and has 21 days to respond, does this feature serve them?* If yes, it goes first.

---

## 17. CURRENT SPRINT

**Sprint:** Sprint 5 — Billing, ARIP Tracker, Regulator CRM, Email Notifications, 4 ARIP Templates
**Week:** 9–10
**Goal:** A founder can subscribe and pay, track their full ARIP application lifecycle, manage regulator relationships, receive automated deadline and compliance email alerts, and generate all 4 ARIP Framework documents — making Klarify a commercially live, end-to-end compliance platform.

**Completed in Sprint 0:**
- Turborepo monorepo + pnpm workspaces ✅
- packages/config, core, ui (tokens), ai (prompts + client), api, web, mobile scaffolds ✅
- Database schema (001–004 migrations) + regulator seed ✅
- Supabase email/magic-link auth (web + mobile) ✅
- apps/api: JWT middleware, /api/user/me, /api/onboarding/complete, /api/compliance/score ✅

**Completed in Sprint 1:**
- packages/core: Zod validation schemas (onboarding, profile), IndicatorState engine, roadmap templates, format utils ✅
- packages/ui: 8 shared components — ReadinessGauge, ComplianceCard, RegulatoryIdentityCard, MessageBubble, UrgencyBadge, ProgressBar, RoadmapBoard, RegulatorProfile ✅
- apps/api: POST /api/onboarding/complete (org creation + score seeding + Phase 1 roadmap), PUT /api/compliance/indicators ✅
- apps/web: 5-step onboarding wizard, real dashboard shell (ScoreGauge + 8 dimension cards + quick actions), /profile page ✅

**Completed in Sprint 2:** (Core AI Live)
- packages/ai/rag: full RAG pipeline (pdf-parse → semantic chunker → Voyage AI `voyage-law-2` embeddings → pgvector search + jurisdiction re-rank → context assembly under 8k-token budget) ✅
- Corpus ingestion of all mandated documents — Founder's Guide, ISA 2025, SEC DAR (2022/2024/2025), MLPPA 2022, CBN VASP 2023, NFIU VASP 2024, NTAA 2025, BOFIA 2020, NDPA 2023, FATF Rec 15 + Targeted Updates 2023–2025, Ghana VASP Act 2025, Kenya VASP Act 2025 ✅
- apps/api: POST /api/ai/chat (SSE streaming, RAG + multi-turn history + citation extraction + monthly query quota), POST /api/ai/classify (Opus 4 + temp=0 + structured JSON validation), GET/DELETE /api/ai/conversations ✅
- packages/ai/chat: framework-agnostic SSE parser + `useKlarifyChat` React hook + Anthropic error classifier ✅
- apps/web: FounderCounsel chat UI, Regulatory Identity Card with dual-licence warning, dashboard nudge ✅
- Live on Fly.io (`api.klarify.africa`) + Netlify (`klarify.africa`) ✅

**Completed in Sprint 3:** (Document Analyser Live)
- Document upload service — multipart → S3 (AES-256 encrypted, private ACLs, UUID-only keys) ✅
- OCR — pdf-parse for text PDFs + AWS Textract fallback for scanned PDFs and images ✅
- Document analyser — Opus 4 (temperature=0) + RAG → plain-language summary, urgency level (CRITICAL/HIGH/MEDIUM/LOW), 72-hour action plan, draft acknowledgement letter, citations ✅
- Analysis queue (in-process) — upload → OCR → analyse → notify ✅
- Document Analyser UI — 3 input tabs (upload / paste / recent), animated processing stepper, urgency banner, deadline countdown, action plan with checkable steps, TinyMCE draft editor ✅
- .docx export — smart letterhead detection, markdown-to-Word rendering, S3-signed 1h TTL download URL ✅
- Email alerts — DocumentAnalysisCritical / DocumentAnalysisStandard templates via Resend ✅
- Dashboard integration — recent-documents widget, persistent CRITICAL banner, upload quick action ✅
- Auth UX — SubmitButton with useFormStatus() spinner on login/register/forgot-password ✅
- Plan-tier gating — rateLimitDocumentAnalyses + rateLimitDocumentTemplates Redis middleware ✅

**Completed in Sprint 4:** (ComplianceOS v1 Live)
- Smart Compliance Roadmap (US-007): 33-task Kanban (4 phases), phase-locking (N-1 must complete), task CRUD, custom tasks, solicitor blocker on P3-01, one-way indicator sync on task completion ✅
- Compliance Document Generator (US-008, 9 templates): BWRA, AML_POLICY, KYC_TIERS, TOKEN_MEMO, ARIP_WHITEPAPER, STR_TEMPLATE, PEP_REGISTER, CO_APPOINTMENT, REG_BRIEF — all with Claude+RAG generation, TinyMCE editor, .docx export, version history, plan-tier gate (Navigator: 3/month, Compass+: unlimited) ✅
- Readiness Score Enhancements (US-006): event-driven `scoreRecalculation.ts` (triggered by task completion, ARIP stage change, document analysis), GET /api/compliance/score/history?days=30|60|90, ScoreHistoryChart (Recharts line chart with 30/60/90d toggle + delta badge), DimensionBreakdown (8 expandable rows with progress bars and indicator explanations) ✅
- Profile editing: `PUT /api/user/org/:orgId` — org name editing for owners only; visible on /dashboard/profile ✅
- Tests: 138 API / 115 core / 97 AI passing | zero TypeScript errors ✅
- Deployed: Fly.io (forced --no-cache to resolve Depot build cache issue) + Netlify ✅

**Sprint 5 deliverables (in flight):**

Phase A — Billing & Subscriptions:
- S5-A1 ✅ DONE: Korapay account active (Blockspace Technologies Ltd); keys added to .env; Resend domain verified and working
- S5-A2: Billing service (Korapay Checkout initialisation, charge.success webhook with HMAC-SHA256 verification, cancelSubscription, upgradeSubscription), feature gate middleware (`requireFeature()`), free tier enforcement
- S5-A3: Pricing page (public, 3-column, monthly/annual toggle), /billing subscription management page (Korapay Checkout), UpgradePrompt component

Phase B — ARIP Tracker (US-009):
- S5-B1: ARIP service + DB migration (5-stage model, growth cap tracking, restrictions log), API endpoints (GET/PUT /api/arip, POST /api/arip/incident), AIP calendar automation
- S5-B2: ARIP Tracker UI — 5-stage stepper, stage detail panels (solicitor blocker, fee tracker, document checklist, growth cap gauge), Compass+ gate

Phase C — Regulator CRM (US-010):
- S5-C1: Regulator hub page + interaction log backend + CSV export, follow-up alerts in dashboard, Compass+ gate

Phase D — Email Notifications:
- S5-D1 ✅ DONE: Resend domain (klarify.africa) verified and working; RESEND_API_KEY active
- S5-D2: emailService.ts (deadline alerts, ARIP growth alerts, billing emails, weekly digest), daily cron for deadline alerts, notification preferences UI + unsubscribe tokens

Phase E — 4 ARIP Document Templates (US-008 Sprint 5 additions):
- S5-E1: ARIP_OPERATIONAL_PLAN, ARIP_SWORN_UNDERTAKING, SPONSORED_INDIVIDUAL (dynamic multi-person form, min 4), ARIP_ENTITY_RULES — all Compass+ only, shown in new "ARIP Framework" category tab

Phase F — Final verification:
- S5-E2 🔍 VERIFY: Full Sprint 5 checkpoint; update CLAUDE.md §17 to Beta sprint; begin 20-user closed beta

**Approved backlog (post–Sprint 5):**

- **US-008B · White Paper Analyzer** ✅ SPEC APPROVED (27 May 2026) — **IMPLEMENTED**
  - Spec: `Klarify_US-008B_White_Paper_Analyzer.md`
  - Compass+ gate (`white_paper_analyzer` in PLAN_LIMITS); sub-tab under Document Generator (`?tab=analyzer`)
  - Upload/paste → 14-section gap report + ARIP outline draft + `.docx` export + ARIP_WHITEPAPER generator handoff
  - Migration: `apps/api/db/migrations/020_white_paper_analyses.sql`
  - API: `/api/documents/whitepaper/*`
  - UI: `/dashboard/compliance/documents/analyzer/[id]`
  - 🔍 VERIFY: manual QA with GH exchange white paper fixture before production

*Update this section at the start of every new sprint.*

---

## 18. DO NOT TOUCH

The following must not be modified without explicit instruction from the product owner (Chimezie Chuta):

- System prompts in Section 6 above and `packages/ai/prompts/`
- Readiness score weights in Section 8
- Subscription plan features and pricing in Section 10
- Regulatory corpus document list in Section 11
- The legal disclaimer text in any AI response

---

*Last updated: May 22, 2026*
*Product owner: Chimezie Chuta — chimeziechuta@gmail.com*
*Company: Blockspace Technologies Limited, Lagos, Nigeria*
*Repository: klarify (private)*

Klarify — Sprint 2 & Sprint 3
Executable Task Breakdown for Claude Code (Opus 4)
─────────────────────────────────────────────────────

HOW TO USE THIS FILE
─────────────────────
Each task block is a self-contained Claude Code prompt.
Copy the entire block between the ═══ dividers and paste
it directly into Claude Code as a single instruction.

TASK TYPES — look for the label on each task:

🤖 CLAUDE CODE   → Paste directly into Claude Code
🖐  MANUAL        → You must do this yourself (external
service, account, API key, upload)
🔍 VERIFY         → Run this check before proceeding
to the next task

BEFORE STARTING SPRINT 2
──────────────────────────
Confirm ALL of these are true:
✅ Turborepo monorepo is set up (Sprint 0)
✅ Prisma schema matches CLAUDE.md Section 5
✅ PostgreSQL + Redis running locally and in staging
✅ pgvector extension installed in PostgreSQL
✅ Auth working (NextAuth.js — users can register/login)
✅ Onboarding wizard complete (Sprint 1)
✅ Dashboard shell live with static Readiness Score
✅ All environment variables in .env.local
✅ CLAUDE.md is in repository root

SPRINT MODEL GUIDE
Architecture tasks  → Use Opus 4
Implementation      → Use Sonnet 4.5
Debugging           → Start Sonnet, escalate to Opus
─────────────────────────────────────────────────────
╔═══════════════════════════════════════════════════════╗ ║           SPRINT 2 — WEEKS 5–6                        ║ ║           GOAL: CORE AI LIVE                          ║ ║                                                       ║ ║  Delivers: US-001, US-003, conversation history,      ║ ║            citation rendering, RAG pipeline           ║ ╚═══════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SPRINT 2 — PHASE A: RAG INFRASTRUCTURE (Complete before any AI feature work) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

────────────────────────────────────────────────────────── TASK S2-A1 🖐 MANUAL — Obtain API Keys ──────────────────────────────────────────────────────────

ACTION REQUIRED BY YOU before any Sprint 2 code runs.

ANTHROPIC API KEY

Go to: https://console.anthropic.com
Create API key with name "klarify-mvp"
Add to .env.local: ANTHROPIC_API_KEY=your_key_here ANTHROPIC_MODEL_ADVISORY=claude-sonnet-4-5 ANTHROPIC_MODEL_ARCH=claude-opus-4-5 ANTHROPIC_MODEL_SIMPLE=claude-haiku-4-5-20251001

VOYAGE AI EMBEDDINGS KEY (preferred for legal corpus)

Go to: https://www.voyageai.com
Sign up → API Keys → Create key "klarify-embeddings"
Add to .env.local: VOYAGE_API_KEY=your_key_here VOYAGE_MODEL=voyage-law-2
Fallback if Voyage unavailable: OPENAI_API_KEY=your_key_here EMBEDDING_MODEL=text-embedding-3-small

AWS CREDENTIALS (for S3 document storage)

Go to: https://console.aws.amazon.com/iam
Create IAM user "klarify-app" with S3FullAccess policy
Generate access key
Create S3 bucket: "klarify-documents-{env}" Enable: Server-side encryption (AES-256) Block all public access: ON
Add to .env.local: AWS_ACCESS_KEY_ID=your_key AWS_SECRET_ACCESS_KEY=your_secret AWS_S3_BUCKET=klarify-documents-dev AWS_REGION=eu-west-1

AWS TEXTRACT (OCR for document uploads)

In same AWS account
Textract is pay-per-use, no key needed
Just ensure IAM user has TextractFullAccess policy
Add to .env.local: AWS_TEXTRACT_REGION=eu-west-1

DONE? Confirm all 4 services have keys in .env.local before running S2-A2.

────────────────────────────────────────────────────────── TASK S2-A2 🖐 MANUAL — Prepare Regulatory Corpus Files ──────────────────────────────────────────────────────────

You must source and prepare these documents yourself. They cannot be programmatically downloaded due to copyright and access restrictions.

Create folder: packages/ai/corpus/raw/

NIGERIAN CORPUS — download from official sources: □ ISA 2025 Source: https://sec.gov.ng/investments-and-securities-act-2025 Save as: NG_ISA_2025.pdf

□ SEC Digital Asset Rules (all versions) Source: https://sec.gov.ng/our-mandate/regulation/rules-and-regulations Save as: NG_SEC_DAR_2022.pdf NG_SEC_DAR_2024.pdf NG_SEC_DAR_2025.pdf

□ MLPPA 2022 Source: https://nfiu.gov.ng/laws Save as: NG_MLPPA_2022.pdf

□ CBN VASP Guidelines 2023 Source: https://cbn.gov.ng/Out/2023/PSM/CBN%20VASP%20Guidelines.pdf Save as: NG_CBN_VASP_2023.pdf

□ NFIU AML/CFT Compliance Framework for VASPs Source: https://nfiu.gov.ng/guidelines Save as: NG_NFIU_VASP_AML_2024.pdf

□ NTAA 2025 Source: Federal Inland Revenue Service website Save as: NG_NTAA_2025.pdf

□ BOFIA 2020 Source: CBN website Save as: NG_BOFIA_2020.pdf

□ Nigeria Data Protection Act 2023 Source: https://ndpc.gov.ng Save as: NG_NDPA_2023.pdf

□ The Founder's Guide (Chuta, 2026) Source: YOUR OWN FILE — most important document Save as: FOUNDERS_GUIDE_2026.pdf NOTE: This is the canonical interpretive reference. Ensure the full manuscript PDF is in this folder.

INTERNATIONAL CORPUS — download from official sources: □ FATF Recommendation 15 (2019 update) Source: https://fatf-gafi.org/Recommendations Save as: FATF_REC15_2019.pdf

□ FATF Targeted Update Virtual Assets 2023 Source: https://fatf-gafi.org Save as: FATF_TU_VA_2023.pdf

□ FATF Targeted Update Virtual Assets 2024 Save as: FATF_TU_VA_2024.pdf

□ FATF Targeted Update Virtual Assets 2025 Save as: FATF_TU_VA_2025.pdf

PAN-AFRICAN CORPUS: □ Ghana VASP Act 2025 (Act 1154) Source: Ghana Parliament / Bank of Ghana website Save as: GH_VASP_ACT_2025.pdf

□ Kenya VASP Act 2025 Source: Kenya Capital Markets Authority website Save as: KE_VASP_ACT_2025.pdf

DONE? All files saved in packages/ai/corpus/raw/ before running S2-A3.

────────────────────────────────────────────────────────── TASK S2-A3 🤖 CLAUDE CODE — Build RAG Pipeline ─────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Read CLAUDE.md in full before starting. Read Section 3 (tech stack), Section 4 (packages/ai structure), Section 6 (system prompts), and Section 11 (regulatory corpus list).

Build the complete RAG pipeline in packages/ai/src/rag/

Requirements:

DOCUMENT INGESTION PIPELINE Create: packages/ai/src/rag/ingest.ts

PDF text extraction using pdf-parse npm package
Recursive text chunking:
Target chunk size: 512 tokens
Overlap between chunks: 50 tokens
Preserve document section headers in each chunk
Each chunk must store metadata: { source_file, document_name, jurisdiction, regulation_type, section_header, chunk_index, total_chunks, ingested_at }
Create a CLI script: packages/ai/scripts/ingest.ts Usage: pnpm ingest --file=NG_ISA_2025.pdf pnpm ingest --all (processes all files in packages/ai/corpus/raw/)
Progress logging: show file name, chunk count, embedding progress

EMBEDDING GENERATION Create: packages/ai/src/rag/embed.ts

Primary: Voyage AI voyage-law-2 model (specialised for legal text — better than general-purpose embeddings for regulatory corpus)
Fallback: OpenAI text-embedding-3-small
Batch embeddings: 100 chunks per API call
Rate limit handling: exponential backoff on 429
Store embeddings in PostgreSQL using pgvector: Table: document_chunks Columns: id, content, embedding vector(1024), metadata jsonb, source_file, jurisdiction, created_at

VECTOR SEARCH Create: packages/ai/src/rag/search.ts

Function: retrieveRelevantChunks(query, options)
Options: { topK: number, jurisdictions: string[], minSimilarity: number }
Use pgvector cosine similarity search
Default: topK=8, minSimilarity=0.75
Post-retrieval re-ranking: sort by (similarity score × jurisdiction_relevance_weight)
Jurisdiction weights: Nigeria: 1.0 (always highest priority) FATF international: 0.9 Ghana/Kenya: 0.8 (if user has these markets) Others: 0.7
Return: Array<{ content, metadata, similarity }>

CONTEXT ASSEMBLY Create: packages/ai/src/rag/context.ts

Function: assembleContext(chunks, userProfile)
Formats retrieved chunks into a structured context block for the Claude system prompt
Format each chunk as: [SOURCE: {document_name}, {section_header}] {content}
Total context budget: 8000 tokens maximum
If chunks exceed budget: truncate lowest-similarity chunks first, always keep top 3
Append user profile context: "User context: Building a {product_type} product, targeting {markets}, currently at {stage} stage, readiness score {score}/100."

DATABASE MIGRATION Create migration: prisma/migrations/add_rag_tables.sql

Required tables:

document_chunks (id, content, embedding, metadata, source_file, jurisdiction, created_at)
ingestion_log (id, filename, chunk_count, embedding_model, status, ingested_at, error_msg)

Run: pnpm prisma migrate dev

TESTS Create: packages/ai/src/tests/rag.test.ts

Test cases:

ingestDocument() produces correct chunk count
embeddings have correct dimensions (1024)
search() returns results above similarity threshold
context assembly stays within token budget
search with jurisdiction filter returns only matching documents
graceful handling of empty corpus

Install required packages: cd packages/ai && pnpm add pdf-parse @voyageai/client pnpm add -D @types/pdf-parse

After building, run the ingestion script on at least one test document to confirm the pipeline works end-to-end before moving to S2-A4. ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S2-A4 🖐 MANUAL — Run Corpus Ingestion ──────────────────────────────────────────────────────────

Run the ingestion script built in S2-A3 on all corpus documents. This must be done manually because it requires API calls to Voyage AI (costs money) and takes 20–40 minutes for the full corpus.

Run in sequence: cd packages/ai
Most important — ingest first
pnpm ingest --file=FOUNDERS_GUIDE_2026.pdf pnpm ingest --file=NG_ISA_2025.pdf pnpm ingest --file=NG_SEC_DAR_2025.pdf pnpm ingest --file=NG_SEC_DAR_2024.pdf pnpm ingest --file=NG_SEC_DAR_2022.pdf pnpm ingest --file=NG_MLPPA_2022.pdf pnpm ingest --file=NG_CBN_VASP_2023.pdf pnpm ingest --file=NG_NFIU_VASP_AML_2024.pdf pnpm ingest --file=NG_NTAA_2025.pdf pnpm ingest --file=NG_BOFIA_2020.pdf pnpm ingest --file=NG_NDPA_2023.pdf
International
pnpm ingest --file=FATF_REC15_2019.pdf pnpm ingest --file=FATF_TU_VA_2025.pdf pnpm ingest --file=FATF_TU_VA_2024.pdf pnpm ingest --file=FATF_TU_VA_2023.pdf
Regional
pnpm ingest --file=GH_VASP_ACT_2025.pdf pnpm ingest --file=KE_VASP_ACT_2025.pdf

VERIFY after completion: SELECT source_file, COUNT(*) as chunks FROM document_chunks GROUP BY source_file ORDER BY chunks DESC;

Expected: 2,000–5,000 total chunks across all documents. The Founder's Guide should produce the most chunks.

DONE? Confirm chunk counts look reasonable before S2-B1.

────────────────────────────────────────────────────────── TASK S2-A5 🔍 VERIFY — RAG Pipeline End-to-End Test ──────────────────────────────────────────────────────────

Run this manually to confirm RAG works before building the API layer on top of it:

cd packages/ai pnpm tsx scripts/test-rag.ts

The test script (built in S2-A3) should:

Send query: "What licences does a Nigerian crypto exchange need under ISA 2025?"
Print: top 5 retrieved chunks with similarity scores
Print: assembled context block
Confirm: ISA 2025 content appears in results
Confirm: similarity scores are above 0.75

If results look wrong: check pgvector extension, check embedding dimensions, re-run ingestion for ISA 2025.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SPRINT 2 — PHASE B: AI Q&A ENGINE (US-003) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

────────────────────────────────────────────────────────── TASK S2-B1 🤖 CLAUDE CODE — AI Chat API Endpoint ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Read CLAUDE.md Section 6 (system prompts) and Section 9 (API structure) before starting.

Build the AI chat API endpoint in apps/api/

CREATE: apps/api/src/routes/ai/chat.ts

POST /api/ai/chat  (streaming endpoint)

Request body: { message: string,          // user's question conversationId?: string,  // existing conversation jurisdiction?: string[]   // override user's markets }

Middleware (apply in order): a. authenticate — verify JWT, attach user to request b. rateLimitAI — enforce plan query limits: free: 10/month, navigator: 50/month, compass/flagship: unlimited c. validateBody — Zod schema validation

Handler logic: a. Load user profile + org from database (product_types, target_markets, stage, score) b. Load or create conversation record c. Save user message to messages table d. Call retrieveRelevantChunks(message, { topK: 8, jurisdictions: user.target_markets }) e. Call assembleContext(chunks, userProfile) f. Build messages array for Claude:

system: BASE_SYSTEM_PROMPT from CLAUDE.md S6
assembled regulatory context
previous messages from conversation (last 10) to maintain context
current user message g. Stream response from Claude API: model: process.env.ANTHROPIC_MODEL_ADVISORY max_tokens: 2000 stream: true h. As stream arrives:
Forward each chunk to client via SSE (Server-Sent Events)
Accumulate full response text i. After stream completes:
Extract citations from response using regex: pattern: /[([A-Z\s0-9]+),\s*([^\]]+)]/g e.g. "[ISA 2025, Section 357]"
Save assistant message + citations to database
Increment user's monthly query count
Update conversation.updated_at

Response (SSE stream): data: {"type":"chunk","content":"..."} data: {"type":"chunk","content":"..."} data: {"type":"done","citations":[...], "conversationId":"...", "messageId":"..."}

Error handling:

401: not authenticated
402: query limit reached (include upgrade CTA)
422: invalid request body
503: Claude API unavailable (retry after 30s)

CREATE: apps/api/src/routes/ai/conversations.ts

GET  /api/ai/conversations

Returns list of user's conversations
Include: id, title, updated_at, message_count
Auto-generate title from first message (truncate to 60 chars)
Order: updated_at DESC
Pagination: cursor-based, 20 per page

GET  /api/ai/conversations/:id

Returns full conversation with all messages
Include citations array on each assistant message
RLS enforced: user can only see own conversations

DELETE /api/ai/conversations/:id

Soft delete (sets deleted_at)
Returns 204 No Content

RATE LIMITER Create: apps/api/src/middleware/rateLimitAI.ts

Read monthly query count from Redis: key: "ai_queries:{userId}:{year}:{month}"
Compare against plan limit
If at limit: return 402 with body: { error: "Monthly query limit reached", code: "QUERY_LIMIT_REACHED", limit: 50, used: 50, resetDate: "2026-06-01", upgradeUrl: "/billing/upgrade" }
Increment count atomically with INCR
Set TTL to end of calendar month

TESTS Create: apps/api/src/tests/ai/chat.test.ts

Test cases:

Unauthenticated request returns 401
Request over query limit returns 402
Valid request creates conversation + messages
Citations are extracted and saved correctly
Conversation history is included in Claude context
SSE stream format is correct
Rate limit counter increments correctly
Free plan user blocked after 10 queries ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S2-B2 🤖 CLAUDE CODE — Ask Klarify UI (Web) ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Read CLAUDE.md Section 7 (brand tokens) before starting. The chat UI is the most important screen in the entire app. Build it to feel like a premium professional tool, not a generic chatbot.

Build the Ask Klarify chat interface in apps/web/

CREATE: apps/web/src/app/(dashboard)/ask/page.tsx

Layout: Two-column on desktop, single column mobile Left panel (320px): conversation history sidebar Right panel: active chat

CONVERSATION SIDEBAR Component: ConversationSidebar

"New conversation" button at top (prominent, teal)
List of past conversations: title + relative time
Active conversation highlighted in teal
Delete button on hover (with confirmation)
Empty state: "Your conversations will appear here. Ask Klarify your first regulatory question."
Loads from GET /api/ai/conversations

CHAT INTERFACE Component: ChatInterface

States: a. EMPTY (no messages yet):

Klarify logo + "Navigate Regulated Markets with Confidence"
4 suggested starter questions as clickable cards: "What licences does my product need in Nigeria?" "How do I start the ARIP process?" "I've received a letter from SEC Nigeria. Help." "What does ISA 2025 mean for my business?"
Input field prominent at bottom

b. ACTIVE (messages exist):

Message list (FlatList pattern, newest at bottom)
Auto-scroll to bottom on new messages
User messages: right-aligned, navy background
Assistant messages: left-aligned, white card with teal left border
Streaming text renders character by character (not all at once when complete)

CITATION RENDERING This is critical for trust. Every citation must be visually distinct and clickable.

Component: CitationBadge

Render inline citations as styled chips: [ISA 2025, S.357] in JetBrains Mono font Background: light teal (#E6F4F4) Border: klarifyTeal (#0B6E6E) Font: 12px, monospace
On click: open regulation source in new tab (map citation to known URLs in a citations map)
Citation map (hardcode these): "ISA 2025" → "https://sec.gov.ng/..." "SEC Digital Asset Rules" → "https://sec.gov.ng/..." "MLPPA 2022" → "https://nfiu.gov.ng/laws" "CBN VASP Guidelines" → "https://cbn.gov.ng/..." "NFIU AML/CFT Framework" → "https://nfiu.gov.ng/..."

TYPING INDICATOR Component: TypingIndicator

Three animated dots in klarifyTeal
Show while awaiting/streaming Claude response
Animated with Tailwind animate-bounce stagger

DISCLAIMER BANNER

Persistent non-dismissible banner above input: "Klarify provides regulatory information, not legal advice. Always verify with a qualified practitioner."
Small text, muted colour — present but not intrusive
THIS BANNER MUST NEVER BE REMOVED (see CLAUDE.md S16)

CHAT INPUT Component: ChatInput

Textarea (auto-grows, max 6 lines)
Send button: teal, arrow icon, disabled when empty
Keyboard: Enter sends, Shift+Enter new line
Character limit: 2000 chars with counter
Disabled state while streaming response

QUERY LIMIT INDICATOR (plan-aware)

For free/navigator users: show remaining queries "8 of 50 queries used this month"
When at 80% of limit: amber warning
When at limit: show upgrade prompt instead of input

MOBILE BEHAVIOUR

Sidebar hidden on mobile, accessible via hamburger
Full-screen chat on mobile
Input pinned to bottom, above keyboard
KeyboardAvoidingView equivalent using viewport height CSS variable

useKlarifyChat HOOK Create: packages/ai/src/chat/useKlarifyChat.ts

Interface: const { messages,         // Message[] isStreaming,      // boolean isLoading,        // boolean error,            // string | null sendMessage,      // (text: string) => PromisecreateConversation, // () => Promise conversations, // ConversationSummary[] loadConversation, // (id: string) => Promise deleteConversation, // (id: string) => Promise } = useKlarifyChat()

Manages SSE stream parsing
Handles reconnection on stream interruption
Persists active conversation to localStorage (so refresh doesn't lose context)

TESTS Create: apps/web/src/tests/ask/chat.test.tsx

Test cases:

Starter question click populates input
Message renders with correct alignment
Citation badges render for assistant messages
Typing indicator shows during streaming
Disclaimer banner is always present
Query limit UI shows for navigator plan user
Empty state renders when no messages ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S2-B3 🔍 VERIFY — AI Q&A End-to-End Test ──────────────────────────────────────────────────────────

Before building the classification engine, manually test the full Q&A flow:

Log in as a test user (navigator plan)

Go to /ask

Ask: "What is the ARIP process in Nigeria?"

Verify: □ Response streams in real time (not all at once) □ At least one citation appears [ISA 2025, ...] or [SEC Digital Asset Rules, ...] □ Disclaimer banner is visible □ Conversation saved — appears in sidebar □ Response includes legal advice disclaimer at end □ Response time under 5 seconds to first token

Ask a follow-up in same conversation: "What is the minimum capital requirement for a DAX?"

Verify: □ Claude remembers context of previous question □ Correct capital figure cited (check against PRD)

Log in as free plan user

Send 11 queries

Verify: □ 11th query blocked with 402 error □ Upgrade prompt shown in UI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SPRINT 2 — PHASE C: PRODUCT CLASSIFICATION ENGINE (US-001) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

────────────────────────────────────────────────────────── TASK S2-C1 🤖 CLAUDE CODE — Classification API + Engine ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Read CLAUDE.md Section 6 (classification system prompt) before starting. This is the exact prompt to use.

Build the product classification engine.

CREATE: apps/api/src/routes/ai/classify.ts

POST /api/ai/classify

Request body: { description: string,    // product description features: string[],     // optional: key features businessModel: string,  // optional: how they earn targetUsers: string     // optional: who uses it }

Handler logic: a. Validate input (min 50 chars description) b. Retrieve relevant regulatory chunks focused on:

ISA 2025 digital asset definitions
SEC Digital Asset Rules — VASP categories
CBN payment systems guidance
FATF VASP definition Use retrieveRelevantChunks with query: "VASP classification DAX DAOP DAC DAI securities payment digital asset definition" c. Call Claude with CLASSIFICATION_PROMPT from CLAUDE.md Section 6 (use Opus 4 for this — most important reasoning task in the product) d. Parse JSON response from Claude e. Validate response shape matches ClassificationResult f. Save classification result to database: Table: product_classifications Columns: id, org_id, user_id, description, result jsonb, model_used, created_at g. Update user_profiles.product_types with result h. Trigger readiness score recalculation i. Return classification result

ClassificationResult type: { primary_category: 'DAX'|'DAOP'|'DAC'|'DAI'| 'PAYMENT'|'HYBRID', secondary_categories: string[], primary_regulator: 'SEC_NIGERIA'|'CBN'|'BOTH', secondary_regulators: string[], required_licences: Array<{ name: string, regulator: string, url: string, urgency: 'CRITICAL'|'HIGH'|'MEDIUM' }>, risk_if_unlicensed: 'CRITICAL'|'HIGH'|'MEDIUM', dual_licence_required: boolean, reasoning: string, citations: Array<{ regulation: string, section: string, relevance: string }> }

DATABASE MIGRATION Add table: product_classifications Add column: user_profiles.last_classified_at

TESTS Create: apps/api/src/tests/ai/classify.test.ts

Test with these known inputs → expected outputs: a. "Platform where users buy and sell Bitcoin and USDT using naira bank transfers" Expected: DAX, SEC_NIGERIA primary, CBN secondary Risk: CRITICAL

b. "App that lets users buy fractional shares of Lagos real estate. Each property is tokenised. Users earn rental income proportional to their tokens." Expected: DAOP (tokenised security), SEC_NIGERIA dual_licence: true (also needs DAC) Risk: CRITICAL

c. "Wallet app that lets users hold USDT and send it to friends. No trading, no investment products." Expected: PAYMENT or DAC, CBN primary Risk: HIGH

d. "DAO governance token for a DeFi lending protocol" Expected: DAOP likely, risk assessment includes uncertainty language about DeFi framework ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S2-C2 🤖 CLAUDE CODE — Regulatory Identity Card UI ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Build the product classification UI — the "Regulatory Identity Card" output screen.

CREATE: apps/web/src/app/(dashboard)/classify/page.tsx

Two-step layout: STEP 1: Input form (before classification) STEP 2: Results — Regulatory Identity Card

INPUT FORM (Step 1)

Large textarea: "Describe what your product does"
Placeholder: "Tell us in plain language: what does your product do, how do users interact with it, and how does your business make money? The more detail you provide, the more accurate your regulatory classification will be."
Optional fields (collapsible "Add more detail"):
Key features (tag input)
Business model (dropdown + free text)
Target users (free text)
"Classify My Product" CTA button (teal, full-width)
Loading state: "Analysing your product against Nigerian regulatory frameworks..." with spinner

REGULATORY IDENTITY CARD (Step 2) This is the primary output component. Component: RegulatoryIdentityCard

Design: Styled card with Klarify branding. The card should feel like an official document — structured, authoritative, clear.

CARD HEADER:

Product category badge (large, colour-coded): DAX → Navy background DAOP → Teal background DAC → Gold background PAYMENT → Green background HYBRID → Gradient
Category full name below badge
Risk level badge top-right: CRITICAL → Red pill HIGH → Amber pill MEDIUM → Green pill

CARD BODY — 4 sections:

Section A: "Your Regulators"

Primary regulator: large logo + name + mandate
Secondary regulators: smaller, listed
Each regulator is clickable → regulator profile

Section B: "Licences Required"

Each licence as a card: Licence name | Regulator | Urgency badge Brief description of what it authorises "Learn more" link → relevant regulation URL
If dual_licence_required: amber alert banner: "⚠️ Your product requires TWO registrations. A DAX licence does not cover custody. You need both DAX and DAC registration."

Section C: "If You Launch Without These"

Consequence statement (from risk_if_unlicensed)
CRITICAL: "Operating without authorisation under ISA 2025 can result in regulatory action, asset freezes, and criminal liability under the NTAA 2025."
Visual emphasis: red background section

Section D: "Why This Classification"

Collapsible reasoning section
AI's reasoning in plain language
Citations listed as chips (same as chat UI)

CARD FOOTER:

"Save Classification" button
"Share" button (generates shareable link)
"Ask a follow-up question" → routes to /ask with context of classification result pre-loaded

INTEGRATION WITH DASHBOARD

If user has no classification yet: dashboard shows "What are you building?" CTA card
After classification: dashboard shows product type badge and primary regulator in header

GUIDE STEP

Add classification as onboarding step if skipped: If user completed onboarding but chose "I'm Not Sure Yet" on product type — show nudge banner on dashboard: "Classify your product to get personalised compliance guidance →"

TESTS

Card renders all sections for DAX result
Dual licence warning shows for DAX+DAC result
CRITICAL risk section has red styling
Citations are clickable links
"Ask follow-up" routes to /ask with context
Save classification calls POST /api/ai/classify
Loading state shows during API call ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S2-C3 🔍 VERIFY — Sprint 2 Complete Checkpoint ──────────────────────────────────────────────────────────

Run full Sprint 2 verification before closing sprint:

□ RAG pipeline: corpus ingested, chunks in database □ AI Q&A: streaming responses with citations working □ Rate limiting: free plan blocked at 10 queries □ Conversation history: persists across sessions □ Product classification: returns structured JSON □ Regulatory Identity Card: all 4 sections render □ Dual licence warning: appears for DAX+DAC products □ Legal disclaimer: visible on all AI screens □ Response times: Q&A <5s, Classification <8s □ Mobile: chat interface usable on 360px viewport □ Tests passing: pnpm test (all packages) □ TypeScript: pnpm tsc --noEmit (zero errors)

SPRINT 2 MILESTONE: "Core AI Live" ✅

Update CLAUDE.md Section 17 to Sprint 3 before starting Sprint 3 tasks.

╔═══════════════════════════════════════════════════════╗ ║           SPRINT 3 — WEEKS 7–8                        ║ ║           GOAL: DOCUMENT ANALYSER LIVE                ║ ║                                                       ║ ║  Delivers: US-002, document upload + OCR,             ║ ║            72-hour action plan, draft response        ║ ║            generator, urgency scoring                 ║ ╚═══════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SPRINT 3 — PHASE A: FILE HANDLING INFRASTRUCTURE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

────────────────────────────────────────────────────────── TASK S3-A1 🤖 CLAUDE CODE — Document Upload Service ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Read CLAUDE.md Section 16, Rule 3 (never expose user compliance data) before starting. Uploaded regulatory letters are highly sensitive. Security is paramount.

Build the document upload and storage service.

CREATE: apps/api/src/services/documentUpload.ts

uploadDocument(file, userId, orgId): a. Validate file:

Allowed types: PDF, JPG, JPEG, PNG, WEBP
Max size: 10MB
Scan filename for path traversal attempts b. Generate secure filename: {orgId}/{userId}/{uuid}.{ext} Never use original filename in storage path c. Upload to S3: Bucket: process.env.AWS_S3_BUCKET Server-side encryption: AES-256 ACL: private (no public access ever) d. Create record in uploaded_documents table: { id, org_id, user_id, original_filename, file_type, file_size, s3_key, status: 'pending', uploaded_at } e. Return: { documentId, status: 'pending' }

CREATE: apps/api/src/services/documentOcr.ts

extractText(documentId): a. Get document record from database b. Download file from S3 to temp buffer (never write to disk — process in memory) c. If PDF:

Use pdf-parse to extract text directly
If pdf-parse returns <100 chars (scanned PDF): fall through to Textract d. If image (JPG/PNG) OR scanned PDF:
Call AWS Textract: await textract.detectDocumentText({ Document: { Bytes: fileBuffer } })
Concatenate all LINE blocks in order e. Clean extracted text:
Remove excessive whitespace
Preserve paragraph structure
Remove headers/footers if clearly repeated f. Update uploaded_documents: { extracted_text, ocr_method, ocr_completed_at } g. Return extracted text string

CREATE: apps/api/src/routes/documents/upload.ts

POST /api/documents/upload Content-Type: multipart/form-data

Request: file (required), document_type (optional)

Handler: a. authenticate middleware b. Check plan: document analysis limit (free: 0, navigator: 5/month, compass+: unlimited) c. Receive multipart upload using busboy d. Stream directly to S3 (do not buffer entire file in server memory) e. Call uploadDocument service f. Return 202 Accepted: { documentId, status: "processing", pollUrl: "/api/documents/{id}/status" }

Note: Analysis happens asynchronously — client polls for status. Do not make user wait for OCR + AI.

CREATE: apps/api/src/routes/documents/status.ts

GET /api/documents/:id/status

Returns: { id, status, analysisResult?, urgencyLevel?, createdAt, updatedAt }

Status values: "pending" → uploaded, not yet OCR'd "extracting" → OCR in progress "analysing" → AI analysis in progress "complete" → analysis ready "error" → processing failed (include error message)

DATABASE MIGRATION Ensure uploaded_documents table has all columns: id, org_id, user_id, original_filename, file_type, file_size, s3_key, extracted_text, ocr_method, analysis_result jsonb, urgency_level, action_items jsonb, draft_response text, status, error_message, uploaded_at, ocr_completed_at, analysed_at

TESTS Create: apps/api/src/tests/documents/upload.test.ts

Test cases:

PDF upload stores file in S3 with correct path
File type validation rejects .exe files
File size validation rejects >10MB files
Path traversal attempt in filename is rejected
Unauthenticated upload returns 401
Navigator plan user blocked at 5/month limit
Free plan user blocked immediately
202 response includes polling URL
S3 key never contains original filename

Install: pnpm add @aws-sdk/client-s3 pnpm add @aws-sdk/client-textract ═══════════════════════════════════════════════════════

──────────────────────────────────────────════════════ TASK S3-A2 🔍 VERIFY — S3 Upload Working ──────────────────────────────────────────────────────

Before building the AI analysis layer:

Upload a test PDF via API using curl or Insomnia: POST /api/documents/upload Authorization: Bearer {test_token} Body: form-data, file={any_pdf}

Verify in AWS S3 console: □ File appears in bucket at {orgId}/{userId}/{uuid}.pdf □ File is NOT publicly accessible □ Server-side encryption is enabled

Verify in database: SELECT * FROM uploaded_documents ORDER BY uploaded_at DESC LIMIT 1; □ s3_key contains uuid (not original filename) □ status = 'pending'

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SPRINT 3 — PHASE B: DOCUMENT ANALYSIS ENGINE (US-002) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

────────────────────────────────────────────────────────── TASK S3-B1 🤖 CLAUDE CODE — Document Analysis Service ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Read CLAUDE.md Section 6 (document analyser prompt) before starting. Use Opus 4 for analysis — this is the highest-stakes feature in the product. A founder responding to a regulator's letter based on wrong analysis faces serious consequences.

Build the document analysis service.

CREATE: apps/api/src/services/documentAnalysis.ts

analyseDocument(documentId):

a. Load document from database: { extracted_text, original_filename, org_id } b. Update status: "analysing" c. Load user/org profile for context d. Retrieve relevant corpus chunks: Query built from first 500 chars of document + "regulatory notice enforcement SEC Nigeria CBN NFIU response deadline compliance" topK: 10 (more context for this critical task) e. Assemble context block f. Call Claude with DOCUMENT_ANALYSER_PROMPT from CLAUDE.md Section 6 USE: process.env.ANTHROPIC_MODEL_ARCH (Opus 4) for this task specifically max_tokens: 3000 (longer for full analysis) temperature: 0 (deterministic — compliance context)

g. Parse Claude response into DocumentAnalysisResult: { plain_language_summary: string, issuing_regulator: { code: string,           // CBN, SEC_NIGERIA, etc. name: string, department: string }, urgency_level: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW', urgency_reasoning: string, regulatory_ask: string[],  // bullet list response_deadline: { days_remaining: number | null, date_string: string | null, is_specified: boolean }, action_plan: Array<{ step: number, action: string, urgency: 'IMMEDIATE'|'TODAY'|'THIS_WEEK', notes: string }>, draft_response: string,    // full letter text citations: Citation[], disclaimer: string         // always present }

h. Calculate days_remaining: If deadline date found in document: days_remaining = deadline_date - today If no date: null

i. Save to database: uploaded_documents.analysis_result = result uploaded_documents.urgency_level = result.urgency uploaded_documents.action_items = result.action_plan uploaded_documents.draft_response = result.draft uploaded_documents.status = 'complete' uploaded_documents.analysed_at = now()

j. Trigger notification if urgency is CRITICAL or HIGH: Send email to user: "Action Required — Your regulatory document has been analysed"

CREATE: apps/api/src/services/analysisQueue.ts

Simple in-process queue for analysis jobs. (Upgrade to BullMQ in V1.1 if needed)

Triggered by document upload completion
Runs extractText() → analyseDocument() in sequence
Updates status at each step
Handles errors: update status to 'error', log error, notify user

CREATE: apps/api/src/routes/documents/analyse.ts

POST /api/documents/analyse Body: { documentId: string } OR { text: string } (paste text directly)

For paste-text case:

Skip upload and OCR
Create uploaded_documents record with extracted_text = body.text, ocr_method = 'paste'
Run analysis directly

GET /api/documents/:id

Returns full document record including analysis
RLS: user can only access own documents

DRAFT RESPONSE QUALITY REQUIREMENTS The draft response generated must:

Be addressed to the correct regulator and department
Include company name, CAC number (from org profile), reference number from the original document
Acknowledge receipt professionally
Express genuine intention to cooperate
Request reasonable clarification where appropriate
NOT assert legal positions
NOT make admissions of wrongdoing
End with: "We look forward to your guidance and remain committed to full compliance."
Include the disclaimer at the bottom: "Note: This draft response was prepared with AI assistance. Review with a qualified Nigerian digital asset regulatory specialist before submission."

TESTS Create: apps/api/src/tests/documents/analysis.test.ts

Use test fixtures — create these files: tests/fixtures/sec_notice_sample.txt tests/fixtures/cbn_circular_sample.txt tests/fixtures/nfiu_query_sample.txt

(Write brief fictional but realistic regulatory notice text for testing — do not use real letters)

Test cases:

Analysis produces all required fields
CRITICAL urgency for cease and desist language
HIGH urgency for enforcement notices with deadline
days_remaining calculated correctly from dates
Draft response contains company name from org profile
Draft response does NOT contain legal admissions
Disclaimer always present in draft response
OCR failure falls back gracefully (error status)
Opus 4 model used (not Sonnet) — verify in logs ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S3-B2 🤖 CLAUDE CODE — Document Analyser UI ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ This screen is the most emotionally important in the product. A founder who uploads a regulatory letter is scared. The UI must immediately reduce that fear by being clear, structured, and actionable.

Build the Document Analyser UI in apps/web/

CREATE: apps/web/src/app/(dashboard)/analyse/page.tsx

UPLOAD SECTION Component: DocumentUploader

Three upload methods (tab-switcher): a. UPLOAD FILE

Drag-and-drop zone with dashed teal border
"Drop your regulatory document here"
"or click to browse" link
Accepted: PDF, JPG, PNG (max 10MB)
File preview: filename + size + file type icon
Progress bar during upload
Upload button disabled until file selected

b. PASTE TEXT

Large textarea: "Paste the letter text here"
Min 100 characters required
Character counter
"Analyse This Document" button

c. RECENT DOCUMENTS

List of user's previously analysed documents
Title (auto-generated from regulator + date)
Urgency badge + analysis date
Click to view previous analysis

PROCESSING STATE After upload — show animated processing screen: Step indicators (visual stepper): ● Uploading document...     [complete] ● Extracting text...        [in progress / animated] ○ Analysing with Klarify AI... ○ Preparing your action plan...

Poll GET /api/documents/:id/status every 2 seconds
Estimated time: "This usually takes 15–30 seconds"
If error: show friendly error + retry option

ANALYSIS RESULTS LAYOUT Component: DocumentAnalysisResult

URGENCY BANNER (full width, top of results):

CRITICAL → Red background, white text: "⛔ CRITICAL — Immediate action required"
HIGH → Amber: "⚠️ HIGH PRIORITY — Action required"
MEDIUM → Blue: "📋 Information request — Response needed"
LOW → Green: "ℹ️ Advisory notice — No urgent action"

RESULTS GRID (2-column desktop, 1-column mobile):

LEFT COLUMN:

Card 1: "What This Document Is Saying"

Plain language summary
Issuing regulator badge (with logo)
Department if identified

Card 2: "What The Regulator Is Asking For"

Bulleted list of specific asks
Each ask as a distinct item

Card 3: "Response Deadline" Component: DeadlineTracker

If deadline known: Large countdown: "19 days remaining" Progress bar (red when < 7 days) Exact date below counter "Add to calendar" button
If no deadline: "No deadline specified — respond promptly as a best practice"

RIGHT COLUMN:

Card 4: "Your 72-Hour Action Plan"

Numbered step list
Each step with urgency tag: IMMEDIATE (red) / TODAY (amber) / THIS WEEK (green)
Expandable notes on each step
Checkbox to mark step complete (saved to database as user progress)
Progress: "2 of 5 steps completed"

Card 5: "Draft Response"

Full draft letter in editable rich text editor
"Edit Draft" button (enables editing)
"Copy to Clipboard" button
"Download as Word (.docx)" button (calls document generation service)
Prominent disclaimer below editor: "This draft was prepared with AI assistance. Review with a qualified specialist before sending. Klarify is not liable for the outcome of regulatory submissions."

FOLLOW-UP CHAT INTEGRATION Below results panel: "Have questions about this document?" Mini chat interface (same as /ask but pre-loaded with context of the analysed document)

Pre-loaded system context: the analysis result
First suggested question: "What are the consequences if I don't respond?"
Routes to /ask with documentId in URL params

DOCUMENT HISTORY Create: apps/web/src/app/(dashboard)/analyse/history/page.tsx

Table view of all analysed documents
Columns: Document name, Regulator, Urgency, Date analysed, Status
Filter by urgency level
Click row → view full analysis
Download original document link

MOBILE BEHAVIOUR

Upload is primary action on mobile
Urgency banner full-width, prominent
Action plan steps as vertical card stack
Draft response: view only on mobile (editing redirected to desktop)
"Email me this analysis" option on mobile (sends full analysis to user's email)

TESTS Create: apps/web/src/tests/analyse/

Test cases:

File upload renders progress bar
Processing state shows correct step for status
CRITICAL urgency renders red banner
Deadline countdown shows correct days remaining
Deadline turns red when < 7 days
Action plan steps are checkable
Draft response renders in editor
Disclaimer always visible below draft
Download as .docx triggers file download
Follow-up chat context includes document summary
Error state renders retry option ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S3-B3 🤖 CLAUDE CODE — Export Draft as .docx ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Build the Word document export for draft responses. This is a MUST HAVE per the PRD acceptance criteria.

CREATE: apps/api/src/services/exportDraft.ts

generateDraftDocx(documentId, userId):

a. Load analysis result from database b. Load org profile: company name, address, CAC number, compliance officer name c. Build Word document using docx npm package:

DOCUMENT STRUCTURE:

Company letterhead: [Company Name] (bold, 14pt) [Address] [Email] | [Phone]

Date: [today's date]

Recipient block: The Registrar / Director General [Regulator Name] [Regulator Address]

Subject line (bold): RE: [Reference number from original document if detected, otherwise "Your Notice Dated [original document date]"]

Dear Sir/Ma,

Body paragraphs (from draft_response field)

Yours sincerely,



[Compliance Officer Name] [Title] On behalf of [Company Name]

Footer (italic, small): "This response was drafted with the assistance of Klarify regulatory advisory platform. It has been reviewed and approved for submission."

d. Upload generated .docx to S3: Path: {orgId}/{userId}/drafts/{uuid}_draft.docx e. Return signed S3 download URL (expires 1 hour)

ENDPOINT POST /api/documents/:id/export-draft

Returns: { downloadUrl, expiresAt }

Client downloads file directly from S3 URL. Do not proxy the file through the API server.

TESTS

Generated docx is valid ZIP file
Contains company name from org profile
Contains reference number if provided
Contains disclaimer in footer
S3 URL is time-limited (1 hour)
File not accessible after URL expiry ═══════════════════════════════════════════════════════

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ SPRINT 3 — PHASE C: DASHBOARD INTEGRATION & ALERTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

────────────────────────────────────────────────────────── TASK S3-C1 🤖 CLAUDE CODE — Email Alerts for Analysis ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Build email notifications for document analysis completion — especially critical for CRITICAL urgency.

CREATE: apps/api/src/services/emailService.ts

Using Resend (or SendGrid as fallback):

sendAnalysisComplete(userId, documentId, urgency):

Email template for CRITICAL/HIGH urgency: Subject: "⛔ Action Required — Klarify has analysed your regulatory document"

Body:

Urgency banner (coloured — use inline CSS)
Summary: "We've analysed the document you uploaded. Here's what you need to know:"
3-bullet summary (from analysis)
Deadline if present: "You have {N} days to respond"
CTA button: "View Your Action Plan →" (links to /analyse/{documentId})
Reminder: "This is time-sensitive. Do not ignore this document."
Footer with disclaimer

Email template for MEDIUM/LOW urgency: Subject: "Klarify has analysed your document" Simpler email, same structure but no urgency emphasis

ADD TO: apps/api/src/services/analysisQueue.ts After analysis completes:

If urgency CRITICAL or HIGH: send immediately
If MEDIUM or LOW: queue for next hourly digest

.env.local addition: RESEND_API_KEY=your_key_here EMAIL_FROM=noreply@klarify.africa

🖐 MANUAL: Set up Resend account

Go to: https://resend.com
Sign up with your email
Add domain: klarify.africa
Follow DNS verification steps
Create API key → add to .env.local
Verify sending works with test email ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S3-C2 🤖 CLAUDE CODE — Dashboard: Recent Documents ──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════ Integrate document analysis into the main dashboard.

Update: apps/web/src/app/(dashboard)/page.tsx

ADD TO DASHBOARD: "Recent Documents" widget

Shows last 3 analysed documents
Each card: document name + urgency badge + days ago
CRITICAL documents shown first regardless of date
"View all documents →" link to /analyse/history

ADD TO DASHBOARD: Urgency alert banner If any document has urgency=CRITICAL and deadline within 7 days: Show prominent top-of-page alert (dismissible): "⛔ You have a CRITICAL regulatory matter with {N} days remaining. View your action plan →"

Red background, white text
Cannot be permanently dismissed (reappears on next login if still unresolved)

ADD TO DASHBOARD: "Upload a document" quick action

In the quick actions row
Icon: document with upload arrow
"Analyse a regulatory letter"
Routes to /analyse

UPDATE: Dashboard loading state

Add documents to existing data fetching
Use existing loading skeleton pattern
No flash of empty state ═══════════════════════════════════════════════════════

────────────────────────────────────────────────────────── TASK S3-C3 🔍 VERIFY — Sprint 3 Complete Checkpoint ──────────────────────────────────────────────────────────

Run full Sprint 3 verification before closing sprint:

UPLOAD & OCR: □ PDF upload → text extracted correctly □ Image upload → Textract OCR produces readable text □ Scanned PDF → falls back to Textract successfully □ Paste text → skips upload, goes straight to analysis □ 10MB+ file → rejected with clear error message □ Files stored encrypted in S3 □ Files never publicly accessible via S3 URL

ANALYSIS: □ Analysis uses Opus 4 (verify in API logs) □ CRITICAL urgency triggers for enforcement language □ HIGH urgency triggers for deadlines < 30 days □ Days remaining calculated correctly □ Draft response contains company name from org profile □ Draft response has no legal admissions □ Disclaimer present in draft response □ Citations extracted from response

UI: □ Urgency banner correct colour for each level □ Deadline countdown shows correct number □ Deadline turns red when < 7 days □ Action plan steps are checkable □ Download .docx produces valid Word document □ Follow-up chat loads with document context

NOTIFICATIONS: □ Email sent on CRITICAL analysis (check inbox) □ Email contains link to correct document analysis □ Email disclaimer present

DASHBOARD: □ CRITICAL document shows alert banner □ Recent documents widget shows last 3 □ Upload quick action present

SECURITY: □ User cannot access another org's documents (RLS) □ S3 download URLs expire after 1 hour □ File type validation prevents non-document uploads

PERFORMANCE: □ Upload → OCR → Analysis completes in < 30 seconds □ Polling does not hammer the API (2 second interval) □ Mobile: upload works on iOS Safari and Android Chrome

TESTS: □ pnpm test — all passing □ pnpm tsc --noEmit — zero TypeScript errors □ pnpm lint — zero lint errors

SPRINT 3 MILESTONE: "Document Analyser Live" ✅

───────────────────────────────────────────────────── Update CLAUDE.md Section 17 (Current Sprint) to Sprint 4 before your next session. ─────────────────────────────────────────────────────

╔═══════════════════════════════════════════════════════╗ ║  SPRINT 2 & 3 — EXTERNAL SERVICES SUMMARY            ║ ║  (Everything requiring accounts or keys)             ║ ╚═══════════════════════════════════════════════════════╝

Service              Purpose              Sign up at ─────────────────────────────────────────────────────── Anthropic Console    Claude API           console.anthropic.com Voyage AI            Embeddings           voyageai.com AWS S3               Document storage     console.aws.amazon.com AWS Textract         OCR                  (same AWS account) Resend               Transactional email  resend.com

ALL FIVE SERVICES must be set up before Sprint 2 Phase B can begin. S2-A1 covers the setup steps.

─────────────────────────────────────────────────────── Klarify — Sprint 2 & 3 Task Breakdown v1.0 Prepared by Chimezie Chuta | Blockspace Technologies May 2026 | klarify.africa ───────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════
KLARIFY — SPRINT 4 & SPRINT 5
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

SPRINT PREREQUISITES — confirm before starting Sprint 4:
  ✅ Sprint 2 complete: AI Q&A engine live, RAG pipeline working
  ✅ Sprint 3 complete: Document analyser live, S3 uploads working
  ✅ All tests passing: pnpm test
  ✅ Zero TypeScript errors: pnpm tsc --noEmit
  ✅ CLAUDE.md updated to Sprint 4 in Section 17


╔═══════════════════════════════════════════════════════════╗
║  SPRINT 4 — WEEKS 9–10                                    ║
║  GOAL: COMPLIANCEOS v1 LIVE                               ║
║                                                           ║
║  Delivers: US-007 (Smart Compliance Roadmap),             ║
║            US-008 (Document Generator — 9 templates),    ║
║            US-006 enhancements (live score updates,       ║
║            history chart, PDF export)                     ║
╚═══════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 4 — PHASE A: SMART COMPLIANCE ROADMAP (US-007)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S4-A1 🤖 CLAUDE CODE — Roadmap Data Layer & Seed Tasks
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Sections 5 (schema), 8 (readiness score),
and 15 (coding standards) before starting.
Read PRD v1.1 Section 3.2 US-007 fully — especially the
Phase 3 task library with all 11 ARIP tasks.
Use Sonnet 4.5 for this implementation task.

Build the roadmap data layer and seed task library.

1. DATABASE MIGRATION
   Create: prisma/migrations/add_roadmap_seed_tasks.sql

   New table:
   roadmap_task_templates (
     id TEXT PRIMARY KEY,           -- e.g. 'P1-01', 'P3-01'
     phase INT NOT NULL,            -- 1, 2, 3, or 4
     title TEXT NOT NULL,
     description TEXT NOT NULL,
     regulatory_basis TEXT,
     effort_days_min INT,
     effort_days_max INT,
     template_id TEXT,              -- links to document template
     is_blocker BOOLEAN DEFAULT false,
     depends_on TEXT[],             -- array of task IDs
     product_types TEXT[],          -- ['ALL'] or specific types
     created_at TIMESTAMPTZ DEFAULT NOW()
   )

   Run: pnpm prisma migrate dev

2. SEED FILE
   Create: packages/core/src/roadmap/seedTasks.ts

   Seed ALL four phases of tasks.

   PHASE 1 — Foundation (Corporate Structure):
   P1-01: Register with the Corporate Affairs Commission (CAC)
     Basis: CAMA 2020
     Effort: 5–14 days
     Blocker: true (nothing else proceeds without CAC)

   P1-02: Establish correct share structure and beneficial ownership register
     Basis: CAMA 2020, Section 119
     Effort: 3–7 days
     Depends on: P1-01

   P1-03: Confirm Nigerian CEO/MD is resident in Nigeria
     Basis: ARIP Framework Section 6(i), June 2024
     Effort: 1 day

   P1-04: Open a corporate bank account with a deposit money bank
     Basis: CBN VASP Guidelines 2023
     Effort: 7–21 days
     Depends on: P1-01

   P1-05: Obtain Tax Identification Number (TIN) from FIRS
     Basis: NTAA 2025
     Effort: 3–7 days
     Depends on: P1-01

   P1-06: Appoint a Compliance Officer
     Basis: MLPPA 2022, Section 12
     Effort: 7–30 days
     Blocker: true (required for Phase 2)

   P1-07: Classify your product (use Klarify Product Classifier)
     Basis: ISA 2025, SEC Digital Asset Rules 2024
     Effort: 1 day
     template_id: null (use AI classification feature)

   PHASE 2 — Compliance Infrastructure:
   P2-01: Register on NFIU goAML portal
     Basis: MLPPA 2022, Section 9; NFIU AML/CFT Framework
     URL: https://goaml.nfiu.gov.ng
     Effort: 3–7 days

   P2-02: Document your Business-Wide Risk Assessment (BWRA)
     Basis: NFIU AML/CFT Compliance Framework for VASPs (Dec 2024)
     Effort: 7–14 days
     template_id: 'BWRA'
     Depends on: P2-01

   P2-03: Draft your AML/CFT Policy Manual
     Basis: MLPPA 2022
     Effort: 7–14 days
     template_id: 'AML_POLICY'
     Depends on: P2-02

   P2-04: Implement KYC Tiering Framework (NIN/BVN verification)
     Basis: NFIU Guidelines, CBN KYC Regulations
     Effort: 14–30 days
     template_id: 'KYC_TIERS'

   P2-05: Configure transaction monitoring system
     Basis: MLPPA 2022, Section 11; NFIU AML/CFT Framework
     Effort: 14–30 days

   P2-06: Test STR and CTR filing workflow on goAML
     Basis: MLPPA 2022, Sections 6–8
     Effort: 3–7 days
     Depends on: P2-01, P2-05

   P2-07: Maintain PEP register and conduct initial screening
     Basis: MLPPA 2022, Section 14
     Effort: 3–7 days
     template_id: 'PEP_REGISTER'

   P2-08: Deliver initial AML/CFT team training
     Basis: NFIU AML/CFT Compliance Framework
     Effort: 1–3 days
     Depends on: P2-03

   PHASE 3 — ARIP Application:
   (All 11 tasks from PRD v1.1 Section 3.2 US-007
    Phase 3 Task Library — use exact text from PRD:
    P3-01 through P3-11 as specified. All product_types: ['ALL'])

   PHASE 4 — AIP Period Operations:
   P4-01: Record customer baseline count on AIP receipt date
     Basis: Section 29d, ARIP Framework June 2024
     Blocker: true
     Description: Record EXACT customer count on day AIP received.
     This is the baseline for the 10% growth cap. Cannot be
     reconstructed later.

   P4-02: Brief all team members on AIP restrictions
     Basis: Section 29, ARIP Framework June 2024
     Description: Marketing, sales, customer success must know the
     promotional ban applies to ALL communications.

   P4-03: Set up weekly trading statistics report to SEC
     Basis: Section 21a, ARIP Framework June 2024
     Recurrence: weekly

   P4-04: Set up monthly trading statistics report to SEC
     Basis: Section 21a, ARIP Framework June 2024
     Recurrence: monthly

   P4-05: File quarterly financial and compliance reports to SEC
     Basis: Section 21b, ARIP Framework June 2024
     Recurrence: quarterly

   P4-06: Annual BWRA review and update
     Basis: NFIU AML/CFT Compliance Framework
     Recurrence: annual

3. ROADMAP GENERATOR
   Create: packages/core/src/roadmap/generateRoadmap.ts

   generateRoadmap(userProfile: UserProfile): RoadmapTask[]

   Logic:
   a. Load all task templates from DB
   b. Filter by product_types matching user's product_types
      (if template product_types includes 'ALL', always include)
   c. For each template, create a roadmap_tasks record for the
      org with:
      - status: 'not_started'
      - is_locked: true if phase > 1 (phases unlock as previous
        phase reaches 100% completion)
      - P3-01 additionally locked until
        registered_solicitor_engaged indicator is true
   d. Return sorted array grouped by phase

4. PHASE UNLOCK SERVICE
   Create: packages/core/src/roadmap/phaseUnlock.ts

   checkAndUnlockPhases(orgId: string): Promise<void>

   Logic:
   - Count completed tasks in Phase 1
   - If all Phase 1 tasks complete: unlock Phase 2 tasks
   - If all Phase 2 tasks complete: unlock Phase 3 tasks
   - Phase 4 unlocks when arip_applications.stage = 'aip_active'
   - Call this function after every task status update

5. API ENDPOINTS
   Create: apps/api/src/routes/compliance/roadmap.ts

   GET  /api/compliance/roadmap
        Returns all tasks grouped by phase with lock status
        Include progress: { total, complete, pct } per phase

   POST /api/compliance/roadmap/task
        Create custom task (user-defined, any phase)

   PUT  /api/compliance/roadmap/task/:id
        Update task: status, owner_user_id, due_date, notes
        After update: call checkAndUnlockPhases()
        After update: call recalculateReadinessScore()

   DELETE /api/compliance/roadmap/task/:id
        Only custom tasks can be deleted (seed tasks cannot)

6. TESTS
   Create: packages/core/src/__tests__/roadmap/

   - generateRoadmap() returns tasks for all 4 phases
   - Phase 1 tasks are unlocked, Phase 2-4 locked on generation
   - DAX product gets DAX-specific tasks
   - Completing all Phase 1 tasks unlocks Phase 2
   - P3-01 remains blocked until solicitor_engaged = true
   - Phase 4 tasks lock until AIP received
   - Readiness score recalculates after task completion
   - Custom tasks can be created and deleted
   - Seed tasks cannot be deleted (returns 403)

   pnpm add -D @faker-js/faker (for test data generation)
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S4-A2 🤖 CLAUDE CODE — Roadmap Kanban UI (Web)
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 7 (brand tokens) and PRD v1.1
Section 5.3 (visual design language) before starting.
Use Sonnet 4.5.

Build the Smart Compliance Roadmap Kanban interface.

1. PAGE
   Create: apps/web/src/app/(dashboard)/roadmap/page.tsx

2. PHASE HEADER STRIP (top of page, horizontal)
   Four phase cards in a horizontal row:
   - Phase 1: Foundation (Corporate Structure & Capital)
   - Phase 2: Compliance Infrastructure
   - Phase 3: ARIP Application
   - Phase 4: AIP Period Operations

   Each phase card shows:
   - Phase name and subtitle
   - Progress bar: X/Y tasks complete
   - Completion percentage
   - Lock icon (🔒) if phase is locked
   - Color: teal for active/complete, grey for locked
   - Clicking a locked phase shows: \"Complete Phase N first\"

3. TASK BOARD (below phase header)
   Show tasks for the currently selected phase.
   Default: show lowest incomplete phase.

   TASK CARD COMPONENT: RoadmapTaskCard
   File: packages/ui/src/components/RoadmapTaskCard.tsx

   Card contains:
   - Checkbox (left): clicking marks task complete/incomplete
     Checked state: teal background, strikethrough title
   - Task title (bold)
   - Regulatory basis (small italic, JetBrains Mono font,
     klarifyTeal colour)
   - Estimated effort: \"Est. 3–7 days\"
   - Owner avatar + name (if assigned)
   - Due date (red if overdue, amber if due within 7 days)
   - \"Updates score\" badge (klarifyTeal pill) if task affects
     the readiness score
   - \"BLOCKER\" badge (red pill) for is_blocker tasks
   - \"Locked\" overlay with lock icon if is_locked = true
   - Expand arrow → opens task detail drawer

   TASK DETAIL DRAWER (slides in from right):
   - Full description
   - Regulatory basis with citation
   - Depends on (linked task IDs)
   - Owner assignment dropdown (team members)
   - Due date picker
   - Notes textarea (auto-saved)
   - \"Generate document\" button (if template_id exists)
     → routes to /compliance/documents/generate/:templateId
   - \"Ask Klarify about this task\" button
     → opens chat with task context pre-loaded

4. PHASE LOCKING UI
   Locked phase overlay:
   - Semi-transparent grey overlay on all locked task cards
   - Lock icon + message: \"Complete Phase [N] to unlock these tasks\"
   - Progress of blocking phase shown: \"Phase 2 is 60% complete\"

   P3-01 special blocker:
   - Even if Phase 2 is 100% complete, P3-01 card shows:
     amber banner: \"SOLICITOR REQUIRED BEFORE PROCEEDING —
     Application MUST be filed through a registered solicitor
     or adviser (Section 16, ARIP Framework). Cannot self-file.\"
   - Task cannot be marked complete without solicitor fields filled

5. HEADER ACTIONS
   - \"Add custom task\" button (opens inline form):
     Fields: title, description, phase, due date, owner
   - \"Filter by owner\" dropdown
   - \"Hide completed\" toggle
   - Phase selector tabs on mobile

6. ROADMAP PROGRESS SUMMARY (collapsible, top of page):
   Overall completion bar: \"X of Y total tasks complete (Z%)\"
   \"Estimated time to ARIP-ready: ~N weeks\" (calculated from
   incomplete task effort estimates)

7. MOBILE BEHAVIOUR
   - Phase headers become horizontal scrollable pills on mobile
   - Tasks stack vertically (no side-by-side columns)
   - Task detail opens as full-screen bottom sheet on mobile
   - Drag-to-reorder disabled on mobile (tap to expand only)

8. TESTS
   Create: apps/web/src/__tests__/roadmap/

   - Phase 1 cards render without lock overlay
   - Phase 2 cards render with lock overlay when P1 incomplete
   - Completing a task calls PUT /api/compliance/roadmap/task/:id
   - Locked task checkbox is disabled
   - BLOCKER badge renders on P3-01
   - \"Add custom task\" form submits and refreshes board
   - Due date shows red when overdue
   - \"Generate document\" button only visible when template_id set
   - Mobile: phase selector renders as pill tabs
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S4-A3 🔍 VERIFY — Roadmap End-to-End Test
──────────────────────────────────────────────────────────

Before building the document generator, manually verify:

1. Log in, go to /roadmap
2. Confirm Phase 1 tasks are visible and unlocked
3. Confirm Phase 2 tasks are locked (lock overlay visible)
4. Check off all Phase 1 tasks one by one
5. Verify: Phase 2 tasks unlock automatically
6. Verify: Readiness Score updates after each completion
7. Click a task with a template_id → \"Generate document\"
   button should appear in detail drawer
8. On mobile (or 360px viewport): phases render as pills,
   tasks stack vertically

□ Phase 1 unlocked on fresh account
□ Phase 2 locked until Phase 1 complete
□ Score updates in real time on task completion
□ P3-01 BLOCKER badge visible
□ Custom task can be added and deleted
□ Mobile layout correct at 360px


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 4 — PHASE B: DOCUMENT GENERATOR (US-008, 9 TEMPLATES)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S4-B1 🤖 CLAUDE CODE — Document Generation Engine
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 14 (document templates table)
and PRD v1.1 Section 3.2 US-008 (both the original 9
templates and the Sprint 4 delivery scope).
Use Opus 4 for the AI prompt design in step 3.
Use Sonnet 4.5 for all implementation.

Build the document generation engine for all 9 Sprint 4
templates. (4 ARIP templates are Sprint 5 — do not build
them yet.)

SPRINT 4 TEMPLATES (9 total):
  BWRA            Business-Wide Risk Assessment
  AML_POLICY      AML/CFT Policy Manual
  KYC_TIERS       KYC Tiering Framework
  TOKEN_MEMO      Token Classification Legal Memo
  ARIP_WHITEPAPER ARIP White Paper Outline
  STR_TEMPLATE    STR Filing Template
  PEP_REGISTER    PEP Register Template
  CO_APPOINTMENT  Compliance Officer Appointment Letter
  REG_BRIEF       Regulator Engagement Brief

1. CREATE PROMPT FILES
   Directory: packages/ai/prompts/documents/
   Create one file per template: BWRA.ts, AML_POLICY.ts,
   KYC_TIERS.ts, TOKEN_MEMO.ts, ARIP_WHITEPAPER.ts,
   STR_TEMPLATE.ts, PEP_REGISTER.ts, CO_APPOINTMENT.ts,
   REG_BRIEF.ts

   Each prompt file exports:
   {
     templateId: string,
     documentName: string,
     regulatoryBasis: string,
     requiredFields: DocumentField[],
     systemPrompt: string,
     outputInstructions: string,
   }

   DOCUMENT FIELD INTERFACE:
   {
     key: string,
     label: string,
     type: 'text' | 'textarea' | 'select' | 'date' | 'boolean',
     required: boolean,
     helpText: string,
     options?: string[], // for select type
     prefilledFrom?: string, // org profile field to pre-fill from
   }

   BWRA required fields (example):
   - company_name (prefilledFrom: org.name)
   - product_types (prefilledFrom: org.product_types)
   - target_markets (prefilledFrom: org.target_markets)
   - business_description (textarea)
   - key_risk_areas (select multiple: exchange, custody,
     payments, lending, token_issuance, other)
   - customer_base_size (select: 0-100, 101-1000, 1001-10000, 10000+)
   - existing_controls (textarea)
   - compliance_officer_name (prefilledFrom: org.co_name)
   - assessment_date (date, default: today)

   Build similar field definitions for all 9 templates.
   Every field with prefilledFrom MUST auto-populate from
   the user's org profile — never ask for information
   Klarify already has.

2. DOCUMENT GENERATION SERVICE
   Create: apps/api/src/services/documentGeneration.ts

   generateDocument(templateId, orgId, userId, formData):

   a. Load template prompt file
   b. Load org profile (for pre-filled fields)
   c. Build Claude prompt:
      - System: \"You are generating a professional Nigerian
        regulatory compliance document. Output must be
        complete, professionally structured, and ready for
        legal review before use.\"
      - Include all regulatory basis context from corpus RAG
        (retrieve relevant chunks for the template type)
      - User: formData + template-specific instructions
   d. Call Claude (ANTHROPIC_MODEL_ADVISORY):
      - Temperature: 0.2 (structured documents, low creativity)
      - Max tokens: 4000
   e. Parse response into structured JSON:
      { sections: [{ title, content, regulatoryBasis }] }
   f. Generate Word (.docx) using docx npm package
      - Company letterhead (company name + address from org)
      - Document title + date
      - Regulatory basis footer on every page
      - Disclaimer footer: \"This document was generated with
        AI assistance. Review and customise before use. This
        is not legal advice.\"
      - Version number: \"v1.0 — Generated [date]\"
   g. Generate PDF (html-pdf-node or puppeteer)
   h. Upload both files to S3:
      Path: {orgId}/{userId}/documents/{uuid}/
      Files: {templateId}_v1.docx + {templateId}_v1.pdf
   i. Save to generated_documents table:
      { org_id, user_id, template_type, title,
        content (full JSON), s3_key, version: 1 }
   j. Return: { documentId, downloadUrls: { docx, pdf } }

3. VERSION HISTORY SERVICE
   Create: apps/api/src/services/documentVersions.ts

   When user regenerates a document:
   - Increment version number
   - Keep ALL previous versions in S3 and database
   - Mark new version as current
   - Return full version history

4. API ENDPOINTS
   Create: apps/api/src/routes/documents/generate.ts

   POST /api/documents/generate
   Body: { templateId, formData }
   - Authenticate + check plan limits (Navigator: 3 templates)
   - Call generateDocument service
   - Return { documentId, downloadUrls }

   GET /api/documents
   - Returns list of all generated documents for org
   - Include: templateType, title, version, createdAt,
     downloadUrls, regulatoryBasis

   GET /api/documents/:id
   - Returns single document with full version history

   GET /api/documents/:id/versions
   - Returns all versions with download URLs

   DELETE /api/documents/:id
   - Soft delete (marks as deleted, keeps in S3)

5. INSTALL REQUIRED PACKAGES
   cd apps/api
   pnpm add docx html-pdf-node
   pnpm add -D @types/html-pdf-node

6. TESTS
   Create: apps/api/src/__tests__/documents/generate.test.ts

   - BWRA generation with minimal valid form data
   - AML_POLICY generation pre-fills company name from org
   - Generated .docx is a valid ZIP (passes zipfile check)
   - Generated document contains regulatory basis citation
   - Generated document contains disclaimer footer
   - Version increments correctly on regeneration
   - Navigator plan blocked after 3 documents (402 response)
   - Download URL expires after 1 hour
   - S3 key contains orgId (no cross-org exposure)
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S4-B2 🤖 CLAUDE CODE — Document Generator UI (Web)
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 7 (brand tokens).
Use Sonnet 4.5.

Build the Document Generator UI.

1. DOCUMENT LIBRARY PAGE
   Create: apps/web/src/app/(dashboard)/compliance/documents/page.tsx

   LAYOUT:
   - Left sidebar: template categories
     All Templates | AML/CFT | KYC | Licensing | ARIP | Other
   - Main area: template cards grid

   TEMPLATE CARD (for each of 9 templates):
   Component: DocumentTemplateCard
   - Template icon (document icon with colour by category)
   - Template name (bold)
   - Regulatory basis (small, teal, monospace)
   - \"Generate\" button (teal)
   - \"View generated\" badge (gold) if doc already generated
   - Plan gate: navigator users see lock on templates 4-9
     with \"Upgrade to Compass\" tooltip

2. GENERATED DOCUMENTS LIST
   Below template grid, show previously generated documents:
   - Columns: Document name | Version | Generated | Actions
   - Actions: Download .docx | Download PDF | Regenerate |
              View history
   - Empty state: \"No documents generated yet. Choose a
     template above to get started.\"

3. DOCUMENT FORM PAGE
   Create: apps/web/src/app/(dashboard)/compliance/documents/
           generate/[templateId]/page.tsx

   Layout: Two-column
   Left (40%): Form fields
   Right (60%): Live preview area (see step 4)

   FORM BEHAVIOUR:
   - Load form field definitions from template
   - Pre-fill fields where prefilledFrom is set
   - Show help text below each field (collapsible)
   - Group fields into logical sections with headers
   - Required field validation before submission
   - \"Generate Document\" button (disabled until all required
     fields filled)
   - Loading state: \"Generating your [document name]...
     This takes about 15–20 seconds.\"

4. DOCUMENT PREVIEW
   After generation, right column shows:
   - Rendered document preview (iframe or formatted HTML)
   - Download buttons: \"Download .docx\" | \"Download PDF\"
   - \"Regenerate\" button (with warning: \"This will create
     a new version. Previous version is saved.\")
   - \"Ask Klarify about this document\" → chat with context

5. VERSION HISTORY MODAL
   On clicking \"View history\":
   - Modal showing version table: Version | Date | Actions
   - Each version has: Download .docx | Download PDF
   - Current version highlighted

6. INTEGRATION WITH ROADMAP
   When user clicks \"Generate document\" from a roadmap
   task card:
   - Route to /compliance/documents/generate/:templateId
   - After generation, offer \"Mark roadmap task as complete\"

7. PLAN GATE UI
   For locked templates on Navigator plan:
   - Template card has gold lock overlay
   - \"Available on Compass plan\" text
   - \"Upgrade\" button links to /billing/upgrade

8. TESTS
   - Template grid renders all 9 templates
   - Pre-filled fields show org data correctly
   - Required field validation blocks submission
   - Download buttons call correct S3 URLs
   - Version history modal shows all versions
   - Navigator plan sees lock on templates 4-9
   - Loading state shown during generation (15-20s)
   - Roadmap integration: \"Mark task complete\" appears
     after generation
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S4-B3 🖐  MANUAL — Test All 9 Document Templates
──────────────────────────────────────────────────────────

Generate a test document for each of the 9 templates
using test data. Verify each output manually:

For each generated document check:
□ Company name is pre-filled correctly from org profile
□ Document structure matches regulatory requirements
□ Regulatory basis citation appears in footer
□ Disclaimer appears in footer
□ Word (.docx) file opens in Microsoft Word/Google Docs
□ PDF renders correctly
□ No placeholder text left unfilled (e.g. [INSERT X HERE])
□ Version shows \"v1.0 — Generated [today's date]\"

Priority order for testing:
1. BWRA (most complex — test first)
2. AML_POLICY
3. KYC_TIERS
4. CO_APPOINTMENT
5. STR_TEMPLATE
6. PEP_REGISTER
7. TOKEN_MEMO
8. ARIP_WHITEPAPER
9. REG_BRIEF

Log any structural issues as GitHub issues before
proceeding to Sprint 4 Phase C.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 4 — PHASE C: READINESS SCORE ENHANCEMENTS (US-006)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S4-C1 🤖 CLAUDE CODE — Live Score + History + Export
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 8 (readiness score calculation)
and PRD v1.1 Section 3.2 US-006 acceptance criteria.
Use Sonnet 4.5.

Enhance the Readiness Score dashboard with live updates,
history chart, and PDF export.

1. REAL-TIME SCORE RECALCULATION
   Create: apps/api/src/services/scoreRecalculation.ts

   recalculateAndSave(orgId: string): Promise<ReadinessScore>

   Triggers (call this function after each of these):
   - Roadmap task marked complete/incomplete
   - Document uploaded and analysed
   - Compliance indicator updated manually
   - ARIP stage changes

   Process:
   a. Load all compliance indicators for org from DB
   b. Calculate each dimension score (0-100) based on
      indicator completion % for that dimension
   c. Apply dimension weights from CLAUDE.md Section 8:
      corporate_structure: 0.10
      capital_licensing: 0.20
      kyc_infrastructure: 0.15
      aml_cft_programme: 0.20
      transaction_monitoring: 0.10
      regulatory_reporting: 0.10
      regulatory_relationships: 0.10
      product_classification: 0.05
   d. Calculate weighted total (0-100, rounded)
   e. Save snapshot to readiness_scores table with
      calculated_at timestamp
   f. Return new score

   IMPORTANT: The score calculation logic in
   packages/core/src/compliance/readinessScore.ts
   (from CLAUDE.md Section 8) is the canonical source.
   Do not create a separate calculation — call that function.

2. SCORE HISTORY API
   Update: apps/api/src/routes/compliance/score.ts

   GET /api/compliance/score/history
   Query params: ?days=30 (default), ?days=60, ?days=90
   Returns: Array<{ date, total_score, dimension_scores }>
   Used to power the history line chart on dashboard.

3. SCORE HISTORY CHART COMPONENT
   Create: packages/ui/src/components/ScoreHistoryChart.tsx

   Using Recharts (already in CLAUDE.md tech stack):
   - Line chart showing score over time (last 30 days default)
   - X axis: dates, Y axis: 0-100
   - Line colour: getScoreColor(latestScore) from color tokens
   - Area fill below the line (semi-transparent)
   - Tooltip: \"Score: X on [date]\"
   - Time period selector: 30 days | 60 days | 90 days
   - Empty state: \"Track your score for 7+ days to see
     your compliance trajectory\"

4. DIMENSION BREAKDOWN COMPONENT
   Create: packages/ui/src/components/DimensionBreakdown.tsx

   Shows all 8 dimensions in an expandable list:
   Each dimension row:
   - Dimension name
   - Sub-score progress bar (colour coded by score)
   - Sub-score number (e.g. \"60/100\")
   - Weight label (e.g. \"20% of total\")
   - Expand arrow → shows individual indicators for that
     dimension as checkboxes

   Clicking an unchecked indicator:
   - Opens a drawer: \"What is this?\" (plain English explanation)
   - \"How to complete this\" guidance
   - Link to relevant roadmap task (if exists)
   - \"Mark as complete\" button (calls PUT /api/compliance/indicators)

5. COMPLIANCE REPORT PDF EXPORT
   Create: apps/api/src/routes/compliance/export.ts

   GET /api/compliance/score/export?format=pdf

   Generates a PDF compliance status report containing:
   - Company name + logo area
   - Report date
   - Overall Readiness Score (large, colour-coded)
   - Score interpretation: \"Good Standing\"
   - 8-dimension breakdown table with scores
   - Score trajectory chart (last 30 days)
   - Outstanding action items (top 5 by priority)
   - Next regulatory deadline
   - Disclaimer: \"This report is a self-assessment tool.
     It does not constitute a regulatory opinion or guarantee
     of compliance.\"
   - Footer: \"Generated by Klarify Africa — klarify.africa\"

   Plan gate: Compass+ only. Navigator sees \"Upgrade\" prompt.
   File expires after 1 hour (signed S3 URL).

6. DASHBOARD UPDATE
   Update: apps/web/src/app/(dashboard)/page.tsx

   Add to dashboard below the Readiness Score gauge:
   - ScoreHistoryChart component (collapsed by default,
     \"View score history\" expander)
   - DimensionBreakdown component (replacing any static
     dimension display from Sprint 1)
   - \"Export compliance report\" button (Compass+ only,
     calls GET /api/compliance/score/export)

7. TESTS
   - Score recalculates when task is marked complete
   - Score history returns correct number of data points
   - ScoreHistoryChart renders with Recharts
   - DimensionBreakdown shows correct weights
   - Clicking indicator opens explanation drawer
   - PDF export returns valid PDF (check Content-Type header)
   - PDF export blocked for Navigator plan (402 response)
   - Score never exceeds 100 or goes below 0
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S4-C2 🔍 VERIFY — Sprint 4 Complete Checkpoint
──────────────────────────────────────────────────────────

Run full Sprint 4 verification before closing sprint:

ROADMAP:
□ All 4 phases render with correct tasks
□ Phase locking works correctly (Phase 2 locked until P1 done)
□ P3-01 shows BLOCKER badge and solicitor warning
□ Completing a task updates score in real time
□ Custom tasks can be created and deleted
□ Seed tasks cannot be deleted (403 returned)
□ Phase progress percentage is accurate
□ Roadmap→document generator link works

DOCUMENT GENERATOR:
□ All 9 templates accessible from document library
□ Pre-fill works: company name from org profile
□ All required fields validated before submission
□ Generated .docx opens correctly in Word
□ Generated PDF renders correctly
□ Regulatory basis appears in document footer
□ Disclaimer appears in document footer
□ Version history saves correctly
□ Navigator plan limited to 3 templates
□ Compass+ gets all 9 templates

READINESS SCORE:
□ Score updates in real time on task completion
□ Score history chart renders with data
□ All 8 dimensions show with correct weights
□ Dimension indicators can be toggled
□ PDF export works for Compass+ users
□ PDF export blocked for Navigator (402)

SECURITY:
□ Generated documents not accessible across orgs (RLS)
□ S3 URLs expire after 1 hour

PERFORMANCE:
□ Document generation under 20 seconds
□ Roadmap page loads under 2 seconds
□ Score recalculation under 500ms

TESTS:
□ pnpm test — all passing
□ pnpm tsc --noEmit — zero TypeScript errors
□ pnpm lint — zero lint errors

SPRINT 4 MILESTONE: \"ComplianceOS v1 Live\" ✅

Update CLAUDE.md Section 17 to Sprint 5 before
starting Sprint 5 tasks.


╔═══════════════════════════════════════════════════════════╗
║  SPRINT 5 — WEEKS 11–12                                   ║
║  GOAL: BILLING + NOTIFICATIONS LIVE                       ║
║                                                           ║
║  Delivers: Subscription billing (Korapay),                ║
║            Feature tier-gating, ARIP tracker (US-009),   ║
║            Regulator CRM (US-010),                        ║
║            Email notifications,                           ║
║            4 ARIP document templates (US-008 completion)  ║
╚═══════════════════════════════════════════════════════════╝


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 5 — PHASE A: SUBSCRIPTION BILLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S5-A1 ✅ DONE — Payment & Email Providers Active
──────────────────────────────────────────────────────────

Both providers are live and verified. No manual setup needed.

1. KORAPAY ✅ — existing Blockspace Technologies Ltd account
   Account: ID KPY36411 (Live Mode active — see screenshot)
   Public Key: pk_live_jF7p... (in Korapay dashboard)
   Secret Key: sk_live_qxBd... (in Korapay dashboard)
   Encryption Key: ZLTeX883aCmF... (in Korapay dashboard)
   Docs: https://developers.korapay.com/docs/checkout-standard

   ACTION REQUIRED — add to .env.local and Fly secrets:
     KORAPAY_PUBLIC_KEY=pk_live_...
     KORAPAY_SECRET_KEY=sk_live_...
     KORAPAY_ENCRYPTION_KEY=ZLTeX883aCmF...
     NEXT_PUBLIC_KORAPAY_PUBLIC_KEY=pk_live_...

   Set webhook URL in Korapay dashboard to:
     https://api.klarify.africa/api/billing/webhook/korapay
   Event to enable: charge.success

2. RESEND ✅ — domain verified and working
   Domain: klarify.africa (DNS verified)
   FROM address: noreply@klarify.africa
   RESEND_API_KEY: already in .env.local + Fly secrets


──────────────────────────────────────────────────────────
TASK S5-A2 🤖 CLAUDE CODE — Billing Backend
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 10 (PLAN_LIMITS and PLAN_PRICING)
and PRD v1.1 Section 6 (pricing table) before starting.
Use Sonnet 4.5 for this implementation.
Do NOT hardcode prices — read from PLAN_PRICING in
packages/core/src/types/subscription.ts.

PAYMENT GATEWAY: Korapay (existing Blockspace account)
Docs: https://developers.korapay.com/docs/checkout-standard
Korapay uses a client-side JS modal (Korapay.initialize)
for checkout. The backend creates a reference, the front
end opens the modal; on success the webhook fires.

1. BILLING SERVICE
   Create: apps/api/src/services/billing.ts

   createCheckoutRef(orgId, plan, billingCycle):
   - Generate a unique reference: `KLR-{orgId}-{uuid}`
   - Calculate amount from PLAN_PRICING[plan][billingCycle]
     in NGN (multiply USD price by ~1600 NGN/USD rate, or
     accept NGN prices directly — store in core config)
   - Save pending subscription record:
     { org_id, plan, billing_cycle, korapay_transaction_ref,
       status: 'pending', created_at }
   - Return: { reference, amount, currency: 'NGN' }
   (Front end calls Korapay.initialize with this reference)

   activateSubscription(korapayRef):
   - Called by webhook handler on charge.success
   - Find subscription by korapay_transaction_ref
   - Set status = 'active'
   - Calculate current_period_end (30 days or 365 days)
   - Update org plan in organisations table
   - Trigger feature-gate cache refresh

   cancelSubscription(orgId):
   - Update subscriptions.status = 'cancelled'
   - Access continues until current_period_end
   (Korapay does not have recurring billing API — renewals
    are handled by sending reminder emails and re-initialising
    a new checkout. See NOTE below.)

   getSubscriptionStatus(orgId):
   - Returns: { plan, status, current_period_end, seats_used }

   NOTE ON RECURRING BILLING:
   Korapay Checkout Standard is a one-time charge gateway.
   For subscription renewals, Klarify will:
   a. 7 days before period_end: email user with renewal link
   b. On period_end: downgrade to free plan automatically
   c. User clicks renewal link → new Korapay checkout
   d. On charge.success webhook → reactivate subscription
   This is the simplest model for V1. Upgrade to Korapay
   recurring API or a subscription management layer in V2.

2. WEBHOOK HANDLER
   Create: apps/api/src/routes/billing/webhooks.ts

   POST /api/billing/webhook/korapay
   Event to handle: charge.success

   WEBHOOK SECURITY (CRITICAL):
   Verify HMAC-SHA256 signature:
   - Korapay sends hash in request header: `x-korapay-signature`
   - Compute: HMAC-SHA256(requestBody, KORAPAY_ENCRYPTION_KEY)
   - Compare with timing-safe equality
   - Reject with 401 if mismatch

   On charge.success:
   - Parse: { reference, amount, status, payment_reference }
   - Call activateSubscription(payment_reference)
   - Return 200 immediately (idempotent — safe to call twice)

   On any other event: return 200 (ignore gracefully)

3. BILLING API ROUTES
   Create: apps/api/src/routes/billing/index.ts

   POST /api/billing/subscribe
   Body: { plan, billingCycle }
   Returns: { reference, amount, currency }
   (Front end passes this to Korapay.initialize)

   POST /api/billing/cancel
   Cancels current subscription (access until period end)

   GET /api/billing/status
   Returns current subscription state for the org

   POST /api/billing/upgrade
   Body: { newPlan }
   Creates new checkout ref for the upgraded plan
   Returns: { reference, amount, currency }
   (Front end opens new Korapay modal for difference)

4. FEATURE GATE MIDDLEWARE
   Create: apps/api/src/middleware/featureGate.ts

   requireFeature(feature: keyof PlanLimits):
   - Check user's current plan from subscriptions table
   - Check PLAN_LIMITS[plan][feature]
   - If false or over limit: return 402 with:
     { error: 'Plan upgrade required',
       code: 'PLAN_LIMIT_REACHED',
       requiredPlan: 'compass',
       upgradeUrl: '/billing/upgrade' }

   Apply to these endpoints:
   - POST /api/ai/scenario → requireFeature('scenario_simulator')
   - POST /api/ai/jurisdiction-gap → no gate (all plans)
   - GET /api/arip → requireFeature('arip_tracker')
   - GET /api/regulators/interactions → requireFeature('regulator_crm')
   - GET /api/compliance/score/export → Compass+ only
   - Document templates 4-9 → Navigator gets 3 only

5. FREE TIER
   Users who register without subscribing get:
   - Plan: 'free' (set on registration)
   - 10 AI queries/month
   - Readiness Score (view only)
   - Smart Roadmap (Phase 1 only — view only)
   - Nigeria only
   No credit card required for free tier.

6. TESTS
   - createCheckoutRef() creates pending record in DB
   - Webhook activates subscription on charge.success
   - Webhook rejects invalid HMAC signature with 401
   - Duplicate webhook calls are idempotent (no double-activate)
   - featureGate blocks scenario simulator for free plan
   - featureGate allows scenario simulator for compass plan
   - Cancel sets status='cancelled' not deleted
   - Free tier user gets 402 on AI query #11

   Install: pnpm add crypto (built-in Node — no extra install)
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S5-A3 🤖 CLAUDE CODE — Billing UI
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read PRD v1.1 Section 6 (pricing table) before starting.
Use Sonnet 4.5.

Build the billing and upgrade UI.

1. PRICING PAGE (public — no auth required)
   Create: apps/web/src/app/(marketing)/pricing/page.tsx

   Three-column pricing table (Navigator | Compass | Flagship)
   matching PRD v1.1 Section 6 table exactly.
   Monthly/Annual toggle at top (annual shows 20% savings).
   \"Compass\" column highlighted as \"Most Popular\".
   CTA buttons:
   - Free tier: \"Get started free\" → /register
   - Navigator: \"Start Navigator\" → /billing/subscribe?plan=navigator
   - Compass: \"Start free trial\" → /billing/subscribe?plan=compass
   - Flagship: \"Contact us\" → mailto:hello@klarify.africa

   Below table:
   - \"ARIP Application Package — $499 one-time\"
     Description: Full ARIP document set + 30-day AI support
   - FAQ section (5 common questions)

2. SUBSCRIPTION PAGE (authenticated)
   Create: apps/web/src/app/(dashboard)/billing/page.tsx

   Sections:
   a. CURRENT PLAN
      - Plan name badge (colour coded)
      - Status: Active / Cancelled / Past Due
      - Billing cycle: Monthly / Annual
      - Next renewal: [date]
      - Seats: used/total
      - \"Cancel subscription\" button (shows confirmation modal)

   b. UPGRADE / CHANGE PLAN
      - Same 3-column table from pricing page
      - Current plan highlighted
      - \"Upgrade\" button on higher tiers
      - \"Switch to annual\" button for monthly subscribers
        (shows savings calculation)

   c. CHECKOUT VIA KORAPAY
      Korapay Checkout Standard (JS modal — client-side):
      - Load script on demand (dynamic import):
        korablobstorage.blob.core.windows.net/modal-bucket/
        korapay-collections.min.js
      - On \"Subscribe\" click: POST /api/billing/subscribe
        → receive { reference, amount, currency }
      - Call window.Korapay.initialize({ key: NEXT_PUBLIC_
        KORAPAY_PUBLIC_KEY, reference, amount, currency: 'NGN',
        customer: { name, email }, onSuccess, onFailed,
        onClose, channels: ['bank_transfer','card'],
        merchant_bears_cost: true })
      - onSuccess: show \"Activating your plan...\" spinner,
        poll GET /api/billing/status every 2s until plan changes
      - onFailed: show error toast, allow retry

   d. ARIP APPLICATION PACKAGE
      - Separate purchase card: \"$499 one-time\"
      - \"Buy ARIP Package\" button

3. UPGRADE PROMPT COMPONENT
   Create: packages/ui/src/components/UpgradePrompt.tsx

   Shown inline when user hits a feature gate.
   Props: { feature, requiredPlan, upgradeUrl }
   Display:
   - Lock icon + \"Available on [Compass/Flagship] plan\"
   - 2 key features of the required plan
   - \"Upgrade now\" button (links to /billing?upgrade=true)
   - \"See all features\" link to /pricing

   Use this component everywhere feature gates fire in UI.

4. TESTS
   - Pricing table renders all 3 plans with correct prices
   - Annual toggle shows discounted prices
   - Subscribe button calls POST /api/billing/subscribe
   - Korapay.initialize called with correct reference + amount
   - onSuccess triggers polling of /api/billing/status
   - onFailed shows error toast
   - UpgradePrompt renders with correct plan name
   - Cancel confirmation modal appears before cancelling
   - Current plan highlighted on billing page
   - Past due status shows amber warning banner
═══════════════════════════════════════════════════════


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 5 — PHASE B: ARIP TRACKER (US-009)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S5-B1 🤖 CLAUDE CODE — ARIP Tracker Backend
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 5 (arip_applications schema —
the full updated schema with all growth tracking columns)
and PRD v1.1 Section 3.2 US-009 fully.
This is the most regulatory-sensitive feature in Sprint 5.
Use Opus 4 for the database migration design.
Use Sonnet 4.5 for all implementation.

The ARIP tracker implements the CORRECT 5-stage process
from the ARIP Framework (SEC Nigeria, June 2024).
NEVER use the old 7-stage model (pre_screening,
aip_operations, full_registration are WRONG stage names).

1. DATABASE MIGRATION
   Ensure the arip_applications table matches CLAUDE.md
   Section 5 exactly, including ALL of these columns:
   - current_stage (5 stages only)
   - stage_status
   - arip_entry_customer_count
   - current_customer_count
   - growth_cap_percentage (DEFAULT 10.00)
   - growth_alert_threshold (DEFAULT 8.00)
   - customer_count_last_updated
   - growth_cap_breached BOOLEAN
   - solicitor_name, solicitor_firm, solicitor_email
   - processing_fee_paid BOOLEAN
   - processing_fee_paid_date
   - processing_fee_reference
   - fidelity_bond_in_place BOOLEAN
   - fidelity_bond_coverage_pct
   - fidelity_bond_insurer, fidelity_bond_expiry
   - transition_outcome

   Also ensure arip_restrictions_log table exists:
   (id, org_id, arip_application_id, restriction_type,
    detected_at, description, severity, resolved,
    resolved_at, notes)

2. ARIP SERVICE
   Create: apps/api/src/services/aripTracker.ts

   getARIPApplication(orgId): existing app or null

   createARIPApplication(orgId, licenceType):
   - Creates new record with stage 1, not_started status
   - Returns the created application

   updateARIPStage(orgId, stage, status, data):
   - Validates stage transitions (can only advance, not skip)
   - On stage 4 (AIP) becoming 'active':
     * Trigger Phase 4 roadmap task unlocking
     * Create compliance calendar events (weekly, monthly,
       quarterly SEC filings per Section 21, ARIP Framework)
   - Returns updated application

   updateCustomerCount(orgId, currentCount):
   - Updates current_customer_count
   - Calculates growth_pct
   - If growth_pct >= alert_threshold: create notification
   - If growth_pct >= 10.00:
     * Set growth_cap_breached = true
     * Log to arip_restrictions_log
     * Send critical notification
   - Returns { growth_pct, alert_level, breached }

   getGrowthStatus(orgId):
   Returns {
     baseline: arip_entry_customer_count,
     current: current_customer_count,
     growth_pct: calculated,
     cap: 10.00,
     alert_threshold: 8.00,
     alert_level: 'green'|'amber'|'red',
     breached: boolean,
     baseline_date: aip_issued_date
   }

3. API ENDPOINTS
   Create: apps/api/src/routes/regulators/arip.ts

   GET  /api/arip
   PUT  /api/arip          (update stage, status, fields)
   GET  /api/arip/checklist
   PUT  /api/arip/customer-count   (update current count)
   GET  /api/arip/growth-status    (returns growth calculation)
   POST /api/arip/incident         (log a restriction breach)

   All endpoints: requireFeature('arip_tracker')
   (Compass+ only per CLAUDE.md Section 10)

4. COMPLIANCE CALENDAR AUTOMATION
   When AIP becomes active, auto-create these events
   in compliance_events table:
   - Type: ARIP_WEEKLY_STATS
     Title: \"Weekly Trading Statistics — SEC Filing\"
     Recurrence: weekly
     Created for: next 52 weeks
   - Type: ARIP_MONTHLY_STATS
     Title: \"Monthly Reporting — SEC Filing\"
     Recurrence: monthly
     Created for: next 12 months
   - Type: ARIP_QUARTERLY_REPORT
     Title: \"Quarterly Financial & Compliance Report — SEC\"
     Recurrence: quarterly
     Created for: next 4 quarters

5. TESTS
   - createARIPApplication() creates with correct defaults
   - Stage can only advance (not skip, not go backwards)
   - Growth cap breach at exactly 10% triggers restriction log
   - Growth alert at 8% triggers amber notification
   - AIP activation creates compliance calendar events
   - Customer count update recalculates growth correctly
   - Edge case: baseline = 0 (division by zero guard)
   - Restriction log entry created on breach
   - Growth cap = 10% (not configurable — regulatory requirement)
   - arip_tracker feature gate blocks free/navigator (402)
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S5-B2 🤖 CLAUDE CODE — ARIP Tracker UI
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read PRD v1.1 Section 3.2 US-009 acceptance criteria
and the complete stage specifications before starting.
The Stage 3 solicitor warning is NON-DISMISSIBLE.
Use Sonnet 4.5.

1. ARIP TRACKER PAGE
   Create: apps/web/src/app/(dashboard)/regulators/arip/page.tsx

2. PAGE HEADER
   Title: \"ARIP Application Tracker\"
   Subtitle: \"Track your SEC Nigeria Accelerated Regulatory
   Incubation Programme application\"
   Source note (italic): \"Based on ARIP Framework, SEC
   Nigeria, June 2024\"

   Quick-access contacts card:
   📧 innovation@sec.gov.ng
   📧 fintech@sec.gov.ng
   🕐 Innovation Office: Tue & Thu, 10am–2pm ONLY
   🔗 SEC ePortal → home.sec.gov.ng

3. DISCLAIMER BANNER (always visible, amber, non-dismissible)
   \"This information is sourced from the ARIP Framework,
   SEC Nigeria (June 2024). Klarify provides regulatory
   information, not legal advice. Verify all requirements
   with your registered solicitor before submission.\"

4. 5-STAGE PROGRESS STEPPER (horizontal)
   Stages:
   1: Initial Assessment
   2: Eligibility Notification
   3: Formal Application ← show ⚠️ \"Solicitor Required\" tooltip
   4: AIP Active
   5: Transition to Registration

   Active stage: teal filled circle
   Complete stages: teal with checkmark
   Incomplete stages: grey outline
   Stage 3 tooltip on hover: \"Application MUST be filed
   through a registered solicitor or adviser (Section 16,
   ARIP Framework). You cannot self-file.\"

5. STAGE DETAIL PANELS (each stage expands when active)

   STAGE 1 — Initial Assessment:
   Status: not_started | submitted | under_review | complete
   Instructions text
   Button: \"Open SEC ePortal →\" (external link, new tab)
   Note: \"No fee required at this stage\"

   STAGE 2 — Eligibility Notification:
   Status selector
   Outcome badges: Eligible (green) | Ineligible (red) |
                   Deferred (amber)
   Outcome guidance text for each status

   STAGE 3 — Formal Application:
   CRITICAL BLOCKER BANNER (red, NON-DISMISSIBLE):
   \"⚠️ SOLICITOR REQUIRED — Under Section 16 of the
   ARIP Framework, your application MUST be filed through
   a registered solicitor or adviser. You cannot self-file.
   Complete the solicitor fields below before proceeding.\"

   Solicitor fields (required):
   - Solicitor/Adviser Name
   - Law Firm / Advisory Firm
   - Email Address
   - \"Solicitor engaged\" checkbox
   
   Stage 3 cannot be marked started until
   solicitor fields are filled.

   Processing fee tracker:
   - \"₦2,000,000 — Non-Refundable\"
   - Fee paid checkbox + payment date + REVOP reference
   - \"Pay via REVOP →\" (opens revop.gov.ng in new tab)
   - Note: \"Only pay after receiving Stage 2 eligibility\"

   Document checklist: all 15 items from PRD US-009
   (each checkbox individually saveable)

   Fidelity bond tracker:
   - Coverage % input (must be ≥ 25%)
   - Insurer name
   - Expiry date
   - \"Bond in place\" checkbox

   STAGE 4 — AIP Active:
   AIP details: issued date, expiry date fields

   Customer baseline CRITICAL capture:
   Amber banner: \"You MUST record your exact customer count
   on the day you receive AIP. This is your baseline for
   the 10% growth cap. It cannot be reconstructed later.\"
   Number input: \"Customers on AIP receipt date\"
   \"Lock Baseline\" button (disables further editing)
   Note after locking: \"Baseline: [N] customers on [date].
   Your 10% cap = [N×0.1] additional customers allowed.\"

   Customer growth tracker:
   - \"Current customer count\" number input + \"Update\" button
   - Progress bar (green 0-7%, amber 8-9%, red 10%+)
   - \"[current] customers ([growth]% of 10% limit used)\"
   - Breach alert if > 10%: red critical banner

   AIP restrictions checklist (Section 29):
   □ No promotional activities (Section 29b)
   □ No business outside operational plan (Section 29a)
   □ No misleading communications (Section 29c)
   □ Customer growth within 10% cap (Section 29d)
   Each has: Status toggle (Compliant | Breached) + notes

   AIP compliance calendar summary:
   Shows next 3 upcoming SEC filing events
   \"View compliance calendar →\" link

   STAGE 5 — Transition:
   Three outcome options (radio):
   ○ Full registration granted → green celebration state
   ○ New regulations adopted for our model → teal info state
   ○ Registration denied → red state with RI fallback info

6. EMPTY STATE (no ARIP application yet):
   \"Start your ARIP journey\"
   \"Begin Initial Assessment →\" button
   Creates new application on click

7. AUTO-SAVE
   Every field change auto-saves with 500ms debounce.
   \"Saved\" toast after each save.

8. GATE: Compass+ only
   Free/Navigator users see:
   UpgradePrompt component with \"Available on Compass plan\"

9. TESTS
   - Empty state renders \"Begin Initial Assessment\"
   - Stage stepper shows correct active stage
   - Stage 3 solicitor blocker visible and non-dismissible
   - Solicitor fields required before S3 can start
   - Baseline lock button disables input after click
   - Growth bar green at 5%, amber at 8%, red at 10%
   - Stage 5 shows 3 outcome options
   - REVOP link opens in new tab
   - Free plan user sees UpgradePrompt (not tracker)
   - Auto-save fires on field blur
═══════════════════════════════════════════════════════


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 5 — PHASE C: REGULATOR CRM (US-010)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S5-C1 🤖 CLAUDE CODE — Regulator CRM Backend + UI
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read CLAUDE.md Section 13 (NIGERIAN_REGULATORS seed data
— the full updated version with ARIP contacts).
Read PRD v1.1 Section 3.2 US-010 acceptance criteria.
Use Sonnet 4.5.

Build the Regulator Engagement CRM.

1. DATABASE SEED
   Ensure all 7 Nigerian regulators from CLAUDE.md
   Section 13 are seeded into a regulators master table
   on every fresh deployment. The SEC_NIGERIA entry must
   include the full arip_contacts and arip_fees objects.

2. API ENDPOINTS
   Create: apps/api/src/routes/regulators/index.ts

   GET /api/regulators
   Returns the master list of 7 pre-loaded regulators
   with their mandate, contacts, and ARIP details

   GET /api/regulators/:code
   Returns full regulator profile for e.g. 'SEC_NIGERIA'

   POST /api/regulators/interactions
   Creates a new interaction log entry
   Body: { regulator_code, interaction_type, subject,
           outcome, follow_up_required, follow_up_date,
           occurred_at }
   Types: call | email | meeting | submission | letter

   GET /api/regulators/interactions
   Returns all interactions for org, sorted by occurred_at DESC

   Both interaction endpoints: requireFeature('regulator_crm')
   (Compass+ only)

3. REGULATOR HUB PAGE
   Create: apps/web/src/app/(dashboard)/regulators/page.tsx

   LAYOUT:
   - ARIP Programme card (prominent, at top — existing UI)
   - \"Primary Digital Asset Regulators\" section header
   - Regulator cards grid (2 columns desktop, 1 mobile)

   REGULATOR CARD COMPONENT:
   Create: packages/ui/src/components/RegulatorProfile.tsx

   Card shows:
   - Regulator emoji icon + code + full name
   - Mandate description
   - Jurisdiction tags (pill badges)
   - Website link
   - Email + phone
   - \"Log interaction\" button (Compass+ only)
   - \"View interactions\" count badge

4. INTERACTION LOG MODAL
   Opens on \"Log interaction\" click.
   Fields:
   - Interaction type (radio: call, email, meeting,
     submission, letter)
   - Subject (text)
   - Outcome (textarea)
   - Follow-up required? (checkbox)
   - Follow-up date (date, only if follow-up checked)
   - Date of interaction (date, default: today)
   - \"Save interaction\" button

5. INTERACTION HISTORY
   Accessible from each regulator card.
   Shows list of all logged interactions:
   - Date | Type badge | Subject | Outcome | Follow-up date
   - Filter by type
   - \"Regulatory Engagement Summary\" export button
     (CSV download of all interactions)
     Compass+ only.

6. FOLLOW-UP ALERTS
   When follow_up_date is within 7 days and
   is_complete = false:
   - Show in dashboard \"Outstanding action items\"
   - Trigger email reminder (via Resend)

7. TESTS
   - All 7 regulators appear on hub page
   - SEC_NIGERIA shows ARIP contacts correctly
   - Log interaction creates DB record
   - Interaction appears in history list
   - Follow-up date shows in dashboard action items
   - Free/Navigator user sees UpgradePrompt for
     \"Log interaction\" button
   - Interactions scoped to org (RLS)
   - CSV export contains all interaction fields
═══════════════════════════════════════════════════════


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 5 — PHASE D: EMAIL NOTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S5-D1 ✅  DONE — Resend Account Active
──────────────────────────────────────────────────────────

Resend is already set up and verified. No manual action needed.

Status:
✅ Domain klarify.africa verified in Resend
✅ DNS records live
✅ RESEND_API_KEY in .env.local and Fly secrets
✅ EMAIL_FROM=noreply@klarify.africa confirmed working
✅ Document analysis emails already in production (Sprint 3)

Proceed directly to S5-D2.


──────────────────────────────────────────────────────────
TASK S5-D2 🤖 CLAUDE CODE — Email Notification System
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read PRD v1.1 Section 5.4 (notification & alert system).
Use Sonnet 4.5.

Build the email notification system using Resend.

1. EMAIL SERVICE
   Create: apps/api/src/services/emailService.ts

   Using Resend SDK: pnpm add resend

   sendEmail(to, subject, htmlBody):
   - Wraps Resend API
   - Always uses EMAIL_FROM from env
   - Logs send success/failure to console
   - Never throws — catch and log errors silently
     (email failure should not break the main flow)

   Template functions (each returns { subject, html }):

   buildDeadlineAlertEmail(event, daysRemaining):
   - Subject: \"[N] days: [event title] — Klarify\"
   - Body: deadline details, CTA → /compliance/calendar

   buildDocumentAnalysisEmail(analysis, urgency):
   - CRITICAL/HIGH: subject \"⛔ Action Required — [summary]\"
   - MEDIUM/LOW: subject \"Document Analysis Ready\"
   - Body: urgency badge, 3-bullet summary, deadline,
     CTA → /analyse/[documentId]

   buildWeeklyDigestEmail(orgId):
   - Subject: \"Your weekly compliance digest — Klarify\"
   - Body: score, tasks due this week, upcoming deadlines
   - Only send if user has activity this week

   buildARIPGrowthAlertEmail(orgId, growthPct):
   - Subject: \"⚠️ ARIP growth cap alert — [growthPct]% used\"
   - Body: current vs baseline, cap warning, CTA → /arip

   buildBillingEmail(type, orgId):
   - Types: 'payment_success', 'payment_failed',
     'subscription_cancelled', 'plan_upgraded'

2. NOTIFICATION TRIGGERS
   Wire emails into existing services:

   In documentAnalysis.ts (Sprint 3):
   After analysis complete:
   - If CRITICAL or HIGH: send immediately
   - If MEDIUM or LOW: queue for next hourly batch

   In aripTracker.ts (S5-B1):
   After updateCustomerCount():
   - If growth_pct >= 8%: send buildARIPGrowthAlertEmail

   In billing webhooks (S5-A2):
   After invoice.payment_failed: send payment failed email
   After subscription.activated: send confirmation email

   Create a daily cron job for deadline alerts:
   Create: apps/api/src/jobs/deadlineAlerts.ts
   Runs: daily at 8:00am Lagos time (UTC+1)
   Logic:
   - Query compliance_events where:
     due_date IN [today+1, today+7, today+14]
     AND is_complete = false
   - For each matching event, send deadline alert email
     to all org members

3. EMAIL PREFERENCES
   Add to user_profiles or a new notification_preferences table:
   - email_deadline_alerts: boolean (default true)
   - email_weekly_digest: boolean (default true)
   - email_document_analysis: boolean (default true)
   - email_arip_alerts: boolean (default true)
   - email_billing: boolean (always true — cannot opt out)

   Unsubscribe link in every non-billing email:
   GET /api/notifications/unsubscribe?token=xxx&type=xxx

4. NOTIFICATION PREFERENCES UI
   Create: apps/web/src/app/(dashboard)/account/
           notifications/page.tsx

   Simple toggle list for each email type.
   \"Billing emails cannot be disabled\" note.

5. TESTS
   - buildDeadlineAlertEmail returns correct subject
   - CRITICAL analysis triggers email immediately
   - Payment failed webhook triggers billing email
   - Unsubscribe token disables correct email type
   - Cron job finds events due in 7 days
   - Email send failure does not throw (caught and logged)
   - Weekly digest not sent if no activity this week
═══════════════════════════════════════════════════════


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SPRINT 5 — PHASE E: 4 ARIP DOCUMENT TEMPLATES (US-008)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


──────────────────────────────────────────────────────────
TASK S5-E1 🤖 CLAUDE CODE — 4 ARIP Framework Templates
──────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════
Read PRD v1.1 Section 3.2 US-008 — the \"NEW 4 ARIP
FRAMEWORK TEMPLATES (Sprint 5)\" section for full
content specifications of each template.
Use Opus 4 for designing the generation prompts.
Use Sonnet 4.5 for implementation.

The 4 new templates (Sprint 5 additions):
  ARIP_OPERATIONAL_PLAN     ARIP Operational Plan
  ARIP_SWORN_UNDERTAKING    Sworn Undertaking — ARIP
  SPONSORED_INDIVIDUAL      Sponsored Individual Profile
  ARIP_ENTITY_RULES         Entity Rules & Governance

1. CREATE PROMPT FILES
   In packages/ai/prompts/documents/:
   Create: ARIP_OPERATIONAL_PLAN.ts
   Create: ARIP_SWORN_UNDERTAKING.ts
   Create: SPONSORED_INDIVIDUAL.ts
   Create: ARIP_ENTITY_RULES.ts

   ARIP_OPERATIONAL_PLAN fields:
   - company_name (prefilled)
   - product_description (textarea)
   - technology_stack_description (textarea)
   - target_customer_profile (textarea)
   - existing_customers (prefilled from org)
   - key_risks (multi-select: AML, fraud, cyber, market,
     operational, legal, reputational)
   - risk_mitigations (textarea per selected risk)
   - insurance_cover_details (textarea)
   - investor_protection_measures (textarea)
   - data_protection_measures (textarea)
   - customer_communication_strategy (textarea)
   - customer_risk_disclosure_plan (textarea)
   - exit_plan (textarea — mandatory, must describe how
     customer obligations fulfilled if reg not achieved)
   Regulatory basis: Sections 15b + 36, ARIP Framework

   ARIP_SWORN_UNDERTAKING fields:
   - company_name (prefilled)
   - director_names (dynamic list, min 1)
   - ceo_name (prefilled from org)
   - compliance_officer_name (prefilled)
   - other_key_officers (dynamic list)
   - declaration_date (date, default today)
   Note: Document must cover all 6 sub-clauses of
   Section 15a including all 8 fitness criteria from
   Section 15a(v)(a-h) for each named person.
   Regulatory basis: Section 15a, ARIP Framework

   SPONSORED_INDIVIDUAL fields:
   (Generates one profile sheet per individual)
   - full_name
   - role (Managing Director | Compliance Officer |
     Director | Controller | Other)
   - nin (NIN number)
   - bvn (BVN number)
   - responsibilities (textarea)
   - experience_and_track_record (textarea)
   - criminal_convictions_declaration (boolean — No)
   - sanctions_declaration (boolean — No)
   - professional_conduct_declaration (boolean — No)
   Note: Minimum 4 individuals required. The form
   allows adding multiple profiles (dynamic list).
   Regulatory basis: Section 18i, ARIP Framework

   ARIP_ENTITY_RULES fields:
   - company_name (prefilled)
   - platform_description (textarea)
   - user_types (select: retail investors, institutional,
     both)
   - suspension_criteria (textarea)
   - expulsion_criteria (textarea)
   - appeals_process_description (textarea)
   Note: Must cover all 8 mandatory provisions from
   Section 15c(i-viii) of ARIP Framework.
   Regulatory basis: Section 15c, ARIP Framework

2. ADD TO DOCUMENT LIBRARY UI
   Update: apps/web/src/app/(dashboard)/compliance/
           documents/page.tsx

   Add new \"ARIP Framework\" category tab to sidebar.
   Show 4 new template cards under this category.
   Note on each: \"Sprint 5 — ARIP Application\"
   Delivery note under template name: \"(ARIP Framework,
   SEC Nigeria, June 2024)\"

3. SPONSORED INDIVIDUAL — DYNAMIC LIST FORM
   The Sponsored Individual template requires a special
   form where user can add multiple individuals:
   - \"Add another individual\" button (up to 10)
   - Each individual gets a full form section
   - Progress indicator: \"3 of minimum 4 individuals added\"
   - Warning if fewer than 4 added on submission attempt

4. TESTS
   - ARIP_OPERATIONAL_PLAN includes exit_plan section
   - ARIP_SWORN_UNDERTAKING covers all 6 Section 15a clauses
   - SPONSORED_INDIVIDUAL form accepts minimum 4 individuals
   - SPONSORED_INDIVIDUAL warning if fewer than 4 added
   - ARIP_ENTITY_RULES covers all 8 Section 15c provisions
   - All 4 templates appear in \"ARIP Framework\" category
   - All 4 templates available to Compass+ (not Navigator)
   - Each generated doc shows regulatory basis in footer
   - Exit plan field cannot be left blank in Operational Plan
═══════════════════════════════════════════════════════


──────────────────────────────────────────────────────────
TASK S5-E2 🔍 VERIFY — Sprint 5 Complete Checkpoint
──────────────────────────────────────────────────────────

Run full Sprint 5 verification before closing sprint:

BILLING:
□ Korapay checkout flow works end-to-end (test mode)
□ Webhook activates plan on charge.success
□ Webhook signature verification rejects tampered payloads
□ Plan upgrades work and take effect immediately
□ Cancel sets status = 'cancelled' (not deleted)
□ Free plan user limited to 10 AI queries/month
□ Navigator plan limited to 3 document templates
□ Compass plan unlocks ARIP tracker and CRM
□ Webhook signature validation rejects invalid payloads
□ Annual plan price shows 20% discount correctly

ARIP TRACKER:
□ 5 stages render (not 7 — old model must not appear)
□ Stage 3 solicitor banner non-dismissible
□ Solicitor fields required before Stage 3 starts
□ Baseline lock button disables input after click
□ Customer growth calculation correct at boundary (10%)
□ Growth breach logged to arip_restrictions_log
□ AIP activation creates compliance calendar events
□ Growth bar: green <8%, amber 8-9%, red ≥10%
□ Stage 5 shows 3 outcome options
□ Compass+ gate works (free/navigator see upgrade prompt)

REGULATOR CRM:
□ All 7 regulators appear pre-loaded
□ SEC_NIGERIA shows ARIP Innovation Office contacts
□ Log interaction creates record scoped to org
□ Follow-up date appears in dashboard action items
□ Compass+ gate on \"Log interaction\"

EMAIL NOTIFICATIONS:
□ CRITICAL document analysis triggers email immediately
□ Deadline alert sent for events due in 7 days
□ ARIP growth cap email sent at 8% threshold
□ Payment failed email triggers on webhook event
□ Unsubscribe link works for each email type
□ Billing emails cannot be unsubscribed

ARIP TEMPLATES:
□ All 4 templates accessible in \"ARIP Framework\" category
□ Operational Plan includes mandatory exit_plan field
□ Sworn Undertaking covers all 6 Section 15a sub-clauses
□ Sponsored Individual warns if fewer than 4 added
□ Entity Rules covers all 8 Section 15c provisions
□ All 4 templates blocked for Navigator plan (UpgradePrompt shown)

SECURITY:
□ All billing webhooks verify signature
□ Feature gates reject free/navigator correctly
□ Subscription records scoped to org (RLS)
□ ARIP data not accessible across orgs (RLS)

TESTS:
□ pnpm test — all passing
□ pnpm tsc --noEmit — zero TypeScript errors
□ pnpm lint — zero lint errors

SPRINT 5 MILESTONE: \"Billing + Notifications Live\" ✅

─────────────────────────────────────────────────────
After Sprint 5 closes:
  - Update CLAUDE.md Section 17 to Beta sprint
  - Begin 20-user closed beta with book readers
    and BNUG community members
  - Beta feedback informs Sprint 6 (Scenario Simulator,
    Jurisdiction Expansion, Human Escalation)
─────────────────────────────────────────────────────


╔═══════════════════════════════════════════════════════════╗
║  SPRINT 4 & 5 — EXTERNAL SERVICES SUMMARY               ║
║  (Everything requiring accounts or credentials)          ║
╚═══════════════════════════════════════════════════════════╝

Service              Purpose               Setup In
─────────────────────────────────────────────────────────────
Korapay              All payments (NGN)     ✅ DONE (existing account)
Resend               Email notifications    ✅ DONE (domain verified, Sprint 3)

All other infrastructure (PostgreSQL, Redis, AWS S3,
Anthropic API, Voyage AI) was set up in Sprints 0-3.
No new infrastructure accounts needed beyond the 3 above.

─────────────────────────────────────────────────────────────
Klarify — Sprint 4 & 5 Task Breakdown v1.0
Source: Klarify_PRD_v1.1 + CLAUDE.md (May 2026)
Prepared by: Chimezie Chuta | Blockspace Technologies
─────────────────────────────────────────────────────────────
"
}
