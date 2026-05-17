-- =============================================================================
-- Klarify — 004_auth.sql
-- Bind public.users to Supabase Auth (auth.users).
-- Pattern: auth.users is the canonical identity. A trigger mirrors every new
-- auth row into public.users with the same UUID. ON DELETE CASCADE keeps them
-- in lock-step.
--
-- Pre-condition: 001_init.sql, 002_rls.sql, 003_seed_regulators.sql executed.
-- Idempotent: re-running is safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- FK: public.users.id MUST exist in auth.users.id
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_id_fkey'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Trigger: mirror auth.users INSERTs into public.users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'name',
      NEW.raw_user_meta_data ->> 'full_name'
    ),
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Trigger: keep email in sync on auth.users UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_auth_user_email_update();

-- ---------------------------------------------------------------------------
-- Backfill: if auth.users already has rows, mirror them
-- (Harmless on a fresh project.)
-- ---------------------------------------------------------------------------
INSERT INTO public.users (id, email, name, avatar)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name'),
  u.raw_user_meta_data ->> 'avatar_url'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM public.users;
  RAISE NOTICE 'Klarify public.users now mirrors auth.users: % rows', n;
END $$;
