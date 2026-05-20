// =============================================================================
// Citation extraction + linking for FounderCounsel chat responses.
//
// Klarify's system prompt (CLAUDE.md §6, Rule 2) forces every regulatory claim
// to carry an inline citation in the form:
//   "Under [ISA 2025, Section 357], digital assets are securities."
//
// The chat handler post-processes the assistant's final response to:
//   1. Extract every citation block (regex)
//   2. Resolve each citation to its canonical regulator URL (curated map)
//   3. Persist the citation array on `messages.citations` so the UI can render
//      clickable badges without re-parsing.
//
// Why a curated map (not "ask Claude for a URL"):
//   * Regulator URLs change; we control the truth.
//   * Some citations have no public URL (e.g. an internal NFIU directive).
//     The badge still renders, just non-clickable.
//   * No risk of model hallucinating a fake regulator domain.
// =============================================================================

/**
 * Single citation extracted from a chat response.
 * `url` is null when the regulation has no canonical public URL we trust.
 */
export interface Citation {
  /** Verbatim text inside the [..] (e.g. "ISA 2025, Section 357"). */
  raw: string;
  /** Regulation name half (e.g. "ISA 2025"). */
  regulation: string;
  /** Section / Rule half (e.g. "Section 357", "Rule 5.2(a)"). */
  section: string;
  /** Canonical URL on the regulator's site, or null if unknown. */
  url: string | null;
}

/**
 * Mapping from canonical regulation name → official regulator URL.
 *
 * Keys are matched case-insensitively against the FIRST half of a citation
 * (the regulation half before the comma). Matching is "starts-with" so
 * "ISA 2025" matches "ISA 2025" exactly while "Investments and Securities
 * Act 2025" matches "Investments and Securities Act 2025, Section 357".
 *
 * When updating: prefer the deepest regulator-owned URL available. Hosted
 * PDFs are acceptable as long as the regulator publishes them; never link
 * to a mirror.
 */
export const REGULATION_URLS: Readonly<Record<string, string>> = {
  // Nigerian primary legislation
  'ISA 2025': 'https://sec.gov.ng/investments-and-securities-act-2025/',
  'Investments and Securities Act 2025':
    'https://sec.gov.ng/investments-and-securities-act-2025/',
  'BOFIA 2020':
    'https://www.cbn.gov.ng/Documents/bsd.asp',
  'Banks and Other Financial Institutions Act 2020':
    'https://www.cbn.gov.ng/Documents/bsd.asp',
  'CAMA 2020': 'https://www.cac.gov.ng/cama-2020/',
  'Companies and Allied Matters Act 2020':
    'https://www.cac.gov.ng/cama-2020/',
  'MLPPA 2022': 'https://nfiu.gov.ng/laws',
  'Money Laundering (Prevention and Prohibition) Act 2022':
    'https://nfiu.gov.ng/laws',
  'POCA 2022': 'https://nfiu.gov.ng/laws',
  'Proceeds of Crime (Recovery and Management) Act 2022':
    'https://nfiu.gov.ng/laws',
  'TPPA 2022': 'https://nfiu.gov.ng/laws',
  'Terrorism (Prevention and Prohibition) Act 2022':
    'https://nfiu.gov.ng/laws',
  'NDPA 2023': 'https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act.pdf',
  'Nigeria Data Protection Act 2023':
    'https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act.pdf',
  'NTAA 2025': 'https://firs.gov.ng/tax-laws/',
  'Nigeria Tax Administration Act 2025':
    'https://firs.gov.ng/tax-laws/',
  'Nigeria Startup Act 2022':
    'https://startup.gov.ng/wp-content/uploads/2022/10/Nigeria-Startup-Act-2022.pdf',

  // SEC Digital Asset Rules
  'SEC Digital Asset Rules 2022':
    'https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/',
  'SEC Digital Asset Rules 2023':
    'https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/',
  'SEC Digital Asset Rules 2024':
    'https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/',
  'SEC Digital Asset Rules 2025':
    'https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/',
  'SEC DAR': 'https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/',
  'SEC Rules': 'https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/',

  // CBN / NFIU
  'CBN VASP Guidelines 2023':
    'https://www.cbn.gov.ng/Out/2023/PSM/CBN%20VASP%20Guidelines.pdf',
  'CBN Guidelines':
    'https://www.cbn.gov.ng/Out/2023/PSM/CBN%20VASP%20Guidelines.pdf',
  'NFIU AML/CFT Compliance Framework':
    'https://nfiu.gov.ng/guidelines',
  'NFIU Guidelines': 'https://nfiu.gov.ng/guidelines',
  'NFIU Framework': 'https://nfiu.gov.ng/guidelines',

  // International standards
  'FATF Recommendation 15':
    'https://www.fatf-gafi.org/en/topics/virtual-assets.html',
  'FATF Rec 15':
    'https://www.fatf-gafi.org/en/topics/virtual-assets.html',
  'FATF Targeted Update':
    'https://www.fatf-gafi.org/en/publications/Fatfrecommendations/Targeted-update-virtual-assets-vasps.html',

  // Regional African
  'Ghana VASP Act 2025':
    'https://www.parliament.gh/news?CO=10',
  'Ghana ISA Act 2025':
    'https://www.parliament.gh/news?CO=10',
  'Kenya VASP Act 2025':
    'https://www.cma.or.ke/',
  'Mauritius VAITOS 2021':
    'https://www.fscmauritius.org/',
  'South Africa FICA':
    'https://www.fic.gov.za/Pages/Legislation.aspx',
  'South Africa FAIS':
    'https://www.fsca.co.za/Regulated%20Entities/Pages/FAIS-Act.aspx',
  'South Africa FSCA':
    'https://www.fsca.co.za/',
  'South Africa CASP':
    'https://www.fsca.co.za/',

  // Canonical interpretive reference
  "Founder's Guide": 'https://klarify.africa',
  "Founder's Guide 2026": 'https://klarify.africa',
  'The Founders Guide': 'https://klarify.africa',
};

