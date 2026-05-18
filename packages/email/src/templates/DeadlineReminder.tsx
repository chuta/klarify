import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { UrgencyBanner } from '../components/UrgencyBanner.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface DeadlineReminderProps {
  name: string;
  eventTitle: string;          // e.g. "STR Filing — Monthly NFIU Submission"
  eventDescription: string;
  dueDate: string;             // ISO date or formatted string
  daysRemaining: number;
  /** Regulator the deadline is tied to (e.g. NFIU, SEC, CBN). */
  regulatorCode?: string;
  /** Optional deep link to the dashboard calendar entry. */
  eventUrl?: string;
}

export const deadlineReminderSubject = (props: DeadlineReminderProps): string => {
  if (props.daysRemaining <= 0) return `Overdue: ${props.eventTitle}`;
  if (props.daysRemaining === 1) return `Due tomorrow: ${props.eventTitle}`;
  return `Due in ${props.daysRemaining} days: ${props.eventTitle}`;
};

export function DeadlineReminderEmail({
  name,
  eventTitle,
  eventDescription,
  dueDate,
  daysRemaining,
  regulatorCode,
  eventUrl,
}: DeadlineReminderProps): JSX.Element {
  const urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' =
    daysRemaining <= 0 ? 'CRITICAL' : daysRemaining <= 3 ? 'HIGH' : 'MEDIUM';

  return (
    <EmailLayout
      preview={`${eventTitle} is due ${
        daysRemaining <= 0
          ? 'now (overdue)'
          : daysRemaining === 1
            ? 'tomorrow'
            : `in ${daysRemaining} days`
      }.`}
    >
      <UrgencyBanner
        level={urgency}
        title={
          daysRemaining <= 0
            ? 'Overdue — file as soon as possible'
            : daysRemaining === 1
              ? 'Due tomorrow'
              : `Due in ${daysRemaining} days`
        }
        subtitle={`${eventTitle} · ${dueDate}`}
      />

      <Heading as="h1" style={h1}>
        Compliance deadline reminder
      </Heading>

      <Text style={paragraph}>
        {firstName(name)}, this is a friendly nudge from Klarify. The
        following compliance event is on your calendar:
      </Text>

      <Section style={card}>
        <Text style={cardTitle}>{eventTitle}</Text>
        <Text style={cardMeta}>
          Due: <strong>{dueDate}</strong>
          {regulatorCode && <> · Regulator: <strong>{regulatorCode}</strong></>}
        </Text>
        <Text style={cardBody}>{eventDescription}</Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button
          href={eventUrl ?? `${emailConfig.appUrl}/dashboard/calendar`}
          variant={urgency === 'CRITICAL' ? 'danger' : 'primary'}
        >
          Open compliance calendar →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Missing regulatory deadlines (STR filings, quarterly training, BWRA
        reviews) can trigger enforcement action. Klarify tracks them for you
        — log completion in your dashboard once submitted.
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

const card = {
  background:   emailColors.bgPrimary,
  border:       `1px solid ${emailColors.borderGrey}`,
  borderRadius: '8px',
  padding:      '20px 22px',
  margin:       '0 0 8px 0',
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
  margin:     '0 0 12px 0',
} as const;

const cardBody = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  margin:     0,
} as const;
