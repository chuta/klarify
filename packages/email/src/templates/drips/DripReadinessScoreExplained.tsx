import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout.js';
import { Button } from '../../components/Button.js';
import { ScoreBadge } from '../../components/ScoreBadge.js';
import { emailColors } from '../../components/tokens.js';
import { buildAppUrl } from '../../config.js';
import {
  DripUnsubscribeFooter,
  dripCard,
  dripH1,
  dripH2,
  dripMono,
  dripParagraph,
  dripParagraphSmall,
  firstName,
} from './shared.js';

export interface DripReadinessScoreExplainedProps {
  name: string;
  /** Current score if onboarding complete; omit to show generic copy. */
  score?: number;
  unsubscribeUrl?: string;
}

export const dripReadinessScoreExplainedSubject = (): string =>
  'What your Readiness Score actually measures';

const DIMENSIONS: Array<{ key: string; weight: string; summary: string }> = [
  {
    key:     'Corporate structure',
    weight:  '10%',
    summary: 'CAC registration, share structure, resident CEO, board composition.',
  },
  {
    key:     'Capital & licensing',
    weight:  '20%',
    summary: 'Minimum capital, ARIP progress, fidelity bond, paid-up capital evidence.',
  },
  {
    key:     'KYC infrastructure',
    weight:  '15%',
    summary: 'NIN/BVN verification, tiered KYC, EDD procedures, PEP screening.',
  },
  {
    key:     'AML/CFT programme',
    weight:  '20%',
    summary: 'BWRA, AML policy, goAML registration, MLRO appointment and qualifications.',
  },
  {
    key:     'Transaction monitoring',
    weight:  '10%',
    summary: 'Alert thresholds, daily review, STR and CTR filing workflows.',
  },
  {
    key:     'Regulatory reporting',
    weight:  '10%',
    summary: 'PEP register, quarterly training, annual BWRA review, record retention.',
  },
  {
    key:     'Regulator relationships',
    weight:  '10%',
    summary: 'SEC, CBN, and NFIU contacts logged; pre-screening and documented engagement.',
  },
  {
    key:     'Product classification',
    weight:  '5%',
    summary: 'Product classified, legal opinion, white paper, regulator notification.',
  },
];

export function DripReadinessScoreExplained({
  name,
  score,
  unsubscribeUrl,
}: DripReadinessScoreExplainedProps): JSX.Element {
  return (
    <EmailLayout
      preview="Your Readiness Score is an investor-grade compliance gauge — here is how each dimension works."
    >
      <Heading as="h1" style={dripH1}>
        Your Readiness Score, explained
      </Heading>

      <Text style={dripParagraph}>
        Hi {firstName(name)}, founders use Klarify&apos;s Readiness Score to answer one
        question: <strong>how close are we to regulator-ready?</strong> It is a live
        0–100 gauge across eight weighted dimensions — not a vanity metric.
      </Text>

      {typeof score === 'number' && <ScoreBadge score={score} />}

      <Text style={dripParagraph}>
        Each dimension maps to concrete indicators on your roadmap. Complete a task or
        upload evidence, and the score updates in real time — the same number you can
        show investors and your board.
      </Text>

      <Heading as="h2" style={dripH2}>
        The 8 dimensions (and their weights)
      </Heading>

      <Section style={dripCard}>
        {DIMENSIONS.map((dim) => (
          <Text key={dim.key} style={{ ...dripParagraphSmall, margin: '0 0 12px 0' }}>
            <strong style={{ color: emailColors.klarifyTeal }}>
              {dim.key} ({dim.weight})
            </strong>
            <br />
            {dim.summary}
          </Text>
        ))}
      </Section>

      <Text style={dripParagraph}>
        <strong style={dripMono}>Tip:</strong> Expand any dimension on your dashboard to
        see which indicators are incomplete and jump straight to the roadmap task that
        fixes them.
      </Text>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={buildAppUrl('/dashboard')}>
          View your score breakdown →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={dripParagraphSmall}>
        Tomorrow&apos;s best move: pick one Phase 1 task and mark it complete. Most
        founders gain 5–15 points in their first week.
      </Text>

      <DripUnsubscribeFooter unsubscribeUrl={unsubscribeUrl} />
    </EmailLayout>
  );
}
