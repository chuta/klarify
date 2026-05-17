import { redirect } from 'next/navigation';

/**
 * /onboarding — permanently redirected to /dashboard/onboarding.
 *
 * The wizard now lives inside the dashboard shell so users have full
 * sidebar navigation while completing their initial setup.
 */
export default function OnboardingPage(): never {
  redirect('/dashboard/onboarding');
}
