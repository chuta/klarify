import type { Metadata } from 'next';
import { LegalList, LegalPageShell, LegalSection } from '@/components/marketing/LegalPageShell';

export const metadata: Metadata = {
  title: 'Cookie Policy — Klarify',
  description:
    'How Klarify uses cookies and similar technologies on klarify.africa.',
};

const LAST_UPDATED = '22 May 2026';

export default function CookiePolicyPage(): JSX.Element {
  return (
    <LegalPageShell title="Cookie Policy" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. What this policy covers">
        <p>
          This Cookie Policy explains how Blockspace Technologies Limited (&quot;Blockspace&quot;,
          &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) uses cookies and similar technologies
          when you visit or use Klarify at klarify.africa (the &quot;Platform&quot;).
        </p>
        <p>
          It should be read alongside our{' '}
          <a href="/legal/privacy" className="text-[#0B6E6E] hover:underline">
            Privacy Policy
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. What are cookies?">
        <p>
          Cookies are small text files stored on your device when you visit a website. They help
          websites remember your session, preferences, and security settings. Similar technologies
          (such as local storage) may be used for the same purposes.
        </p>
      </LegalSection>

      <LegalSection title="3. Cookies we use">
        <p>
          <strong className="text-[#1A1A1A]">Strictly necessary cookies</strong>
        </p>
        <p>
          These cookies are required for the Platform to function. Without them, you cannot sign in
          or use authenticated features.
        </p>
        <LegalList
          items={[
            'Authentication session cookies (Supabase): maintain your signed-in session and secure access to your account and organisation workspace.',
            'Security cookies: help protect against cross-site request forgery and unauthorised access.',
          ]}
        />

        <p className="pt-2">
          <strong className="text-[#1A1A1A]">Functional cookies</strong>
        </p>
        <LegalList
          items={[
            'Preference cookies: remember choices such as active conversation context in the browser (for example, local storage used by chat features).',
            'Notification preference tokens: if you use email unsubscribe links, related tokens may be stored to honour your preferences.',
          ]}
        />

        <p className="pt-2">
          <strong className="text-[#1A1A1A]">Third-party cookies</strong>
        </p>
        <p>
          When you use certain features, third parties may set their own cookies:
        </p>
        <LegalList
          items={[
            'Korapay (payments): when you complete checkout for a subscription, Korapay may use cookies or similar technologies as part of payment processing.',
            'Analytics (if enabled): we may use product analytics tools that set cookies to understand usage and improve the Platform. If enabled, we will describe the provider here and, where required, request consent before non-essential analytics cookies are placed.',
          ]}
        />
      </LegalSection>

      <LegalSection title="4. How long cookies last">
        <p>
          Session cookies expire when you close your browser or sign out. Persistent cookies (such
          as authentication refresh tokens) may remain for a limited period defined by our
          authentication provider so you stay signed in securely. You can sign out at any time to
          end your session.
        </p>
      </LegalSection>

      <LegalSection title="5. Managing cookies">
        <p>
          Most browsers allow you to block or delete cookies through settings. Blocking strictly
          necessary cookies will prevent you from signing in and using core Platform features.
        </p>
        <p>
          To clear Klarify session data, sign out from your account or clear site data for
          klarify.africa in your browser settings.
        </p>
      </LegalSection>

      <LegalSection title="6. Do Not Track">
        <p>
          There is no universally accepted standard for responding to &quot;Do Not Track&quot;
          signals. We currently do not respond to DNT signals, but we limit non-essential tracking
          to what is described in this policy and our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes">
        <p>
          We may update this Cookie Policy from time to time. Changes will be posted on this page
          with an updated &quot;Last updated&quot; date.
        </p>
      </LegalSection>

      <LegalSection title="8. Contact">
        <p>
          Questions about cookies:{' '}
          <a href="mailto:hello@klarify.africa" className="text-[#0B6E6E] hover:underline">
            hello@klarify.africa
          </a>
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
