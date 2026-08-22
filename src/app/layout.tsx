import './globals.css';

import { SerwistProvider } from '@serwist/turbopack/react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { FaroRouteTracker } from '@/components/FaroRouteTracker';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

const isDev = process.env.NODE_ENV === 'development';

export const metadata: Metadata = {
  applicationName: 'FinanceOS',
  title: isDev ? 'FinanceOS - Dev' : 'FinanceOS',
  description: 'Personal finance management system',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FinanceOS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  /* `cover` would extend the page under the iOS status bar. No layout consumes
     the env(safe-area-inset-*) values, so the viewport stays inset instead. */
  viewportFit: 'auto',
};

export default function RootLayout({
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
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* Safari 26 ignores `themeColor`: the iOS status bar is translucent
              Liquid Glass unless a viewport-constrained element at the top edge
              gives it a solid colour to extend ("top bar tint"). Only `sticky`
              at exactly `top: 0` triggers that extension — a `fixed` element,
              or a sticky one offset by >= 0.5rem, leaves the bar transparent
              and the page blurring through it. The strip is 4px because the
              sampled element must be >= 3px tall and >= 80% wide, and the
              negative margin keeps it out of the layout. */}
          <div aria-hidden className="sticky top-0 z-50 h-1 -mb-1 bg-background" />
          {/* Registering in dev would have the worker serve stale precached
              assets across HMR reloads. */}
          <SerwistProvider swUrl="/serwist/sw.js" disable={isDev}>
            {children}
          </SerwistProvider>
          <FaroRouteTracker />
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
