import type { ComplianceEventType, Recurrence } from '@klarify/core';

export interface CalendarEventRow {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  dueDate: Date;
  recurrence: string | null;
  isComplete: boolean;
  completedAt: Date | null;
}

export interface CalendarEventDTO {
  id: string;
  eventType: ComplianceEventType;
  title: string;
  description: string | null;
  dueDate: string;
  recurrence: Recurrence | null;
  isComplete: boolean;
  completedAt: string | null;
  daysRemaining: number;
  urgency: 'overdue' | 'critical' | 'warning' | 'normal' | 'complete';
}

export interface EventDisplayMeta {
  typeLabel: string;
  color: string;
  bg: string;
}

const TYPE_META: Record<ComplianceEventType, EventDisplayMeta> = {
  STR_FILING: { typeLabel: 'STR', color: '#C0392B', bg: '#FDF2F2' },
  CTR_FILING: { typeLabel: 'CTR', color: '#C0392B', bg: '#FDF2F2' },
  PEP_REGISTER: { typeLabel: 'PEP', color: '#7B4F12', bg: '#FDF4E7' },
  QUARTERLY_TRAINING: { typeLabel: 'TRAINING', color: '#6B4E9B', bg: '#F3EFF9' },
  BWRA_REVIEW: { typeLabel: 'BWRA', color: '#1A7A4A', bg: '#EFF7F2' },
  ARIP_DEADLINE: { typeLabel: 'ARIP', color: '#0B6E6E', bg: '#E6F4F4' },
  CUSTOM: { typeLabel: 'CUSTOM', color: '#555555', bg: '#F5F5F5' },
};

const DEFAULT_META: EventDisplayMeta = TYPE_META.CUSTOM;

export function daysUntil(dueDate: Date): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(dueDate);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export function eventUrgency(
  dueDate: Date,
  isComplete: boolean,
): CalendarEventDTO['urgency'] {
  if (isComplete) return 'complete';
  const days = daysUntil(dueDate);
  if (days < 0) return 'overdue';
  if (days <= 1) return 'critical';
  if (days <= 7) return 'warning';
  return 'normal';
}

export function serializeCalendarEvent(row: CalendarEventRow): CalendarEventDTO {
  const eventType = row.eventType as ComplianceEventType;
  const recurrence = (row.recurrence as Recurrence | null) ?? null;
  return {
    id: row.id,
    eventType,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate.toISOString(),
    recurrence,
    isComplete: row.isComplete,
    completedAt: row.completedAt?.toISOString() ?? null,
    daysRemaining: daysUntil(row.dueDate),
    urgency: eventUrgency(row.dueDate, row.isComplete),
  };
}

export function getEventDisplayMeta(event: CalendarEventDTO): EventDisplayMeta {
  if (event.eventType === 'ARIP_DEADLINE') {
    if (event.recurrence === 'weekly') {
      return { typeLabel: 'WEEKLY', color: '#0B6E6E', bg: '#E6F4F4' };
    }
    if (event.recurrence === 'monthly') {
      return { typeLabel: 'MONTHLY', color: '#0D2B45', bg: '#E8EEF4' };
    }
    if (event.recurrence === 'quarterly') {
      return { typeLabel: 'QUARTERLY', color: '#D4A843', bg: '#FDF6E3' };
    }
    if (/expiry/i.test(event.title)) {
      return { typeLabel: 'AIP', color: '#C0392B', bg: '#FDF2F2' };
    }
  }
  return TYPE_META[event.eventType] ?? DEFAULT_META;
}

export function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function urgencyLabel(urgency: CalendarEventDTO['urgency'], daysRemaining: number): string {
  switch (urgency) {
    case 'overdue':
      return `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'} overdue`;
    case 'critical':
      return daysRemaining === 0 ? 'Due today' : 'Due tomorrow';
    case 'warning':
      return `${daysRemaining} days remaining`;
    case 'complete':
      return 'Completed';
    default:
      return `${daysRemaining} days remaining`;
  }
}
