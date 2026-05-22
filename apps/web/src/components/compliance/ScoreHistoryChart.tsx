'use client';

// =============================================================================
// ScoreHistoryChart — Recharts line chart of readiness score over time.
// Sprint 4-C (US-006): shows score trajectory for the last 30/60/90 days.
// CLAUDE.md §7: colours sourced from brand token logic.
// =============================================================================

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

export interface ScorePoint {
  date: string;          // ISO string
  total: number;
  corporate_structure: number;
  capital_licensing: number;
  kyc_infrastructure: number;
  aml_cft_programme: number;
  transaction_monitoring: number;
  regulatory_reporting: number;
  regulatory_relationships: number;
  product_classification: number;
}

export interface ScoreHistoryChartProps {
  points: ScorePoint[];
  days: 30 | 60 | 90;
  delta: number;
  onDaysChange: (d: 30 | 60 | 90) => void;
}

/** Mirrors getScoreColor from @klarify/core colours.ts — no import needed in client component. */
function scoreColor(score: number): string {
  if (score <= 40) return '#C0392B';
  if (score <= 70) return '#D4A843';
  if (score <= 90) return '#1A7A4A';
  return '#0B6E6E';
}

/** Format ISO date string as "May 1" using Intl. */
function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
    new Date(iso),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const score = payload[0].value as number;
  const color = scoreColor(score);
  return (
    <div className="rounded-lg border border-[#CCCCCC] bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs text-[#555555]">{label}</p>
      <p className="text-sm font-bold" style={{ color }}>
        {score} / 100
      </p>
    </div>
  );
}

export function ScoreHistoryChart({
  points,
  days,
  delta,
  onDaysChange,
}: ScoreHistoryChartProps): JSX.Element {
  const safePoints = Array.isArray(points) ? points : [];
  const latestScore = safePoints.at(-1)?.total ?? 0;
  const lineColor = scoreColor(latestScore);

  // Deduplicate by date (keep last point per calendar day) and format for Recharts.
  const chartData = deduplicateByDay(safePoints).map((p) => ({
    date: fmtDate(p.date),
    score: p.total,
  }));

  const hasEnoughData = chartData.length >= 2;

  const DAY_OPTIONS: Array<30 | 60 | 90> = [30, 60, 90];

  return (
    <div>
      {/* Header row: title + days selector */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[#1A1A1A]">Score History</h3>
          {/* Delta badge */}
          {hasEnoughData && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{
                backgroundColor: delta >= 0 ? '#E6F4F4' : '#FDECEA',
                color: delta >= 0 ? '#0B6E6E' : '#C0392B',
              }}
            >
              {delta >= 0 ? '+' : ''}{delta} pts this period
            </span>
          )}
        </div>

        {/* 30d / 60d / 90d selector */}
        <div className="flex gap-1 rounded-lg bg-[#F5F5F5] p-1">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => onDaysChange(d)}
              className={[
                'rounded-md px-3 py-1 text-xs font-semibold transition',
                days === d
                  ? 'bg-[#0B6E6E] text-white shadow-sm'
                  : 'text-[#555555] hover:text-[#1A1A1A]',
              ].join(' ')}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart body */}
      {!hasEnoughData ? (
        <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[#CCCCCC] bg-[#F5F5F5]">
          <p className="text-xs text-[#555555]">
            Not enough data yet — score history builds as you complete tasks.
          </p>
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={lineColor} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#555555' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                tick={{ fontSize: 11, fill: '#555555' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="score"
                stroke={lineColor}
                strokeWidth={2}
                fill="url(#scoreGradient)"
                dot={false}
                activeDot={{ r: 4, fill: lineColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/**
 * Keep only the last data point per calendar day to avoid a jagged chart
 * when recalculations happen multiple times per day (which is expected).
 */
function deduplicateByDay(points: ScorePoint[]): ScorePoint[] {
  const seen = new Map<string, ScorePoint>();
  for (const p of points) {
    const day = p.date.slice(0, 10); // "YYYY-MM-DD"
    seen.set(day, p); // last write wins (points are already ASC from API)
  }
  return Array.from(seen.values());
}
