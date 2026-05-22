/** Platform admin gate — comma-separated emails in KLARIFY_ADMIN_EMAILS. */
export function getPlatformAdminEmails(): string[] {
  const raw = process.env.KLARIFY_ADMIN_EMAILS ?? '';
  return raw
   .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getPlatformAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}
