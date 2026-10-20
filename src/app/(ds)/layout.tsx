import '../../../design-system/tokens.css';
import './ds.css';

import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import React from 'react';

import { Root } from '@/components/ds';

import { Providers } from '../providers';
import { metadata as rootMetadata, viewport as rootViewport } from '../rootMetadata';

// Design system fonts: Figtree for interface text, Bricolage Grotesque for display.
// Self-hosted variable woff2 covering latin + latin-ext subsets (including ₹ and tabular numbers).
const figtree = localFont({
  src: '../fonts/Figtree-latin-ext.woff2',
  variable: '--ds-font-text',
  display: 'swap',
  weight: '500 800',
});

const bricolageGrotesque = localFont({
  src: '../fonts/BricolageGrotesque-latin-ext.woff2',
  variable: '--ds-font-display',
  display: 'swap',
  weight: '600 800',
});

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

/** Root layout of the Dinero UI: loads only tokens.css, ds.css and Figtree/Bricolage. */
export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${bricolageGrotesque.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased" suppressHydrationWarning>
        <Providers>
          <Root>{children}</Root>
        </Providers>
      </body>
    </html>
  );
}
