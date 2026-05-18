import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Tailwind,
} from '@react-email/components';
import type { ReactNode } from 'react';
import { emailColors, emailFonts, emailLayout } from './tokens.js';
import { BrandHeader } from './BrandHeader.js';
import { BrandFooter } from './BrandFooter.js';

export interface EmailLayoutProps {
  /** Inbox preview (the grey snippet next to the subject line). */
  preview: string;
  /** Body content of the email. */
  children: ReactNode;
  /** Hide the footer's compliance disclaimer (default: shown). */
  hideDisclaimer?: boolean;
}

/**
 * Master layout for every Klarify email.
 *
 * Provides:
 *   - <Head> with preferred-color-scheme meta + font import
 *   - Inbox <Preview> snippet
 *   - 600px-wide container with Klarify-branded header
 *   - Footer with company info + legal disclaimer (per CLAUDE.md §16 Rule 1)
 *
 * Every transactional template MUST render inside this layout so the brand
 * is consistent and the disclaimer is impossible to forget.
 */
export function EmailLayout({
  preview,
  children,
  hideDisclaimer = false,
}: EmailLayoutProps): JSX.Element {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme"          content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body
          style={{
            margin:     0,
            padding:    0,
            width:      '100%',
            background: emailColors.bgGrey,
            fontFamily: emailFonts.sans,
            color:      emailColors.textPrimary,
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          <Container
            style={{
              maxWidth:   emailLayout.contentWidth,
              width:      '100%',
              margin:     '0 auto',
              padding:    '24px 0',
            }}
          >
            <BrandHeader />
            <Section
              style={{
                background:   emailColors.white,
                border:       `1px solid ${emailColors.borderGrey}`,
                borderRadius: emailLayout.radius,
                padding:      `${emailLayout.paddingY}px ${emailLayout.paddingX}px`,
              }}
            >
              {children}
            </Section>
            <BrandFooter hideDisclaimer={hideDisclaimer} />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
