/**
 * Category metadata shared between the template library sidebar and the
 * individual `DocumentTemplateCard`. Pure config — no JSX — so it can be
 * imported by server components.
 */

export type TemplateCategoryKey =
  | 'ALL'
  | 'AML_CFT'
  | 'KYC'
  | 'LICENSING'
  | 'ARIP'
  | 'OTHER'
  /** Sprint 5: 4 ARIP Framework application documents — Compass+ gated. */
  | 'ARIP_FRAMEWORK';

export interface CategoryMeta {
  label: string;
  tintBg: string;
  tintFg: string;
}

export const CATEGORY_DETAILS: Record<TemplateCategoryKey, CategoryMeta> = {
  ALL: { label: 'All Templates', tintBg: '#E6F4F4', tintFg: '#0B6E6E' },
  AML_CFT: { label: 'AML/CFT', tintBg: '#E8EEF4', tintFg: '#0D2B45' },
  KYC: { label: 'KYC', tintBg: '#E6F4F4', tintFg: '#0B6E6E' },
  LICENSING: { label: 'Licensing', tintBg: '#FDF6E3', tintFg: '#A87C00' },
  ARIP: { label: 'ARIP', tintBg: '#FDF6E3', tintFg: '#A87C00' },
  OTHER: { label: 'Other', tintBg: '#F5F5F5', tintFg: '#555555' },
  ARIP_FRAMEWORK: {
    label: 'ARIP Framework',
    tintBg: '#E8EEF4',
    tintFg: '#0D2B45',
  },
};

/** Categories shown in the sidebar, in display order. */
export const CATEGORY_ORDER: TemplateCategoryKey[] = [
  'ALL',
  'AML_CFT',
  'KYC',
  'LICENSING',
  'ARIP',
  'ARIP_FRAMEWORK',
  'OTHER',
];
