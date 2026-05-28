'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';
import { Spinner } from '@/components/icons';

/**
 * Brand-styled submit button that automatically reflects the parent form's
 * pending state via React's `useFormStatus()` hook.
 *
 * Why this exists:
 *   * Until this component shipped, our auth forms either had NO pending
 *     feedback (magic link, forgot password) or only swapped the label
 *     text (password, signup). When Supabase or our API took 8–10s, the
 *     user saw a fully-active-looking button — they thought the click
 *     didn't register and re-clicked, sometimes triggering a second
 *     password attempt or a duplicate magic link.
 *
 *   * `useFormStatus()` reads from the surrounding `<form>` automatically.
 *     The button doesn't need any props from the parent and works for both
 *     `<form action={serverAction}>` and `<form action={asyncClientFn}>`
 *     patterns. One less piece of state to wire up in every auth form.
 *
 *   * Visually: a small left-side spinner (animate-spin SVG) appears the
 *     instant submission starts, the label changes to `pendingLabel`, and
 *     the button is `disabled` with reduced opacity. `aria-busy` is also
 *     set for assistive tech.
 *
 * IMPORTANT: this component MUST be a descendant of the `<form>` whose
 * status it should reflect. Rendering it outside a form makes `pending`
 * always false.
 */
export interface SubmitButtonProps {
  /** Label shown when the form is idle. */
  label: string;
  /** Label shown while the form action is pending. Defaults to "{label}…". */
  pendingLabel?: string;
  /** Optional leading icon shown only in the idle state. */
  icon?: ReactNode;
  /** Override classNames — appended to the brand-teal default. */
  className?: string;
  /**
   * Force the disabled state even when not pending — useful when client-side
   * validation has produced an error that needs fixing before submit.
   */
  disabled?: boolean;
}

export function SubmitButton({
  label,
  pendingLabel,
  icon,
  className,
  disabled,
}: SubmitButtonProps): JSX.Element {
  const { pending } = useFormStatus();
  const isDisabled = disabled === true || pending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={[
        'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition',
        'hover:bg-[#0D2B45] active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[#0B6E6E] disabled:active:scale-100',
        className ?? '',
      ].join(' ')}
    >
      {pending ? (
        <>
          <Spinner className="animate-spin" />
          <span>{pendingLabel ?? `${label}…`}</span>
        </>
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
