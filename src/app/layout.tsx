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
  /* iOS 26 runs Home Screen web apps edge to edge, so the page is laid out
     under the status bar and home indicator either way; `cover` is what makes
     env(safe-area-inset-*) report those regions so the app can inset itself. */
  viewportFit: 'cover',
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
          {/* iOS 26 applies a scroll edge effect to a Home Screen web app: the
              page keeps painting under the status bar and gets blurred there as
              it scrolls. This band occupies the top inset (so it is 0 high on
              devices without one), reserving that space in the flow while
              staying pinned over anything scrolling past it — the status bar
              then only ever has flat `--background` behind it. `sticky` rather
              than `fixed` is also what makes Safari 26 extend that colour into
              the bar as a solid tint; `themeColor` no longer does. */}
          <div aria-hidden className="sticky top-0 z-50 h-[var(--safe-top)] bg-background" />
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
