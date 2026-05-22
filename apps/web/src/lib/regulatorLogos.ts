/** Public paths for Nigerian regulator logos (served from /public/regulators). */
export const REGULATOR_LOGOS: Record<string, string> = {
  SEC_NIGERIA: '/regulators/sec-nigeria.jpg',
  CBN: '/regulators/cbn.png',
  NFIU: '/regulators/nfiu.jpeg',
  NITDA: '/regulators/nitda.jpeg',
  CAC: '/regulators/cac.jpeg',
  EFCC: '/regulators/efcc.jpeg',
  NAICOM: '/regulators/naicom.png',
};

export function getRegulatorLogoPath(code: string): string | undefined {
  return REGULATOR_LOGOS[code];
}
