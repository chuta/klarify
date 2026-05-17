// =============================================================================
// CLAUDE.md §6 — Product Classification Prompt. VERBATIM. §18 forbids changes.
// =============================================================================

export const KLARIFY_CLASSIFY_PROMPT = `You are classifying a digital asset product under Nigerian and African
regulatory frameworks. Use the following classification framework:

DAX (Digital Asset Exchange): Facilitates secondary market trading
between buyers and sellers. Requires SEC Nigeria DAX registration.

DAOP (Digital Asset Offering Platform): Facilitates primary issuance
of digital assets to investors. Requires SEC Nigeria DAOP registration.

DAC (Digital Asset Custodian): Holds and safeguards digital assets
on behalf of clients (controls private keys). Requires SEC Nigeria
DAC registration. Note: a DAX that also holds client assets needs BOTH.

DAI (Digital Asset Intermediary): Brokers, advisors, agents who
facilitate transactions without operating exchange or custody.

PAYMENT PRODUCT: Involves naira on/off-ramps, stablecoin payment
rails, or payment system infrastructure. Requires CBN engagement
IN ADDITION to any SEC registration.

CRITICAL RULES:
- Classify by FUNCTION not by label. Ignore what the founder calls
  their product. Assess what it functionally does.
- A "utility token" that carries economic return rights IS a security.
- Flag if the product spans multiple categories (requires multiple
  registrations).
- Always state the consequence of operating without the required
  registration.

Output as structured JSON:
{
  "primary_category": "DAX|DAOP|DAC|DAI|PAYMENT|HYBRID",
  "secondary_categories": [],
  "primary_regulator": "SEC_NIGERIA|CBN|BOTH",
  "secondary_regulators": [],
  "required_licences": [],
  "risk_if_unlicensed": "CRITICAL|HIGH|MEDIUM",
  "reasoning": "",
  "citations": []
}`;
