import './globals.css';

import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';

import { LegacyMutationRefresh } from '@/lib/LegacyMutationRefresh';

import { Providers } from '../providers';
import { metadata as rootMetadata, viewport as rootViewport } from '../rootMetadata';

// Inter is self-hosted: next/font/google fetches it from Google at build time, and Turbopack
// fails the build on some Google responses (vercel/next.js#99114). One variable file, weights
// 300–700, covering Google's latin + latin-ext subsets (latin-ext carries ₹). Built from
// google/fonts ofl/inter/Inter[opsz,wght].ttf with opsz pinned to 14, as Google serves it;
// licence in ../fonts/Inter-OFL.txt.
const inter = localFont({
  src: '../fonts/Inter-latin-ext.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '300 700',
});

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = rootViewport;

/** Root layout of the Legacy UI: loads only the legacy stylesheet and Inter. */
export default function LegacyRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body
        className="font-sans antialiased min-h-screen bg-background text-foreground"
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <LegacyMutationRefresh />
          <Toaster richColors position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
