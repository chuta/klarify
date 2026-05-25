import { Img, Section, Text } from '@react-email/components';
import { emailColors, emailFonts } from './tokens.js';
import { getEmailLogoUrl, COMPANY } from '../config.js';

/**
 * Brand header rendered above every email body.
 *
 * The Klarify wordmark must be visible across all major clients (Gmail,
 * Outlook 2016+, Apple Mail, mobile clients). Email images can be blocked
 * by default in many clients, so we set explicit width/height (Outlook
 * needs both) and an alt text that doubles as a fallback tagline.
 *
 * Brand rule (CLAUDE.md §7): the Klarify wordmark is the primary brand
 * asset on email headers. The teal accent line below it reinforces the
 * primary brand colour.
 */
export function BrandHeader(): JSX.Element {
  return (
    <Section
      style={{
        textAlign: 'center',
        padding:   '8px 0 24px 0',
      }}
    >
      <Img
        src={getEmailLogoUrl()}
        alt="Klarify"
        width="140"
        height="47"
        style={{
          display:  'block',
          margin:   '0 auto',
          maxWidth: '140px',
          height:   'auto',
        }}
      />
      <Text
        style={{
          margin:     '12px 0 0 0',
          fontFamily: emailFonts.sans,
          fontSize:   '13px',
          fontWeight: 500,
          color:      emailColors.textMuted,
          letterSpacing: '0.2px',
        }}
      >
        {COMPANY.tagline}
      </Text>
      {/* Teal accent line — subtle brand cue */}
      <div
        style={{
          width:        '48px',
          height:       '3px',
          background:   emailColors.klarifyTeal,
          margin:       '14px auto 0 auto',
          borderRadius: '2px',
        }}
      />
    </Section>
  );
}
