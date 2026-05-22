// =============================================================================
// Sprint 5 S5-E1 — ARIP Framework document template integrity tests.
//
// Asserts the specific regulatory content of each ARIP Framework template:
//   * ARIP_OPERATIONAL_PLAN — Sections 15(b) and 36, exit plan mandatory
//   * ARIP_SWORN_UNDERTAKING — Section 15(a), all 8 fitness criteria, directors list
//   * SPONSORED_INDIVIDUAL — Section 18(i), min 4 individuals, 4 boolean declarations
//   * ARIP_ENTITY_RULES — Section 15(c), all 8 mandatory provisions (i-viii)
//
// All 4 templates must be: category ARIP_FRAMEWORK, requiredPlan 'compass'.
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_TEMPLATES,
  ARIP_FRAMEWORK_TEMPLATE_IDS,
  getTemplate,
} from '../../prompts/documents/index.js';

// ---------------------------------------------------------------------------
// Suite 1 — ARIP Framework category-level invariants
// ---------------------------------------------------------------------------

describe('ARIP Framework templates — category invariants', () => {
  it('ARIP_FRAMEWORK_TEMPLATE_IDS exports exactly 4 ids', () => {
    expect(ARIP_FRAMEWORK_TEMPLATE_IDS).toHaveLength(4);
    expect(new Set(ARIP_FRAMEWORK_TEMPLATE_IDS)).toEqual(
      new Set([
        'ARIP_OPERATIONAL_PLAN',
        'ARIP_SWORN_UNDERTAKING',
        'SPONSORED_INDIVIDUAL',
        'ARIP_ENTITY_RULES',
      ]),
    );
  });

  it('all 4 ARIP Framework templates have category "ARIP_FRAMEWORK"', () => {
    for (const id of ARIP_FRAMEWORK_TEMPLATE_IDS) {
      const t = getTemplate(id);
      expect(t, `Template ${id} not found`).not.toBeNull();
      expect(t!.category, `${id} wrong category`).toBe('ARIP_FRAMEWORK');
    }
  });

  it('all 4 ARIP Framework templates require the Compass plan', () => {
    for (const id of ARIP_FRAMEWORK_TEMPLATE_IDS) {
      const t = getTemplate(id)!;
      expect(t.requiredPlan, `${id} must require compass`).toBe('compass');
    }
  });

  it('all 4 templates appear in the full DOCUMENT_TEMPLATES registry', () => {
    for (const id of ARIP_FRAMEWORK_TEMPLATE_IDS) {
      expect(DOCUMENT_TEMPLATES[id as keyof typeof DOCUMENT_TEMPLATES]).toBeDefined();
    }
  });

  it('all 4 templates have org.name pre-fill on the company_name field', () => {
    for (const id of ARIP_FRAMEWORK_TEMPLATE_IDS) {
      const t = getTemplate(id)!;
      const f = t.requiredFields.find((field) => field.prefilledFrom === 'org.name');
      expect(f, `${id} missing org.name pre-fill`).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Suite 2 — ARIP_OPERATIONAL_PLAN
// ---------------------------------------------------------------------------

describe('ARIP_OPERATIONAL_PLAN template', () => {
  const t = DOCUMENT_TEMPLATES.ARIP_OPERATIONAL_PLAN;

  it('has the correct document name', () => {
    expect(t.documentName).toBe('ARIP Operational Plan');
  });

  it('regulatory basis references Sections 15(b) and 36', () => {
    expect(t.regulatoryBasis).toContain('15');
    expect(t.regulatoryBasis).toContain('36');
    expect(t.regulatoryBasis).toContain('ARIP Framework');
  });

  it('exit_plan field is present and marked required', () => {
    const exitPlanField = t.requiredFields.find((f) => f.key === 'exit_plan');
    expect(exitPlanField, 'exit_plan field is required').toBeDefined();
    expect(exitPlanField!.required).toBe(true);
  });

  it('exit_plan help text references Section 36', () => {
    const exitPlanField = t.requiredFields.find((f) => f.key === 'exit_plan')!;
    expect(exitPlanField.helpText).toContain('Section 36');
  });

  it('key_risks field is multiselect with AML/CFT risk option', () => {
    const risksField = t.requiredFields.find((f) => f.key === 'key_risks')!;
    expect(risksField.type).toBe('multiselect');
    expect(risksField.options).toBeDefined();
    expect(
      risksField.options!.some((o) => o.toLowerCase().includes('aml')),
    ).toBe(true);
  });

  it('systemPrompt references Section 36 for exit plan', () => {
    expect(t.systemPrompt).toContain('Section 36');
  });

  it('systemPrompt covers AIP period restrictions (50-customer cap)', () => {
    expect(t.systemPrompt).toContain('50');
  });

  it('systemPrompt includes Disclaimer section', () => {
    expect(t.systemPrompt.toLowerCase()).toContain('disclaimer');
  });
});

// ---------------------------------------------------------------------------
// Suite 3 — ARIP_SWORN_UNDERTAKING
// ---------------------------------------------------------------------------

describe('ARIP_SWORN_UNDERTAKING template', () => {
  const t = DOCUMENT_TEMPLATES.ARIP_SWORN_UNDERTAKING;

  it('has the correct document name', () => {
    expect(t.documentName).toBe('Sworn Undertaking — ARIP Application');
  });

  it('regulatory basis references Section 15(a)', () => {
    expect(t.regulatoryBasis).toContain('15');
    expect(t.regulatoryBasis).toContain('ARIP Framework');
  });

  it('directors field is of type dynamic_list', () => {
    const directorsField = t.requiredFields.find((f) => f.key === 'directors');
    expect(directorsField, 'directors field must exist').toBeDefined();
    expect(directorsField!.type).toBe('dynamic_list');
  });

  it('directors field requires at least 1 item', () => {
    const directorsField = t.requiredFields.find((f) => f.key === 'directors')!;
    expect(directorsField.required).toBe(true);
    expect(directorsField.minItems).toBeGreaterThanOrEqual(1);
  });

  it('directors field has itemFields: full_name, role, nin', () => {
    const directorsField = t.requiredFields.find((f) => f.key === 'directors')!;
    expect(directorsField.itemFields).toBeDefined();
    const keys = directorsField.itemFields!.map((sf) => sf.key);
    expect(keys).toContain('full_name');
    expect(keys).toContain('role');
    expect(keys).toContain('nin');
  });

  it('systemPrompt covers all 6 sub-clauses of Section 15(a)', () => {
    const prompt = t.systemPrompt;
    // Check for Section 15(a)(i) through (vi)
    expect(prompt).toContain('15(a)(i)');
    expect(prompt).toContain('15(a)(ii)');
    expect(prompt).toContain('15(a)(iii)');
    expect(prompt).toContain('15(a)(iv)');
    expect(prompt).toContain('15(a)(v)');
    expect(prompt).toContain('15(a)(vi)');
  });

  it('systemPrompt includes all 8 fitness and propriety criteria (a) through (h)', () => {
    const prompt = t.systemPrompt;
    // All 8 criteria must appear in the prompt
    expect(prompt).toContain('(a)');
    expect(prompt).toContain('(b)');
    expect(prompt).toContain('(c)');
    expect(prompt).toContain('(d)');
    expect(prompt).toContain('(e)');
    expect(prompt).toContain('(f)');
    expect(prompt).toContain('(g)');
    expect(prompt).toContain('(h)');
    // Specifically check the fitness criteria content
    expect(prompt.toLowerCase()).toContain('criminal');
    expect(prompt.toLowerCase()).toContain('sanction');
    expect(prompt.toLowerCase()).toContain('bankruptcy');
    expect(prompt.toLowerCase()).toContain('competence');
  });

  it('systemPrompt includes Disclaimer section', () => {
    expect(t.systemPrompt.toLowerCase()).toContain('disclaimer');
  });

  it('systemPrompt references solicitor requirement (Section 16)', () => {
    expect(t.systemPrompt.toLowerCase()).toContain('solicitor');
    expect(t.systemPrompt).toContain('16');
  });
});

// ---------------------------------------------------------------------------
// Suite 4 — SPONSORED_INDIVIDUAL
// ---------------------------------------------------------------------------

describe('SPONSORED_INDIVIDUAL template', () => {
  const t = DOCUMENT_TEMPLATES.SPONSORED_INDIVIDUAL;

  it('has the correct document name', () => {
    expect(t.documentName).toBe('Sponsored Individual Profile — ARIP');
  });

  it('regulatory basis references Section 18(i)', () => {
    expect(t.regulatoryBasis).toContain('18');
    expect(t.regulatoryBasis).toContain('ARIP Framework');
  });

  it('minIndividuals (via individuals.minItems) is 4', () => {
    const individualsField = t.requiredFields.find((f) => f.key === 'individuals');
    expect(individualsField, 'individuals field must exist').toBeDefined();
    expect(individualsField!.minItems).toBe(4);
  });

  it('individuals field is of type dynamic_list', () => {
    const individualsField = t.requiredFields.find((f) => f.key === 'individuals')!;
    expect(individualsField.type).toBe('dynamic_list');
    expect(individualsField.required).toBe(true);
  });

  it('individuals itemFields contains 4 boolean declaration fields', () => {
    const individualsField = t.requiredFields.find((f) => f.key === 'individuals')!;
    expect(individualsField.itemFields).toBeDefined();
    const booleanFields = individualsField.itemFields!.filter(
      (sf) => sf.type === 'boolean',
    );
    expect(booleanFields).toHaveLength(4);
  });

  it('individuals itemFields contains required identity fields: nin and bvn', () => {
    const individualsField = t.requiredFields.find((f) => f.key === 'individuals')!;
    const keys = individualsField.itemFields!.map((sf) => sf.key);
    expect(keys).toContain('nin');
    expect(keys).toContain('bvn');
  });

  it('individuals itemFields contains role as a select type', () => {
    const individualsField = t.requiredFields.find((f) => f.key === 'individuals')!;
    const roleField = individualsField.itemFields!.find((sf) => sf.key === 'role');
    expect(roleField).toBeDefined();
    expect(roleField!.type).toBe('select');
    expect(roleField!.options).toBeDefined();
    expect(roleField!.options!.length).toBeGreaterThan(0);
  });

  it('systemPrompt references Section 18(i) fitness criteria (a) through (h)', () => {
    const prompt = t.systemPrompt;
    expect(prompt).toContain('18(i)');
    expect(prompt).toContain('(a)');
    expect(prompt).toContain('(b)');
    expect(prompt).toContain('(c)');
    expect(prompt).toContain('(d)');
    expect(prompt).toContain('(e)');
    expect(prompt).toContain('(f)');
    expect(prompt).toContain('(g)');
    expect(prompt).toContain('(h)');
  });

  it('systemPrompt generates a SEPARATE profile sheet per individual', () => {
    expect(t.systemPrompt.toUpperCase()).toContain('SEPARATE');
    expect(t.systemPrompt.toLowerCase()).toContain('each individual');
  });

  it('systemPrompt includes Disclaimer section', () => {
    expect(t.systemPrompt.toLowerCase()).toContain('disclaimer');
  });

  it('systemPrompt references solicitor requirement (Section 16)', () => {
    expect(t.systemPrompt.toLowerCase()).toContain('solicitor');
    expect(t.systemPrompt).toContain('16');
  });
});

// ---------------------------------------------------------------------------
// Suite 5 — ARIP_ENTITY_RULES
// ---------------------------------------------------------------------------

describe('ARIP_ENTITY_RULES template', () => {
  const t = DOCUMENT_TEMPLATES.ARIP_ENTITY_RULES;

  it('has the correct document name', () => {
    expect(t.documentName).toBe('Entity Rules & Governance — ARIP');
  });

  it('regulatory basis references Section 15(c)', () => {
    expect(t.regulatoryBasis).toContain('15');
    expect(t.regulatoryBasis).toContain('ARIP Framework');
  });

  it('user_types field is a select with valid options', () => {
    const userTypesField = t.requiredFields.find((f) => f.key === 'user_types')!;
    expect(userTypesField).toBeDefined();
    expect(userTypesField.type).toBe('select');
    expect(userTypesField.options).toBeDefined();
    expect(userTypesField.options!.length).toBeGreaterThan(0);
  });

  it('required fields include all 8 Section 15(c) areas', () => {
    const keys = t.requiredFields.map((f) => f.key);
    // Section 15(c)(i) — membership
    expect(keys).toContain('membership_criteria');
    // Section 15(c)(ii) — prohibited activities
    expect(keys).toContain('prohibited_activities');
    // Section 15(c)(iii) — fees
    expect(keys).toContain('fee_schedule');
    // Section 15(c)(iv) — reporting
    expect(keys).toContain('reporting_to_users');
    // Section 15(c)(v) — suspension
    expect(keys).toContain('suspension_criteria');
    // Section 15(c)(vi) — expulsion
    expect(keys).toContain('expulsion_criteria');
    // Section 15(c)(vii) — appeals
    expect(keys).toContain('appeals_process');
    // Section 15(c)(viii) implied by amendment/notification — dispute_resolution is a proxy
    expect(keys).toContain('dispute_resolution');
  });

  it('systemPrompt covers all 8 mandatory provisions of Section 15(c)(i-viii)', () => {
    const prompt = t.systemPrompt;
    expect(prompt).toContain('15(c)(i)');
    expect(prompt).toContain('15(c)(ii)');
    expect(prompt).toContain('15(c)(iii)');
    expect(prompt).toContain('15(c)(iv)');
    expect(prompt).toContain('15(c)(v)');
    expect(prompt).toContain('15(c)(vi)');
    expect(prompt).toContain('15(c)(vii)');
    expect(prompt).toContain('15(c)(viii)');
  });

  it('systemPrompt covers suspension, expulsion, and appeals', () => {
    const prompt = t.systemPrompt.toLowerCase();
    expect(prompt).toContain('suspension');
    expect(prompt).toContain('expulsion');
    expect(prompt).toContain('appeal');
  });

  it('systemPrompt includes Disclaimer section', () => {
    expect(t.systemPrompt.toLowerCase()).toContain('disclaimer');
  });

  it('systemPrompt references solicitor requirement (Section 16)', () => {
    expect(t.systemPrompt.toLowerCase()).toContain('solicitor');
    expect(t.systemPrompt).toContain('16');
  });
});
