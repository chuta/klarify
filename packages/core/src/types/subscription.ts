// CLAUDE.md §10 — Subscription tiers. DO NOT modify without product owner sign-off (§18).

export type Plan = 'free' | 'navigator' | 'compass' | 'flagship';

export type BillingCycle = 'monthly' | 'annual';

export interface PlanLimits {
  readonly ai_queries_monthly: number;
  readonly document_analyses: number;
  readonly document_templates: number;
  readonly jurisdictions: number;
  readonly team_seats: number;
  readonly arip_tracker: boolean;
  readonly regulator_crm: boolean;
  readonly scenario_simulator: boolean;
  readonly human_escalation: boolean | 'priority';
  readonly compliance_export: false | 'pdf' | 'full';
  readonly api_access: boolean;
}

export const PLAN_LIMITS: Readonly<Record<Plan, PlanLimits>> = {
  free: {
    ai_queries_monthly: 10,
    document_analyses: 0,
    document_templates: 0,
    jurisdictions: 1,
    team_seats: 1,
    arip_tracker: false,
    regulator_crm: false,
    scenario_simulator: false,
    human_escalation: false,
    compliance_export: false,
    api_access: false,
  },
  navigator: {
    ai_queries_monthly: 50,
    document_analyses: 5,
    document_templates: 3,
    jurisdictions: 1,
    team_seats: 1,
    arip_tracker: false,
    regulator_crm: false,
    scenario_simulator: false,
    human_escalation: false,
    compliance_export: false,
    api_access: false,
  },
  compass: {
    ai_queries_monthly: Infinity,
    document_analyses: Infinity,
    document_templates: Infinity,
    jurisdictions: 2,
    team_seats: 5,
    arip_tracker: true,
    regulator_crm: true,
    scenario_simulator: true,
    human_escalation: true,
    compliance_export: 'pdf',
    api_access: false,
  },
  flagship: {
    ai_queries_monthly: Infinity,
    document_analyses: Infinity,
    document_templates: Infinity,
    jurisdictions: Infinity,
    team_seats: Infinity,
    arip_tracker: true,
    regulator_crm: true,
    scenario_simulator: true,
    human_escalation: 'priority',
    compliance_export: 'full',
    api_access: true,
  },
};

export const PLAN_PRICING: Readonly<Record<Exclude<Plan, 'free'>, { monthly: number; annual: number }>> = {
  navigator: { monthly: 29, annual: 278 },
  compass: { monthly: 99, annual: 950 },
  flagship: { monthly: 299, annual: 2870 },
};
