import { withSerwist } from '@serwist/turbopack';

// Barrel packages in package.json whose named imports Next should rewrite to per-module imports.
const OPTIMIZED_IMPORTS = [
  '@phosphor-icons/react',
  '@radix-ui/react-checkbox',
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-select',
  '@radix-ui/react-slot',
  '@radix-ui/react-tabs',
  '@radix-ui/react-tooltip',
  '@react-aria/interactions',
  'react-aria',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Two root layouts ((legacy), (ds)) means no app/layout.tsx; app/global-not-found.tsx serves unmatched URLs.
  // viewTransition: React <ViewTransition> for the Dinero page fades and list/row motion (src/lib/viewTransition.tsx).
  // staleTimes.dynamic: revisiting a page within 30s reuses the client router cache. Legacy stays fresh via
  // LegacyMutationRefresh (src/lib/LegacyMutationRefresh.tsx); Dinero pages router.refresh() after their mutations.
  // turbopackFileSystemCacheForDev off: the on-disk dev cache grew to 23 GB in a day and pinned the dev server.
  experimental: {
    optimizePackageImports: OPTIMIZED_IMPORTS,
    globalNotFound: true, viewTransition: true, staleTimes: { dynamic: 30 }, turbopackFileSystemCacheForDev: false },
  // Next 16 blocks cross-origin requests to dev-server internals (/_next/*) by
  // default, which breaks hydration and server actions when the app is opened
  // via a LAN IP. A bare '*' is rejected by Next's matcher; '*.*.*.*' matches
  // any IPv4 host, '**.local' covers mDNS hostnames. Dev-only, ignored in prod.
  allowedDevOrigins: ['*.*.*.*', '**.local'],
  // Storybook (built into public/storybook on Vercel) uses relative asset
  // paths, so its entry must be the real index.html URL, not a rewrite.
  async redirects() {
    return [{ source: '/storybook', destination: '/storybook/index.html', permanent: false }];
  },
  // public/ files are not content-hashed (Next serves them max-age=0), so give them a day plus a week of
  // stale-while-revalidate. Hashed /_next/static files are already immutable.
  async headers() {
    const value = 'public, max-age=86400, stale-while-revalidate=604800';
    return ['/banks/:path*', '/icons/:path*', '/brand/:path*', '/splash/:path*'].map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value }],
    }));
  },
  async rewrites() {
    if (process.env.VERCEL && !process.env.API_ORIGIN) {
      throw new Error(
        'Missing required API_ORIGIN environment variable on Vercel deployment. ' +
        'Set API_ORIGIN in your Vercel project environment variables pointing to your backend origin.'
      );
    }
    const api = process.env.API_ORIGIN ?? 'http://localhost:6969';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${api}/api/v1/:path*`,
      },
      // The static system reference lives in public/handbook; give it a clean entry URL.
      {
        source: '/handbook',
        destination: '/handbook/index.html',
      },
    ];
  },
};

export default withSerwist(nextConfig);
