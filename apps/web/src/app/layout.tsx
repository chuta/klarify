import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Klarify — Navigate Regulated Markets with Confidence',
  description:
    'AI-powered regulatory compliance and advisory platform for African digital asset and fintech founders.',
  icons: {
    icon: [
      { url: '/klarity_icon.png', type: 'image/png' },
    ],
    apple: '/klarity_icon.png',
    shortcut: '/klarity_icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body className="bg-bg-primary text-[color:var(--klarify-text-primary,#1A1A1A)] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
