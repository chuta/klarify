import { Section, Text } from '@react-email/components';
import { emailFonts, urgencyColor } from './tokens.js';

export interface UrgencyBannerProps {
  level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  subtitle?: string;
}

const ICON: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', string> = {
  CRITICAL: '⛔',
  HIGH:     '⚠️',
  MEDIUM:   '📋',
  LOW:      'ℹ️',
};

/**
 * Top-of-email urgency banner used by document-analysis emails and
 * deadline reminders. Colour and icon are driven by the level — keep
 * the visual language consistent with the in-app urgency badges.
 */
export function UrgencyBanner({
  level,
  title,
  subtitle,
}: UrgencyBannerProps): JSX.Element {
  const palette = urgencyColor(level);

  return (
    <Section
      style={{
        background:   palette.bg,
        border:       `1px solid ${palette.border}`,
        borderLeft:   `4px solid ${palette.border}`,
        borderRadius: '6px',
        padding:      '14px 18px',
        margin:       '0 0 24px 0',
      }}
    >
      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '15px',
          fontWeight: 700,
          color:      palette.fg,
          margin:     '0 0 4px 0',
        }}
      >
        <span style={{ marginRight: '8px' }}>{ICON[level]}</span>
        {level} — {title}
      </Text>
      {subtitle && (
        <Text
          style={{
            fontFamily: emailFonts.sans,
            fontSize:   '14px',
            color:      palette.fg,
            margin:     '0',
            opacity:    0.9,
          }}
        >
          {subtitle}
        </Text>
      )}
    </Section>
  );
}
