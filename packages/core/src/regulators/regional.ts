// Primary digital-asset regulators for jurisdiction expansion analysis.
// Used by the jurisdiction gap API to merge contacts — not for UI hardcoding
// (CLAUDE.md §16 Rule 2). Official names and websites only.

import type { JurisdictionCode } from '../types/jurisdictionGap.js';
import type { JurisdictionRegulatorContact } from '../types/jurisdictionGap.js';
import { NIGERIAN_REGULATORS } from './nigerian.js';

const SEC_NG = NIGERIAN_REGULATORS.find((r) => r.code === 'SEC_NIGERIA');

const REGIONAL_PRIMARY: Record<
  Exclude<JurisdictionCode, 'NG'>,
  JurisdictionRegulatorContact
> = {
  GH: {
    jurisdiction: 'GH',
    name: 'Securities and Exchange Commission Ghana',
    website: 'https://sec.gov.gh',
    email: 'info@sec.gov.gh',
  },
  KE: {
    jurisdiction: 'KE',
    name: 'Capital Markets Authority Kenya',
    website: 'https://www.cma.or.ke',
    email: 'info@cma.or.ke',
  },
  MU: {
    jurisdiction: 'MU',
    name: 'Financial Services Commission Mauritius',
    website: 'https://www.fscmauritius.org',
    email: 'info@fscmauritius.org',
  },
  ZA: {
    jurisdiction: 'ZA',
    name: 'Financial Sector Conduct Authority (FSCA)',
    website: 'https://www.fsca.co.za',
    email: 'info@fsca.co.za',
  },
};

/** Resolve canonical regulator contacts for jurisdiction gap reports. */
export function getRegulatorContactsForJurisdictions(
  jurisdictions: readonly JurisdictionCode[],
): JurisdictionRegulatorContact[] {
  const unique = [...new Set(jurisdictions)];
  const contacts: JurisdictionRegulatorContact[] = [];

  for (const code of unique) {
    if (code === 'NG' && SEC_NG?.website && SEC_NG.email) {
      contacts.push({
        jurisdiction: 'NG',
        name: SEC_NG.name,
        website: SEC_NG.website,
        email: SEC_NG.email,
      });
      continue;
    }
    const regional = REGIONAL_PRIMARY[code as Exclude<JurisdictionCode, 'NG'>];
    if (regional) contacts.push(regional);
  }

  return contacts;
}
