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
- **Africa-first:** Flutterwave
- **International:** Stripe
- **Billing:** Subscription (monthly/annual) + one-time purchases

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
  flutterwave_sub_id,
  stripe_sub_id,
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
POST /api/billing/webhook/flutterwave
POST /api/billing/webhook/stripe
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

# Payments
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

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

**Sprint:** Sprint 3 — Document Analyser, Email Alerts, Dashboard Integration
**Week:** 7–8
**Goal:** A founder who receives a regulatory letter can upload it (or paste the text) and receive an AI-generated plain-language analysis, 72-hour action plan, draft acknowledgement, and email alert within 30 seconds — without ever leaving Klarify.

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

**Completed in Sprint 2:** (Core AI Live — see S2-C3 acceptance checklist)
- packages/ai/rag: full RAG pipeline (pdf-parse → semantic chunker → Voyage AI `voyage-law-2` embeddings → pgvector search + jurisdiction re-rank → context assembly under 8k-token budget) ✅
- Corpus ingestion of all Sprint-2 mandated documents — Founder's Guide, ISA 2025, SEC DAR (2022/2024/2025), MLPPA 2022, CBN VASP 2023, NFIU VASP 2024, NTAA 2025, BOFIA 2020, NDPA 2023, FATF Rec 15 + Targeted Updates 2023–2025, Ghana VASP Act 2025, Kenya VASP Act 2025 ✅
- apps/api: POST /api/ai/chat (SSE streaming, RAG + multi-turn history + citation extraction + monthly query quota), POST /api/ai/classify (Opus 4 + temp=0 + structured JSON validation + profile projection), GET/DELETE /api/ai/conversations ✅
- packages/ai/chat: framework-agnostic SSE parser + `useKlarifyChat` React hook + Anthropic error classifier (5 stable buckets: service_unavailable / overloaded / rate_limited / invalid_request / unknown, with provider-agnostic copy and a privacy-contract test) ✅
- apps/web: FounderCounsel chat UI (sidebar + active chat + citation badges + 80% orange quota warning + 100% upgrade block), Regulatory Identity Card with dual-licence warning, dashboard nudge for unclassified products ✅
- Live on Fly.io (`api.klarify.africa`) + Netlify (`klarify.africa`) with corrected hybrid surface routing ✅
- Tests: `pnpm -r test` → 119 passing (core 21 / ai 81 / api 17 / ui 0–no-tests) | `pnpm -r typecheck` → zero errors ✅

**Sprint 3 deliverables (in flight):**
- Document upload service — multipart → S3 (SSE/KMS encrypted, signed URLs only) → status polling endpoint
- OCR — pdf-parse for text PDFs with AWS Textract fallback for scanned PDFs and images
- Document analyser — Opus 4 (`temperature=0`) + RAG context → plain-language summary, urgency level (CRITICAL/HIGH/MEDIUM/LOW), 72-hour action plan, draft acknowledgement letter, citations
- Analysis queue (in-process) — upload → OCR → analyse → notify, with status transitions + error recovery
- Document Analyser UI — three input tabs (upload / paste / recent), animated processing stepper, urgency banner, results layout (summary + asks + deadline countdown + action plan with checkable steps + draft response editor)
- .docx export — letterhead, recipient block, draft body, AI-assistance footer, S3-signed download URL with 1h TTL
- Email alerts — wire `@klarify/email` templates `DocumentAnalysisCritical` / `DocumentAnalysisStandard` into the queue with idempotency keys
- Dashboard integration — recent-documents widget, persistent CRITICAL banner when deadline <7 days, "Upload a document" quick action

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

*Last updated: May 21, 2026*
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

