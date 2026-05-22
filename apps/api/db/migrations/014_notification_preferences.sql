-- Migration 014: notification_preferences (Sprint 5-D2)
--
-- Stores per-user email notification opt-in/out preferences.
-- All types default to TRUE (opted-in).
-- email_billing cannot be disabled via the UI but the column is present
-- for completeness; the application-layer enforces it always = true.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id               UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_deadline_alerts BOOLEAN     NOT NULL DEFAULT TRUE,
  email_weekly_digest   BOOLEAN     NOT NULL DEFAULT TRUE,
  email_document_analysis BOOLEAN   NOT NULL DEFAULT TRUE,
  email_arip_alerts     BOOLEAN     NOT NULL DEFAULT TRUE,
  email_billing         BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can only read/write their own row.
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_self ON notification_preferences
  FOR ALL
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());
