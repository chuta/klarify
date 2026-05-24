// Shared auth contracts used by web, mobile, and api.

export interface AuthenticatedUser {
  readonly id: string;       // matches auth.users.id & public.users.id
  readonly email: string;
  readonly name?: string | null;
  readonly avatar?: string | null;
}

export interface OrgMembershipSummary {
  readonly orgId: string;
  readonly orgName: string;
  readonly role: 'owner' | 'admin' | 'member' | 'viewer';
  readonly plan: string;
}

export interface UserMeResponse {
  readonly user: AuthenticatedUser;
  readonly memberships: readonly OrgMembershipSummary[];
  /** True when the user has completed the onboarding wizard (user_profiles row exists). */
  readonly hasCompletedOnboarding: boolean;
}

// JWT payload shape we trust from Supabase (subset).
export interface SupabaseJwtClaims {
  readonly sub: string;
  readonly email?: string;
  readonly aud: 'authenticated' | string;
  readonly exp: number;
  readonly iat: number;
  readonly role?: 'authenticated' | 'anon' | 'service_role';
}
