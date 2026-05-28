'use client';

import { CloseIcon } from '@/components/icons';
import { InteractionTypeIcon } from '@/components/regulators/InteractionTypeIcon';

// Interaction Log Modal — Sprint 5-C1.
// Creates a new regulator interaction log entry via /api/regulators/interactions.
// Design: full-screen overlay on mobile, centered modal on desktop.

import { useState, useRef, useEffect, useCallback } from 'react';
import type { InteractionType } from '@klarify/core';

interface InteractionModalProps {
  regulatorCode: string;
  regulatorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const INTERACTION_TYPES: { value: InteractionType; label: string }[] = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'submission', label: 'Submission' },
  { value: 'letter', label: 'Letter' },
];

const today = () => new Date().toISOString().slice(0, 10);

export function InteractionModal({
  regulatorCode,
  regulatorName,
  onClose,
  onSuccess,
}: InteractionModalProps): JSX.Element {
  const [interactionType, setInteractionType] = useState<InteractionType>('call');
  const [subject, setSubject] = useState('');
  const [outcome, setOutcome] = useState('');
  const [occurredAt, setOccurredAt] = useState(today());
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // Focus subject on mount.
  useEffect(() => {
    subjectRef.current?.focus();
  }, []);

  // Close on Escape key.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subject.trim()) {
      setError('Subject is required.');
      return;
    }
    if (followUpRequired && !followUpDate) {
      setError('Follow-up date is required when follow-up is enabled.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/regulators/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regulatorCode,
          interactionType,
          subject: subject.trim(),
          outcome: outcome.trim() || undefined,
          followUpRequired,
          followUpDate: followUpRequired ? followUpDate : null,
          occurredAt,
        }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (!data.success) {
        setError(data.error ?? 'Failed to save interaction.');
        return;
      }
      onSuccess();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [regulatorCode, interactionType, subject, outcome, occurredAt, followUpRequired, followUpDate, onSuccess]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Log regulator interaction"
    >
      {/* Modal panel */}
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F5F5F5] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">Log Interaction</h2>
            <p className="text-xs text-[#555555]">{regulatorName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#555555] transition hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <CloseIcon size="md" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Interaction type — segmented buttons */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-[#555555]">
              Interaction Type
            </label>
            <div className="flex flex-wrap gap-2">
              {INTERACTION_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInteractionType(value)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    interactionType === value
                      ? 'border-[#0B6E6E] bg-[#E6F4F4] text-[#0B6E6E]'
                      : 'border-[#CCCCCC] bg-white text-[#555555] hover:border-[#0B6E6E]'
                  }`}
                >
                  <InteractionTypeIcon type={value} className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Subject <span className="text-[#C0392B]">*</span>
            </label>
            <input
              id="subject"
              ref={subjectRef}
              type="text"
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Pre-screening meeting request, ARIP status update..."
              className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
            />
            <p className="mt-1 text-right text-[11px] text-[#CCCCCC]">{subject.length}/200</p>
          </div>

          {/* Outcome */}
          <div>
            <label htmlFor="outcome" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Outcome / Next Step
            </label>
            <textarea
              id="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              rows={3}
              placeholder="What was the result? What's the next action?"
              className="w-full resize-none rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] placeholder-[#CCCCCC] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
            />
          </div>

          {/* Date */}
          <div>
            <label htmlFor="occurred-at" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Date of Interaction
            </label>
            <input
              id="occurred-at"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
            />
          </div>

          {/* Follow-up toggle */}
          <div className="flex items-center justify-between rounded-lg border border-[#F5F5F5] bg-[#FAFAFA] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-[#1A1A1A]">Follow-up required?</p>
              <p className="text-xs text-[#555555]">Set a reminder to follow up with this regulator</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={followUpRequired}
              onClick={() => setFollowUpRequired((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                followUpRequired ? 'bg-[#0B6E6E]' : 'bg-[#CCCCCC]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  followUpRequired ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Follow-up date (conditional) */}
          {followUpRequired && (
            <div>
              <label htmlFor="follow-up-date" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
                Follow-up Date <span className="text-[#C0392B]">*</span>
              </label>
              <input
                id="follow-up-date"
                type="date"
                value={followUpDate}
                min={today()}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] outline-none transition focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-lg bg-[#FDF2F2] px-3 py-2 text-sm text-[#C0392B]">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save Interaction'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#CCCCCC] px-4 py-2.5 text-sm font-medium text-[#555555] transition hover:bg-[#F5F5F5]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
