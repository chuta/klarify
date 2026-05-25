-- Migration 018: lifecycle email drip log + email_lifecycle preference
--
-- email_drip_log records which nurture steps were sent (idempotency at DB layer).
-- Cron job lifecycleDrips.ts runs daily at 09:00 Lagos time.
-- Writes use the API DB role (BYPASSRLS / service connection — same as deadline cron).

CREATE TABLE IF NOT EXISTS email_drip_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sequence_id TEXT        NOT NULL,
  step_id     TEXT        NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resend_id   TEXT,
  UNIQUE (user_id, sequence_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_email_drip_log_user_sent
  ON email_drip_log (user_id, sent_at DESC);

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_lifecycle BOOLEAN NOT NULL DEFAULT TRUE;

-- RLS: users can read their own drip log (optional dashboard "emails sent" later).
ALTER TABLE email_drip_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY email_drip_log_self_select ON email_drip_log
  FOR SELECT
  USING (user_id = public.current_user_id());

-- Inserts/updates are performed by the cron connection (no GUC set).
