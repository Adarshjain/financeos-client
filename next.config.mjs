/**
 * Statement-upload limit.
 *
 * Vercel hard-caps serverless request bodies at ~4.5MB, and the upload goes
 * through a server action on the Vercel-hosted client — so anything above that
 * fails at the platform edge with an opaque 413 no matter what we configure.
 * The limit is therefore pinned to 4.5MB and re-exported to the client through
 * `env` below so the upload form validates against it and renders it in its
 * help text, giving a specific error instead of the platform one.
 *
 * `bodySizeLimit` cannot be removed outright — Next's default is 1mb, enforced
 * before the server action body runs.
 *
 * Verified against Next 16.1.1's config schema that `serverActions` is still an
 * `experimental` key, so this setting is honoured rather than silently ignored.
 */
const MAX_REQUEST_MB = 4.5;

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  // Next 16 blocks cross-origin requests to dev-server internals (/_next/*) by
  // default, which breaks hydration and server actions when the app is opened
  // via a LAN IP. A bare '*' is rejected by Next's matcher; '*.*.*.*' matches
  // any IPv4 host, '**.local' covers mDNS hostnames. Dev-only, ignored in prod.
  allowedDevOrigins: ['*.*.*.*', '**.local'],
  experimental: {
    serverActions: {
      bodySizeLimit: `${MAX_REQUEST_MB}mb`,
    },
  },
  env: {
    NEXT_PUBLIC_MAX_REQUEST_MB: String(MAX_REQUEST_MB),
  },
};

export default nextConfig;
