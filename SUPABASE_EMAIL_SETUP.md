# Supabase Custom SMTP via Resend — Klarify Setup Guide

This document walks you through routing **all Supabase Auth emails** (signup
confirmation, magic link, password reset, email change, reauthentication)
through Klarify's verified Resend domain (`klarify.africa`).

After completing this guide:

- Auth emails arrive from `hello@klarify.africa` (instead of the default
  `noreply@mail.app.supabase.io`).
- All 5 auth emails use the branded Klarify templates in
  [`packages/email/src/supabase/`](./packages/email/src/supabase/).
- Deliverability improves dramatically (Resend's reputation + your verified
  domain vs. shared Supabase infrastructure).
- All other transactional emails (welcome, document analysis, deadline
  reminders, weekly digest, team invites, billing) are sent from the same
  domain via the `@klarify/email` package — fully branded and version-
  controlled.

---

## ⚠️ Critical — do this first or auth email links will break

> **If confirmation / magic links show "expired or invalid"**, the usual cause is
> using Supabase's default `{{ .ConfirmationURL }}` in email templates. That URL
> routes through Supabase's PKCE verifier endpoint (`…/auth/v1/verify?token=pkce_…`).
> The PKCE code exchange only works when the user opens the link in the **same
> browser** that requested the email. Mail apps, mobile, and in-app previews do
> not have the PKCE cookie → `/auth/callback` fails → user sees an error.
>
> **Fix (code + dashboard):**
> 1. Use the branded templates in `packages/email/src/supabase/` — they link
>    directly to `https://klarify.africa/auth/callback?token_hash={{ .TokenHash }}&type=…`
>    which works in any browser (no PKCE cookie required).
> 2. Re-paste all 4 link-based templates into Supabase Dashboard after pulling
>    this repo (templates are NOT auto-synced).
> 3. **Supabase Dashboard → Authentication → URL Configuration:**
>    - **Site URL:** `https://klarify.africa` (NOT `weklarify.netlify.app`)
>    - **Redirect URLs:** include `https://klarify.africa/auth/callback`
> 4. **Netlify env:** `NEXT_PUBLIC_APP_URL=https://klarify.africa`

> **If magic links click but don't sign users in** (legacy PKCE-only flow):
> Supabase only honours `emailRedirectTo` if that URL is in the Redirect URLs
> allowlist. Add `https://klarify.africa/auth/callback` and
> `http://localhost:3000/auth/callback` for local dev. See Section 1.3 below.

## Prerequisites

You should have already completed these steps before reading this guide:

- [x] `klarify.africa` domain verified in Resend
  (Resend Dashboard → Domains → DNS records all green)
- [x] `RESEND_API_KEY` set in Netlify (apps/web) env vars
- [x] `RESEND_API_KEY` set in your API host env vars (Fly.io secrets vault
      — for `apps/api`). Use `./apps/api/scripts/sync-fly-secrets.sh` to push
      it; verify with `fly secrets list --app klarify-api`.
- [x] `EMAIL_FROM=Klarify <hello@klarify.africa>` set in both Netlify and the
      API host
- [x] `EMAIL_REPLY_TO=hello@klarify.africa` set in both environments

---

## Part 1 — Configure Resend SMTP credentials in Supabase

### 1.1 — Generate an SMTP-only API key in Resend

Resend supports two authentication methods for sending email: the HTTP API
(used by `@klarify/email`) and SMTP (used by Supabase Auth). Use a separate
**SMTP-only** key for Supabase so it can be rotated independently if needed.

1. Go to <https://resend.com/api-keys>
2. Click **Create API Key**
3. Name it: `klarify-supabase-smtp`
4. Permission: **Sending access** → restrict to domain `klarify.africa`
5. Copy the key (starts with `re_`) — you will paste it into Supabase below.

### 1.2 — Configure Supabase Custom SMTP

1. Open your Supabase project at <https://supabase.com/dashboard>
2. Navigate to **Project Settings → Auth → SMTP Settings**
3. Toggle **"Enable Custom SMTP"** to ON
4. Fill in exactly these values:

| Field                 | Value                              |
| --------------------- | ---------------------------------- |
| Sender email          | `hello@klarify.africa`             |
| Sender name           | `Klarify`                          |
| Host                  | `smtp.resend.com`                  |
| Port                  | `465` (SSL) or `587` (STARTTLS)    |
| Username              | `resend`                           |
| Password              | *(paste the SMTP key from 1.1)*    |
| Minimum interval      | `60` (seconds — rate limit per user)|

5. Click **Save changes**
6. Click **Send test email** and send one to yourself to verify delivery.
   You should receive an email from `hello@klarify.africa` within 30 seconds.
   If not, check the Supabase logs (Auth → Logs) for SMTP errors.

