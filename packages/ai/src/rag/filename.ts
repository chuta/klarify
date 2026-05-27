// =============================================================================
// Filename → corpus metadata parser (CLAUDE.md §11.2).
//
// Convention:  {JURISDICTION}_{REGULATION_KEY}_{YEAR}.pdf
//   - JURISDICTION   one of NG, GH, KE, MU, ZA, FATF, INTL, REF
//   - REGULATION_KEY arbitrary [A-Z0-9_]+
//   - YEAR           optional trailing 4-digit year (some files like
//                    ZA_FICA, INTL_GIABA_MER_NIGERIA legitimately omit it)
//
// The canonical NAME_MAP exists so retrieved chunks display "Investments and
// Securities Act 2025" in citations rather than the raw filename slug. Keep
// this map curated — if a file is added without an entry the parser falls
// back to a humanised version of the regulation key.
//
// Jurisdiction codes use the same values RAG search/jurisdiction filtering
// will operate on, so they MUST match the values produced here exactly.
// =============================================================================

export type JurisdictionCode = 'NG' | 'GH' | 'KE' | 'MU' | 'ZA' | 'FATF' | 'INTL' | 'REF';

export interface ParsedFilename {
  /** Original filename with extension. */
  filename: string;
  /** Stable jurisdiction code, used for search filtering + re-ranking. */
  jurisdiction: JurisdictionCode;
  /** Stable regulation key (post-jurisdiction prefix, year stripped). */
  regulationKey: string;
  /** Human-friendly document name, used in citations + UI. */
  documentName: string;
  /** Year if present in filename, else null. */
  year: number | null;
}

/**
 * Curated mapping from {jurisdiction}/{regulation_key} to display name.
 * Source: CLAUDE.md §11.3–11.6.
 *
 * The display name SHOULD be the format users will see in citations rendered
 * by the chat UI (e.g. "ISA 2025, Section 357"). Keep it concise.
 */
const NAME_MAP: Record<string, string> = {
  // Nigeria — primary corpus (CLAUDE.md §11.3)
  'NG/ISA': 'Investments and Securities Act 2025',
  'NG/BOFIA': 'Banks and Other Financial Institutions Act 2020',
  'NG/CAMA': 'Companies and Allied Matters Act 2020',
  'NG/MLPPA': 'Money Laundering (Prevention and Prohibition) Act 2022',
  'NG/POCA': 'Proceeds of Crime (Recovery and Management) Act 2022',
  'NG/TPPA': 'Terrorism (Prevention and Prohibition) Act 2022',
  'NG/NDPA': 'Nigeria Data Protection Act 2023',
  'NG/NTAA': 'Nigeria Tax Administration Act 2025',
  'NG/STARTUP_ACT': 'Nigeria Startup Act 2022',
  'NG/SEC_DAR': 'SEC Digital Asset Rules',
  'NG/SEC_MCR_CIRCULAR': 'SEC Circular No. 26-1 — Minimum Capital Requirements',
  'NG/CBN_VASP': 'CBN Guidelines on VASP Bank Accounts 2023',
  'NG/NFIU_VASP': 'NFIU AML/CFT Compliance Framework for VASPs 2024',
  'NG/EFCC': 'EFCC AML Guidance 2024',
  // Africa — regional (CLAUDE.md §11.4)
  'GH/ISA_ACT': 'Ghana Investments and Securities Act 2025',
  'GH/VASP_ACT': 'Ghana VASP Act 2025 (Act 1154)',
  'KE/VASP_ACT': 'Kenya VASP Act 2025',
  'MU/VAITOS': 'Mauritius VAITOS Act 2021',
  'ZA/CASP_FSCA': 'South Africa CASP / FSCA Framework',
  'ZA/FICA': 'South Africa Financial Intelligence Centre Act',
  'ZA/FAIS': 'South Africa Financial Advisory and Intermediary Services Act',
  // International (CLAUDE.md §11.5)
  'FATF/REC15': 'FATF Recommendation 15 (2019 update)',
  'FATF/TU_VA': 'FATF Targeted Update on Virtual Assets',
  // Filename FATF_UPDATES_2019_2025.pdf is a year-range; the trailing-year
  // matcher peels off 2025 leaving "UPDATES_2019" as the regulation key.
  'FATF/UPDATES_2019': 'FATF Virtual Assets Guidance 2019–2025',
  'INTL/GIABA_MER_NIGERIA': 'GIABA Mutual Evaluation Report on Nigeria',
  // Canonical interpretive reference (CLAUDE.md §11.6)
  'REF/FOUNDERS_GUIDE': "The Founder's Guide to Building in Regulated Markets",
};

