// =============================================================================
// Sprint 4 — Compliance Document Generator (US-008) template types.
//
// New types live here (not added to existing §18-protected prompts/index.ts)
// so the surface for document generation is explicit and easy to audit.
// =============================================================================

/** Template identifier — one of the 9 templates in CLAUDE.md §14. */
export type TemplateId =
  | 'BWRA'
  | 'AML_POLICY'
  | 'KYC_TIERS'
  | 'TOKEN_MEMO'
  | 'ARIP_WHITEPAPER'
  | 'STR_TEMPLATE'
  | 'PEP_REGISTER'
  | 'CO_APPOINTMENT'
  | 'REG_BRIEF';

/** Sidebar category used to group templates in the library UI (CLAUDE.md S4-B2). */
export type TemplateCategory =
  | 'AML_CFT'
  | 'KYC'
  | 'LICENSING'
  | 'ARIP'
  | 'OTHER';

/**
 * A single form field on a template. The library UI renders these
 * field-by-field, the API validates the submitted payload against them
 * via a dynamically-built Zod schema (see `apps/api/src/services/documentGeneration.ts`).
 */
export interface DocumentField {
  /** Stable machine key — the JSON key in the submitted formData. */
  readonly key: string;
  /** Human label shown above the input. */
  readonly label: string;
  /** Input kind. The web form renders different widgets per type. */
  readonly type:
    | 'text'
    | 'textarea'
    | 'select'
    | 'multiselect'
    | 'date'
    | 'boolean';
  /** Whether the field MUST be supplied for generation to proceed. */
  readonly required: boolean;
  /** Plain-English help text below the field (collapsible tooltip). */
  readonly helpText: string;
  /** Options for `select` and `multiselect`. */
  readonly options?: readonly string[];
  /**
   * Dot-path on the runtime prefill context built by
   * `apps/api/src/services/documentGeneration.ts`. Currently supported:
   *
   *   * `org.name`              → Organisation.name
   *   * `org.plan`              → Organisation.plan
   *   * `user.name`             → User.name
   *   * `user.email`            → User.email
   *   * `profile.productTypes`  → UserProfile.productTypes (string[])
   *   * `profile.targetMarkets` → UserProfile.targetMarkets (string[])
   *   * `profile.stage`         → UserProfile.stage
   *   * `profile.teamSize`      → UserProfile.teamSize (number)
   *   * `today`                 → today's date in YYYY-MM-DD (UTC)
   *
   * Anything else is treated as "not pre-filled" by the resolver; the
   * resolver test (`prefilledFromPathsExist`) keeps us honest.
   */
  readonly prefilledFrom?: string;
}

/** The full template definition consumed by the generator service + UI. */
export interface DocumentTemplate {
  readonly templateId: TemplateId;
  readonly documentName: string;
  /**
   * CLAUDE.md §14 regulatory basis — verbatim. Used as the document footer
   * AND surfaced in the library card so users always see what authority
   * underwrites the document they're about to generate.
   */
  readonly regulatoryBasis: string;
  /** Sidebar category for the library UI. */
  readonly category: TemplateCategory;
  /** Form fields, rendered in array order. */
  readonly requiredFields: readonly DocumentField[];
  /**
   * Claude system prompt for this template. Built to:
   *   * Identify the document type + regulatory authority.
   *   * Cite the regulatory basis (CLAUDE.md §16 Rule 5).
   *   * Mandate plain Nigerian English.
   *   * Mandate the legal disclaimer at the end (CLAUDE.md §16 Rule 1).
   *   * Forbid placeholder text like `[INSERT X HERE]`.
   *
   * The base Klarify system prompt is NOT prepended — document generation
   * is a different surface to the chat / classify flows. Use this prompt
   * verbatim. The RAG context block is appended separately by the service.
   */
  readonly systemPrompt: string;
  /** Final instructions appended to the user message. Standardised across templates. */
  readonly outputInstructions: string;
}

/** The standard tail appended to every template `outputInstructions`. */
export const STANDARD_OUTPUT_INSTRUCTIONS = `Produce the document in markdown.

FORMAT RULES (all mandatory):
1. Use \`##\` for top-level section headings. Use \`###\` for sub-headings.
2. Write usable first-draft prose using the supplied form data. Never emit
   placeholder text like \`[INSERT X HERE]\`, \`[TBD]\`, \`[Company Name]\`, or
   square-bracket fill-ins of any kind. If a field is missing, write the
   most reasonable default given the available context.
3. Where you make a regulatory claim, cite the specific source inline in
   prose, e.g. "Under MLPPA 2022, Section 12,...". Do not invent section
   numbers — if you are uncertain, cite the Act name only.
4. End the document with a "Disclaimer" section containing exactly this
   text on its own line:
   "This document was generated with AI assistance and reflects Klarify's
   regulatory information service. It is not legal advice. Review and
   customise this document with a qualified Nigerian regulatory
   practitioner before adopting it for production use."

Output ONLY the markdown — no preamble, no explanation, no JSON wrapper.`;
