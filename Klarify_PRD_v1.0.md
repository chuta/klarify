  
**![][image1]**

*Navigate Regulated Markets with Confidence*

| PRODUCT REQUIREMENTS DOCUMENT MVP Specification v1.0 *Confidential — For Development Team Use* |
| :---: |

Prepared by Chimezie Chuta

Blockspace Technologies Limited

Lagos, Nigeria · May 2026

# **1\. Executive Summary**

Klarify is an AI-powered regulatory advisory and compliance operating system built specifically for founders, operators, legal professionals, and corporate innovation teams building digital asset and fintech products in African regulated markets.

The product bundles two capabilities into a single, unified platform:

* FounderCounsel: an AI advisory engine that answers regulatory questions, analyses regulatory documents, classifies products, and guides crisis response in plain language

* ComplianceOS: an operational compliance management system that tracks readiness, generates documents, manages ARIP/licensing workflows, and enforces compliance cadence

Klarify is the direct software companion to The Founder's Guide to Building in Regulated Markets by Chimezie Chuta, translating the book's frameworks, checklists, and institutional knowledge into an always-available, interactive platform.

| THE CORE PROBLEM KLARIFY SOLVES African founders building in regulated markets face a recurring, expensive, and often business-ending gap: they do not know what they do not know. They build for months before discovering their product requires a licence. They receive a regulator's letter and do not understand it. They have compliance manuals that nobody follows. They pay lawyers who lack specialised digital asset regulatory expertise. Klarify closes this gap, permanently, affordably, and at scale. |
| :---- |

## **1.1 Product Vision**

Klarify becomes the default regulatory intelligence and compliance infrastructure layer for every African digital asset company; the tool founders open before they write a line of code and keep open for the entire regulated life of their business.

## **1.2 MVP Scope**

The MVP delivers the full FounderCounsel \+ ComplianceOS bundle focused on the Nigerian market (SEC Nigeria, CBN, NFIU, NITDA, EFCC), with architecture designed for rapid expansion to Ghana, Kenya, South Africa, and Mauritius in V2.

## **1.3 Target Launch**

MVP target: 90 days from development kickoff. Public beta: 120 days. Full launch: 150 days.

# **2\. Target Users & Personas**

Klarify serves five primary user personas, each derived directly from the audience identified in The Founder's Guide.

| Persona | Who They Are | Primary Pain | What They Need from Klarify |
| :---- | :---- | :---- | :---- |
| **The Pre-Launch Founder** | Building a digital asset product in Nigeria. Has not yet engaged any regulator. May have been building for months unaware of licensing requirements. | Does not know if their product needs a licence, which regulator owns it, or what to do before launch. | Instant product classification, regulator map, and a step-by-step readiness roadmap. |
| **The Post-Letter Founder** | Has received a letter from SEC Nigeria, CBN, or NFIU. Does not understand it. Has 21 days to respond. | Fear, confusion, and wrong legal advice. The first 72 hours are being mismanaged. | Letter analysis, 72-hour action plan, draft acknowledgment response, and connection to right specialist. |
| **The Compliance Builder** | Has clarity on what they need to do but lacks the infrastructure to do it systematically. Compliance is happening in spreadsheets. | AML manual exists but nobody follows it. KYC is onboarding-only. STRs are filed late. ARIP application is stalled. | ComplianceOS — smart checklists, document generators, compliance calendar, readiness score. |
| **The Corporate Innovator** | Innovation lead at a bank, telco, or insurance company told to 'do something with blockchain.' | No Web3 background, no compliance framework, no idea where to start or which regulator to approach first. | Guided onboarding, regulator map, product classification, and a compliance roadmap appropriate for enterprise context. |
| **The Compliance Professional** | Lawyer, compliance officer, or fintech advisor serving multiple clients across Nigeria or West Africa. | Needs to stay current across multiple regulatory frameworks and provide accurate advice efficiently. | Document analysis, regulatory Q\&A, jurisdiction comparison, and client-ready compliance reports. |

# **3\. User Stories**

All user stories are derived from documented pain points in The Founder's Guide to Building in Regulated Markets. Each story maps to a specific product feature and defines the acceptance criteria the development team must satisfy.

## **3.1 FounderCounsel — Advisory Engine**

| US-001 · PRODUCT CLASSIFICATION  |
| :---- |

**As a pre-launch founder,**

I describe my product in plain language, what it does, how users interact with it, how I make money, and I want Klarify to tell me which regulatory category it falls under, which Nigerian regulators have jurisdiction over it, what licences I need to operate legally, and what happens if I launch without those licences.

**Pain point (from the book):**

Emeka built a tokenised real estate platform for 22 months before receiving a formal SEC Nigeria notice. He did not know his tokens were securities. His lawyers did not know either. The cost of this ignorance was nine months of crisis management and near-fatal damage to investor confidence.

**Acceptance Criteria:**

* User inputs product description via a guided conversational form or free-text field

* AI analyses description against ISA 2025, SEC Digital Asset Rules, CBN payment framework, and FATF VASP definitions

