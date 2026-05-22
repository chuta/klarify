'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface FlagshipContactButtonProps {
  source: 'billing' | 'pricing';
  defaultName?: string;
  defaultEmail?: string;
  defaultCompany?: string;
  currentPlan?: string;
  accessToken?: string;
  className?: string;
}

const inputClass =
  'w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]';

export function FlagshipContactButton({
  source,
  defaultName = '',
  defaultEmail = '',
  defaultCompany = '',
  currentPlan,
  accessToken,
  className = 'block w-full rounded-lg border border-[#D4A843] py-2.5 text-center text-sm font-semibold text-[#D4A843] transition hover:bg-[#D4A843]/10',
}: FlagshipContactButtonProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [company, setCompany] = useState(defaultCompany);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEmail(defaultEmail);
    setCompany(defaultCompany);
    setSubmitted(false);
    setError(null);
    nameRef.current?.focus();
  }, [open, defaultName, defaultEmail, defaultCompany]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

        const res = await fetch('/api/billing/flagship-enquiry', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            company: company.trim(),
            phone: phone.trim() || undefined,
            message: message.trim(),
            source,
          }),
        });

        const data = (await res.json()) as { success: boolean; error?: string };
        if (!data.success) {
          setError(data.error ?? 'Could not send your enquiry. Please try again.');
          return;
        }

        setSubmitted(true);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [accessToken, company, email, message, name, phone, source],
  );

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Contact us
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Flagship plan enquiry"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#F5F5F5] px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#1A1A1A]">Flagship plan enquiry</h2>
                <p className="text-xs text-[#555555]">
                  Tell us about your team and we will follow up within one business day.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-[#555555] transition hover:bg-[#F5F5F5]"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {submitted ? (
              <div className="space-y-4 p-6">
                <div className="rounded-xl bg-[#E6F4F4] px-4 py-3 text-sm text-[#0B6E6E]">
                  Thank you — your enquiry has been sent to our team. We will reply to{' '}
                  <strong>{email}</strong> shortly.
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-xl bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                {currentPlan ? (
                  <p className="text-xs text-[#555555]">
                    Current plan: <span className="font-medium capitalize">{currentPlan}</span>
                  </p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="flagship-name" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                      Name <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      id="flagship-name"
                      ref={nameRef}
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="flagship-email" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                      Email <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      id="flagship-email"
                      type="email"
                      required
                      maxLength={200}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="flagship-company" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                      Company <span className="text-[#C0392B]">*</span>
                    </label>
                    <input
                      id="flagship-company"
                      type="text"
                      required
                      maxLength={200}
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="flagship-phone" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                      Phone <span className="text-[#999]">(optional)</span>
                    </label>
                    <input
                      id="flagship-phone"
                      type="tel"
                      maxLength={30}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="flagship-message" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                    How can we help? <span className="text-[#C0392B]">*</span>
                  </label>
                  <textarea
                    id="flagship-message"
                    required
                    rows={4}
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Team size, jurisdictions, compliance needs, timeline..."
                    className={`${inputClass} resize-none`}
                  />
                  <p className="mt-1 text-right text-[11px] text-[#CCCCCC]">{message.length}/2000</p>
                </div>

                {error ? (
                  <p className="rounded-lg bg-[#FDF2F2] px-3 py-2 text-sm text-[#C0392B]">{error}</p>
                ) : null}

                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-xl bg-[#D4A843] px-4 py-2.5 text-sm font-semibold text-[#1A1A1A] transition hover:bg-[#C49A33] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? 'Sending…' : 'Send enquiry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-[#CCCCCC] px-4 py-2.5 text-sm font-medium text-[#555555] transition hover:bg-[#F5F5F5]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