const JURISDICTION_SET = new Set<JurisdictionCode>([
  'NG',
  'GH',
  'KE',
  'MU',
  'ZA',
  'FATF',
  'INTL',
  'REF',
]);

/**
 * Parse a corpus filename into structured metadata.
 *
 * Throws on filenames that don't begin with a known jurisdiction code, with
 * one explicit exception: `FOUNDERS_GUIDE_*.pdf` is accepted and rewritten as
 * if it were `REF_FOUNDERS_GUIDE_*` (CLAUDE.md §11.6 calls out this file as
 * the canonical reference; we don't force a rename to keep operator workflow
 * stable).
 *
 * @param filename basename only (no path), with .pdf extension
 */
export function parseFilename(filename: string): ParsedFilename {
  if (!/\.pdf$/i.test(filename)) {
    throw new Error(`parseFilename: ${filename} — expected a .pdf extension`);
  }
  const stem = filename.replace(/\.pdf$/i, '');

  if (!/^[A-Z0-9_.-]+$/.test(stem)) {
    throw new Error(
      `parseFilename: ${filename} contains characters outside [A-Z0-9_.-]. ` +
        `Rename per CLAUDE.md §11.2 before ingesting.`,
    );
  }

  let jurisdiction: JurisdictionCode;
  let rest: string;
  if (stem.startsWith('FOUNDERS_GUIDE')) {
    // Special-case — CLAUDE.md §11.6's example filename omits the REF_ prefix.
    jurisdiction = 'REF';
    rest = stem; // keep FOUNDERS_GUIDE_2026
  } else {
    const firstUnderscore = stem.indexOf('_');
    if (firstUnderscore < 0) {
      throw new Error(
        `parseFilename: ${filename} has no underscore separator. ` +
          `Expected {JURISDICTION}_{REGULATION_KEY}_{YEAR}.pdf.`,
      );
    }
    const prefix = stem.slice(0, firstUnderscore);
    if (!JURISDICTION_SET.has(prefix as JurisdictionCode)) {
      throw new Error(
        `parseFilename: ${filename} — unknown jurisdiction prefix "${prefix}". ` +
          `Valid: ${[...JURISDICTION_SET].join(', ')}.`,
      );
    }
    jurisdiction = prefix as JurisdictionCode;
    rest = stem.slice(firstUnderscore + 1);
  }

  // Optional trailing 4-digit year. Use a non-greedy split on the LAST _YYYY.
  let year: number | null = null;
  let regulationKey = rest;
  const yearMatch = rest.match(/^(.*)_((?:19|20|21)\d{2})$/);
  if (yearMatch && yearMatch[1] && yearMatch[2]) {
    regulationKey = yearMatch[1];
    year = Number.parseInt(yearMatch[2], 10);
  }

  const key = `${jurisdiction}/${regulationKey}`;
  const mapValue = NAME_MAP[key];
  const baseName =
    mapValue ??
    // Fallback: humanise the regulation key.
    regulationKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  // Append the year ONLY when:
  //   (a) the parsed filename carries a year, AND
  //   (b) the NAME_MAP value doesn't already include a 4-digit year.
  //
  // Without this, files like NG_SEC_DAR_2022.pdf and NG_SEC_DAR_2024.pdf
  // collapse onto the same NAME_MAP entry ("SEC Digital Asset Rules") and
  // `source_document` becomes a non-unique key — ingesting 2024 then DELETEs
  // 2022's chunks during the idempotent replace step. Year suffixing keeps
  // the source_document distinct per amendment, which is what the user
  // sees in citations anyway ("SEC Digital Asset Rules 2024, Rule 5.2").
  const mapValueHasYear =
    mapValue !== undefined && /\b(19|20|21)\d{2}\b/.test(mapValue);
  const documentName =
    year !== null && !mapValueHasYear ? `${baseName} ${year}` : baseName;

  return {
    filename,
    jurisdiction,
    regulationKey,
    documentName,
    year,
  };
}

/**
 * For the ingest CLI's `--all` mode: same as parseFilename but never throws —
 * returns null for malformed names so the CLI can log + skip them.
 */
export function tryParseFilename(filename: string): ParsedFilename | null {
  try {
    return parseFilename(filename);
  } catch {
    return null;
  }
}
