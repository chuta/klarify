import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { Button } from '../components/Button.js';
import { UrgencyBanner } from '../components/UrgencyBanner.js';
import { emailColors, emailFonts } from '../components/tokens.js';
import { buildDocumentAnalysisUrl } from '../config.js';

export interface DocumentAnalysisStandardProps {
  name: string;
  documentId: string;
  documentTitle: string;
  issuingRegulator: string;
  urgency: 'MEDIUM' | 'LOW';
  summary: string;
}

export const documentAnalysisStandardSubject = (
  props: DocumentAnalysisStandardProps,
): string =>
  `Klarify has analysed your document from ${props.issuingRegulator}`;

/**
 * Sent when a MEDIUM/LOW urgency regulatory document is analysed. Tone is
 * calmer and informational — no panic-inducing imagery. Encourages the
 * user to log in within their normal cadence.
 */
export function DocumentAnalysisStandardEmail({
  name,
  documentId,
  documentTitle,
  issuingRegulator,
  urgency,
  summary,
}: DocumentAnalysisStandardProps): JSX.Element {
  return (
    <EmailLayout
      preview={`${issuingRegulator}: ${documentTitle} — analysis ready.`}
    >
      <UrgencyBanner
        level={urgency}
        title={urgency === 'MEDIUM' ? 'Response needed' : 'Advisory — for your awareness'}
      />

      <Heading as="h1" style={h1}>
        Your document analysis is ready, {firstName(name)}.
      </Heading>

      <Text style={paragraph}>
        We&apos;ve finished analysing <strong>{documentTitle}</strong> from{' '}
        <strong>{issuingRegulator}</strong>. Here&apos;s the summary:
      </Text>

      <Section style={summaryCard}>
        <Text style={summaryBody}>{summary}</Text>
      </Section>

      <Section style={{ textAlign: 'center', margin: '24px 0 16px 0' }}>
        <Button
          href={buildDocumentAnalysisUrl(documentId)}
        >
          View full analysis →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={paragraphSmall}>
        Your dashboard contains the full plain-language summary, regulatory
        ask, action items, and a draft response if applicable.
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

const summaryCard = {
  background:   emailColors.bgGrey,
  borderLeft:   `3px solid ${emailColors.klarifyTeal}`,
  borderRadius: '4px',
  padding:      '14px 18px',
  margin:       '8px 0 16px 0',
} as const;

const summaryBody = {
  fontFamily: emailFonts.sans,
  fontSize:   '14px',
  lineHeight: '22px',
  color:      emailColors.textPrimary,
  margin:     0,
} as const;