> ⚠️ **Important**: Do NOT enable both Custom SMTP AND the Send Email Hook
> at the same time. We're using Custom SMTP only for the auth flow.

### 1.3 — Update Site URL and Redirect URLs

1. In Supabase: **Authentication → URL Configuration**
2. **Site URL**: `https://klarify.africa` (production)
   - Locally, you may want `http://localhost:3000` for development.
3. **Redirect URLs** — add ALL of these (one per line):

```
https://klarify.africa
https://klarify.africa/auth/callback
https://klarify.africa/auth/reset-password
https://klarify.africa/dashboard
https://klarify.africa/dashboard/onboarding
http://localhost:3000
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
http://localhost:3000/dashboard
http://localhost:3000/dashboard/onboarding
```

> Supabase rejects redirects that aren't in this allowlist. Without
> `/auth/reset-password` here, the password-reset flow will silently fail
> back to Site URL.

---

## Part 2 — Install the branded email templates

The 5 branded HTML files live in
[`packages/email/src/supabase/`](./packages/email/src/supabase/). You must
copy each one into the Supabase Dashboard.

### 2.1 — Update each template

For each of the 5 templates below:

1. In Supabase: **Authentication → Email Templates**
2. Click the template name in the left rail
3. Set the **Subject** field
4. Replace the **Message** body with the entire contents of the linked HTML
   file (open it in your editor, copy all, paste over the existing template)
5. Click **Save**

| Supabase template name        | Source file in repo                                                    | Subject                                       |
| ----------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| **Confirm signup**            | [`confirm-signup.html`](./packages/email/src/supabase/confirm-signup.html)         | `Confirm your Klarify account`               |
| **Magic Link**                | [`magic-link.html`](./packages/email/src/supabase/magic-link.html)                 | `Your Klarify sign-in link`                  |
| **Reset Password**            | [`reset-password.html`](./packages/email/src/supabase/reset-password.html)         | `Reset your Klarify password`                |
| **Change Email Address**      | [`email-change.html`](./packages/email/src/supabase/email-change.html)             | `Confirm your new Klarify email address`     |
| **Reauthentication**          | [`reauthentication.html`](./packages/email/src/supabase/reauthentication.html)     | `Your Klarify verification code`             |

### 2.2 — Verify templates render correctly

After saving each template, click **Send test email** in the Supabase
dashboard. You should receive a beautifully branded email from
`hello@klarify.africa` within a few seconds.

If the Klarify logo doesn't load in the email:

- The logo is fetched from `https://klarify.africa/klarify_logo.png`. Ensure
  the Netlify deployment is live and the asset is publicly accessible at
  that URL.
- Some email clients (notably Outlook Desktop) block remote images by default.
  This is normal — the tagline below the image acts as a textual fallback.

---

## Part 3 — Verify the full auth flow end-to-end

### 3.1 — Sign-up

1. Open <https://klarify.africa/sign-up> (or `http://localhost:3000/sign-up`)
2. Create a test account
3. Check your inbox — you should receive the **branded "Confirm your Klarify
   account" email** from `hello@klarify.africa`
4. Click the confirmation link → you should land on `/dashboard/onboarding`

### 3.2 — Magic link sign-in

