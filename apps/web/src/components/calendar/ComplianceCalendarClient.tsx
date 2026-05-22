'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import type { CalendarEventDTO } from '@/lib/calendar';
import {
  formatDueDate,
  getEventDisplayMeta,
  urgencyLabel,
} from '@/lib/calendar';

interface ComplianceCalendarClientProps {
  initialEvents: CalendarEventDTO[];
  accessToken: string;
}

type Filter = 'all' | 'open' | 'complete';

const EVENT_TYPE_OPTIONS = [
  { value: 'CUSTOM', label: 'Custom reminder' },
  { value: 'STR_FILING', label: 'STR filing (goAML)' },
  { value: 'CTR_FILING', label: 'CTR filing' },
  { value: 'PEP_REGISTER', label: 'PEP register submission' },
  { value: 'QUARTERLY_TRAINING', label: 'AML/CFT staff training' },
  { value: 'BWRA_REVIEW', label: 'BWRA annual review' },
  { value: 'ARIP_DEADLINE', label: 'ARIP / SEC deadline' },
] as const;

function urgencyBorderClass(urgency: CalendarEventDTO['urgency']): string {
  switch (urgency) {
    case 'overdue':
      return 'border-l-[#C0392B]';
    case 'critical':
      return 'border-l-[#C0392B]';
    case 'warning':
      return 'border-l-[#D4A843]';
    case 'complete':
      return 'border-l-[#1A7A4A] opacity-70';
    default:
      return 'border-l-[#0B6E6E]';
  }
}

function urgencyTextClass(urgency: CalendarEventDTO['urgency']): string {
  switch (urgency) {
    case 'overdue':
    case 'critical':
      return 'text-[#C0392B]';
    case 'warning':
      return 'text-[#D4A843]';
    case 'complete':
      return 'text-[#1A7A4A]';
    default:
      return 'text-[#555555]';
  }
}

