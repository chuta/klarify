-- Sprint 5+ — Organisation team invites
-- Pending invitations for Compass+ multi-seat orgs.

CREATE TABLE IF NOT EXISTS public.org_invites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member'
              CHECK (role IN ('admin', 'member', 'viewer')),
  token_hash  TEXT NOT NULL UNIQUE,
  invited_by  UUID NOT NULL REFERENCES public.users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org ON public.org_invites(org_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.org_invites(lower(email));

-- One active (non-revoked, non-accepted) invite per email per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invites_active_email
  ON public.org_invites(org_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.org_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_invites FORCE ROW LEVEL SECURITY;

-- Org members can see invites for their org (owners/admins manage via API service role checks)
DROP POLICY IF EXISTS org_invites_member_select ON public.org_invites;
CREATE POLICY org_invites_member_select ON public.org_invites
  FOR SELECT
  USING (public.is_org_member(org_id));
