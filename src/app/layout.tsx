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
          {/* Safari 26 ignores `themeColor` and instead samples the
              background-color of a fixed/sticky element hugging the viewport
              edge to tint the bar next to it; with no such element the iOS
              status bar keeps its translucent Liquid Glass blur over the page.
              The sampling rules require >=80% width, >=3px height and a top
              edge within 4px, so this strip is the smallest opaque element
              that makes the status bar solid `--background`. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 bg-background"
          />
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
