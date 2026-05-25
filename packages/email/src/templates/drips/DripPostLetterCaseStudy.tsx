import { Heading, Hr, Section, Text } from '@react-email/components';
import { EmailLayout } from '../../components/EmailLayout.js';
import { Button } from '../../components/Button.js';
import { UrgencyBanner } from '../../components/UrgencyBanner.js';
import { emailColors } from '../../components/tokens.js';
import { buildAppUrl } from '../../config.js';
import {
  DripUnsubscribeFooter,
  dripCard,
  dripCardTitle,
  dripH1,
  dripList,
  dripListItem,
  dripParagraph,
  dripParagraphSmall,
  firstName,
} from './shared.js';

export interface DripPostLetterCaseStudyProps {
  name: string;
  unsubscribeUrl?: string;
}

export const dripPostLetterCaseStudySubject = (): string =>
  'When SEC sends a letter — how one founder responded in 72 hours';

export function DripPostLetterCaseStudy({
  name,
  unsubscribeUrl,
}: DripPostLetterCaseStudyProps): JSX.Element {
  return (
    <EmailLayout
      preview="A composite founder story: regulatory letter → plain-language analysis → action plan → draft response."
    >
      <UrgencyBanner
        level="HIGH"
        title="Case study — Post-Letter founder workflow"
      />

      <Heading as="h1" style={dripH1}>
        &ldquo;I didn&apos;t understand the letter.&rdquo;
      </Heading>

      <Text style={dripParagraph}>
        Hi {firstName(name)}, this is a composite story from founders we built Klarify
        for — not legal advice, but a realistic picture of what happens when a regulator
        writes to you and the clock starts.
      </Text>

      <Section style={dripCard}>
        <Text style={dripCardTitle}>The situation</Text>
        <Text style={{ ...dripParagraphSmall, margin: 0 }}>
          Amaka runs a Nigerian digital asset exchange. A formal notice arrives from
          SEC Nigeria — dense language, a response window, and asks she is not sure she
          can answer without misstepping. Her team is small. Her lawyer is expensive
          and booked.
        </Text>
      </Section>

      <Text style={dripParagraph}>
        <strong>What she did with Klarify (under an hour):</strong>
      </Text>

      <ol style={dripList}>
        <li style={dripListItem}>
          <strong>Uploaded the PDF</strong> to Document Analyser — Klarify extracted
          the text and identified the issuing regulator and department.
        </li>
        <li style={dripListItem}>
          <strong>Got a plain-language summary</strong> — what the letter actually
          means, urgency level, and the specific asks as bullet points.
        </li>
        <li style={dripListItem}>
          <strong>Received a 72-hour action plan</strong> — ordered steps tagged
          IMMEDIATE, TODAY, and THIS WEEK so her team knew what to do first.
        </li>
        <li style={dripListItem}>
          <strong>Reviewed a draft acknowledgement</strong> — cooperative tone, no
          legal admissions, ready for her specialist to edit before submission.
        </li>
      </ol>

      <Text style={dripParagraph}>
        Amaka still engaged a qualified practitioner before sending anything. Klarify
        did not replace her lawyer — it gave her clarity, structure, and time back
        when both were scarce.
      </Text>

      <Section style={{ textAlign: 'center', margin: '28px 0 16px 0' }}>
        <Button href={buildAppUrl('/dashboard/documents')}>
          Try Document Analyser →
        </Button>
      </Section>

      <Hr style={{ borderColor: emailColors.borderGrey, margin: '24px 0 16px 0' }} />

      <Text style={dripParagraphSmall}>
        Navigator includes 5 document analyses per month. Compass includes unlimited
        analyses plus ARIP tracking and regulator CRM — built for teams actively
        engaging SEC Nigeria.
      </Text>

      <DripUnsubscribeFooter unsubscribeUrl={unsubscribeUrl} />
    </EmailLayout>
  );
}
