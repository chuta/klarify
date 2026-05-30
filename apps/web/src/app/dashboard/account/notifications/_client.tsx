'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Lock } from '@/components/icons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationPrefs {
  emailDeadlineAlerts:   boolean;
  emailWeeklyDigest:     boolean;
  emailDocumentAnalysis: boolean;
  emailAripAlerts:       boolean;
  emailLifecycle:        boolean;
  emailBilling:          boolean;
  updatedAt:             string;
}

interface NotificationsClientProps {
  accessToken: string;
}

interface PrefConfig {
  key: keyof Omit<NotificationPrefs, 'updatedAt'>;
  label:    string;
  description: string;
  locked?: boolean;
}

const PREF_CONFIG: PrefConfig[] = [
  {
    key:         'emailDeadlineAlerts',
    label:       'Deadline alerts',
    description: 'Get reminded 1, 7, and 14 days before compliance deadlines (STR filings, BWRA reviews, quarterly reports, etc.)',
  },
  {
    key:         'emailDocumentAnalysis',
    label:       'Document analysis results',
    description: 'Get notified when a regulatory document has been analysed, including urgency level and 72-hour action plan.',
  },
  {
    key:         'emailAripAlerts',
    label:       'ARIP growth alerts',
    description: 'Warning emails when your organisation approaches or breaches the ARIP customer growth cap (Section 29d, ARIP Framework).',
  },
  {
    key:         'emailLifecycle',
    label:       'Onboarding tips & launch offers',
    description: 'Helpful emails during your first 9 days, Readiness Score guide, product tips, plan comparison, and launch pricing reminders.',
  },
  {
    key:         'emailWeeklyDigest',
    label:       'Weekly compliance digest',
    description: 'Monday morning summary of your compliance readiness score, tasks due this week, and upcoming regulatory deadlines.',
  },
  {
    key:         'emailBilling',
    label:       'Billing notifications',
    description: 'Payment confirmations, subscription alerts, and renewal reminders, required for account security.',
    locked:      true,
  },
];

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

export function NotificationsClient({ accessToken }: NotificationsClientProps): JSX.Element {
  const [prefs,    setPrefs]   = useState<NotificationPrefs | null>(null);
  const [error,    setError]   = useState<string | null>(null);
  const [loading,  setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchHeaders = useMemo(
    (): HeadersInit => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  // ── Load preferences ──────────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/notifications/preferences', { headers: fetchHeaders })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setPrefs(json.data as NotificationPrefs);
        else setError(json.error ?? 'Failed to load preferences');
      })
      .catch(() => setError('Failed to load preferences'))
      .finally(() => setLoading(false));
  }, [fetchHeaders]);

  // ── Toggle handler ────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    (key: keyof Omit<NotificationPrefs, 'updatedAt'>) => {
      if (!prefs || isSaving) return;
      const prev = prefs;
      const updated = { ...prefs, [key]: !prefs[key] };
      setPrefs(updated);
      setIsSaving(true);

      fetch('/api/notifications/preferences', {
        method:  'PATCH',
        headers: fetchHeaders,
        body:    JSON.stringify({ [key]: !prev[key] }),
      })
        .then((r) => r.json() as Promise<{ success: boolean; data?: NotificationPrefs; error?: string }>)
        .then((json) => {
          if (json.success && json.data) {
            setPrefs(json.data);
          } else {
            setPrefs(prev);
            setError(json.error ?? 'Failed to save preference');
          }
        })
        .catch(() => {
          setPrefs(prev);
          setError('Failed to save preference');
        })
        .finally(() => setIsSaving(false));
    },
    [prefs, isSaving, fetchHeaders],
  );

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-40 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-64" />
              </div>
              <div className="h-6 w-11 bg-gray-200 rounded-full ml-4 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!prefs) return <></>;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {PREF_CONFIG.map((config) => {
        const enabled = prefs[config.key];
        const isLocked = config.locked ?? false;

        return (
          <div
            key={config.key}
            className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex items-start justify-between gap-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[#1A1A1A] text-sm">
                  {config.label}
                </span>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#555555] bg-[#F5F5F5] border border-[#E5E7EB] rounded px-2 py-0.5">
                    <Lock size="xs" />
                    Always on
                  </span>
                )}
              </div>
              <p className="text-[#555555] text-xs leading-relaxed">
                {config.description}
              </p>
            </div>

            {/* Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label={`${enabled ? 'Disable' : 'Enable'} ${config.label}`}
              disabled={isLocked || isSaving}
              onClick={() => !isLocked && handleToggle(config.key)}
              className={[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
                'focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2',
                isLocked
                  ? 'bg-[#0B6E6E] cursor-not-allowed opacity-70'
                  : enabled
                    ? 'bg-[#0B6E6E] cursor-pointer'
                    : 'bg-[#E5E7EB] cursor-pointer',
              ].join(' ')}
            >
              <span
                className={[
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  enabled ? 'translate-x-6' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>
        );
      })}

      {/* Last updated */}
      <p className="text-xs text-[#555555] text-right pt-1">
        Last updated:{' '}
        {new Date(prefs.updatedAt).toLocaleDateString('en-NG', {
          day: 'numeric', month: 'long', year: 'numeric',
        })}
      </p>
    </div>
  );
}
