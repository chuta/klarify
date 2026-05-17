  
**KLARIFY**

*Navigate Regulated Markets with Confidence*

| PRODUCT REQUIREMENTS DOCUMENT MVP Specification v1.0 *Confidential — For Development Team Use* |
| :---: |

Prepared by Chimezie Chuta

Blockspace Technologies Limited

Lagos, Nigeria · May 2026

# **1\. Executive Summary**

Klarify is an AI-powered regulatory advisory and compliance operating system built specifically for founders, operators, legal professionals, and corporate innovation teams building digital asset and fintech products in African regulated markets.

The product bundles two capabilities into a single, unified platform:

* FounderCounsel — an AI advisory engine that answers regulatory questions, analyses regulatory documents, classifies products, and guides crisis response in plain language

* ComplianceOS — an operational compliance management system that tracks readiness, generates documents, manages ARIP/licensing workflows, and enforces compliance cadence

Klarify is the direct software companion to The Founder's Guide to Building in Regulated Markets by Chimezie Chuta, translating the book's frameworks, checklists, and institutional knowledge into an always-available, interactive platform.

| THE CORE PROBLEM KLARIFY SOLVES African founders building in regulated markets face a recurring, expensive, and often business-ending gap: they do not know what they do not know. They build for months before discovering their product requires a licence. They receive a regulator's letter and do not understand it. They have compliance manuals that nobody follows. They pay lawyers who lack specialised digital asset regulatory expertise. Klarify closes this gap — permanently, affordably, and at scale. |
| :---- |

## **1.1 Product Vision**

Klarify becomes the default regulatory intelligence and compliance infrastructure layer for every African digital asset company — the tool founders open before they write a line of code and keep open for the entire regulated life of their business.

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

I describe my product in plain language — what it does, how users interact with it, how I make money — and I want Klarify to tell me which regulatory category it falls under, which Nigerian regulators have jurisdiction over it, what licences I need to operate legally, and what happens if I launch without those licences.

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

I want to upload the letter and immediately understand in plain language: what is being asked of me, why the regulator sent it, how serious it is, what I must do in the next 72 hours, and what a draft acknowledgment response looks like — without waiting for a lawyer appointment.

**Pain point (from the book):**

'He read it four times. Then he called his lawyer. His lawyer read it twice and said: I think you should pause everything. That was the full extent of the advice.' The regulatory notice that could have been resolved in a fortnight consumed six weeks and nearly ended the business because no one could read it correctly.

**Acceptance Criteria:**

* User uploads PDF, image (JPG/PNG), or pastes raw text of a regulatory document

* AI performs OCR if image is uploaded, then analyses content

* Output panel contains: Plain Language Summary, Urgency Level (Low / Medium / High / Critical) with colour coding, Key Regulatory Ask (what the regulator specifically wants), Deadline Tracker (days remaining with countdown), 72-Hour Action Plan (numbered steps), and Draft Acknowledgment Response (editable, formatted for submission)

* Urgency level is visually prominent — red for Critical, amber for High

* Draft response is exportable as a Word document

* AI clearly states: 'This analysis is not legal advice. Review this with a qualified specialist before submission.'

* User can ask follow-up questions about any part of the output

| US-003 · REGULATORY Q\&A ENGINE  |
| :---- |

**As a founder at any stage,**

I want to ask Klarify any question about Nigerian or African digital asset regulation in plain English — at any time of day — and receive a clear, accurate, cited, actionable answer that does not require me to read 40 pages of regulatory text or wait three days for a lawyer to respond.

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

* Phase 3 tasks are locked until Phase 2 is complete — ARIP application cannot succeed without compliance infrastructure in place

* User can adjust task owners, due dates, and add custom tasks

* Team members receive email/in-app notifications for assigned tasks

* Roadmap auto-adjusts when user updates their product type or target market

**PHASE 3 TASK LIBRARY — ARIP Application (source: ARIP Framework, June 2024):**

