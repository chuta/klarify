import { Link, Section, Text } from '@react-email/components';
import { emailColors, emailFonts } from '../../components/tokens.js';

export interface DripUnsubscribeProps {
  unsubscribeUrl?: string;
}

/** Optional lifecycle-marketing unsubscribe line. */
export function DripUnsubscribeFooter({ unsubscribeUrl }: DripUnsubscribeProps): JSX.Element | null {
  if (!unsubscribeUrl) return null;
  return (
    <Section style={{ marginTop: '8px' }}>
      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '12px',
          lineHeight: '18px',
          color:      emailColors.textMuted,
          margin:     '0',
          textAlign:  'center',
        }}
      >
        <Link href={unsubscribeUrl} style={{ color: emailColors.klarifyTeal }}>
          Unsubscribe from onboarding tips
        </Link>
      </Text>
    </Section>
  );
}

export function firstName(name: string): string {
  return (name || 'there').trim().split(/\s+/)[0] || 'there';
}

export const dripParagraph = {
  fontFamily: emailFonts.sans,
  fontSize:   '15px',
  lineHeight: '24px',
  color:      emailColors.textPrimary,
  margin:     '0 0 16px 0',
} as const;

export const dripParagraphSmall = {
  ...dripParagraph,
  fontSize: '13px',
  color:    emailColors.textMuted,
} as const;

export const dripH1 = {
  fontFamily: emailFonts.sans,
  fontSize:   '22px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '0 0 16px 0',
  lineHeight: '28px',
} as const;

export const dripH2 = {
  fontFamily: emailFonts.sans,
  fontSize:   '16px',
  fontWeight: 700,
  color:      emailColors.textPrimary,
  margin:     '24px 0 12px 0',
} as const;

export const dripList = {
  paddingLeft: '20px',
  margin:      '0 0 16px 0',
  color:       emailColors.textPrimary,
} as const;

export const dripListItem = {
  ...dripParagraph,
  margin: '0 0 10px 0',
} as const;

export const dripCard = {
  background:   emailColors.bgTeal,
  border:       `1px solid ${emailColors.klarifyTeal}33`,
  borderRadius: '8px',
  padding:      '16px 20px',
  margin:       '8px 0 20px 0',
} as const;

export const dripCardTitle = {
  fontFamily: emailFonts.sans,
  fontSize:   '13px',
  fontWeight: 700,
  letterSpacing: '0.6px',
  textTransform: 'uppercase' as const,
  color:      emailColors.klarifyTeal,
  margin:     '0 0 10px 0',
} as const;

export const dripMono = {
  fontFamily: emailFonts.mono,
  fontSize:   '13px',
  color:      emailColors.klarifyTeal,
} as const;
