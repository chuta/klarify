import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface WelcomeEmailProps {
  /** First name, full name, or fallback display. */
  name: string;
}

export const welcomeSubject = (props: WelcomeEmailProps): string =>
  `Welcome to Klarify, ${firstName(props.name)}`;

export function WelcomeEmail({ name }: WelcomeEmailProps): JSX.Element {
  return (
    <EmailLayout
      preview="Your regulatory compliance copilot for African markets — start here."
    >
      <Heading
        as="h1"
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '22px',
          fontWeight: 700,
          color:      emailColors.textPrimary,
          margin:     '0 0 16px 0',
          lineHeight: '28px',
        }}
      >
        Welcome to Klarify, {firstName(name)}.
      </Heading>

      <Text style={paragraph}>
        You now have an AI-powered regulatory copilot for building digital
        asset and fintech products in African regulated markets — grounded in
        ISA 2025, SEC Nigeria Digital Asset Rules, the NFIU AML/CFT Framework,
        and pan-African VASP frameworks.
      </Text>

      <Text style={paragraph}>Here&apos;s what to do next:</Text>

      <ol style={list}>
        <li style={listItem}>
          <strong>Complete your 5-step onboarding</strong> so we can personalise
          your Readiness Score and roadmap.
        </li>
        <li style={listItem}>
          <strong>Classify your product</strong> — we&apos;ll tell you exactly
          which Nigerian regulator owns your product type.
        </li>
        <li style={listItem}>
          <strong>Ask FounderCounsel</strong> any regulatory question — get
          plain-English answers with citations.
        </li>
      </ol>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard/onboarding`}>
          Start onboarding →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '32px 0 20px 0' }} />

      <Text style={paragraphSmall}>
        Questions? Reply to this email — a real human reads every reply.
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
  fontSize: '14px',
  color:    emailColors.textMuted,
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
