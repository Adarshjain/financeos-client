import type { Metadata, Viewport } from 'next';

// Shared by both root layouts ((legacy) and (ds)); each re-exports these as its own metadata.
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
  /* Chrome on Android (108+) then shrinks the layout viewport when the
     on-screen keyboard opens, so bottom-fixed bars (PageActionBarSlot,
     MobileNav) rise above it with no script. iOS Safari ignores this hint;
     useKeyboardInset covers it there. */
  interactiveWidget: 'resizes-content',
};
