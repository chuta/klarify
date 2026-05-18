import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig, COMPANY } from '../config.js';

export interface SubscriptionReceiptProps {
  name: string;
  plan: 'navigator' | 'compass' | 'flagship';
  billingCycle: 'monthly' | 'annual';
  amount: string;          // already formatted, e.g. "$99.00"
  currency: string;        // ISO 4217
  invoiceNumber: string;
  paidAt: string;
  /** Where the user can download the PDF invoice. */
  invoiceUrl?: string;
  /** Renewal/expiry date. */
  nextChargeDate?: string;
  paymentMethod: string;   // e.g. "Mastercard ending 4242"
}

const PLAN_LABELS: Record<SubscriptionReceiptProps['plan'], string> = {
  navigator: 'Navigator',
  compass:   'Compass',
  flagship:  'Flagship',
};

export const subscriptionReceiptSubject = (props: SubscriptionReceiptProps): string =>
  `Receipt — Klarify ${PLAN_LABELS[props.plan]} (${props.invoiceNumber})`;

export function SubscriptionReceiptEmail({
  name,
  plan,
  billingCycle,
  amount,
  invoiceNumber,
  paidAt,
  invoiceUrl,
  nextChargeDate,
  paymentMethod,
}: SubscriptionReceiptProps): JSX.Element {
  return (
    <EmailLayout
      preview={`Receipt for Klarify ${PLAN_LABELS[plan]} (${billingCycle}) — ${amount}`}
      hideDisclaimer
    >
      <Heading as="h1" style={h1}>
        Thank you for your payment, {firstName(name)}.
      </Heading>

      <Text style={paragraph}>
        We&apos;ve received your payment for Klarify{' '}
        <strong>{PLAN_LABELS[plan]}</strong> ({billingCycle}). This email is
        your receipt.
      </Text>

      <Section style={card}>
        <Row label="Invoice number"  value={invoiceNumber} />
        <Row label="Plan"            value={`Klarify ${PLAN_LABELS[plan]}`} />
        <Row label="Billing cycle"   value={billingCycle === 'annual' ? 'Annual' : 'Monthly'} />
        <Row label="Amount"          value={amount} />
        <Row label="Payment method"  value={paymentMethod} />
        <Row label="Paid on"         value={paidAt} />
        {nextChargeDate && <Row label="Next charge" value={nextChargeDate} />}
      </Section>

      {invoiceUrl && (
        <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
          <Button href={invoiceUrl} variant="secondary">
            Download PDF invoice
          </Button>
        </Section>
      )}

      <Section style={{ textAlign: 'center', margin: '16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard/profile`}>
          Manage subscription
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Billed by <strong>{COMPANY.legalName}</strong>, {COMPANY.address}. Need
        a VAT/tax invoice or have a question? Reply to this email.
      </Text>
    </EmailLayout>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={row}>
      <span style={rowLabel}>{label}</span>
      <span style={rowValue}>{value}</span>
    </div>
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

const card = {
  background:   emailColors.bgPrimary,
  border:       `1px solid ${emailColors.borderGrey}`,
  borderRadius: '8px',
  padding:      '8px 20px',
  margin:       '0 0 8px 0',
} as const;

const row = {
  display:        'flex',
  flexDirection:  'row' as const,
  justifyContent: 'space-between',
  alignItems:     'baseline',
  padding:        '10px 0',
  borderBottom:   `1px solid ${emailColors.borderGrey}`,
} as const;

const rowLabel = {
  fontFamily: emailFonts.sans,
  fontSize:   '13px',
  color:      emailColors.textMuted,
} as const;

const rowValue = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  fontWeight: 600,
  color:      emailColors.textPrimary,
  textAlign:  'right' as const,
} as const;
