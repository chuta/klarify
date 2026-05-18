import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface PlanChangedProps {
  name: string;
  fromPlan: string;
  toPlan: string;
  changeType: 'upgrade' | 'downgrade' | 'cycle_change';
  effectiveDate: string;
  /** Headline new capabilities (free text bullets). */
  highlights: string[];
}

const COPY: Record<PlanChangedProps['changeType'], { title: string; preview: (props: PlanChangedProps) => string }> = {
  upgrade: {
    title:    'You\'re on a new plan',
    preview:  (p) => `You upgraded from ${p.fromPlan} to ${p.toPlan}. New features unlocked.`,
  },
  downgrade: {
    title:    'Your plan has been updated',
    preview:  (p) => `Your plan changed from ${p.fromPlan} to ${p.toPlan}.`,
  },
  cycle_change: {
    title:    'Your billing cycle has been updated',
    preview:  (p) => `Your billing cycle for ${p.toPlan} has been updated.`,
  },
};

export const planChangedSubject = (props: PlanChangedProps): string => {
  if (props.changeType === 'upgrade')      return `Welcome to Klarify ${props.toPlan} 🎉`;
  if (props.changeType === 'downgrade')    return `Your Klarify plan changed to ${props.toPlan}`;
  return 'Your Klarify billing cycle has been updated';
};

export function PlanChangedEmail(props: PlanChangedProps): JSX.Element {
  const { name, fromPlan, toPlan, changeType, effectiveDate, highlights } = props;
  const meta = COPY[changeType];

  return (
    <EmailLayout preview={meta.preview(props)} hideDisclaimer>
      <Heading as="h1" style={h1}>{meta.title}</Heading>

      <Text style={paragraph}>
        Hi {firstName(name)},{' '}
        {changeType === 'upgrade'
          ? <>your subscription has been upgraded from <strong>{fromPlan}</strong> to <strong>{toPlan}</strong>.</>
          : changeType === 'downgrade'
            ? <>your subscription has been changed from <strong>{fromPlan}</strong> to <strong>{toPlan}</strong>.</>
            : <>your billing cycle for <strong>{toPlan}</strong> has been updated.</>}
      </Text>

      <Text style={paragraph}>
        This change is effective <strong>{effectiveDate}</strong>.
      </Text>

      {highlights.length > 0 && (
        <Section style={card}>
          <Text style={cardTitle}>
            {changeType === 'upgrade' ? 'What\'s now unlocked' : 'What this means'}
          </Text>
          <ul style={list}>
            {highlights.map((h, i) => (
              <li key={i} style={listItem}>{h}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard`}>
          Open your dashboard →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Manage your plan anytime from{' '}
        <a href={`${emailConfig.appUrl}/dashboard/profile`} style={link}>
          Profile → Subscription
        </a>.
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
  background:   emailColors.bgTeal,
  borderRadius: '8px',
  padding:      '16px 20px',
  margin:       '8px 0 16px 0',
} as const;

const cardTitle = {
  fontFamily: emailFonts.sans,
  fontSize:   '13px',
  fontWeight: 700,
  letterSpacing: '0.8px',
  textTransform: 'uppercase' as const,
  color:      emailColors.klarifyTeal,
  margin:     '0 0 10px 0',
} as const;

const list = {
  paddingLeft: '20px',
  margin:      '0',
  color:       emailColors.textPrimary,
} as const;

const listItem = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  margin:     '0 0 6px 0',
} as const;

const link = {
  color:          emailColors.klarifyTeal,
  textDecoration: 'underline',
} as const;
