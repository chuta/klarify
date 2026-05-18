import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { UrgencyBanner } from '../components/UrgencyBanner.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface PaymentFailedProps {
  name: string;
  plan: string;             // pre-formatted, e.g. "Compass"
  amount: string;           // e.g. "$99.00"
  paymentMethod: string;
  /** Retry deadline before subscription becomes past_due. */
  retryByDate: string;
  /** Reason from gateway (optional, may be technical). */
  reason?: string;
}

export const paymentFailedSubject = (): string =>
  'Action needed: payment for your Klarify subscription failed';

export function PaymentFailedEmail({
  name,
  plan,
  amount,
  paymentMethod,
  retryByDate,
  reason,
}: PaymentFailedProps): JSX.Element {
  return (
    <EmailLayout
      preview={`Your payment for Klarify ${plan} (${amount}) failed. Update your payment method by ${retryByDate}.`}
      hideDisclaimer
    >
      <UrgencyBanner
        level="HIGH"
        title="Payment failed"
        subtitle={`We were unable to charge ${paymentMethod} for ${amount}.`}
      />

      <Heading as="h1" style={h1}>
        Update your payment method
      </Heading>

      <Text style={paragraph}>
        Hi {firstName(name)}, we tried to renew your Klarify{' '}
        <strong>{plan}</strong> subscription but the charge to{' '}
        <strong>{paymentMethod}</strong> didn&apos;t go through.
      </Text>

      {reason && (
        <Text style={paragraph}>
          <strong>Reason from your bank:</strong> {reason}
        </Text>
      )}

      <Text style={paragraph}>
        We&apos;ll automatically retry the payment over the next few days.
        To avoid any interruption to your access (compliance roadmap,
        FounderCounsel, document analyser), please update your card by{' '}
        <strong>{retryByDate}</strong>.
      </Text>

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard/profile`} variant="danger">
          Update payment method →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        If this looks like a mistake, reply to this email and a human will
        sort it out.
      </Text>
    </EmailLayout>
  );
}

function firstName(name: string): string {
  return (name || 'there').trim().split(/\s+/)[0] || 'there';
}

const h1 = {
  fontFamily: emailFonts.sans,
  fontSize:   '22px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '0 0 16px 0',
  lineHeight: '28px',
} as const;

const paragraph = {
  fontFamily: emailFonts.sans,
  fontSize:   '15px',
  lineHeight: '24px',
  color:      emailColors.textPrimary,
  margin:     '0 0 16px 0',
} as const;

const paragraphSmall = {
  ...paragraph,
  fontSize: '13px',
  color:    emailColors.textMuted,
} as const;
