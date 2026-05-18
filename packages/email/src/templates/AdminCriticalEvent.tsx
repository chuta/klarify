import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { UrgencyBanner } from '../components/UrgencyBanner.js';
import { Button } from '../components/Button.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { emailConfig } from '../config.js';

export interface AdminCriticalEventProps {
  eventType: string;          // e.g. 'DOCUMENT_ANALYSIS_CRITICAL'
  organisationName: string;
  userEmail: string;
  summary: string;
  metadata?: Record<string, string | number>;
  /** Where to inspect this event in the admin console. */
  adminUrl?: string;
}

export const adminCriticalEventSubject = (props: AdminCriticalEventProps): string =>
  `[Klarify Admin] ${props.eventType} — ${props.organisationName}`;

/**
 * Internal staff notification. Sent to the platform operations inbox when
 * a high-stakes user event happens (e.g. a CRITICAL urgency document was
 * just analysed). Used to keep a human in the loop for users in crisis.
 *
 * NOT sent to end users — this is purely operational tooling.
 */
export function AdminCriticalEventEmail({
  eventType,
  organisationName,
  userEmail,
  summary,
  metadata,
  adminUrl,
}: AdminCriticalEventProps): JSX.Element {
  return (
    <EmailLayout
      preview={`Admin: ${eventType} from ${organisationName}`}
      hideDisclaimer
    >
      <UrgencyBanner
        level="CRITICAL"
        title="Internal alert"
        subtitle={eventType}
      />

      <Heading as="h1" style={h1}>{eventType}</Heading>

      <Text style={paragraph}><strong>Organisation:</strong> {organisationName}</Text>
      <Text style={paragraph}><strong>User:</strong> {userEmail}</Text>
      <Text style={paragraph}><strong>Summary:</strong> {summary}</Text>

      {metadata && Object.keys(metadata).length > 0 && (
        <Section style={meta}>
          <Text style={metaTitle}>METADATA</Text>
          {Object.entries(metadata).map(([k, v]) => (
            <Text key={k} style={metaRow}>
              <code>{k}</code>: {String(v)}
            </Text>
          ))}
        </Section>
      )}

      {adminUrl && (
        <Section style={{ textAlign: 'center', margin: '24px 0 8px 0' }}>
          <Button href={adminUrl}>Open in admin console →</Button>
        </Section>
      )}

      <Text style={paragraphSmall}>
        This event was flagged automatically by Klarify because it requires
        a human eye on it. Send via{' '}
        <a href={emailConfig.appUrl} style={link}>{emailConfig.appUrl}</a>.
      </Text>
    </EmailLayout>
  );
}

const h1 = {
  fontFamily: emailFonts.sans,
  fontSize:   '20px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '0 0 16px 0',
} as const;

const paragraph = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  margin:     '0 0 8px 0',
} as const;

const paragraphSmall = {
  ...paragraph,
  fontSize: '12px',
  color:    emailColors.textMuted,
  margin:   '20px 0 0 0',
} as const;

const meta = {
  background:   emailColors.bgGrey,
  border:       `1px solid ${emailColors.borderGrey}`,
  borderRadius: '6px',
  padding:      '12px 16px',
  margin:       '12px 0',
} as const;

const metaTitle = {
  fontFamily: emailFonts.sans,
  fontSize:   '11px',
  fontWeight: 700,
  letterSpacing: '1px',
  color:      emailColors.textMuted,
  margin:     '0 0 8px 0',
} as const;

const metaRow = {
  fontFamily: '"JetBrains Mono", "SF Mono", Menlo, Consolas, monospace',
  fontSize:   '12px',
  lineHeight: '18px',
  color:      emailColors.textPrimary,
  margin:     '0 0 4px 0',
} as const;

const link = {
  color:          emailColors.klarifyTeal,
  textDecoration: 'underline',
} as const;
