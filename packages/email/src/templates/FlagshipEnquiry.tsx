import { Heading, Section, Text } from '@react-email/components';
import { EmailLayout } from '../components/EmailLayout.js';
import { emailColors, emailFonts } from '../components/tokens.js';

export interface FlagshipEnquiryProps {
  name: string;
  email: string;
  company: string;
  phone?: string;
  message: string;
  currentPlan?: string;
  source?: string;
}

export const flagshipEnquirySubject = (props: FlagshipEnquiryProps): string =>
  `Flagship plan enquiry — ${props.company}`;

export function FlagshipEnquiryEmail({
  name,
  email,
  company,
  phone,
  message,
  currentPlan,
  source,
}: FlagshipEnquiryProps): JSX.Element {
  return (
    <EmailLayout preview={`Flagship enquiry from ${name} at ${company}`} hideDisclaimer>
      <Heading as="h1" style={h1}>New Flagship plan enquiry</Heading>
      <Text style={paragraph}>
        Someone submitted the Flagship contact form on Klarify.
      </Text>

      <Section style={box}>
        <Text style={row}><strong>Name:</strong> {name}</Text>
        <Text style={row}><strong>Email:</strong> {email}</Text>
        <Text style={row}><strong>Company:</strong> {company}</Text>
        {phone ? <Text style={row}><strong>Phone:</strong> {phone}</Text> : null}
        {currentPlan ? <Text style={row}><strong>Current plan:</strong> {currentPlan}</Text> : null}
        {source ? <Text style={row}><strong>Source:</strong> {source}</Text> : null}
      </Section>

      <Text style={label}>Message</Text>
      <Text style={messageBox}>{message}</Text>

      <Text style={footer}>
        Reply directly to this person at {email}.
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
