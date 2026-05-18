import { render } from '@react-email/render';
import type { ReactElement } from 'react';

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Render a React Email component to both HTML and plain-text strings.
 *
 * @react-email/render returns HTML with inline styles; we then call it again
 * with `plainText: true` to produce the text/plain alternative. Always sending
 * both significantly improves deliverability and accessibility.
 */
export async function renderEmail(
  element: ReactElement,
): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element, { pretty: false }),
    render(element, { plainText: true }),
  ]);
  return { html, text };
}
