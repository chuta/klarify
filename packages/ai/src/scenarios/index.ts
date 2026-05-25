// US-005 — Scenario Simulator public surface (Sprint 6).

export {
  SCENARIO_TEMPLATES,
  SCENARIO_TEMPLATE_IDS,
  getScenarioTemplate,
  type ScenarioTemplate,
  type ScenarioTemplateId,
} from '@klarify/core';

export type {
  ScenarioResult,
  ScenarioOutcome,
  ScenarioOutcomeLabel,
  ScenarioProbability,
  ScenarioAnalysisRecord,
} from '@klarify/core';

export { SCENARIO_DISCLAIMER } from '@klarify/core';

export { KLARIFY_SCENARIO_PROMPT } from '../prompts/scenario.js';
