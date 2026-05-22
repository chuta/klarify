import type { Metadata } from 'next';
import { LegalList, LegalPageShell, LegalSection } from '@/components/marketing/LegalPageShell';

export const metadata: Metadata = {
  title: 'Privacy Policy — Klarify',
  description:
    'How Blockspace Technologies Limited collects, uses, and protects your personal data when you use Klarify.',
};

const LAST_UPDATED = '22 May 2026';

export default function PrivacyPolicyPage(): JSX.Element {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Introduction">
        <p>
          This Privacy Policy explains how Blockspace Technologies Limited (&quot;Blockspace&quot;,
          &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, stores, and protects
          personal data when you access or use Klarify at klarify.africa and related services
          (the &quot;Platform&quot;).
        </p>
        <p>
          We are committed to handling your data responsibly and in line with applicable law,
          including the Nigeria Data Protection Act 2023 (NDPA) and guidance from the Nigeria
          Data Protection Commission (NDPC).
        </p>
      </LegalSection>

      <LegalSection title="2. Data controller">
        <p>
          <strong className="text-[#1A1A1A]">Blockspace Technologies Limited</strong>
          <br />
          Lagos, Nigeria
          <br />
          Email:{' '}
          <a href="mailto:hello@klarify.africa" className="text-[#0B6E6E] hover:underline">
            hello@klarify.africa
          </a>
        </p>
        <p>
          For privacy-related requests, contact us at the email above with the subject line
          &quot;Privacy Request&quot;.
        </p>
      </LegalSection>

      <LegalSection title="3. Personal data we collect">
        <p>Depending on how you use the Platform, we may collect:</p>
        <LegalList
          items={[
            'Account data: name, email address, authentication identifiers, and organisation details.',
            'Profile and onboarding data: product type, target markets, team size, compliance stage, and related profile fields you provide.',
            'Compliance and usage data: readiness scores, roadmap tasks, regulator interactions, ARIP tracker entries, calendar events, and notification preferences.',
            'AI interaction data: questions you ask, conversation history, classification inputs, and AI-generated responses.',
            'Document data: files you upload (such as regulatory letters), extracted text, analysis results, and generated compliance documents.',
            'Billing data: subscription plan, billing cycle, and payment references processed through our payment provider (we do not store full card details on our servers).',
            'Technical data: IP address, browser type, device information, log timestamps, and security-related events.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. How we use your data">
        <p>We use personal data to:</p>
        <LegalList
          items={[
            'Provide, operate, and improve the Platform and its features.',
            'Authenticate you and maintain your account and organisation workspace.',
            'Generate personalised compliance guidance, scores, roadmaps, and documents.',
            'Process subscriptions and send transactional emails (such as alerts, billing notices, and account messages).',
            'Respond to support requests and specialist introduction requests.',
            'Maintain security, prevent fraud, and enforce our Terms of Service.',
            'Comply with legal obligations and respond to lawful requests from authorities.',
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Legal bases for processing (NDPA)">
        <p>Under the NDPA, we rely on one or more of the following bases:</p>
        <LegalList
          items={[
            'Contract: processing necessary to provide the Platform you signed up for.',
            'Legitimate interests: securing the Platform, improving features, and operating our business, balanced against your rights.',
            'Consent: where required for optional communications or specific processing you opt into.',
            'Legal obligation: where we must retain or disclose data to comply with applicable law.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. AI processing">
        <p>
          Klarify uses artificial intelligence to provide regulatory information and educational
          guidance. Your inputs may be sent to third-party AI providers to generate responses.
          AI outputs are not legal advice and should be reviewed with a qualified practitioner
          before reliance.
        </p>
        <p>
          We do not use your uploaded regulatory documents or compliance data to train public
          foundation models. Processing is limited to delivering the service to you and your
          organisation.
        </p>
      </LegalSection>

      <LegalSection title="7. How we share data">
        <p>We do not sell your personal data. We share data only with:</p>
        <LegalList
          items={[
            'Service providers that help us run the Platform (hosting, database, authentication, email, payments, cloud storage, OCR, and AI inference).',
            'Professional advisers where required (for example, lawyers or accountants under confidentiality).',
            'Regulators or law enforcement when required by applicable law or a valid legal process.',
            'Other members of your organisation workspace, as configured by your account and role.',
          ]}
        />
        <p>
          Key subprocessors may include Supabase (authentication and database), cloud storage
          providers, Resend (email), Korapay (payments), and AI inference providers. We require
          appropriate contractual safeguards where data is processed on our behalf.
        </p>
      </LegalSection>

      <LegalSection title="8. International transfers">
        <p>
          Some of our service providers may process data outside Nigeria. Where this occurs, we
          take steps to ensure appropriate safeguards consistent with the NDPA, such as contractual
          protections and limiting transfers to what is necessary to operate the Platform.
        </p>
      </LegalSection>

      <LegalSection title="9. Data retention">
        <p>
          We retain personal data for as long as your account is active and as needed to provide
          the Platform, resolve disputes, enforce agreements, and meet legal obligations. You may
          request deletion of your account subject to exceptions (for example, billing records we
          must retain by law).
        </p>
      </LegalSection>

      <LegalSection title="10. Your rights">
        <p>
          Subject to the NDPA and applicable exceptions, you may have the right to access, rectify,
          erase, restrict, or object to certain processing of your personal data, and to withdraw
          consent where processing is consent-based. You may also lodge a complaint with the
          Nigeria Data Protection Commission.
        </p>
        <p>
          To exercise your rights, email{' '}
          <a href="mailto:hello@klarify.africa" className="text-[#0B6E6E] hover:underline">
            hello@klarify.africa
          </a>
          . We may need to verify your identity before responding.
        </p>
      </LegalSection>

      <LegalSection title="11. Security">
        <p>
          We implement technical and organisational measures designed to protect personal data,
          including encryption in transit, access controls, and row-level security for
          organisation-scoped data. No method of transmission or storage is completely secure;
          we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="12. Children">
        <p>
          The Platform is intended for founders, operators, and professionals. It is not directed
          at children under 18, and we do not knowingly collect personal data from children.
        </p>
      </LegalSection>

      <LegalSection title="13. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. We will post the revised version on
          this page and update the &quot;Last updated&quot; date. Material changes may also be
          communicated by email or in-product notice where appropriate.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          Questions about this Privacy Policy or our data practices:{' '}
          <a href="mailto:hello@klarify.africa" className="text-[#0B6E6E] hover:underline">
            hello@klarify.africa
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
