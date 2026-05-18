import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { ScoreBadge } from '../components/ScoreBadge.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface OnboardingCompleteProps {
  name: string;
  score: number;            // 0–100
  productTypes: string[];   // e.g. ['DAX', 'DAC']
  primaryRegulator: string; // e.g. 'SEC Nigeria'
  nextTasks: Array<{ title: string; phase: number }>;
}

export const onboardingCompleteSubject = (): string =>
  'Your Klarify Readiness Score is ready';

export function OnboardingCompleteEmail({
  name,
  score,
  productTypes,
  primaryRegulator,
  nextTasks,
}: OnboardingCompleteProps): JSX.Element {
  return (
    <EmailLayout
      preview={`Your starting Readiness Score is ${score}/100. Here's your personalised roadmap.`}
    >
      <Heading
        as="h1"
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '22px',
          fontWeight: 700,
          color:      emailColors.textPrimary,
          margin:     '0 0 12px 0',
          lineHeight: '28px',
        }}
      >
        You&apos;re onboarded, {firstName(name)}.
      </Heading>

      <Text style={paragraph}>
        Based on what you told us, here&apos;s your starting position with
        Nigerian regulators — and the very next steps to build toward
        Regulator Ready status.
      </Text>

      <ScoreBadge score={score} />

      <Section style={summaryCard}>
        <Text style={summaryRow}>
          <strong>Product type:</strong> {productTypes.join(', ') || 'Not yet classified'}
        </Text>
        <Text style={summaryRow}>
          <strong>Primary regulator:</strong> {primaryRegulator}
        </Text>
      </Section>

      <Heading as="h2" style={h2}>
        Your next 3 tasks
      </Heading>

      <ol style={list}>
        {nextTasks.slice(0, 3).map((task, i) => (
          <li key={i} style={listItem}>
            <strong style={{ color: emailColors.klarifyTeal }}>
              Phase {task.phase}:
            </strong>{' '}
            {task.title}
          </li>
        ))}
      </ol>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard`}>
          Open your roadmap →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Your score will update in real time as you complete tasks, upload
        documents, and engage regulators.
      </Text>
    </EmailLayout>
  );
}

function firstName(name: string): string {
  return (name || 'there').trim().split(/\s+/)[0] || 'there';
}

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

const h2 = {
  fontFamily: emailFonts.sans,
  fontSize:   '16px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '24px 0 12px 0',
} as const;

const list = {
  paddingLeft: '20px',
  margin:      '0 0 16px 0',
  color:       emailColors.textPrimary,
} as const;

const listItem = {
  ...paragraph,
  margin: '0 0 10px 0',
} as const;

const summaryCard = {
  background:   emailColors.bgTeal,
  border:       `1px solid ${emailColors.klarifyTeal}33`,
  borderRadius: '6px',
  padding:      '16px 18px',
  margin:       '8px 0 24px 0',
} as const;

const summaryRow = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  margin:     '0 0 4px 0',
} as const;