* Output includes: product category (DAX / DAOP / DAC / DAI / payment product / hybrid), primary regulator(s), secondary regulator(s), required licences with links to relevant regulations, and risk level if operating without licence

* Output is presented as a visual 'Regulatory Identity Card' — a designed summary panel the user can save or export

* User can click any element to get a plain-language explanation of what it means

* AI flags if the product spans multiple categories requiring multiple licences

* Response generated in under 8 seconds

| US-002 · REGULATORY DOCUMENT ANALYSER  |
| :---- |

**As a founder who has just received a letter from SEC Nigeria,**

I want to upload the letter and immediately understand in plain language: what is being asked of me, why the regulator sent it, how serious it is, what I must do in the next 72 hours, and what a draft acknowledgment response looks like, without waiting for a lawyer appointment.

**Pain point (from the book):**

'He read it four times. Then he called his lawyer. His lawyer read it twice and said: I think you should pause everything. That was the full extent of the advice.' The regulatory notice that could have been resolved in a fortnight consumed six weeks and nearly ended the business because no one could read it correctly.

**Acceptance Criteria:**

* User uploads PDF, image (JPG/PNG), or pastes raw text of a regulatory document

* AI performs OCR if image is uploaded, then analyses content

* Output panel contains: Plain Language Summary, Urgency Level (Low / Medium / High / Critical) with colour coding, Key Regulatory Ask (what the regulator specifically wants), Deadline Tracker (days remaining with countdown), 72-Hour Action Plan (numbered steps), and Draft Acknowledgment Response (editable, formatted for submission)

* Urgency level is visually prominent, red for Critical, amber for High

* Draft response is exportable as a Word document

* AI clearly states: 'This analysis is not legal advice. Review this with a qualified specialist before submission.'

* User can ask follow-up questions about any part of the output

| US-003 · REGULATORY Q\&A ENGINE  |
| :---- |

**As a founder at any stage,**

I want to ask Klarify any question about Nigerian or African digital asset regulation in plain English, at any time of day, and receive a clear, accurate, cited, actionable answer that does not require me to read 40 pages of regulatory text or wait three days for a lawyer to respond.

**Acceptance Criteria:**

* Persistent chat interface always accessible from any screen in the app

* AI answers questions about: licence requirements, capital thresholds, AML/CFT obligations, KYC standards, regulator procedures, ARIP process, token classification, cross-border operations, and enforcement consequences

* Every answer includes a citation to the relevant regulation or framework (e.g. 'ISA 2025, Section 357' or 'SEC Digital Asset Rules, Rule 5.2')

* AI distinguishes between settled regulatory positions and areas of active evolution, flagging the latter clearly

* When a question requires a human specialist, AI says so explicitly and offers to connect the user (Human Escalation, see US-009)

* Conversation history is saved and searchable

* Users can bookmark answers for reference

* Response time under 5 seconds for standard queries

| US-004 · JURISDICTION EXPANSION ADVISER  |
| :---- |

**As a Nigerian-licensed VASP planning to expand to Ghana or Kenya,**

I want Klarify to show me exactly what is different between my current Nigerian compliance posture and what I need to operate in the new jurisdiction — so I can plan the expansion accurately without hiring consultants in three countries simultaneously.

**Acceptance Criteria:**

* User selects current jurisdiction and target jurisdiction(s)

* System produces a gap analysis table: what you have vs. what you need, across: corporate structure, licensing, capital requirements, AML/CFT programme, KYC standards, reporting obligations, and key regulatory contacts

* Gaps are colour-coded: Green (already satisfied), Amber (partial — needs adjustment), Red (not in place — action required)

* Each gap has an expandable 'how to close this gap' guidance section

* MVP covers: Nigeria, Ghana (VASP Act 2025), Kenya (VASP Act 2025), Mauritius (VAITOS), South Africa (CASP/FSCA)

* User can export the gap analysis as a PDF or Word document

| US-005 · SCENARIO SIMULATOR  |
| :---- |

**As a founder making a product or market decision with regulatory implications,**

I want to describe a scenario — 'What if I launch in Nigeria without an ARIP application?' or 'What changes for my product if the CBN stablecoin framework is published?' — and receive a structured consequence analysis before I commit to a path.

**Acceptance Criteria:**

* User inputs a scenario via free text or selects from common scenario templates

* AI produces a structured Consequence Analysis: Best Case / Likely Case / Worst Case outcomes

* Each outcome includes: probability assessment, regulatory basis, business impact, and recommended mitigation

* Output is visual — a 3-column card layout, not a wall of text

* User can iterate: 'What if I do X instead of Y?'

## **3.2 ComplianceOS — Operational Engine**

| US-006 · REGULATORY READINESS SCORE & DASHBOARD  |
| :---- |

**As a founder or compliance officer,**

I want to see at a glance how ready my company is to operate legally — a single score that reflects my current compliance posture across all dimensions — so I know what to work on next and can show investors, board members, and regulators evidence of our progress.

**Pain point (from the book):**

