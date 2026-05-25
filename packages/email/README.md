# @klarify/email

Klarify's transactional email package — Resend SDK + React Email templates.

## What's inside

```
src/
├── client.ts                        # sendEmail() + Resend SDK wrapper
├── config.ts                        # env-driven config (RESEND_API_KEY, EMAIL_FROM …)
├── render.ts                        # render React Email → HTML + plain-text
├── send-helpers.ts                  # typed sendXxxEmail() per template
├── components/                      # reusable email primitives
│   ├── EmailLayout.tsx              # 600px branded layout (header + footer)
│   ├── BrandHeader.tsx              # Klarify wordmark + tagline + teal accent
│   ├── BrandFooter.tsx              # legal disclaimer + company info
│   ├── Button.tsx                   # bullet-proof CTA button
│   ├── UrgencyBanner.tsx            # CRITICAL/HIGH/MEDIUM/LOW banner
│   ├── ScoreBadge.tsx               # Readiness Score display
│   └── tokens.ts                    # brand colours (mirrors packages/ui/tokens)
├── templates/                       # 14 React Email templates
│   ├── Welcome.tsx
│   ├── OnboardingComplete.tsx
│   ├── DocumentAnalysisCritical.tsx
│   ├── DocumentAnalysisStandard.tsx
│   ├── DeadlineReminder.tsx
│   ├── TaskAssigned.tsx
│   ├── WeeklyDigest.tsx
│   ├── TeamInvitation.tsx
│   ├── SubscriptionReceipt.tsx
│   ├── PaymentFailed.tsx
│   ├── PlanChanged.tsx
│   ├── RegulatorFollowUp.tsx
│   ├── AripStageAdvanced.tsx
│   ├── AdminCriticalEvent.tsx
│   └── drips/                       # Lifecycle nurture (Day 2–9 launch sequence)
│       ├── DripReadinessScoreExplained.tsx
│       ├── DripAbandonedOnboarding.tsx
│       ├── DripPostLetterCaseStudy.tsx
│       ├── DripPlanComparison.tsx
│       └── DripLaunchOfferExpiry.tsx
└── supabase/                        # 5 Supabase Dashboard HTML templates
    ├── confirm-signup.html
    ├── magic-link.html
    ├── reset-password.html
    ├── email-change.html
    ├── reauthentication.html
    └── README.md
```

## Usage

### Sending a transactional email

```ts
import { sendDocumentAnalysisCriticalEmail } from '@klarify/email';

await sendDocumentAnalysisCriticalEmail({
  to:             user.email,
  name:           user.name,
  documentId:     doc.id,
  documentTitle:  doc.originalFilename,
  issuingRegulator: 'SEC Nigeria',
  urgency:        'CRITICAL',
  daysRemaining:  19,
  summary:        analysis.plainLanguageSummary,
  topActions:     analysis.actionPlan.slice(0, 3).map((a) => a.action),
  idempotencyKey: `doc-critical:${doc.id}`,
});
```

### Required env vars

| Var                  | Required? | Example                          | Purpose                                  |
| -------------------- | --------- | -------------------------------- | ---------------------------------------- |
| `RESEND_API_KEY`     | Yes       | `re_g6...`                       | Resend HTTP API key (sending access)     |
| `EMAIL_FROM`         | Yes       | `Klarify <hello@klarify.africa>` | Default `From` header                    |
| `EMAIL_REPLY_TO`     | No        | `hello@klarify.africa`           | Default `Reply-To` header                |
| `EMAIL_LOGO_URL`     | No        | `https://…/klarify_logo.png`     | Override the brand logo URL              |
| `NEXT_PUBLIC_APP_URL`| Yes       | `https://klarify.africa`         | Used to build CTA links + default logo   |
| `EMAIL_BCC`          | No        | `ops@klarify.africa`             | Optional default BCC for ops oversight   |

### Local development (no email actually sent)

If `RESEND_API_KEY` is unset (e.g. local dev), `sendEmail()` will log the
intended recipient + subject and return `{ success: false, error: 'RESEND_API_KEY_MISSING' }`
without trying to send. This makes it safe to run any code path locally
without accidentally sending real email.

To preview templates visually during development:

```bash
pnpm --filter @klarify/email preview
# opens http://localhost:4001 with all templates rendered
```

(Requires `react-email` CLI dependency to be installed.)

### Send a template through Resend (CLI — same API as production)

Use the [Resend CLI](https://resend.com/docs/cli) to render a React Email template and
dispatch it from your verified domain (useful before Sprint 3 analysis is wired):

```bash
export RESEND_API_KEY=re_...   # from .env

resend emails send \
  --from "Klarify <hello@klarify.africa>" \
  --to delivered@resend.dev \
  --subject "⛔ Action Required — Klarify has analysed your regulatory document" \
  --react-email packages/email/src/templates/DocumentAnalysisCritical.preview.tsx \
  --idempotency-key "demo/doc-analysis-critical-preview" \
  --tags category=document_analysis_critical
```

Production sends use `notifyDocumentAnalysisComplete()` in `apps/api` (see
`POST /api/documents/:id/notify-analysis`).

## Brand rules (CLAUDE.md §7, §16)

- **Wordmark is mandatory** in every email header.
- **Brand teal** `#0B6E6E` is the primary accent.
- **Legal disclaimer** ("regulatory information, not legal advice") is shown
  by default in `BrandFooter`. Only hide it on purely transactional emails
  (billing receipts, team invitations) by passing `hideDisclaimer` to
  `EmailLayout`.
- All templates render inside `EmailLayout` — never construct a top-level
  `<Html>` in a template directly.

## Lifecycle drips

See **`DRIP_SEQUENCES.md`** for the full catalog (onboarding, launch event, book
activation, re-engagement) and automation architecture.

The **`onboarding_launch_v1`** sequence is defined in `src/drips/registry.ts`.
Send helpers: `sendDripAbandonedOnboardingEmail`, `sendDripReadinessScoreExplainedEmail`, `sendDripPostLetterCaseStudyEmail`,
`sendDripPlanComparisonEmail`, `sendDripLaunchOfferExpiryEmail`.

Wire a daily cron in `apps/api` — Resend has no native multi-step drip engine.

## Adding a new template

1. Add `src/templates/MyNewEmail.tsx`:
   ```tsx
   import { EmailLayout, Button } from '../components/index.js';

   export interface MyNewEmailProps { name: string; ctaUrl: string; }
   export const myNewSubject = (p: MyNewEmailProps) => `Hello ${p.name}`;
   export function MyNewEmail({ name, ctaUrl }: MyNewEmailProps): JSX.Element {
     return (
       <EmailLayout preview={`Hi ${name}`}>
         <p>Welcome, {name}!</p>
         <Button href={ctaUrl}>Open Klarify →</Button>
       </EmailLayout>
     );
   }
   ```
2. Export from `src/templates/index.ts`
3. Add a `sendMyNewEmail()` helper to `src/send-helpers.ts`
4. Call it from wherever the event happens.

## Supabase auth templates

See [`src/supabase/README.md`](./src/supabase/README.md) and
[`/SUPABASE_EMAIL_SETUP.md`](../../SUPABASE_EMAIL_SETUP.md) in the repo
root for full instructions.
