import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface TaskAssignedProps {
  /** Person being assigned the task. */
  assigneeName: string;
  /** Person who assigned it. */
  assignerName: string;
  taskTitle: string;
  taskDescription: string;
  phase: number;             // 1-4
  regulatoryBasis?: string;  // e.g. "MLPPA 2022, Section 4"
  dueDate?: string;
  taskId: string;
  organisationName: string;
}

export const taskAssignedSubject = (props: TaskAssignedProps): string =>
  `${props.assignerName} assigned you: ${props.taskTitle}`;

export function TaskAssignedEmail({
  assigneeName,
  assignerName,
  taskTitle,
  taskDescription,
  phase,
  regulatoryBasis,
  dueDate,
  taskId,
  organisationName,
}: TaskAssignedProps): JSX.Element {
  return (
    <EmailLayout
      preview={`${assignerName} assigned you a compliance task in ${organisationName}.`}
    >
      <Heading as="h1" style={h1}>
        You have a new compliance task
      </Heading>

      <Text style={paragraph}>
        Hi {firstName(assigneeName)}, <strong>{assignerName}</strong> has
        assigned you a task in <strong>{organisationName}</strong>&apos;s
        roadmap.
      </Text>

      <Section style={card}>
        <div style={phaseTag}>Phase {phase}</div>
        <Text style={cardTitle}>{taskTitle}</Text>
        <Text style={cardBody}>{taskDescription}</Text>
        {regulatoryBasis && (
          <Text style={cardMeta}>
            <strong>Regulatory basis:</strong>{' '}
            <code style={code}>{regulatoryBasis}</code>
          </Text>
        )}
        {dueDate && (
          <Text style={cardMeta}>
            <strong>Due:</strong> {dueDate}
          </Text>
        )}
      </Section>

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button href={`${emailConfig.appUrl}/dashboard/roadmap?task=${taskId}`}>
          Open this task →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        When you complete this task, the team&apos;s Readiness Score updates
        in real time.
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
  padding:      '18px 20px',
  margin:       '0 0 8px 0',
} as const;

const phaseTag = {
  display:        'inline-block',
  background:     emailColors.bgTeal,
  color:          emailColors.klarifyTeal,
  fontSize:       '11px',
  fontWeight:     700,
  letterSpacing:  '1px',
  textTransform:  'uppercase' as const,
  padding:        '4px 10px',
  borderRadius:   '4px',
  marginBottom:   '10px',
} as const;

const cardTitle = {
  fontFamily: emailFonts.sans,
  fontSize:   '16px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '0 0 8px 0',
} as const;

const cardBody = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  margin:     '0 0 12px 0',
} as const;

const cardMeta = {
  fontFamily: emailFonts.sans,
  fontSize:   '13px',
  lineHeight: '20px',
  color:      emailColors.textMuted,
  margin:     '4px 0 0 0',
} as const;

const code = {
  fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
  fontSize:   '12px',
  background: emailColors.bgGrey,
  padding:    '2px 6px',
  borderRadius: '3px',
  color:      emailColors.klarifyNavy,
} as const;