These 11 tasks are pre-loaded into Phase 3 for all Nigerian VASP product types. Regulatory basis cited for each.

* P3-01: Engage a registered solicitor or adviser | Basis: Section 16, ARIP Framework | CRITICAL BLOCKER — nothing else in Phase 3 proceeds without this. Application MUST be filed through a registered solicitor or adviser. Cannot be self-filed. Effort: 1–2 weeks.

* P3-02: Verify M\&A includes VASP powers | Basis: Section 18ii(b), ARIP Framework | M\&A must specifically include the power to perform the specified VASP function. Generic M\&A from CAC is often insufficient. May require CAC amendment. Effort: Legal review \+ up to 4 weeks if amendment needed.

* P3-03: Appoint minimum 4 sponsored individuals | Basis: Section 18i, ARIP Framework | Must include MD and Compliance Officer. All must complete fitness and propriety declarations. All must have NIN and BVN verified and ready. File via Form SEC 2 and 2D. Effort: 1–2 weeks.

* P3-04: Obtain Tax Clearance Certificate | Basis: Section 18iv, ARIP Framework | Often overlooked — new companies may not have this. Must be current at time of application. Obtained from FIRS. Effort: 2–4 weeks.

* P3-05: Draft complete Operational Plan including exit plan | Basis: Section 15b \+ Section 36, ARIP Framework | Must include risk management framework, investor protection measures, data protection measures, customer communication strategy, and a mandatory exit plan describing how customer obligations will be fulfilled if registration is not achieved. Use Klarify template: ARIP\_OPERATIONAL\_PLAN. Effort: 1–2 weeks.

* P3-06: Prepare ARIP Sworn Undertaking for all officers | Basis: Section 15a, ARIP Framework | Covers all directors, CEO, controller, and key officers. Each person must make individual declarations. Use Klarify template: ARIP\_SWORN\_UNDERTAKING. Effort: 3–5 days per person.

* P3-07: Obtain No Objection from other regulators if applicable | Basis: Section 17, ARIP Framework | Required if regulated by another sectoral regulator (e.g. CBN, NAICOM, NCC). If product touches payment rails, CBN No Objection may be required before SEC ARIP application. Effort: 4–8 weeks — plan this early.

* P3-08: Prepare Entity Rules and Governance Framework | Basis: Section 15c, ARIP Framework | 8 mandatory provisions. Use Klarify template: ARIP\_ENTITY\_RULES. Effort: 3–5 days.

* P3-09: Submit Initial Assessment via SEC ePortal | Basis: Section 8, ARIP Framework | URL: https://home.sec.gov.ng — This is Stage 1 only, not the full application. Await eligibility notification before proceeding to Stage 3 formal application. Contact: innovation@sec.gov.ng. SEC Innovation Office: Tuesdays and Thursdays 10am–2pm only. Effort: 1 day.

* P3-10: Record customer baseline count on day AIP is received | Basis: Section 29d, ARIP Framework | CRITICAL — The 10% customer growth cap is measured from the exact date AIP is received. Record the exact customer count that day in the Klarify ARIP tracker. This number cannot be reconstructed later. Effort: 1 hour — must be done on the day of AIP receipt.

* P3-11: Brief entire team on AIP restrictions | Basis: Section 29, ARIP Framework | The promotional ban applies to ALL team members — marketing, sales, and customer success must know they cannot run campaigns, send mass emails, or solicit new customers for the entire AIP duration. Violations can result in AIP withdrawal. Effort: 1 team session.

| US-008 · COMPLIANCE DOCUMENT GENERATOR  |
| :---- |

**As a compliance officer or founder building a compliance programme,**

I want Klarify to generate first-draft versions of the regulatory documents my business needs — calibrated to Nigerian standards — so I am not starting from a blank page, and the structure is already correct before I add my specifics.

**Pain point (from the book):**

'The NFIU and SEC Nigeria both require that the compliance officer be a person of sufficient seniority, independence, and expertise... The compliance programme that requires a data analyst to spend three days extracting data every time a report is due is not a compliance programme.'

