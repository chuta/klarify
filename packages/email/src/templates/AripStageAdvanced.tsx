import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface AripStageAdvancedProps {
  name: string;
  organisationName: string;
  /** Licence type — DAX | DAOP | DAC | DAI. */
  licenceType: string;
  fromStage: string;
  toStage: string;
  /** What the user should do next at this new stage. */
  nextAction: string;
  /** Optional progress percentage 0-100. */
  progressPercent?: number;
}

const STAGE_LABELS: Record<string, string> = {
  pre_screening:      'Pre-screening',
  initial_assessment: 'Initial Assessment',
  eligibility:        'Eligibility Review',
  formal_app:         'Formal Application',
  aip:                'Approval In Principle (AIP)',
  aip_operations:     'AIP Operations Phase',
  full_registration:  'Full Registration',
};

const labelFor = (stage: string): string => STAGE_LABELS[stage] ?? stage;

export const aripStageAdvancedSubject = (props: AripStageAdvancedProps): string =>
  `ARIP progress: you've advanced to ${labelFor(props.toStage)}`;

export function AripStageAdvancedEmail({
  name,
  organisationName,
  licenceType,
  fromStage,
  toStage,
  nextAction,
  progressPercent,
}: AripStageAdvancedProps): JSX.Element {
  return (
    <EmailLayout
      preview={`${organisationName} has advanced from ${labelFor(fromStage)} to ${labelFor(toStage)} in the SEC Nigeria ARIP process.`}
    >
      <Heading as="h1" style={h1}>
        Milestone reached
      </Heading>

      <Text style={paragraph}>
        {firstName(name)}, <strong>{organisationName}</strong> has advanced
        to a new stage in the SEC Nigeria ARIP process for your{' '}
        <strong>{licenceType}</strong> licence application.
      </Text>

      <Section style={card}>
        <Text style={stageRow}>
          <span style={stageFrom}>{labelFor(fromStage)}</span>
          <span style={arrow}>→</span>
          <span style={stageTo}>{labelFor(toStage)}</span>
        </Text>
        {typeof progressPercent === 'number' && (
          <>
            <Text style={progressLabel}>{progressPercent}% of ARIP complete</Text>
            <div style={progressTrack}>
              <div style={{ ...progressFill, width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
            </div>
          </>
        )}
      </Section>

      <Heading as="h2" style={h2}>What to do next</Heading>
      <Text style={paragraph}>{nextAction}</Text>

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard/regulators/arip`}>
          Open ARIP tracker →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        ARIP is the SEC Nigeria Accelerated Regulatory Incubation Programme
        (June 2024). Klarify tracks all 5 stages and 4 ARIP-specific document
        templates for you automatically.
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
  margin:     '0 0 12px 0',
  lineHeight: '28px',
} as const;

const h2 = {
  fontFamily: emailFonts.sans,
  fontSize:   '16px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '20px 0 8px 0',
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
  background:   emailColors.bgGold,
  border:       `1px solid ${emailColors.klarifyGold}55`,
  borderRadius: '8px',
  padding:      '18px 22px',
  margin:       '8px 0 8px 0',
  textAlign:    'center' as const,
} as const;

const stageRow = {
  fontFamily: emailFonts.sans,
  fontSize:   '15px',
  fontWeight: 600,
  color:      emailColors.textPrimary,
  margin:     '0 0 14px 0',
} as const;

const stageFrom = {
  color:        emailColors.textMuted,
  fontWeight:   500,
} as const;

const stageTo = {
  color:        emailColors.klarifyTeal,
  fontWeight:   700,
} as const;

const arrow = {
  color:   emailColors.textMuted,
  margin:  '0 10px',
} as const;

const progressLabel = {
  fontFamily: emailFonts.sans,
  fontSize:   '12px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  color:      emailColors.textMuted,
  margin:     '0 0 6px 0',
} as const;

const progressTrack = {
  background:   emailColors.borderGrey,
  borderRadius: '999px',
  height:       '8px',
  width:        '100%',
  overflow:     'hidden',
} as const;

const progressFill = {
  background:   emailColors.klarifyGold,
  height:       '8px',
  borderRadius: '999px',
} as const;
