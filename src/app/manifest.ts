import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FinanceOS',
    short_name: 'FinanceOS',
    description: 'Personal finance management system',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    /* slate-50, matching --background in globals.css so the splash screen does
       not flash against the app shell. */
    background_color: '#f8fafc',
    /* Matches the light-theme `themeColor` in the root layout so the standalone
       title bar is the same colour as the app shell behind it. */
    theme_color: '#f8fafc',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