'A compliance manual that nobody reads is not a compliance programme. It is a liability document.' The gap between performed compliance and practised compliance is the most common failure mode in Nigerian VASPs. The Readiness Score makes this gap visible and impossible to ignore.

**Acceptance Criteria:**

* Dashboard is the first screen users see after login

* Readiness Score is displayed as a prominent visual gauge (0–100) with colour coding: 0–40 Red (Critical), 41–70 Amber (In Progress), 71–90 Green (Good Standing), 91–100 Teal (Regulator Ready)

* Score is calculated across 8 compliance dimensions: Corporate Structure, Capital & Licensing, KYC Infrastructure, AML/CFT Programme, Transaction Monitoring, Regulatory Reporting, Regulatory Relationships, Product Classification Clarity

* Each dimension has its own sub-score and a list of incomplete items

* Score updates in real time as tasks are completed and documents are uploaded

* Score is historised — user can see their score trajectory over time as a line chart

* Dashboard includes: Days to next regulatory deadline, Outstanding action items count, Recent activity log, and a 'What to focus on next' AI-generated recommendation

* Score is exportable as a PDF compliance status report for board/investor use

| US-007 · SMART COMPLIANCE ROADMAP  |
| :---- |

**As a founder starting the compliance journey,**

I want a personalised, intelligent compliance roadmap — not a generic 90-day checklist — that reflects my specific product type, target market, current stage, and team capacity, so I know exactly what to do, in what order, by when, and who on my team should own each item.

**Acceptance Criteria:**

* Onboarding wizard collects: product type (DAX/DAOP/DAC/DAI/payment/hybrid), target market(s), current stage (idea/building/launched), team size, existing compliance infrastructure

* System generates a customised roadmap based on Appendix A of the book, calibrated to user inputs

* Roadmap is displayed as a phased Kanban board: Phase 1 (Foundation), Phase 2 (Compliance Infrastructure), Phase 3 (ARIP Application), Phase 4 (AIP Period Operations)

* Each task has: title, description, regulatory basis, estimated effort, owner assignment, due date, and linked document template if applicable

* Dependencies are enforced: Phase 2 tasks are locked until Phase 1 is complete

* User can adjust task owners, due dates, and add custom tasks

* Team members receive email/in-app notifications for assigned tasks

* Roadmap auto-adjusts when user updates their product type or target market

| US-008 · COMPLIANCE DOCUMENT GENERATOR  |
| :---- |

**As a compliance officer or founder building a compliance programme,**

I want Klarify to generate first-draft versions of the regulatory documents my business needs — calibrated to Nigerian standards — so I am not starting from a blank page, and the structure is already correct before I add my specifics.

**Pain point (from the book):**

'The NFIU and SEC Nigeria both require that the compliance officer be a person of sufficient seniority, independence, and expertise... The compliance programme that requires a data analyst to spend three days extracting data every time a report is due is not a compliance programme.'

**Documents available in MVP:**

* Business-Wide Risk Assessment (BWRA) — structured to NFIU requirements

* AML/CFT Policy Manual — MLPPA 2022 compliant

* KYC Tiering Framework — with NIN/BVN verification tiers

* Token Classification Legal Memo — structured for SEC Nigeria submission

* ARIP White Paper Outline — pre-structured to SEC Nigeria's assessed standard

* STR Filing Template — goAML format

* PEP Register Template — NFIU monthly submission format

* Compliance Officer Appointment Letter

* Regulator Engagement Brief — one-page briefing document for first regulator meeting

**Acceptance Criteria:**

* Each document template is accessed from the relevant checklist task or document library

* User fills in a guided form with their specific company details, product type, and risk profile

* AI pre-fills sections where information has already been provided elsewhere in Klarify (e.g. company name, product type from onboarding)

* Generated document is editable in-app with a rich text editor

* All documents are exportable as Word (.docx) and PDF

* Document version history is maintained

* Each document shows the regulatory basis for its structure (e.g. 'This section satisfies NFIU Guideline 4.2')

| US-009 · ARIP APPLICATION TRACKER  |
| :---- |

**As a founder in the ARIP process,**

I want a dedicated workflow that tracks every stage of my SEC Nigeria ARIP application — from initial assessment to AIP to full registration — with reminders for deadlines, checklists for each stage, and a clear view of what is outstanding.

**Acceptance Criteria:**

* ARIP Tracker is a distinct workflow within ComplianceOS, accessible from the main navigation

* Workflow stages: Pre-screening → Initial Assessment Submission → Eligibility Notification → Formal Application → AIP Issued → AIP Period Operations → Full Registration

* Each stage has: status (Not Started / In Progress / Complete / Blocked), required documents checklist, fees tracker, and key contacts

* AIP Period includes a compliance calendar with all mandatory activities: daily alert review, weekly PEP re-screening, monthly PEP register submission, quarterly training, annual BWRA review

* Deadline alerts are sent 14 days, 7 days, and 24 hours before any filing deadline

* User can log every communication with SEC Nigeria — date, channel, subject, outcome — building an engagement audit trail

