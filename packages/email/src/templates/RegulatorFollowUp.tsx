import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface RegulatorFollowUpProps {
  name: string;
  regulatorCode: string;     // CBN | SEC_NIGERIA | NFIU | NITDA | ...
  regulatorName: string;
  interactionType: string;   // call | email | meeting | submission | letter
  interactionSubject: string;
  occurredAt: string;
  followUpDate: string;
  notes?: string;
  interactionId: string;
}

export const regulatorFollowUpSubject = (props: RegulatorFollowUpProps): string =>
  `Follow-up due: ${props.regulatorCode} — ${props.interactionSubject}`;

export function RegulatorFollowUpEmail({
  name,
  regulatorCode,
  regulatorName,
  interactionType,
  interactionSubject,
  occurredAt,
  followUpDate,
  notes,
  interactionId,
}: RegulatorFollowUpProps): JSX.Element {
  return (
    <EmailLayout
      preview={`Reminder: follow up with ${regulatorName} on ${followUpDate}.`}
    >
      <Heading as="h1" style={h1}>
        Time to follow up with {regulatorCode}
      </Heading>

      <Text style={paragraph}>
        Hi {firstName(name)}, this is a reminder from Klarify&apos;s regulator
        CRM. You scheduled a follow-up with{' '}
        <strong>{regulatorName}</strong> for{' '}
        <strong>{followUpDate}</strong>.
      </Text>

      <Section style={card}>
        <Text style={cardLabel}>ORIGINAL INTERACTION</Text>
        <Text style={cardTitle}>{interactionSubject}</Text>
        <Text style={cardMeta}>
          <strong>{capitalize(interactionType)}</strong> · {occurredAt}
        </Text>
        {notes && <Text style={cardBody}>{notes}</Text>}
      </Section>

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button
          href={`${emailConfig.appUrl}/dashboard/regulators?interaction=${interactionId}`}
        >
          Open in regulator CRM →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Consistent follow-up is one of the strongest signals to Nigerian
        regulators that your team is engaged and serious. Document the
        outcome in the CRM when you&apos;re done.
      </Text>
    </EmailLayout>
  );
}

function firstName(name: string): string {
  return (name || 'there').trim().split(/\s+/)[0] || 'there';
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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
  padding:      '16px 20px',
  margin:       '8px 0 0 0',
} as const;

const cardLabel = {
  fontFamily: emailFonts.sans,
  fontSize:   '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  color:      emailColors.textMuted,
  margin:     '0 0 6px 0',
} as const;

const cardTitle = {
  fontFamily: emailFonts.sans,
  fontSize:   '16px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '0 0 6px 0',
} as const;

const cardMeta = {
  fontFamily: emailFonts.sans,
  fontSize:   '13px',
  color:      emailColors.textMuted,
  margin:     '0 0 10px 0',
} as const;

const cardBody = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  margin:     0,
} as const;
