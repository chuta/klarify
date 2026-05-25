# Klarify email drip sequences

Catalog of lifecycle, launch, and event-driven emails. Templates live in
`src/templates/` (transactional) and `src/templates/drips/` (lifecycle nurture).

**Automation recommendation:** use **app-owned scheduling**, not Resend Broadcasts
or Resend dashboard automations.

| Approach | Use for Klarify |
|----------|-----------------|
| **App cron + `@klarify/email` send helpers** | ✅ Lifecycle drips (Day 0–9), conditional skips, per-user personalization, idempotency |
| **Resend `scheduled_at` on single sends** | ✅ One-off delays (e.g. send Day 2 exactly 48h after onboarding) |
| **Resend Broadcasts** | Launch-day blast to a static segment only — not per-user drip logic |
| **Resend Contacts / Topics** | Optional later for marketing opt-in; transactional drips stay in-app |

Resend has no native “wait 2 days then send template B unless user upgraded”
workflow. That belongs in `apps/api` (daily cron) or a queue triggered at
signup/onboarding events. See `src/drips/registry.ts` for the canonical
sequence definition the cron should read.

---

## 1. Onboarding & launch nurture (`onboarding_launch_v1`)

Anchor: **`user.created_at`** (signup). Day offsets are calendar days at
**09:00 WAT** unless noted.

| Day | Step ID | Template | Status | Trigger / skip |
|-----|---------|----------|--------|----------------|
| 0 | `welcome` | `Welcome.tsx` | ✅ Live | `POST /api/auth/sync` or signup |
| 0–1 | `onboarding_complete` | `OnboardingComplete.tsx` | ✅ Live | `POST /api/onboarding/complete` |
| 1 | `classify_reminder` | `DripClassifyReminder.tsx` | 🔲 Optional | Skip if `product_classifications` exists |
| 2 | `readiness_explained` | `DripReadinessScoreExplained.tsx` | ✅ Built | Skip if onboarding incomplete |
| 4 | `post_letter_case_study` | `DripPostLetterCaseStudy.tsx` | ✅ Built | Skip if `plan !== 'free'` (optional) |
| 6 | `plan_comparison` | `DripPlanComparison.tsx` | ✅ Built | Skip if `plan` is compass or flagship |
| 9 | `launch_offer_expiry` | `DripLaunchOfferExpiry.tsx` | ✅ Built | Skip if paid plan or coupon already used |

Idempotency key pattern: `drip/{sequenceId}/{stepId}/{userId}`.

Preference type: `email_lifecycle` — opt-out via
`/api/notifications/unsubscribe?type=email_lifecycle`.

---

## 2. Launch event (virtual launch day)

| Step ID | Template | Status | Trigger |
|---------|----------|--------|---------|
| `launch_registered` | `DripLaunchEventRegistered.tsx` | 🔲 Planned | Luma/Typeform webhook or manual import |
| `launch_reminder_24h` | `DripLaunchEventReminder.tsx` | 🔲 Planned | `scheduled_at` 24h before event |
| `launch_reminder_30m` | `DripLaunchEventReminder.tsx` | 🔲 Planned | `scheduled_at` 30m before event |
| `launch_replay` | `DripLaunchReplay.tsx` | 🔲 Planned | +2h after event ends |

---

## 3. Book → app activation

| Step ID | Template | Status | Trigger |
|---------|----------|--------|---------|
| `book_reader_welcome` | `DripBookReaderWelcome.tsx` | 🔲 Planned | `/start?ref=book` signup with `source=book` |
| `book_day_3_roadmap` | `DripBookRoadmapNudge.tsx` | 🔲 Planned | Day 3 after book activation |

---

## 4. Re-engagement

| Step ID | Template | Status | Trigger |
|---------|----------|--------|---------|
| `abandoned_onboarding` | `DripAbandonedOnboarding.tsx` | 🔲 Planned | Signed up, onboarding incomplete, +48h |
| `inactive_14d` | `DripReengagement.tsx` | 🔲 Planned | No login 14 days, free/navigator |

---

## 5. Existing transactional (event-driven — not drips)

These are already built and wired to product events:

| Category | Templates |
|----------|-----------|
| Auth (Supabase HTML) | `confirm-signup`, `magic-link`, `reset-password`, `email-change`, `reauthentication` |
| Team | `TeamInvitation`, `TeamWelcome` |
| Compliance | `DocumentAnalysisCritical`, `DocumentAnalysisStandard`, `DeadlineReminder`, `TaskAssigned`, `WeeklyDigest`, `RegulatorFollowUp`, `AripStageAdvanced`, `AripGrowthAlert` |
| Billing | `SubscriptionReceipt`, `PaymentFailed`, `PlanChanged` |
| Admin / intake | `AdminCriticalEvent`, `FlagshipEnquiry`, `SpecialistRequest` |

---

## Implementation checklist (API — not in this package)

1. Migration: `018_email_drip_log.sql` — `email_drip_log` + `email_lifecycle` preference. ✅
2. Cron: `apps/api/src/jobs/lifecycleDrips.ts` + `services/lifecycleDripService.ts` — daily 09:00 WAT. ✅
3. `notification_preferences.email_lifecycle` (default true). ✅
4. Wire `sendDrip*` helpers via `sendLifecycleDripEmail()` with preference check + unsubscribe URL. ✅

---

## Preview locally

```bash
cd packages/email
pnpm preview
# Open http://localhost:4001 — drip templates appear under src/templates/drips/
```

Send a test via Resend CLI:

```bash
resend emails send \
  --from "Klarify <hello@klarify.africa>" \
  --to delivered@resend.dev \
  --subject "What your Readiness Score actually measures" \
  --react-email packages/email/src/templates/drips/DripReadinessScoreExplained.tsx
```
