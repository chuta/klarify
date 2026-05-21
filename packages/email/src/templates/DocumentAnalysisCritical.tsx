import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { UrgencyBanner } from '../components/UrgencyBanner.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { buildDocumentAnalysisUrl } from '../config.js';

export interface DocumentAnalysisCriticalProps {
  name: string;
  documentId: string;
  documentTitle: string;
  issuingRegulator: string;
  urgency: 'CRITICAL' | 'HIGH';
  daysRemaining: number | null;
  summary: string;
  topActions: string[];
}

export const documentAnalysisCriticalSubject = (
  props: DocumentAnalysisCriticalProps,
): string => {
  const prefix = props.urgency === 'CRITICAL' ? '⛔ Action Required' : '⚠️ Action Required';
  return `${prefix} — Klarify has analysed your regulatory document`;
};

/**
 * Sent immediately when a CRITICAL or HIGH urgency regulatory document
 * is analysed. This is the most stress-inducing email in the platform —
 * the design must reduce panic by being clear, structured, and pointing
 * to a single action (open the in-app action plan).
 *
 * Required by CLAUDE.md Sprint 3 — Task S3-C1.
 */
export function DocumentAnalysisCriticalEmail({
  name,
  documentId,
  documentTitle,
  issuingRegulator,
  urgency,
  daysRemaining,
  summary,
  topActions,
}: DocumentAnalysisCriticalProps): JSX.Element {
  const subtitle =
    daysRemaining !== null
      ? `You have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} to respond.`
      : 'No deadline was specified — respond promptly.';

  return (
    <EmailLayout
      preview={`${urgency}: ${issuingRegulator} document requires action${
        daysRemaining !== null ? ` within ${daysRemaining} days` : ''
      }.`}
    >
      <UrgencyBanner
        level={urgency}
        title={urgency === 'CRITICAL' ? 'Immediate action required' : 'Time-sensitive action required'}
        subtitle={subtitle}
      />

      <Heading as="h1" style={h1}>
        {firstName(name)}, we&apos;ve analysed your document.
      </Heading>

      <Text style={paragraph}>
        <strong>{documentTitle}</strong> from <strong>{issuingRegulator}</strong> has
        been processed by Klarify. Here&apos;s what you need to know:
      </Text>

      <Section style={summaryCard}>
        <Text style={summaryLabel}>SUMMARY</Text>
        <Text style={summaryBody}>{summary}</Text>
      </Section>

      <Heading as="h2" style={h2}>
        Top actions to take now
      </Heading>

      <ol style={list}>
        {topActions.slice(0, 3).map((action, i) => (
          <li key={i} style={listItem}>{action}</li>
        ))}
      </ol>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button
          href={buildDocumentAnalysisUrl(documentId)}
          variant={urgency === 'CRITICAL' ? 'danger' : 'primary'}
        >
          View your full action plan →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Your full 72-hour action plan, draft response, and citations are
        ready in the dashboard. Do not ignore this document. If you&apos;d
        like to escalate to a Nigerian digital asset regulatory specialist,
        you can request human escalation from your dashboard.
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

const h2 = {
  fontFamily: emailFonts.sans,
  fontSize:   '16px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '24px 0 12px 0',
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

const list = {
  paddingLeft: '20px',
  margin:      '0 0 16px 0',
  color:       emailColors.textPrimary,
} as const;

const listItem = {
  ...paragraph,
  margin: '0 0 10px 0',
} as const;

const summaryCard = {
  background:   emailColors.bgGrey,
  borderLeft:   `3px solid ${emailColors.klarifyTeal}`,
  borderRadius: '4px',
  padding:      '14px 18px',
  margin:       '16px 0 24px 0',
} as const;

const summaryLabel = {
  fontFamily: emailFonts.sans,
  fontSize:   '11px',
  fontWeight: 700,
  letterSpacing: '1.5px',
  color:      emailColors.textMuted,
  margin:     '0 0 6px 0',
} as const;

const summaryBody = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  margin:     0,
} as const;
