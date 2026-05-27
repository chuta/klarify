// =============================================================================
// CLAUDE.md §6 — Product Classification Prompt.
// Updated May 2026 — SEC Circular 26-1 VASP categories (AVASP, DAPO, RATOP).
// =============================================================================

export const KLARIFY_CLASSIFY_PROMPT = `You are classifying a digital asset product under Nigerian and African
regulatory frameworks. Use the following classification framework:

DAX (Digital Asset Exchange): Facilitates secondary market trading
between buyers and sellers. Requires SEC Nigeria DAX registration.

DAOP (Digital Asset Offering Platform): Operates a platform for primary
issuance of digital assets to investors. Requires SEC Nigeria DAOP
registration.

DAC (Digital Asset Custodian): Holds and safeguards digital assets
on behalf of clients (controls private keys). Requires SEC Nigeria
DAC registration. Note: a DAX that also holds client assets needs BOTH.

DAI (Digital Asset Intermediary): Brokers, advisors, or agents who
facilitate transactions without operating an exchange or custody.

AVASP (Ancillary Virtual Asset Service Provider): Provides supporting
services to the VASP ecosystem — e.g. compliance technology, blockchain
analytics, node infrastructure, KYC-as-a-service — without operating an
exchange, custody, or primary/secondary issuance platform. Requires SEC
Nigeria AVASP registration when performing ancillary VASP functions.

DAPO (Digital Assets Platform Operator): Operates a digital-asset platform
or issues tokens to the public, where the entity is a platform operator or
token issuer but NOT a full-scale offering platform as defined for DAOP.
Requires SEC Nigeria DAPO registration. Classify here when the product
primarily issues or operates a token/platform without full DAOP-scale
primary-market infrastructure.

RATOP (Real-world Assets Tokenization and Offering Platform): Tokenizes
real-world assets (real estate, commodities, receivables, etc.) and offers
them to investors. Requires SEC Nigeria RATOP registration. Tokenised
securities with rental/income rights are RATOP or DAOP — assess function;
use RATOP when RWA tokenization is the core product.

PAYMENT PRODUCT: Involves naira on/off-ramps, stablecoin payment
rails, or payment system infrastructure. Requires CBN engagement
IN ADDITION to any SEC registration.

CRITICAL RULES:
- Classify by FUNCTION not by label. Ignore what the founder calls
  their product. Assess what it functionally does.
- A "utility token" that carries economic return rights IS a security.
- Flag if the product spans multiple categories (requires multiple
  registrations). Use HYBRID as primary only when no single category
  clearly dominates; list others in secondary_categories.
- For minimum capital requirements, cite SEC Circular No. 26-1
  (January 2026) from retrieved context — do not use superseded
  pre-2026 figures.
- DAPO vs DAOP: DAOP = full primary offering platform infrastructure;
  DAPO = platform operator / token issuer without that full scope.
  When uncertain, flag explicitly and recommend specialist review.

Output as structured JSON:
{
  "primary_category": "DAX|DAOP|DAC|DAI|AVASP|DAPO|RATOP|PAYMENT|HYBRID",
  "secondary_categories": [],
  "primary_regulator": "SEC_NIGERIA|CBN|BOTH",
  "secondary_regulators": [],
  "required_licences": [],
  "risk_if_unlicensed": "CRITICAL|HIGH|MEDIUM",
  "reasoning": "",
  "citations": []
}`;
