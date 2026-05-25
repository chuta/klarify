/**
 * Compact circular arc gauge for dimension scores (0–100).
 * Web-only SVG — pairs with the main ScoreGauge on the dashboard.
 * Colour thresholds match CLAUDE.md §7 getScoreColor.
 */

function getScoreColor(score: number): string {
  if (score <= 40) return '#C0392B';
  if (score <= 70) return '#D4A843';
  if (score <= 90) return '#1A7A4A';
  return '#0B6E6E';
}

export interface MiniRadialGaugeProps {
  score: number;
  size?: number;
  /** When false, only the ring is shown (score rendered externally). */
  showScore?: boolean;
}

export function MiniRadialGauge({
  score,
  size = 56,
  showScore = true,
}: MiniRadialGaugeProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = getScoreColor(clamped);
  const strokeW = 4;
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const filled = (clamped / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden={showScore ? undefined : true}
      role={showScore ? 'img' : undefined}
      aria-label={showScore ? `Score: ${clamped} out of 100` : undefined}
      className="shrink-0"
    >
      {/* Track */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#F5F5F5"
        strokeWidth={strokeW}
      />
      {/* Progress — rotated so fill starts at 12 o'clock */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference - filled}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {showScore && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            fontSize: size * 0.28,
            fontWeight: 700,
            fill: color,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {clamped}
        </text>
      )}
    </svg>
  );
}
