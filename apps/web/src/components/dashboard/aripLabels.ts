/**
 * ARIP label maps — pure data, importable from both Server and Client
 * Components.
 *
 * IMPORTANT: This file MUST NOT contain a `'use client'` directive. When a
 * Server Component (e.g. apps/web/src/app/dashboard/page.tsx) imports a
 * named export from a `'use client'` module, Next.js replaces that export
 * with an opaque client reference instead of the actual value. Reading a
 * property off that reference and trying to serialize it into the RSC
 * stream blows up with:
 *   "Could not find the module
 *    `…ARIPRestrictionsWidget.tsx#ARIP_STAGE_LABELS#…` in the React Client
 *    Manifest."
 *
 * Keeping these label maps in a plain TS module avoids that boundary.
 *
 * Regulatory source: ARIP Framework, SEC Nigeria, June 2024 (Sections 20, 29)
 */

/** ARIP 5-stage model per ARIP Framework (SEC Nigeria, June 2024) */
export const ARIP_STAGE_LABELS: Record<string, string> = {
  initial_assessment:         'Stage 1: Initial Assessment',
  eligibility_notification:   'Stage 2: Eligibility Notification',
  formal_application:         'Stage 3: Formal Application',
  aip_active:                 'Stage 4: AIP — Active',
  transition_to_registration: 'Stage 5: Transition to Registration',
};

export const ARIP_STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  not_started:      { label: 'Not Started',          colour: '#CCCCCC' },
  submitted:        { label: 'Submitted',             colour: '#3B82F6' },
  under_review:     { label: 'Under Review',          colour: '#D4A843' },
  complete:         { label: 'Complete',              colour: '#1A7A4A' },
  eligible:         { label: 'Eligible',              colour: '#1A7A4A' },
  ineligible:       { label: 'Ineligible',            colour: '#C0392B' },
  deferred:         { label: 'Deferred',              colour: '#D4A843' },
  granted:          { label: 'Registration Granted',  colour: '#1A7A4A' },
  new_regs_adopted: { label: 'New Regs Adopted',      colour: '#0B6E6E' },
  denied:           { label: 'Denied',                colour: '#C0392B' },
  active:           { label: 'AIP Active',            colour: '#1A7A4A' },
  expired:          { label: 'AIP Expired',           colour: '#C0392B' },
};
