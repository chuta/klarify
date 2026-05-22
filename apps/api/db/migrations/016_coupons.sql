-- Sprint 6A — Marketing coupon codes
-- Platform-wide coupons applied at Korapay checkout (discount before charge).

CREATE TABLE IF NOT EXISTS public.coupons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT NOT NULL,
  description       TEXT,
  discount_type     TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed_ngn')),
  discount_value    NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
  applicable_plans  TEXT[] NOT NULL DEFAULT ARRAY['all'],
  billing_cycles    TEXT[] NOT NULL DEFAULT ARRAY['monthly', 'annual'],
  max_redemptions   INT CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count  INT NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  max_per_org       INT NOT NULL DEFAULT 1 CHECK (max_per_org > 0),
  valid_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until       TIMESTAMPTZ,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_lower_idx ON public.coupons (LOWER(code));
CREATE INDEX IF NOT EXISTS coupons_active_idx ON public.coupons (is_active, valid_until);

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id       UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  org_id          UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_before   INT NOT NULL,
  amount_after    INT NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_org_coupon_idx
  ON public.coupon_redemptions (coupon_id, org_id);

CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_idx
  ON public.coupon_redemptions (coupon_id);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_amount INT,
  ADD COLUMN IF NOT EXISTS discount_amount INT;

CREATE TRIGGER trg_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
