import { describe, expect, it } from 'vitest';
import {
  ARIP_PROCESSING_FEE,
  ARIP_PROCESSING_FEE_NGN,
  aripProcessingFeeHelpText,
  buildSecAripFeesJson,
  formatAripProcessingFeeNgn,
} from '../../regulators/aripFees.js';

describe('aripFees', () => {
  it('sets flat ARIP processing fee at NGN 2,000,000 per SEC DAR 2024 §VIII', () => {
    expect(ARIP_PROCESSING_FEE_NGN).toBe(2_000_000);
    expect(ARIP_PROCESSING_FEE.regulatoryBasis).toContain('Section VIII');
  });

  it('formats fee for display', () => {
    expect(formatAripProcessingFeeNgn()).toBe('NGN 2,000,000');
  });

  it('does not include superseded per-category tiers', () => {
    const help = aripProcessingFeeHelpText();
    expect(help).not.toMatch(/100,000|50,000|DAX\/DAOP|DAC\/DAI/);
    expect(help).toContain('2,000,000');
  });

  it('builds CRM seed JSON with citation', () => {
    const json = buildSecAripFeesJson();
    expect(json.arip_processing_fee_ngn).toBe(2_000_000);
    expect(json.citation).toContain('SEC Digital Asset Rules 2024');
  });
});
