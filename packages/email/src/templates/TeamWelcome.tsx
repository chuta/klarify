import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { buildAppUrl } from '../config.js';

export interface TeamWelcomeProps {
  /** Display name of the new team member. */
  memberName: string;
  organisationName: string;
  /** Person who sent the invitation. */
  inviterName: string;
  /** e.g. 'admin' | 'member' | 'viewer' */
  role: string;
  /** Organisation plan label, e.g. 'Compass'. */
  planLabel?: string;
}

export const teamWelcomeSubject = (props: TeamWelcomeProps): string =>
  `Welcome to ${props.organisationName} on Klarify, ${firstName(props.memberName)}`;

export function TeamWelcomeEmail({
  memberName,
  organisationName,
  inviterName,
  role,
  planLabel,
}: TeamWelcomeProps): JSX.Element {
  const dashboardUrl = buildAppUrl('/dashboard');

  return (
    <EmailLayout
      preview={`You're now on the ${organisationName} team — here's how to get started.`}
    >
      <Heading as="h1" style={h1}>
        Welcome to {organisationName}, {firstName(memberName)}.
      </Heading>

      <Text style={paragraph}>
        You&apos;ve successfully joined <strong>{organisationName}</strong> on
        Klarify as a <strong>{roleLabel(role)}</strong>.
        {inviterName ? (
          <> {inviterName} invited you to collaborate on the team&apos;s compliance workspace.</>
        ) : null}
      </Text>

      <Section style={infoBox}>
        <Text style={infoLine}>
          <strong style={infoLabel}>Organisation</strong>
          <br />
          {organisationName}
        </Text>
        <Text style={infoLine}>
          <strong style={infoLabel}>Your role</strong>
          <br />
          {roleLabel(role)}
        </Text>
        {planLabel ? (
          <Text style={{ ...infoLine, marginBottom: 0 }}>
            <strong style={infoLabel}>Plan</strong>
            <br />
            {planLabel}
          </Text>
        ) : null}
      </Section>

      <Text style={paragraph}>
        Your dashboard is scoped to this organisation&apos;s Readiness Score,
        compliance roadmap, documents, and regulator data — exactly what your
        role allows.
      </Text>

      <Text style={paragraph}>As a {roleLabel(role).toLowerCase()}, you can:</Text>

      <ul style={list}>
        {roleAccessBullets(role).map((item) => (
          <li key={item} style={listItem}>{item}</li>
        ))}
      </ul>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={dashboardUrl}>Open your dashboard →</Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Billing and team invites are managed by your organisation owner.
        Questions? Reply to this email — we read every message.
      </Text>
    </EmailLayout>
  );
}

function firstName(name: string): string {
  return (name || 'there').trim().split(/\s+/)[0] || 'there';
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin:  'Administrator',
    owner:  'Owner',
    member: 'Team member',
    viewer: 'Viewer (read-only)',
  };
  return map[role.toLowerCase()] ?? role;
}

function roleAccessBullets(role: string): string[] {
  switch (role.toLowerCase()) {
    case 'admin':
      return [
        'View and update the team\'s Readiness Score and compliance roadmap',
        'Invite colleagues and manage team access',
        'Use FounderCounsel, document tools, and the regulator CRM',
      ];
    case 'viewer':
      return [
        'View the team\'s Readiness Score and compliance roadmap',
        'Read generated documents and regulator interactions',
        'Ask regulatory questions via FounderCounsel (read-only context)',
      ];
    default:
      return [
        'View and contribute to the team\'s Readiness Score and roadmap',
        'Analyse regulatory letters and generate compliance documents',
        'Ask FounderCounsel questions with your organisation\'s context',
      ];
  }
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

const infoBox = {
  backgroundColor: emailColors.bgGrey,
  border:          `1px solid ${emailColors.borderGrey}`,
  borderRadius:    '8px',
  padding:         '16px 20px',
  margin:          '0 0 20px 0',
} as const;

const infoLine = {
  ...paragraph,
  fontSize:     '14px',
  margin:       '0 0 12px 0',
} as const;

const infoLabel = {
  color: emailColors.textMuted,
  fontWeight: 600 as const,
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

const list = {
  paddingLeft: '20px',
  margin:      '0 0 16px 0',
  color:       emailColors.textPrimary,
} as const;

const listItem = {
  ...paragraph,
  margin: '0 0 8px 0',
} as const;
