import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { UrgencyBanner } from '../components/UrgencyBanner.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface AripGrowthAlertProps {
  name: string;
  organisationName: string;
  currentCustomers: number;
  maxCustomers: number;
  /** 0–100, e.g. 92.5 */
  utilPct: number;
  /** Days until AIP period expires, or null if unknown. */
  daysUntilAipExpiry: number | null;
  /** Whether the hard cap has been breached (utilPct >= 100). */
  capBreached: boolean;
  /** Unsubscribe URL for this email type. */
  unsubscribeUrl: string;
}

export const aripGrowthAlertSubject = (props: AripGrowthAlertProps): string => {
  if (props.capBreached) {
    return `⛔ ARIP customer cap breached — pause all acquisition now`;
  }
  return `⚠️ ARIP alert: ${Math.round(props.utilPct)}% of customer cap used`;
};

export function AripGrowthAlertEmail({
  name,
  organisationName,
  currentCustomers,
  maxCustomers,
  utilPct,
  daysUntilAipExpiry,
  capBreached,
  unsubscribeUrl,
}: AripGrowthAlertProps): JSX.Element {
  const level = capBreached ? 'CRITICAL' : 'HIGH';
  const roundedPct = Math.round(utilPct * 10) / 10;
  const remaining = Math.max(0, maxCustomers - currentCustomers);

  return (
    <EmailLayout
      preview={
        capBreached
          ? `Customer cap reached. Pause all acquisition immediately.`
          : `${roundedPct}% of your ARIP customer cap used. ${remaining} slots remaining.`
      }
    >
      <UrgencyBanner
        level={level}
        title={capBreached ? 'Customer cap breached' : 'Approaching customer cap'}
        subtitle={`${currentCustomers} of ${maxCustomers} customers · ${roundedPct}% used`}
      />

      <Heading as="h1" style={h1}>
        {capBreached ? 'ARIP customer cap breached' : 'ARIP customer cap warning'}
      </Heading>

      <Text style={paragraph}>
        {firstName(name)}, <strong>{organisationName}</strong>'s ARIP customer count has{' '}
        {capBreached ? (
          <>
            reached the <strong>maximum limit</strong> of{' '}
            <strong>{maxCustomers} customers</strong> permitted during the AIP period.
          </>
        ) : (
          <>
            reached <strong>{roundedPct}%</strong> of the maximum of{' '}
            <strong>{maxCustomers} customers</strong> permitted during the AIP period.
          </>
        )}
      </Text>

      {/* Gauge visual */}
      <Section style={gaugeSection}>
        <div style={gaugeTrack}>
          <div
            style={{
              ...gaugeFill,
              width: `${Math.min(100, roundedPct)}%`,
              background: capBreached ? emailColors.statusCritical : '#D4A843',
            }}
          />
        </div>
        <Text style={gaugeLabel}>
          {currentCustomers} / {maxCustomers} customers
          {!capBreached && ` · ${remaining} slot${remaining !== 1 ? 's' : ''} remaining`}
        </Text>
      </Section>

      {/* Regulatory context */}
      <Section style={infoCard}>
        <Text style={infoTitle}>What this means</Text>
        {capBreached ? (
          <Text style={infoBody}>
            Under Section 29d of the ARIP Framework (SEC Nigeria, June 2024), you must{' '}
            <strong>immediately pause all customer acquisition activities</strong>. Onboarding
            additional customers beyond the 10% growth cap could result in regulatory sanction and
            may jeopardise your path to full registration. Notify your compliance officer and
            solicitor immediately.
          </Text>
        ) : (
          <Text style={infoBody}>
            Under Section 29d of the ARIP Framework (SEC Nigeria, June 2024), customer growth
            during the AIP period is capped. You are approaching this limit. Review your customer
            acquisition pipeline and consider pausing onboarding activities until you have verified
            your position with your compliance officer.
          </Text>
        )}
      </Section>

      {daysUntilAipExpiry !== null && daysUntilAipExpiry > 0 && (
        <Text style={paragraphSmall}>
          Your AIP period expires in{' '}
          <strong>{daysUntilAipExpiry} day{daysUntilAipExpiry !== 1 ? 's' : ''}</strong>. Keep your
          compliance posture strong as you approach the transition-to-registration phase.
        </Text>
      )}

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button
          href={`${emailConfig.appUrl}/dashboard/arip`}
          variant={capBreached ? 'danger' : 'primary'}
        >
          View ARIP tracker →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        This is an automated compliance alert from Klarify. This is regulatory information, not
        legal advice. Consult your solicitor before taking action.{' '}
        <a href={unsubscribeUrl} style={link}>
          Unsubscribe from ARIP alerts
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

function firstName(name: string): string {
  return (name || 'there').trim().split(/\s+/)[0] || 'there';
}

const h1 = {
  fontFamily: emailFonts.sans,
  fontSize: '22px',
  fontWeight: 700,
  color: emailColors.textPrimary,
  margin: '0 0 12px 0',
  lineHeight: '28px',
} as const;

const paragraph = {
  fontFamily: emailFonts.sans,
  fontSize: '15px',
  lineHeight: '24px',
  color: emailColors.textPrimary,
  margin: '0 0 16px 0',
} as const;

const paragraphSmall = {
  ...paragraph,
  fontSize: '13px',
  color: emailColors.textMuted,
} as const;

const gaugeSection = {
  margin: '0 0 20px 0',
} as const;

const gaugeTrack = {
  background: emailColors.borderGrey,
  borderRadius: '999px',
  height: '12px',
  width: '100%',
  overflow: 'hidden',
  margin: '0 0 8px 0',
} as const;

const gaugeFill = {
  height: '12px',
  borderRadius: '999px',
} as const;

const gaugeLabel = {
  fontFamily: emailFonts.sans,
  fontSize: '13px',
  fontWeight: 600,
  color: emailColors.textMuted,
  textAlign: 'center' as const,
  margin: 0,
} as const;

const infoCard = {
  background: emailColors.bgGrey,
  border: `1px solid ${emailColors.borderGrey}`,
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 20px 0',
} as const;

const infoTitle = {
  fontFamily: emailFonts.sans,
  fontSize: '13px',
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  color: emailColors.textMuted,
  margin: '0 0 8px 0',
} as const;

const infoBody = {
  fontFamily: emailFonts.sans,
  fontSize: '14px',
  lineHeight: '22px',
  color: emailColors.textPrimary,
  margin: 0,
} as const;

const link = {
  color: emailColors.klarifyTeal,
  textDecoration: 'underline',
} as const;