1. Open `/sign-in`
2. Use the **Magic link** tab
3. Enter your email, submit
4. Check inbox — branded magic-link email arrives
5. Click "Sign in to Klarify" → you should land on the dashboard (or
   onboarding if you haven't completed it)

### 3.3 — Forgot password

1. Open `/sign-in/forgot-password`
2. Enter your email, submit
3. Check inbox — branded reset-password email arrives
4. Click "Set a new password" → you should land on `/auth/reset-password`
5. Enter a new password and confirm → you should land on `/sign-in?tab=password`
   with a success banner
6. Sign in with the new password → land on dashboard

### 3.4 — Email change

1. Once signed in, go to `/dashboard/profile`
2. (When the feature ships) — change the email field
3. Branded email-change email arrives at the NEW address
4. Click the confirmation link → email updated, signed in with new email

### 3.5 — Reauthentication (future MFA flows)

This only triggers when MFA is enabled and a sensitive action is performed.
The OTP-only email is sent automatically by Supabase when you call
`supabase.auth.reauthenticate()`.

---

## Part 4 — Transactional (non-auth) emails

All other emails (welcome, onboarding-complete, document-analysis,
deadline reminders, weekly digest, team invitations, billing receipts, etc.)
are sent directly from `apps/api` using the `@klarify/email` package.

These do NOT go through Supabase at all — they use the Resend HTTP API
directly, with React Email templates rendered at runtime.

The currently-wired-up integrations:

| Email                         | Triggered when                                  | Source file                                                                  |
| ----------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| **Welcome**                   | First time a user record is created             | [`apps/api/src/routes/auth.ts`](./apps/api/src/routes/auth.ts)               |
| **Onboarding complete**       | After `POST /api/onboarding/complete` succeeds  | [`apps/api/src/routes/onboarding.ts`](./apps/api/src/routes/onboarding.ts)   |

The other 12 templates exist in the repo and have typed `sendXxxEmail()`
helpers ready to call from anywhere in the codebase. They will be wired into
their respective features in upcoming sprints (Sprint 3+ per CLAUDE.md):

| Template                       | Wires up in           |
| ------------------------------ | --------------------- |
| `DocumentAnalysisCritical`     | Sprint 3 — S3-C1      |
| `DocumentAnalysisStandard`     | Sprint 3 — S3-C1      |
| `DeadlineReminder`             | Sprint 5 — Calendar   |
| `TaskAssigned`                 | Sprint 5 — Roadmap    |
| `WeeklyDigest`                 | Sprint 6 — Engagement |
| `TeamInvitation`               | Sprint 5 — Multi-seat |
| `SubscriptionReceipt`          | Sprint 7 — Billing    |
| `PaymentFailed`                | Sprint 7 — Billing    |
| `PlanChanged`                  | Sprint 7 — Billing    |
| `RegulatorFollowUp`            | Sprint 5 — CRM        |
| `AripStageAdvanced`            | Sprint 5 — ARIP       |
| `AdminCriticalEvent`           | Sprint 3 — S3-C1      |

---

## Part 5 — Operational notes

### Rotating the SMTP key

If you ever need to rotate the SMTP key:

1. Generate a new key in Resend (same permissions as the existing one)
2. Update the Password field in Supabase → Auth → SMTP Settings
3. Send a test email to confirm it still works
4. Revoke the old key in Resend

### Disabling Custom SMTP temporarily

If Resend is down or you need to fall back to Supabase's default email
infrastructure for an incident:

1. Supabase → Auth → SMTP Settings
2. Toggle **"Enable Custom SMTP"** OFF
3. Default Supabase email resumes — but emails will NOT be branded

Don't leave it off for more than an emergency window — the default
Supabase sender domain has low reputation and many of your emails will
land in spam folders.

### Monitoring deliverability

- **Resend Dashboard**: <https://resend.com/emails> — every email sent
  (whether via SMTP or API) appears here with delivery status, opens, and
  clicks.
- **Supabase Auth Logs**: Dashboard → Auth → Logs — shows SMTP errors if
  emails fail to send (e.g. invalid recipient, rate limit).
- **Set up bounce + complaint webhooks** in Resend so we can disable email
  for users who bounce or complain (recommended for production).

### Anti-abuse rate limits

Klarify already rate-limits API endpoints. Supabase additionally rate-limits
auth emails — the **Minimum interval (60 seconds)** in SMTP settings
prevents a user from spamming themselves with magic links. Don't lower
this without good reason.

---

## Troubleshooting

| Symptom                                       | Likely cause / fix                                                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Magic link email arrives but clicking it doesn't sign user in (redirected to sign-in page)** | `https://klarify.africa/auth/callback` is NOT in the Supabase Redirect URLs allowlist. Supabase falls back to the Site URL, the PKCE code is never exchanged, and the user gets no session. Fix: add the callback URL as described in Section 1.3.                                                       |
| Emails arrive from `mail.app.supabase.io`     | Custom SMTP is disabled. Re-enable in Supabase → Auth → SMTP Settings.                                                            |
| Emails not arriving at all                    | Check Supabase Auth Logs for SMTP errors. Common: wrong SMTP password (re-copy from Resend).                                      |
| Klarify logo broken in email                  | `https://klarify.africa/klarify_logo.png` not serving. Confirm Netlify deployment is live. Outlook Desktop blocks remote images by default — this is expected. |
| Reset password link redirects to `/`          | Add `https://klarify.africa/auth/reset-password` to Supabase Redirect URLs allowlist.                                             |
| User stuck in confirmation loop               | Check `Authentication → Providers → Email → Confirm email` is ON. Without this, sign-up never fires the confirm-signup email.    |
| `EMAIL_FROM` rejected                         | Resend domain not verified yet. Check Resend → Domains → klarify.africa shows all green DNS records.                              |
| Welcome email not arriving after signup       | The welcome email is sent by `apps/api`, not Supabase. Check `RESEND_API_KEY` is set on Fly (`fly secrets list --app klarify-api`). |

---

## Single source of truth

- **Auth template HTML**: [`packages/email/src/supabase/*.html`](./packages/email/src/supabase/)
- **Transactional template React Email**: [`packages/email/src/templates/`](./packages/email/src/templates/)
- **Email send helpers**: [`packages/email/src/send-helpers.ts`](./packages/email/src/send-helpers.ts)
- **Brand tokens (must match `packages/ui/src/tokens`)**: [`packages/email/src/components/tokens.ts`](./packages/email/src/components/tokens.ts)

Last updated: May 2026.
