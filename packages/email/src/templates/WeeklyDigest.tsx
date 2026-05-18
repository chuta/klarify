import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { ScoreBadge } from '../components/ScoreBadge.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface WeeklyDigestProps {
  name: string;
  organisationName: string;
  score: number;
  scoreDelta: number;          // change since last week
  tasksCompleted: number;
  upcomingDeadlines: Array<{
    title: string;
    dueDate: string;
    daysRemaining: number;
  }>;
  newRegulatoryUpdates: Array<{
    title: string;
    regulator: string;
    summary: string;
  }>;
  weekStart: string;
  weekEnd: string;
}

export const weeklyDigestSubject = (props: WeeklyDigestProps): string =>
  `Your weekly Klarify digest — score ${props.score}/100${
    props.scoreDelta !== 0 ? ` (${props.scoreDelta > 0 ? '+' : ''}${props.scoreDelta})` : ''
  }`;

export function WeeklyDigestEmail({
  name,
  organisationName,
  score,
  scoreDelta,
  tasksCompleted,
  upcomingDeadlines,
  newRegulatoryUpdates,
  weekStart,
  weekEnd,
}: WeeklyDigestProps): JSX.Element {
  return (
    <EmailLayout
      preview={`Score: ${score}/100. ${tasksCompleted} tasks completed. ${upcomingDeadlines.length} deadlines coming up.`}
    >
      <Heading as="h1" style={h1}>
        Your week at {organisationName}
      </Heading>

      <Text style={paragraphSmall}>
        {weekStart} — {weekEnd}
      </Text>

      <ScoreBadge score={score} delta={scoreDelta} />

      <Section style={statsRow}>
        <Stat label="Tasks completed" value={String(tasksCompleted)} />
        <Stat label="Score change"   value={`${scoreDelta > 0 ? '+' : ''}${scoreDelta}`} />
        <Stat label="Upcoming"       value={String(upcomingDeadlines.length)} />
      </Section>

      {/* Upcoming deadlines */}
      {upcomingDeadlines.length > 0 && (
        <>
          <Heading as="h2" style={h2}>Upcoming deadlines</Heading>
          <Section>
            {upcomingDeadlines.slice(0, 5).map((d, i) => (
              <div key={i} style={listRow}>
                <strong>{d.title}</strong>
                <span style={{ color: emailColors.textMuted }}>
                  {' '}— {d.dueDate} (in {d.daysRemaining}d)
                </span>
              </div>
            ))}
          </Section>
        </>
      )}

      {/* Regulatory updates */}
      {newRegulatoryUpdates.length > 0 && (
        <>
          <Heading as="h2" style={h2}>This week in Nigerian regulation</Heading>
          {newRegulatoryUpdates.slice(0, 3).map((u, i) => (
            <Section key={i} style={updateCard}>
              <Text style={updateRegulator}>{u.regulator}</Text>
              <Text style={updateTitle}>{u.title}</Text>
              <Text style={updateSummary}>{u.summary}</Text>
            </Section>
          ))}
        </>
      )}

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard`}>
          Open your dashboard →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Want fewer of these? Adjust your email preferences in{' '}
        <a href={`${emailConfig.appUrl}/dashboard/profile`} style={link}>
          Profile → Notifications
        </a>.
      </Text>
    </EmailLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={statCell}>
      <Text style={statValue}>{value}</Text>
      <Text style={statLabel}>{label}</Text>
    </div>
  );
}

const h1 = {
  fontFamily: emailFonts.sans,
  fontSize:   '22px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '0 0 6px 0',
  lineHeight: '28px',
} as const;

const h2 = {
  fontFamily: emailFonts.sans,
  fontSize:   '15px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '24px 0 10px 0',
} as const;

const paragraphSmall = {
  fontFamily: emailFonts.sans,
  fontSize:   '13px',
  lineHeight: '20px',
  color:      emailColors.textMuted,
  margin:     '0 0 16px 0',
} as const;

const statsRow = {
  display:        'flex',
  flexDirection:  'row' as const,
  width:          '100%',
  background:     emailColors.bgGrey,
  borderRadius:   '8px',
  padding:        '14px 8px',
  margin:         '0 0 16px 0',
  textAlign:      'center' as const,
} as const;

const statCell = {
  flex:    1,
  padding: '0 8px',
} as const;

const statValue = {
  fontFamily: emailFonts.sans,
  fontSize:   '20px',
  fontWeight: 800,
  color:      emailColors.klarifyTeal,
  margin:     0,
} as const;

const statLabel = {
  fontFamily: emailFonts.sans,
  fontSize:   '11px',
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.8px',
  color:      emailColors.textMuted,
  margin:     '4px 0 0 0',
} as const;

const listRow = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  borderBottom: `1px solid ${emailColors.borderGrey}`,
  padding:    '10px 0',
} as const;

const updateCard = {
  border:       `1px solid ${emailColors.borderGrey}`,
  borderRadius: '6px',
  padding:      '12px 16px',
  margin:       '0 0 10px 0',
} as const;

const updateRegulator = {
  fontFamily: emailFonts.sans,
  fontSize:   '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  color:      emailColors.klarifyTeal,
  margin:     '0 0 4px 0',
} as const;

const updateTitle = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '0 0 4px 0',
} as const;

const updateSummary = {
  fontFamily: emailFonts.sans,
  fontSize:   '13px',
  lineHeight: '20px',
  color:      emailColors.textMuted,
  margin:     0,
} as const;

const link = {
  color:          emailColors.klarifyTeal,
  textDecoration: 'underline',
} as const;