* Progress bar shows % completion of each stage

| US-010 · REGULATOR ENGAGEMENT CRM  |
| :---- |

**As a founder or compliance officer managing relationships with multiple Nigerian regulators,**

I want a simple CRM that logs every interaction I have with SEC Nigeria, CBN, NFIU, and NITDA — so I can build and maintain the regulatory relationships the book describes as essential, without losing track of open items, follow-ups, or key contacts.

**Acceptance Criteria:**

* CRM is pre-populated with key Nigerian regulatory bodies: SEC Nigeria, CBN, NFIU, NITDA, EFCC, NAICOM, CAC, NCC — with official contact details and website links

* Each regulator entry has: contact log (date, type, subject, outcome, follow-up required), open items tracker, and key document store

* User can add individual contacts within each regulatory body

* Follow-up reminders are sent for open items with no activity for 7+ days

* User can record: formal submissions, informal calls, meeting notes, and letters sent/received

* CRM generates a 'Regulatory Engagement Summary' report for board meetings

| US-011 · HUMAN ESCALATION NETWORK  |
| :---- |

**As a founder dealing with a complex regulatory situation beyond AI advisory,**

I want Klarify to connect me with a vetted specialist — a lawyer or compliance professional with verified expertise in Nigerian digital asset regulation — quickly, transparently, and at a known cost.

**Pain point (from the book):**

'The wrong lawyer's first instinct is to write a formal, legalistic response that establishes the company's legal position... This response arrives at the Commission's offices as a signal of confrontation.' The cost of the wrong specialist is not just financial — it is often fatal to the regulatory relationship.

**Acceptance Criteria:**

* AI identifies when a question requires human specialist referral and presents the option proactively

* Specialist directory lists vetted professionals with: specialisation, jurisdictions covered, languages spoken, typical response time, consultation fee range, and verified credentials

* User can request a consultation directly from within Klarify

* Klarify provides the specialist with context from the user's session (with user consent) so they do not start from scratch

* MVP: 10–15 vetted Nigerian digital asset legal specialists in the directory

* Specialists are vetted by Chimezie Chuta personally before listing

* Klarify earns a referral fee (15–20%) on specialist consultations booked through the platform

# **4\. Platform Architecture & Technical Specifications**

## **4.1 Application Type**

* Responsive web application (React.js frontend) — primary platform for MVP

* Progressive Web App (PWA) capability — installable on mobile without App Store submission

* iOS and Android native apps — post-MVP Phase 2

* The responsive web \+ PWA approach prioritises African mobile-first users while allowing desktop use for compliance teams and professionals

## **4.2 Technology Stack (Recommended)**

| Layer | Technology | Notes |
| :---- | :---- | :---- |
| **Frontend** | React.js \+ Tailwind CSS | Component library: shadcn/ui. Charts: Recharts. PWA support via Vite. |
| **Backend** | Node.js \+ Express or Next.js API Routes | REST API. JWT authentication. Modular service architecture. |
| **AI Engine** | Anthropic Claude API (claude-sonnet-4) | Primary inference engine. RAG pipeline for regulatory corpus. Streaming responses. |
| **Database** | Supabase PostgreSQL (primary) \+ Redis (cache) | User data, compliance state, conversation history. Redis for session \+ rate limiting. |
| **Document Storage** | AWS S3 or Cloudflare R2 | Uploaded regulatory documents, generated .docx/.pdf files. |
| **Document Generation** | docx.js (Word) \+ PDFKit (PDF) | Server-side generation of all compliance documents. |
| **OCR** | AWS Textract or Google Cloud Vision | For regulatory letter/document uploads as images. |
| **Authentication** |  Supabase Auth | Email/password \+ Google OAuth. Magic link support. |
| **Email** | Resend  | Deadline alerts, task assignments, weekly digests. |
| **Hosting** | Netlifyl (frontend) \+ Railway or Render (backend) | Low-ops deployment. Scales with usage. |
| **Payments** | Flutterwave (Africa-first) \+ Stripe (international) | Subscription billing. Annual plans. One-time purchases. |
| **Analytics** | PostHog (self-hosted option available) | Product analytics, session recording, feature flags. |

## **4.3 AI Engine Architecture**

Klarify's AI capabilities are powered by a Retrieval-Augmented Generation (RAG) pipeline built on top of the Anthropic Claude API. This is not a generic AI — it is a domain-specific intelligence system trained on the regulatory corpus that makes Klarify authoritative.

### **4.3.1 Regulatory Knowledge Base (RAG Corpus)**

The following documents are chunked, embedded, and stored in a vector database for retrieval:

