import { Button as REButton } from '@react-email/components';
import type { ReactNode } from 'react';
import { emailColors, emailFonts } from './tokens.js';

export interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
}

/**
 * Branded CTA button. Renders as a bullet-proof button (table-based fallback
 * is handled by @react-email/components under the hood) for Outlook
 * compatibility.
 *
 *   primary   — teal background, white text (default — used for main CTA)
 *   secondary — white background, teal border + text (used for tertiary CTAs)
 *   danger    — red background, white text (used for "expires soon" emails)
 */
export function Button({
  href,
  children,
  variant = 'primary',
  fullWidth = false,
}: ButtonProps): JSX.Element {
  const styles = getVariantStyles(variant);

  return (
    <REButton
      href={href}
      style={{
        display:        'inline-block',
        width:          fullWidth ? '100%' : 'auto',
        boxSizing:      'border-box',
        textAlign:      'center',
        padding:        '12px 24px',
        borderRadius:   '6px',
        fontFamily:     emailFonts.sans,
        fontSize:       '15px',
        fontWeight:     600,
        textDecoration: 'none',
        background:     styles.bg,
        color:          styles.fg,
        border:         `1px solid ${styles.border}`,
        lineHeight:     '20px',
      }}
    >
      {children}
    </REButton>
  );
}

function getVariantStyles(variant: 'primary' | 'secondary' | 'danger'): {
  bg: string;
  fg: string;
  border: string;
} {
  switch (variant) {
    case 'primary':
      return {
        bg:     emailColors.klarifyTeal,
        fg:     emailColors.white,
        border: emailColors.klarifyTeal,
      };
    case 'secondary':
      return {
        bg:     emailColors.white,
        fg:     emailColors.klarifyTeal,
        border: emailColors.klarifyTeal,
      };
    case 'danger':
      return {
        bg:     emailColors.statusCritical,
        fg:     emailColors.white,
        border: emailColors.statusCritical,
      };
  }
}
