-- =============================================================================
-- Klarify — 002_rls.sql
-- Row-Level Security on every multi-tenant table.
-- CLAUDE.md §16 Rule 3: "Never expose user compliance data to other users.
-- RLS on every table. Every query must be scoped to the authenticated user's
-- organisation. Test this."
--
-- Pattern: the API sets two GUCs per request, before issuing any query:
--   SET LOCAL app.current_user_id = '<uuid>';
--   SET LOCAL app.current_org_id  = '<uuid>';
-- Policies read those via current_setting(..., true) and cast to UUID.
-- The `true` second arg returns NULL instead of erroring when unset, so
-- unauthenticated connections see nothing (FORCE RLS, deny by default).
--
-- Run after 001_init.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_org_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(target_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = target_org AND user_id = public.current_user_id()
  )
$$;

-- ---------------------------------------------------------------------------
-- USERS — a user can read/update only their own row
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_self_select ON public.users;
CREATE POLICY users_self_select ON public.users
  FOR SELECT USING (id = public.current_user_id());

DROP POLICY IF EXISTS users_self_update ON public.users;
CREATE POLICY users_self_update ON public.users
  FOR UPDATE USING (id = public.current_user_id())
             WITH CHECK (id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- ORGANISATIONS — members of the org can read; only owner can update
-- ---------------------------------------------------------------------------
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS orgs_member_select ON public.organisations;
CREATE POLICY orgs_member_select ON public.organisations
  FOR SELECT USING (public.is_org_member(id));

DROP POLICY IF EXISTS orgs_owner_update ON public.organisations;
CREATE POLICY orgs_owner_update ON public.organisations
  FOR UPDATE USING (owner_id = public.current_user_id())
             WITH CHECK (owner_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- ORG_MEMBERS — members of the org can see the roster
-- ---------------------------------------------------------------------------
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_members_member_select ON public.org_members;
CREATE POLICY org_members_member_select ON public.org_members
  FOR SELECT USING (public.is_org_member(org_id));

-- ---------------------------------------------------------------------------
-- USER_PROFILES — owner only
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_self_all ON public.user_profiles;
CREATE POLICY user_profiles_self_all ON public.user_profiles
  FOR ALL USING (user_id = public.current_user_id())
          WITH CHECK (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- Org-scoped tables — generic "org member" policy applied to every action
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  tbls TEXT[] := ARRAY[
    'readiness_scores',
    'roadmap_tasks',
    'generated_documents',
    'uploaded_documents',
    'conversations',
    'regulator_contacts',
    'regulator_interactions',
    'arip_applications',
    'compliance_events',
    'subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_org_all ON public.%I',
                   t, t);
    EXECUTE format(
      'CREATE POLICY %I_org_all ON public.%I
         FOR ALL USING (public.is_org_member(org_id))
                 WITH CHECK (public.is_org_member(org_id))',
      t, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- MESSAGES — scoped via parent conversation
-- ---------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_org_all ON public.messages;
CREATE POLICY messages_org_all ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND public.is_org_member(c.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND public.is_org_member(c.org_id)
    )
  );

-- ---------------------------------------------------------------------------
-- REGULATORS (reference data) — readable by any authenticated user
-- Writes performed by service-role connections only (RLS bypassed).
-- ---------------------------------------------------------------------------
ALTER TABLE public.regulators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulators FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regulators_authn_read ON public.regulators;
CREATE POLICY regulators_authn_read ON public.regulators
  FOR SELECT USING (public.current_user_id() IS NOT NULL);

-- ---------------------------------------------------------------------------
-- REGULATORY_CORPUS — readable by any authenticated user
-- (Section 11: corpus contents are public regulatory texts.)
-- Writes restricted to service-role (RLS bypassed by service connections).
-- ---------------------------------------------------------------------------
ALTER TABLE public.regulatory_corpus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_corpus FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS corpus_authn_read ON public.regulatory_corpus;
CREATE POLICY corpus_authn_read ON public.regulatory_corpus
  FOR SELECT USING (public.current_user_id() IS NOT NULL);
