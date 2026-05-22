import { redirect } from 'next/navigation';

/** Legacy billing URL — subscription management lives under /dashboard/billing. */
export default function BillingRedirect(): never {
  redirect('/dashboard/billing');
}
