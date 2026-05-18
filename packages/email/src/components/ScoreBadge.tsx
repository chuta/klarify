import { Section, Text } from '@react-email/components';
import { emailColors, emailFonts, readinessColor, readinessLabel } from './tokens.js';

export interface ScoreBadgeProps {
  score: number;
  /** Optional delta vs. previous score (e.g. +5 / -2). */
  delta?: number;
}

/**
 * Compact Readiness Score badge for use in transactional emails
 * (welcome, weekly digest, onboarding-complete). The colour band matches
 * the in-app ReadinessGauge.
 */
export function ScoreBadge({ score, delta }: ScoreBadgeProps): JSX.Element {
  const color = readinessColor(score);
  const label = readinessLabel(score);

  return (
    <Section
      style={{
        background:   emailColors.bgPrimary,
        border:       `1px solid ${emailColors.borderGrey}`,
        borderRadius: '8px',
        padding:      '20px 24px',
        margin:       '20px 0',
        textAlign:    'center',
      }}
    >
      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px',
          color:      emailColors.textMuted,
          margin:     '0 0 8px 0',
        }}
      >
        Your Readiness Score
      </Text>
      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '44px',
          fontWeight: 800,
          lineHeight: '48px',
          color,
          margin:     '0 0 4px 0',
        }}
      >
        {score}
        <span
          style={{
            fontSize:   '18px',
            fontWeight: 500,
            color:      emailColors.textMuted,
          }}
        >
          {' '}/ 100
        </span>
      </Text>
      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '14px',
          fontWeight: 600,
          color,
          margin:     '0',
        }}
      >
        {label}
        {typeof delta === 'number' && delta !== 0 && (
          <span
            style={{
              marginLeft: '8px',
              color: delta > 0 ? emailColors.statusGood : emailColors.statusCritical,
            }}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} pts
          </span>
        )}
      </Text>
    </Section>
  );
}
