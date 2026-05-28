// Follow-Up Alerts Widget — Sprint 5-C1.
// Shows pending regulator interaction follow-ups due within 7 days.
// Displayed on the dashboard between the critical document banner and the ARIP widget.

import Link from 'next/link';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export interface FollowUpAlert {
  id: string;
  regulatorCode: string;
  subject: string;
  followUpDate: string | null;
}

interface FollowUpAlertsWidgetProps {
  alerts: FollowUpAlert[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Date not set';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  });
}

function getDaysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function FollowUpAlertsWidget({ alerts }: FollowUpAlertsWidgetProps): JSX.Element {
  if (alerts.length === 0) return <></>;

  return (
    <div className="mb-5 rounded-2xl border border-[#D4A843] bg-[#FDF6E3] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardDocumentListIcon className="h-5 w-5 text-[#D4A843]" aria-hidden />
          <p className="text-sm font-semibold text-[#1A1A1A]">
            Outstanding Follow-ups ({alerts.length})
          </p>
        </div>
        <Link
          href="/dashboard/regulators"
          className="text-xs font-medium text-[#0B6E6E] hover:underline"
        >
          View all →
        </Link>
      </div>

      <ul className="space-y-2">
        {alerts.map((alert) => {
          const daysUntil = getDaysUntil(alert.followUpDate);
          const isOverdue = daysUntil !== null && daysUntil < 0;
          const isDueSoon = daysUntil !== null && daysUntil <= 2;

          return (
            <li
              key={alert.id}
              className="flex items-start gap-2 rounded-lg bg-white px-3 py-2.5 shadow-sm"
            >
              <span
                className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  isOverdue ? 'bg-[#C0392B]' : isDueSoon ? 'bg-[#D4A843]' : 'bg-[#D4A843]'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#1A1A1A]">{alert.regulatorCode}</p>
                <p className="truncate text-xs text-[#555555]">{alert.subject}</p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`text-xs font-semibold ${
                    isOverdue
                      ? 'text-[#C0392B]'
                      : isDueSoon
                      ? 'text-[#D4A843]'
                      : 'text-[#555555]'
                  }`}
                >
                  {isOverdue
                    ? `${Math.abs(daysUntil ?? 0)}d overdue`
                    : daysUntil === 0
                    ? 'Today'
                    : daysUntil === 1
                    ? 'Tomorrow'
                    : `${daysUntil}d`}
                </p>
                <p className="text-[10px] text-[#CCCCCC]">{formatDate(alert.followUpDate)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