export function ComplianceCalendarClient({
  initialEvents,
  accessToken,
}: ComplianceCalendarClientProps): JSX.Element {
  const [events, setEvents] = useState<CalendarEventDTO[]>(initialEvents);
  const [filter, setFilter] = useState<Filter>('open');
  const [showModal, setShowModal] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'open') return events.filter((e) => !e.isComplete);
    if (filter === 'complete') return events.filter((e) => e.isComplete);
    return events;
  }, [events, filter]);

  const stats = useMemo(() => {
    const open = events.filter((e) => !e.isComplete);
    return {
      overdue: open.filter((e) => e.urgency === 'overdue').length,
      dueSoon: open.filter((e) => e.urgency === 'critical' || e.urgency === 'warning').length,
      open: open.length,
      complete: events.filter((e) => e.isComplete).length,
    };
  }, [events]);

  const grouped = useMemo(() => {
    const openEvents = filtered.filter((e) => !e.isComplete);
    const completeEvents = filtered.filter((e) => e.isComplete);

    const overdue = openEvents.filter((e) => e.daysRemaining < 0);
    const thisWeek = openEvents.filter((e) => e.daysRemaining >= 0 && e.daysRemaining <= 7);
    const later = openEvents.filter((e) => e.daysRemaining > 7);

    return { overdue, thisWeek, later, completeEvents };
  }, [filtered]);

  const toggleComplete = useCallback(
    async (event: CalendarEventDTO) => {
      setSavingId(event.id);
      setError(null);
      try {
        const res = await fetch(`/api/calendar/events/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ isComplete: !event.isComplete }),
        });
        const data = (await res.json()) as { success: boolean; data?: CalendarEventDTO; error?: string };
        if (!data.success || !data.data) {
          setError(data.error ?? 'Could not update event.');
          return;
        }
        setEvents((prev) => prev.map((e) => (e.id === event.id ? data.data! : e)));
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setSavingId(null);
      }
    },
    [accessToken],
  );

  const handleCreated = useCallback((event: CalendarEventDTO) => {
    setEvents((prev) => [...prev, event].sort((a, b) => {
      if (a.isComplete !== b.isComplete) return a.isComplete ? 1 : -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }));
    setShowModal(false);
    setFilter('open');
  }, []);

  return (
    <>
      {/* Summary strip */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overdue" value={stats.overdue} accent="#C0392B" />
        <StatCard label="Due within 7 days" value={stats.dueSoon} accent="#D4A843" />
        <StatCard label="Open obligations" value={stats.open} accent="#0B6E6E" />
        <StatCard label="Completed" value={stats.complete} accent="#1A7A4A" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(['open', 'all', 'complete'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={[
                'rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition',
                filter === f
                  ? 'bg-[#0B6E6E] text-white'
                  : 'border border-[#CCCCCC] bg-white text-[#555555] hover:border-[#0B6E6E]',
              ].join(' ')}
            >
              {f === 'open' ? 'Open' : f}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
        >
          + Add reminder
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg bg-[#FDF2F2] px-3 py-2 text-sm text-[#C0392B]">{error}</p>
      ) : null}

      {events.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[#CCCCCC] bg-white p-8 text-center text-sm text-[#555555]">
          No {filter} events. Try another filter or add a custom reminder.
        </div>
      ) : (
        <div className="space-y-8">
          <EventSection
            title="Overdue"
            events={grouped.overdue}
            savingId={savingId}
            onToggle={toggleComplete}
          />
          <EventSection
            title="Due in the next 7 days"
            events={grouped.thisWeek}
            savingId={savingId}
            onToggle={toggleComplete}
          />
          <EventSection
            title="Upcoming"
            events={grouped.later}
            savingId={savingId}
            onToggle={toggleComplete}
          />
          {(filter === 'all' || filter === 'complete') && grouped.completeEvents.length > 0 ? (
            <EventSection
              title="Completed"
              events={grouped.completeEvents}
              savingId={savingId}
              onToggle={toggleComplete}
            />
          ) : null}
        </div>
      )}

      {/* Regulatory basis footer */}
      <div className="mt-8 rounded-xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
          Regulatory Basis — AIP Period Obligations
        </p>
        <p className="text-sm text-[#555555]">
          AIP filing obligations are sourced from{' '}
          <span className="font-medium text-[#1A1A1A]">
            Section 21, ARIP Framework, SEC Nigeria (June 2024)
          </span>
          . Email alerts fire at 14 days, 7 days, and 24 hours before each deadline. ARIP events
          auto-populate when your AIP period activates in the{' '}
          <Link href="/dashboard/arip" className="text-[#0B6E6E] hover:underline">
            ARIP Tracker
          </Link>
          .
        </p>
        <p className="mt-3 text-xs italic text-[#CCCCCC]">
          Regulatory information only — not legal advice. Verify all obligations with your registered
          solicitor before the AIP period begins.
        </p>
      </div>

      {showModal ? (
        <AddEventModal
          accessToken={accessToken}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}): JSX.Element {
  return (
    <div className="rounded-xl border border-[#CCCCCC] bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-[#555555]">{label}</p>
      <p className="text-2xl font-bold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function EmptyState(): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-[#0B6E6E] bg-[#E6F4F4] p-8 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white">
        <svg className="h-7 w-7 text-[#0B6E6E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="mb-1 text-lg font-semibold text-[#0B6E6E]">No deadlines yet</h2>
      <p className="mx-auto mb-4 max-w-md text-sm text-[#555555]">
        When you activate your AIP period in the ARIP Tracker, weekly SEC filings, monthly reports,
        and quarterly compliance deadlines will appear here automatically. You can also add custom
        reminders for STR, CTR, PEP, and BWRA obligations.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard/arip"
          className="rounded-lg bg-[#0B6E6E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
        >
          Open ARIP Tracker →
        </Link>
        <Link
          href="/dashboard/classify"
          className="rounded-lg border border-[#0B6E6E] bg-white px-4 py-2 text-sm font-semibold text-[#0B6E6E] transition hover:bg-white/80"
        >
          Classify your product
        </Link>
      </div>
    </div>
  );
}

function EventSection({
  title,
  events,
  savingId,
  onToggle,
}: {
  title: string;
  events: CalendarEventDTO[];
  savingId: string | null;
  onToggle: (event: CalendarEventDTO) => void;
}): JSX.Element | null {
  if (events.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-[#1A1A1A]">
        {title} <span className="font-normal text-[#CCCCCC]">({events.length})</span>
      </h2>
      <ul className="space-y-2">
        {events.map((event) => (
          <EventRow
            key={event.id}
            event={event}
            saving={savingId === event.id}
            onToggle={() => onToggle(event)}
          />
        ))}
      </ul>
    </section>
  );
}

function EventRow({
  event,
  saving,
  onToggle,
}: {
  event: CalendarEventDTO;
  saving: boolean;
  onToggle: () => void;
}): JSX.Element {
  const meta = getEventDisplayMeta(event);

  return (
    <li
      className={[
        'flex items-start gap-3 rounded-xl border border-[#CCCCCC] border-l-4 bg-white p-4 shadow-sm',
        urgencyBorderClass(event.urgency),
        event.isComplete ? 'opacity-80' : '',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        aria-label={event.isComplete ? 'Mark as incomplete' : 'Mark as complete'}
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition disabled:opacity-50',
          event.isComplete
            ? 'border-[#1A7A4A] bg-[#1A7A4A]'
            : 'border-[#CCCCCC] bg-white hover:border-[#0B6E6E]',
        ].join(' ')}
      >
        {event.isComplete ? (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.typeLabel}
          </span>
          <span className={`text-[11px] font-medium ${urgencyTextClass(event.urgency)}`}>
            {urgencyLabel(event.urgency, event.daysRemaining)}
          </span>
        </div>
        <p className={`text-sm font-semibold text-[#1A1A1A] ${event.isComplete ? 'line-through' : ''}`}>
          {event.title}
        </p>
        {event.description ? (
          <p className="mt-1 text-xs leading-relaxed text-[#555555]">{event.description}</p>
        ) : null}
        <p className="mt-2 text-[11px] text-[#CCCCCC]">Due {formatDueDate(event.dueDate)}</p>
      </div>
    </li>
  );
}

function AddEventModal({
  accessToken,
  onClose,
  onCreated,
}: {
  accessToken: string;
  onClose: () => void;
  onCreated: (event: CalendarEventDTO) => void;
}): JSX.Element {
  const [eventType, setEventType] = useState<string>('CUSTOM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          eventType,
          title: title.trim(),
          description: description.trim() || undefined,
          dueDate,
        }),
      });
      const data = (await res.json()) as { success: boolean; data?: CalendarEventDTO; error?: string };
      if (!data.success || !data.data) {
        setError(data.error ?? 'Could not create reminder.');
        return;
      }
      onCreated(data.data);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Add calendar reminder"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#F5F5F5] px-6 py-4">
          <h2 className="text-base font-semibold text-[#1A1A1A]">Add compliance reminder</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#555555] transition hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="event-type" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Type
            </label>
            <select
              id="event-type"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
            >
              {EVENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="event-title" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Title <span className="text-[#C0392B]">*</span>
            </label>
            <input
              id="event-title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Submit PEP register to NFIU"
              className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm outline-none focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
            />
          </div>

          <div>
            <label htmlFor="event-due" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Due date <span className="text-[#C0392B]">*</span>
            </label>
            <input
              id="event-due"
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm outline-none focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
            />
          </div>

          <div>
            <label htmlFor="event-desc" className="mb-1 block text-sm font-medium text-[#1A1A1A]">
              Notes <span className="text-[#999]">(optional)</span>
            </label>
            <textarea
              id="event-desc"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-[#CCCCCC] px-3 py-2 text-sm outline-none focus:border-[#0B6E6E] focus:ring-2 focus:ring-[#E6F4F4]"
            />
          </div>

          {error ? (
            <p className="rounded-lg bg-[#FDF2F2] px-3 py-2 text-sm text-[#C0392B]">{error}</p>
          ) : null}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save reminder'}
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