| Nigerian Regulatory Corpus | International & Regional Corpus |
| :---- | :---- |
| Investments and Securities Act 2025 (ISA 2025\) SEC Digital Asset Rules (2022, amended 2024, 2025\) MLPPA 2022 CBN VASP Guidelines 2023 NFIU AML/CFT Compliance Framework for VASPs NTAA 2025 BOFIA 2020 Nigeria Data Protection Act 2023 **The Founder's Guide — full text (Chuta, 2026\)** | FATF Recommendation 15 \+ Targeted Updates (2021–2025) Ghana VASP Act 2025 (Act 1154\) Kenya VASP Act 2025 Mauritius VAITOS Act 2021 \+ 2025 guidance South Africa CASP/FSCA framework EU MiCA (comparative reference) BIS working papers on stablecoins/CBDC GIABA mutual evaluation reports |

### **4.3.2 AI Behaviour Rules (System Prompt Guidelines)**

* Always respond in plain, founder-friendly English — avoid regulatory jargon unless defining it

* Always cite the specific regulation, section, or guideline that supports the answer

* Clearly distinguish between settled law and areas of regulatory evolution

* Never give definitive legal advice — always append: 'This is regulatory information, not legal advice. For specific legal questions, consult a qualified practitioner.'

* Flag when a question is beyond AI scope and offer human escalation

* Never hallucinate regulatory content — if uncertain, say so and recommend the official source

* Maintain conversation context across a session — do not ask users to repeat information

* Use the Founder's Guide as the primary interpretive lens — Chimezie's frameworks are canonical

## **4.4 Data Architecture**

* All user data stored in PostgreSQL with row-level security (RLS)

* Conversation history stored per user with 12-month retention, user-deletable

* Uploaded documents stored encrypted at rest (AES-256) on S3/R2

* Compliance state (readiness score, task completion, roadmap progress) stored as JSON in PostgreSQL

* No user data is used to train AI models — explicit privacy guarantee

* Nigerian data residency option in V2 (for enterprise clients requiring local data hosting)

# **5\. Feature Specifications & App Behaviour**

## **5.1 Onboarding Flow**

Onboarding is the most important UX moment in Klarify. It must collect the information needed to personalise both the advisory and compliance engines — without feeling like a form.

### **Step 1 — Welcome & Intent**

* Screen: 'What are you building?' — large, visual card selector

* Options: Digital Asset Exchange, Token/NFT Platform, Stablecoin/Payment Product, Tokenised Real-World Asset, DeFi Protocol, AI Financial Product, I'm Not Sure Yet

* Visual icons for each. User can select multiple.

### **Step 2 — Stage & Market**

* 'Where are you right now?' — Idea Stage / Building (Pre-Launch) / Launched (Unlicensed) / In the ARIP Process / Licensed & Operating

* 'Which markets are you building for?' — Checkbox selection: Nigeria, Ghana, Kenya, South Africa, Mauritius, Other Africa

### **Step 3 — Team**

* 'Who else is on your team?' — Solo founder / 2–5 people / 6–20 people / 20+ people

* 'Do you have a compliance officer?' — Yes / No / Not yet but planning to

### **Step 4 — Existing Compliance Infrastructure**

* Checkbox: 'What do you already have in place?' — CAC Registration, NIN/BVN Verification, AML Policy, NFIU Registration, SEC ARIP Application Started, None of the above

### **Step 5 — Immediate Need**

* 'What do you most need right now?' — large, visual cards: Understand my regulatory requirements / Respond to a regulator letter / Build my compliance programme / Apply for ARIP / Expand to a new market / Stay current on regulations

* Selection routes user to the relevant feature first

| ONBOARDING BEHAVIOUR NOTE Onboarding data immediately personalises the experience: the Readiness Score is pre-calculated, the Smart Roadmap is pre-populated, and the AI advisory engine is context-aware from the first conversation. Users who say they are at 'Idea Stage' see different recommended actions than users who say they are 'Launched (Unlicensed)'. The urgency framing is different. The recommended first steps are different. |
| :---- |

## **5.2 Navigation Structure**

Klarify uses a persistent left sidebar navigation (desktop) and bottom tab navigation (mobile) with 6 primary sections:

| Nav Item | Section Name | What Lives Here |
| :---- | :---- | :---- |
| **🏠 Home Dashboard** | Home | Readiness Score, action items, upcoming deadlines, recent AI conversations, quick-access to all features |
| **🤖 Ask Klarify FounderCounsel** | Ask | AI chat interface, document analyser, scenario simulator, conversation history |
| **📋 My Roadmap Smart Roadmap** | My | Phased compliance task board, task details, document templates, team assignments |
| **📊 ComplianceOS** | Compliance | All 8 readiness dimensions, document library, generated documents, version history |
| **🏛️ Regulators Regulator Hub** | Regulators | Regulator CRM, ARIP tracker, engagement log, regulator profiles and contacts |
| **👤 Account Settings** | Account | Profile, team management, billing, notification preferences, jurisdiction settings |

## **5.3 Visual Design Language**

Klarify's visual design must feel like a premium tool that takes regulated markets seriously — not a toy, not bureaucratic, not intimidating. The visual language is professional, warm, and distinctly African in its confidence.

### **Colour Palette**

