'use client';

/**
 * Top-of-results urgency banner. Sets the emotional tone of the analyser
 * page — a CRITICAL banner must be impossible to miss, a LOW banner must
 * be calm enough not to cause unnecessary alarm.
 *
 * Colours follow CLAUDE.md §7 brand tokens:
 *   CRITICAL → statusCritical (#C0392B, red)
 *   HIGH     → statusHigh     (#D4A843, amber)
 *   MEDIUM   → klarifyNavy    (#0D2B45, navy)
 *   LOW      → statusGood     (#1A7A4A, green)
 */
type Level = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

const STYLES: Record<
  Level,
  { bg: string; fg: string; icon: string; title: string }
> = {
  CRITICAL: {
    bg: 'bg-[#C0392B]',
    fg: 'text-white',
    icon: '⛔',
    title: 'CRITICAL — Immediate action required',
  },
  HIGH: {
    bg: 'bg-[#D4A843]',
    fg: 'text-[#1A1A1A]',
    icon: '⚠️',
    title: 'HIGH PRIORITY — Action required',
  },
  MEDIUM: {
    bg: 'bg-[#0D2B45]',
    fg: 'text-white',
    icon: '📋',
    title: 'Information request — Response needed',
  },
  LOW: {
    bg: 'bg-[#1A7A4A]',
    fg: 'text-white',
    icon: 'ℹ️',
    title: 'Advisory notice — No urgent action',
  },
};

export function UrgencyBanner({
  level,
  reasoning,
}: {
  level: Level;
  reasoning?: string;
}): JSX.Element {
  const style = STYLES[level];
  return (
    <div className={`rounded-2xl ${style.bg} ${style.fg} px-5 py-4 shadow-sm`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {style.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold uppercase tracking-wider">
            {style.title}
          </p>
          {reasoning && (
            <p className="mt-1 text-xs leading-relaxed opacity-90">{reasoning}</p>
          )}
        </div>
      </div>
    </div>
  );
}
