/**
 * SVG arc gauge — web-only (apps/web/src/components).
 *
 * The shared React Native version lives in packages/ui/src/components/ReadinessGauge.tsx.
 * This version uses a proper SVG semicircle arc so it looks great on every screen size.
 *
 * Colour thresholds and labels are canonical (CLAUDE.md §7 getScoreColor/getScoreLabel).
 */

function getScoreColor(score: number): string {
  if (score <= 40) return '#C0392B';  // statusCritical
  if (score <= 70) return '#D4A843';  // statusHigh
  if (score <= 90) return '#1A7A4A';  // statusGood
  return '#0B6E6E';                   // statusReady
}

function getScoreLabel(score: number): string {
  if (score <= 40) return 'Critical';
  if (score <= 70) return 'In Progress';
  if (score <= 90) return 'Good Standing';
  return 'Regulator Ready';
}

export interface ScoreGaugeProps {
  score: number;   // 0–100
  size?: number;   // default 220
}

/**
 * Draws a 200° arc gauge (like a speedometer) centred on the SVG viewport.
 * Background arc = grey, foreground arc = score-coloured fill.
 */
export function ScoreGauge({ score, size = 220 }: ScoreGaugeProps): JSX.Element {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const color = getScoreColor(clampedScore);
  const label = getScoreLabel(clampedScore);

  // Arc geometry — 200° sweep starting from 190° (bottom-left), sweeping clockwise.
  const cx = size / 2;
  const cy = size / 2 + size * 0.08; // shift centre slightly down so arc sits visually centred
  const r = size * 0.38;
  const strokeW = size * 0.055;
  const totalDeg = 200;
  const startDeg = 190;   // where the arc begins (degrees from 3 o'clock, clockwise)
  const fillDeg = (clampedScore / 100) * totalDeg;

  function polarToXY(deg: number): { x: number; y: number } {
    const rad = ((deg - 90) * Math.PI) / 180; // SVG 0° is 3 o'clock; adjust so 0° = 12 o'clock
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  }

  function describeArc(startAngle: number, endAngle: number): string {
    const start = polarToXY(startAngle);
    const end = polarToXY(endAngle);
    const sweep = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${start.x} ${start.y}`,
      `A ${r} ${r} 0 ${sweep} 1 ${end.x} ${end.y}`,
    ].join(' ');
  }

  const bgPath = describeArc(startDeg, startDeg + totalDeg);
  const fgPath = fillDeg > 0 ? describeArc(startDeg, startDeg + fillDeg) : null;

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size * 0.72}
        viewBox={`0 0 ${size} ${size * 0.72}`}
        aria-label={`Readiness score: ${clampedScore} out of 100. ${label}`}
        role="img"
      >
        {/* Background arc */}
        <path
          d={bgPath}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Score arc */}
        {fgPath && (
          <path
            d={fgPath}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        )}

        {/* Score number */}
        <text
          x={cx}
          y={cy - r * 0.08}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: size * 0.22,
            fontWeight: 700,
            fill: color,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {clampedScore}
        </text>

        {/* /100 sub-label */}
        <text
          x={cx}
          y={cy + r * 0.22}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: size * 0.07,
            fill: '#9CA3AF',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          / 100
        </text>
      </svg>

      {/* Status label */}
      <span
        className="mt-1 rounded-full px-3 py-1 text-sm font-semibold"
        style={{ backgroundColor: `${color}18`, color }}
      >
        {label}
      </span>
    </div>
  );
}