**Documents available in MVP:**

**ORIGINAL 9 TEMPLATES (Sprint 4):**

* Business-Wide Risk Assessment (BWRA) — structured to NFIU requirements

* AML/CFT Policy Manual — MLPPA 2022 compliant

* KYC Tiering Framework — with NIN/BVN verification tiers

* Token Classification Legal Memo — structured for SEC Nigeria submission

* ARIP White Paper Outline — pre-structured to SEC Nigeria's assessed standard

* STR Filing Template — goAML format

* PEP Register Template — NFIU monthly submission format

* Compliance Officer Appointment Letter

* Regulator Engagement Brief — one-page briefing document for first regulator meeting

**NEW — 4 ARIP FRAMEWORK TEMPLATES (Sprint 5, source: ARIP Framework June 2024):**

* ARIP Operational Plan (Sections 15b \+ 36\) — Full business description, technology stack, target customers, risk management framework with key risks and mitigations, insurance cover, investor and data protection measures, customer communication strategy, customer risk disclosure plan, and EXIT PLAN if registration not achieved (mandatory — must describe how customer obligations will be fulfilled if registration fails)

* Sworn Undertaking — ARIP Application (Section 15a) — All 6 sub-clauses including fitness and propriety declarations for applicant, all directors, CEO, controllers, and all persons primarily responsible for operations or financial management. Covers all 8 fitness criteria from Section 15a(v)(a-h).

* Sponsored Individual Profile — Form SEC 2/2D (Section 18i) — One profile per individual, minimum 4 required including MD and Compliance Officer. Fields: full name, NIN, BVN, role, responsibilities, experience, and all fitness and propriety declarations re: convictions, sanctions, and professional conduct.

* Entity Rules and Governance Framework (Section 15c) — 8 mandatory provisions: (i) investor and public protection, (ii) proper entity functioning, (iii) fairness and transparency, (iv) conflict of interest management, (v) user fair treatment, (vi) platform host fair treatment, (vii) user regulation, supervision, and expulsion procedures, (viii) appeals process against entity decisions.

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

| SOURCE: ARIP Framework (SEC Nigeria, June 2024\) — Sections 7–14, 20, 29, 37 All stage names, document requirements, fees, restrictions, and transition outcomes in this user story are sourced directly from the official ARIP Framework. Never change these details without verifying against the current framework. |
| :---- |

**Acceptance Criteria:**

* ARIP Tracker is a distinct workflow within ComplianceOS, accessible from the Regulators section

**CORRECT 5-STAGE WORKFLOW (Sections 7–14, ARIP Framework):**

* Stage 1 — INITIAL ASSESSMENT: Submit Initial Assessment Form via SEC ePortal (home.sec.gov.ng). Status: not\_started | submitted | under\_review | complete

* Stage 2 — ELIGIBILITY NOTIFICATION: SEC reviews and notifies eligibility. Status: awaiting | eligible | ineligible | deferred. Note: SEC may defer — tracker must handle this state.

* Stage 3 — FORMAL APPLICATION: Full application filed. CRITICAL BLOCKER displayed prominently: Application MUST be filed through a registered solicitor or adviser (Section 16\) — the applicant cannot self-file. Status: not\_started | in\_preparation | submitted. Fee: ₦2,000,000 non-refundable via REVOP.

* Stage 4 — AIP (APPROVAL-IN-PRINCIPLE): Operating under AIP. Restrictions tracker active (see below). Status: not\_yet | received | active | expired

* Stage 5 — TRANSITION TO REGISTRATION: Three possible outcomes (Section 37): (a) Full registration granted, (b) New regulations adopted for the business model, (c) Registration denied. Status: in\_progress | registration\_granted | new\_regs\_adopted | denied

**Stage 3 document checklist (Section 18, ARIP Framework):**

* □ Form SEC 2 and 2D — minimum FOUR sponsored individuals including MD and Compliance Officer

