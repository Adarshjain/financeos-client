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
  /* `cover` would extend the page under the iOS status bar, which Safari then
     covers with a translucent blurred material. No layout consumes the
     env(safe-area-inset-*) values, so the viewport stays inset and iOS paints
     the safe areas with the solid `themeColor` instead. */
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
