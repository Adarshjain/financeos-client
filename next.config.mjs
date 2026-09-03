import { withSerwist } from '@serwist/turbopack';

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Next 16 blocks cross-origin requests to dev-server internals (/_next/*) by
  // default, which breaks hydration and server actions when the app is opened
  // via a LAN IP. A bare '*' is rejected by Next's matcher; '*.*.*.*' matches
  // any IPv4 host, '**.local' covers mDNS hostnames. Dev-only, ignored in prod.
  allowedDevOrigins: ['*.*.*.*', '**.local'],
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
    ];
  },
};

export default withSerwist(nextConfig);
