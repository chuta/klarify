import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout.js';
import { Button } from '../../components/Button.js';
import { emailColors, emailFonts } from '../../components/tokens.js';
import { buildAppUrl } from '../../config.js';
import {
  DripUnsubscribeFooter,
  dripCard,
  dripCardTitle,
  dripH1,
  dripList,
  dripListItem,
  dripParagraph,
  dripParagraphSmall,
  firstName,
} from './shared.js';

export interface DripAbandonedOnboardingProps {
  name: string;
  unsubscribeUrl?: string;
}

export const dripAbandonedOnboardingSubject = (): string =>
  'Your Readiness Score is waiting';

export function DripAbandonedOnboarding({
  name,
  unsubscribeUrl,
}: DripAbandonedOnboardingProps): JSX.Element {
  return (
    <EmailLayout
      preview="Finish your 5-step setup to unlock your personalised Readiness Score and compliance roadmap."
    >
      <Heading as="h1" style={dripH1}>
        Your Readiness Score is waiting, {firstName(name)}
      </Heading>

      <Text style={dripParagraph}>
        You created your Klarify account but haven&apos;t finished onboarding yet.
        That means your <strong>Readiness Score</strong> — the live 0–100 gauge
        founders show investors and boards — hasn&apos;t been calculated for your
        product yet.
      </Text>

      <Section
        style={{
          background:   emailColors.bgPrimary,
          border:       `1px solid ${emailColors.borderGrey}`,
          borderRadius: '8px',
          padding:      '20px 24px',
          margin:       '8px 0 24px 0',
          textAlign:    'center',
        }}
      >
        <Text
          style={{
            fontFamily: emailFonts.sans,
            fontSize:   '12px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color:      emailColors.textMuted,
            margin:     '0 0 8px 0',
          }}
        >
          Your Readiness Score
        </Text>
        <Text
          style={{
            fontFamily: emailFonts.sans,
            fontSize:   '44px',
            fontWeight: 800,
            lineHeight: '48px',
            color:      emailColors.textLight,
            margin:     '0 0 4px 0',
          }}
        >
          —
          <span style={{ fontSize: '18px', fontWeight: 500, color: emailColors.textMuted }}>
            {' '}/ 100
          </span>
        </Text>
        <Text
          style={{
            fontFamily: emailFonts.sans,
            fontSize:   '13px',
            color:      emailColors.klarifyTeal,
            fontWeight: 600,
            margin:     0,
          }}
        >
          Complete onboarding to unlock
        </Text>
      </Section>

      <Section style={dripCard}>
        <Text style={dripCardTitle}>What you get in ~5 minutes</Text>
        <Text style={{ ...dripParagraphSmall, margin: 0 }}>
          Finish the 5-step wizard and Klarify will instantly build your personalised
          compliance baseline — product type, primary regulator, Readiness Score across
          8 dimensions, and a Phase 1 roadmap tailored to your stage.
        </Text>
      </Section>

      <Text style={dripParagraph}>
        <strong>Your next steps:</strong>
      </Text>

      <ol style={dripList}>
        <li style={dripListItem}>Tell us what you&apos;re building and your target markets</li>
        <li style={dripListItem}>Get your starting Readiness Score (updates in real time)</li>
        <li style={dripListItem}>Classify your product against Nigerian regulatory frameworks</li>
      </ol>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={buildAppUrl('/dashboard/onboarding')}>
          Finish onboarding →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={dripParagraphSmall}>
        Stuck? Reply to this email — we&apos;ll help you get set up.
      </Text>

      <DripUnsubscribeFooter unsubscribeUrl={unsubscribeUrl} />
    </EmailLayout>
  );
}
