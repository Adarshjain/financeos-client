import '../../design-system/tokens.css';
import './(ds)/ds.css';

import type { Metadata } from 'next';
import React from 'react';

import { Root } from '@/components/ds/Root/Root';
import { PageNotFound } from '@/features/shell/PageNotFound';

import { bricolageGrotesque, figtree } from './dsFonts';

// Unmatched URLs (including every /legacy/* URL) belong to no root layout, so Next renders this page on
// its own: it carries its own <html> and the Dinero stylesheet and fonts.
export const metadata: Metadata = { title: 'Page not found' };

export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${figtree.variable} ${bricolageGrotesque.variable}`}>
      <body className="antialiased">
        <Root>
          <main className="min-h-dvh flex items-center justify-center p-space-20">
            <PageNotFound description="The page you're looking for doesn't exist or has been moved." />
          </main>
        </Root>
      </body>
    </html>
  );
}
