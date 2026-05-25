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
  dripParagraph,
  dripParagraphSmall,
  firstName,
} from './shared.js';

export interface DripPlanComparisonProps {
  name: string;
  /** Current plan slug for personalisation, e.g. 'free' | 'navigator'. */
  currentPlan?: string;
  unsubscribeUrl?: string;
}

export const dripPlanComparisonSubject = (): string =>
  'Navigator vs Compass — which Klarify plan fits your stage?';

interface PlanRow {
  feature: string;
  navigator: string;
  compass: string;
}

const COMPARISON: PlanRow[] = [
  { feature: 'AI regulatory Q&A', navigator: '50 / month', compass: 'Unlimited' },
  { feature: 'Document analyses', navigator: '5 / month', compass: 'Unlimited' },
  { feature: 'Compliance document templates', navigator: '3 / month', compass: 'Unlimited' },
  { feature: 'Team seats', navigator: '1', compass: 'Up to 5' },
  { feature: 'Jurisdictions', navigator: 'Nigeria only', compass: '2 markets' },
  { feature: 'ARIP Application Tracker', navigator: '—', compass: '✓' },
  { feature: 'Regulator CRM', navigator: '—', compass: '✓' },
  { feature: 'Scenario simulator', navigator: '—', compass: '✓' },
  { feature: 'Human specialist escalation', navigator: '—', compass: '✓' },
  { feature: 'Compliance report export', navigator: '—', compass: 'PDF' },
];

export function DripPlanComparison({
  name,
  currentPlan = 'free',
  unsubscribeUrl,
}: DripPlanComparisonProps): JSX.Element {
  const onFree = currentPlan === 'free';

  return (
    <EmailLayout
      preview="Pre-ARIP founders usually start on Navigator. Teams filing with SEC Nigeria need Compass."
    >
      <Heading as="h1" style={dripH1}>
        Which plan fits you right now?
      </Heading>

      <Text style={dripParagraph}>
        Hi {firstName(name)},{' '}
        {onFree
          ? 'you are on the free tier — enough to explore, but not enough to run a serious compliance programme.'
          : `you are on ${capitalize(currentPlan)}. Here is how it compares to Compass when you are ready to scale.`}
      </Text>

      <Section style={dripCard}>
        <Text style={dripCardTitle}>Quick guide</Text>
        <Text style={{ ...dripParagraphSmall, margin: '0 0 8px 0' }}>
          <strong style={{ color: emailColors.klarifyNavy }}>Navigator ($29/mo)</strong>
          {' — '}
          Solo founders validating product classification, asking regulatory questions,
          and generating a few core compliance documents.
        </Text>
        <Text style={{ ...dripParagraphSmall, margin: 0 }}>
          <strong style={{ color: emailColors.klarifyTeal }}>Compass ($99/mo)</strong>
          {' — '}
          Teams preparing for or actively in ARIP: unlimited AI and documents, ARIP
          tracker, regulator CRM, scenario simulator, and PDF compliance exports.
        </Text>
      </Section>

      <Section
        style={{
          border:       `1px solid ${emailColors.borderGrey}`,
          borderRadius: '8px',
          overflow:     'hidden',
          margin:       '0 0 20px 0',
        }}
      >
        <table
          cellPadding={0}
          cellSpacing={0}
          style={{ width: '100%', borderCollapse: 'collapse' }}
        >
          <thead>
            <tr style={{ background: emailColors.bgGrey }}>
              <th style={thStyle}>Feature</th>
              <th style={thStyle}>Navigator</th>
              <th style={{ ...thStyle, color: emailColors.klarifyTeal }}>Compass</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row, i) => (
              <tr key={row.feature} style={{ background: i % 2 === 0 ? emailColors.white : emailColors.bgPrimary }}>
                <td style={tdStyle}>{row.feature}</td>
                <td style={tdStyle}>{row.navigator}</td>
                <td style={{ ...tdStyle, fontWeight: 600, color: emailColors.klarifyTeal }}>
                  {row.compass}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Text style={dripParagraph}>
        Annual billing saves 20% on both plans. Flagship ($299/mo) adds unlimited
        jurisdictions, unlimited seats, and API access for enterprise teams.
      </Text>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={buildAppUrl('/dashboard/billing')}>
          Compare plans & upgrade →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={dripParagraphSmall}>
        Not sure? Reply to this email with your product type and ARIP stage — we will
        point you to the right tier.
      </Text>

      <DripUnsubscribeFooter unsubscribeUrl={unsubscribeUrl} />
    </EmailLayout>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const thStyle = {
  fontFamily: '"Inter", Arial, sans-serif',
  fontSize:   '12px',
  fontWeight: 700,
  textAlign:  'left' as const,
  padding:    '10px 12px',
  color:      emailColors.textMuted,
  borderBottom: `1px solid ${emailColors.borderGrey}`,
};

const tdStyle = {
  fontFamily: '"Inter", Arial, sans-serif',
  fontSize:   '13px',
  lineHeight: '20px',
  padding:    '10px 12px',
  color:      emailColors.textPrimary,
  borderBottom: `1px solid ${emailColors.borderGrey}`,
};
