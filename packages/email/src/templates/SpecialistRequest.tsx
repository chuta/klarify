import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { emailColors, emailFonts } from '../components/tokens.js';

export type SpecialistTopicKey =
  | 'enforcement_response'
  | 'arip'
  | 'aml'
  | 'cbn_payments'
  | 'corporate'
  | 'general';

const TOPIC_LABELS: Record<SpecialistTopicKey, string> = {
  enforcement_response: 'Enforcement / regulator letter response',
  arip: 'SEC Nigeria ARIP / licensing',
  aml: 'AML/CFT & NFIU compliance',
  cbn_payments: 'CBN payments / VASP banking',
  corporate: 'Corporate structure & CAC',
  general: 'General regulatory advisory',
};

export interface SpecialistRequestProps {
  name: string;
  email: string;
  company: string;
  phone?: string;
  topic: SpecialistTopicKey;
  urgency: 'critical' | 'standard';
  message: string;
  currentPlan?: string;
  source?: string;
  preferredSpecialistId?: string;
  preferredSpecialistName?: string;
  contextSummary?: string;
}

export function specialistRequestSubject(props: SpecialistRequestProps): string {
  const priority = props.currentPlan === 'flagship' ? '[PRIORITY] ' : '';
  const urgency = props.urgency === 'critical' ? 'CRITICAL' : 'Standard';
  const topic = TOPIC_LABELS[props.topic];
  return `${priority}[SPECIALIST] ${urgency} · ${topic} · ${props.company}`;
}

export function SpecialistRequestEmail({
  name,
  email,
  company,
  phone,
  topic,
  urgency,
  message,
  currentPlan,
  source,
  preferredSpecialistId,
  preferredSpecialistName,
  contextSummary,
}: SpecialistRequestProps): JSX.Element {
  return (
    <EmailLayout preview={`Specialist request from ${name} at ${company}`} hideDisclaimer>
      <Heading as="h1" style={h1}>New specialist introduction request</Heading>
      <Text style={paragraph}>
        A Compass+ user requested a warm introduction to the vetted specialist network.
      </Text>

      <Section style={box}>
        <Text style={row}><strong>Name:</strong> {name}</Text>
        <Text style={row}><strong>Email:</strong> {email}</Text>
        <Text style={row}><strong>Company:</strong> {company}</Text>
        {phone ? <Text style={row}><strong>Phone:</strong> {phone}</Text> : null}
        <Text style={row}><strong>Topic:</strong> {TOPIC_LABELS[topic]}</Text>
        <Text style={row}><strong>Urgency:</strong> {urgency === 'critical' ? 'Critical' : 'Standard'}</Text>
        {currentPlan ? <Text style={row}><strong>Plan:</strong> {currentPlan}</Text> : null}
        {source ? <Text style={row}><strong>Source:</strong> {source}</Text> : null}
        {preferredSpecialistName ? (
          <Text style={row}>
            <strong>Preferred specialist:</strong> {preferredSpecialistName}
            {preferredSpecialistId ? ` (${preferredSpecialistId})` : ''}
          </Text>
        ) : null}
      </Section>

      <Text style={label}>Situation summary</Text>
      <Text style={messageBox}>{message}</Text>

      {contextSummary ? (
        <>
          <Text style={label}>Platform context</Text>
          <Text style={messageBox}>{contextSummary}</Text>
        </>
      ) : null}

      <Text style={footer}>
        Reply to introduce within {urgency === 'critical' ? '24 hours' : '2 business days'}. User email: {email}
      </Text>
    </EmailLayout>
  );
}

const h1: React.CSSProperties = {
  color: emailColors.klarifyNavy,
  fontFamily: emailFonts.sans,
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  color: emailColors.textMuted,
  fontFamily: emailFonts.sans,
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 20px',
};

const box: React.CSSProperties = {
  backgroundColor: emailColors.bgGrey,
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '20px',
};

const row: React.CSSProperties = {
  color: emailColors.textPrimary,
  fontFamily: emailFonts.sans,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 6px',
};

const label: React.CSSProperties = {
  color: emailColors.klarifyNavy,
  fontFamily: emailFonts.sans,
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: '0 0 8px',
  textTransform: 'uppercase',
};

const messageBox: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  border: `1px solid ${emailColors.borderGrey}`,
  borderRadius: '8px',
  color: emailColors.textPrimary,
  fontFamily: emailFonts.sans,
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0 0 20px',
  padding: '16px',
  whiteSpace: 'pre-wrap',
};

const footer: React.CSSProperties = {
  color: emailColors.textMuted,
  fontFamily: emailFonts.sans,
  fontSize: '13px',
  lineHeight: '20px',
  margin: 0,
};
