'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  SPECIALIST_TOPIC_LABELS,
  type SpecialistRequestSource,
  type SpecialistTopic,
} from '@klarify/core';
import { createClient } from '@/lib/supabase/client';
import { CloseIcon } from '@/components/icons';
import { track } from '@/lib/analytics/events';

export interface SpecialistRequestDefaults {
  topic?: SpecialistTopic;
  urgency?: 'critical' | 'standard';
  message?: string;
  preferredSpecialistId?: string;
  preferredSpecialistName?: string;
  source?: SpecialistRequestSource;
  context?: {
    conversationId?: string;
    documentId?: string;
    orgName?: string;
    productTypes?: string[];
    lastUserMessage?: string;
    urgencyLevel?: string;
    regulatorCode?: string;
    documentFilename?: string;
  };
}

export interface SpecialistRequestModalProps {
  open: boolean;
  onClose: () => void;
  hasAccess: boolean;
  currentPlan: string;
  defaultName: string;
  defaultEmail: string;
  defaultCompany: string;
  defaults?: SpecialistRequestDefaults;
}

const inputClass =
  'w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]';

const TOPICS = Object.entries(SPECIALIST_TOPIC_LABELS) as [SpecialistTopic, string][];

export function SpecialistRequestModal({
  open,
  onClose,
  hasAccess,
  currentPlan,
  defaultName,
  defaultEmail,
  defaultCompany,
  defaults,
}: SpecialistRequestModalProps): JSX.Element | null {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [company, setCompany] = useState(defaultCompany);
  const [phone, setPhone] = useState('');
  const [topic, setTopic] = useState<SpecialistTopic>(defaults?.topic ?? 'general');
  const [urgency, setUrgency] = useState<'critical' | 'standard'>(
    defaults?.urgency ?? 'standard',
  );
  const [message, setMessage] = useState(defaults?.message ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setEmail(defaultEmail);
    setCompany(defaultCompany);
    setTopic(defaults?.topic ?? 'general');
    setUrgency(defaults?.urgency ?? 'standard');
    setMessage(defaults?.message ?? '');
    setSubmitted(false);
    setError(null);
    nameRef.current?.focus();
  }, [open, defaultName, defaultEmail, defaultCompany, defaults]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!hasAccess) return;
      setError(null);
      setIsSubmitting(true);
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          setError('Please sign in again to send your request.');
          return;
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        };

        const res = await fetch('/api/specialists/request', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            company: company.trim(),
            phone: phone.trim() || undefined,
            topic,
            urgency,
            message: message.trim(),
            preferredSpecialistId: defaults?.preferredSpecialistId,
            source: defaults?.source ?? 'dashboard',
            context: defaults?.context,
          }),
        });
        const data = (await res.json()) as {
          success: boolean;
          error?: string;
          data?: { sla: string };
        };
        if (!data.success) {
          setError(data.error ?? 'Could not send your request. Please try again.');
          return;
        }
        setSubmitted(true);
        track('specialist_requested', { reason: topic });
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      company,
      defaults?.context,
      defaults?.preferredSpecialistId,
      defaults?.source,
      email,
      hasAccess,
      message,
      name,
      phone,
      topic,
      urgency,
    ],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Request specialist introduction"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F5F5F5] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">Request specialist introduction</h2>
            <p className="text-xs text-[#555555]">
              Klarify arranges a warm intro to a vetted practitioner. Introductions only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#555555] transition hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <CloseIcon size="md" />
          </button>
        </div>

        {!hasAccess ? (
          <div className="space-y-4 p-6">
            <div className="rounded-xl border border-[#0B6E6E] bg-[#E6F4F4] p-4">
              <p className="text-sm font-semibold text-[#0D2B45]">Available on Compass plan</p>
              <p className="mt-1 text-xs text-[#555555]">
                Human escalation to vetted Nigerian digital asset lawyers and compliance professionals
                is included on Compass and Flagship.
              </p>
            </div>
            <Link
              href="/dashboard/billing?plan=compass"
              className="inline-block rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A5F5F]"
            >
              Upgrade to Compass →
            </Link>
          </div>
        ) : submitted ? (
          <div className="space-y-3 p-6">
            <p className="text-sm font-semibold text-[#1A7A4A]">Request sent</p>
            <p className="text-sm text-[#555555]">
              The Klarify team will introduce you to the right specialist within{' '}
              {urgency === 'critical' ? '24 hours' : '2 business days'}. Check your inbox at{' '}
              <strong>{email}</strong>.
            </p>
            {defaults?.preferredSpecialistName ? (
              <p className="text-xs text-[#555555]">
                Preferred: {defaults.preferredSpecialistName}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#CCCCCC] px-4 py-2 text-sm"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {defaults?.preferredSpecialistName ? (
              <p className="rounded-lg bg-[#FDF6E3] px-3 py-2 text-xs text-[#5a4a14]">
                Requesting introduction via: <strong>{defaults.preferredSpecialistName}</strong>
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#555555]">Your name</label>
                <input ref={nameRef} required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#555555]">Email</label>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#555555]">Company</label>
                <input required value={company} onChange={(e) => setCompany(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#555555]">Phone (optional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#555555]">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as SpecialistTopic)}
                  className={inputClass}
                >
                  {TOPICS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#555555]">Urgency</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as 'critical' | 'standard')}
                  className={inputClass}
                >
                  <option value="critical">Critical — enforcement / deadline</option>
                  <option value="standard">Standard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[#555555]">
                What do you need help with?
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your situation in plain language. Do not include passwords or full account numbers."
                className={inputClass}
              />
            </div>

            {error ? <p className="text-xs text-[#C0392B]">{error}</p> : null}

            {currentPlan === 'flagship' ? (
              <p className="text-[10px] text-[#D4A843]">
                Flagship priority — our team targets a response within 24 hours.
              </p>
            ) : null}

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isSubmitting ? 'Sending…' : 'Request introduction'}
              </button>
              <button type="button" onClick={onClose} className="rounded-xl border border-[#CCCCCC] px-4 py-2.5 text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