// Regex matches: opening bracket, regulation name (starts with capital or
// digit), comma, section/rule reference, closing bracket. The regulation
// name half permits internal commas only outside common heading words, but
// because regulations don't typically contain commas before "Section", this
// simple split-on-first-comma works in practice.
//
// Examples that match:
//   [ISA 2025, Section 357]
//   [SEC Digital Asset Rules 2024, Rule 5.2(a)]
//   [MLPPA 2022, Section 4(1)]
//   [Founder's Guide 2026, Chapter 3]
//
// Doesn't match — by design:
//   [TODO] [...some markdown link...] [^footnote]
//
// We require the section half to start with a capital letter or digit so we
// don't accidentally match markdown footnotes like [^1].
const CITATION_RE =
  /\[([A-Z][^,\]]{1,80}),\s*([A-Z0-9][^\]]{1,80})\]/g;

/**
 * Resolve a regulation name to its canonical URL using the curated map.
 *
 * Match strategy:
 *   1. Exact (case-insensitive) lookup.
 *   2. Longest-prefix match — so "ISA 2025" matches when the citation is just
 *      "ISA 2025" but also when it's "ISA 2025 amendment".
 *
 * Returns `null` when no entry matches — the UI then renders a non-clickable
 * badge so the citation is still visible.
 */
export function resolveCitationUrl(regulation: string): string | null {
  const norm = regulation.trim().toLowerCase();

  // Exact (case-insensitive) match wins.
  for (const [key, url] of Object.entries(REGULATION_URLS)) {
    if (key.toLowerCase() === norm) return url;
  }

  // Longest-prefix match — find the most specific key that prefixes the
  // citation name. We sort keys by length DESC so "SEC Digital Asset Rules
  // 2024" wins over "SEC DAR" when both could match.
  const candidates = Object.entries(REGULATION_URLS)
    .filter(([key]) => norm.startsWith(key.toLowerCase()))
    .sort(([a], [b]) => b.length - a.length);

  return candidates.length > 0 ? candidates[0]![1] : null;
}

/**
 * Extract every citation in the form `[Regulation, Section]` from the
 * assistant response text. Returns an in-order, de-duplicated list.
 *
 * De-duplication: by the canonical `raw` string. The same citation
 * referenced twice in one response is reported once — UI badges link to
 * the same URL regardless.
 */
export function extractCitations(text: string): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];

  // Reset lastIndex — global regex state survives across calls otherwise.
  CITATION_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CITATION_RE.exec(text)) !== null) {
    const regulation = match[1]!.trim();
    const section = match[2]!.trim();
    const raw = `${regulation}, ${section}`;
    if (seen.has(raw)) continue;
    seen.add(raw);
    out.push({
      raw,
      regulation,
      section,
      url: resolveCitationUrl(regulation),
    });
  }

  return out;
}
