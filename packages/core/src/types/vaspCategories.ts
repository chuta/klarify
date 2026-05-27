// SEC Nigeria VASP licence categories — aligned with Circular No. 26-1 (Jan 2026).
// Minimum capital figures live in the RAG corpus (NG_SEC_MCR_CIRCULAR_2026.pdf);
// do not hardcode MCR amounts in UI or prompts.
import { z } from 'zod';

/** SEC-recognised VASP registration categories. */
export const VASP_LICENCE_TYPES = [
  'DAX',
  'DAOP',
  'DAC',
  'DAI',
  'AVASP',
  'DAPO',
  'RATOP',
] as const;

export type VaspLicenceType = (typeof VASP_LICENCE_TYPES)[number];

/** Klarify product taxonomy — SEC categories plus payment/hybrid meta-types. */
export const PRODUCT_TYPES = [...VASP_LICENCE_TYPES, 'PAYMENT', 'HYBRID'] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

/** ARIP tracker licence selector (includes unknown until classified). */
export type AripLicenceType = VaspLicenceType | 'unknown';

export const ARIP_LICENCE_TYPES = [...VASP_LICENCE_TYPES, 'unknown'] as const;

/** White paper analyser — SEC licence sought (hybrid when product spans categories). */
export const WHITE_PAPER_LICENCE_CATEGORIES = [
  ...VASP_LICENCE_TYPES,
  'HYBRID',
] as const;

export type WhitePaperLicenceCategory = (typeof WHITE_PAPER_LICENCE_CATEGORIES)[number];

export interface ProductTypeMeta {
  label: string;
  desc: string;
}

export const PRODUCT_TYPE_META: Record<ProductType, ProductTypeMeta> = {
  DAX: {
    label: 'Digital Asset Exchange',
    desc: 'Secondary market trading between buyers and sellers',
  },
  DAOP: {
    label: 'Digital Asset Offering Platform',
    desc: 'Primary issuance platform for digital assets to investors',
  },
  DAC: {
    label: 'Digital Asset Custodian',
    desc: 'Holds and safeguards digital assets on behalf of clients',
  },
  DAI: {
    label: 'Digital Asset Intermediary',
    desc: 'Broker, advisor, or agent facilitating transactions',
  },
  AVASP: {
    label: 'Ancillary VASP (AVASP)',
    desc: 'Supporting VASP services — compliance tech, analytics, infra — without operating exchange, custody, or issuance',
  },
  DAPO: {
    label: 'Digital Assets Platform Operator (DAPO)',
    desc: 'Platform operator or token issuer — distinct from a full offering platform (DAOP)',
  },
  RATOP: {
    label: 'RWA Tokenization Platform (RATOP)',
    desc: 'Real-world asset tokenization and offering platform',
  },
  PAYMENT: {
    label: 'Payment Product',
    desc: 'Naira on/off-ramps, stablecoin rails, or payment system infrastructure',
  },
  HYBRID: {
    label: 'Hybrid',
    desc: 'Spans two or more regulatory categories above',
  },
};

export function isVaspLicenceType(value: string): value is VaspLicenceType {
  return (VASP_LICENCE_TYPES as readonly string[]).includes(value);
}

export function isProductType(value: string): value is ProductType {
  return (PRODUCT_TYPES as readonly string[]).includes(value);
}

/** True if product types imply SEC Nigeria engagement (any VASP category). */
export function productTypesRequireSec(productTypes: readonly string[]): boolean {
  return productTypes.some((t) => isVaspLicenceType(t.toUpperCase()));
}

/** Zod enum mirror of PRODUCT_TYPES — use in API classification schemas. */
export const productTypeZodEnum = z.enum(
  PRODUCT_TYPES as unknown as [ProductType, ...ProductType[]],
);

/** SEC VASP licence categories only (no PAYMENT/HYBRID). */
export const vaspLicenceTypeZodEnum = z.enum(
  VASP_LICENCE_TYPES as unknown as [VaspLicenceType, ...VaspLicenceType[]],
);