* Primary: Klarify Teal (\#0B6E6E) — trust, depth, the sea that founders navigate

* Secondary: Klarify Navy (\#0D2B45) — authority, stability, institutional credibility

* Accent: Klarify Gold (\#D4A843) — achievement, milestones, readiness completion

* Backgrounds: Off-white (\#FAFAFA), Light Teal (\#E6F4F4), Light Navy (\#E8EEF4)

* Status colours: Red (\#C0392B) Critical, Amber (\#D4A843) In Progress, Green (\#1A7A4A) Good Standing, Teal (\#0B6E6E) Regulator Ready

### 

### **Typography**

* Primary font: Inter (clean, highly legible on mobile)

* Monospace (for regulatory citations): JetBrains Mono

* Minimum body font size: 14px (mobile), 16px (desktop)

### **Key Visual Components**

* Readiness Score Gauge — large, animated circular gauge. The single most important visual in the app.

* Regulatory Identity Card — a styled card displaying product classification results. Shareable.

* Compliance Roadmap Board — Kanban-style, colour-coded by phase. Draggable tasks.

* Urgency Badge — colour-coded pill labels on any regulatory item (Critical / High / Medium / Low)

* Progress Bars — on every dimension, every phase, every application stage

* Regulator Profiles — card-based display with logo, mandate summary, key contacts, and status of your relationship with that regulator

## **5.4 Notification & Alert System**

* In-app notification bell: all alerts accessible without leaving the screen

* Email digests: daily (for active ARIP applicants), weekly (for all users)

* Push notifications via PWA: deadline alerts, task overdue, new regulatory update

* SMS alerts (optional, via Twilio): for Critical urgency regulatory events only

* All notifications are configurable in Account Settings

* Notification types: Deadline Alert, Task Assigned, Task Overdue, Readiness Score Change, AI Conversation Saved, Document Generated, Regulatory Update (future RegRadar integration)

## **5.5 Mobile-First Behaviour**

Given the African mobile-first context, Klarify must perform excellently on mid-range Android devices on 3G/4G connections.

* All core features functional on screens 360px wide and above

* AI chat interface is the primary mobile experience — thumb-friendly input, large response cards

* Readiness Score dashboard condensed to a single-card summary on mobile

* Documents generated on desktop, viewable on mobile

* Offline mode: last 10 AI responses and current roadmap cached locally for offline access

* Target performance: First Contentful Paint under 2.5s on 4G. Under 4s on 3G.

* Image assets compressed for bandwidth efficiency

# **6\. Pricing & Subscription Model**

| Feature | NAVIGATOR$29/moSolo Founder | COMPASS$99/moStartup Team (5 seats) | FLAGSHIP$299/moEnterprise (Unlimited) |
| :---- | :---: | :---: | :---: |
| AI Q\&A (monthly queries) | 50 queries | Unlimited | Unlimited |
| Document Analyser | 5/month | Unlimited | Unlimited |
| Readiness Score Dashboard | ✓ | ✓ | **✓** |
| Smart Compliance Roadmap | ✓ | ✓ | **✓** |
| Document Generator | 3 templates | All templates | All templates \+ custom |
| ARIP Tracker | — | ✓ | **✓** |
| Regulator CRM | — | ✓ | **✓** |
| Scenario Simulator | — | ✓ | **✓** |
| Jurisdiction Expansion | Nigeria only | 2 jurisdictions | All 5 jurisdictions |
| Team seats | 1 | 5 | Unlimited |
| Human Escalation access | — | ✓ | **✓ Priority** |
| Compliance Report export | — | PDF | PDF \+ Word \+ branded |
| API access | — | — | **✓** |
| Dedicated onboarding call | — | — | **✓** |

* All plans: 20% discount on annual billing

* Additional one-time product: ARIP Application Package — $499 flat (full document set \+ 30-day AI support)

* Free tier: Nigeria-only, 10 AI queries/month, Readiness Score only — for book readers and community members

* Human Escalation referrals: Klarify earns 15% of consultation fee

* Enterprise pricing for law firms and accelerators: custom quote

# **7\. MVP Feature Priority Matrix**

Features are prioritised using MoSCoW methodology. Must Have features define the MVP. Should Have features complete the MVP. Could Have features are V1.1 scope.

| Priority | Feature | User Story | Dev Effort |
| :---- | :---- | :---- | :---- |
| **MUST HAVE** | User Authentication & Onboarding Wizard | All | Medium |
| **MUST HAVE** | AI Regulatory Q\&A Engine (RAG pipeline) | US-003 | High |
| **MUST HAVE** | Product Classification Engine | US-001 | High |
| **MUST HAVE** | Regulatory Document Analyser (upload \+ analyse) | US-002 | Medium |
| **MUST HAVE** | Readiness Score Dashboard | US-006 | Medium |
| **MUST HAVE** | Smart Compliance Roadmap (Kanban) | US-007 | Medium |
| **MUST HAVE** | Document Generator (core 5 documents) | US-008 | Medium |
| **MUST HAVE** | Subscription billing (Flutterwave \+ Stripe) | All | Medium |
| **MUST HAVE** | Mobile-responsive UI (PWA) | All | Medium |
| **SHOULD HAVE** | ARIP Application Tracker | US-009 | Medium |
| **SHOULD HAVE** | Regulator Engagement CRM | US-010 | Low |
| **SHOULD HAVE** | Document Generator (full 9-document library) | US-008 | Low |
| **SHOULD HAVE** | Scenario Simulator | US-005 | Medium |
| **SHOULD HAVE** | Jurisdiction Expansion Adviser (Ghana \+ Kenya) | US-004 | High |
| **SHOULD HAVE** | Human Escalation Specialist Directory | US-011 | Low |
| **SHOULD HAVE** | Compliance Calendar with automated reminders | US-009 | Low |
| **COULD HAVE** | Team collaboration (task assignment, comments) | US-007 | Medium |
| **COULD HAVE** | Mauritius \+ South Africa jurisdiction coverage | US-004 | Medium |
| **COULD HAVE** | Compliance Report PDF export (branded) | US-006 | Low |
| **COULD HAVE** | API access for enterprise clients | — | High |
| **COULD HAVE** | SMS alerts via Twilio | All | Low |
| **COULD HAVE** | RegRadar feed integration (V2 product) | — | High |

# **8\. MVP Build Timeline**

90-day build plan from development kickoff to deployable MVP. Assumes a team of 2–3 developers (1 fullstack, 1 frontend, 1 AI/backend), 1 designer (part-time), and 1 product lead.

| Sprint | Duration | Deliverables | Milestone |
| :---- | :---- | :---- | :---- |
| **Sprint 0** | Week 1–2 | Environment setup, regulatory corpus preparation and embedding, design system build (Klarify colours, components), database schema design, authentication scaffold | **Infrastructure ready** |
| **Sprint 1** | Week 3–4 | Onboarding wizard (5 steps), user profile, basic dashboard shell, Readiness Score calculation engine (static weights) | **Onboarding live** |
| **Sprint 2** | Week 5–6 | AI Q\&A engine (RAG pipeline \+ Claude API), product classification engine, conversation history, citation rendering | **Core AI live** |
| **Sprint 3** | Week 7–8 | Document analyser (upload \+ OCR \+ AI analysis), 72-hour action plan output, draft response generator, urgency scoring | **Document analyser live** |
| **Sprint 4** | Week 9–10 | Smart Compliance Roadmap (Kanban board), task CRUD, phase locking logic, 5 document templates with generator | **ComplianceOS v1 live** |
| **Sprint 5** | Week 11–12 | Subscription billing (Flutterwave \+ Stripe), tier-gating of features, ARIP tracker, regulator CRM (basic), email notifications | **Billing \+ notifications live** |
| **Beta** | Week 13–16 | Internal QA, 20-user closed beta (book readers \+ BNUG community), performance optimisation, mobile polish, PWA packaging | **Closed beta** |
| **Launch** | Week 17–20 | Bug fixes from beta, scenario simulator, jurisdiction expansion (Ghana \+ Kenya), human escalation directory, public launch | **🚀 Public launch** |

# **9\. Non-Functional Requirements**

## **9.1 Performance**

* AI Q\&A response: under 5 seconds for standard queries, under 8 seconds for complex multi-citation responses

* Document analysis: under 15 seconds from upload to first response

* Dashboard load: under 2 seconds (cached)

* Document generation: under 10 seconds for any template

* Target 99.5% uptime (excluding planned maintenance)

## **9.2 Security**

* All data encrypted in transit (TLS 1.3) and at rest (AES-256)

* JWT tokens with 24-hour expiry and refresh token rotation

* Rate limiting on all API endpoints (per user and per IP)

* Input sanitisation on all user-submitted content before AI processing

* Document uploads scanned for malware before storage

* No user compliance data used for AI model training — explicitly stated in Terms of Service

* GDPR-compliant data export and deletion on user request

* Regular penetration testing from V1.1

## **9.3 Accessibility**

* WCAG 2.1 AA compliance

* All colour combinations meet minimum 4.5:1 contrast ratio

* All interactive elements keyboard-navigable

* Screen reader compatible (ARIA labels on all components)

## **9.4 Scalability**

* Stateless API design — horizontally scalable from day one

* RAG vector database (Pinecone or pgvector) designed for corpus expansion to all 54 AU member states over time

* Multi-tenancy architecture from MVP — each company's data is isolated

* Architecture supports RegRadar product integration in V2 without significant refactoring

# **10\. Success Metrics**

Klarify's MVP success is measured across three dimensions: adoption, engagement, and business outcomes.

## **10.1 Adoption Targets (First 6 Months Post-Launch)**

| Metric | Month 3 | Month 6 |
| :---- | ----- | ----- |
| Registered users | 500 | **2,000** |
| Paying subscribers | 50 | **300** |
| Monthly Recurring Revenue (MRR) | $2,500 | **$18,000** |
| AI queries per month | 5,000 | **25,000** |
| Documents generated | 200 | **1,500** |
| ARIP applications tracked | 20 | **100** |
| Net Promoter Score (NPS) | 40+ | **55+** |
| Book-to-app conversion rate | — | **15% of book readers** |

## **10.2 Engagement Metrics**

* Weekly Active Users (WAU) / Monthly Active Users (MAU) ratio: target 40%+ (high for a compliance tool)

* Average AI queries per active user per week: target 5+

* Roadmap task completion rate: target 60% of assigned tasks completed on time

* Readiness Score improvement: average user improves score by 25+ points in first 60 days

* Document generator utilisation: 70% of Compass and Flagship users generate at least one document per month

## **10.3 Distribution Channels**

* Book QR codes — every chapter links to relevant Klarify features (highest quality leads)

* BNUG community (25,000+ members) — direct distribution channel

* FintechNGR and BICCON partnerships — B2B and professional market access

* SEC Nigeria ARIP awareness — Klarify mentioned in community guidance

* African accelerator partnerships (YC, Techstars Lagos, GreenHouse Capital) — bulk institutional access

* LinkedIn content strategy by Chimezie Chuta — founder-focused regulatory content

# **11\. Legal, Compliance & Risk Considerations**

| CRITICAL DISCLAIMER REQUIREMENT Every AI-generated response in Klarify must include a prominent, non-dismissible disclaimer: 'This is regulatory information and educational guidance, not legal advice. Klarify does not establish a solicitor-client relationship. Always consult a qualified legal practitioner for advice specific to your situation.' This disclaimer is non-negotiable and must survive any UI iteration. |
| :---- |

## **11.1 Terms of Service Must Address**

* Klarify provides regulatory information and workflow tools — not legal advice

* AI outputs are based on publicly available regulatory information and may not reflect the latest regulatory developments

* Users are responsible for verifying all regulatory information with qualified professionals before acting

* Klarify's readiness scores and compliance assessments are indicative — not guarantees of regulatory approval

* User data is never used to train AI models

* Klarify is not responsible for regulatory outcomes of any business decision made using the platform

## **11.2 Data Protection**

* Compliant with Nigeria Data Protection Act 2023 (NDPA)

* Privacy policy explicitly covers: what data is collected, how it is used, how users can delete it

* Compliance documents uploaded by users are stored encrypted and never shared

* Conversation history with AI is user-owned and user-deletable

## **11.3 Intellectual Property**

* The Founder's Guide content used in RAG corpus under licence from Blockspace Technologies Limited

* All regulatory documents in the corpus are public domain government publications

* Generated documents are owned by the user — Klarify claims no rights over user-created compliance materials

# **12\. Appendices**

## **Appendix A — Regulatory Corpus Update Protocol**

The RAG knowledge base must be updated whenever:

* Any Nigerian regulatory body (CBN, SEC, NFIU, NITDA) publishes a new circular, guideline, or rule amendment

* ISA 2025 or any referenced Act is amended

* A new FATF Targeted Update on Virtual Assets is published (annually, June)

* A new African jurisdiction's VASP framework is finalised

Update protocol: Product team reviews new publication → chunks and embeds into vector store → tests for retrieval accuracy → deploys with version tag and 'Updated \[date\]' marker in citations.

Target update lag: under 72 hours from publication to deployment in corpus.

## **Appendix B — Human Escalation Network Criteria**

Specialists listed in the Human Escalation directory must meet ALL of the following:

* Minimum 3 years of active practice in Nigerian fintech or digital asset regulatory law

* At least 2 verified client matters involving SEC Nigeria digital asset licensing or CBN VASP engagement

* Active Nigerian Bar Association registration

* Personal vetting interview with Chimezie Chuta

* Commitment to respond to Klarify referrals within 24 business hours

* Agreed fee transparency — fee ranges published on profile

## **Appendix C — Readiness Score Calculation**

The Readiness Score (0–100) is calculated as a weighted average across 8 dimensions:

| Dimension | Weight | Key Indicators |
| :---- | ----- | :---- |
| **Corporate Structure** | **10%** | CAC registration, correct corporate structure, Nigerian CEO, board composition |
| **Capital & Licensing** | **20%** | Minimum capital deposited, ARIP application status, fidelity bond |
| **KYC Infrastructure** | **15%** | NIN/BVN verification, tiered KYC, EDD procedures for PEPs |
| **AML/CFT Programme** | **20%** | BWRA documented, AML policy in place, NFIU registration, compliance officer appointed |
| **Transaction Monitoring** | **10%** | TM system configured, alert review cadence, STR/CTR filing capability |
| **Regulatory Reporting** | **10%** | goAML portal registered, PEP register maintained, quarterly training delivered |
| **Regulatory Relationships** | **10%** | Regulator contacts logged, pre-screening conducted, communications documented |
| **Product Classification Clarity** | **5%** | Product classified, legal opinion obtained, white paper drafted |

|  |
| :---- |

*KLARIFY · Product Requirements Document · v1.0 · Confidential*

*Blockspace Technologies Limited · Lagos, Nigeria · May 2026*

[image1]: <data:image/png;base64,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>