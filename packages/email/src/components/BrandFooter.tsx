import { Hr, Link, Section, Text } from '@react-email/components';
import { emailColors, emailFonts } from './tokens.js';
import { COMPANY, emailConfig } from '../config.js';

export interface BrandFooterProps {
  hideDisclaimer?: boolean;
}

/**
 * Footer for every email — contains:
 *   - Mandatory legal disclaimer (CLAUDE.md §16 Rule 1) for any email that
 *     references regulatory content. We render it by default; set
 *     hideDisclaimer for purely transactional billing/account emails.
 *   - Company legal name (Blockspace Technologies Limited)
 *   - Support contact
 *   - Manage email preferences / unsubscribe link
 */
export function BrandFooter({ hideDisclaimer = false }: BrandFooterProps): JSX.Element {
  return (
    <Section style={{ padding: '24px 8px 32px 8px' }}>
      {!hideDisclaimer && (
        <>
          <Text
            style={{
              fontFamily: emailFonts.sans,
              fontSize:   '12px',
              lineHeight: '18px',
              color:      emailColors.textMuted,
              margin:     '0 0 16px 0',
              padding:    '12px 14px',
              background: emailColors.bgGrey,
              borderLeft: `3px solid ${emailColors.klarifyTeal}`,
              borderRadius: '4px',
            }}
          >
            <strong style={{ color: emailColors.textPrimary }}>
              Regulatory information, not legal advice.
            </strong>{' '}
            Klarify provides regulatory guidance and educational information
            for digital asset and fintech founders. For advice specific to
            your situation, consult a qualified Nigerian regulatory practitioner.
          </Text>
          <Hr style={{ borderColor: emailColors.borderGrey, margin: '8px 0 16px 0' }} />
        </>
      )}

      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '12px',
          lineHeight: '18px',
          color:      emailColors.textMuted,
          margin:     '0 0 8px 0',
          textAlign:  'center',
        }}
      >
        {COMPANY.legalName} · {COMPANY.address}
      </Text>

      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '12px',
          lineHeight: '18px',
          color:      emailColors.textMuted,
          margin:     '0 0 8px 0',
          textAlign:  'center',
        }}
      >
        <Link
          href={COMPANY.website}
          style={{ color: emailColors.klarifyTeal, textDecoration: 'none' }}
        >
          klarify.africa
        </Link>
        {' · '}
        <Link
          href={`mailto:${COMPANY.supportEmail}`}
          style={{ color: emailColors.klarifyTeal, textDecoration: 'none' }}
        >
          {COMPANY.supportEmail}
        </Link>
        {' · '}
        <Link
          href={`${emailConfig.appUrl}/dashboard/profile`}
          style={{ color: emailColors.klarifyTeal, textDecoration: 'none' }}
        >
          Email preferences
        </Link>
      </Text>

      <Text
        style={{
          fontFamily: emailFonts.sans,
          fontSize:   '11px',
          lineHeight: '16px',
          color:      emailColors.textLight,
          margin:     '12px 0 0 0',
          textAlign:  'center',
        }}
      >
        © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
      </Text>
    </Section>
  );
}
