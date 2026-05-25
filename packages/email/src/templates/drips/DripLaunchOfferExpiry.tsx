import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout.js';
import { Button } from '../../components/Button.js';
import { emailColors } from '../../components/tokens.js';
import { buildAppUrl } from '../../config.js';
import {
  DripUnsubscribeFooter,
  dripCard,
  dripCardTitle,
  dripH1,
  dripMono,
  dripParagraph,
  dripParagraphSmall,
  firstName,
} from './shared.js';

export interface DripLaunchOfferExpiryProps {
  name: string;
  /** e.g. LAUNCH20 */
  couponCode: string;
  /** Human-readable expiry, e.g. "Sunday, 8 June 2026" */
  expiryDateLabel: string;
  /** e.g. 20 for 20% off */
  discountPercent: number;
  /** Recommended plan to highlight, e.g. 'compass' */
  recommendedPlan?: 'navigator' | 'compass';
  unsubscribeUrl?: string;
}

export const dripLaunchOfferExpirySubject = (props: DripLaunchOfferExpiryProps): string =>
  `Last chance: ${props.discountPercent}% off Klarify — expires ${props.expiryDateLabel}`;

export function DripLaunchOfferExpiry({
  name,
  couponCode,
  expiryDateLabel,
  discountPercent,
  recommendedPlan = 'compass',
  unsubscribeUrl,
}: DripLaunchOfferExpiryProps): JSX.Element {
  const planLabel = recommendedPlan === 'compass' ? 'Compass' : 'Navigator';
  const billingUrl = buildAppUrl(
    `/dashboard/billing?coupon=${encodeURIComponent(couponCode)}`,
  );

  return (
    <EmailLayout
      preview={`Your launch pricing expires ${expiryDateLabel}. Use code ${couponCode} at checkout.`}
    >
      <Section
        style={{
          background:   emailColors.bgGold,
          border:       `1px solid ${emailColors.klarifyGold}`,
          borderRadius: '8px',
          padding:      '14px 18px',
          margin:       '0 0 20px 0',
          textAlign:    'center',
        }}
      >
        <Text
          style={{
            fontFamily: dripMono.fontFamily,
            fontSize:   '13px',
            fontWeight: 700,
            color:      emailColors.klarifyNavy,
            margin:     0,
            letterSpacing: '0.5px',
          }}
        >
          LAUNCH OFFER — EXPIRES {expiryDateLabel.toUpperCase()}
        </Text>
      </Section>

      <Heading as="h1" style={dripH1}>
        {firstName(name)}, your {discountPercent}% launch discount ends soon
      </Heading>

      <Text style={dripParagraph}>
        You started your Klarify journey during our book + platform launch. This is
        a final reminder: your exclusive pricing window closes on{' '}
        <strong>{expiryDateLabel}</strong>.
      </Text>

      <Section style={dripCard}>
        <Text style={dripCardTitle}>Your code</Text>
        <Text
          style={{
            fontFamily: dripMono.fontFamily,
            fontSize:   '28px',
            fontWeight: 800,
            color:      emailColors.klarifyTeal,
            margin:     '0 0 8px 0',
            letterSpacing: '2px',
            textAlign:  'center',
          }}
        >
          {couponCode}
        </Text>
        <Text style={{ ...dripParagraphSmall, margin: 0, textAlign: 'center' }}>
          {discountPercent}% off your first {planLabel} subscription — monthly or annual
        </Text>
      </Section>

      <Text style={dripParagraph}>
        Most founders upgrading during launch choose <strong>{planLabel}</strong> for
        unlimited regulatory Q&A, document analyses, and — if you are on the ARIP path
        — the full application tracker and regulator CRM.
      </Text>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={billingUrl}>
          Claim {discountPercent}% off before expiry →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={dripParagraphSmall}>
        After {expiryDateLabel}, standard pricing applies ($29 Navigator / $99 Compass
        per month). If you are not ready to upgrade, your free account stays active —
        no card required.
      </Text>

      <DripUnsubscribeFooter unsubscribeUrl={unsubscribeUrl} />
    </EmailLayout>
  );
}