* □ Certificate of Incorporation — original to be sighted

* □ M\&A — must specifically include power to perform the specified VASP function

* □ CAC Forms: Share Capital, Return of Allotment, Particulars of Directors

* □ Latest audited accounts / audited statement of affairs

* □ Tax Identification Number

* □ Tax Clearance Certificate

* □ Valid ID (NIN \+ BVN) for ALL sponsored individuals

* □ Sworn undertaking — orderly, fair, transparent market

* □ Evidence of NFIU registration

* □ Sworn undertaking — records and returns

* □ Sworn undertaking — SEC Rules compliance

* □ Operational Plan including exit plan

* □ Sworn Undertaking — fitness and propriety for all officers

* □ No Objection letter from other regulators (if applicable — Section 17\)

**AIP Period — restrictions tracker (Section 29, ARIP Framework):**

* Prominent amber warning widget active for entire AIP period

* Restriction 1: ⛔ Cannot conduct business outside stated operational plan

* Restriction 2: ⛔ Cannot run ANY promotional activities — no ads, campaigns, mass emails, social media growth. Applies to ALL electronic communications, public and private.

* Restriction 3: ⛔ Cannot provide incomplete or misleading information

* Restriction 4: ⛔ Customer base cannot grow more than 10% from AIP entry date

**10% Customer Growth Cap tracker (Section 29d, ARIP Framework):**

* User records exact customer count on the day AIP is received — this is the baseline (arip\_entry\_customer\_count)

* User updates current customer count regularly (current\_customer\_count)

* Tracker calculates growth %: ((current \- baseline) / baseline) × 100

* Amber alert at 8% growth: 'You are approaching the 10% customer growth limit'

* Red critical at 10% growth: 'You have reached the AIP customer growth cap. You must pause all customer acquisition immediately.'

* Growth cap breach logged to arip\_restrictions\_log table

**Compliance calendar (AIP period — Section 21, ARIP Framework):**

* WEEKLY: Trading statistics submission to SEC

* MONTHLY: Full trading statistics and all monthly reporting requirements

* QUARTERLY: Financial statements \+ compliance reports demonstrating compliance with all SEC ARIP conditions

* INCIDENT: Log and report any misconduct, fraud, or operational incidents as they occur

* All calendar events trigger alerts at 14 days, 7 days, and 24 hours before deadline

**Additional acceptance criteria:**

* Each stage shows % completion with a progress bar

* User can log every communication with SEC Nigeria Innovation Office

* SEC Innovation Office hours displayed: Tuesdays and Thursdays, 10:00am – 2:00pm

* ARIP contact emails shown: innovation@sec.gov.ng and fintech@sec.gov.ng

* Processing fee tracker: ₦2,000,000 with payment status and REVOP reference field

* Fidelity bond tracker: shows coverage %, insurer, expiry date (must be ≥ 25% of shareholder fund)

* Solicitor/adviser field: name, firm, email — required before Stage 3 can be marked started

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
| **Database** | PostgreSQL (primary) \+ Redis (cache) | User data, compliance state, conversation history. Redis for session \+ rate limiting. |
| **Document Storage** | AWS S3 or Cloudflare R2 | Uploaded regulatory documents, generated .docx/.pdf files. |
| **Document Generation** | docx.js (Word) \+ PDFKit (PDF) | Server-side generation of all compliance documents. |
| **OCR** | AWS Textract or Google Cloud Vision | For regulatory letter/document uploads as images. |
| **Authentication** | NextAuth.js or Supabase Auth | Email/password \+ Google OAuth. Magic link support. |
| **Email** | Resend or SendGrid | Deadline alerts, task assignments, weekly digests. |
| **Hosting** | Vercel (frontend) \+ Railway or Render (backend) | Low-ops deployment. Scales with usage. |
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
| **📊 Compliance ComplianceOS** | Compliance | All 8 readiness dimensions, document library, generated documents, version history |
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