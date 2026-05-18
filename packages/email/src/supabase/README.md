# Klarify — Supabase Auth Email Templates

These 5 HTML files are the **branded Klarify HTML templates** that replace
Supabase's default unbranded auth emails. They are designed to be **pasted
directly into Supabase Dashboard → Authentication → Email Templates**.

| Supabase template name        | File                          | Subject (set in dashboard)                |
| ----------------------------- | ----------------------------- | ----------------------------------------- |
| Confirm signup                | `confirm-signup.html`         | `Confirm your Klarify account`            |
| Magic Link                    | `magic-link.html`             | `Your Klarify sign-in link`               |
| Reset Password                | `reset-password.html`         | `Reset your Klarify password`             |
| Change Email Address          | `email-change.html`           | `Confirm your new Klarify email address`  |
| Reauthentication              | `reauthentication.html`       | `Your Klarify verification code`          |

## How to install

See [`/SUPABASE_EMAIL_SETUP.md`](../../../../SUPABASE_EMAIL_SETUP.md) in the repo root for the full step-by-step
configuration of Resend SMTP + template installation.

## Template variables

Supabase substitutes these variables at send time. **Do not change their
spelling or capitalisation** — they must be `{{ .ConfirmationURL }}` etc.

| Variable                | Used in                                              |
| ----------------------- | ---------------------------------------------------- |
| `{{ .ConfirmationURL }}`| confirm-signup, magic-link, reset-password, email-change |
| `{{ .Token }}`          | magic-link, reauthentication                         |
| `{{ .TokenHash }}`      | (available everywhere, used by /auth/callback fallback) |
| `{{ .Email }}`          | reset-password, email-change                         |
| `{{ .NewEmail }}`       | email-change                                         |
| `{{ .SiteURL }}`        | (available everywhere)                               |
| `{{ .Data.name }}`      | available if you stored `name` in `signUp().options.data` |

## Brand conformance

All 5 templates use the Klarify wordmark (loaded from
`https://klarify.africa/klarify_logo.png`), the brand palette (teal `#0B6E6E`,
navy `#0D2B45`, gold `#D4A843`) and Inter for typography with a system-font
fallback for clients that don't allow custom webfonts.

The wordmark is hosted at `apps/web/public/klarify_logo.png` and is publicly
accessible at `https://klarify.africa/klarify_logo.png` once Netlify is live.
Until the production domain resolves, the image may not load in Outlook
preview windows — but the email is still valid and accessible because all
templates have plain-text alt fallbacks and a tagline below the image.

## Editing

If you ever need to update the branding (e.g. new logo, new tagline), edit
the HTML files here, then re-paste into Supabase Dashboard. The templates
in the dashboard **are NOT auto-synced from this repo** — Supabase is the
source of truth at runtime, this folder is the source of truth in git.

To make a copy of what's currently live in Supabase, use:
```bash
curl -X GET \
  'https://api.supabase.com/v1/projects/{ref}/config/auth' \
  -H 'Authorization: Bearer SBP_ACCESS_TOKEN'
```
