// Domain enums — mirror CHECK constraints in apps/api/db/migrations/001_init.sql.

export type ProductType = 'DAX' | 'DAOP' | 'DAC' | 'DAI' | 'PAYMENT' | 'HYBRID';

export type TargetMarket = 'NG' | 'GH' | 'KE' | 'ZA' | 'MU';

export type FounderStage = 'idea' | 'building' | 'launched' | 'arip' | 'licensed';

export type OrgMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export type RoadmapTaskStatus = 'not_started' | 'in_progress' | 'complete' | 'blocked';

export type RoadmapPhase = 1 | 2 | 3 | 4;

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type DocumentTemplateId =
  | 'BWRA'
  | 'AML_POLICY'
  | 'KYC_TIERS'
  | 'TOKEN_MEMO'
  | 'ARIP_WHITEPAPER'
  | 'STR_TEMPLATE'
  | 'PEP_REGISTER'
  | 'CO_APPOINTMENT'
  | 'REG_BRIEF';

export type AripStage =
  | 'pre_screening'
  | 'initial_assessment'
  | 'eligibility'
  | 'formal_app'
  | 'aip'
  | 'aip_operations'
  | 'full_registration';

export type AripLicenceType = 'DAX' | 'DAOP' | 'DAC' | 'DAI';

export type InteractionType = 'call' | 'email' | 'meeting' | 'submission' | 'letter';

export type ComplianceEventType =
  | 'STR_FILING'
  | 'CTR_FILING'
  | 'PEP_REGISTER'
  | 'QUARTERLY_TRAINING'
  | 'BWRA_REVIEW'
  | 'ARIP_DEADLINE'
  | 'CUSTOM';

export type Recurrence = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

export type MessageRole = 'user' | 'assistant' | 'system';

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';
