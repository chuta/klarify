-- Sprint 5 Billing Migration
-- Replaces Flutterwave/Stripe columns with Korapay columns.
-- Adds korapay_transaction_ref, korapay_subscription_code columns.
-- Adds unique partial index for active subscriptions per org.
-- CLAUDE.md §3 — Korapay is the payment provider (NOT Flutterwave/Stripe).

-- 1. Drop old payment-provider columns if they exist (Sprint 0 schema had these).
ALTER TABLE subscriptions DROP COLUMN IF EXISTS flutterwave_sub_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS stripe_sub_id;

-- 2. Add Korapay-specific columns.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS korapay_transaction_ref  TEXT,
  ADD COLUMN IF NOT EXISTS korapay_subscription_code TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 3. Ensure status includes 'pending' (needed for pre-activation state).
-- Re-create the check constraint with the new allowed values.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('active', 'cancelled', 'past_due', 'pending'));

-- 4. Ensure billing_cycle constraint exists.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_billing_cycle_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_billing_cycle_check
  CHECK (billing_cycle IN ('monthly', 'annual'));

-- 5. Ensure plan constraint exists.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_plan_check
  CHECK (plan IN ('free', 'navigator', 'compass', 'flagship'));

-- 6. Unique partial index: one active subscription per org.
--    Pending subscriptions can coexist (multiple checkout attempts before payment).
DROP INDEX IF EXISTS subscriptions_org_active_unique;
CREATE UNIQUE INDEX subscriptions_org_active_unique
  ON subscriptions (org_id)
  WHERE status = 'active';

-- 7. Index on korapay_transaction_ref for webhook lookups.
CREATE INDEX IF NOT EXISTS subscriptions_korapay_ref_idx
  ON subscriptions (korapay_transaction_ref)
  WHERE korapay_transaction_ref IS NOT NULL;

-- 8. Index on org_id.
CREATE INDEX IF NOT EXISTS subscriptions_org_id_idx
  ON subscriptions (org_id);

-- 9. RLS policies — subscriptions are org-scoped.
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_org_read  ON subscriptions;
DROP POLICY IF EXISTS subscriptions_org_write ON subscriptions;

CREATE POLICY subscriptions_org_read ON subscriptions
  FOR SELECT
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY subscriptions_org_write ON subscriptions
  FOR ALL
  USING (
    org_id IN (
      SELECT om.org_id FROM org_members om
      WHERE om.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );
