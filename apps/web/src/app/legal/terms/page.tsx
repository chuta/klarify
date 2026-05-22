import type { Metadata } from 'next';
import { LegalList, LegalPageShell, LegalSection } from '@/components/marketing/LegalPageShell';

export const metadata: Metadata = {
  title: 'Terms of Service — Klarify',
  description:
    'Terms governing your use of Klarify, the compliance platform operated by Blockspace Technologies Limited.',
};

const LAST_UPDATED = '22 May 2026';

export default function TermsOfServicePage(): JSX.Element {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Agreement to these terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern access to and use of Klarify
          (klarify.africa) and related services (the &quot;Platform&quot;) operated by Blockspace
          Technologies Limited (&quot;Blockspace&quot;, &quot;we&quot;, &quot;us&quot;, or
          &quot;our&quot;).
        </p>
        <p>
          By creating an account, subscribing, or using the Platform, you agree to these Terms and
          our{' '}
          <a href="/legal/privacy" className="text-[#0B6E6E] hover:underline">
            Privacy Policy
          </a>
          . If you do not agree, do not use the Platform.
        </p>
      </LegalSection>

      <LegalSection title="2. What Klarify is — and is not">
        <p>
          Klarify is a compliance operations platform for African fintech and digital-asset
          businesses. It provides regulatory information, educational guidance, workflow tools,
          document generation, and related features powered in part by artificial intelligence.
        </p>
        <p>
          <strong className="text-[#1A1A1A]">Klarify does not provide legal advice.</strong> Nothing
          on the Platform constitutes legal, tax, accounting, or investment advice, nor does it
          create a solicitor–client or adviser–client relationship. You are solely responsible for
          decisions you make and submissions you file with regulators. Always consult a qualified
          Nigerian legal or compliance practitioner before acting on Platform content.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility">
        <p>
          You must be at least 18 years old and have authority to bind yourself or the organisation
          you represent. You represent that information you provide is accurate and that your use of
          the Platform complies with applicable law.
        </p>
      </LegalSection>

      <LegalSection title="4. Accounts and organisations">
        <p>
          You are responsible for safeguarding your login credentials and for all activity under
          your account. Organisation owners are responsible for managing team access and ensuring
          members comply with these Terms. Notify us promptly at{' '}
          <a href="mailto:hello@klarify.africa" className="text-[#0B6E6E] hover:underline">
            hello@klarify.africa
          </a>{' '}
          if you suspect unauthorised access.
        </p>
      </LegalSection>

      <LegalSection title="5. Subscriptions, billing, and plans">
        <p>
          Paid plans, features, and pricing are described on the Platform and may change with
          notice. Payments are processed through third-party payment providers (including Korapay).
          By subscribing, you authorise charges for your selected plan and billing cycle.
        </p>
        <LegalList
          items={[
            'Fees are generally non-refundable except where required by law or explicitly stated.',
            'Subscriptions renew according to your billing cycle unless cancelled before renewal.',
            'Feature limits (such as AI query quotas or document templates) depend on your plan tier.',
            'We may suspend or downgrade access for failed payments or chargebacks.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>You agree not to:</p>
        <LegalList
          items={[
            'Use the Platform for unlawful purposes or in violation of applicable regulations.',
            'Misrepresent your identity, product, or regulatory status to regulators or third parties using Platform outputs.',
            'Attempt to bypass plan limits, security controls, or access another organisation’s data.',
            'Upload malware, scrape the Platform at scale, or interfere with its operation.',
            'Reverse engineer, resell, or sublicense the Platform except as expressly permitted.',
            'Use the Platform to generate content that infringes third-party rights or harasses others.',
          ]}
        />
      </LegalSection>

      <LegalSection title="7. Your content">
        <p>
          You retain ownership of documents, data, and content you submit (&quot;Your Content&quot;).
          You grant us a limited licence to host, process, and display Your Content solely to
          operate and improve the Platform for you and your organisation. You represent that you
          have the rights necessary to submit Your Content and that it does not violate law or
          third-party rights.
        </p>
      </LegalSection>

      <LegalSection title="8. Our intellectual property">
        <p>
          The Platform, including its software, design, branding, regulatory corpus integration,
          and documentation, is owned by Blockspace or its licensors. These Terms do not grant you
          ownership of our intellectual property except for the limited right to use the Platform
          during your subscription or free-tier access.
        </p>
      </LegalSection>

      <LegalSection title="9. AI-generated content">
        <p>
          AI outputs may be incomplete, outdated, or incorrect despite our use of official regulatory
          sources. Regulatory frameworks change. You must independently verify citations, deadlines,
          and obligations before relying on any output or submitting materials to a regulator.
        </p>
        <p>
          Generated documents and draft responses are starting points for professional review — not
          final submissions. Blockspace is not liable for regulatory outcomes based on AI-generated
          content you use without appropriate review.
        </p>
      </LegalSection>

      <LegalSection title="10. Specialist introductions">
        <p>
          Where the Platform facilitates introductions to third-party practitioners, Blockspace
          arranges contact only. We do not guarantee availability, outcomes, or the advice of any
          third party. Your relationship with any introduced specialist is between you and them.
        </p>
      </LegalSection>

      <LegalSection title="11. Disclaimers">
        <p>
          THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES
          OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A
          PARTICULAR PURPOSE, NON-INFRINGEMENT, OR ACCURACY OF REGULATORY INFORMATION.
        </p>
      </LegalSection>

      <LegalSection title="12. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, BLOCKSPACE AND ITS DIRECTORS,
          EMPLOYEES, AND AFFILIATES WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, GOODWILL, OR REGULATORY
          APPROVAL, ARISING FROM YOUR USE OF THE PLATFORM.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE PLATFORM WILL NOT EXCEED THE GREATER OF
          (A) THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) USD $100
          (OR NGN EQUIVALENT), EXCEPT WHERE LIABILITY CANNOT BE LIMITED BY LAW.
        </p>
      </LegalSection>

      <LegalSection title="13. Indemnification">
        <p>
          You agree to indemnify and hold harmless Blockspace from claims, losses, and expenses
          (including reasonable legal fees) arising from your use of the Platform, Your Content,
          your violation of these Terms, or your regulatory submissions or business decisions.
        </p>
      </LegalSection>

      <LegalSection title="14. Suspension and termination">
        <p>
          We may suspend or terminate access if you breach these Terms, pose a security risk, or
          if required by law. You may cancel your subscription through the Platform or by contacting
          us. Provisions that by nature should survive termination (including disclaimers, liability
          limits, and indemnities) will survive.
        </p>
      </LegalSection>

      <LegalSection title="15. Governing law and disputes">
        <p>
          These Terms are governed by the laws of the Federal Republic of Nigeria, without regard
          to conflict-of-law principles. Disputes will be subject to the exclusive jurisdiction of
          the courts of Lagos State, Nigeria, unless mandatory law requires otherwise.
        </p>
      </LegalSection>

      <LegalSection title="16. Changes">
        <p>
          We may modify these Terms from time to time. Updated Terms will be posted on this page
          with a revised &quot;Last updated&quot; date. Continued use after changes take effect
          constitutes acceptance. Material changes may be notified by email or in-product notice.
        </p>
      </LegalSection>

      <LegalSection title="17. Contact">
        <p>
          Questions about these Terms:{' '}
          <a href="mailto:hello@klarify.africa" className="text-[#0B6E6E] hover:underline">
            hello@klarify.africa
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
