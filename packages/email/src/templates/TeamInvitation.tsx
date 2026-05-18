import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface TeamInvitationProps {
  /** The recipient's email (used in the salutation when no name is known). */
  inviteeEmail: string;
  /** Person who sent the invitation. */
  inviterName: string;
  organisationName: string;
  /** e.g. 'admin' | 'compliance_officer' | 'member' */
  role: string;
  inviteToken: string;
  /** ISO date when the invite link expires. */
  expiresAt: string;
}

export const teamInvitationSubject = (props: TeamInvitationProps): string =>
  `${props.inviterName} invited you to ${props.organisationName} on Klarify`;

export function TeamInvitationEmail({
  inviteeEmail,
  inviterName,
  organisationName,
  role,
  inviteToken,
  expiresAt,
}: TeamInvitationProps): JSX.Element {
  const inviteUrl = `${emailConfig.appUrl}/invite?token=${encodeURIComponent(inviteToken)}`;

  return (
    <EmailLayout
      preview={`${inviterName} invited you to join ${organisationName} on Klarify.`}
      hideDisclaimer
    >
      <Heading as="h1" style={h1}>
        You&apos;ve been invited to {organisationName}
      </Heading>

      <Text style={paragraph}>
        <strong>{inviterName}</strong> has invited you ({inviteeEmail}) to join{' '}
        <strong>{organisationName}</strong> on Klarify as a{' '}
        <strong>{roleLabel(role)}</strong>.
      </Text>

      <Text style={paragraph}>
        Klarify is the regulatory compliance copilot for African digital
        asset and fintech teams. You&apos;ll get access to the team&apos;s
        Readiness Score, compliance roadmap, document analyser, and
        regulator CRM.
      </Text>

      <Section style={{ textAlign: 'center', margin: '24px 0 12px 0' }}>
        <Button href={inviteUrl}>Accept invitation →</Button>
      </Section>

      <Text style={paragraphSmall}>
        Or paste this link into your browser:{' '}
        <a href={inviteUrl} style={link}>{inviteUrl}</a>
      </Text>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        This invitation expires on <strong>{expiresAt}</strong>. If you
        weren&apos;t expecting this invitation, you can safely ignore this
        email.
      </Text>
    </EmailLayout>
  );
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin:              'Administrator',
    owner:              'Owner',
    compliance_officer: 'Compliance Officer',
    member:             'Team Member',
    viewer:             'Viewer',
  };
  return map[role.toLowerCase()] ?? role;
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

const link = {
  color:          emailColors.klarifyTeal,
  textDecoration: 'underline',
  wordBreak:      'break-all' as const,
} as const;
