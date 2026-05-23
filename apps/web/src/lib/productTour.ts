export type TourEngine = 'FounderCounsel' | 'ComplianceOS' | 'Platform';

export interface ProductTourStop {
  id: string;
  title: string;
  engine: TourEngine;
  /** Plain-English plan availability label shown on the tour. */
  planLabel: string;
  imageFile: string;
  description: string;
  highlights: string[];
}

/** Ordered founder journey — dashboard → advisory → operations. */
export const PRODUCT_TOUR_STOPS: ProductTourStop[] = [
  {
    id: 'readiness-score',
    title: 'Regulatory Readiness Score',
    engine: 'ComplianceOS',
    planLabel: 'Free',
    imageFile: 'calculate your Readiness Score.png',
    description:
      'Your live 0–100 compliance gauge across eight weighted dimensions. Updates the moment you complete a roadmap task, upload a document, or close an indicator gap.',
    highlights: [
      'Eight-dimension breakdown with progress bars',
      'Score history chart (30 / 60 / 90 days)',
      'Investor- and board-ready at a glance',
    ],
  },
  {
    id: 'classify',
    title: 'Classify Your Product',
    engine: 'FounderCounsel',
    planLabel: 'Free',
    imageFile: 'Classify Your Product.png',
    description:
      'Describe what you are building in plain language. Klarify classifies your product under Nigerian and African regulatory frameworks and returns your Regulatory Identity Card.',
    highlights: [
      'DAX, DAOP, DAC, DAI, and payment product categories',
      'Primary and secondary regulator mapping',
      'Dual-licence warnings where custody and exchange overlap',
    ],
  },
  {
    id: 'founder-counsel',
    title: 'FounderCounsel',
    engine: 'FounderCounsel',
    planLabel: 'Free (10 queries/mo)',
    imageFile: 'Founder Counsel.png',
    description:
      'Ask any regulatory question and get streaming answers in plain English, grounded in the official corpus with citations to specific sections — not generic chatbot advice.',
    highlights: [
      'Conversation history with citation chips',
      'Personalised to your product type and target markets',
      'Legal disclaimer on every response',
    ],
  },
  {
    id: 'letter-analyser',
    title: 'Regulatory Letter Analyser',
    engine: 'FounderCounsel',
    planLabel: 'Navigator+',
    imageFile: 'Regulatory Letter Analyzer.png',
    description:
      'Upload or paste a regulator letter. Klarify translates formal language into a plain-language summary, urgency level, 72-hour action plan, and a draft acknowledgement response.',
    highlights: [
      'CRITICAL / HIGH / MEDIUM / LOW urgency scoring',
      'Deadline countdown and checkable action steps',
      'Editable draft response with .docx export',
    ],
  },
  {
    id: 'roadmap',
    title: 'Smart Compliance Roadmap',
    engine: 'ComplianceOS',
    planLabel: 'Free',
    imageFile: 'Smart Compliance Roadmap.png',
    description:
      'A personalised four-phase Kanban from corporate foundation through ARIP application and AIP operations. Tasks unlock as you complete each phase.',
    highlights: [
      '33 seed tasks linked to regulatory basis',
      'Phase locking and solicitor blocker on ARIP filing',
      'Task completion syncs to your Readiness Score',
    ],
  },
  {
    id: 'documents',
    title: 'Compliance Document Generator',
    engine: 'ComplianceOS',
    planLabel: 'Navigator (3/mo) · Compass+ unlimited',
    imageFile: 'Compliance Document Generator.png',
    description:
      'Generate regulator-ready AML policies, BWRA, KYC tiering frameworks, ARIP white papers, and more — pre-filled from your org profile and grounded in the regulatory corpus.',
    highlights: [
      '13 templates including four ARIP Framework documents',
      'Version history with .docx and PDF download',
      'TinyMCE editor for customisation before export',
    ],
  },
  {
    id: 'arip',
    title: 'ARIP Application Tracker',
    engine: 'ComplianceOS',
    planLabel: 'Compass+',
    imageFile: 'ARIP Application Tracker.png',
    description:
      'Track your SEC Nigeria ARIP application through all five stages of the June 2024 Framework — from Initial Assessment to Transition to Registration.',
    highlights: [
      'Solicitor-required blocker on Formal Application',
      'Customer growth cap tracker with breach alerts',
      'Auto-created SEC filing calendar on AIP activation',
    ],
  },
  {
    id: 'regulators',
    title: 'Regulator Engagement Hub',
    engine: 'ComplianceOS',
    planLabel: 'Compass+',
    imageFile: 'Regulator Engagement Hub.png',
    description:
      'All seven Nigerian regulators pre-loaded with mandates, contacts, and ARIP programme details. Log every call, email, meeting, and submission in one place.',
    highlights: [
      'Interaction log with follow-up date tracking',
      'CSV export for board and investor reporting',
      'Dashboard alerts for overdue follow-ups',
    ],
  },
  {
    id: 'specialists',
    title: 'Vetted Specialist Network',
    engine: 'FounderCounsel',
    planLabel: 'Compass+',
    imageFile: 'Vetted Specialist Network.png',
    description:
      'When a question needs a qualified human — enforcement situations, criminal liability, complex cross-border structures — request a warm introduction to a vetted regulatory specialist.',
    highlights: [
      'Structured intro request with urgency level',
      'Routed to Klarify specialist network',
      'Complements AI guidance, does not replace legal advice',
    ],
  },
  {
    id: 'billing',
    title: 'Billing & Subscription',
    engine: 'Platform',
    planLabel: 'All plans',
    imageFile: 'Billing & Subscription.png',
    description:
      'Manage your plan, billing cycle, and upgrades in one place. Start free, upgrade when you need document analysis, ARIP tracking, or unlimited AI queries.',
    highlights: [
      'Navigator, Compass, and Flagship tiers',
      'Monthly or annual billing with Korapay checkout',
      'Clear feature gates so you always know what is included',
    ],
  },
];

export function productTourImageSrc(imageFile: string): string {
  return `/product-tour/${encodeURIComponent(imageFile)}`;
}
